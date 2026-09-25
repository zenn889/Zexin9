import { ModelFallbackGroup, ProviderConfig, ProviderId } from './types';

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
      '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      '@cf/meta/llama-3.3-70b-instruct',
      '@cf/qwen/qwen2.5-coder-32b-instruct',
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/meta/llama-3.1-70b-instruct',
      '@cf/mistral/mistral-7b-instruct-v0.1',
      '@cf/google/gemma-7b-it',
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
    description: 'Cascades through top frontier models: Claude 3.7/3.5 -> GPT-4o -> DeepSeek V3 -> Gemini 2.0 Flash',
    tag: 'smart',
    providers: [
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'gemini', model: 'gemini-2.0-flash' },
      { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
    ],
  },
  {
    id: 'auto-fast',
    name: 'Auto Fast (Low Latency & High Rate-Limits)',
    description: 'Ultra-fast execution: Groq LLaMA 3.3 70B -> Gemini 2.0 Flash -> DeepSeek Chat -> GPT-4o-mini',
    tag: 'fast',
    providers: [
      { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      { provider: 'gemini', model: 'gemini-2.0-flash' },
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'openai', model: 'gpt-4o-mini' },
    ],
  },
  {
    id: 'auto-reason',
    name: 'Auto Reasoning (Complex Logic & Math)',
    description: 'Deep reasoning models: DeepSeek R1 -> Gemini 2.0 Flash Thinking -> OpenAI o3-mini',
    tag: 'reason',
    providers: [
      { provider: 'deepseek', model: 'deepseek-reasoner' },
      { provider: 'gemini', model: 'gemini-2.0-flash-thinking-exp-01-21' },
      { provider: 'openai', model: 'o3-mini' },
      { provider: 'groq', model: 'deepseek-r1-distill-llama-70b' },
    ],
  },
  {
    id: 'auto-code',
    name: 'Auto Code (Specialized Coding Engine)',
    description: 'Optimized for diffs & programming: Claude 3.5 Sonnet -> Mistral Codestral -> Qwen 2.5 Coder -> DeepSeek V3',
    tag: 'code',
    providers: [
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'mistral', model: 'codestral-latest' },
      { provider: 'together', model: 'Qwen/Qwen2.5-Coder-32B-Instruct' },
      { provider: 'deepseek', model: 'deepseek-chat' },
    ],
  },
];

/**
 * Resolve provider API Key from environment or request headers
 */
export function getProviderApiKey(
  providerId: ProviderId,
  headerKeys: Record<string, string> = {}
): string | undefined {
  // 1. Check direct client header first (e.g. x-anthropic-key)
  const headerKey = headerKeys[`x-${providerId}-key`];
  if (headerKey && headerKey.trim()) return headerKey.trim();

  // 2. Check JSON dictionary header (x-provider-keys: {"openai": "sk-..."})
  if (headerKeys['x-provider-keys']) {
    try {
      const parsed = JSON.parse(headerKeys['x-provider-keys']);
      if (parsed[providerId]) return parsed[providerId];
    } catch {
      // ignore invalid json
    }
  }

  // 3. Fallback to process.env (Vercel / Netlify environment variables)
  switch (providerId) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'gemini':
      return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    case 'deepseek':
      return process.env.DEEPSEEK_API_KEY;
    case 'groq':
      return process.env.GROQ_API_KEY;
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY;
    case 'mistral':
      return process.env.MISTRAL_API_KEY;
    case 'together':
      return process.env.TOGETHER_API_KEY;
    case 'cloudflare':
      return process.env.CLOUDFLARE_API_KEY || process.env.CLOUDFLARE_API_TOKEN;
    case 'cerebras':
      return process.env.CEREBRAS_API_KEY;
    case 'siliconflow':
      return process.env.SILICONFLOW_API_KEY;
    case 'perplexity':
      return process.env.PERPLEXITY_API_KEY;
    case 'custom':
      return process.env.CUSTOM_API_KEY;
    default:
      return undefined;
  }
}

export function getCloudflareAccountId(
  headerKeys: Record<string, string> = {}
): string | undefined {
  return headerKeys['x-cloudflare-account-id'] || process.env.CLOUDFLARE_ACCOUNT_ID;
}

export function getProviderBaseUrl(
  providerId: ProviderId,
  headerKeys: Record<string, string> = {}
): string {
  if (headerKeys[`x-${providerId}-base-url`]) {
    return headerKeys[`x-${providerId}-base-url`];
  }
  if (providerId === 'cloudflare') {
    const accId = getCloudflareAccountId(headerKeys) || '{account_id}';
    return `https://api.cloudflare.com/client/v4/accounts/${accId}/ai/v1`;
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
