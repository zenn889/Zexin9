import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { MongoClient, Db } from 'mongodb';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from './crypto';
import {
  setRuntimeStoredKeys,
  setRuntimeStoredBaseUrls,
  setRuntimeCfAccountId,
  setRuntimeCfAccounts,
  setRuntimeProviderAccounts,
} from './config';
import { CloudflareAccount, ProviderAccount } from './types';

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

export interface DbConfig {
  preferredEngine?: 'mongodb' | 'supabase' | 'redis' | 'local';
  mongodbUri?: string;
  mongodbDb?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  supabaseTable?: string;
}

// In-memory runtime cache for serverless speed (0ms proxy overhead)
let memoryLogs: RequestLog[] = [];
let memoryTokens: ClientToken[] = [];
let memoryMasterKey: string = (process.env.ROUTER_API_KEY || process.env.GATEWAY_SECRET || '').trim();
let memoryProviderKeys: Record<string, string> = {};
let memoryProviderBaseUrls: Record<string, string> = {};
let memoryCfAccountId: string = '';
let memoryCfAccounts: CloudflareAccount[] = [];
let memoryProviderAccounts: ProviderAccount[] = [];

// Runtime DB configuration
let runtimeDbConfig: DbConfig = {};

// Database clients cache
let cachedMongoClient: MongoClient | null = null;
let cachedMongoDb: Db | null = null;
let cachedSupabaseClient: SupabaseClient | null = null;

// Timestamp of the last cloud pull (used to throttle realtime dashboard syncs)
let lastCloudPullAt = 0;

// False until this instance has loaded the provider configuration from the local
// store or the cloud database. Cold serverless instances start empty; without
// this flag their first persist would overwrite the cloud-stored accounts with
// an empty list (the "all providers: Belum ada akun/key" bug).
let configHydrated = false;

// Last database connection check result (filled by getDatabaseStatus), so
// cheap sync callers like getPersistenceSummary can report connection health.
let lastConnectionCheck:
  | {
      at: number;
      activeEngine: 'mongodb' | 'supabase' | 'redis' | 'local';
      mongoConfigured: boolean;
      mongoConnected: boolean;
      mongoError?: string;
      supabaseConfigured: boolean;
      supabaseConnected: boolean;
      supabaseError?: string;
      redisConfigured: boolean;
    }
  | null = null;

// Determine writable data directory location
function getDataDir(): string {
  if (process.env.VERCEL || process.env.NETLIFY) {
    return '/tmp';
  }
  const localDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
      return '/tmp';
    }
  }
  return localDir;
}

function getDataFilePath(): string {
  const primary = path.join(getDataDir(), 'zexin9-data.json');
  const legacy = path.join(getDataDir(), '9router-data.json');
  if (!fs.existsSync(primary) && fs.existsSync(legacy)) {
    return legacy;
  }
  return primary;
}

function getDbConfigFilePath(): string {
  return path.join(getDataDir(), 'db-config.json');
}

// --- Encryption-at-rest helpers (AES-256-GCM via lib/crypto) ---
// Values are stored with a self-describing prefix. Legacy plaintext values are
// passed through untouched on read, so existing deployments keep working.
const ENC_PREFIX = 'enc:v1:';

function encValue<T extends string | undefined>(value: T): T {
  if (typeof value !== 'string' || value.length === 0) return value;
  return (ENC_PREFIX + encrypt(value)) as T;
}

function decValue<T extends string | undefined>(value: T): T {
  if (typeof value !== 'string' || !value.startsWith(ENC_PREFIX)) return value;
  return decrypt(value.slice(ENC_PREFIX.length)) as T;
}

function encKeysRecord(keys: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(keys || {})) out[k] = encValue(v);
  return out;
}

function decKeysRecord(keys: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(keys || {})) out[k] = decValue(v);
  return out;
}

function encProviderAccounts(accounts: ProviderAccount[] | undefined): ProviderAccount[] {
  return (accounts || []).map((acc) => ({ ...acc, apiKey: encValue(acc.apiKey) }));
}

function decProviderAccounts(accounts: ProviderAccount[] | undefined): ProviderAccount[] {
  return (accounts || []).map((acc) => ({ ...acc, apiKey: decValue(acc.apiKey) }));
}

function encCfAccounts(accounts: CloudflareAccount[] | undefined): CloudflareAccount[] {
  return (accounts || []).map((acc) => ({ ...acc, apiToken: encValue(acc.apiToken) }));
}

function decCfAccounts(accounts: CloudflareAccount[] | undefined): CloudflareAccount[] {
  return (accounts || []).map((acc) => ({ ...acc, apiToken: decValue(acc.apiToken) }));
}

function encTokens(tokens: ClientToken[] | undefined): ClientToken[] {
  return (tokens || []).map((t) => ({ ...t, token: encValue(t.token) }));
}

