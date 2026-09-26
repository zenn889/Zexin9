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
  getCloudflareApiBase,
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
  /** Failure logs from earlier candidates when a fallback was needed. */
  failureLogs?: string[];
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
    // Workers AI models are addressed by their full @cf/... ids. Pass any
    // explicit @cf/ model straight through — the old family mapping rewrote
    // them (e.g. @cf/qwen/qwen3-30b-a3b-fp8 silently became qwen2.5-coder),
    // so users could never actually use the model they picked.
    if (mLower.startsWith('@cf/')) {
      return model.trim();
    }
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

/** Base URLs of enabled custom-provider accounts that point at a real endpoint. */
function getCustomAccountBaseUrls(headerKeys: Record<string, string> = {}): string[] {
  return getEffectiveProviderAccounts('custom', headerKeys)
    .filter((a) => a.enabled !== false)
    .map((a) => (a.baseUrl || '').trim())
    .filter((u) => u.length > 0 && u !== 'http://localhost:11434/v1' && !u.includes('{'));
}

/**
 * True when the user configured the custom provider with a real endpoint:
 * via the x-custom-base-url header, the saved provider settings, or a
 * connected account (each account stores its own endpoint URL).
 */
function isCustomProviderConfigured(headerKeys: Record<string, string> = {}): boolean {
  const headerOrStored = (
    headerKeys['x-custom-base-url'] ||
    getProviderBaseUrl('custom', headerKeys) ||
    ''
  ).trim();
  const directlyConfigured =
    headerOrStored.length > 0 &&
    headerOrStored !== 'http://localhost:11434/v1' &&
    !headerOrStored.includes('{');
  return Boolean(directlyConfigured || getCustomAccountBaseUrls(headerKeys).length > 0);
}

/**
 * Resolve ordered candidate list for a given requested model.
 * Pools multiple providers together for seamless failover and load balancing.
 */
