import { ChatCompletionRequest } from '../types';

function stripTrailingSlashes(url: string): string {
  return (url || '').trim().replace(/\/+$/, '');
}

/** True when the URL points at a bare host with no path (e.g. "https://api.example.com"). */
function hasBarePath(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname === '' || parsed.pathname === '/';
  } catch {
    return false;
  }
}

/**
 * Builds the chat-completions URL from a base URL, tolerating the many shapes
 * users paste for custom providers, resellers and local servers:
 *   "https://host"                   -> "https://host/v1/chat/completions"
 *   "https://host/v1"                -> "https://host/v1/chat/completions"
 *   "https://host/v1/"               -> "https://host/v1/chat/completions"
 *   "https://host/chat/completions"  -> unchanged
 *   "https://host/api/openai"        -> "https://host/api/openai/chat/completions"
 */
export function buildChatCompletionsUrl(baseUrl: string): string {
  const base = stripTrailingSlashes(baseUrl);
  if (!base) return baseUrl;
  if (base.toLowerCase().endsWith('/chat/completions')) return base;
  return hasBarePath(base) ? `${base}/v1/chat/completions` : `${base}/chat/completions`;
}

/**
 * Builds the models-list URL from the same base URL shapes (used for model
 * auto-discovery in the provider test endpoint). A trailing
 * "/chat/completions" is replaced by the models path.
 */
export function buildModelsUrl(baseUrl: string): string {
  const base = stripTrailingSlashes(baseUrl).replace(/\/chat\/completions$/i, '');
  if (!base) return baseUrl;
  if (base.toLowerCase().endsWith('/models')) return base;
  return hasBarePath(base) ? `${base}/v1/models` : `${base}/models`;
}

export async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  request: ChatCompletionRequest,
  signal?: AbortSignal
): Promise<Response> {
  const url = buildChatCompletionsUrl(endpoint);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: request.stream ? 'text/event-stream' : 'application/json',
  };

  // Only send Authorization when a key is present — local servers / Ollama
  // may reject an empty "Bearer " header.
  if (apiKey && apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  // OpenRouter requires HTTP-Referer and X-Title headers
  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://zexin9.local';
    headers['X-Title'] = 'Zexin9 Cloud Gateway';
  }

  // Always ensure max_tokens is set — providers like Cloudflare Workers AI default
  // to only 256 tokens which causes responses to be cut off mid-sentence.
  const effectiveMax = request.max_tokens ?? 8192;
  const makeBody = (maxTokens: number): ChatCompletionRequest => ({
    ...request,
    max_tokens: maxTokens,
  });

  let res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(makeBody(effectiveMax)),
    signal,
  });

  // Some providers (DeepSeek, OpenAI, …) reject a max_tokens larger than the
  // model's own limit with HTTP 400. Retry once with the safe 8192 cap instead
  // of failing the whole request — heavy-coding answers must not die like that.
  if (!res.ok && effectiveMax > 8192 && res.status === 400) {
    const errText = await res
      .clone()
      .text()
      .catch(() => '');
    if (/max_tokens|max output|maximum|too large|exceed|limit/i.test(errText)) {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(makeBody(8192)),
        signal,
      });
    }
  }

  return res;
}
