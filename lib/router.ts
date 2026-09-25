import { callAnthropic } from './adapters/anthropic';
import { callGemini } from './adapters/gemini';
import { callOpenAICompatible } from './adapters/openai-compatible';
import {
  DEFAULT_FALLBACK_GROUPS,
  DEFAULT_PROVIDERS,
  getProviderApiKey,
  getProviderBaseUrl,
} from './config';
import { optimizeMessages } from './optimizer';
import { ChatCompletionRequest, ProviderId } from './types';

export interface RouteCandidate {
  provider: ProviderId;
  model: string;
}

export interface RouterExecutionResult {
  response: Response;
  servedBy: ProviderId;
  servedModel: string;
  fallbackCount: number;
  tokensSaved: number;
}

/**
 * Resolve ordered candidate list for a given requested model
 */
export function resolveCandidates(
  requestedModel: string,
  headerKeys: Record<string, string> = {}
): RouteCandidate[] {
  // Check if it's one of the predefined virtual fallback groups
  const group = DEFAULT_FALLBACK_GROUPS.find((g) => g.id.toLowerCase() === requestedModel.toLowerCase());
  if (group) {
    return group.providers;
  }

  const modelLower = requestedModel.toLowerCase();
  const candidates: RouteCandidate[] = [];

  if (modelLower.startsWith('@cf/') || modelLower.includes('cloudflare')) {
    candidates.push({ provider: 'cloudflare', model: requestedModel });
    candidates.push({ provider: 'groq', model: 'llama-3.3-70b-versatile' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
  } else if (modelLower.startsWith('sonar')) {
    candidates.push({ provider: 'perplexity', model: requestedModel });
    candidates.push({ provider: 'openai', model: 'gpt-4o' });
  } else if (modelLower.startsWith('claude')) {
    candidates.push({ provider: 'anthropic', model: requestedModel });
    candidates.push({ provider: 'openrouter', model: `anthropic/${requestedModel}` });
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
    candidates.push({ provider: 'openai', model: 'gpt-4o' });
  } else if (modelLower.startsWith('gpt-') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) {
    candidates.push({ provider: 'openai', model: requestedModel });
    candidates.push({ provider: 'openrouter', model: `openai/${requestedModel}` });
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
    candidates.push({ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' });
  } else if (modelLower.startsWith('gemini')) {
    candidates.push({ provider: 'gemini', model: requestedModel });
    candidates.push({ provider: 'openrouter', model: `google/${requestedModel}` });
    candidates.push({ provider: 'groq', model: 'llama-3.3-70b-versatile' });
    candidates.push({ provider: 'openai', model: 'gpt-4o-mini' });
  } else if (modelLower.startsWith('deepseek')) {
    candidates.push({ provider: 'deepseek', model: requestedModel });
    candidates.push({ provider: 'groq', model: 'deepseek-r1-distill-llama-70b' });
    candidates.push({ provider: 'siliconflow', model: 'deepseek-ai/DeepSeek-V3' });
    candidates.push({ provider: 'cloudflare', model: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b' });
    candidates.push({ provider: 'openrouter', model: `deepseek/${requestedModel}` });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
  } else if (modelLower.startsWith('llama') || modelLower.startsWith('mixtral')) {
    candidates.push({ provider: 'groq', model: requestedModel });
    candidates.push({ provider: 'cerebras', model: 'llama-3.3-70b' });
    candidates.push({ provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct' });
    candidates.push({ provider: 'together', model: `meta-llama/${requestedModel}` });
    candidates.push({ provider: 'openrouter', model: `meta-llama/${requestedModel}` });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
  } else if (modelLower.startsWith('mistral') || modelLower.startsWith('codestral')) {
    candidates.push({ provider: 'mistral', model: requestedModel });
    candidates.push({ provider: 'openrouter', model: `mistralai/${requestedModel}` });
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
  } else if (modelLower.includes('/')) {
    // OpenRouter or SiliconFlow / Cloudflare style model
    if (modelLower.startsWith('deepseek-ai/')) {
      candidates.push({ provider: 'siliconflow', model: requestedModel });
    }
    candidates.push({ provider: 'openrouter', model: requestedModel });
    candidates.push({ provider: 'openai', model: 'gpt-4o' });
  } else {
    // Generic model: check custom or loop through enabled providers
    candidates.push({ provider: 'openai', model: requestedModel });
    candidates.push({ provider: 'openrouter', model: requestedModel });
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
  }

  // Also check if custom provider is enabled or has key
  if (getProviderApiKey('custom', headerKeys)) {
    candidates.push({ provider: 'custom', model: requestedModel });
  }

  return candidates;
}

/**
 * Dispatch chat completion request to a specific provider
 */
export async function executeProviderCall(
  provider: ProviderId,
  model: string,
  request: ChatCompletionRequest,
  headerKeys: Record<string, string> = {}
): Promise<Response> {
  const apiKey = getProviderApiKey(provider, headerKeys);
  const baseUrl = getProviderBaseUrl(provider, headerKeys);

  if (!apiKey && provider !== 'custom') {
    return new Response(
      JSON.stringify({ error: `API key not configured for provider: ${provider}` }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const reqWithTargetModel: ChatCompletionRequest = {
    ...request,
    model,
  };

  switch (provider) {
    case 'anthropic':
      return await callAnthropic(baseUrl, apiKey || '', reqWithTargetModel);
    case 'gemini':
      return await callGemini(baseUrl, apiKey || '', reqWithTargetModel);
    case 'openai':
    case 'deepseek':
    case 'groq':
    case 'openrouter':
    case 'mistral':
    case 'together':
    case 'custom':
    default:
      return await callOpenAICompatible(baseUrl, apiKey || '', reqWithTargetModel);
  }
}

/**
 * Main router engine with Multi-Tier Fallback and Token Optimization
 */
export async function routeChatCompletion(
  rawRequest: ChatCompletionRequest,
  headerKeys: Record<string, string> = {},
  options: { enableCompression?: boolean; cavemanMode?: boolean } = {}
): Promise<RouterExecutionResult> {
  // 1. Apply Token Optimization (RTK Token Saver & Caveman Mode)
  const { optimizedMessages, charsSaved } = optimizeMessages(rawRequest.messages, options);
  const tokensSaved = Math.round(charsSaved / 4);

  const request: ChatCompletionRequest = {
    ...rawRequest,
    messages: optimizedMessages,
  };

  // 2. Resolve candidates fallback chain
  const candidates = resolveCandidates(request.model, headerKeys);
  const failureLogs: string[] = [];
  let fallbackCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const apiKey = getProviderApiKey(candidate.provider, headerKeys);

    // Skip candidate if no API key is available
    if (!apiKey && candidate.provider !== 'custom') {
      failureLogs.push(`[${candidate.provider}/${candidate.model}]: Skipped (no API key)`);
      continue;
    }

    try {
      // Execute provider call with 25s timeout for serverless
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await executeProviderCall(candidate.provider, candidate.model, request, headerKeys);
      clearTimeout(timeoutId);

      // If success, return response
      if (res.ok) {
        return {
          response: res,
          servedBy: candidate.provider,
          servedModel: candidate.model,
          fallbackCount,
          tokensSaved,
        };
      }

      // Check for failover condition: Rate limit (429), Quota / Payment (402, 403), Server error (500, 502, 503, 504)
      const errorText = await res.text().catch(() => '');
      failureLogs.push(
        `[${candidate.provider}/${candidate.model}]: Status ${res.status} - ${errorText.slice(0, 150)}`
      );

      // Trigger fallback to next candidate
      fallbackCount++;
    } catch (err: any) {
      failureLogs.push(`[${candidate.provider}/${candidate.model}]: Error - ${err.message || err}`);
      fallbackCount++;
    }
  }

  // If all providers failed or none configured
  const errorPayload = {
    error: {
      message: 'All fallback providers failed to process the request.',
      type: 'router_fallback_exhausted',
      requested_model: rawRequest.model,
      failure_chain: failureLogs,
      hint: 'Please verify that your API keys are configured either in Vercel/Netlify Environment Variables or in the 9Router Web Dashboard.',
    },
  };

  return {
    response: new Response(JSON.stringify(errorPayload), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    }),
    servedBy: 'openai',
    servedModel: rawRequest.model,
    fallbackCount,
    tokensSaved,
  };
}
