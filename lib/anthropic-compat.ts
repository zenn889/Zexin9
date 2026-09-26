import { ChatCompletionRequest, ChatMessage } from './types';

/**
 * Anthropic Messages API <-> OpenAI Chat Completions compatibility layer.
 *
 * Used by /v1/messages so Anthropic-native clients (Claude Code CLI, Anthropic SDK)
 * keep working even when the request is served by an OpenAI-compatible provider,
 * and vice versa: requests are translated to the internal OpenAI-style format and
 * responses/streams are translated back to Anthropic format.
 */

function textFromAnthropicContent(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (!block) return '';
        if (block.type === 'text') return block.text || '';
        if (block.type === 'tool_result') return textFromAnthropicContent(block.content);
        return '';
      })
      .filter((t) => t.length > 0)
      .join('\n');
  }
  return '';
}

function imagePartFromAnthropic(block: any): { type: string; image_url: { url: string } } | null {
  const source = block?.source || {};
  if (source.type === 'base64' && source.data) {
    return {
      type: 'image_url',
      image_url: { url: `data:${source.media_type || 'image/png'};base64,${source.data}` },
    };
  }
  if (source.type === 'url' && source.url) {
    return { type: 'image_url', image_url: { url: source.url } };
  }
  return null;
}

/**
 * Converts an Anthropic Messages API request body into the gateway's internal
 * OpenAI-style ChatCompletionRequest (messages, tools and tool_choice included).
 */
export function anthropicToOpenAIRequest(body: any): ChatCompletionRequest {
  const messages: ChatMessage[] = [];

  if (body?.system) {
    const systemText =
      typeof body.system === 'string' ? body.system : textFromAnthropicContent(body.system);
    if (systemText.trim()) messages.push({ role: 'system', content: systemText });
  }

  for (const m of Array.isArray(body?.messages) ? body.messages : []) {
    if (!m || !m.role) continue;

    if (m.role === 'assistant') {
      let text = '';
      const toolCalls: any[] = [];
      if (typeof m.content === 'string') {
        text = m.content;
      } else if (Array.isArray(m.content)) {
        for (const block of m.content) {
          if (!block) continue;
          if (block.type === 'text') {
            text += (text ? '\n' : '') + (block.text || '');
          } else if (block.type === 'tool_use') {
            toolCalls.push({
              id: block.id || `call_${Math.random().toString(36).slice(2, 10)}`,
              type: 'function',
              function: {
                name: block.name || 'tool',
                arguments: JSON.stringify(block.input ?? {}),
              },
            });
          }
        }
      }
      if (text.trim() || toolCalls.length > 0) {
        const msg: ChatMessage = { role: 'assistant', content: text };
        if (toolCalls.length > 0) msg.tool_calls = toolCalls;
        messages.push(msg);
      }
      continue;
    }

    // user role (tool_result blocks are split into dedicated tool messages)
    if (typeof m.content === 'string') {
      if (m.content.trim()) messages.push({ role: 'user', content: m.content });
      continue;
    }
    if (!Array.isArray(m.content)) continue;

    let userParts: any[] = [];
    const flushUserParts = () => {
      if (userParts.length > 0) {
        messages.push({ role: 'user', content: userParts });
        userParts = [];
      }
    };

    for (const block of m.content) {
      if (!block) continue;
      if (block.type === 'text') {
        if (block.text) userParts.push({ type: 'text', text: block.text });
      } else if (block.type === 'image') {
        const part = imagePartFromAnthropic(block);
        if (part) userParts.push(part);
      } else if (block.type === 'tool_result') {
        flushUserParts();
        const raw =
          typeof block.content === 'string'
            ? block.content
            : textFromAnthropicContent(block.content);
        messages.push({
          role: 'tool',
          tool_call_id: block.tool_use_id || 'unknown',
          content: block.is_error ? `[tool_error] ${raw}` : raw,
        });
      }
    }
    flushUserParts();
  }

  if (messages.length === 0) {
    messages.push({ role: 'user', content: 'Hello' });
  }

  const request: ChatCompletionRequest = {
    model: body?.model || 'claude-3-5-sonnet-20241022',
    messages,
    max_tokens: body?.max_tokens || 8192,
    stream: Boolean(body?.stream),
  };
  if (typeof body?.temperature === 'number') request.temperature = body.temperature;
  if (typeof body?.top_p === 'number') request.top_p = body.top_p;
  if (body?.stop_sequences) request.stop = body.stop_sequences;

  if (Array.isArray(body?.tools) && body.tools.length > 0) {
    request.tools = body.tools
      .filter((t: any) => t && typeof t.name === 'string' && t.name.length > 0)
      .map((t: any) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema || { type: 'object', properties: {} },
        },
      }));
  }

  if (body?.tool_choice) {
    const tc = body.tool_choice;
    if (tc.type === 'auto') request.tool_choice = 'auto';
    else if (tc.type === 'any') request.tool_choice = 'required';
    else if (tc.type === 'none') request.tool_choice = 'none';
    else if (tc.type === 'tool' && tc.name) {
      request.tool_choice = { type: 'function', function: { name: tc.name } };
    }
  }

  return request;
}

function mapFinishReasonToAnthropic(finish: string | null | undefined): string {
  switch (finish) {
    case 'length':
      return 'max_tokens';
    case 'tool_calls':
      return 'tool_use';
    default:
      return 'end_turn';
  }
}

/**
 * Converts an OpenAI-style chat.completion payload into an Anthropic Message payload.
 */