function decTokens(tokens: ClientToken[] | undefined): ClientToken[] {
  return (tokens || []).map((t) => ({ ...t, token: decValue(t.token) }));
}

// Load DB config from file if present
function loadDbConfigFile() {
  try {
    const configPath = getDbConfigFilePath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      runtimeDbConfig = {
        ...parsed,
        mongodbUri: parsed.mongodbUri ? decValue(parsed.mongodbUri) : parsed.mongodbUri,
        supabaseKey: parsed.supabaseKey ? decValue(parsed.supabaseKey) : parsed.supabaseKey,
      };
    }
  } catch {
    // ignore config file read error
  }
}

// Load main data from local file
function loadData() {
  try {
    loadDbConfigFile();
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.logs) && parsed.logs.length > 0) {
        memoryLogs = parsed.logs;
      }
      if (Array.isArray(parsed.tokens) && parsed.tokens.length > 0) {
        memoryTokens = decTokens(parsed.tokens);
      }
      if (typeof parsed.masterKey === 'string' && parsed.masterKey.trim().length > 0) {
        memoryMasterKey = parsed.masterKey.trim();
      }
      if (parsed.providerKeys && typeof parsed.providerKeys === 'object') {
        memoryProviderKeys = decKeysRecord(parsed.providerKeys);
      } else {
        memoryProviderKeys = {};
      }
      setRuntimeStoredKeys(memoryProviderKeys);

      if (parsed.providerBaseUrls && typeof parsed.providerBaseUrls === 'object') {
        memoryProviderBaseUrls = decKeysRecord(parsed.providerBaseUrls);
      } else {
        memoryProviderBaseUrls = {};
      }
      setRuntimeStoredBaseUrls(memoryProviderBaseUrls);

      if (typeof parsed.cfAccountId === 'string') {
        memoryCfAccountId = parsed.cfAccountId;
      } else {
        memoryCfAccountId = '';
      }
      setRuntimeCfAccountId(memoryCfAccountId);

      if (Array.isArray(parsed.cfAccounts)) {
        memoryCfAccounts = decCfAccounts(parsed.cfAccounts);
      } else {
        memoryCfAccounts = [];
      }
      setRuntimeCfAccounts(memoryCfAccounts);

      if (Array.isArray(parsed.providerAccounts)) {
        memoryProviderAccounts = decProviderAccounts(parsed.providerAccounts);
      } else {
        memoryProviderAccounts = [];
      }
      setRuntimeProviderAccounts(memoryProviderAccounts);

      const hadStoredConfig =
        memoryProviderAccounts.length > 0 ||
        memoryCfAccounts.length > 0 ||
        Object.values(memoryProviderKeys).some((v) => String(v || '').trim().length > 0) ||
        Object.values(memoryProviderBaseUrls).some((v) => String(v || '').trim().length > 0);
      if (hadStoredConfig) configHydrated = true;
    }
  } catch {

    // ignore read error, fallback to memory
  }
}

// --- MongoDB Integration ---
let lastMongoConnectError = '';

function getEffectiveMongoUri(): string | undefined {
  return (
    cleanEnv(process.env.MONGODB_URI) ||
    cleanEnv(process.env.MONGODB_URL) ||
    runtimeDbConfig.mongodbUri ||
    undefined
  );
}

/**
 * Environment values pasted from hosting dashboards often carry stray quotes
 * or whitespace — strip them so a valid value never fails on formatting.
 */
