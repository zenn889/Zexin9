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
}

