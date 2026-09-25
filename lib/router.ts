import { callAnthropic } from './adapters/anthropic';
import { callGemini } from './adapters/gemini';
import { callOpenAICompatible } from './adapters/openai-compatible';
import {
  DEFAULT_FALLBACK_GROUPS,
  DEFAULT_PROVIDERS,
  getProviderApiKey,
  getProviderApiKeys,
  getProviderBaseUrl,
  getEffectiveCloudflareAccounts,
} from './config';
import { optimizeMessages } from './optimizer';
import { ChatCompletionRequest, ChatMessage, ProviderId, CloudflareAccount } from './types';

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
  cfAccountUsed?: string;
}

/**
 * Normalizes models to official supported names for each specific provider.
 * Prevents "Model not found" errors when calling providers like DeepSeek or Groq.
 */
export function normalizeModelForProvider(provider: ProviderId, model: string): string {
  const mLower = model.toLowerCase();

  if (provider === 'deepseek') {
    // DeepSeek official API (api.deepseek.com) ONLY accepts 'deepseek-chat' and 'deepseek-reasoner'
    if (mLower.includes('reasoner') || mLower.includes('r1')) {
      return 'deepseek-reasoner';
    }
    // Map deepseek-chat, deepseek-v4.1-flash, deepseek-v4, deepseek-v3, deepseek-coder to deepseek-chat
    return 'deepseek-chat';
  }

  if (provider === 'groq') {
    if (mLower.includes('r1') || mLower.includes('reasoner') || mLower.includes('deepseek')) {
      return 'deepseek-r1-distill-llama-70b';
    }
    if (mLower.includes('70b') || mLower.includes('smart') || mLower.includes('code')) {
      return 'llama-3.3-70b-versatile';
    }
    if (mLower.includes('8b') || mLower.includes('fast')) {
      return 'llama-3.1-8b-instant';
    }
    if (mLower.includes('qwen')) {
      return 'qwen-2.5-coder-32b';
    }
    return 'llama-3.3-70b-versatile';
  }

  if (provider === 'cloudflare') {
    if (mLower.includes('r1') || mLower.includes('deepseek')) {
      return '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b';
    }
    if (mLower.includes('70b')) {
      return '@cf/meta/llama-3.3-70b-instruct';
    }
    if (mLower.includes('coder') || mLower.includes('qwen')) {
      return '@cf/qwen/qwen2.5-coder-32b-instruct';
    }
    return '@cf/meta/llama-3.3-70b-instruct';
  }

  if (provider === 'siliconflow') {
    if (mLower.includes('r1') || mLower.includes('reasoner')) {
      return 'deepseek-ai/DeepSeek-R1';
    }
    return 'deepseek-ai/DeepSeek-V3';
  }

  if (provider === 'together') {
    if (mLower.includes('r1') || mLower.includes('reasoner')) {
      return 'deepseek-ai/DeepSeek-R1';
    }
    if (mLower.includes('coder') || mLower.includes('qwen')) {
      return 'Qwen/Qwen2.5-Coder-32B-Instruct';
    }
    return 'deepseek-ai/DeepSeek-V3';
  }

  if (provider === 'gemini') {
    if (mLower.includes('thinking') || mLower.includes('reason')) {
      return 'gemini-2.0-flash-thinking-exp-01-21';
    }
    if (mLower.includes('pro')) {
      return 'gemini-1.5-pro';
    }
    return 'gemini-2.0-flash';
  }

  if (provider === 'openai') {
    if (mLower.includes('mini')) return 'gpt-4o-mini';
    if (mLower.includes('o3')) return 'o3-mini';
    if (mLower.includes('o1')) return 'o1';
    return 'gpt-4o';
  }

  if (provider === 'anthropic') {
    if (mLower.includes('3.7') || mLower.includes('3-7')) return 'claude-3-7-sonnet-20250219';
    if (mLower.includes('haiku')) return 'claude-3-5-haiku-20241022';
    return 'claude-3-5-sonnet-20241022';
  }

  return model;
}

/**
 * Sanitizes messages so they comply with strict provider API requirements:
 * 1. DeepSeek, Anthropic, Mistral reject requests where the FIRST message is 'assistant'.
 * 2. Filters out empty content messages.
 * 3. Guarantees at least one valid 'user' message exists.
 */
