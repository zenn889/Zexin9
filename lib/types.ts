export type ProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'groq'
  | 'openrouter'
  | 'mistral'
  | 'together'
  | 'cloudflare'
  | 'cerebras'
  | 'siliconflow'
  | 'perplexity'
  | 'custom';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  priority: number; // 1 = highest
  models: string[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'function';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
  tools?: any[];
  tool_choice?: any;
}

export interface ModelFallbackGroup {
  id: string;
  name: string;
  description: string;
  tag: 'smart' | 'fast' | 'reason' | 'code' | 'general';
  providers: {
    provider: ProviderId;
    model: string;
  }[];
}

export interface TokenOptimizationOptions {
  enableCompression?: boolean;
  cavemanMode?: boolean;
}

export interface GatewayStats {
  totalRequests: number;
  fallbackCount: number;
  tokensSavedEstimate: number;
  lastActive: string;
}

export interface CloudflareAccount {
  id: string;
  name: string;
  accountId: string;
  apiToken: string;
  enabled?: boolean;
  createdAt?: string;
  lastUsedAt?: string;
  lastTested?: string;
  /** Models discovered from the Cloudflare models catalog on the last test. */
  detectedModels?: string[];
  /** Models that answered a live test. */
  verifiedModels?: string[];
}

export interface ProviderAccount {
  id: string;
  provider: ProviderId;
  name: string;
  apiKey: string;
  accountId?: string; // For Cloudflare (Account ID)
  baseUrl?: string;   // For Custom or provider URL override
  enabled: boolean;
  priority?: number;
  createdAt?: string;
  lastUsedAt?: string;
  lastTested?: string;
  /** Models discovered from the endpoint's /models listing (auto-detection). */
  detectedModels?: string[];
  /** Models that a live ping actually got a successful response from. */
  verifiedModels?: string[];
  /** ISO timestamp of the last successful model auto-detection. */
  lastDetectedAt?: string;
  lastStatus?: 'ok' | 'rate_limited' | 'error';
  lastError?: string;
  latencyMs?: number;
}

