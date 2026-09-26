import { callAnthropic } from './adapters/anthropic';
import { callGemini } from './adapters/gemini';
import { callOpenAICompatible } from './adapters/openai-compatible';
import {
  DEFAULT_FALLBACK_GROUPS,
  DEFAULT_PROVIDERS,
  getProviderApiKey,
  getProviderBaseUrl,
  getEffectiveProviderAccounts,
  getCloudflareAccountId,
} from './config';
import { optimizeMessages } from './optimizer';
import {
  ChatCompletionRequest,
  ChatMessage,
  ProviderId,
  ProviderAccount,
} from './types';

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
  accountUsed?: string;
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
    if (mLower.includes('coder') || mLower.includes('qwen')) {
      return '@cf/qwen/qwen2.5-coder-32b-instruct';
    }
    if (mLower.includes('llama-4') || mLower.includes('scout') || mLower.includes('maverick')) {
      return '@cf/meta/llama-4-scout-17b-16e-instruct';
    }
    if (mLower.includes('8b') || mLower.includes('1b') || mLower.includes('3b')) {
      return '@cf/meta/llama-3.1-8b-instruct-fp8';
    }
    // Default: llama-3.3-70b fp8-fast (the correct, non-deprecated name)
    return '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
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
 * Sanitizes messages so they comply with strict provider API requirements while
 * preserving non-text payloads (images, tool calls, tool results):
 * 1. Filters out messages that carry no content and no tool metadata.
 * 2. Trims text and drops empty text parts, but keeps image/tool parts intact.
 * 3. Discards leading 'assistant' messages (greetings from the playground/UI).
 * 4. Guarantees at least one valid 'user'-like message exists.
 */