export function resolveCandidates(
  requestedModel: string,
  headerKeys: Record<string, string> = {}
): RouteCandidate[] {
  // 1. If it's a virtual fallback group (auto-smart, etc.), expand it but STILL
  //    include the user's configured providers — above all the custom endpoint.
  //    (Previously this returned the static chain only, so a Playground set to a
  //    virtual group never reached the user's own endpoint and finished with
  //    "Semua provider ... Dilewati (Belum ada akun/key)" even with accounts.)
  const group = DEFAULT_FALLBACK_GROUPS.find(
    (g) => g.id.toLowerCase() === requestedModel.toLowerCase()
  );
  if (group) {
    return appendUserConfiguredCandidates(
      [...group.providers],
      requestedModel,
      headerKeys,
      getCustomPreferredModels(headerKeys),
      true
    );
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

  // 3./4. Merge in every provider the user actually configured (custom first).
  return appendUserConfiguredCandidates(candidates, requestedModel, headerKeys);
}

/**
 * Models to try on a connected custom endpoint when the request targets a
 * virtual fallback group (e.g. "Auto Smart") — the group id itself is not a
 * real model name, so use the models detection verified/discovered instead.
 */
function getCustomPreferredModels(headerKeys: Record<string, string> = {}): string[] {
  return getAccountPreferredModels('custom', headerKeys);
}

/**
 * The models a provider's connected accounts are known to serve: verified
 * first, then detected. Used for virtual-group requests so the user's own
 * accounts (custom endpoint, Cloudflare pool, …) are tried with real models.
 */
function getAccountPreferredModels(
  providerId: ProviderId,
  headerKeys: Record<string, string> = {}
): string[] {
  const out: string[] = [];
  const accounts = getEffectiveProviderAccounts(providerId, headerKeys).filter(
    (a) => a.enabled !== false
  );
  for (const acc of accounts) {
    const list = [...(acc.verifiedModels || []), ...(acc.detectedModels || [])];
    let takenForAccount = 0;
    for (const m of list) {
      const clean = String(m || '').trim();
      if (!clean || out.includes(clean)) continue;
      out.push(clean);
      takenForAccount++;
      // Spread the candidates across accounts: several API endpoints can be
      // connected at once, and each one should contribute models — not only
      // the first account that happens to have a long list.
      if (takenForAccount >= 3) break;
    }
    if (out.length >= 9) break;
  }
  return out.slice(0, 9);
}

/**
 * Adds every provider the user actually configured to a candidate chain and
 * puts the custom endpoint first. Used by BOTH the normal model paths and the
 * virtual-group path so a user's own endpoint is never skipped.
 */
function appendUserConfiguredCandidates(
  base: RouteCandidate[],
  requestedModel: string,
  headerKeys: Record<string, string> = {},
  customModelsOverride?: string[],
  includeAccountModels?: boolean
): RouteCandidate[] {
  const candidates = [...base];

  // Custom endpoint: active when a real endpoint is configured — via the
  // x-custom-base-url header, the saved settings, or a connected account
  // (the "Provider Accounts" form stores the endpoint on the account itself).
  if (isCustomProviderConfigured(headerKeys)) {
    const customModels =
      customModelsOverride && customModelsOverride.length > 0
        ? customModelsOverride
        : [requestedModel];
    for (const m of customModels) {
      const clean = String(m || '').trim();
      if (!clean) continue;
      if (!candidates.some((c) => c.provider === 'custom' && c.model === clean)) {
        candidates.push({ provider: 'custom', model: clean });
      }
    }
  }

  // Any other provider with an account or key also joins the chain.
  for (const prov of DEFAULT_PROVIDERS) {
    if (prov.id === 'custom') continue;
    if (!candidates.some((c) => c.provider === prov.id)) {
      const accounts = getEffectiveProviderAccounts(prov.id, headerKeys);
      const hasKey =
        accounts.some((a) => a.enabled !== false) ||
        Boolean(getProviderApiKey(prov.id, headerKeys));
      if (hasKey) {
        candidates.push({ provider: prov.id, model: prov.models[0] });
      }
    }
  }

  // Virtual-group requests should also reach the models the user's own accounts
  // actually serve (Cloudflare pool catalog, verified models, …) — otherwise a
  // group like auto-smart would only ever use the built-in default model.
  if (includeAccountModels) {
    for (const prov of DEFAULT_PROVIDERS) {
      if (prov.id === 'custom') continue;
      for (const m of getAccountPreferredModels(prov.id, headerKeys)) {
        if (!candidates.some((c) => c.provider === prov.id && c.model === m)) {
          candidates.push({ provider: prov.id, model: m });
        }
      }
    }
  }

  // Custom first so the user's own endpoint is tried before generic tiers.
  if (candidates.some((c) => c.provider === 'custom')) {
    const customs = candidates.filter((c) => c.provider === 'custom');
    const rest = candidates.filter((c) => c.provider !== 'custom');
    return [...customs, ...rest];
  }
  return candidates;
}

// Global round-robin pointer per provider for multi-account pool load balancing
const providerRoundRobinIndex: Record<string, number> = {};

/**
 * Some custom endpoints (Claude resellers, Anthropic-style proxies) do not
 * implement the OpenAI chat route at all: /v1/models works, but
 * /v1/chat/completions answers with a generic 404 ("Not found.") while the
 * Anthropic Messages route (/v1/messages) works fine. This detects that
 * specific situation so the call can be retried in Anthropic format.
 */
async function isRouteLevel404(res: Response): Promise<boolean> {
  if (res.status !== 404) return false;
  try {
    const text = (await res.clone().text()).toLowerCase();
    // Model-specific 404s mention the model name; route-level ones don't.
    return text.length > 0 && !text.includes('model');
  } catch {
    return false;
  }
}

/** Returns a copy of the response tagged with the upstream protocol that served it. */
function tagUpstreamProtocol(res: Response, protocol: string): Response {
  const headers = new Headers(res.headers);
  headers.set('x-router-upstream-protocol', protocol);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/**
 * Calls a custom endpoint in OpenAI format and, when the endpoint has no
 * OpenAI chat route at all, retries the same request in Anthropic Messages
 * format (with full request/response translation via the anthropic adapter).
 */
async function callCustomWithProtocolFallback(
  baseUrl: string,
  apiKey: string,
  request: ChatCompletionRequest,
  signal?: AbortSignal
): Promise<Response> {
  const res = await callOpenAICompatible(baseUrl, apiKey, request, signal);
  if (!(await isRouteLevel404(res))) return res;
  try {
    const alt = await callAnthropic(baseUrl, apiKey, request, signal);
    if (alt.ok) return tagUpstreamProtocol(alt, 'anthropic-messages');
    // Both formats failed. Prefer the Anthropic response when it carries a more
    // specific failure (401 auth, 429 quota, 400 bad model) than the blanket
    // route-level 404 — it tells the user what actually went wrong.
    if (alt.status !== 404) return alt;
  } catch {
    // fall through to the original response below
  }
  return res;
}

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
    const res = await callCustomWithProtocolFallback(customUrl, customKey, reqWithTargetModel, signal);
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
        baseUrl = `${getCloudflareApiBase()}/accounts/${accId}/ai/v1`;
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
      } else if (provider === 'custom') {
        // Custom endpoints may speak either OpenAI or Anthropic Messages format.
        res = await callCustomWithProtocolFallback(baseUrl, account.apiKey, reqWithTargetModel, signal);
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
  headerKeys: Record<string, string> = {},
  signal?: AbortSignal
): Promise<Response> {
  const result = await executeProviderAccountPoolCall(provider, model, request, headerKeys, signal);
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
      // Execute provider call with a generous timeout. Streaming answers for
      // heavy coding tasks can run for minutes — the old 110s cap cut them off
      // mid-stream. Tunable via ROUTER_REQUEST_TIMEOUT_MS (default ~4m40s).
      const controller = new AbortController();
      const requestTimeoutMs = Number(process.env.ROUTER_REQUEST_TIMEOUT_MS || 280000);
      const timeoutId = setTimeout(
        () => controller.abort(),
        Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0 ? requestTimeoutMs : 280000
      );

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
          failureLogs,
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
  const allSkipped =
    failureLogs.length > 0 && failureLogs.every((l) => l.includes('Dilewati'));
  const errorPayload = {
    error: {
      message: 'Semua provider dalam fallback pool gagal memproses request.',
      type: 'router_fallback_exhausted',
      requested_model: rawRequest.model,
      failure_chain: failureLogs,
      hint: allSkipped
        ? 'Semua kandidat dilewati karena instance ini tidak menemukan akun/key provider. Jika akun sudah ditambahkan lewat dashboard: buka dashboard sekali supaya konfigurasi tersinkron dari database, dan pastikan env database cloud terpasang di deployment (MONGODB_URI / SUPABASE_URL + SUPABASE_KEY / KV_REST_API_URL + KV_REST_API_TOKEN). Instance serverless yang baru start menarik konfigurasi dari database saat request pertama masuk.'
        : 'Pastikan API key provider sudah diisi dan disimpan di menu "Provider Tiers" atau di file .env / Cloud Database.',
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
    failureLogs,
  };
}
