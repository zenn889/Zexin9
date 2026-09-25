'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  Clock,
  Copy,
  Cpu,
  Key,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';

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
    <div className="space-y-6 sm:space-y-8 text-slate-200">
      {/* Top Period & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-slate-400 font-semibold tracking-wider">PERIOD:</span>
          <div className="flex bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl shadow-inner overflow-x-auto no-scrollbar">
            {(['today', 'week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all active:scale-95 whitespace-nowrap ${
                  period === p
                    ? 'bg-white/[0.1] text-white font-semibold shadow-sm border border-white/[0.08]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
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
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 hover:text-white border border-white/[0.08] transition flex items-center space-x-2 text-xs font-mono font-medium shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards (Obsidian Pro Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Requests */}
        <div className="pro-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Total Requests</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white font-mono tracking-tight">{totalRequestsCount}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ring-2 ring-cyan-400/20" />
            <span>Proxy requests processed</span>
          </div>
        </div>

        {/* Card 2: RTK Tokens Saved */}
        <div className="pro-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Tokens Saved (RTK)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-300 font-mono tracking-tight">
            {totalTokensSaved.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
            <span>Compressed via RTK Engine</span>
          </div>
        </div>

        {/* Card 3: Auto-Failovers */}
        <div className="pro-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Auto-Failovers</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-300 font-mono tracking-tight">{failoverCount}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
            <span>429 & rate limits bypassed</span>
          </div>
        </div>

        {/* Card 4: Avg Response Time */}
        <div className="pro-card p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Avg Latency</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-300 font-mono tracking-tight">
            {avgLatency > 0 ? `${avgLatency} ms` : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ring-2 ring-blue-400/20" />
            <span>Edge proxy turnaround</span>
          </div>
        </div>
      </div>

      {/* 3-Tier Fallback Gateway Architecture Pipeline */}
      <div className="pro-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>3-Tier High-Availability Routing Pipeline</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Zero-downtime failover cascade across Subscription, Low-Cost, and Free Edge providers.
            </p>
          </div>
          <button
            onClick={() => onSelectTab('providers')}
            className="text-xs font-mono px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-cyan-300 hover:text-white border border-white/[0.08] transition self-start sm:self-auto flex items-center space-x-1.5 font-medium"
          >
            <span>Manage Keys & Models</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {/* Tier 1 */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.07] hover:border-amber-500/30 transition space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-300">Tier 1: Frontier</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                Primary
              </span>
            </div>
            <div className="text-xs font-semibold text-white">Claude 3.7 / 3.5 & GPT-4o</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Highest reasoning intelligence for complex programming. Intercepts 429 rate limits.
            </p>
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 text-[10px]">FAILOVER:</span>
              <span className="text-cyan-400 font-medium">Tier 2 Backup</span>
            </div>
          </div>

          {/* Tier 2 */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.07] hover:border-cyan-500/30 transition space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cyan-300">Tier 2: Low-Cost Backup</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                Pay-As-You-Go
              </span>
            </div>
            <div className="text-xs font-semibold text-white">DeepSeek V4.1/V3 & SiliconFlow</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ultra-affordable frontier intelligence (DeepSeek, Mistral, Together, OpenRouter).
            </p>
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 text-[10px]">FAILOVER:</span>
              <span className="text-emerald-400 font-medium">Tier 3 Safety Net</span>
            </div>
          </div>

          {/* Tier 3 */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.07] hover:border-emerald-500/30 transition space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-300">Tier 3: Free & Edge LPU</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                Safety Net
              </span>
            </div>
            <div className="text-xs font-semibold text-white">Gemini 2.0, Groq & Cloudflare</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Generous free-tier quotas & up to 1,800 tok/s LPU inference. Never get blocked!
            </p>
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500 text-[10px]">RELIABILITY:</span>
              <span className="text-emerald-400 font-bold">100% Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Request & Failover Logs */}
      <div className="pro-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Request & Failover Logs</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live audit trail of API calls routed through Zexin9 by Cursor, Cline, Claude Code, and Playground.
            </p>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Filter model/client..."
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="input-pro w-full sm:w-52"
              />
            </div>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 transition shrink-0"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="border border-white/[0.06] rounded-xl overflow-x-auto bg-black/30">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.06] text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="p-3 font-semibold">Time</th>
                <th className="p-3 font-semibold">Client</th>
                <th className="p-3 font-semibold">Requested Model</th>
                <th className="p-3 font-semibold">Route / Failover</th>
                <th className="p-3 font-semibold">Tokens (In / Out)</th>
                <th className="p-3 font-semibold">Latency</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    No requests recorded yet. Test a prompt in Playground or call the proxy from Cursor!
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isFailover = log.fallbackCount > 0;
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-slate-300 font-sans truncate max-w-[120px]" title={log.client}>
                        {log.client}
                      </td>
                      <td className="p-3 text-cyan-300 font-semibold whitespace-nowrap">
                        {log.requestedModel}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isFailover ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium">
                            <span>⚠️ {log.failoverNote || `Failover Tier ${log.fallbackCount}`}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Direct ({log.servedProvider})</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300 whitespace-nowrap">
                        <span>{log.promptTokens}</span>
                        <span className="text-slate-500"> / </span>
                        <span>{log.completionTokens}</span>
                        {log.tokensSaved > 0 && (
                          <span className="text-emerald-400 font-medium ml-1.5">
                            (+{log.tokensSaved} saved)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300 whitespace-nowrap">{log.latencyMs}ms</td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            log.status === 200
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
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

      {/* Client Bearer Tokens Management (Access Management) */}
      <div className="pro-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Client Bearer Tokens (Access Management)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate distinct Bearer keys for Cursor, Cline, Claude Code, or team members to track per-client usage.
            </p>
          </div>

          <form onSubmit={handleCreateToken} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="e.g. Work Laptop Cursor"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              className="input-pro w-full sm:w-52"
            />
            <button
              type="submit"
              disabled={!newTokenName.trim()}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Token</span>
            </button>
          </form>
        </div>

        {/* Tokens List */}
        <div className="divide-y divide-white/[0.04] border border-white/[0.06] rounded-xl bg-black/30 overflow-hidden">
          {clientTokens.map((t) => (
            <div key={t.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white truncate">{t.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06] shrink-0">
                    {t.requestCount} requests
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <code className="text-[11px] sm:text-xs font-mono text-cyan-300 bg-black/50 px-2.5 py-1 rounded-lg border border-white/[0.06] shadow-inner truncate max-w-[180px] xs:max-w-[240px] sm:max-w-none">
                    {t.token}
                  </code>
                  <button
                    onClick={() => copyToken(t.id, t.token)}
                    className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/[0.06] transition shrink-0"
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

              <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs font-mono text-slate-400 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.04]">
                <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                {t.id !== 'default-master' && (
                  <button
                    onClick={() => handleDeleteToken(t.id)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
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
