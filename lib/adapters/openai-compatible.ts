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
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenRouter requires HTTP-Referer and X-Title headers
  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://9router.local';
    headers['X-Title'] = '9Router Cloud Gateway';
  }

  return await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
}
