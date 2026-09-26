'use client';

import React, { useEffect, useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Copy,
  Check,
  Server,
  Key,
  Shield,
  FileCode,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  HardDrive,
  Layers,
} from 'lucide-react';

interface DatabaseStatus {
  activeEngine: 'mongodb' | 'supabase' | 'redis' | 'local';
  mongodb: {
    configured: boolean;
    connected: boolean;
    host: string;
    databaseName: string;
    uriMasked: string;
    error?: string;
  };
  supabase: {
    configured: boolean;
    connected: boolean;
    url: string;
    table: string;
    tableStatus: string;
    error?: string;
  };
  redis: {
    configured: boolean;
  };
  local: {
    path: string;
    exists: boolean;
  };
  counts: {
    logs: number;
    tokens: number;
    hasMasterKey: boolean;
  };
}

export function DatabaseTab() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDb, setSelectedDb] = useState<'mongodb' | 'supabase' | 'env'>('mongodb');

  // MongoDB Form
  const [mongoUri, setMongoUri] = useState('');
  const [mongoDbName, setMongoDbName] = useState('zexin9');
  const [showMongoUri, setShowMongoUri] = useState(false);
  const [testingMongo, setTestingMongo] = useState(false);
  const [mongoTestMsg, setMongoTestMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Supabase Form
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseTable, setSupabaseTable] = useState('zexin9_state');
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestMsg, setSupabaseTestMsg] = useState<{ success: boolean; text: string; tableMissing?: boolean } | null>(null);

  // General Actions
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const supabaseSqlSchema = `-- Jalankan di SQL Editor Supabase:
CREATE TABLE IF NOT EXISTS zexin9_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- (Opsional) Berikan izin service role & anon
ALTER TABLE zexin9_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access" ON zexin9_state
  FOR ALL USING (true);`;

  const envSample = `# --- Zexin9 Database Configuration ---
# Opsi 1: MongoDB Atlas (NoSQL)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/zexin9?retryWrites=true&w=majority
MONGODB_DB=zexin9

# Opsi 2: Supabase (PostgreSQL Cloud)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...
SUPABASE_TABLE=zexin9_state

# Master Security Gate
ROUTER_API_KEY=master_password_anda`;

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/database');
      if (res.ok) {
        const data: DatabaseStatus = await res.json();
        setStatus(data);
        if (data.mongodb.configured) {
          setMongoDbName(data.mongodb.databaseName || '9router');
        }
        if (data.supabase.configured) {
          setSupabaseUrl(data.supabase.url || '');
          setSupabaseTable(data.supabase.table || 'nine_router_state');
        }
      }
    } catch (err) {
      console.error('Failed to fetch DB status', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestMongo = async () => {
    if (!mongoUri.trim()) {
      setMongoTestMsg({ success: false, text: 'Harap masukkan MongoDB Connection URI terlebih dahulu.' });
      return;
    }
    setTestingMongo(true);
    setMongoTestMsg(null);
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_mongo',
          uri: mongoUri.trim(),
          dbName: mongoDbName.trim() || '9router',
        }),
      });
      const data = await res.json();
      setMongoTestMsg({ success: data.success, text: data.message });
    } catch (err: any) {
      setMongoTestMsg({ success: false, text: err?.message || 'Gagal menghubungi server' });
    } finally {
      setTestingMongo(false);
    }
  };

  const handleTestSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setSupabaseTestMsg({ success: false, text: 'Harap masukkan Supabase URL dan API Key.' });
      return;
    }
    setTestingSupabase(true);
    setSupabaseTestMsg(null);
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_supabase',
          url: supabaseUrl.trim(),
          key: supabaseKey.trim(),
          table: supabaseTable.trim() || 'nine_router_state',
        }),
      });
      const data = await res.json();
      setSupabaseTestMsg({ success: data.success, text: data.message, tableMissing: data.tableMissing });
    } catch (err: any) {
      setSupabaseTestMsg({ success: false, text: err?.message || 'Gagal menghubungi server' });
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleSaveMongoConfig = async () => {
    if (!mongoUri.trim()) {
      setMongoTestMsg({ success: false, text: 'Harap masukkan MongoDB Connection URI.' });
      return;
    }
    setSavingConfig(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          preferredEngine: 'mongodb',
          mongodbUri: mongoUri.trim(),
          mongodbDb: mongoDbName.trim() || '9router',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg('MongoDB berhasil disimpan dan aktif sebagai database utama!');
        fetchStatus();
      } else {
        setMongoTestMsg({ success: false, text: data.error || 'Gagal menyimpan konfigurasi.' });
      }
    } catch (err: any) {
      setMongoTestMsg({ success: false, text: err?.message || 'Gagal menyimpan konfigurasi.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveSupabaseConfig = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setSupabaseTestMsg({ success: false, text: 'Harap lengkapi Supabase URL dan Key.' });
      return;
    }
    setSavingConfig(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          preferredEngine: 'supabase',
          supabaseUrl: supabaseUrl.trim(),
          supabaseKey: supabaseKey.trim(),
          supabaseTable: supabaseTable.trim() || 'nine_router_state',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg('Supabase berhasil disimpan dan aktif sebagai database utama!');
        fetchStatus();
      } else {
        setSupabaseTestMsg({ success: false, text: data.error || 'Gagal menyimpan konfigurasi.' });
      }
    } catch (err: any) {
      setSupabaseTestMsg({ success: false, text: err?.message || 'Gagal menyimpan konfigurasi.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg(`Sinkronisasi sukses! Dimuat dari ${data.result.source.toUpperCase()}.`);
        fetchStatus();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zexin9-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Backup download failed', e);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(supabaseSqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const copyEnv = () => {
    navigator.clipboard.writeText(envSample);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Database & Cloud Storage</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  MongoDB & Supabase Ready
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Pilih dan hubungkan <strong>MongoDB Atlas</strong> atau <strong>Supabase PostgreSQL</strong> untuk menyimpan Master Key, API Tokens, dan Request Logs secara permanen di cloud.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-semibold transition disabled:opacity-50 active:scale-95"
            title="Tarik data terbaru dari Cloud DB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>{syncing ? 'Sinkronisasi...' : 'Sync Cloud'}</span>
          </button>

          <button
            onClick={handleExportBackup}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-semibold transition active:scale-95"
            title="Download full JSON backup"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Backup</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-600/50 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Cards: Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Active Engine Card */}
        <div className="pro-card p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-slate-400">ACTIVE ENGINE</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20 animate-pulse" />
          </div>
          <div className="flex items-center space-x-2 mt-1">
            {status?.activeEngine === 'mongodb' ? (
              <span className="text-base font-bold text-emerald-400 flex items-center space-x-1.5">
                <span>🍃</span> <span>MongoDB Atlas</span>
              </span>
            ) : status?.activeEngine === 'supabase' ? (
              <span className="text-base font-bold text-teal-400 flex items-center space-x-1.5">
                <span>⚡</span> <span>Supabase Cloud</span>
              </span>
            ) : status?.activeEngine === 'redis' ? (
              <span className="text-base font-bold text-rose-400 flex items-center space-x-1.5">
                <span>⚡</span> <span>Upstash Redis</span>
              </span>
            ) : (
              <span className="text-base font-bold text-amber-400 flex items-center space-x-1.5">
                <span>📁</span> <span>Local JSON / Mem</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-2 truncate">
            {status?.activeEngine === 'mongodb'
              ? `Host: ${status.mongodb.host || 'Connected'}`
              : status?.activeEngine === 'supabase'
              ? `Table: ${status.supabase.table}`
              : 'Standby / Local Storage'}
          </p>
          {status?.activeEngine === 'local' &&
            (status.mongodb.configured || status.supabase.configured || status.redis.configured) && (
              <p className="text-[10px] font-mono mt-2 text-rose-300 break-words leading-relaxed">
                ⚠️{' '}
                {status.mongodb.configured
                  ? `MongoDB terdeteksi di env (db: ${status.mongodb.databaseName}) tapi KONEKSI GAGAL.`
                  : status.supabase.configured
                  ? 'Supabase terdeteksi di env tapi koneksi gagal.'
                  : 'Redis/KV terdeteksi di env.'}
                {status.mongodb.configured && status.mongodb.error
                  ? ` Pesan server: ${status.mongodb.error.slice(0, 220)}`
                  : status.supabase.error
                  ? ` Pesan server: ${status.supabase.error.slice(0, 220)}`
                  : ' Cek: sudah redeploy setelah mengisi env? IP Atlas sudah 0.0.0.0/0? Password & nama variabel sudah benar?'}
              </p>
            )}
        </div>

        {/* Synced Logs Card */}
        <div className="pro-card p-5">
          <div className="text-xs text-slate-400 font-mono text-[10px] uppercase tracking-wider font-semibold mb-2">LOGS TERSIMPAN</div>
          <div className="text-3xl font-bold text-white font-mono tracking-tight mt-1">
            {status ? status.counts.logs : '...'}
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-2">Maksimum 500 riwayat request</p>
        </div>

        {/* Active Client Tokens Card */}
        <div className="pro-card p-5">
          <div className="text-xs text-slate-400 font-mono text-[10px] uppercase tracking-wider font-semibold mb-2">CLIENT API TOKENS</div>
          <div className="text-3xl font-bold text-cyan-400 font-mono tracking-tight mt-1">
            {status ? status.counts.tokens : '...'}
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-2">Token akses proxy klien</p>
        </div>

        {/* Master Security Key Status */}
        <div className="pro-card p-5">
          <div className="text-xs text-slate-400 font-mono text-[10px] uppercase tracking-wider font-semibold mb-2">SECURITY GATE KEY</div>
          <div className="flex items-center space-x-1.5 mt-2">
            {status?.counts.hasMasterKey ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center space-x-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>TERKUNCI & AMAN</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                BELUM DISET
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-2">Tersimpan di database</p>
        </div>
      </div>

      {/* Database Switcher Navigation (Mobile Horizontal Touch Scroll) */}
      <div className="border-b border-white/[0.06] flex space-x-2 sm:space-x-3 overflow-x-auto no-scrollbar whitespace-nowrap pb-1">
        <button
          onClick={() => setSelectedDb('mongodb')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition shrink-0 ${
            selectedDb === 'mongodb'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base">🍃</span>
          <span>MongoDB Atlas</span>
          {status?.mongodb.connected && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setSelectedDb('supabase')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition shrink-0 ${
            selectedDb === 'supabase'
              ? 'border-teal-400 text-teal-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-base">⚡</span>
          <span>Supabase PostgreSQL</span>
          {status?.supabase.connected && (
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          )}
        </button>

        <button
          onClick={() => setSelectedDb('env')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition shrink-0 ${
            selectedDb === 'env'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Environment Variables (.env)</span>
        </button>
      </div>


      {/* --- TAB 1: MONGODB CONFIGURATION --- */}
      {selectedDb === 'mongodb' && (
        <div className="space-y-6">
          <div className="pro-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>🍃 Setup Koneksi MongoDB Atlas</span>
                  {status?.mongodb.connected && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                      TERHUBUNG
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gunakan MongoDB Atlas gratis (M0 Free Tier) atau MongoDB instance Anda sendiri.
                </p>
              </div>
              <a
                href="https://www.mongodb.com/cloud/atlas/register"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                <span>Daftar MongoDB Atlas Gratis</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Test Message */}
            {mongoTestMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  mongoTestMsg.success
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-200'
                }`}
              >
                {mongoTestMsg.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{mongoTestMsg.text}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* MongoDB URI */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  MongoDB Connection URI
                </label>
                <p className="text-[10px] text-slate-500 mb-1.5">
                  WAJIB. Seluruh teks dari Atlas (Connect → Drivers), sudah termasuk username &amp; password di dalamnya. Kalau kamu sudah mengisi env <code>MONGODB_URI</code> di hosting/menu .env, kolom ini boleh dikosongkan.
                </p>
                <div className="relative">
                  <input
                    type={showMongoUri ? 'text' : 'password'}
                    value={mongoUri}
                    onChange={(e) => setMongoUri(e.target.value)}
                    placeholder="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/zexin9?retryWrites=true&w=majority"
                    className="w-full input-pro pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMongoUri(!showMongoUri)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showMongoUri ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {status?.mongodb.configured && !mongoUri && (
                  <p className="text-[11px] font-mono text-emerald-400/80 mt-1">
                    ✓ Konfigurasi saat ini aktif: {status.mongodb.uriMasked}
                  </p>
                )}
              </div>

              {/* Database Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Database Name
                </label>
                <p className="text-[10px] text-slate-500 mb-1.5">
                  WAJIB juga — tapi hanya nama &quot;folder&quot; datanya saja (mis. zexin9). Ini BUKAN koneksi kedua; koneksinya ada di URI di atas. Kalau URI-mu sudah memuat /zexin9, tulis nama yang sama di sini.
                </p>
                <input
                  type="text"
                  value={mongoDbName}
                  onChange={(e) => setMongoDbName(e.target.value)}
                  placeholder="zexin9"
                  className="w-full max-w-sm input-pro"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleTestMongo}
                disabled={testingMongo}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-semibold transition disabled:opacity-50 flex items-center space-x-1.5 active:scale-95"
              >
                <Zap className={`w-3.5 h-3.5 ${testingMongo ? 'animate-pulse text-amber-400' : 'text-emerald-400'}`} />
                <span>{testingMongo ? 'Menguji Koneksi...' : 'Test Koneksi MongoDB'}</span>
              </button>

              <button
                onClick={handleSaveMongoConfig}
                disabled={savingConfig}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition disabled:opacity-50 flex items-center space-x-1.5 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingConfig ? 'Menyimpan...' : 'Simpan & Hubungkan MongoDB'}</span>
              </button>
            </div>
          </div>

          {/* Quick Guide */}
          <div className="pro-card p-4 sm:p-5 space-y-2 text-xs text-slate-300">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <span>📖 Panduan Singkat MongoDB Atlas (Gratis):</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>Buka <a href="https://www.mongodb.com/cloud/atlas" target="_blank" rel="noreferrer" className="text-cyan-400 underline">MongoDB Atlas</a> lalu buat project baru dengan Free Cluster (M0).</li>
              <li>Di menu <strong>Security → Network Access</strong>, klik <em>Add IP Address</em> lalu pilih <strong>Allow Access from Anywhere</strong> (<code>0.0.0.0/0</code>).</li>
              <li>Di menu <strong>Security → Database Access</strong>, buat user & password database.</li>
              <li>Klik tombol <strong>Connect</strong> pada cluster → Pilih <strong>Drivers</strong> → Salin Connection String (URI).</li>
              <li>Ganti <code>&lt;password&gt;</code> dengan password user Anda, lalu paste ke form di atas!</li>
            </ol>
          </div>
        </div>
      )}

      {/* --- TAB 2: SUPABASE CONFIGURATION --- */}
      {selectedDb === 'supabase' && (
        <div className="space-y-6">
          <div className="pro-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>⚡ Setup Koneksi Supabase PostgreSQL</span>
                  {status?.supabase.connected && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
                      TERHUBUNG
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gunakan Supabase Free Tier untuk penyimpanan data PostgreSQL kelas enterprise dengan REST API.
                </p>
              </div>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                <span>Buka Dashboard Supabase</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Test Message */}
            {supabaseTestMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  supabaseTestMsg.success
                    ? 'bg-teal-500/10 border border-teal-500/20 text-teal-200'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-200'
                }`}
              >
                {supabaseTestMsg.success ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{supabaseTestMsg.text}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Project URL */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full input-pro"
                />
              </div>

              {/* Service Role / API Key */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Supabase API Key (Disarankan: service_role key untuk bypass RLS)
                </label>
                <div className="relative">
                  <input
                    type={showSupabaseKey ? 'text' : 'password'}
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full input-pro pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSupabaseKey(!showSupabaseKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showSupabaseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Table Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tabel State (Default: nine_router_state)
                </label>
                <input
                  type="text"
                  value={supabaseTable}
                  onChange={(e) => setSupabaseTable(e.target.value)}
                  placeholder="nine_router_state"
                  className="w-full max-w-sm input-pro"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleTestSupabase}
                disabled={testingSupabase}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-semibold transition disabled:opacity-50 flex items-center space-x-1.5 active:scale-95"
              >
                <Zap className={`w-3.5 h-3.5 ${testingSupabase ? 'animate-pulse text-amber-400' : 'text-teal-400'}`} />
                <span>{testingSupabase ? 'Menguji Koneksi...' : 'Test Koneksi Supabase'}</span>
              </button>

              <button
                onClick={handleSaveSupabaseConfig}
                disabled={savingConfig}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 transition disabled:opacity-50 flex items-center space-x-1.5 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingConfig ? 'Menyimpan...' : 'Simpan & Hubungkan Supabase'}</span>
              </button>
            </div>
          </div>

          {/* SQL Schema Copy Box */}
          <div className="pro-card p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <FileCode className="w-4 h-4 text-teal-400" />
                <span>SQL Schema untuk Supabase (Jalankan 1x di Supabase SQL Editor):</span>
              </h4>
              <button
                onClick={copySql}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-teal-300 text-xs font-mono flex items-center space-x-1 transition"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-[#090d16] border border-white/[0.06] font-mono text-[11px] text-teal-200/90 overflow-x-auto leading-relaxed">
              {supabaseSqlSchema}
            </pre>
          </div>
        </div>
      )}

      {/* --- TAB 3: ENVIRONMENT VARIABLES GUIDE --- */}
      {selectedDb === 'env' && (
        <div className="space-y-4">
          <div className="pro-card p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>Deployment via Environment Variables (Vercel / Netlify / VPS)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Untuk deployment produksi di Vercel atau server lain, Anda cukup menambahkan variabel berikut di dashboard Vercel / file <code>.env.local</code>.
                </p>
              </div>
              <button
                onClick={copyEnv}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-cyan-300 text-xs font-mono font-semibold flex items-center space-x-1.5 transition"
              >
                {copiedEnv ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Snippet .env</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-[#090d16] border border-white/[0.06] font-mono text-xs text-cyan-200/90 overflow-x-auto leading-relaxed">
              {envSample}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
