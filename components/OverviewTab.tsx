'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  Globe2,
  Layers,
  Network,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { DEFAULT_FALLBACK_GROUPS } from '@/lib/config';

interface OverviewTabProps {
  onSelectTab: (tab: string) => void;
  configuredCount: number;
}

export function OverviewTab({ onSelectTab, configuredCount }: OverviewTabProps) {
  // Interactive Simulator state
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const runSimulation = () => {
    setIsSimulating(true);
    setSimStep(1); // Client request sent

    setTimeout(() => {
      setSimStep(2); // RTK Token Compression
    }, 700);

    setTimeout(() => {
      setSimStep(3); // Tier 1 Anthropic hits 429
    }, 1600);

    setTimeout(() => {
      setSimStep(4); // Tier 2 OpenAI hits 503
    }, 2500);

    setTimeout(() => {
      setSimStep(5); // Tier 3 Gemini succeeds 200 OK!
      setIsSimulating(false);
    }, 3400);
  };

  const resetSimulation = () => {
    setSimStep(0);
    setIsSimulating(false);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section with Ambient Glow */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-b from-[#0f172a]/90 via-[#0a0f1d]/90 to-[#070b14]/90 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-cyan-500/15 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-500/10 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          {/* Top Pill Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-mono font-semibold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>9ROUTER CLOUD • VERCEL & NETLIFY SERVERLESS</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>RTK TOKEN SAVER</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ZERO DOWNTIME FAILOVER</span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Never Get Blocked by <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Rate Limits or Quota Errors.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-xl max-w-3xl leading-relaxed font-normal">
            9Router is the unified, high-availability AI proxy for <strong>Cursor</strong>, <strong>Cline</strong>, and <strong>Claude Code</strong>. It multiplexes Anthropic, OpenAI, Gemini, Groq, and DeepSeek through a single resilient endpoint with automatic fallback and prompt compression.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onSelectTab('playground')}
              className="inline-flex items-center space-x-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-xl shadow-cyan-500/25 transition transform active:scale-95"
            >
              <span>Launch Playground</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectTab('providers')}
              className="inline-flex items-center space-x-2.5 px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold transition active:scale-95 shadow-sm"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Configure Providers</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                {configuredCount} Active
              </span>
            </button>

            <button
              onClick={() => onSelectTab('deploy')}
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 font-semibold transition active:scale-95"
            >
              <Globe2 className="w-4 h-4 text-indigo-400" />
              <span>Deploy to Vercel / Netlify</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-8 border-t border-slate-800/70">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">9+</div>
            <div className="text-xs font-semibold text-slate-300 mt-1">AI Providers</div>
            <div className="text-[11px] text-slate-400">Claude, GPT-4o, Gemini, Groq, DeepSeek</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">0 ms</div>
            <div className="text-xs font-semibold text-slate-300 mt-1">Coding Downtime</div>
            <div className="text-[11px] text-slate-400">Instant background failover cascade</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">20-40%</div>
            <div className="text-xs font-semibold text-slate-300 mt-1">Token Savings</div>
            <div className="text-[11px] text-slate-400">RTK compression & Caveman mode</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">$0 / mo</div>
            <div className="text-xs font-semibold text-slate-300 mt-1">Hosting Cost</div>
            <div className="text-[11px] text-slate-400">Vercel & Netlify Serverless free tiers</div>
          </div>
        </div>
      </div>

      {/* Interactive Live Fallback Simulator */}
      <div className="p-8 rounded-3xl border border-cyan-900/40 bg-gradient-to-b from-[#0e1628]/80 to-[#090d18]/90 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Interactive Failover Simulator</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                  Live Demo
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Watch how 9Router intercepts rate limits in real-time and routes your request to a working provider.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSimulating ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
            <button
              onClick={resetSimulation}
              disabled={isSimulating || simStep === 0}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Pipeline Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 my-8 items-center">
          {/* Step 1: Client Request */}
          <div
            className={`p-4 rounded-2xl border transition-all duration-300 ${
              simStep >= 1
                ? 'border-cyan-500/80 bg-cyan-950/40 shadow-lg shadow-cyan-950/50'
                : 'border-slate-800 bg-slate-900/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">Step 1</span>
              {simStep >= 1 && <span className="text-cyan-400 font-bold">Dispatched</span>}
            </div>
            <div className="font-bold text-sm text-white">Cursor / Cline IDE</div>
            <p className="text-[11px] text-slate-400 mt-1">Requests model: <code className="text-cyan-300">auto-smart</code></p>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className={`w-5 h-5 transition ${simStep >= 2 ? 'text-cyan-400 animate-pulse' : ''}`} />
          </div>

          {/* Step 2: RTK Optimizer */}
          <div
            className={`p-4 rounded-2xl border transition-all duration-300 ${
              simStep >= 2
                ? 'border-emerald-500/80 bg-emerald-950/40 shadow-lg shadow-emerald-950/50'
                : 'border-slate-800 bg-slate-900/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">Step 2</span>
              {simStep >= 2 && <span className="text-emerald-400 font-bold">-32% Tokens</span>}
            </div>
            <div className="font-bold text-sm text-white">RTK Token Optimizer</div>
            <p className="text-[11px] text-slate-400 mt-1">Compresses diffs & strips whitespace</p>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className={`w-5 h-5 transition ${simStep >= 3 ? 'text-cyan-400 animate-pulse' : ''}`} />
          </div>

          {/* Step 3: Gateway Multiplexer */}
          <div
            className={`p-4 rounded-2xl border transition-all duration-300 ${
              simStep >= 3
                ? 'border-indigo-500/80 bg-indigo-950/40 shadow-lg shadow-indigo-950/50'
                : 'border-slate-800 bg-slate-900/40'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">Step 3</span>
              {simStep >= 5 ? (
                <span className="text-emerald-400 font-bold">Success</span>
              ) : simStep >= 3 ? (
                <span className="text-amber-400 font-bold">Cascading</span>
              ) : null}
            </div>
            <div className="font-bold text-sm text-white">Fallback Cascade</div>
            <p className="text-[11px] text-slate-400 mt-1">Tries candidate providers in order</p>
          </div>
        </div>

        {/* Cascade Execution Tiers */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
            Fallback Cascade Logs:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Tier 1: Anthropic */}
            <div
              className={`p-4 rounded-xl border transition-all duration-300 ${
                simStep >= 3
                  ? 'border-rose-800/80 bg-rose-950/30'
                  : 'border-slate-800/60 bg-slate-900/20 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-slate-200">1. Anthropic Claude 3.5</span>
                {simStep >= 3 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 font-bold">
                    429 RATE LIMIT
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {simStep >= 3
                  ? 'Primary quota exhausted. Router immediately caught 429 and triggered Tier 2.'
                  : 'Primary preferred frontier provider'}
              </p>
            </div>

            {/* Tier 2: OpenAI */}
            <div
              className={`p-4 rounded-xl border transition-all duration-300 ${
                simStep >= 4
                  ? 'border-amber-800/80 bg-amber-950/30'
                  : 'border-slate-800/60 bg-slate-900/20 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-slate-200">2. OpenAI GPT-4o</span>
                {simStep >= 4 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold">
                    503 TIMEOUT
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {simStep >= 4
                  ? 'OpenAI API overloaded. Router automatically cascaded to Tier 3.'
                  : 'Secondary frontier backup provider'}
              </p>
            </div>

            {/* Tier 3: Google Gemini */}
            <div
              className={`p-4 rounded-xl border transition-all duration-300 ${
                simStep >= 5
                  ? 'border-emerald-500 bg-emerald-950/40 shadow-lg shadow-emerald-950/60'
                  : 'border-slate-800/60 bg-slate-900/20 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-emerald-300">3. Google Gemini 2.0</span>
                {simStep >= 5 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 border border-emerald-700 font-extrabold animate-pulse">
                    200 OK • 218ms
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                {simStep >= 5
                  ? 'Gemini 2.0 answered in 218ms! Cursor received completion without error.'
                  : 'Tertiary high-throughput backup provider'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Virtual Models Showcase */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Pre-Configured Virtual Models
            </h2>
            <p className="text-sm text-slate-400">
              Pass any of these virtual names to your IDE or SDK for automatic multi-provider resilience:
            </p>
          </div>
          <button
            onClick={() => onSelectTab('integrations')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <span>See how to use in Cursor</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {DEFAULT_FALLBACK_GROUPS.map((group) => {
            const tagColors: Record<string, string> = {
              smart: 'text-cyan-400 bg-cyan-950/80 border-cyan-800/70',
              fast: 'text-emerald-400 bg-emerald-950/80 border-emerald-800/70',
              reason: 'text-purple-400 bg-purple-950/80 border-purple-800/70',
              code: 'text-amber-400 bg-amber-950/80 border-amber-800/70',
            };

            return (
              <div
                key={group.id}
                className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/60 hover:border-slate-700 transition group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <code className="text-sm font-black text-white font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 group-hover:border-cyan-500/50 transition">
                      {group.id}
                    </code>
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${
                        tagColors[group.tag] || 'text-slate-400 bg-slate-800 border-slate-700'
                      }`}
                    >
                      {group.tag}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {group.providers.length} failover tiers
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-4 leading-relaxed">{group.description}</p>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    Fallback Chain:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.providers.map((p, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800/90 flex items-center space-x-1"
                      >
                        <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                        <span>{p.provider}</span>
                        <span className="text-slate-500">({p.model})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
