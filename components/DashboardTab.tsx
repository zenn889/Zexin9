'use client';

import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Database,
  Flame,
  Globe2,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { DEFAULT_FALLBACK_GROUPS, DEFAULT_PROVIDERS } from '@/lib/config';

interface DashboardTabProps {
  onSelectTab: (tab: string) => void;
  configuredCount: number;
}

export function DashboardTab({ onSelectTab, configuredCount }: DashboardTabProps) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // Interactive Simulator state
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const runSimulation = () => {
    setIsSimulating(true);
    setSimStep(1);

    setTimeout(() => setSimStep(2), 600);
    setTimeout(() => setSimStep(3), 1500);
    setTimeout(() => setSimStep(4), 2300);
    setTimeout(() => {
      setSimStep(5);
      setIsSimulating(false);
    }, 3200);
  };

  const resetSimulation = () => {
    setSimStep(0);
    setIsSimulating(false);
  };

  const periodStats = {
    today: { requests: '48', tokensSaved: '34.2%', failovers: '3', estSaved: '$1.85' },
    week: { requests: '320', tokensSaved: '31.8%', failovers: '19', estSaved: '$14.20' },
    month: { requests: '1,420', tokensSaved: '33.5%', failovers: '84', estSaved: '$58.60' },
    all: { requests: '4,890', tokensSaved: '32.9%', failovers: '298', estSaved: '$189.40' },
  };

  const currentStats = periodStats[period];

  return (
    <div className="space-y-6 text-slate-200">
      {/* 9Router Period Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#30363d]">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-slate-400">PERIOD:</span>
          <div className="flex bg-[#161b22] border border-[#30363d] p-1 rounded-lg">
            {(['today', 'week', 'month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded text-xs font-mono font-semibold transition ${
                  period === p
                    ? 'bg-[#1f6feb] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
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
          <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Multi-Tier Failover Active</span>
          </span>
        </div>
      </div>

      {/* 9Router 4 Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Requests */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>TOTAL REQUESTS</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{currentStats.requests}</div>
          <div className="text-[11px] text-slate-400 mt-1">Routed via 9Router proxy</div>
        </div>

        {/* Card 2: RTK Tokens Saved */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>RTK TOKENS SAVED</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {currentStats.tokensSaved}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Via diff & whitespace compressor</div>
        </div>

        {/* Card 3: Failover Events */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>AUTO-FAILOVERS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {currentStats.failovers}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">429 rate limits bypassed</div>
        </div>

        {/* Card 4: Est Cost Saved */}
        <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>EST. COST SAVED</span>
            <Coins className="w-4 h-4 text-[#58a6ff]" />
          </div>
          <div className="text-2xl font-black text-[#58a6ff] font-mono">
            {currentStats.estSaved}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Tokens saved + free tier offloading</div>
        </div>
      </div>

      {/* 9Router 3-Tier Fallback Hierarchy View */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">3-Tier Fallback Hierarchy</h3>
            <p className="text-xs text-slate-400">
              When quota hits a wall, 9Router cascades: Subscription Tier → Cheap Tier → Free Tier.
            </p>
          </div>
          <button
            onClick={() => onSelectTab('providers')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
          >
            Manage API Keys →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Tier 1: Subscription */}
          <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-orange-400">TIER 1: SUBSCRIPTION</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800">
                Primary
              </span>
            </div>
            <div className="text-xs font-semibold text-white">Claude 3.7 / 3.5 & GPT-4o</div>
            <p className="text-[11px] text-slate-400">
              Your primary paid coding subscriptions. Used first for frontier reasoning.
            </p>
          </div>

          {/* Tier 2: Cheap */}
          <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400">TIER 2: CHEAP (PAYG)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800">
                Backup
              </span>
            </div>
            <div className="text-xs font-semibold text-white">DeepSeek V3 / R1 & Mistral</div>
            <p className="text-[11px] text-slate-400">
              Extremely cost-effective frontier models for when Tier 1 reaches limits.
            </p>
          </div>

          {/* Tier 3: Free Tier */}
          <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400">TIER 3: FREE TIER</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                Safety Net
              </span>
            </div>
            <div className="text-xs font-semibold text-white">Gemini 2.0 Flash & Groq LPU</div>
            <p className="text-[11px] text-slate-400">
              Generous free rate limits & 800 tok/s speeds. Ensures zero coding stoppage.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Failover Simulator */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <span>Interactive Failover Simulator</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Simulation
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Test how 9Router handles quota exhaustion during coding without interrupting Cursor/Cline.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-white font-semibold text-xs transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSimulating ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
            <button
              onClick={resetSimulation}
              disabled={isSimulating || simStep === 0}
              className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-400 transition"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Simulator Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Step 1 */}
          <div
            className={`p-3.5 rounded-lg border transition ${
              simStep >= 3
                ? 'bg-rose-950/30 border-rose-800/80'
                : 'bg-[#0d1117] border-[#30363d]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">1. Anthropic Tier</span>
              {simStep >= 3 && (
                <span className="text-rose-400 font-bold text-[10px] bg-rose-950 px-1 rounded">
                  429 RATE LIMIT
                </span>
              )}
            </div>
            <div className="text-xs text-slate-200 font-semibold">Claude 3.5 Sonnet</div>
            <p className="text-[11px] text-slate-400 mt-1">
              {simStep >= 3 ? 'Quota exhausted. 9Router caught 429 and triggered Tier 2.' : 'Active primary provider.'}
            </p>
          </div>

          {/* Step 2 */}
          <div
            className={`p-3.5 rounded-lg border transition ${
              simStep >= 4
                ? 'bg-amber-950/30 border-amber-800/80'
                : 'bg-[#0d1117] border-[#30363d]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">2. OpenAI Tier</span>
              {simStep >= 4 && (
                <span className="text-amber-400 font-bold text-[10px] bg-amber-950 px-1 rounded">
                  503 TIMEOUT
                </span>
              )}
            </div>
            <div className="text-xs text-slate-200 font-semibold">GPT-4o</div>
            <p className="text-[11px] text-slate-400 mt-1">
              {simStep >= 4 ? 'API timed out. 9Router auto-cascaded to Tier 3.' : 'Backup frontier provider.'}
            </p>
          </div>

          {/* Step 3 */}
          <div
            className={`p-3.5 rounded-lg border transition ${
              simStep >= 5
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50'
                : 'bg-[#0d1117] border-[#30363d]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">3. Google Gemini Tier</span>
              {simStep >= 5 && (
                <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950 px-1 rounded">
                  200 OK • 218ms
                </span>
              )}
            </div>
            <div className="text-xs text-slate-200 font-semibold">Gemini 2.0 Flash</div>
            <p className="text-[11px] text-slate-400 mt-1">
              {simStep >= 5 ? 'Success! Cursor received full completion without interruption.' : 'Free tier safety net.'}
            </p>
          </div>
        </div>
      </div>

      {/* Virtual Models Table */}
      <div className="p-5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3">
        <h3 className="font-bold text-white text-sm">Virtual Models (Available in /v1/models)</h3>
        <div className="divide-y divide-[#30363d] text-xs">
          {DEFAULT_FALLBACK_GROUPS.map((g) => (
            <div key={g.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <code className="text-cyan-400 font-mono font-bold">{g.id}</code>
                  <span className="text-slate-400">({g.name})</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{g.description}</div>
              </div>
              <div className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-[#0d1117] border border-[#30363d]">
                  {g.providers.length} failover tiers
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
