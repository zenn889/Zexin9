'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Cpu,
  Database,
  Flame,
  Globe2,
  Key,
  Layers,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { DEFAULT_FALLBACK_GROUPS } from '@/lib/config';

interface DashboardTabProps {
  onSelectTab: (tab: string) => void;
  configuredCount: number;
}

interface RequestLogItem {
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

interface ClientTokenItem {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsedAt?: string;
  requestCount: number;
}

export function DashboardTab({ onSelectTab, configuredCount }: DashboardTabProps) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [logs, setLogs] = useState<RequestLogItem[]>([]);
  const [clientTokens, setClientTokens] = useState<ClientTokenItem[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [filterModel, setFilterModel] = useState('');

  // Fetch real request logs and client tokens from database
  const fetchLogsAndStats = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) setLogs(data.logs);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchClientTokens = async () => {
    try {
      const res = await fetch('/api/tokens');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tokens)) setClientTokens(data.tokens);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLogsAndStats();
    fetchClientTokens();
  }, []);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName.trim() }),
      });
      if (res.ok) {
        setNewTokenName('');
        fetchClientTokens();
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteToken = async (id: string) => {
    try {
      await fetch('/api/tokens', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchClientTokens();
    } catch {
      // ignore
    }
  };

  const handleClearLogs = async () => {
    if (confirm('Clear all request history?')) {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    }
  };

  const copyToken = (id: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  // Real production metrics calculated from live request logs
  const totalRequestsCount = logs.length;
  const failoverCount = logs.filter((l) => l.fallbackCount > 0).length;
  const totalTokensSaved = logs.reduce((acc, l) => acc + (l.tokensSaved || 0), 0);
  const avgLatency =
    logs.length > 0
      ? Math.round(logs.reduce((acc, l) => acc + (l.latencyMs || 0), 0) / logs.length)
      : 0;

  const filteredLogs = logs.filter((l) => {
    if (!filterModel) return true;
    return (
      l.requestedModel.toLowerCase().includes(filterModel.toLowerCase()) ||
      l.servedProvider.toLowerCase().includes(filterModel.toLowerCase()) ||
      l.client.toLowerCase().includes(filterModel.toLowerCase())
    );
  });

  return (
    <div className="space-y-8 text-slate-200">
      {/* Zexin9 Period Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400 font-semibold tracking-wide">PERIOD:</span>
          <div className="flex bg-[#0b101d] border border-slate-800 p-0.5 sm:p-1 rounded-xl shadow-inner overflow-x-auto no-scrollbar">
            {(['today', 'week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 sm:px-3.5 py-1 rounded-lg text-[11px] sm:text-xs font-mono font-semibold transition active:scale-95 whitespace-nowrap ${
                  period === p
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {p === 'today'
                  ? 'Today'
                  : p === 'week'
                  ? '7 Days'
                  : p === 'month'
                  ? '30 Days'
                  : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLogsAndStats}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition flex items-center space-x-1.5 text-xs font-mono font-semibold shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* Zexin9 4 Analytics Metric Cards with Glowing Obsidian Finish */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Requests */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0f172a]/70 to-[#070b14]/90 border border-slate-800/90 hover:border-cyan-500/40 border-t-2 border-t-cyan-500 shadow-xl transition backdrop-blur-xl">

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="font-semibold tracking-wider">TOTAL REQUESTS</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono tracking-tight">{totalRequestsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Routed via Zexin9 proxy</span>
          </div>
        </div>

        {/* Card 2: RTK Tokens Saved */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0f172a]/70 to-[#070b14]/90 border border-slate-800/90 hover:border-amber-500/40 border-t-2 border-t-amber-400 shadow-xl transition backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="font-semibold tracking-wider">RTK TOKENS SAVED</span>
            <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-800/80 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
            {totalTokensSaved.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>RTK Token Saver compressed</span>
          </div>
        </div>

        {/* Card 3: Auto-Failovers */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0f172a]/70 to-[#070b14]/90 border border-slate-800/90 hover:border-emerald-500/40 border-t-2 border-t-emerald-400 shadow-xl transition backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="font-semibold tracking-wider">AUTO-FAILOVERS</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">{failoverCount}</div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>429 rate limits bypassed</span>
          </div>
        </div>

        {/* Card 4: Avg Response Time */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0f172a]/70 to-[#070b14]/90 border border-slate-800/90 hover:border-blue-500/40 border-t-2 border-t-blue-400 shadow-xl transition backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="font-semibold tracking-wider">AVG LATENCY</span>
            <div className="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-800/80 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono tracking-tight">
            {avgLatency > 0 ? `${avgLatency} ms` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Edge response latency</span>
          </div>
        </div>
      </div>

      {/* 3-Tier Fallback Pool Health & Architecture */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-[#0f172a]/70 to-[#070b14]/90 border border-slate-800/90 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-white text-sm sm:text-base">Zexin9 3-Tier Fallback Gateway Architecture</h3>
            <p className="text-xs text-slate-400">
              Automatic zero-downtime failover cascade across Subscription, Cheap, and Free tiers.
            </p>
          </div>
          <button
            onClick={() => onSelectTab('providers')}
            className="text-xs font-mono px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-cyan-500/40 transition self-start sm:self-auto flex items-center space-x-1.5 font-semibold"
          >
            <span>Manage Keys & Models</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-1">

          {/* Tier 1 */}
          <div className="p-4 rounded-xl bg-[#090d16]/90 border border-orange-900/40 space-y-2.5 hover:border-orange-500/40 transition">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-orange-400">Tier 1: Frontier</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950/80 text-orange-300 border border-orange-800">
                Primary
              </span>
            </div>
            <div className="text-xs font-bold text-white">Claude 3.7/3.5 & GPT-4o</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Highest reasoning intelligence for complex coding tasks. Intercepts 429 rate limits.
            </p>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Failover Target:</span>
              <span className="text-cyan-400 font-semibold">Tier 2 Backup</span>
            </div>
          </div>

          {/* Tier 2 */}
          <div className="p-4 rounded-xl bg-[#090d16]/90 border border-cyan-900/40 space-y-2.5 hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-400">Tier 2: Low-Cost Backup</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                Pay-As-You-Go
              </span>
            </div>
            <div className="text-xs font-bold text-white">DeepSeek V4.1/V3 & SiliconFlow</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ultra-affordable frontier intelligence (DeepSeek, Mistral, Together, OpenRouter).
            </p>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Failover Target:</span>
              <span className="text-emerald-400 font-semibold">Tier 3 Safety Net</span>
            </div>
          </div>

          {/* Tier 3 */}
          <div className="p-4 rounded-xl bg-[#090d16]/90 border border-emerald-900/40 space-y-2.5 hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-400">Tier 3: Free & Edge LPU</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                Safety Net
              </span>
            </div>
            <div className="text-xs font-bold text-white">Gemini 2.0, Groq & Cloudflare</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Generous free-tier quotas & up to 1,800 tok/s LPU inference. Never get blocked!
            </p>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Reliability:</span>
              <span className="text-emerald-400 font-bold">Continuous Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zexin9 Authentic Request Logs Table */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-[#0f172a]/70 to-[#070b14]/90 border border-slate-800/90 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Request & Failover Logs</span>
            </h3>
            <p className="text-xs text-slate-400">
              Live audit trail of all API calls made by Cursor, Cline, Claude Code, and other clients.
            </p>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Filter model/provider..."
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="bg-[#090d16] border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none w-full sm:w-48 shadow-inner"
              />
            </div>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 hover:border-rose-900/60 transition shrink-0"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-800/80 rounded-xl overflow-x-auto bg-[#090d16]/80 -mx-1 sm:mx-0">

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0f172a]/90 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="p-3">Time</th>
                <th className="p-3">Client</th>
                <th className="p-3">Requested Model</th>
                <th className="p-3">Route / Failover</th>
                <th className="p-3">Tokens (In/Out/Saved)</th>
                <th className="p-3">Latency</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                    No requests recorded yet. Test a prompt in Playground or call the proxy from Cursor!
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isFailover = log.fallbackCount > 0;
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-slate-300 font-sans truncate max-w-[120px]" title={log.client}>
                        {log.client}
                      </td>
                      <td className="p-3 text-cyan-300 font-bold whitespace-nowrap">
                        {log.requestedModel}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isFailover ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 text-[11px] font-semibold">
                            <span>⚠️ {log.failoverNote || `Failover Tier ${log.fallbackCount}`}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[11px] font-semibold">
                            <span>✓ Direct ({log.servedProvider})</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300 whitespace-nowrap">
                        <span>{log.promptTokens}</span>
                        <span className="text-slate-500"> / </span>
                        <span>{log.completionTokens}</span>
                        {log.tokensSaved > 0 && (
                          <span className="text-emerald-400 font-bold ml-1.5">
                            (+{log.tokensSaved} saved)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300 whitespace-nowrap">{log.latencyMs}ms</td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 200
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {log.status === 200 ? '200 OK' : `HTTP ${log.status}`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zexin9 Client Tokens Management (Bearer Token Generator) */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-[#0f172a]/70 to-[#070b14]/90 border border-slate-800/90 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center space-x-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Zexin9 Client Bearer Tokens (Access Management)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Generate distinct Bearer keys for Cursor, Cline, Claude Code, or team members to track per-client usage.
            </p>
          </div>

          <form onSubmit={handleCreateToken} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="e.g. Work Laptop Cursor"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              className="bg-[#090d16] border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none shadow-inner w-full sm:w-48"
            />
            <button
              type="submit"
              disabled={!newTokenName.trim()}
              className="inline-flex items-center justify-center space-x-1 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Token</span>
            </button>
          </form>
        </div>

        {/* Tokens List */}
        <div className="divide-y divide-slate-800/60 border border-slate-800/80 rounded-xl bg-[#090d16]/80 overflow-hidden">
          {clientTokens.map((t) => (
            <div key={t.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white truncate">{t.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                    {t.requestCount} requests
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <code className="text-[11px] sm:text-xs font-mono text-cyan-400 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 shadow-inner truncate max-w-[180px] xs:max-w-[240px] sm:max-w-none">
                    {t.token}
                  </code>
                  <button
                    onClick={() => copyToken(t.id, t.token)}
                    className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition shrink-0"
                    title="Copy Token"
                  >
                    {copiedTokenId === t.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs font-mono text-slate-400 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/40">
                <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                {t.id !== 'default-master' && (
                  <button
                    onClick={() => handleDeleteToken(t.id)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/40 transition"
                    title="Revoke Token"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

