'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  GitBranch,
  Globe,
  Rocket,
  ShieldAlert,
  Sparkles,
  Terminal,
} from 'lucide-react';

export function DeployTab() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const envVars = [
    {
      name: 'ROUTER_API_KEY',
      status: 'Recommended',
      badgeClass: 'text-indigo-400 bg-indigo-950/80 border-indigo-800',
      desc: 'Master secret password for your gateway. If set, clients must pass this token in Authorization: Bearer.',
    },
    {
      name: 'MONGODB_URI',
      status: 'Database (Atlas)',
      badgeClass: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
      desc: 'MongoDB Atlas connection URI. Permanently persists Master Key, tokens, and request logs.',
    },
    {
      name: 'SUPABASE_URL',
      status: 'Database (Postgres)',
      badgeClass: 'text-teal-400 bg-teal-950/80 border-teal-800',
      desc: 'Supabase Project URL. Set together with SUPABASE_SERVICE_ROLE_KEY for PostgreSQL cloud persistence.',
    },
    {
      name: 'GEMINI_API_KEY',
      status: 'Free Tier',
      badgeClass: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
      desc: 'Google Gemini API Key (Highly recommended - has generous free tier for Gemini 2.0 Flash).',
    },
    {
      name: 'GROQ_API_KEY',
      status: 'Free Tier',
      badgeClass: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
      desc: 'Groq API Key (Ultra-fast 800 tok/s free-tier inference for LLaMA 3.3 70B & DeepSeek R1 Distill).',
    },
    {
      name: 'DEEPSEEK_API_KEY',
      status: 'Low Cost',
      badgeClass: 'text-cyan-400 bg-cyan-950/80 border-cyan-800',
      desc: 'DeepSeek API Key (Affordable frontier models: DeepSeek V3 & DeepSeek R1).',
    },
    {
      name: 'ANTHROPIC_API_KEY',
      status: 'Frontier',
      badgeClass: 'text-orange-400 bg-orange-950/80 border-orange-800',
      desc: 'Anthropic API Key (For Claude 3.7 & 3.5 Sonnet direct routing).',
    },
    {
      name: 'OPENAI_API_KEY',
      status: 'Frontier',
      badgeClass: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
      desc: 'OpenAI API Key (For GPT-4o, GPT-4o-mini, o1, o3-mini).',
    },
    {
      name: 'OPENROUTER_API_KEY',
      status: 'Backup',
      badgeClass: 'text-purple-400 bg-purple-950/80 border-purple-800',
      desc: 'OpenRouter API Key (Ultimate backup gateway with access to 200+ models).',
    },
    {
      name: 'MISTRAL_API_KEY',
      status: 'Coding',
      badgeClass: 'text-amber-400 bg-amber-950/80 border-amber-800',
      desc: 'Mistral AI Key (For Codestral coding model).',
    },
    {
      name: 'CLOUDFLARE_API_TOKEN',
      status: 'Free Tier',
      badgeClass: 'text-orange-400 bg-orange-950/80 border-orange-800',
      desc: 'Cloudflare Workers AI API Token (Free 10,000 neurons/day for LLaMA 3.3, Qwen 2.5 Coder, DeepSeek R1).',
    },
    {
      name: 'CLOUDFLARE_ACCOUNT_ID',
      status: 'Required w/ CF',
      badgeClass: 'text-orange-400 bg-orange-950/80 border-orange-800',
      desc: 'Your Cloudflare Account ID (Found in your Cloudflare dashboard URL or Workers overview).',
    },
    {
      name: 'CEREBRAS_API_KEY',
      status: 'Free Tier',
      badgeClass: 'text-purple-400 bg-purple-950/80 border-purple-800',
      desc: 'Cerebras AI Key (World record 1,800 tok/s inference for LLaMA 3.3).',
    },
    {
      name: 'SILICONFLOW_API_KEY',
      status: 'Low Cost',
      badgeClass: 'text-blue-400 bg-blue-950/80 border-blue-800',
      desc: 'SiliconFlow (SiliconCloud) Key for DeepSeek V3, R1, and Qwen models.',
    },
    {
      name: 'PERPLEXITY_API_KEY',
      status: 'Search',
      badgeClass: 'text-teal-400 bg-teal-950/80 border-teal-800',
      desc: 'Perplexity AI Key (Sonar models with live internet citations).',
    },
    {
      name: 'UPSTASH_REDIS_REST_URL',
      status: 'Database',
      badgeClass: 'text-rose-400 bg-rose-950/80 border-rose-800',
      desc: 'Upstash Redis REST URL (Optional cloud persistent database for request logs and client keys).',
    },
    {
      name: 'UPSTASH_REDIS_REST_TOKEN',
      status: 'Database',
      badgeClass: 'text-rose-400 bg-rose-950/80 border-rose-800',
      desc: 'Upstash Redis REST Token (Found in your Upstash Redis Console).',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Rocket className="w-5 h-5 text-cyan-400" />
          <h2 className="text-2xl font-black text-white tracking-tight">
            Deploy to Vercel & Netlify (Free Serverless)
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Deploy your own private Zexin9 gateway in less than 2 minutes with zero monthly server costs.
        </p>
      </div>

      {/* 2-Column Deploy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Vercel Card */}
        <div className="p-8 rounded-3xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#070a14] flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black text-2xl shadow-lg">
                  ▲
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg">Deploy to Vercel</h3>
                  <span className="text-xs text-cyan-400 font-mono">Edge Latency & SSE Streaming</span>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                1-Click Ready
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Vercel executes Next.js serverless functions with zero configuration, automatic HTTPS, and global edge routing.
            </p>

            <div className="space-y-2 text-xs text-slate-300 pt-2">
              <div className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                Deployment Steps:
              </div>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-300">
                <li>Push this repository to your <strong>GitHub</strong> account.</li>
                <li>Open <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">vercel.com/new</a> and import the repo.</li>
                <li>Add your API Keys in <strong>Environment Variables</strong>.</li>
                <li>Click <strong>Deploy</strong>!</li>
              </ol>
            </div>
          </div>

          {/* 1-Click Deploy Button */}
          <a
            href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzenn889%2FZexin9&project-name=zexin9-router&repository-name=Zexin9"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-black text-xs transition flex items-center justify-center space-x-2 shadow-lg hover:scale-[1.02] active:scale-95"
          >
            <span className="text-sm font-bold">▲</span>
            <span>1-Click Deploy to Vercel</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>

          <div className="space-y-2 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Deploy instantly via CLI:</span>
              <button
                onClick={() => handleCopy('vercel-cli', 'npx vercel --prod')}
                className="text-cyan-400 hover:text-cyan-300 font-bold"
              >
                {copiedKey === 'vercel-cli' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 shadow-inner">
              npx vercel --prod
            </pre>
          </div>
        </div>

        {/* Netlify Card */}
        <div className="p-8 rounded-3xl border border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#070a14] flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden group hover:border-slate-700 transition">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-teal-500/20">
                  ◇
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg">Deploy to Netlify</h3>
                  <span className="text-xs text-teal-400 font-mono">Serverless Functions & CDN</span>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-teal-950 text-teal-300 border border-teal-800 font-bold">
                Included netlify.toml
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Netlify seamlessly provisions Next.js App Router serverless functions using the provided <code className="text-cyan-400">netlify.toml</code> configuration.
            </p>

            <div className="space-y-2 text-xs text-slate-300 pt-2">
              <div className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                Deployment Steps:
              </div>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-300">
                <li>Repository is hosted on your <strong>GitHub (zenn889/Zexin9)</strong>.</li>
                <li>Click the 1-Click button below or link repository on Netlify.</li>
                <li>Add your Environment Variables in <strong>Site Configuration</strong>.</li>
                <li>Click <strong>Deploy Site</strong>!</li>
              </ol>
            </div>
          </div>

          {/* 1-Click Deploy Button */}
          <a
            href="https://app.netlify.com/start/deploy?repository=https://github.com/zenn889/Zexin9"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/20 hover:scale-[1.02] active:scale-95"
          >
            <span className="text-sm font-bold">◇</span>
            <span>1-Click Deploy to Netlify</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>

          <div className="space-y-2 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Deploy instantly via CLI:</span>
              <button
                onClick={() => handleCopy('netlify-cli', 'npx netlify deploy --build --prod')}
                className="text-teal-400 hover:text-teal-300 font-bold"
              >
                {copiedKey === 'netlify-cli' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-teal-300 shadow-inner">
              npx netlify deploy --build --prod
            </pre>
          </div>
        </div>
      </div>

      {/* Environment Variables Reference Table */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-white">Environment Variables Reference</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Set these in your Vercel or Netlify project dashboard. You only need to add the providers you actually use:
          </p>
        </div>

        <div className="border border-slate-800/90 rounded-2xl overflow-hidden bg-slate-900/40 shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <th className="p-4">Variable Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {envVars.map((v) => (
                <tr key={v.name} className="hover:bg-slate-800/30 transition">
                  <td className="p-4 text-cyan-300 font-bold">{v.name}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${v.badgeClass}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-300 font-sans">{v.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
