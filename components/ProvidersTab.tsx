'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Filter,
  Key,
  Lock,
  Play,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sparkles,
  Zap,
  XCircle,
} from 'lucide-react';
import { DEFAULT_PROVIDERS } from '@/lib/config';
import { ProviderId } from '@/lib/types';

interface ProvidersTabProps {
  keys: Record<string, string>;
  setKeys: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  baseUrls: Record<string, string>;
  setBaseUrls: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  gatewaySecret: string;
  setGatewaySecret: (val: string) => void;
  envConfigured: Record<string, boolean>;
  onRefreshStatus: () => void;
}

const PROVIDER_METADATA: Record<
  ProviderId,
  { color: string; badge: string; border: string; glow: string }
> = {
  anthropic: {
    color: 'from-amber-500 to-orange-600',
    badge: 'Claude 3.7 / 3.5 Sonnet',
    border: 'border-orange-500/30',
    glow: 'group-hover:border-orange-500/60',
  },
  openai: {
    color: 'from-emerald-500 to-teal-600',
    badge: 'GPT-4o & o3-mini',
    border: 'border-emerald-500/30',
    glow: 'group-hover:border-emerald-500/60',
  },
  gemini: {
    color: 'from-sky-400 to-indigo-600',
    badge: 'Gemini 2.0 Flash (Free)',
    border: 'border-sky-500/30',
    glow: 'group-hover:border-sky-500/60',
  },
  deepseek: {
    color: 'from-blue-500 to-cyan-600',
    badge: 'DeepSeek V3 & R1',
    border: 'border-blue-500/30',
    glow: 'group-hover:border-blue-500/60',
  },
  groq: {
    color: 'from-orange-500 to-red-600',
    badge: '800 tok/s LPU (Free)',
    border: 'border-orange-500/30',
    glow: 'group-hover:border-orange-500/60',
  },
  openrouter: {
    color: 'from-purple-500 to-indigo-600',
    badge: '200+ Unified Models',
    border: 'border-purple-500/30',
    glow: 'group-hover:border-purple-500/60',
  },
  mistral: {
    color: 'from-amber-400 to-orange-500',
    badge: 'Codestral & Mistral Large',
    border: 'border-amber-500/30',
    glow: 'group-hover:border-amber-500/60',
  },
  together: {
    color: 'from-teal-400 to-emerald-600',
    badge: 'Qwen 2.5 Coder',
    border: 'border-teal-500/30',
    glow: 'group-hover:border-teal-500/60',
  },
  custom: {
    color: 'from-slate-500 to-slate-700',
    badge: 'Ollama & Self-Hosted',
    border: 'border-slate-500/30',
    glow: 'group-hover:border-slate-500/60',
  },
};

