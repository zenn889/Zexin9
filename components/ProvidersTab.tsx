'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Key,
  Lock,
  Play,
  RefreshCw,
  Server,
  Shield,
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
    Record<string, { loading?: boolean; success?: boolean; latency?: number; error?: string }>
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
    let content = `# 9Router Environment Variables for Vercel / Netlify\n\n`;
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

  return (
    <div className="space-y-8">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Key className="w-5 h-5 text-cyan-400" />
            <span>AI Providers & API Credentials</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Keys entered here are securely saved in your browser and automatically transmitted via header to your gateway.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={copyEnvToClipboard}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            {copiedEnv ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied .env!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy .env Config</span>
              </>
            )}
          </button>
          <button
            onClick={onRefreshStatus}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Environment Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gateway Master Key Security Card */}
      <div className="p-6 rounded-xl border border-indigo-900/60 bg-gradient-to-r from-indigo-950/30 to-slate-900/40">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Gateway Master API Key (Optional)</h3>
              <p className="text-xs text-slate-400">
                Protect your public Vercel/Netlify proxy URL so only authorized clients can use your router.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-2 max-w-xl">
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. sk-9router-supersecret-token"
              value={gatewaySecret}
              onChange={(e) => handleGatewaySecretChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm font-mono text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            If set, clients calling <code className="text-slate-400">/v1/chat/completions</code> must pass <code className="text-slate-400">Authorization: Bearer &lt;key&gt;</code>.
          </p>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DEFAULT_PROVIDERS.map((provider) => {
          const isConfiguredEnv = Boolean(envConfigured[provider.id]);
          const currentKey = keys[provider.id] || '';
          const hasKey = Boolean(currentKey || isConfiguredEnv);
          const ping = pingResults[provider.id];

          return (
            <div
              key={provider.id}
              className={`p-5 rounded-xl border transition ${
                hasKey
                  ? 'border-slate-800 bg-slate-900/50'
                  : 'border-slate-800/60 bg-slate-900/20'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-400 uppercase">
                    {provider.id.slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{provider.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Priority #{provider.priority}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isConfiguredEnv && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                      ENV Key Set
                    </span>
                  )}
                  {hasKey ? (
                    <span className="flex items-center space-x-1 text-[11px] text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">Unconfigured</span>
                  )}
                </div>
              </div>

              {/* API Key Input */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    API Key
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      placeholder={
                        isConfiguredEnv
                          ? 'Configured via Environment Variable'
                          : `Enter ${provider.name} Key`
                      }
                      value={currentKey}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 pr-16"
                    />
                    <div className="absolute right-2 flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => toggleShowKey(provider.id)}
                        className="text-slate-500 hover:text-slate-300 p-1"
                      >
                        {showKeys[provider.id] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Base URL (Customizable) */}
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Base URL (Override)
                  </label>
                  <input
                    type="text"
                    placeholder={provider.baseUrl}
                    value={baseUrls[provider.id] || ''}
                    onChange={(e) => handleBaseUrlChange(provider.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-400 placeholder-slate-700 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Actions & Ping Status */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-mono">
                    {ping?.loading && (
                      <span className="text-cyan-400 flex items-center space-x-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Pinging...</span>
                      </span>
                    )}
                    {ping && !ping.loading && ping.success && (
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ping OK ({ping.latency}ms)</span>
                      </span>
                    )}
                    {ping && !ping.loading && !ping.success && (
                      <span className="text-rose-400 flex items-center space-x-1" title={ping.error}>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Failed ({ping.latency || 0}ms)</span>
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => testProviderPing(provider.id)}
                    disabled={ping?.loading || !hasKey}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-300 transition"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
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
}