function cleanEnv(v?: string | null): string {
  return String(v ?? '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

function getEffectiveMongoDbName(): string {
  return (
    cleanEnv(process.env.MONGODB_DB) ||
    runtimeDbConfig.mongodbDb ||
    'zexin9'
  );
}

async function getMongoDb(): Promise<Db | null> {
  const uri = getEffectiveMongoUri();
  if (!uri) return null;
  if (cachedMongoDb) return cachedMongoDb;

  try {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    cachedMongoClient = client;
    cachedMongoDb = client.db(getEffectiveMongoDbName());
    return cachedMongoDb;
  } catch (err) {
    // Keep the message: it is shown in the dashboard's database status so setup
    // problems (IP whitelist, wrong password) are visible without server logs.
    lastMongoConnectError = err instanceof Error ? err.message : String(err);
    console.error('MongoDB connection error:', err);
    return null;
  }
}

// --- Supabase Integration ---
function getEffectiveSupabaseUrl(): string | undefined {
  return (
    cleanEnv(process.env.SUPABASE_URL) ||
    runtimeDbConfig.supabaseUrl ||
    undefined
  );
}

function getEffectiveSupabaseKey(): string | undefined {
  return (
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    cleanEnv(process.env.SUPABASE_KEY) ||
    cleanEnv(process.env.SUPABASE_ANON_KEY) ||
    runtimeDbConfig.supabaseKey ||
    undefined
  );
}

function getEffectiveSupabaseTable(): string {
  return (
    process.env.SUPABASE_TABLE ||
    runtimeDbConfig.supabaseTable ||
    'nine_router_state'
  );
}

function getSupabaseClient(): SupabaseClient | null {
  const url = getEffectiveSupabaseUrl();
  const key = getEffectiveSupabaseKey();
  if (!url || !key) return null;
  if (cachedSupabaseClient) return cachedSupabaseClient;

  try {
    cachedSupabaseClient = createClient(url, key, {
      auth: { persistSession: false },
    });
    return cachedSupabaseClient;
  } catch (err) {
    console.error('Supabase client init error:', err);
    return null;
  }
}

// --- Background Data Persistence ---
function hasCloudEngineConfigured(): boolean {
  return (
    Boolean(getEffectiveMongoUri()) ||
    Boolean(getEffectiveSupabaseUrl()) ||
    Boolean(cleanEnv(process.env.KV_REST_API_URL) || cleanEnv(process.env.UPSTASH_REDIS_REST_URL))
  );
}

async function persistToCloud(data: {
  logs: RequestLog[];
  tokens: ClientToken[];
  masterKey: string;
  providerKeys: Record<string, string>;
  providerBaseUrls: Record<string, string>;
  cfAccountId: string;
  cfAccounts: CloudflareAccount[];
  providerAccounts: ProviderAccount[];
}) {
  // Cold-start guard: an instance that has not hydrated its configuration yet
  // must not erase cloud-stored accounts/keys with its empty in-memory view.
  // Hydrate from the cloud first and prefer whatever it holds.
  if (!configHydrated && hasCloudEngineConfigured()) {
    try {
      await db.syncFromCloud();
      if (memoryProviderAccounts.length > 0) {
        data.providerAccounts = encProviderAccounts(memoryProviderAccounts);
      }
      if (memoryCfAccounts.length > 0) {
        data.cfAccounts = encCfAccounts(memoryCfAccounts);
      }
      if (Object.keys(memoryProviderKeys).length > 0) {
        data.providerKeys = encKeysRecord(memoryProviderKeys);
      }
      if (Object.keys(memoryProviderBaseUrls).length > 0) {
        data.providerBaseUrls = encKeysRecord(memoryProviderBaseUrls);
      }
      if (Array.isArray(memoryLogs) && memoryLogs.length > 0) {
        const byId = new Map<string, RequestLog>();
        for (const l of [...(data.logs || []), ...memoryLogs]) byId.set(l.id, l);
        data.logs = Array.from(byId.values()).slice(0, 500);
      }
    } catch {
      // Hydration failed (network hiccup): skip this persist entirely instead of
      // risking a wipe of cloud-stored config with our empty view. Next persist retries.
      return;
    }
  }

  // 1. MongoDB
  const mongoUri = getEffectiveMongoUri();
  if (mongoUri) {
    try {
      const db = await getMongoDb();
      if (db) {
        const col = db.collection('nine_router_state');
        await col.updateOne(
          { _id: 'global_state' as any },
          {
            $set: {
              masterKey: data.masterKey,
              tokens: data.tokens,
              logs: data.logs,
              providerKeys: data.providerKeys,
              providerBaseUrls: data.providerBaseUrls,
              cfAccountId: data.cfAccountId,
              cfAccounts: data.cfAccounts,
              providerAccounts: data.providerAccounts,
              updatedAt: new Date().toISOString(),
            },
          },
          { upsert: true }
        );
      }
    } catch (e) {
      console.error('Failed to sync to MongoDB:', e);
    }
  }

  // 2. Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const tableName = getEffectiveSupabaseTable();
      await supabase.from(tableName).upsert({
        id: 'global_state',
        data: {
          masterKey: data.masterKey,
          tokens: data.tokens,
          logs: data.logs,
          providerKeys: data.providerKeys,
          providerBaseUrls: data.providerBaseUrls,
          cfAccountId: data.cfAccountId,
          cfAccounts: data.cfAccounts,
          providerAccounts: data.providerAccounts,
        },
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to sync to Supabase:', e);
    }
  }

  // 3. Upstash Redis (if configured)
  const redisUrl = cleanEnv(process.env.KV_REST_API_URL) || cleanEnv(process.env.UPSTASH_REDIS_REST_URL) || undefined;
  const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    try {
      await fetch(`${redisUrl}/set/9router_state`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.stringify(data)),
      });
    } catch {
      // ignore redis error
    }
  }
}

/**
 * Builds the persistence payload with secrets encrypted at rest.
 * In-memory state stays plaintext; only file/cloud copies are encrypted.
 */
function buildPersistedPayload() {
  return {
    logs: memoryLogs.slice(0, 500), // retain latest 500 logs
    tokens: encTokens(memoryTokens),
    masterKey: memoryMasterKey,
    providerKeys: encKeysRecord(memoryProviderKeys),
    providerBaseUrls: encKeysRecord(memoryProviderBaseUrls),
    cfAccountId: memoryCfAccountId,
    cfAccounts: encCfAccounts(memoryCfAccounts),
    providerAccounts: encProviderAccounts(memoryProviderAccounts),
  };
}

