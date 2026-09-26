import { ChatCompletionRequest, ChatMessage } from '../types';

type AnthropicBlock = Record<string, any>;

function toImageBlock(part: any): AnthropicBlock | null {
  const url: string | undefined = part?.image_url?.url;
  if (!url) return null;
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } };
  }
  if (/^https?:\/\//.test(url)) {
    return { type: 'image', source: { type: 'url', url } };
  }
  return null;
}

/**
 * Converts internal OpenAI-style messages into Anthropic Messages API messages,
 * preserving text, images, tool_use and tool_result blocks. Consecutive messages
 * of the same role are merged (Anthropic requires alternation).
 */
export function convertToAnthropicMessages(messages: ChatMessage[]) {
  let systemPrompt = '';
  const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: AnthropicBlock[] }> = [];

  const pushBlocks = (role: 'user' | 'assistant', blocks: AnthropicBlock[]) => {
    if (blocks.length === 0) return;
    const last = anthropicMessages[anthropicMessages.length - 1];
    if (last && last.role === role) {
      last.content.push(...blocks);
    } else {
      anthropicMessages.push({ role, content: blocks });
    }
  };

  for (const msg of messages) {
    if (!msg) continue;

    if (msg.role === 'system') {
      const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      systemPrompt = systemPrompt ? `${systemPrompt}\n\n${text}` : text;
      continue;
    }

    if (msg.role === 'assistant') {
      const blocks: AnthropicBlock[] = [];
      if (typeof msg.content === 'string' && msg.content.trim()) {
        blocks.push({ type: 'text', text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part?.type === 'text' && part.text) blocks.push({ type: 'text', text: part.text });
          else if (part?.type === 'image_url') {
            const img = toImageBlock(part);
            if (img) blocks.push(img);
          }
        }
      }
      for (const tc of msg.tool_calls || []) {
        const fn = tc?.function || {};
        let input: any = {};
        try {
          input = fn.arguments ? JSON.parse(fn.arguments) : {};
        } catch {
          input = { _raw: fn.arguments };
        }
        blocks.push({
          type: 'tool_use',
          id: tc?.id || `toolu_${Math.random().toString(36).slice(2, 12)}`,
          name: fn.name || 'tool',
          input,
        });
      }
      pushBlocks('assistant', blocks);
      continue;
    }

    if (msg.role === 'tool' || msg.role === 'function') {
      const text =
        typeof msg.content === 'string'
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map((p: any) => p?.text || '').join('\n')
            : '';
      pushBlocks('user', [
        {
          type: 'tool_result',
          tool_use_id: msg.tool_call_id || msg.name || 'unknown',
          content: text,
        },
      ]);
      continue;
    }

    // user
    const blocks: AnthropicBlock[] = [];
    if (typeof msg.content === 'string') {
      if (msg.content.trim()) blocks.push({ type: 'text', text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part?.type === 'text' && part.text) blocks.push({ type: 'text', text: part.text });
        else if (part?.type === 'image_url') {
          const img = toImageBlock(part);
          if (img) blocks.push(img);
        }
      }
    }
    pushBlocks('user', blocks);
  }

  if (anthropicMessages.length === 0) {
    anthropicMessages.push({ role: 'user', content: [{ type: 'text', text: 'Hello' }] });
  }

  return { systemPrompt, anthropicMessages };
}

function convertToolsToAnthropic(tools: any[] | undefined) {
  return (tools || [])
    .map((t: any) =>
      t?.type === 'function' && t.function?.name
        ? {
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters || { type: 'object', properties: {} },
          }
        : null
    )
    .filter(Boolean);
}

function convertToolChoiceToAnthropic(toolChoice: any) {
  if (!toolChoice) return undefined;
  if (typeof toolChoice === 'string') {
    if (toolChoice === 'auto') return { type: 'auto' };
    if (toolChoice === 'required') return { type: 'any' };
    if (toolChoice === 'none') return { type: 'none' };
    return undefined;
  }
  if (toolChoice?.type === 'function' && toolChoice.function?.name) {
    return { type: 'tool', name: toolChoice.function.name };
  }
  return undefined;
}

