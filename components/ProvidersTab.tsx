'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Key,
  Play,
  RefreshCw,
  Shield,
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
  { color: string; badge: string; tier: 1 | 2 | 3 }
> = {
  anthropic: {
    color: 'from-amber-500 to-orange-600',
    badge: 'Claude 3.7 / 3.5 Sonnet',
    tier: 1,
  },
  openai: {
    color: 'from-emerald-500 to-teal-600',
    badge: 'GPT-4o & o3-mini',
    tier: 1,
  },
  deepseek: {
    color: 'from-blue-500 to-cyan-600',
    badge: 'DeepSeek V3 & R1',
    tier: 2,
  },
  mistral: {
    color: 'from-amber-400 to-orange-500',
    badge: 'Codestral & Mistral Large',
    tier: 2,
  },
  together: {
    color: 'from-teal-400 to-emerald-600',
    badge: 'Qwen 2.5 Coder',
    tier: 2,
  },
  openrouter: {
    color: 'from-purple-500 to-indigo-600',
    badge: '200+ Unified Models',
    tier: 2,
  },
  gemini: {
    color: 'from-sky-400 to-indigo-600',
    badge: 'Gemini 2.0 Flash (Free)',
    tier: 3,
  },
  groq: {
    color: 'from-orange-500 to-red-600',
    badge: '800 tok/s LPU (Free)',
    tier: 3,
  },
  custom: {
    color: 'from-slate-500 to-slate-700',
    badge: 'Ollama & Self-Hosted',
    tier: 3,
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

  const copyEnvToClipboard = () => {
    let content = `# 9Router Environment Variables for Vercel / Netlify\n\n`;
    if (gatewaySecret) content += `ROUTER_API_KEY="${gatewaySecret}"\n\n`;
    if (keys['anthropic']) content += `ANTHROPIC_API_KEY="${keys['anthropic']}"\n`;
    if (keys['openai']) content += `OPENAI_API_KEY="${keys['openai']}"\n`;
    if (keys['gemini']) content += `GEMINI_API_KEY="${keys['gemini']}"\n`;
    if (keys['deepseek']) content += `DEEPSEEK_API_KEY="${keys['deepseek']}"\n`;
    if (keys['groq']) content += `GROQ_API_KEY="${keys['groq']}"\n`;
    if (keys['openrouter']) content += `OPENROUTER_API_KEY="${keys['openrouter']}"\n`;
    if (keys['mistral']) content += `MISTRAL_API_KEY="${keys['mistral']}"\n`;
    if (keys['together']) content += `TOGETHER_API_KEY="${keys['together']}"\n`;

    navigator.clipboard.writeText(content);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const tiers = [
    {
      level: 1,
      title: 'Tier 1: Subscription Tier (Primary Frontier)',
      desc: 'High-reasoning models used first (Claude 3.7/3.5, GPT-4o). When rate limited (429), cascades to Tier 2.',
      badgeClass: 'text-orange-400 bg-orange-950/80 border-orange-800',
    },
    {
      level: 2,
      title: 'Tier 2: Cheap Tier (Pay-As-You-Go Backup)',
      desc: 'Cost-effective frontier alternatives (DeepSeek, Mistral, Together). Activated if Tier 1 runs out of quota.',
      badgeClass: 'text-cyan-400 bg-cyan-950/80 border-cyan-800',
    },
    {
      level: 3,
      title: 'Tier 3: Free / High-Throughput Tier (Safety Net)',
      desc: 'Free rate limits and ultra-fast inference (Gemini 2.0 Flash, Groq 800 tok/s). Guarantees zero coding downtime.',
      badgeClass: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
    },
  ];

  return (
    <div className="space-y-8 text-slate-200">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#30363d]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>3-Tier Provider Pool & API Keys</span>
          </h2>
          <p className="text-xs text-slate-400">
            Keys are saved in your local browser and automatically forwarded when calling the proxy.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={copyEnvToClipboard}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs font-mono font-semibold text-slate-200 border border-[#30363d] transition"
          >
            {copiedEnv ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied .env</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export .env</span>
              </>
            )}
          </button>
          <button
            onClick={onRefreshStatus}
            className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-slate-300 transition"
            title="Refresh Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Gateway Master Key Card */}
      <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-white flex items-center space-x-1.5">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>PROXY BEARER TOKEN (OPTIONAL PASSWORD)</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            Security
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Protects your proxy from unauthorized callers. When set, clients must pass this token in <code className="text-indigo-300">Authorization: Bearer</code>.
        </p>
        <input
          type="text"
          placeholder="e.g. sk-9router-secret-token"
          value={gatewaySecret}
          onChange={(e) => handleGatewaySecretChange(e.target.value)}
          className="w-full max-w-lg bg-[#0d1117] border border-[#30363d] focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-mono text-indigo-200 placeholder-slate-600 focus:outline-none"
        />
      </div>

      {/* 3 Tiers Layout */}
      {tiers.map((tierInfo) => {
        const tierProviders = DEFAULT_PROVIDERS.filter(
          (p) => PROVIDER_METADATA[p.id]?.tier === tierInfo.level
        );

        return (
          <div key={tierInfo.level} className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>{tierInfo.title}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.2 rounded border ${tierInfo.badgeClass}`}>
                    Tier {tierInfo.level}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{tierInfo.desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tierProviders.map((provider) => {
                const meta = PROVIDER_METADATA[provider.id];
                const isConfiguredEnv = Boolean(envConfigured[provider.id]);
                const currentKey = keys[provider.id] || '';
                const hasKey = Boolean(currentKey || isConfiguredEnv);
                const ping = pingResults[provider.id];

                return (
                  <div
                    key={provider.id}
                    className={`p-4 rounded-xl border transition ${
                      hasKey
                        ? 'bg-[#161b22] border-[#30363d]'
                        : 'bg-[#0d1117] border-[#21262d] opacity-80'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${meta.color} flex items-center justify-center font-bold text-xs text-white uppercase`}
                        >
                          {provider.id.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                            <span>{provider.name}</span>
                          </div>
                          <div className="text-[11px] text-cyan-400 font-mono">{meta.badge}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {isConfiguredEnv && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262d] text-cyan-300 border border-[#30363d]">
                            ENV
                          </span>
                        )}
                        {hasKey ? (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ready</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">Not set</span>
                        )}
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-2.5">
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
                                <EyeOff className="w-3 h-3" />
                                <span>Hide</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>Show</span>
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
                          className="w-full bg-[#0d1117] border border-[#30363d] focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                        />
                      </div>

                      {/* Ping Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#30363d]/60 text-xs">
                        <div className="font-mono text-[11px]">
                          {ping?.loading && (
                            <span className="text-cyan-400 flex items-center space-x-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Pinging...</span>
                            </span>
                          )}
                          {ping && !ping.loading && ping.success && (
                            <span className="text-emerald-400 font-bold flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{ping.latency}ms OK</span>
                            </span>
                          )}
                          {ping && !ping.loading && !ping.success && (
                            <span className="text-rose-400 flex items-center space-x-1" title={ping.error}>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Failed</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => testProviderPing(provider.id)}
                          disabled={ping?.loading || !hasKey}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] disabled:opacity-40 text-xs font-semibold text-slate-200 transition"
                        >
                          <Play className="w-3 h-3 text-cyan-400 fill-current" />
                          <span>Test Ping</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
