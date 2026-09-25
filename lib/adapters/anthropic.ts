import { ChatCompletionRequest, ChatMessage } from '../types';

export function convertToAnthropicMessages(messages: ChatMessage[]) {
  let systemPrompt = '';
  const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      systemPrompt = systemPrompt ? `${systemPrompt}\n\n${text}` : text;
    } else {
      const role = msg.role === 'assistant' ? 'assistant' : 'user';
      let contentStr = '';
      if (typeof msg.content === 'string') {
        contentStr = msg.content;
      } else if (Array.isArray(msg.content)) {
        contentStr = msg.content
          .map((part) => (part.type === 'text' ? part.text || '' : ''))
          .join('\n');
      }
      anthropicMessages.push({ role, content: contentStr });
    }
  }

  // Anthropic requires at least 1 message and alternation
  if (anthropicMessages.length === 0) {
    anthropicMessages.push({ role: 'user', content: 'Hello' });
  }

  return { systemPrompt, anthropicMessages };
}

export async function callAnthropic(
  baseUrl: string,
  apiKey: string,
  request: ChatCompletionRequest
): Promise<Response> {
  const url = `${baseUrl.replace(/\/+$/, '')}/v1/messages`;
  const { systemPrompt, anthropicMessages } = convertToAnthropicMessages(request.messages);

  const body: any = {
    model: request.model,
    max_tokens: request.max_tokens || 4096,
    messages: anthropicMessages,
    stream: request.stream || false,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }
  if (request.temperature !== undefined) {
    body.temperature = Math.min(1.0, Math.max(0.0, request.temperature));
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return response;
  }

  // If client didn't want stream, convert Anthropic JSON to OpenAI format
  if (!request.stream) {
    const data = await response.json();
    const content = data.content
      ? data.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('')
      : '';

    const openAIFormat = {
      id: data.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
          },
          finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason || 'stop',
        },
      ],
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };

    return new Response(JSON.stringify(openAIFormat), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle SSE streaming translation: Anthropic SSE -> OpenAI SSE
  const streamId = `chatcmpl-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);
  const reader = response.body?.getReader();
  if (!reader) {
    return response;
  }

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
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const chunk = {
                  id: streamId,
                  object: 'chat.completion.chunk',
                  created,
                  model: request.model,
                  choices: [
                    {
                      index: 0,
                      delta: { content: parsed.delta.text },
                      finish_reason: null,
                    },
                  ],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              } else if (parsed.type === 'message_stop') {
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
              }
            } catch {
              // ignore parse errors on individual lines
            }
          }
        }
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
