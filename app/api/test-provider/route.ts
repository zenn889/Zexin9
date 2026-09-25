import { executeProviderCall } from '@/lib/router';
import { ChatCompletionRequest, ProviderId } from '@/lib/types';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const TEST_MODELS: Record<ProviderId, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  gemini: 'gemini-2.0-flash',
  deepseek: 'deepseek-chat',
  groq: 'llama-3.1-8b-instant',
  openrouter: 'openai/gpt-4o-mini',
  mistral: 'mistral-small-latest',
  together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  cloudflare: '@cf/meta/llama-3.1-8b-instruct',
  cerebras: 'llama3.1-8b',
  siliconflow: 'Qwen/Qwen2.5-Coder-7B-Instruct',
  perplexity: 'sonar',
  custom: 'llama3.3:latest',
};

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, baseUrl, accountId, model } = await req.json();

    if (!provider) {
      return new Response(JSON.stringify({ success: false, error: 'Provider is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const testModel = model || TEST_MODELS[provider as ProviderId] || 'gpt-4o-mini';
    const testRequest: ChatCompletionRequest = {
      model: testModel,
      messages: [{ role: 'user', content: 'Ping' }],
      max_tokens: 5,
      stream: false,
    };

    const headerKeys: Record<string, string> = {};
    if (apiKey) {
      headerKeys[`x-${provider}-key`] = apiKey;
    }
    if (baseUrl) {
      headerKeys[`x-${provider}-base-url`] = baseUrl;
    }
    if (accountId) {
      headerKeys['x-cloudflare-account-id'] = accountId;
    }

    const start = Date.now();
    const res = await executeProviderCall(
      provider as ProviderId,
      testModel,
      testRequest,
      headerKeys
    );
    const latency = Date.now() - start;

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return new Response(
        JSON.stringify({
          success: false,
          status: res.status,
          latency,
          error: errorText.slice(0, 300) || `HTTP error ${res.status}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 200,
        latency,
        model: testModel,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Connection failed',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
