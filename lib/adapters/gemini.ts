import { ChatCompletionRequest, ChatMessage } from '../types';

type GeminiPart = Record<string, any>;

function toInlineDataPart(part: any): GeminiPart | null {
  const url: string | undefined = part?.image_url?.url;
  if (!url) return null;
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { inline_data: { mime_type: match[1], data: match[2] } };
  }
  if (/^https?:\/\//.test(url)) {
    return { file_data: { file_uri: url } };
  }
  return null;
}

/**
 * Converts internal OpenAI-style messages into Gemini `contents`,
 * preserving text, images, tool calls and tool results.
 */
export function convertToGeminiContents(messages: ChatMessage[]) {
  let systemInstruction: string | undefined = undefined;
  const contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }> = [];

  // Map tool_call_id -> function name so tool results can be attributed on the
  // Gemini functionResponse (which requires the function name, not the call id).
  const toolNamesById = new Map<string, string>();
  for (const msg of messages) {
    for (const tc of msg?.tool_calls || []) {
      if (tc?.id) toolNamesById.set(tc.id, tc?.function?.name || 'tool');
    }
  }

  const pushParts = (role: 'user' | 'model', parts: GeminiPart[]) => {
    if (parts.length === 0) return;
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts.push(...parts);
    } else {
      contents.push({ role, parts });
    }
  };

  const addTextParts = (parts: GeminiPart[], content: ChatMessage['content']) => {
    if (typeof content === 'string') {
      if (content.trim()) parts.push({ text: content });
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (part?.type === 'text' && part.text) parts.push({ text: part.text });
        else if (part?.type === 'image_url') {
          const inline = toInlineDataPart(part);
          if (inline) parts.push(inline);
        }
      }
    }
  };

  for (const msg of messages) {
    if (!msg) continue;

    if (msg.role === 'system') {
      const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      systemInstruction = systemInstruction ? `${systemInstruction}\n\n${text}` : text;
      continue;
    }

    if (msg.role === 'assistant') {
      const parts: GeminiPart[] = [];
      addTextParts(parts, msg.content);
      for (const tc of msg.tool_calls || []) {
        const fn = tc?.function || {};
        let args: any = {};
        try {
          args = fn.arguments ? JSON.parse(fn.arguments) : {};
        } catch {
          args = { _raw: fn.arguments };
        }
        parts.push({ functionCall: { name: fn.name || 'tool', args } });
      }
      pushParts('model', parts);
      continue;
    }

    if (msg.role === 'tool' || msg.role === 'function') {
      const name = toolNamesById.get(msg.tool_call_id || '') || msg.name || 'tool';
      const text =
        typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map((p: any) => p?.text || '').join('\n')
            : '';
      let response: any = { result: text };
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') response = { result: parsed };
      } catch {
        // keep raw text
      }
      pushParts('user', [{ functionResponse: { name, response } }]);
      continue;
    }

    const parts: GeminiPart[] = [];
    addTextParts(parts, msg.content);
    pushParts('user', parts);
  }

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  }

  return { systemInstruction, contents };
}

function convertToolsToGemini(tools: any[] | undefined) {
  const declarations = (tools || [])
    .map((t: any) =>
      t?.type === 'function' && t.function?.name
        ? {
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters || { type: 'object', properties: {} },
          }
        : null
    )
    .filter(Boolean);
  return declarations;
}

function convertToolChoiceToGemini(toolChoice: any) {
  if (!toolChoice) return undefined;
  if (typeof toolChoice === 'string') {
    if (toolChoice === 'auto') return { functionCallingConfig: { mode: 'AUTO' } };
    if (toolChoice === 'required') return { functionCallingConfig: { mode: 'ANY' } };
    if (toolChoice === 'none') return { functionCallingConfig: { mode: 'NONE' } };
    return undefined;
  }
  if (toolChoice?.type === 'function' && toolChoice.function?.name) {
    return {
      functionCallingConfig: { mode: 'ANY', allowedFunctionNames: [toolChoice.function.name] },
    };
  }
  return undefined;
}

function mapFinishReasonToOpenAI(reason: string | undefined): string | null {
  switch (reason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
    case 'RECITATION':
      return 'content_filter';
    default:
      return null;
  }
}

export async function callGemini(
  baseUrl: string,
  apiKey: string,
  request: ChatCompletionRequest,
  signal?: AbortSignal
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

  const geminiTools = convertToolsToGemini(request.tools);
  if (geminiTools.length > 0) {
    body.tools = [{ functionDeclarations: geminiTools }];
    const toolConfig = convertToolChoiceToGemini(request.tool_choice);
    if (toolConfig) body.toolConfig = toolConfig;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    return response;
  }

  // Handle Non-streaming
  if (!isStream) {
    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts: any[] = candidate?.content?.parts || [];
    const text = parts.map((p: any) => p?.text || '').join('');
    const toolCalls = parts
      .filter((p: any) => p?.functionCall)
      .map((p: any, idx: number) => ({
        id: `call_${Date.now().toString(36)}${idx}`,
        type: 'function',
        function: {
          name: p.functionCall?.name || 'tool',
          arguments: JSON.stringify(p.functionCall?.args ?? {}),
        },
      }));

    const openAIFormat: any = {
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
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          },
          finish_reason:
            toolCalls.length > 0
              ? 'tool_calls'
              : mapFinishReasonToOpenAI(candidate?.finishReason) || 'stop',
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
      let finishReason: string | null = null;
      let toolCallCount = 0;

      const emitChunk = (delta: any, finish: string | null = null) => {
        const chunk = {
          id: streamId,
          object: 'chat.completion.chunk',
          created,
          model: request.model,
          choices: [{ index: 0, delta, finish_reason: finish }],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      };

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
              const candidate = parsed.candidates?.[0];
              const parts: any[] = candidate?.content?.parts || [];

              for (const part of parts) {
                if (part?.text) {
                  emitChunk({ content: part.text });
                } else if (part?.functionCall) {
                  emitChunk({
                    tool_calls: [
                      {
                        index: toolCallCount,
                        id: `call_${Date.now().toString(36)}${toolCallCount}`,
                        type: 'function',
                        function: {
                          name: part.functionCall?.name || 'tool',
                          arguments: JSON.stringify(part.functionCall?.args ?? {}),
                        },
                      },
                    ],
                  });
                  toolCallCount++;
                }
              }

              const mapped = mapFinishReasonToOpenAI(candidate?.finishReason);
              if (mapped) finishReason = mapped;
            } catch {
              // ignore parse errors
            }
          }
        }

        // Final closing chunk
        emitChunk({}, finishReason || (toolCallCount > 0 ? 'tool_calls' : 'stop'));
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
