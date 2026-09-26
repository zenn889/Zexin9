import { ChatCompletionRequest } from '../types';

export async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  request: ChatCompletionRequest
): Promise<Response> {
  const url = endpoint.endsWith('/chat/completions')
    ? endpoint
    : `${endpoint.replace(/\/+$/, '')}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey.trim()}`,
    Accept: request.stream ? 'text/event-stream' : 'application/json',
  };

  // OpenRouter requires HTTP-Referer and X-Title headers
  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://zexin9.local';
    headers['X-Title'] = 'Zexin9 Cloud Gateway';
  }

  // Always ensure max_tokens is set — providers like Cloudflare Workers AI default
  // to only 256 tokens which causes responses to be cut off mid-sentence.
  const body: ChatCompletionRequest = {
    ...request,
    max_tokens: request.max_tokens ?? 8192,
  };

  return await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}
