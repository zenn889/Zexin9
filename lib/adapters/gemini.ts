import { ChatCompletionRequest, ChatMessage } from '../types';

export function convertToGeminiContents(messages: ChatMessage[]) {
  let systemInstruction: string | undefined = undefined;
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      systemInstruction = systemInstruction ? `${systemInstruction}\n\n${text}` : text;
    } else {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      let text = '';
      if (typeof msg.content === 'string') {
        text = msg.content;
      } else if (Array.isArray(msg.content)) {
        text = msg.content
          .map((part) => (part.type === 'text' ? part.text || '' : ''))
          .join('\n');
      }
      contents.push({
        role,
        parts: [{ text }],
      });
    }
  }

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  return { systemInstruction, contents };
}

export async function callGemini(
  baseUrl: string,
  apiKey: string,
  request: ChatCompletionRequest
): Promise<Response> {
  const { systemInstruction, contents } = convertToGeminiContents(request.messages);

  const cleanModel = request.model.replace(/^google\//, '');
  const isStream = Boolean(request.stream);

  const base = baseUrl.replace(/\/+$/, '');
  const url = isStream
    ? `${base}/v1beta/models/${cleanModel}:streamGenerateContent?alt=sse&key=${apiKey}`
    : `${base}/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  const body: any = {
    contents,
    generationConfig: {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.max_tokens ?? 8192,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return response;
  }

  // Handle Non-streaming
  if (!isStream) {
    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

    const openAIFormat = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text,
          },
          finish_reason: candidate?.finishReason === 'STOP' ? 'stop' : 'stop',
        },
      ],
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };

    return new Response(JSON.stringify(openAIFormat), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle SSE streaming
  const streamId = `chatcmpl-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);
  const reader = response.body?.getReader();
  if (!reader) return response;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new ReadableStream({
    async start(controller) {
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const partText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (partText) {
                const chunk = {
                  id: streamId,
                  object: 'chat.completion.chunk',
                  created,
                  model: request.model,
                  choices: [
                    {
                      index: 0,
                      delta: { content: partText },
                      finish_reason: null,
                    },
                  ],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } catch {
              // ignore parse errors
            }
          }
        }

        // Final closing chunk
        const finalChunk = {
          id: streamId,
          object: 'chat.completion.chunk',
          created,
          model: request.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop',
            },
          ],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err: any) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(transformStream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
