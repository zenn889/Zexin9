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
      required: false,
      desc: 'Master secret password for your gateway. If set, clients must pass this token in Authorization: Bearer.',
    },
    {
      name: 'GEMINI_API_KEY',
      required: false,
      desc: 'Google Gemini API Key (Highly recommended - has generous free tier for Gemini 2.0 Flash).',
    },
    {
      name: 'GROQ_API_KEY',
      required: false,
      desc: 'Groq API Key (Ultra-fast 800 tok/s free-tier inference for LLaMA 3.3 70B & DeepSeek R1).',
    },
    {
      name: 'DEEPSEEK_API_KEY',
      required: false,
      desc: 'DeepSeek API Key (Affordable frontier models: DeepSeek V3 & DeepSeek R1).',
    },
    {
      name: 'ANTHROPIC_API_KEY',
      required: false,
      desc: 'Anthropic API Key (For Claude 3.7 & 3.5 Sonnet direct routing).',
    },
    {
      name: 'OPENAI_API_KEY',
      required: false,
      desc: 'OpenAI API Key (For GPT-4o, GPT-4o-mini, o1, o3-mini).',
    },
    {
      name: 'OPENROUTER_API_KEY',
      required: false,
      desc: 'OpenRouter API Key (Ultimate backup gateway with access to 200+ models).',
    },
    {
      name: 'MISTRAL_API_KEY',
      required: false,
      desc: 'Mistral AI Key (For Codestral coding model).',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Rocket className="w-5 h-5 text-cyan-400" />
          <span>Deploying to Vercel & Netlify (Free Serverless)</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Deploy your own private 9Router gateway in less than 2 minutes with zero monthly server costs.
        </p>
      </div>

      {/* 2-Column Deploy Cards: Vercel vs Netlify */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vercel Card */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-lg">
                  ▲
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Deploy to Vercel</h3>
                  <span className="text-xs text-slate-400">Recommended for edge latency</span>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                1-Click Ready
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Vercel runs Next.js serverless functions with streaming response support and global CDN edge routing.
            </p>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="font-semibold text-slate-200">Deployment Steps:</div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Push this repository to your GitHub account.</li>
                <li>Go to <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-cyan-400 underline">vercel.com/new</a> and import the repository.</li>
                <li>Add your API Keys in <strong>Environment Variables</strong>.</li>
                <li>Click <strong>Deploy</strong>!</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Or deploy via Vercel CLI:</span>
              <button
                onClick={() => handleCopy('vercel-cli', 'npx vercel --prod')}
                className="text-cyan-400 hover:text-cyan-300"
              >
                {copiedKey === 'vercel-cli' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300">
              npx vercel --prod
            </pre>
          </div>
        </div>

        {/* Netlify Card */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold text-lg">
                  ◇
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Deploy to Netlify</h3>
                  <span className="text-xs text-slate-400">Serverless functions & webhooks</span>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800">
                Full Support
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Netlify automatically detects Next.js App Router and provisions streaming Serverless functions using the included <code className="text-cyan-400">netlify.toml</code>.
            </p>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="font-semibold text-slate-200">Deployment Steps:</div>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Push this repository to GitHub or GitLab.</li>
                <li>Go to <a href="https://app.netlify.com/start" target="_blank" rel="noreferrer" className="text-cyan-400 underline">app.netlify.com/start</a> and link repository.</li>
                <li>Add your Environment Variables in <strong>Site Configuration</strong>.</li>
                <li>Click <strong>Deploy Site</strong>!</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Or deploy via Netlify CLI:</span>
              <button
                onClick={() => handleCopy('netlify-cli', 'npx netlify deploy --build --prod')}
                className="text-cyan-400 hover:text-cyan-300"
              >
                {copiedKey === 'netlify-cli' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300">
              npx netlify deploy --build --prod
            </pre>
          </div>
        </div>
      </div>

      {/* Environment Variables Reference Table */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-white">Environment Variables Reference</h3>
          <p className="text-xs text-slate-400">
            Configure these variables in your Vercel or Netlify project settings. You only need to add the providers you actually use:
          </p>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                <th className="p-3">Variable Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {envVars.map((v) => (
                <tr key={v.name} className="hover:bg-slate-800/30 transition">
                  <td className="p-3 text-cyan-400 font-semibold">{v.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                      Optional
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 font-sans">{v.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