function writeLocalCache() {
  try {
    const filePath = getDataFilePath();
    fs.writeFileSync(filePath, JSON.stringify(buildPersistedPayload(), null, 2), 'utf-8');
  } catch {
    // serverless read-only fallback
  }
}

function persistData() {
  const data = buildPersistedPayload();

  // 1. Local filesystem persistence
  writeLocalCache();

  // 2. Cloud DB persistence in background
  persistToCloud(data).catch(() => {});
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
    // Cryptographically secure token generation (API keys must not be guessable)
    const randomHex = crypto.randomBytes(16).toString('hex');
    const newToken: ClientToken = {
      id: `tok-${Date.now()}`,
      name,
      token: `sk-zx9-${randomHex}`,
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
    }

    // If no secret or token is configured, allow open access
    if (!master && memoryTokens.length === 0) {
      return true;
    }

    return Boolean(found);
  },

  /**
   * Human-readable client label for request logs. Never stores raw credential
   * material so public log endpoints cannot leak tokens or the master key.
   */
  describeClient(token: string): string {
    if (!token) return 'Open Client';
    const master = this.getMasterKey();
    if (master && token === master) return 'Master Key';
    loadData();
    const found = memoryTokens.find((t) => t.token === token);
    if (found) return `Client: ${found.name}`;
    return 'Client (unknown)';
  },

  // --- Aggregate Stats ---
  getStats() {
    loadData();
    const totalRequests = memoryLogs.length;
    const failoverRequests = memoryLogs.filter((l) => l.fallbackCount > 0).length;
    const totalTokensSaved = memoryLogs.reduce((acc, l) => acc + (l.tokensSaved || 0), 0);
    const totalPromptTokens = memoryLogs.reduce((acc, l) => acc + (l.promptTokens || 0), 0);
    const totalCompletionTokens = memoryLogs.reduce((acc, l) => acc + (l.completionTokens || 0), 0);

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

  // --- Cloud Sync ---
  async syncFromCloud(): Promise<{ source: string; logsCount: number; tokensCount: number; masterKeyLoaded: boolean }> {
    let syncedSource = 'local';

    // 1. Try MongoDB first
    const mongoUri = getEffectiveMongoUri();
    if (mongoUri) {
      try {
        const mdb = await getMongoDb();
        if (mdb) {
          const col = mdb.collection('nine_router_state');
          const doc: any = await col.findOne({ _id: 'global_state' as any });
          if (doc) {
            if (Array.isArray(doc.logs)) memoryLogs = doc.logs;
            if (Array.isArray(doc.tokens)) memoryTokens = decTokens(doc.tokens);
            if (typeof doc.masterKey === 'string' && doc.masterKey.trim().length > 0) {
              memoryMasterKey = doc.masterKey.trim();
            }
            if (doc.providerKeys && typeof doc.providerKeys === 'object') {
              memoryProviderKeys = decKeysRecord(doc.providerKeys);
              setRuntimeStoredKeys(memoryProviderKeys);
            }
            if (doc.providerBaseUrls && typeof doc.providerBaseUrls === 'object') {
              memoryProviderBaseUrls = decKeysRecord(doc.providerBaseUrls);
              setRuntimeStoredBaseUrls(memoryProviderBaseUrls);
            }
            if (typeof doc.cfAccountId === 'string') {
              memoryCfAccountId = doc.cfAccountId;
              setRuntimeCfAccountId(memoryCfAccountId);
            }
            if (Array.isArray(doc.cfAccounts)) {
              memoryCfAccounts = decCfAccounts(doc.cfAccounts);
              setRuntimeCfAccounts(memoryCfAccounts);
            }
            if (Array.isArray(doc.providerAccounts)) {
              memoryProviderAccounts = decProviderAccounts(doc.providerAccounts);
              setRuntimeProviderAccounts(memoryProviderAccounts);
            }
            syncedSource = 'mongodb';
            configHydrated = true;
            // update local cache file
            writeLocalCache();
            return {
              source: 'mongodb',
              logsCount: memoryLogs.length,
              tokensCount: memoryTokens.length,
              masterKeyLoaded: Boolean(memoryMasterKey),
            };
          }
        }
      } catch (err) {
        console.error('Sync from MongoDB failed:', err);
      }
    }

    // 2. Try Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const tableName = getEffectiveSupabaseTable();
        const { data, error } = await supabase
          .from(tableName)
          .select('data')
          .eq('id', 'global_state')
          .single();

        if (data?.data && !error) {
          const state = data.data;
          if (Array.isArray(state.logs)) memoryLogs = state.logs;
          if (Array.isArray(state.tokens)) memoryTokens = decTokens(state.tokens);
          if (typeof state.masterKey === 'string' && state.masterKey.trim().length > 0) {
            memoryMasterKey = state.masterKey.trim();
          }
          if (state.providerKeys && typeof state.providerKeys === 'object') {
            memoryProviderKeys = decKeysRecord(state.providerKeys);
            setRuntimeStoredKeys(memoryProviderKeys);
          }
          if (state.providerBaseUrls && typeof state.providerBaseUrls === 'object') {
            memoryProviderBaseUrls = decKeysRecord(state.providerBaseUrls);
            setRuntimeStoredBaseUrls(memoryProviderBaseUrls);
          }
          if (typeof state.cfAccountId === 'string') {
            memoryCfAccountId = state.cfAccountId;
            setRuntimeCfAccountId(memoryCfAccountId);
          }
          if (Array.isArray(state.cfAccounts)) {
            memoryCfAccounts = decCfAccounts(state.cfAccounts);
            setRuntimeCfAccounts(memoryCfAccounts);
          }
          if (Array.isArray(state.providerAccounts)) {
            memoryProviderAccounts = decProviderAccounts(state.providerAccounts);
            setRuntimeProviderAccounts(memoryProviderAccounts);
          }
          syncedSource = 'supabase';
          configHydrated = true;
          writeLocalCache();
          return {
            source: 'supabase',
            logsCount: memoryLogs.length,
            tokensCount: memoryTokens.length,
            masterKeyLoaded: Boolean(memoryMasterKey),
          };
        }
      } catch (err) {
        console.error('Sync from Supabase failed:', err);
      }
    }

    // 3. Try Upstash Redis / Vercel KV (REST)
    const redisUrl = cleanEnv(process.env.KV_REST_API_URL) || cleanEnv(process.env.UPSTASH_REDIS_REST_URL) || undefined;
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (redisUrl && redisToken) {
      try {
        const res = await fetch(`${redisUrl}/get/9router_state`, {
          headers: { Authorization: `Bearer ${redisToken}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const payload = (await res.json().catch(() => null)) as { result?: unknown } | null;
          let state: unknown = payload?.result ?? null;
          // The write path stores a JSON-encoded string; unwrap up to 2 levels
          // to tolerate both single- and double-encoded values.
          for (let i = 0; i < 2 && typeof state === 'string'; i++) {
            try {
              state = JSON.parse(state as string);
            } catch {
              state = null;
              break;
            }
          }
          if (state && typeof state === 'object') {
            const s = state as Record<string, unknown>;
            if (Array.isArray(s.logs)) memoryLogs = s.logs as RequestLog[];
            if (Array.isArray(s.tokens)) memoryTokens = decTokens(s.tokens as ClientToken[]);
            if (typeof s.masterKey === 'string' && s.masterKey.trim().length > 0) {
              memoryMasterKey = s.masterKey.trim();
            }
            if (s.providerKeys && typeof s.providerKeys === 'object') {
              memoryProviderKeys = decKeysRecord(s.providerKeys as Record<string, string>);
              setRuntimeStoredKeys(memoryProviderKeys);
            }
            if (s.providerBaseUrls && typeof s.providerBaseUrls === 'object') {
              memoryProviderBaseUrls = decKeysRecord(s.providerBaseUrls as Record<string, string>);
              setRuntimeStoredBaseUrls(memoryProviderBaseUrls);
            }
            if (typeof s.cfAccountId === 'string') {
              memoryCfAccountId = s.cfAccountId;
              setRuntimeCfAccountId(memoryCfAccountId);
            }
            if (Array.isArray(s.cfAccounts)) {
              memoryCfAccounts = decCfAccounts(s.cfAccounts as CloudflareAccount[]);
              setRuntimeCfAccounts(memoryCfAccounts);
            }
            if (Array.isArray(s.providerAccounts)) {
              memoryProviderAccounts = decProviderAccounts(s.providerAccounts as ProviderAccount[]);
              setRuntimeProviderAccounts(memoryProviderAccounts);
            }
            syncedSource = 'redis';
            configHydrated = true;
            writeLocalCache();
            return {
              source: 'redis',
              logsCount: memoryLogs.length,
              tokensCount: memoryTokens.length,
              masterKeyLoaded: Boolean(memoryMasterKey),
            };
          }
        }
      } catch {
        // ignore redis read error
      }
    }

    // 4. Fallback to local
    loadData();
    return {
      source: syncedSource,
      logsCount: memoryLogs.length,
      tokensCount: memoryTokens.length,
      masterKeyLoaded: Boolean(memoryMasterKey),
    };
  },

  /**
   * Pulls fresh state from the configured cloud database when the last pull is
   * older than ttlMs. Used by the dashboard's realtime polling so requests
   * handled by other instances/regions show up within seconds. No-op when no
   * cloud engine is configured (pure local mode).
   */
  async refreshFromCloudIfStale(ttlMs = 3000) {
    const hasCloudEngine =
      Boolean(getEffectiveMongoUri()) ||
      Boolean(getEffectiveSupabaseUrl()) ||
      Boolean(cleanEnv(process.env.KV_REST_API_URL) || cleanEnv(process.env.UPSTASH_REDIS_REST_URL));
    if (!hasCloudEngine) return null;

    const now = Date.now();
    if (now - lastCloudPullAt < ttlMs) return null;
    lastCloudPullAt = now;

    try {
      return await this.syncFromCloud();
    } catch {
      return null;
    }
  },

  /**
   * Serverless cold-start guard: a fresh instance has an empty local store while
   * the real configuration (provider accounts / keys) lives in the cloud
   * database. Pull it once before routing or provider tests so a new instance
   * doesn't report "Belum ada akun/key" for every provider on the first
   * request. No-op when any local config exists or no cloud engine is set.
   */
  async ensureCloudConfigLoaded() {
    const hasCloudEngine = hasCloudEngineConfigured();
    if (!hasCloudEngine) return null;

    // Note: memoryMasterKey is seeded from the ROUTER_API_KEY/GATEWAY_SECRET env at
    // module load, so it must NOT count as "local config exists" — otherwise this
    // guard would never fire on deployments that (correctly) set a router key.
    const hasLocalConfig =
      memoryProviderAccounts.length > 0 ||
      memoryCfAccounts.length > 0 ||
      Object.values(memoryProviderKeys).some((v) => (v || '').trim().length > 0) ||
      Object.values(memoryProviderBaseUrls).some((v) => (v || '').trim().length > 0);
    if (hasLocalConfig) return null;

    const now = Date.now();
    if (now - lastCloudPullAt < 5000) return null;
    lastCloudPullAt = now;

    try {
      return await this.syncFromCloud();
    } catch {
      return null;
    }
  },

  /**
   * Lightweight persistence summary for the dashboard — no connection tests.
   * Tells the UI where server-side state is stored, so users can see whether
   * their accounts actually reached the server (and whether they survive a
   * restart/redeploy: local storage on serverless = ephemeral /tmp).
   */
  getPersistenceSummary() {
    loadDbConfigFile();
    const mongoUri = getEffectiveMongoUri() || '';
    const mongoEnvPresent = Boolean(mongoUri);
    // A pasted value that is not a mongodb:// / mongodb+srv:// URI (e.g. the DB
    // name was pasted into MONGODB_URI) must not light up as "connected".
    const mongoUriValid = !mongoEnvPresent || /^mongodb(\+srv)?:\/\//i.test(mongoUri);
    const mongo = mongoEnvPresent && mongoUriValid;
    const supabase = Boolean(getEffectiveSupabaseUrl());
    const redis = Boolean(cleanEnv(process.env.KV_REST_API_URL) || cleanEnv(process.env.UPSTASH_REDIS_REST_URL));
    const engine = mongo ? 'mongodb' : supabase ? 'supabase' : redis ? 'redis' : 'local';
    const dataDir = getDataDir();
    const serverlessEnv = Boolean(process.env.VERCEL || process.env.NETLIFY);
    const persistent = engine !== 'local' || !serverlessEnv;
    // Connection health from the last getDatabaseStatus() run (the Database tab
    // and the dashboard trigger it). Lets the Providers status chip show
    // "configured but the connection actually fails" instead of a green light.
    const conn = lastConnectionCheck;
    let connectionOk: boolean | undefined;
    let connectionError: string | undefined;
    if (conn && engine !== 'local') {
      if (engine === 'mongodb') {
        connectionOk = conn.mongoConnected;
        connectionError = conn.mongoError;
      } else if (engine === 'supabase') {
        connectionOk = conn.supabaseConnected;
        connectionError = conn.supabaseError;
      } else if (engine === 'redis') {
        connectionOk = true; // presence-based engine
      }
    }
    const buildSha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || '').trim();
    return {
      engine,
      cloudConfigured: engine !== 'local',
      dataDir,
      persistent,
      build: buildSha ? buildSha.slice(0, 7) : 'lokal/dev',
      mongoEnvPresent,
      mongoUriValid,
      connectionOk,
      connectionError,
      connectionCheckedAt: lastConnectionCheck?.at,
      accountsCount: memoryProviderAccounts.length,
      cfAccountsCount: memoryCfAccounts.length,
      keysCount: Object.values(memoryProviderKeys).filter((v) => String(v || '').trim().length > 0).length,
      configHydrated,
    };
  },

  // --- Database Connection Diagnostic ---
  async getDatabaseStatus() {
    loadDbConfigFile();

    const mongoUri = getEffectiveMongoUri();
    const supabaseUrl = getEffectiveSupabaseUrl();
    const redisUrl = cleanEnv(process.env.KV_REST_API_URL) || cleanEnv(process.env.UPSTASH_REDIS_REST_URL) || undefined;

    let activeEngine: 'mongodb' | 'supabase' | 'redis' | 'local' = 'local';
    let mongoConnected = false;
    let mongoHost = '';
    let mongoError = '';
    let supabaseConnected = false;
    let supabaseTableStatus = 'unknown';
    let supabaseError = '';

    // Test MongoDB if configured
    if (mongoUri) {
      try {
        const parsedHost = mongoUri.match(/@([^/?#]+)/)?.[1] || 'mongodb-cluster';
        mongoHost = parsedHost;
        const mdb = await getMongoDb();
        if (mdb) {
          await mdb.command({ ping: 1 });
          mongoConnected = true;
          activeEngine = 'mongodb';
        } else {
          mongoError = lastMongoConnectError || 'Tidak bisa terhubung ke MongoDB.';
        }
      } catch (err) {
        mongoConnected = false;
        mongoError = err instanceof Error ? err.message : String(err);
      }
    }

    // Test Supabase if configured
    if (supabaseUrl) {
      try {
        const client = getSupabaseClient();
        if (client) {
          const tableName = getEffectiveSupabaseTable();
          const { error } = await client.from(tableName).select('id').limit(1);
          if (!error) {
            supabaseConnected = true;
            supabaseTableStatus = 'ready';
            if (activeEngine === 'local') activeEngine = 'supabase';
          } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
            supabaseConnected = true; // Connection auth works, but table missing
            supabaseTableStatus = 'table_missing';
            if (activeEngine === 'local') activeEngine = 'supabase';
          } else {
            supabaseConnected = false;
            supabaseTableStatus = error.message;
            supabaseError = error.message;
          }
        }
      } catch (err) {
        supabaseConnected = false;
        supabaseError = err instanceof Error ? err.message : String(err);
      }
    }

    if (activeEngine === 'local' && redisUrl) {
      activeEngine = 'redis';
    }

    lastConnectionCheck = {
      at: Date.now(),
      activeEngine,
      mongoConfigured: Boolean(mongoUri),
      mongoConnected,
      mongoError: mongoError || undefined,
      supabaseConfigured: Boolean(supabaseUrl),
      supabaseConnected,
      supabaseError: supabaseError || undefined,
      redisConfigured: Boolean(redisUrl),
    };

    return {
      activeEngine,
      mongodb: {
        configured: Boolean(mongoUri),
        connected: mongoConnected,
        host: mongoHost,
        databaseName: getEffectiveMongoDbName(),
        uriMasked: mongoUri ? mongoUri.replace(/:([^@]+)@/, ':****@') : '',
        error: mongoError,
      },
      supabase: {
        configured: Boolean(supabaseUrl),
        connected: supabaseConnected,
        url: supabaseUrl || '',
        table: getEffectiveSupabaseTable(),
        tableStatus: supabaseTableStatus,
        error: supabaseError,
      },
      redis: {
        configured: Boolean(redisUrl),
      },
      local: {
        path: getDataFilePath(),
        exists: fs.existsSync(getDataFilePath()),
      },
      counts: {
        logs: memoryLogs.length,
        tokens: memoryTokens.length,
        hasMasterKey: Boolean(memoryMasterKey),
      },
    };
  },

  // --- Connection Testers ---
  async testMongoConnection(uri: string, dbName = 'zexin9') {
    if (!uri || !uri.trim()) {
      return { success: false, message: 'URI MongoDB tidak boleh kosong.' };
    }
    let tempClient: MongoClient | null = null;
    try {
      tempClient = new MongoClient(uri.trim(), { serverSelectionTimeoutMS: 5000 });
      await tempClient.connect();
      const testDb = tempClient.db(dbName.trim() || 'zexin9');
      await testDb.command({ ping: 1 });
      const collections = await testDb.listCollections().toArray();
      await tempClient.close();
      return {
        success: true,
        message: `Koneksi MongoDB berhasil! Terhubung ke database "${dbName}" (${collections.length} koleksi ditemukan).`,
      };
    } catch (err: any) {
      if (tempClient) {
        try { await tempClient.close(); } catch {}
      }
      return {
        success: false,
        message: `Gagal terhubung ke MongoDB: ${err?.message || 'Timeout / Auth Failed'}`,
      };
    }
  },

  async testSupabaseConnection(url: string, key: string, tableName = 'nine_router_state') {
    if (!url || !url.trim() || !key || !key.trim()) {
      return { success: false, message: 'Supabase URL dan API Key wajib diisi.' };
    }
    try {
      const client = createClient(url.trim(), key.trim(), { auth: { persistSession: false } });
      const { error } = await client.from(tableName.trim() || 'nine_router_state').select('id').limit(1);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return {
            success: true,
            tableMissing: true,
            message: `Koneksi Supabase valid! Namun tabel "${tableName}" belum ada. Silakan jalankan SQL schema yang disediakan.`,
          };
        }
        return {
          success: false,
          message: `Supabase error: ${error.message} (Code: ${error.code})`,
        };
      }
      return {
        success: true,
        tableMissing: false,
        message: `Koneksi Supabase berhasil! Tabel "${tableName}" siap digunakan.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal terhubung ke Supabase: ${err?.message || 'Network Error'}`,
      };
    }
  },

  // --- Runtime DB Config Persistence ---
  saveDatabaseConfig(config: DbConfig) {
    runtimeDbConfig = { ...runtimeDbConfig, ...config };
    // Clear caches so new credentials take effect
    cachedMongoClient = null;
    cachedMongoDb = null;
    cachedSupabaseClient = null;

    try {
      const configPath = getDbConfigFilePath();
      // Encrypt connection secrets at rest
      const persisted: DbConfig = {
        ...runtimeDbConfig,
        mongodbUri: runtimeDbConfig.mongodbUri
          ? encValue(runtimeDbConfig.mongodbUri)
          : runtimeDbConfig.mongodbUri,
        supabaseKey: runtimeDbConfig.supabaseKey
          ? encValue(runtimeDbConfig.supabaseKey)
          : runtimeDbConfig.supabaseKey,
      };
      fs.writeFileSync(configPath, JSON.stringify(persisted, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save db-config.json:', e);
    }

    // Trigger immediate cloud persist and sync
    persistData();
  },

  // --- Provider Keys & Multi-Account Management (9Router-style Cloud Storage) ---
  getProviderSettings() {
    loadData();
    return {
      keys: { ...memoryProviderKeys },
      baseUrls: { ...memoryProviderBaseUrls },
      cfAccountId: memoryCfAccountId,
      cfAccounts: [...memoryCfAccounts],
      providerAccounts: [...memoryProviderAccounts],
    };
  },

  setProviderSettings(
    keys: Record<string, string>,
    baseUrls: Record<string, string> = {},
    cfAccountId: string = '',
    cfAccounts?: CloudflareAccount[],
    providerAccounts?: ProviderAccount[]
  ) {
    loadData();
    // Clean and update keys (only keep non-empty trimmed keys)
    const cleanKeys: Record<string, string> = {};
    Object.entries(keys).forEach(([pId, kVal]) => {
      if (typeof kVal === 'string' && kVal.trim().length > 0) {
        cleanKeys[pId] = kVal.trim();
      }
    });
    memoryProviderKeys = cleanKeys;

    const cleanUrls: Record<string, string> = {};
    Object.entries(baseUrls).forEach(([pId, uVal]) => {
      if (typeof uVal === 'string' && uVal.trim().length > 0) {
        cleanUrls[pId] = uVal.trim();
      }
    });
    memoryProviderBaseUrls = cleanUrls;

    if (typeof cfAccountId === 'string') {
      memoryCfAccountId = cfAccountId.trim();
    }

    if (Array.isArray(cfAccounts)) {
      memoryCfAccounts = cfAccounts.filter(
        (acc) => acc && typeof acc.accountId === 'string' && typeof acc.apiToken === 'string'
      );
      setRuntimeCfAccounts(memoryCfAccounts);
    }

    if (Array.isArray(providerAccounts)) {
      memoryProviderAccounts = providerAccounts.filter(
        (acc) => acc && typeof acc.provider === 'string' && typeof acc.apiKey === 'string'
      );
      setRuntimeProviderAccounts(memoryProviderAccounts);
    }

    setRuntimeStoredKeys(memoryProviderKeys);
    setRuntimeStoredBaseUrls(memoryProviderBaseUrls);
    if (memoryCfAccountId) {
      setRuntimeCfAccountId(memoryCfAccountId);
    }

    // A dashboard save is authoritative — this instance now knows its config.
    configHydrated = true;
    persistData();
  },

  // Universal 9Router-style Provider Accounts Management
  getProviderAccounts(): ProviderAccount[] {
    loadData();
    return [...memoryProviderAccounts];
  },

  saveProviderAccounts(accounts: ProviderAccount[]) {
    loadData();
    if (Array.isArray(accounts)) {
      memoryProviderAccounts = accounts.filter(
        (acc) => acc && typeof acc.provider === 'string' && typeof acc.apiKey === 'string'
      );
      setRuntimeProviderAccounts(memoryProviderAccounts);
      configHydrated = true;
      persistData();
    }
  },

  // --- Backup Export ---
  exportAllData() {
    loadData();
    return {
      appName: 'Zexin9 Gateway',
      exportedAt: new Date().toISOString(),
      masterKey: memoryMasterKey,
      tokens: memoryTokens,
      providerKeys: memoryProviderKeys,
      providerBaseUrls: memoryProviderBaseUrls,
      cfAccountId: memoryCfAccountId,
      cfAccounts: memoryCfAccounts,
      providerAccounts: memoryProviderAccounts,
      logs: memoryLogs,
      stats: this.getStats(),
    };
  },
};
