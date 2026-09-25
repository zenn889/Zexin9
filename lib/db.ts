import fs from 'fs';
import path from 'path';
import { MongoClient, Db } from 'mongodb';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  setRuntimeStoredKeys,
  setRuntimeStoredBaseUrls,
  setRuntimeCfAccountId,
} from './config';

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

// Runtime DB configuration
let runtimeDbConfig: DbConfig = {};

// Database clients cache
let cachedMongoClient: MongoClient | null = null;
let cachedMongoDb: Db | null = null;
let cachedSupabaseClient: SupabaseClient | null = null;

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

// Load DB config from file if present
function loadDbConfigFile() {
  try {
    const configPath = getDbConfigFilePath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      runtimeDbConfig = JSON.parse(raw);
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
        memoryTokens = parsed.tokens;
      }
      if (typeof parsed.masterKey === 'string' && parsed.masterKey.trim().length > 0) {
        memoryMasterKey = parsed.masterKey.trim();
      }
      if (parsed.providerKeys && typeof parsed.providerKeys === 'object') {
        memoryProviderKeys = parsed.providerKeys;
      } else {
        memoryProviderKeys = {};
      }
      setRuntimeStoredKeys(memoryProviderKeys);

      if (parsed.providerBaseUrls && typeof parsed.providerBaseUrls === 'object') {
        memoryProviderBaseUrls = parsed.providerBaseUrls;
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
    }
  } catch {
    // ignore read error, fallback to memory
  }
}

// --- MongoDB Integration ---
function getEffectiveMongoUri(): string | undefined {
  return (
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    runtimeDbConfig.mongodbUri ||
    undefined
  );
}

function getEffectiveMongoDbName(): string {
  return (
    process.env.MONGODB_DB ||
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
    console.error('MongoDB connection error:', err);
    return null;
  }
}

// --- Supabase Integration ---
function getEffectiveSupabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL ||
    runtimeDbConfig.supabaseUrl ||
    undefined
  );
}

function getEffectiveSupabaseKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
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
async function persistToCloud(data: {
  logs: RequestLog[];
  tokens: ClientToken[];
  masterKey: string;
  providerKeys: Record<string, string>;
  providerBaseUrls: Record<string, string>;
  cfAccountId: string;
}) {
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
        },
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to sync to Supabase:', e);
    }
  }

  // 3. Upstash Redis (if configured)
  const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
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

