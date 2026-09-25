import fs from 'fs';
import path from 'path';

export interface RequestLog {
  id: string;
  timestamp: string;
  client: string;
  requestedModel: string;
  servedProvider: string;
  servedModel: string;
  fallbackCount: number;
  failoverNote?: string;
  promptTokens: number;
  completionTokens: number;
  tokensSaved: number;
  latencyMs: number;
  status: number;
}

export interface ClientToken {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsedAt?: string;
  requestCount: number;
}

// In-memory runtime cache for serverless speed
let memoryLogs: RequestLog[] = [];
let memoryTokens: ClientToken[] = [];
let memoryMasterKey: string = (process.env.ROUTER_API_KEY || process.env.GATEWAY_SECRET || '').trim();

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Determine writable data file location (works in local dev and in Vercel /tmp)
function getDataFilePath(): string {
  if (process.env.VERCEL || process.env.NETLIFY) {
    return path.join('/tmp', '9router-data.json');
  }
  const localDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
      return path.join('/tmp', '9router-data.json');
    }
  }
  return path.join(localDir, '9router-data.json');
}

function loadData() {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.logs)) memoryLogs = parsed.logs;
      if (Array.isArray(parsed.tokens)) memoryTokens = parsed.tokens;
      if (typeof parsed.masterKey === 'string' && parsed.masterKey.trim().length > 0) {
        memoryMasterKey = parsed.masterKey.trim();
      }
    }
  } catch {
    // ignore read error, fallback to memory
  }
}

function persistData() {
  const data = {
    logs: memoryLogs.slice(0, 500), // retain latest 500 logs
    tokens: memoryTokens,
    masterKey: memoryMasterKey,
  };

  // 1. Persist to local file or /tmp
  try {
    const filePath = getDataFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  } catch {
    // serverless read-only fallback
  }

  // 2. Persist to Cloud Redis (Upstash / Vercel KV) if configured
  if (redisUrl && redisToken) {
    try {
      fetch(`${redisUrl}/set/9router_state`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.stringify(data)),
      }).catch(() => {});
    } catch {
      // ignore async fetch error
    }
  }
}

// Initial load
loadData();

export const db = {
  // --- Logs ---
  getLogs(limit = 100): RequestLog[] {
    loadData();
    return memoryLogs.slice(0, limit);
  },

  addLog(log: RequestLog) {
    memoryLogs.unshift(log);
    if (memoryLogs.length > 500) {
      memoryLogs = memoryLogs.slice(0, 500);
    }
    persistData();
  },

  clearLogs() {
    memoryLogs = [];
    persistData();
  },

  // --- Client Tokens ---
  getTokens(): ClientToken[] {
    loadData();
    return memoryTokens;
  },

  addToken(name: string): ClientToken {
    loadData();
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const newToken: ClientToken = {
      id: `tok-${Date.now()}`,
      name,
      token: `sk-9r-${randomHex}`,
      createdAt: new Date().toISOString(),
      requestCount: 0,
    };
    memoryTokens.push(newToken);
    persistData();
    return newToken;
  },

  deleteToken(id: string): boolean {
    loadData();
    const initialLen = memoryTokens.length;
    memoryTokens = memoryTokens.filter((t) => t.id !== id);
    if (memoryTokens.length !== initialLen) {
      persistData();
      return true;
    }
    return false;
  },

  // --- Master Key Management ---
  getMasterKey(): string {
    loadData();
    return (process.env.ROUTER_API_KEY || process.env.GATEWAY_SECRET || memoryMasterKey || '').trim();
  },

  setMasterKey(key: string): void {
    memoryMasterKey = key.trim();
    persistData();
  },

  verifyToken(providedToken: string): boolean {
    if (!providedToken) return false;
    const cleanToken = providedToken.replace(/^Bearer\s+/i, '').trim();

    // Check against global env secret or stored master key
    const master = this.getMasterKey();
    if (master && cleanToken === master) {
      return true;
    }

    // Check against generated client tokens
    loadData();
    const found = memoryTokens.find((t) => t.token === cleanToken);
    if (found) {
      found.lastUsedAt = new Date().toISOString();
      found.requestCount += 1;
      persistData();
      return true;
    }

    // If no secret or token is configured, allow open access
    if (!master && memoryTokens.length === 0) {
      return true;
    }

    return false;
  },

  // --- Aggregate Stats ---
  getStats() {
    loadData();
    const totalRequests = memoryLogs.length;
    const failoverRequests = memoryLogs.filter((l) => l.fallbackCount > 0).length;
    const totalTokensSaved = memoryLogs.reduce((acc, l) => acc + (l.tokensSaved || 0), 0);
    const totalPromptTokens = memoryLogs.reduce((acc, l) => acc + (l.promptTokens || 0), 0);
    const totalCompletionTokens = memoryLogs.reduce((acc, l) => acc + (l.completionTokens || 0), 0);

    // Group by provider
    const providerCounts: Record<string, number> = {};
    memoryLogs.forEach((l) => {
      const p = l.servedProvider || 'unknown';
      providerCounts[p] = (providerCounts[p] || 0) + 1;
    });

    return {
      totalRequests,
      failoverRequests,
      totalTokensSaved,
      totalPromptTokens,
      totalCompletionTokens,
      providerCounts,
      activeClientTokensCount: memoryTokens.length,
    };
  },
};