export function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [{ role: 'user', content: 'Hello' }];
  }

  // 1. Filter out empty or whitespace-only messages
  let valid: ChatMessage[] = [];
  for (const m of messages) {
    if (!m) continue;
    let content = '';
    if (typeof m.content === 'string') {
      content = m.content.trim();
    } else if (Array.isArray(m.content)) {
      content = m.content.map((c) => c.text || '').join('').trim();
    }
    if (content.length > 0) {
      valid.push({ ...m, content });
    }
  }

  if (valid.length === 0) {
    return [{ role: 'user', content: 'Hello' }];
  }

  // 2. Discard any leading 'assistant' messages (greeting messages in playground or UI)
  while (valid.length > 0 && valid[0].role === 'assistant') {
    if (valid.length === 1) {
      // If it was the only message, turn it into a user message
      valid[0] = { ...valid[0], role: 'user' };
      break;
    }
    valid.shift();
  }

  // 3. Ensure there is at least one 'user' message
  const hasUser = valid.some((m) => m.role === 'user');
  if (!hasUser) {
    valid.push({ role: 'user', content: 'Proceed' });
  }

  return valid;
}

/**
 * Resolve ordered candidate list for a given requested model.
 * Pools multiple providers together for seamless failover and load balancing.
 */
export function resolveCandidates(
  requestedModel: string,
  headerKeys: Record<string, string> = {}
): RouteCandidate[] {
  // 1. Check if it's one of the predefined virtual fallback groups
  const group = DEFAULT_FALLBACK_GROUPS.find(
    (g) => g.id.toLowerCase() === requestedModel.toLowerCase()
  );
  if (group) {
    return [...group.providers];
  }

  const modelLower = requestedModel.toLowerCase();
  const candidates: RouteCandidate[] = [];

  // 2. Model-specific primary chains
  if (modelLower.startsWith('@cf/') || modelLower.includes('cloudflare')) {
    candidates.push({ provider: 'cloudflare', model: requestedModel });
    candidates.push({ provider: 'groq', model: 'llama-3.3-70b-versatile' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
  } else if (modelLower.startsWith('sonar')) {
    candidates.push({ provider: 'perplexity', model: requestedModel });
    candidates.push({ provider: 'openai', model: 'gpt-4o' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
  } else if (modelLower.startsWith('claude')) {
    candidates.push({ provider: 'anthropic', model: requestedModel });
    candidates.push({ provider: 'openrouter', model: `anthropic/${requestedModel}` });
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
    candidates.push({ provider: 'openai', model: 'gpt-4o' });
  } else if (
    modelLower.startsWith('gpt-') ||
    modelLower.startsWith('o1') ||
    modelLower.startsWith('o3') ||
    modelLower.startsWith('chatgpt')
  ) {
    candidates.push({ provider: 'openai', model: requestedModel });
    candidates.push({ provider: 'openrouter', model: `openai/${requestedModel}` });
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
    candidates.push({ provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' });
  } else if (modelLower.startsWith('gemini')) {
    candidates.push({ provider: 'gemini', model: requestedModel });
    candidates.push({ provider: 'openrouter', model: `google/${requestedModel}` });
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
    candidates.push({ provider: 'groq', model: 'llama-3.3-70b-versatile' });
    candidates.push({ provider: 'openai', model: 'gpt-4o-mini' });
  } else if (modelLower.startsWith('deepseek')) {
    // DeepSeek family multi-provider pool
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
    candidates.push({ provider: 'groq', model: 'deepseek-r1-distill-llama-70b' });
    candidates.push({ provider: 'siliconflow', model: 'deepseek-ai/DeepSeek-V3' });
    candidates.push({ provider: 'together', model: 'deepseek-ai/DeepSeek-V3' });
    candidates.push({ provider: 'openrouter', model: 'deepseek/deepseek-chat' });
    candidates.push({ provider: 'cloudflare', model: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
    candidates.push({ provider: 'openai', model: 'gpt-4o-mini' });
  } else if (modelLower.startsWith('llama') || modelLower.startsWith('mixtral') || modelLower.startsWith('qwen')) {
    candidates.push({ provider: 'groq', model: requestedModel });
    candidates.push({ provider: 'cerebras', model: 'llama-3.3-70b' });
    candidates.push({ provider: 'together', model: requestedModel });
    candidates.push({ provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct' });
    candidates.push({ provider: 'siliconflow', model: requestedModel });
    candidates.push({ provider: 'openrouter', model: requestedModel });
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
  } else if (modelLower.startsWith('mistral') || modelLower.startsWith('codestral')) {
    candidates.push({ provider: 'mistral', model: requestedModel });
    candidates.push({ provider: 'openrouter', model: `mistralai/${requestedModel}` });
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
  } else {
    // Generic fallback chain
    candidates.push({ provider: 'deepseek', model: 'deepseek-chat' });
    candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash' });
    candidates.push({ provider: 'openai', model: 'gpt-4o' });
    candidates.push({ provider: 'openrouter', model: requestedModel });
    candidates.push({ provider: 'groq', model: 'llama-3.3-70b-versatile' });
  }

  // 3. Multi-Provider Pool Inclusion: Append ANY provider configured by the user that has a key
  for (const prov of DEFAULT_PROVIDERS) {
    if (!candidates.some((c) => c.provider === prov.id)) {
      const hasKey =
        prov.id === 'cloudflare'
          ? getEffectiveCloudflareAccounts(headerKeys).some((a) => a.enabled !== false) ||
            Boolean(getProviderApiKey('cloudflare', headerKeys))
          : Boolean(getProviderApiKey(prov.id, headerKeys));
      if (hasKey) {
        candidates.push({ provider: prov.id, model: prov.models[0] });
      }
    }
  }

  return candidates;
}

// Global round-robin pointer for Cloudflare accounts pool
let cfRoundRobinIdx = 0;

/**
 * Executes a call across the pooled Cloudflare accounts.
 * Automatically round-robins requests and fails over to the next account
 * if an account reaches its 10,000 neurons/day quota (HTTP 429) or errors out.
 */
export async function executeCloudflarePoolCall(
  model: string,
  request: ChatCompletionRequest,
  headerKeys: Record<string, string> = {}
): Promise<{ response: Response; accountUsed?: CloudflareAccount; errors: string[] }> {
  const accounts = getEffectiveCloudflareAccounts(headerKeys).filter((a) => a.enabled !== false);

  if (accounts.length === 0) {
    return {
      response: new Response(
        JSON.stringify({ error: 'Tidak ada akun Cloudflare yang terkonfigurasi atau aktif.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
      errors: ['Tidak ada akun Cloudflare yang aktif di pool.'],
    };
  }

  const targetModel = normalizeModelForProvider('cloudflare', model);
  const sanitizedMessages = sanitizeMessages(request.messages);
  const reqWithTargetModel: ChatCompletionRequest = {
    ...request,
    model: targetModel,
    messages: sanitizedMessages,
  };

  const startIdx = cfRoundRobinIdx % accounts.length;
  cfRoundRobinIdx++;

  let lastResponse: Response | null = null;
  const cfErrors: string[] = [];

  for (let offset = 0; offset < accounts.length; offset++) {
    const account = accounts[(startIdx + offset) % accounts.length];
    const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${account.accountId.trim()}/ai/v1`;

    try {
      const res = await callOpenAICompatible(baseUrl, account.apiToken.trim(), reqWithTargetModel);
      if (res.ok) {
        account.lastUsedAt = new Date().toISOString();
        return { response: res, accountUsed: account, errors: cfErrors };
      }

      // If failed (e.g. 429 Quota Exceeded / Rate Limit, 401, 403, 500)
      const errorText = await res.clone().text().catch(() => '');
      let parsedMsg = errorText.slice(0, 150);
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.errors?.[0]?.message) {
          parsedMsg = parsed.errors[0].message;
        } else if (parsed?.error?.message) {
          parsedMsg = parsed.error.message;
        }
      } catch {}

      const logMsg = `Akun "${account.name}" (${account.accountId.slice(0, 6)}...): Status ${res.status} - ${parsedMsg}`;
      cfErrors.push(logMsg);
      lastResponse = res;
      // Continue loop to failover automatically to the next Cloudflare account!
    } catch (err: any) {
      cfErrors.push(`Akun "${account.name}": Network Error - ${err.message || err}`);
    }
  }

  // If all accounts in pool failed:
  return {
    response:
      lastResponse ||
      new Response(
        JSON.stringify({
          error: {
            message: `Semua (${accounts.length}) akun Cloudflare di pool gagal memproses request.`,
            details: cfErrors,
          },
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ),
    errors: cfErrors,
  };
}

/**
 * Dispatch chat completion request to a specific provider.
 * Supports multi-key rotation and failover for providers configured with multiple keys.
 */
export async function executeProviderCall(
  provider: ProviderId,
  model: string,
  request: ChatCompletionRequest,
  headerKeys: Record<string, string> = {}
): Promise<Response> {
  const apiKeys = getProviderApiKeys(provider, headerKeys);
  const baseUrl = getProviderBaseUrl(provider, headerKeys);

  if (apiKeys.length === 0 && provider !== 'custom') {
    return new Response(
      JSON.stringify({ error: `API key not configured for provider: ${provider}` }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Normalize model ID for the specific provider and sanitize messages
  const targetModel = normalizeModelForProvider(provider, model);
  const sanitizedMessages = sanitizeMessages(request.messages);

  const reqWithTargetModel: ChatCompletionRequest = {
    ...request,
    model: targetModel,
    messages: sanitizedMessages,
  };

  const callWithKey = async (apiKey: string) => {
    switch (provider) {
      case 'anthropic':
        return await callAnthropic(baseUrl, apiKey, reqWithTargetModel);
      case 'gemini':
        return await callGemini(baseUrl, apiKey, reqWithTargetModel);
      case 'openai':
      case 'deepseek':
      case 'groq':
      case 'openrouter':
      case 'mistral':
      case 'together':
      case 'cloudflare':
      case 'cerebras':
      case 'siliconflow':
      case 'perplexity':
      case 'custom':
      default:
        return await callOpenAICompatible(baseUrl, apiKey, reqWithTargetModel);
    }
  };

  // If multiple keys configured, try each on rate limit (429) or auth error (401/403)
  let lastRes: Response | null = null;
  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    try {
      const res = await callWithKey(key);
      if (res.ok) {
        return res;
      }
      lastRes = res;
      if ((res.status === 429 || res.status === 401 || res.status === 403) && i < apiKeys.length - 1) {
        continue;
      }
      return res;
    } catch (e) {
      if (i === apiKeys.length - 1) throw e;
    }
  }

  return (
    lastRes ||
    new Response(JSON.stringify({ error: 'No response from provider' }), { status: 500 })
  );
}

/**
 * Main router engine with Multi-Tier Fallback and Token Optimization
 */
export async function routeChatCompletion(
  rawRequest: ChatCompletionRequest,
  headerKeys: Record<string, string> = {},
  options: { enableCompression?: boolean; cavemanMode?: boolean } = {}
): Promise<RouterExecutionResult> {
  // 1. Sanitize incoming messages before compression
  const cleanedMessages = sanitizeMessages(rawRequest.messages);

  // 2. Apply Token Optimization (RTK Token Saver & Caveman Mode)
  const { optimizedMessages, charsSaved } = optimizeMessages(cleanedMessages, options);
  const tokensSaved = Math.round(charsSaved / 4);

  const request: ChatCompletionRequest = {
    ...rawRequest,
    messages: optimizedMessages,
  };

  // 3. Resolve candidates multi-provider pool
  const candidates = resolveCandidates(request.model, headerKeys);
  const failureLogs: string[] = [];
  let fallbackCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const isCloudflare = candidate.provider === 'cloudflare';
    const cfAccounts = isCloudflare
      ? getEffectiveCloudflareAccounts(headerKeys).filter((a) => a.enabled !== false)
      : [];
    const apiKey = getProviderApiKey(candidate.provider, headerKeys);

    // Skip candidate if no API key is available (and no active CF accounts if cloudflare)
    if (!apiKey && (!isCloudflare || cfAccounts.length === 0) && candidate.provider !== 'custom') {
      failureLogs.push(`[${candidate.provider}/${candidate.model}]: Dilewati (API key / akun belum diisi)`);
      continue;
    }

    try {
      // Execute provider call with 30s timeout for serverless
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let res: Response;
      let cfAccountUsedName: string | undefined;

      if (isCloudflare && cfAccounts.length > 0) {
        // Multi-Account Cloudflare Pool execution with automatic quota failover
        const cfResult = await executeCloudflarePoolCall(candidate.model, request, headerKeys);
        res = cfResult.response;
        cfAccountUsedName = cfResult.accountUsed?.name;
        if (cfResult.errors.length > 0) {
          failureLogs.push(...cfResult.errors.map((e) => `[cloudflare pool]: ${e}`));
        }
      } else {
        res = await executeProviderCall(
          candidate.provider,
          candidate.model,
          request,
          headerKeys
        );
      }
      clearTimeout(timeoutId);

      // If success, return response immediately!
      if (res.ok) {
        return {
          response: res,
          servedBy: candidate.provider,
          servedModel: normalizeModelForProvider(candidate.provider, candidate.model),
          fallbackCount,
          tokensSaved,
          cfAccountUsed: cfAccountUsedName,
        };
      }

      // If provider failed, capture the exact error message
      const errorText = await res.text().catch(() => '');
      let parsedMsg = errorText.slice(0, 200);
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.message) {
          parsedMsg = parsed.error.message;
        } else if (parsed?.message) {
          parsedMsg = parsed.message;
        }
      } catch {}

      failureLogs.push(
        `[${candidate.provider}/${candidate.model}]: Status ${res.status} - ${parsedMsg}`
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
      message: 'Semua provider dalam fallback pool gagal memproses request.',
      type: 'router_fallback_exhausted',
      requested_model: rawRequest.model,
      failure_chain: failureLogs,
      hint: 'Pastikan API key provider sudah diisi dan disimpan di menu "Provider Tiers" atau di file .env / Cloud Database.',
    },
  };

  return {
    response: new Response(JSON.stringify(errorPayload), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    }),
    servedBy: 'deepseek',
    servedModel: rawRequest.model,
    fallbackCount,
    tokensSaved,
  };
}