export function openAIToAnthropicResponse(data: any) {
  const choice = data?.choices?.[0] || {};
  const message = choice.message || {};
  const content: any[] = [];

  if (typeof message.content === 'string' && message.content.length > 0) {
    content.push({ type: 'text', text: message.content });
  } else if (Array.isArray(message.content)) {
    const text = message.content.map((p: any) => p?.text || '').join('');
    if (text) content.push({ type: 'text', text });
  }

  for (const tc of message.tool_calls || []) {
    let input: any = {};
    try {
      input = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
    } catch {
      input = {};
    }
    content.push({
      type: 'tool_use',
      id: tc.id || `toolu_${Math.random().toString(36).slice(2, 12)}`,
      name: tc.function?.name || 'tool',
      input,
    });
  }

  if (content.length === 0) content.push({ type: 'text', text: '' });

  return {
    id: data?.id ? String(data.id).replace(/^chatcmpl-/, 'msg_') : `msg_${Date.now().toString(36)}`,
    type: 'message',
    role: 'assistant',
    model: data?.model || 'zexin9-gateway',
    content,
    stop_reason: mapFinishReasonToAnthropic(choice.finish_reason),
    stop_sequence: null,
    usage: {
      input_tokens: data?.usage?.prompt_tokens || 0,
      output_tokens: data?.usage?.completion_tokens || 0,
    },
  };
}

/**
 * Anthropic-style JSON error response.
 */
export function anthropicErrorResponse(status: number, message: string): Response {
  const clamped = Math.min(Math.max(status || 500, 400), 599);
  const type =
    clamped === 401
      ? 'authentication_error'
      : clamped === 429
        ? 'rate_limit_error'
        : clamped >= 500
          ? 'api_error'
          : 'invalid_request_error';
  return new Response(JSON.stringify({ type: 'error', error: { type, message } }), {
    status: clamped,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Translates an OpenAI-style SSE stream into an Anthropic Messages SSE stream
 * (message_start / content_block_start / *_delta / content_block_stop /
 * message_delta / message_stop), including tool_use blocks.
 */
export function createAnthropicSSEStreamFromOpenAI(
  upstream: ReadableStream<Uint8Array>,
  fallbackModel: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      let started = false;
      let messageId = `msg_${Date.now().toString(36)}`;
      let model = fallbackModel;
      let blockIndex = -1;
      let openType: 'text' | 'tool_use' | null = null;
      const toolBlocks = new Map<number, number>(); // tool_call index -> anthropic block index
      let finishReason: string | null = null;
      let textLength = 0;
      let completionTokens = 0;

      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const ensureStarted = () => {
        if (started) return;
        started = true;
        send('message_start', {
          type: 'message_start',
          message: {
            id: messageId,
            type: 'message',
            role: 'assistant',
            model,
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 0, output_tokens: 0 },
          },
        });
      };

      const closeOpenBlock = () => {
        if (openType !== null) {
          send('content_block_stop', { type: 'content_block_stop', index: blockIndex });
          openType = null;
        }
      };

      const openTextBlock = () => {
        if (openType === 'text') return;
        closeOpenBlock();
        blockIndex++;
        openType = 'text';
        send('content_block_start', {
          type: 'content_block_start',
          index: blockIndex,
          content_block: { type: 'text', text: '' },
        });
      };

      const handleChunk = (json: any) => {
        if (json?.id) messageId = String(json.id).replace(/^chatcmpl-/, 'msg_');
        if (json?.model) model = json.model;
        if (json?.usage?.completion_tokens) completionTokens = json.usage.completion_tokens;

        const choice = json?.choices?.[0];
        if (!choice) return;
        const delta = choice.delta || {};

        if (typeof delta.content === 'string' && delta.content.length > 0) {
          ensureStarted();
          openTextBlock();
          textLength += delta.content.length;
          send('content_block_delta', {
            type: 'content_block_delta',
            index: blockIndex,
            delta: { type: 'text_delta', text: delta.content },
          });
        }

        for (const tc of delta.tool_calls || []) {
          const tIdx = typeof tc.index === 'number' ? tc.index : 0;
          let targetBlock = toolBlocks.get(tIdx);
          if (targetBlock === undefined) {
            ensureStarted();
            closeOpenBlock();
            blockIndex++;
            targetBlock = blockIndex;
            toolBlocks.set(tIdx, targetBlock);
            openType = 'tool_use';
            send('content_block_start', {
              type: 'content_block_start',
              index: targetBlock,
              content_block: {
                type: 'tool_use',
                id: tc.id || `toolu_${Date.now().toString(36)}${tIdx}`,
                name: tc.function?.name || 'tool',
                input: {},
              },
            });
          }
          if (typeof tc.function?.arguments === 'string' && tc.function.arguments.length > 0) {
            send('content_block_delta', {
              type: 'content_block_delta',
              index: targetBlock,
              delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
            });
          }
        }

        if (choice.finish_reason) finishReason = choice.finish_reason;
      };

      const finalize = () => {
        ensureStarted();
        closeOpenBlock();
        send('message_delta', {
          type: 'message_delta',
          delta: { stop_reason: mapFinishReasonToAnthropic(finishReason), stop_sequence: null },
          usage: {
            output_tokens: completionTokens || Math.max(1, Math.round(textLength / 4)),
          },
        });
        send('message_stop', { type: 'message_stop' });
      };

      try {
        const reader = upstream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              handleChunk(JSON.parse(payload));
            } catch {
              // skip malformed upstream lines
            }
          }
        }
        finalize();
      } catch (err: any) {
        ensureStarted();
        closeOpenBlock();
        send('error', {
          type: 'error',
          error: { type: 'api_error', message: err?.message || 'Upstream stream error' },
        });
      } finally {
        controller.close();
      }
    },
  });
}