export function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [{ role: 'user', content: 'Hello' }];
  }

  const valid: ChatMessage[] = [];
  for (const m of messages) {
    if (!m || !m.role) continue;
    const hasToolMeta = Boolean((m.tool_calls && m.tool_calls.length) || m.tool_call_id);

    if (typeof m.content === 'string') {
      const trimmed = m.content.trim();
      if (trimmed.length > 0 || hasToolMeta) {
        valid.push({ ...m, content: trimmed });
      }
    } else if (Array.isArray(m.content)) {
      const parts = m.content
        .map((p) => (p && p.type === 'text' ? { ...p, text: (p.text || '').trim() } : p))
        .filter((p) => p && (p.type !== 'text' || (p.text && p.text.length > 0)));
      if (parts.length > 0 || hasToolMeta) {
        valid.push({ ...m, content: parts });
      }
    } else if (hasToolMeta) {
      valid.push({ ...m, content: '' });
    }
  }

  if (valid.length === 0) {
    return [{ role: 'user', content: 'Hello' }];
  }

  // Discard any leading 'assistant' messages (greeting messages in playground or UI)
  while (valid.length > 0 && valid[0].role === 'assistant') {
    if (valid.length === 1) {
      // If it was the only message, turn it into a user message
      valid[0] = { ...valid[0], role: 'user' };
      break;
    }
    valid.shift();
  }

  // Ensure there is at least one user-like message (tool results also count)
  const hasUserLike = valid.some(
    (m) => m.role === 'user' || m.role === 'tool' || m.role === 'function'
  );
  if (!hasUserLike) {
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
  } else if (
    modelLower.startsWith('llama') || modelLower.startsWith('mixtral') || modelLower.startsWith('qwen')) {
    candidates.push({ provider: 'groq', model: requestedModel });
    candidates.push({ provider: 'cerebras', model: 'llama-3.3-70b' });
    candidates.push({ provider: 'together', model: requestedModel });
    candidates.push({ provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' });
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

  // 3. Multi-Provider Pool Inclusion: Append ANY provider configured by the user that has accounts or a key
  for (const prov of DEFAULT_PROVIDERS) {
    if (!candidates.some((c) => c.provider === prov.id)) {
      // Custom provider: active if it has a base URL configured (API key is optional for Ollama)
      if (prov.id === 'custom') {
        const customBaseUrl = (
          headerKeys['x-custom-base-url'] ||
          getProviderBaseUrl('custom', headerKeys)
        ).trim();
        // Only skip custom if it's literally the default localhost (not user-configured)
        const isUserConfigured = customBaseUrl &&
          customBaseUrl !== 'http://localhost:11434/v1' &&
          !customBaseUrl.includes('{');
        if (isUserConfigured) {
          candidates.push({ provider: 'custom', model: requestedModel });
        }
        continue;
      }
      const accounts = getEffectiveProviderAccounts(prov.id, headerKeys);
      const hasKey =
        accounts.some((a) => a.enabled !== false) ||
        Boolean(getProviderApiKey(prov.id, headerKeys));
      if (hasKey) {
        candidates.push({ provider: prov.id, model: prov.models[0] });
      }
    }
  }

  // 4. If the custom provider has a base URL configured (request header, dashboard
  //    config or env), put custom FIRST in the chain so it gets tried before the
  //    generic fallback tiers.
  const customBaseUrl = (
    headerKeys['x-custom-base-url'] ||
    getProviderBaseUrl('custom', headerKeys) ||
    ''
  ).trim();
  const isCustomConfigured =
    customBaseUrl && customBaseUrl !== 'http://localhost:11434/v1' && !customBaseUrl.includes('{');
  if (isCustomConfigured) {
    const alreadyFirst = candidates[0]?.provider === 'custom';
    if (!alreadyFirst) {
      // Move custom to front if it's in the list, otherwise insert it
      const customIdx = candidates.findIndex((c) => c.provider === 'custom');
      if (customIdx > 0) {
        const [customEntry] = candidates.splice(customIdx, 1);
        candidates.unshift(customEntry);
      } else if (customIdx === -1) {
        candidates.unshift({ provider: 'custom', model: requestedModel });
      }
    }
  }

  return candidates;
}

// Global round-robin pointer per provider for multi-account pool load balancing
const providerRoundRobinIndex: Record<string, number> = {};

/**
 * Universal 9Router-style multi-account pool execution engine.
 * Automatically round-robins across all connected accounts for a provider
 * and immediately fails over to the next account if one hits a rate limit (429),
 * quota exhaustion, or balance depletion (401/402).
 */
export async function executeProviderAccountPoolCall(
  provider: ProviderId,
  model: string,
  request: ChatCompletionRequest,
  headerKeys: Record<string, string> = {},
  signal?: AbortSignal
): Promise<{ response: Response; accountUsed?: ProviderAccount; errors: string[] }> {
  // Get all active accounts for this provider
  const accounts = getEffectiveProviderAccounts(provider, headerKeys).filter(
    (a) => a.enabled !== false
  );

  if (accounts.length === 0 && provider !== 'custom') {
    return {
      response: new Response(
        JSON.stringify({ error: `Tidak ada akun atau API key yang aktif untuk provider: ${provider}` }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
      errors: [`Provider ${provider} tidak memiliki akun aktif`],
    };
  }

  const targetModel = normalizeModelForProvider(provider, model);
  const sanitizedMessages = sanitizeMessages(request.messages);
  const reqWithTargetModel: ChatCompletionRequest = {
    ...request,
    model: targetModel,
    messages: sanitizedMessages,
  };

  // If custom provider with no specific accounts, use custom base url from header or env
  if (accounts.length === 0 && provider === 'custom') {
    const customUrl = (headerKeys['x-custom-base-url'] || '').trim() ||
      getProviderBaseUrl('custom', headerKeys);
    const customKey = (headerKeys['x-custom-key'] || '').trim();
    const res = await callOpenAICompatible(customUrl, customKey, reqWithTargetModel, signal);
    return { response: res, errors: [] };
  }

  const currentIdx = providerRoundRobinIndex[provider] || 0;
  providerRoundRobinIndex[provider] = currentIdx + 1;
  const startIdx = currentIdx % accounts.length;

  let lastResponse: Response | null = null;
  const poolErrors: string[] = [];

  for (let offset = 0; offset < accounts.length; offset++) {
    const account = accounts[(startIdx + offset) % accounts.length];

    // Determine effective Base URL for this specific account
    let baseUrl = account.baseUrl;
    if (!baseUrl || baseUrl.includes('{account_id}')) {
      if (provider === 'cloudflare') {
        // Try account.accountId first, then fall back to header
        const accId = (account.accountId || '').trim() || getCloudflareAccountId(headerKeys) || '';
        if (!accId) {
          poolErrors.push(`Akun "${account.name}": Cloudflare Account ID tidak ditemukan. Isi Account ID di tab Provider Tiers.`);
          continue;
        }
        baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accId}/ai/v1`;
      } else {
        baseUrl = getProviderBaseUrl(provider, headerKeys);
      }
    }

    try {
      let res: Response;
      if (provider === 'anthropic') {
        res = await callAnthropic(baseUrl, account.apiKey, reqWithTargetModel, signal);
      } else if (provider === 'gemini') {
        res = await callGemini(baseUrl, account.apiKey, reqWithTargetModel, signal);
      } else {
        res = await callOpenAICompatible(baseUrl, account.apiKey, reqWithTargetModel, signal);
      }

      if (res.ok) {
        account.lastUsedAt = new Date().toISOString();
        account.lastStatus = 'ok';
        return { response: res, accountUsed: account, errors: poolErrors };
      }

      // If failed (429 Rate Limit / Quota, 401 Auth, 402 Insufficient Balance, 403, 500)
      const errorText = await res.clone().text().catch(() => '');
      let parsedMsg = errorText.slice(0, 150);
      try {
        const parsed = JSON.parse(errorText);
        if (parsed?.error?.message) {
          parsedMsg = parsed.error.message;
        } else if (parsed?.message) {
          parsedMsg = parsed.message;
        } else if (parsed?.errors?.[0]?.message) {
          parsedMsg = parsed.errors[0].message;
        }
      } catch {}

      account.lastStatus = res.status === 429 ? 'rate_limited' : 'error';
      account.lastError = parsedMsg;

      const logMsg = `Akun "${account.name}": Status ${res.status} - ${parsedMsg}`;
      poolErrors.push(logMsg);
      lastResponse = res;
      // Auto-failover immediately to the next account in this provider's pool!
    } catch (err: any) {
      account.lastStatus = 'error';
      account.lastError = err.message || 'Network Error';
      poolErrors.push(`Akun "${account.name}": Network Error - ${err.message || err}`);
    }
  }

  return {
    response:
      lastResponse ||
      new Response(
        JSON.stringify({
          error: {
            message: `Semua (${accounts.length}) akun untuk ${provider} gagal memproses request.`,
            details: poolErrors,
          },
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ),
    errors: poolErrors,
  };
}

/**
 * Cloudflare pool helper for backwards compatibility
 */
export async function executeCloudflarePoolCall(
  model: string,
  request: ChatCompletionRequest,
  headerKeys: Record<string, string> = {},
  signal?: AbortSignal
): Promise<{ response: Response; accountUsed?: ProviderAccount; errors: string[] }> {
  return await executeProviderAccountPoolCall('cloudflare', model, request, headerKeys, signal);
}

/**
 * Dispatch chat completion request to a specific provider.
 * Supports multi-account rotation and failover for all providers.
 */
export async function executeProviderCall(
  provider: ProviderId,
  model: string,
  request: ChatCompletionRequest,
  headerKeys: Record<string, string> = {}
): Promise<Response> {
  const result = await executeProviderAccountPoolCall(provider, model, request, headerKeys);
  return result.response;
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
    const accounts = getEffectiveProviderAccounts(candidate.provider, headerKeys).filter(
      (a) => a.enabled !== false
    );
    const apiKey = getProviderApiKey(candidate.provider, headerKeys);

    // Skip candidate if no active account or API key is available
    if (accounts.length === 0 && !apiKey && candidate.provider !== 'custom') {
      failureLogs.push(`[${candidate.provider}/${candidate.model}]: Dilewati (Belum ada akun/key)`);
      continue;
    }

    try {
      // Execute provider call with a 110s timeout for serverless (streaming can be long).
      // The signal is passed down to fetch(), so hung upstreams are actually aborted.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 110000);

      let poolResult;
      try {
        // Execute across the provider's multi-account pool with automatic account failover
        poolResult = await executeProviderAccountPoolCall(
          candidate.provider,
          candidate.model,
          request,
          headerKeys,
          controller.signal
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const res = poolResult.response;
      const accountUsed = poolResult.accountUsed;

      if (poolResult.errors.length > 0) {
        failureLogs.push(...poolResult.errors.map((e) => `[${candidate.provider} pool]: ${e}`));
      }

      // If success, return response immediately!
      if (res.ok) {
        return {
          response: res,
          servedBy: candidate.provider,
          servedModel: normalizeModelForProvider(candidate.provider, candidate.model),
          fallbackCount,
          tokensSaved,
          accountUsed: accountUsed?.name,
          cfAccountUsed: candidate.provider === 'cloudflare' ? accountUsed?.name : undefined,
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