function mapStopReasonToOpenAI(stopReason: string | null | undefined): string {
  switch (stopReason) {
    case 'tool_use':
      return 'tool_calls';
    case 'max_tokens':
      return 'length';
    case 'stop_sequence':
      return 'stop';
    default:
      return 'stop';
  }
}

export async function callAnthropic(
  baseUrl: string,
  apiKey: string,
  request: ChatCompletionRequest,
  signal?: AbortSignal
): Promise<Response> {
  const base = baseUrl.replace(/\/+$/, '');
  const url = base.toLowerCase().endsWith('/v1/messages')
    ? base
    : base.toLowerCase().endsWith('/v1')
      ? `${base}/messages`
      : `${base}/v1/messages`;
  const { systemPrompt, anthropicMessages } = convertToAnthropicMessages(request.messages);

  const body: any = {
    model: request.model,
    max_tokens: request.max_tokens || 8192,
    messages: anthropicMessages,
    stream: request.stream || false,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }
  if (request.temperature !== undefined) {
    body.temperature = Math.min(1.0, Math.max(0.0, request.temperature));
  }
  if (request.top_p !== undefined) {
    body.top_p = request.top_p;
  }
  if (request.stop !== undefined) {
    body.stop_sequences = Array.isArray(request.stop) ? request.stop : [request.stop];
  }

  const anthropicTools = convertToolsToAnthropic(request.tools);
  if (anthropicTools.length > 0) {
    body.tools = anthropicTools;
    const toolChoice = convertToolChoiceToAnthropic(request.tool_choice);
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    return response;
  }

  // If client didn't want stream, convert Anthropic JSON to OpenAI format
  if (!request.stream) {
    const data = await response.json();
    const textParts: string[] = [];
    const toolCalls: any[] = [];
    for (const block of data.content || []) {
      if (block?.type === 'text') textParts.push(block.text || '');
      else if (block?.type === 'tool_use') {
        toolCalls.push({
          id: block.id || `toolu_${Math.random().toString(36).slice(2, 12)}`,
          type: 'function',
          function: { name: block.name || 'tool', arguments: JSON.stringify(block.input ?? {}) },
        });
      }
    }
    const content = textParts.join('');

    const openAIFormat: any = {
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
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          },
          finish_reason: mapStopReasonToOpenAI(data.stop_reason),
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
      let currentToolIndex = -1;
      let finishReason: string | null = null;
      let outputTokens = 0;

      const emitChunk = (delta: any, finish: string | null = null, usage?: any) => {
        const chunk: any = {
          id: streamId,
          object: 'chat.completion.chunk',
          created,
          model: request.model,
          choices: [{ index: 0, delta, finish_reason: finish }],
        };
        if (usage) chunk.usage = usage;
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

              if (parsed.type === 'content_block_start') {
                const block = parsed.content_block || {};
                if (block.type === 'tool_use') {
                  currentToolIndex++;
                  emitChunk({
                    tool_calls: [
                      {
                        index: currentToolIndex,
                        id: block.id || `toolu_${Date.now().toString(36)}`,
                        type: 'function',
                        function: { name: block.name || 'tool', arguments: '' },
                      },
                    ],
                  });
                }
              } else if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta || {};
                if (delta.type === 'text_delta' && delta.text) {
                  emitChunk({ content: delta.text });
                } else if (delta.type === 'input_json_delta' && delta.partial_json) {
                  emitChunk({
                    tool_calls: [
                      {
                        index: Math.max(currentToolIndex, 0),
                        function: { arguments: delta.partial_json },
                      },
                    ],
                  });
                }
                // thinking_delta / signature_delta are intentionally skipped
              } else if (parsed.type === 'message_delta') {
                if (parsed.delta?.stop_reason) finishReason = parsed.delta.stop_reason;
                if (parsed.usage?.output_tokens) outputTokens = parsed.usage.output_tokens;
              } else if (parsed.type === 'message_stop') {
                emitChunk({}, mapStopReasonToOpenAI(finishReason), {
                  completion_tokens: outputTokens,
                });
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              } else if (parsed.type === 'error') {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ error: parsed.error || { message: 'Upstream error' } })}\n\n`
                  )
                );
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
