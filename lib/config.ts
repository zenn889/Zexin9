import { CloudflareAccount, ModelFallbackGroup, ProviderConfig, ProviderId, ProviderAccount } from './types';

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    enabled: true,
    priority: 1,
    models: [
      'claude-3-7-sonnet-20250219',
      'claude-3-7-sonnet-latest',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-20241022',
      'claude-3-5-haiku-latest',
      'claude-3-opus-20240229',
      'claude-3-opus-latest',
      'claude-3-haiku-20240307',
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    enabled: true,
    priority: 2,
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'o3-mini',
      'o3-mini-high',
      'o1',
      'o1-mini',
      'o1-preview',
      'gpt-4.5-preview',
      'chatgpt-4o-latest',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    enabled: true,
    priority: 3,
    models: [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-thinking-exp-01-21',
      'gemini-2.0-pro-exp-02-05',
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-flash-latest',
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    enabled: true,
    priority: 4,
    models: [
      'deepseek-chat',
      'deepseek-reasoner',
      'deepseek-v4.1-flash',
      'deepseek-v4',
      'deepseek-v3',
      'deepseek-coder',
      'deepseek-coder-v2.5',
      'deepseek-coder-33b-instruct',
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
    ],
  },
  {
    id: 'groq',
    name: 'Groq (Ultra-Fast LPU)',
    baseUrl: 'https://api.groq.com/openai/v1',
    enabled: true,
    priority: 5,
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-11b-vision-preview',
      'llama-3.2-90b-vision-preview',
      'deepseek-r1-distill-llama-70b',
      'deepseek-r1-distill-qwen-32b',
      'qwen-2.5-coder-32b',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    enabled: true,
    priority: 6,
    models: [
      'anthropic/claude-3.7-sonnet',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'openai/o3-mini',
      'deepseek/deepseek-r1',
      'deepseek/deepseek-chat',
      'google/gemini-2.0-flash-001',
      'google/gemini-2.0-pro-exp-02-05:free',
      'qwen/qwen-2.5-coder-32b-instruct',
      'meta-llama/llama-3.3-70b-instruct',
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    enabled: true,
    priority: 7,
    models: [
      'codestral-latest',
      'codestral-2501',
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
      'ministral-8b-latest',
      'ministral-3b-latest',
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    enabled: true,
    priority: 8,
    models: [
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-V3',
    ],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1',
    enabled: true,
    priority: 9,
    models: [
      // Text-generation catalog (updated from developers.cloudflare.com/workers-ai/models).
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      '@cf/meta/llama-3.1-8b-instruct-fp8',
      '@cf/meta/llama-3.2-3b-instruct',
      '@cf/meta/llama-3.2-1b-instruct',
      '@cf/meta/llama-4-scout-17b-16e-instruct',
      '@cf/deepseek-ai/deepseek-v4-flash-0731',
      '@cf/deepseek-ai/deepseek-v4-pro-0813',
      '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      '@cf/qwen/qwen3-30b-a3b-fp8',
      '@cf/qwen/qwen2.5-coder-32b-instruct',
      '@cf/qwen/qwq-32b',
      '@cf/google/gemma-4-26b-a4b-it',
      '@cf/mistralai/mistral-small-3.1-24b-instruct',
      '@cf/zai-org/glm-5.3',
      '@cf/zai-org/glm-4.7-flash',
      '@cf/moonshotai/kimi-k2.7-code',
      '@cf/moonshotai/kimi-k2.6',
      '@cf/openai/gpt-oss-120b',
      '@cf/openai/gpt-oss-20b',
      '@cf/ibm-granite/granite-4.0-h-micro',
    ],
  },
  {
    id: 'cerebras',
    name: 'Cerebras AI (1,800 tok/s)',
    baseUrl: 'https://api.cerebras.ai/v1',
    enabled: true,
    priority: 10,
    models: [
      'llama-3.3-70b',
      'llama3.1-8b',
      'llama3.1-70b',
    ],
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow (SiliconCloud)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    enabled: true,
    priority: 11,
    models: [
      'deepseek-ai/DeepSeek-V3',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/DeepSeek-V2.5',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
      'Qwen/Qwen2.5-Coder-7B-Instruct',
      'meta-llama/Meta-Llama-3.1-70B-Instruct',
    ],
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    baseUrl: 'https://api.perplexity.ai',
    enabled: true,
    priority: 12,
    models: [
      'sonar-pro',
      'sonar',
      'sonar-reasoning',
      'sonar-reasoning-pro',
      'r1-1776',
    ],
  },
  {
    id: 'custom',
    name: 'Custom / Ollama / Local',
    baseUrl: 'http://localhost:11434/v1',
    enabled: false,
    priority: 13,
    models: [
      'qwen2.5-coder:latest',
      'qwen2.5-coder:32b',
      'llama3.3:latest',
      'deepseek-r1:latest',
      'deepseek-r1:14b',
      'deepseek-r1:32b',
      'mistral:latest',
    ],
  },
];

// Fallback Groups: When a user requests a virtual model or a specific model fails,
// the gateway cascades through this fallback chain in order.
export const DEFAULT_FALLBACK_GROUPS: ModelFallbackGroup[] = [
  {
    id: 'auto-smart',
    name: 'Auto Smart (Best for Coding & Cursor/Cline)',
    description: 'Cascades through top frontier models: Claude 3.7/3.5 -> GPT-4o -> DeepSeek V3 -> Gemini 2.0 Flash -> Cloudflare',
    tag: 'smart',
    providers: [
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'gemini', model: 'gemini-2.0-flash' },
      { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
      { provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
      { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    ],
  },
  {
    id: 'auto-fast',
    name: 'Auto Fast (Low Latency & High Rate-Limits)',
    description: 'Ultra-fast execution: Groq LLaMA 3.3 70B -> Cloudflare -> Gemini 2.0 Flash -> DeepSeek Chat -> GPT-4o-mini',
    tag: 'fast',
    providers: [
      { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      { provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
      { provider: 'gemini', model: 'gemini-2.0-flash' },
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'openai', model: 'gpt-4o-mini' },
    ],
  },
  {
    id: 'auto-reason',
    name: 'Auto Reasoning (Complex Logic & Math)',
    description: 'Deep reasoning models: DeepSeek R1 -> Gemini 2.0 Flash Thinking -> OpenAI o3-mini -> Cloudflare R1',
    tag: 'reason',
    providers: [
      { provider: 'deepseek', model: 'deepseek-reasoner' },
      { provider: 'gemini', model: 'gemini-2.0-flash-thinking-exp-01-21' },
      { provider: 'openai', model: 'o3-mini' },
      { provider: 'groq', model: 'deepseek-r1-distill-llama-70b' },
      { provider: 'cloudflare', model: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b' },
    ],
  },
  {
    id: 'auto-code',
    name: 'Auto Code (Specialized Coding Engine)',
    description: 'Optimized for diffs & programming: Claude 3.5 Sonnet -> Mistral Codestral -> Qwen 2.5 Coder -> DeepSeek V3 -> Cloudflare Qwen',
    tag: 'code',
    providers: [
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'mistral', model: 'codestral-latest' },
      { provider: 'together', model: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'cloudflare', model: '@cf/qwen/qwen2.5-coder-32b-instruct' },
      { provider: 'groq', model: 'qwen-2.5-coder-32b' },
    ],
  },
];

// In-memory runtime store for server-saved provider keys
let runtimeStoredKeys: Record<string, string> = {};
let runtimeStoredBaseUrls: Record<string, string> = {};
let runtimeCfAccountId: string = '';
let runtimeCfAccounts: CloudflareAccount[] = [];
let runtimeProviderAccounts: ProviderAccount[] = [];

export function setRuntimeStoredKeys(keys: Record<string, string>) {
  runtimeStoredKeys = { ...keys };
}

export function setRuntimeStoredBaseUrls(urls: Record<string, string>) {
  runtimeStoredBaseUrls = { ...urls };
}

export function setRuntimeCfAccountId(accId: string) {
  runtimeCfAccountId = accId;
}

export function setRuntimeCfAccounts(accounts: CloudflareAccount[]) {
  runtimeCfAccounts = Array.isArray(accounts) ? [...accounts] : [];
}

export function setRuntimeProviderAccounts(accounts: ProviderAccount[]) {
  runtimeProviderAccounts = Array.isArray(accounts) ? [...accounts] : [];
}

export function getRuntimeStoredKeys(): Record<string, string> {
  return { ...runtimeStoredKeys };
}

export function getRuntimeStoredBaseUrls(): Record<string, string> {
  return { ...runtimeStoredBaseUrls };
}

export function getRuntimeCfAccountId(): string {
  return runtimeCfAccountId;
}

export function getRuntimeCfAccounts(): CloudflareAccount[] {
  return [...runtimeCfAccounts];
}

export function getRuntimeProviderAccounts(): ProviderAccount[] {
  return [...runtimeProviderAccounts];
}


/**
 * Resolve provider API Key from environment, database runtime store, or request headers
 */
export function getProviderApiKey(
  providerId: ProviderId,
  headerKeys: Record<string, string> = {}
): string | undefined {
  // 1. Check direct client header first (e.g. x-deepseek-key)
  const headerKey = headerKeys[`x-${providerId}-key`];
  if (headerKey && headerKey.trim()) return headerKey.trim();

  // 2. Check JSON dictionary header (x-provider-keys: {"deepseek": "sk-..."})
  if (headerKeys['x-provider-keys']) {
    try {
      const parsed = JSON.parse(headerKeys['x-provider-keys']);
      if (parsed[providerId] && String(parsed[providerId]).trim()) {
        return String(parsed[providerId]).trim();
      }
    } catch {
      // ignore invalid json
    }
  }

  // 3. Check server-side stored keys (from MongoDB / Supabase / .data)
  if (runtimeStoredKeys[providerId] && runtimeStoredKeys[providerId].trim()) {
    return runtimeStoredKeys[providerId].trim();
  }

  // 4. Fallback to process.env (Vercel / Netlify environment variables)
  switch (providerId) {
    case 'openai':
      return (process.env.OPENAI_API_KEY || '').trim() || undefined;
    case 'anthropic':
      return (process.env.ANTHROPIC_API_KEY || '').trim() || undefined;
    case 'gemini':
      return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim() || undefined;
    case 'deepseek':
      return (process.env.DEEPSEEK_API_KEY || '').trim() || undefined;
    case 'groq':
      return (process.env.GROQ_API_KEY || '').trim() || undefined;
    case 'openrouter':
      return (process.env.OPENROUTER_API_KEY || '').trim() || undefined;
    case 'mistral':
      return (process.env.MISTRAL_API_KEY || '').trim() || undefined;
    case 'together':
      return (process.env.TOGETHER_API_KEY || '').trim() || undefined;
    case 'cloudflare':
      return (process.env.CLOUDFLARE_API_KEY || process.env.CLOUDFLARE_API_TOKEN || '').trim() || undefined;
    case 'cerebras':
      return (process.env.CEREBRAS_API_KEY || '').trim() || undefined;
    case 'siliconflow':
      return (process.env.SILICONFLOW_API_KEY || '').trim() || undefined;
    case 'perplexity':
      return (process.env.PERPLEXITY_API_KEY || '').trim() || undefined;
    case 'custom':
      return (process.env.CUSTOM_API_KEY || '').trim() || undefined;
    default:
      return undefined;
  }
}

export function getCloudflareAccountId(
  headerKeys: Record<string, string> = {}
): string | undefined {
  return (
    headerKeys['x-cloudflare-account-id'] ||
    runtimeCfAccountId ||
    process.env.CLOUDFLARE_ACCOUNT_ID
  );
}

/**
 * Cloudflare API base URL. Overridable via CLOUDFLARE_API_BASE for testing or
 * for accounts fronted by a Cloudflare-compatible proxy.
 */
export function getCloudflareApiBase(): string {
  return (process.env.CLOUDFLARE_API_BASE || 'https://api.cloudflare.com/client/v4')
    .trim()
    .replace(/\/+$/, '');
}

export function getProviderBaseUrl(
  providerId: ProviderId,
  headerKeys: Record<string, string> = {}
): string {
  if (headerKeys[`x-${providerId}-base-url`]) {
    return headerKeys[`x-${providerId}-base-url`];
  }
  if (runtimeStoredBaseUrls[providerId] && runtimeStoredBaseUrls[providerId].trim()) {
    return runtimeStoredBaseUrls[providerId].trim();
  }
  if (providerId === 'cloudflare') {
    const accId = getCloudflareAccountId(headerKeys) || '{account_id}';
    return `${getCloudflareApiBase()}/accounts/${accId}/ai/v1`;
  }
  if (providerId === 'custom' && process.env.CUSTOM_BASE_URL) {
    return process.env.CUSTOM_BASE_URL;
  }
  const defaultProvider = DEFAULT_PROVIDERS.find((p) => p.id === providerId);
  return defaultProvider?.baseUrl || '';
}

export function getGatewaySecret(): string | undefined {
  return process.env.ROUTER_API_KEY || process.env.GATEWAY_SECRET;
}

/**
 * Resolves all configured Cloudflare accounts (from multi-account pool, env, headers, or default single key)
 * Enables pooling multiple Cloudflare accounts for unlimited free neurons (10,000 neurons/day per account)
 */
export function getEffectiveCloudflareAccounts(
  headerKeys: Record<string, string> = {}
): CloudflareAccount[] {
  const accounts: CloudflareAccount[] = [];

  // 1. From client request header if provided (e.g. x-cloudflare-accounts JSON)
  if (headerKeys['x-cloudflare-accounts']) {
    try {
      const parsed = JSON.parse(headerKeys['x-cloudflare-accounts']);
      if (Array.isArray(parsed)) {
        parsed.forEach((acc, idx) => {
          if (acc.accountId && acc.apiToken) {
            accounts.push({
              id: acc.id || `cf-hdr-${idx}`,
              name: acc.name || `Cloudflare #${idx + 1}`,
              accountId: String(acc.accountId).trim(),
              apiToken: String(acc.apiToken).trim(),
              enabled: acc.enabled !== false,
            });
          }
        });
      }
    } catch {
      // ignore
    }
  }

  // 2. From server runtime pool (saved in Cloud Database / local JSON)
  if (Array.isArray(runtimeCfAccounts) && runtimeCfAccounts.length > 0) {
    runtimeCfAccounts.forEach((acc) => {
      if (
        acc.accountId &&
        acc.apiToken &&
        !accounts.some((a) => a.accountId === acc.accountId.trim())
      ) {
        accounts.push({
          id: acc.id || `cf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: acc.name || 'Cloudflare Account',
          accountId: acc.accountId.trim(),
          apiToken: acc.apiToken.trim(),
          enabled: acc.enabled !== false,
        });
      }
    });
  }

  // 3. From environment variable CLOUDFLARE_ACCOUNTS (JSON or comma-separated pairs: acc_id_1:token_1,acc_id_2:token_2)
  const envAccounts = process.env.CLOUDFLARE_ACCOUNTS;
  if (envAccounts && envAccounts.trim()) {
    try {
      if (envAccounts.trim().startsWith('[')) {
        const parsed = JSON.parse(envAccounts);
        if (Array.isArray(parsed)) {
          parsed.forEach((item, idx) => {
            if (
              item.accountId &&
              item.apiToken &&
              !accounts.some((a) => a.accountId === item.accountId.trim())
            ) {
              accounts.push({
                id: item.id || `cf-env-${idx}`,
                name: item.name || `Cloudflare Env #${idx + 1}`,
                accountId: String(item.accountId).trim(),
                apiToken: String(item.apiToken).trim(),
                enabled: true,
              });
            }
          });
        }
      } else {
        // Format: "account_id_1:api_token_1,account_id_2:api_token_2"
        const pairs = envAccounts.split(',');
        pairs.forEach((pair, idx) => {
          const parts = pair.split(':');
          if (parts.length >= 2) {
            const accId = parts[0].trim();
            const tok = parts.slice(1).join(':').trim();
            if (accId && tok && !accounts.some((a) => a.accountId === accId)) {
              accounts.push({
                id: `cf-env-pair-${idx}`,
                name: `Cloudflare Env #${idx + 1}`,
                accountId: accId,
                apiToken: tok,
                enabled: true,
              });
            }
          }
        });
      }
    } catch {
      // ignore
    }
  }

  // 4. Fallback to single account if no account in pool yet
  const singleKey = getProviderApiKey('cloudflare', headerKeys);
  const singleAccId = getCloudflareAccountId(headerKeys);
  if (singleKey && singleAccId && !accounts.some((a) => a.accountId === singleAccId.trim())) {
    const resolvedAccId = singleAccId.trim();
    accounts.unshift({
      id: 'cf-default',
      name: 'Cloudflare Default Account',
      accountId: resolvedAccId,
      apiToken: singleKey.trim(),
      enabled: true,
    });
  }

  // Ensure every account has a fully resolved baseUrl so pool call never uses {account_id} literal
  return accounts;
}

/**
 * Resolves multiple API keys for any provider (supports comma or newline separated keys)
 * Enables round-robin and auto-failover across multiple accounts/keys per provider
 */
export function getProviderApiKeys(
  providerId: ProviderId,
  headerKeys: Record<string, string> = {}
): string[] {
  const raw = getProviderApiKey(providerId, headerKeys);
  if (!raw) return [];
  const keys = raw
    .split(/[\n,]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  return keys.length > 0 ? keys : [raw];
}

/**
 * Resolves all configured accounts for a provider (or all providers if providerId is omitted).
 * Combines:
 * 1. Dedicated ProviderAccounts (from Cloud DB / local store)
 * 2. Dedicated Cloudflare pool accounts
 * 3. Client request headers (e.g. x-provider-accounts)
 * 4. Multi-key strings (comma/newline separated) from UI or process.env
 * 5. Single API keys as fallback accounts
 *
 * Enables true 9Router-style multi-account pooling and round-robin/failover for ALL providers!
 */
export function getEffectiveProviderAccounts(
  providerId?: ProviderId,
  headerKeys: Record<string, string> = {}
): ProviderAccount[] {
  const accounts: ProviderAccount[] = [];

  // 1. From request header if provided
  if (headerKeys['x-provider-accounts']) {
    try {
      const parsed = JSON.parse(headerKeys['x-provider-accounts']);
      if (Array.isArray(parsed)) {
        parsed.forEach((acc: any, idx: number) => {
          if (acc.provider && acc.apiKey) {
            accounts.push({
              id: acc.id || `hdr-acc-${idx}`,
              provider: acc.provider as ProviderId,
              name: acc.name || `${acc.provider} #${idx + 1}`,
              apiKey: String(acc.apiKey).trim(),
              accountId: acc.accountId ? String(acc.accountId).trim() : undefined,
              baseUrl: acc.baseUrl ? String(acc.baseUrl).trim() : undefined,
              enabled: acc.enabled !== false,
              // Keep model discovery metadata — the router uses it to pick a real
              // model when the request targets a virtual group (e.g. auto-smart).
              ...(Array.isArray(acc.detectedModels) ? { detectedModels: acc.detectedModels.map(String) } : {}),
              ...(Array.isArray(acc.verifiedModels) ? { verifiedModels: acc.verifiedModels.map(String) } : {}),
            });
          }
        });
      }
    } catch {}
  }

  // 2. From server runtimeProviderAccounts store
  if (Array.isArray(runtimeProviderAccounts) && runtimeProviderAccounts.length > 0) {
    runtimeProviderAccounts.forEach((acc) => {
      if (
        acc.provider &&
        acc.apiKey &&
        !accounts.some((a) => a.id === acc.id || (a.provider === acc.provider && a.apiKey === acc.apiKey))
      ) {
        accounts.push({
          id: acc.id || `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          provider: acc.provider,
          name: acc.name || `${acc.provider} Account`,
          apiKey: acc.apiKey.trim(),
          accountId: acc.accountId?.trim(),
          baseUrl: acc.baseUrl?.trim(),
          enabled: acc.enabled !== false,
          priority: acc.priority,
          createdAt: acc.createdAt,
          lastUsedAt: acc.lastUsedAt,
          // Keep model discovery metadata (see above): without these, a virtual
          // group request can only try the group id itself and gets a 404.
          ...(Array.isArray(acc.detectedModels) ? { detectedModels: acc.detectedModels.map(String) } : {}),
          ...(Array.isArray(acc.verifiedModels) ? { verifiedModels: acc.verifiedModels.map(String) } : {}),
        });
      }
    });
  }

  // 3. For Cloudflare specifically: also merge from getEffectiveCloudflareAccounts
  if (!providerId || providerId === 'cloudflare') {
    const cfAccounts = getEffectiveCloudflareAccounts(headerKeys);
    cfAccounts.forEach((cf) => {
      if (
        !accounts.some(
          (a) =>
            a.provider === 'cloudflare' &&
            (a.accountId === cf.accountId || a.apiKey === cf.apiToken)
        )
      ) {
        accounts.push({
          id: cf.id,
          provider: 'cloudflare',
          name: cf.name,
          apiKey: cf.apiToken,
          accountId: cf.accountId,
          enabled: cf.enabled !== false,
          createdAt: cf.createdAt,
          lastUsedAt: cf.lastUsedAt,
          // Preserve the model catalog discovered on the CF account so group
          // requests (auto-smart) can use the account's own models.
          ...(Array.isArray(cf.detectedModels) ? { detectedModels: cf.detectedModels.map(String) } : {}),
          ...(Array.isArray(cf.verifiedModels) ? { verifiedModels: cf.verifiedModels.map(String) } : {}),
        });
      }
    });
  }

  // 4. For every provider: if user supplied keys in single key inputs or comma-separated env vars,
  // ensure they are available as pooled accounts if not already present
  const providersToCheck = providerId ? [providerId] : DEFAULT_PROVIDERS.map((p) => p.id);
  providersToCheck.forEach((p) => {
    const keys = getProviderApiKeys(p, headerKeys);
    keys.forEach((key, kIdx) => {
      if (!accounts.some((a) => a.provider === p && a.apiKey === key)) {
        // For Cloudflare: resolve accountId and build a concrete baseUrl (no {account_id} placeholder)
        let accountId: string | undefined = undefined;
        let baseUrl = getProviderBaseUrl(p, headerKeys);
        if (p === 'cloudflare') {
          accountId = (getCloudflareAccountId(headerKeys) || '').trim() || undefined;
          if (accountId) {
            baseUrl = `${getCloudflareApiBase()}/accounts/${accountId}/ai/v1`;
          }
        }
        accounts.push({
          id: `auto-${p}-${kIdx}`,
          provider: p,
          name: keys.length > 1 ? `${p.toUpperCase()} Key #${kIdx + 1}` : `${p.toUpperCase()} Main`,
          apiKey: key,
          accountId,
          baseUrl,
          enabled: true,
        });
      }
    });
  });

  if (providerId) {
    return accounts.filter((a) => a.provider === providerId);
  }
  return accounts;
}


