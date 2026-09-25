'use client';

import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Flame,
  Globe2,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { DEFAULT_FALLBACK_GROUPS } from '@/lib/config';

interface OverviewTabProps {
  onSelectTab: (tab: string) => void;
  configuredCount: number;
}

export function OverviewTab({ onSelectTab, configuredCount }: OverviewTabProps) {
  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-[#11192e] to-[#0c1222] p-8 sm:p-10 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 text-xs font-mono mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>9ROUTER VERCEL & NETLIFY EDITION</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Stop Quota Exhaustion. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              One Resilient Gateway for All AI Models.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg mb-8 leading-relaxed">
            9Router is an ultra-resilient AI proxy designed for developer tools like <strong>Cursor</strong>, <strong>Cline</strong>, and <strong>Claude Code</strong>. It features intelligent multi-tier automatic fallback across Anthropic, OpenAI, Gemini, Groq, and DeepSeek, with built-in RTK token compression.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => onSelectTab('playground')}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-cyan-500/25 transition transform active:scale-95"
            >
              <span>Test in Playground</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectTab('providers')}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-medium transition"
            >
              <span>Configure Providers</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                {configuredCount} Active
              </span>
            </button>
            <button
              onClick={() => onSelectTab('deploy')}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-indigo-900/50 text-indigo-300 font-medium transition"
            >
              <span>Deploy to Vercel / Netlify</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-base mb-1">Multi-Tier Auto Fallback</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Automatically cascades to backup providers if your primary API hits rate limits (429) or quota errors (402/403).
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-base mb-1">RTK Token Saver</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Compresses whitespace, cleans duplicate git diff headers, and enables Caveman Mode to slash token bills by 20-40%.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-base mb-1">Dual OpenAI & Claude API</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Exposes both standard <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-purple-300">/v1/chat/completions</code> and native <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-purple-300">/v1/messages</code>.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <Globe2 className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white text-base mb-1">100% Serverless</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Zero state required, runs free on Vercel & Netlify edge/serverless tiers with streaming SSE support.
          </p>
        </div>
      </div>

      {/* Interactive Fallback Pipeline Visualizer */}
      <div className="border border-slate-800 rounded-xl bg-slate-900/40 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>How 9Router Eliminates Coding Interruptions</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Visual request lifecycle through token compression and multi-tier failover
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-3 py-1 rounded-full mt-2 sm:mt-0">
            Auto-Failover Active
          </span>
        </div>

        {/* Visual Pipeline Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-center">
          <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/60">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Step 1</span>
            <p className="text-sm font-semibold text-white">Client Request</p>
            <p className="text-xs text-slate-400 mt-1">Cursor / Cline / Claude Code calls gateway</p>
          </div>

          <div className="hidden md:flex justify-center text-cyan-400">
            <ArrowRight className="w-6 h-6 animate-pulse" />
          </div>

          <div className="p-4 rounded-xl border border-cyan-800/70 bg-cyan-950/30">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block mb-1">Step 2</span>
            <p className="text-sm font-semibold text-white">RTK Token Optimizer</p>
            <p className="text-xs text-slate-400 mt-1">Strips noise, compresses diffs, saves 30% tokens</p>
          </div>

          <div className="hidden md:flex justify-center text-cyan-400">
            <ArrowRight className="w-6 h-6 animate-pulse" />
          </div>

          <div className="p-4 rounded-xl border border-indigo-800/70 bg-indigo-950/30">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-1">Step 3</span>
            <p className="text-sm font-semibold text-white">Failover Cascade</p>
            <p className="text-xs text-slate-400 mt-1">Tier 1 → Tier 2 → Tier 3 until success</p>
          </div>
        </div>

        {/* Cascade Example Cards */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Real Example: Request for <code className="text-cyan-400">auto-smart</code> model
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-red-900/50 bg-red-950/20">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">1. Anthropic</span>
                <span className="text-[10px] text-red-400 bg-red-950 px-1.5 py-0.5 rounded">429 Rate Limit</span>
              </div>
              <p className="text-slate-400 text-[11px]">Claude 3.5 Sonnet quota exhausted</p>
            </div>

            <div className="p-3 rounded-lg border border-amber-900/50 bg-amber-950/20">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-300">2. OpenAI</span>
                <span className="text-[10px] text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded">503 Timeout</span>
              </div>
              <p className="text-slate-400 text-[11px]">GPT-4o server overloaded</p>
            </div>

            <div className="p-3 rounded-lg border border-emerald-800/80 bg-emerald-950/30 shadow-lg shadow-emerald-950/50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-emerald-300">3. Google Gemini</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-900 px-1.5 py-0.5 rounded font-bold">200 OK</span>
              </div>
              <p className="text-emerald-200/80 text-[11px]">Gemini 2.0 Flash answered in 220ms!</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 opacity-50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-400">4. DeepSeek</span>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Standby</span>
              </div>
              <p className="text-slate-500 text-[11px]">Ready in reserve queue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-configured Virtual Fallback Groups */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white">Predefined Virtual Models</h2>
          <p className="text-sm text-slate-400">
            Use these virtual model names in Cursor, Cline, or your API requests for automatic multi-tier routing:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEFAULT_FALLBACK_GROUPS.map((group) => (
            <div
              key={group.id}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <code className="text-sm font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50">
                    {group.id}
                  </code>
                  <span className="text-xs text-slate-400 font-medium">({group.tag})</span>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {group.providers.length} failover tiers
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3">{group.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.providers.map((p, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/60"
                  >
                    {idx + 1}. {p.provider} ({p.model})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