export function ProvidersTab({
  keys,
  setKeys,
  baseUrls,
  setBaseUrls,
  gatewaySecret,
  setGatewaySecret,
  envConfigured,
  onRefreshStatus,
}: ProvidersTabProps) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'configured' | 'free'>('all');
  const [pingResults, setPingResults] = useState<
    Record<
      string,
      { loading?: boolean; success?: boolean; latency?: number; error?: string; status?: number | string }
    >
  >({});
  const [copiedEnv, setCopiedEnv] = useState(false);

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleKeyChange = (providerId: string, value: string) => {
    setKeys((prev) => {
      const updated = { ...prev, [providerId]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem('9router_keys', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleBaseUrlChange = (providerId: string, value: string) => {
    setBaseUrls((prev) => {
      const updated = { ...prev, [providerId]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem('9router_baseurls', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleGatewaySecretChange = (value: string) => {
    setGatewaySecret(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('9router_gateway_secret', value);
    }
  };

  const testProviderPing = async (providerId: ProviderId) => {
    setPingResults((prev) => ({
      ...prev,
      [providerId]: { loading: true },
    }));

    try {
      const res = await fetch('/api/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          apiKey: keys[providerId] || undefined,
          baseUrl: baseUrls[providerId] || undefined,
        }),
      });

      const data = await res.json();
      setPingResults((prev) => ({
        ...prev,
        [providerId]: {
          loading: false,
          success: data.success,
          latency: data.latency,
          error: data.error,
          status: data.status,
        },
      }));
    } catch (err: any) {
      setPingResults((prev) => ({
        ...prev,
        [providerId]: {
          loading: false,
          success: false,
          error: err.message || 'Network error',
        },
      }));
    }
  };

  const generateEnvFileContent = () => {
    let content = `# ============================================================\n`;
    content += `# 9Router Environment Variables for Vercel / Netlify\n`;
    content += `# ============================================================\n\n`;
    if (gatewaySecret) {
      content += `ROUTER_API_KEY="${gatewaySecret}"\n\n`;
    }
    if (keys['anthropic']) content += `ANTHROPIC_API_KEY="${keys['anthropic']}"\n`;
    if (keys['openai']) content += `OPENAI_API_KEY="${keys['openai']}"\n`;
    if (keys['gemini']) content += `GEMINI_API_KEY="${keys['gemini']}"\n`;
    if (keys['deepseek']) content += `DEEPSEEK_API_KEY="${keys['deepseek']}"\n`;
    if (keys['groq']) content += `GROQ_API_KEY="${keys['groq']}"\n`;
    if (keys['openrouter']) content += `OPENROUTER_API_KEY="${keys['openrouter']}"\n`;
    if (keys['mistral']) content += `MISTRAL_API_KEY="${keys['mistral']}"\n`;
    if (keys['together']) content += `TOGETHER_API_KEY="${keys['together']}"\n`;
    if (keys['custom']) {
      content += `CUSTOM_API_KEY="${keys['custom']}"\n`;
      content += `CUSTOM_BASE_URL="${baseUrls['custom'] || 'http://localhost:11434/v1'}"\n`;
    }
    return content;
  };

  const copyEnvToClipboard = () => {
    navigator.clipboard.writeText(generateEnvFileContent());
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const filteredProviders = DEFAULT_PROVIDERS.filter((p) => {
    const isConfigured = Boolean(keys[p.id] || envConfigured[p.id]);
    if (filter === 'configured') return isConfigured;
    if (filter === 'free') return p.id === 'gemini' || p.id === 'groq';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-cyan-400" />
            <h2 className="text-2xl font-black text-white tracking-tight">
              Provider Credentials & Multi-Keys
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Keys are saved in your local browser and automatically forwarded when calling the gateway.
          </p>
        </div>

        {/* Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'all' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All (9)
            </button>
            <button
              onClick={() => setFilter('configured')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'configured' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Configured
            </button>
            <button
              onClick={() => setFilter('free')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'free' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Free Tiers
            </button>
          </div>

          <button
            onClick={copyEnvToClipboard}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700/80 transition active:scale-95 shadow-sm"
          >
            {copiedEnv ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Copied .env!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-cyan-400" />
                <span>Export .env</span>
              </>
            )}
          </button>

          <button
            onClick={onRefreshStatus}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
            title="Refresh Environment Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gateway Master Key Card */}
      <div className="p-6 rounded-2xl border border-indigo-900/60 bg-gradient-to-r from-indigo-950/40 via-slate-900/50 to-slate-950/60 backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Gateway Master API Key</h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Optional Security
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Set a secret password to prevent unauthorized access to your Vercel / Netlify public URL. Clients must pass <code className="text-indigo-300 font-mono">Authorization: Bearer &lt;key&gt;</code>.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 max-w-xl">
          <input
            type="text"
            placeholder="e.g. sk-9router-supersecret-token"
            value={gatewaySecret}
            onChange={(e) => handleGatewaySecretChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-mono text-indigo-200 placeholder-slate-600 focus:outline-none transition shadow-inner"
          />
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProviders.map((provider) => {
          const meta = PROVIDER_METADATA[provider.id];
          const isConfiguredEnv = Boolean(envConfigured[provider.id]);
          const currentKey = keys[provider.id] || '';
          const hasKey = Boolean(currentKey || isConfiguredEnv);
          const ping = pingResults[provider.id];

          return (
            <div
              key={provider.id}
              className={`p-6 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${
                hasKey
                  ? 'border-slate-800 bg-slate-900/60 shadow-lg'
                  : 'border-slate-800/60 bg-slate-950/40 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Subtle top color gradient bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${meta.color}`}
              />

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${meta.color} flex items-center justify-center font-black text-xs text-white uppercase shadow-md`}
                  >
                    {provider.id.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white">{provider.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        Tier #{provider.priority}
                      </span>
                    </div>
                    <span className="text-[11px] text-cyan-400 font-mono font-medium">
                      {meta.badge}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isConfiguredEnv && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold">
                      ENV Set
                    </span>
                  )}
                  {hasKey ? (
                    <span className="flex items-center space-x-1 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Not set</span>
                  )}
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span>API Key</span>
                    <button
                      type="button"
                      onClick={() => toggleShowKey(provider.id)}
                      className="text-slate-500 hover:text-slate-300 flex items-center space-x-1"
                    >
                      {showKeys[provider.id] ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Reveal</span>
                        </>
                      )}
                    </button>
                  </div>

                  <input
                    type={showKeys[provider.id] ? 'text' : 'password'}
                    placeholder={
                      isConfiguredEnv
                        ? 'Configured in Environment Variables'
                        : `Enter ${provider.name} API Key`
                    }
                    value={currentKey}
                    onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none transition shadow-inner"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Base URL (Endpoint Override)
                  </span>
                  <input
                    type="text"
                    placeholder={provider.baseUrl}
                    value={baseUrls[provider.id] || ''}
                    onChange={(e) => handleBaseUrlChange(provider.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-400 placeholder-slate-700 focus:outline-none transition shadow-inner"
                  />
                </div>

                {/* Footer Ping Action */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <div className="text-xs font-mono">
                    {ping?.loading && (
                      <span className="text-cyan-400 flex items-center space-x-1.5 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing latency...</span>
                      </span>
                    )}
                    {ping && !ping.loading && ping.success && (
                      <span className="text-emerald-400 flex items-center space-x-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {ping.latency}ms •{' '}
                          {ping.latency && ping.latency < 400 ? 'Ultra Fast' : 'Good'}
                        </span>
                      </span>
                    )}
                    {ping && !ping.loading && !ping.success && (
                      <span
                        className="text-rose-400 flex items-center space-x-1.5 font-medium"
                        title={ping.error}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Failed ({ping.status || 'Err'})</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => testProviderPing(provider.id)}
                    disabled={ping?.loading || !hasKey}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 transition active:scale-95"
                  >
                    <Play className="w-3 h-3 text-cyan-400 fill-current" />
                    <span>Ping Test</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