function persistData() {
  const data = {
    logs: memoryLogs.slice(0, 500), // retain latest 500 logs
    tokens: memoryTokens,
    masterKey: memoryMasterKey,
    providerKeys: memoryProviderKeys,
    providerBaseUrls: memoryProviderBaseUrls,
    cfAccountId: memoryCfAccountId,
  };

  // 1. Local filesystem persistence
  try {
    const filePath = getDataFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // serverless read-only fallback
  }

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
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
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
            if (Array.isArray(doc.tokens)) memoryTokens = doc.tokens;
            if (typeof doc.masterKey === 'string' && doc.masterKey.trim().length > 0) {
              memoryMasterKey = doc.masterKey.trim();
            }
            if (doc.providerKeys && typeof doc.providerKeys === 'object') {
              memoryProviderKeys = doc.providerKeys;
              setRuntimeStoredKeys(memoryProviderKeys);
            }
            if (doc.providerBaseUrls && typeof doc.providerBaseUrls === 'object') {
              memoryProviderBaseUrls = doc.providerBaseUrls;
              setRuntimeStoredBaseUrls(memoryProviderBaseUrls);
            }
            if (typeof doc.cfAccountId === 'string') {
              memoryCfAccountId = doc.cfAccountId;
              setRuntimeCfAccountId(memoryCfAccountId);
            }
            syncedSource = 'mongodb';
            // update local cache file
            const filePath = getDataFilePath();
            fs.writeFileSync(
              filePath,
              JSON.stringify({
                logs: memoryLogs,
                tokens: memoryTokens,
                masterKey: memoryMasterKey,
                providerKeys: memoryProviderKeys,
                providerBaseUrls: memoryProviderBaseUrls,
                cfAccountId: memoryCfAccountId,
              }),
              'utf-8'
            );
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
          if (Array.isArray(state.tokens)) memoryTokens = state.tokens;
          if (typeof state.masterKey === 'string' && state.masterKey.trim().length > 0) {
            memoryMasterKey = state.masterKey.trim();
          }
          if (state.providerKeys && typeof state.providerKeys === 'object') {
            memoryProviderKeys = state.providerKeys;
            setRuntimeStoredKeys(memoryProviderKeys);
          }
          if (state.providerBaseUrls && typeof state.providerBaseUrls === 'object') {
            memoryProviderBaseUrls = state.providerBaseUrls;
            setRuntimeStoredBaseUrls(memoryProviderBaseUrls);
          }
          if (typeof state.cfAccountId === 'string') {
            memoryCfAccountId = state.cfAccountId;
            setRuntimeCfAccountId(memoryCfAccountId);
          }
          syncedSource = 'supabase';
          const filePath = getDataFilePath();
          fs.writeFileSync(
            filePath,
            JSON.stringify({
              logs: memoryLogs,
              tokens: memoryTokens,
              masterKey: memoryMasterKey,
              providerKeys: memoryProviderKeys,
              providerBaseUrls: memoryProviderBaseUrls,
              cfAccountId: memoryCfAccountId,
            }),
            'utf-8'
          );
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

    // 3. Fallback to local
    loadData();
    return {
      source: syncedSource,
      logsCount: memoryLogs.length,
      tokensCount: memoryTokens.length,
      masterKeyLoaded: Boolean(memoryMasterKey),
    };
  },

  // --- Database Connection Diagnostic ---
  async getDatabaseStatus() {
    loadDbConfigFile();

    const mongoUri = getEffectiveMongoUri();
    const supabaseUrl = getEffectiveSupabaseUrl();
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;

    let activeEngine: 'mongodb' | 'supabase' | 'redis' | 'local' = 'local';
    let mongoConnected = false;
    let mongoHost = '';
    let supabaseConnected = false;
    let supabaseTableStatus = 'unknown';

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
        }
      } catch {
        mongoConnected = false;
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
          }
        }
      } catch {
        supabaseConnected = false;
      }
    }

    if (activeEngine === 'local' && redisUrl) {
      activeEngine = 'redis';
    }

    return {
      activeEngine,
      mongodb: {
        configured: Boolean(mongoUri),
        connected: mongoConnected,
        host: mongoHost,
        databaseName: getEffectiveMongoDbName(),
        uriMasked: mongoUri ? mongoUri.replace(/:([^@]+)@/, ':****@') : '',
      },
      supabase: {
        configured: Boolean(supabaseUrl),
        connected: supabaseConnected,
        url: supabaseUrl || '',
        table: getEffectiveSupabaseTable(),
        tableStatus: supabaseTableStatus,
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
      fs.writeFileSync(configPath, JSON.stringify(runtimeDbConfig, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save db-config.json:', e);
    }

    // Trigger immediate cloud persist and sync
    persistData();
  },

  // --- Provider Keys Management (Multi-Provider Cloud Storage) ---
  getProviderSettings() {
    loadData();
    return {
      keys: { ...memoryProviderKeys },
      baseUrls: { ...memoryProviderBaseUrls },
      cfAccountId: memoryCfAccountId,
    };
  },

  setProviderSettings(
    keys: Record<string, string>,
    baseUrls: Record<string, string> = {},
    cfAccountId: string = ''
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

    setRuntimeStoredKeys(memoryProviderKeys);
    setRuntimeStoredBaseUrls(memoryProviderBaseUrls);
    if (memoryCfAccountId) {
      setRuntimeCfAccountId(memoryCfAccountId);
    }

    persistData();
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
      logs: memoryLogs,
      stats: this.getStats(),
    };
  },
};
