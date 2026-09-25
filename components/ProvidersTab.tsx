'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  Key,
  Play,
  Plus,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
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
  siliconflow: {
    color: 'from-blue-600 to-indigo-600',
    badge: 'SiliconCloud (V3/R1/Qwen)',
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
  perplexity: {
    color: 'from-teal-500 to-cyan-600',
    badge: 'Sonar Realtime Search',
    tier: 2,
  },
  openrouter: {
    color: 'from-purple-500 to-indigo-600',
    badge: '200+ Unified Models',
    tier: 2,
  },
  cloudflare: {
    color: 'from-orange-500 to-amber-600',
    badge: 'Workers AI (Free Tier 10k neurons)',
    tier: 3,
  },
  cerebras: {
    color: 'from-purple-500 to-pink-600',
    badge: '1,800 tok/s LPU (Free Tier)',
    tier: 3,
  },
  gemini: {
    color: 'from-sky-400 to-indigo-600',
    badge: 'Gemini 2.0 Flash (Free Tier)',
    tier: 3,
  },
  groq: {
    color: 'from-orange-500 to-red-600',
    badge: '800 tok/s LPU (Free Tier)',
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
  const [cfAccountId, setCfAccountId] = useState('');
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [customModelInputs, setCustomModelInputs] = useState<Record<string, string>>({});
  const [userCustomModels, setUserCustomModels] = useState<Record<string, string[]>>({});
  const [newModelInput, setNewModelInput] = useState<Record<string, string>>({});
  const [pingResults, setPingResults] = useState<
    Record<
      string,
      { loading?: boolean; success?: boolean; latency?: number; error?: string; status?: number | string }
    >
  >({});
  const [copiedEnv, setCopiedEnv] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('9router_cf_account_id');
      if (stored) setCfAccountId(stored);

      const storedModels = localStorage.getItem('9router_selected_models');
      if (storedModels) setSelectedModels(JSON.parse(storedModels));

      const storedCustom = localStorage.getItem('9router_custom_models');
      if (storedCustom) setCustomModelInputs(JSON.parse(storedCustom));

      const storedUserModels = localStorage.getItem('9router_user_models');
      if (storedUserModels) {
        try {
          setUserCustomModels(JSON.parse(storedUserModels));
        } catch {
          // ignore error
        }
      }
    }
  }, []);

  const handleCfAccountIdChange = (val: string) => {
    setCfAccountId(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('9router_cf_account_id', val);
    }
  };

  const handleModelSelect = (providerId: string, model: string) => {
    setSelectedModels((prev) => {
      const updated = { ...prev, [providerId]: model };
      if (typeof window !== 'undefined') {
        localStorage.setItem('9router_selected_models', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleCustomModelInputChange = (providerId: string, model: string) => {
    setCustomModelInputs((prev) => {
      const updated = { ...prev, [providerId]: model };
      if (typeof window !== 'undefined') {
        localStorage.setItem('9router_custom_models', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleAddCustomModel = (providerId: string) => {
    const raw = (newModelInput[providerId] || '').trim();
    if (!raw) return;

    setUserCustomModels((prev) => {
      const existing = prev[providerId] || [];
      if (existing.includes(raw)) return prev;
      const updated = { ...prev, [providerId]: [...existing, raw] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('9router_user_models', JSON.stringify(updated));
      }
      return updated;
    });

    handleModelSelect(providerId, raw);
    setNewModelInput((prev) => ({ ...prev, [providerId]: '' }));
  };

  const handleRemoveCustomModel = (providerId: string, modelName: string) => {
    setUserCustomModels((prev) => {
      const existing = prev[providerId] || [];
      const updated = {
        ...prev,
        [providerId]: existing.filter((m) => m !== modelName),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('9router_user_models', JSON.stringify(updated));
      }
      return updated;
    });

    if (selectedModels[providerId] === modelName) {
      const defaultModel = DEFAULT_PROVIDERS.find((p) => p.id === providerId)?.models[0] || '';
      handleModelSelect(providerId, defaultModel);
    }
  };

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

  const getEffectiveModel = (providerId: string) => {
    const sel = selectedModels[providerId];
    if (sel === 'custom') {
      return customModelInputs[providerId] || '';
    }
    return sel || DEFAULT_PROVIDERS.find((p) => p.id === providerId)?.models[0] || '';
  };

  const testProviderPing = async (providerId: ProviderId) => {
    setPingResults((prev) => ({
      ...prev,
      [providerId]: { loading: true },
    }));

    const modelToTest = getEffectiveModel(providerId);

    try {
      const res = await fetch('/api/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          apiKey: keys[providerId] || undefined,
          baseUrl: baseUrls[providerId] || undefined,
          accountId: providerId === 'cloudflare' ? cfAccountId : undefined,
          model: modelToTest || undefined,
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
    if (keys['cloudflare']) {
      content += `CLOUDFLARE_API_TOKEN="${keys['cloudflare']}"\n`;
      if (cfAccountId) content += `CLOUDFLARE_ACCOUNT_ID="${cfAccountId}"\n`;
    }
    if (keys['cerebras']) content += `CEREBRAS_API_KEY="${keys['cerebras']}"\n`;
    if (keys['siliconflow']) content += `SILICONFLOW_API_KEY="${keys['siliconflow']}"\n`;
    if (keys['perplexity']) content += `PERPLEXITY_API_KEY="${keys['perplexity']}"\n`;

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
      desc: 'Cost-effective frontier alternatives (DeepSeek, SiliconFlow, Mistral, Together, Perplexity).',
      badgeClass: 'text-cyan-400 bg-cyan-950/80 border-cyan-800',
    },
    {
      level: 3,
      title: 'Tier 3: Free & Edge High-Throughput Tier (Safety Net)',
      desc: 'Free rate limits & edge speeds (Cloudflare Workers AI, Google Gemini, Groq, Cerebras). Zero coding downtime!',
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
            <span>3-Tier Provider Pool & Model Selector (13+ Providers)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Pilih model spesifik untuk masing-masing provider (misal: DeepSeek Chat vs Reasoner, GPT-4o vs o3-mini).
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
                const meta = PROVIDER_METADATA[provider.id] || {
                  color: 'from-slate-600 to-slate-800',
                  badge: provider.name,
                  tier: 2,
                };
                const isConfiguredEnv = Boolean(envConfigured[provider.id]);
                const currentKey = keys[provider.id] || '';
                const hasKey = Boolean(currentKey || isConfiguredEnv);
                const ping = pingResults[provider.id];
                const activeModel = getEffectiveModel(provider.id);
                const isCustomSelected = selectedModels[provider.id] === 'custom';

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
                      {/* API Key */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                          <span>
                            {provider.id === 'cloudflare' ? 'Cloudflare API Token' : 'API Key'}
                          </span>
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
                              : `Enter ${provider.name} Key / Token`
                          }
                          value={currentKey}
                          onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                          className="w-full bg-[#0d1117] border border-[#30363d] focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                        />
                      </div>

                      {/* Extra Field for Cloudflare Account ID */}
                      {provider.id === 'cloudflare' && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Cloudflare Account ID
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. 8f6b89f3a54b38d9751e1882ff207b1c"
                            value={cfAccountId}
                            onChange={(e) => handleCfAccountIdChange(e.target.value)}
                            className="w-full bg-[#0d1117] border border-[#30363d] focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                          />
                        </div>
                      )}

                      {/* MODEL SELECTOR & MANAGER */}
                      <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Pilih Model {provider.name}:</span>
                          </span>
                          <span className="font-mono text-[10px] text-cyan-300 bg-[#161b22] px-2 py-0.5 rounded border border-cyan-800/60 truncate max-w-[170px] flex items-center space-x-1">
                            <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0 inline" />
                            <span>{activeModel || 'default'}</span>
                          </span>
                        </div>

                        {/* Quick Clickable Model Chips / Pills */}
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-0.5">
                          {[...provider.models, ...(userCustomModels[provider.id] || [])].map((m) => {
                            const isSelected = activeModel === m;
                            const isUserCustom = (userCustomModels[provider.id] || []).includes(m);
                            return (
                              <span
                                key={m}
                                onClick={() => handleModelSelect(provider.id, m)}
                                className={`cursor-pointer inline-flex items-center space-x-1 text-[11px] font-mono px-2 py-0.5 rounded border transition select-none ${
                                  isSelected
                                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 font-bold shadow-sm'
                                    : 'bg-[#161b22] text-slate-400 hover:text-slate-200 border-[#30363d] hover:border-slate-500'
                                }`}
                                title={`Klik untuk pilih model: ${m}`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                                <span>{m}</span>
                                {isUserCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveCustomModel(provider.id, m);
                                    }}
                                    className="ml-1 text-slate-500 hover:text-rose-400 font-bold px-0.5"
                                    title="Hapus model custom ini"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            );
                          })}
                        </div>

                        {/* Model Dropdown */}
                        <div className="flex items-center space-x-2">
                          <select
                            value={selectedModels[provider.id] || provider.models[0]}
                            onChange={(e) => handleModelSelect(provider.id, e.target.value)}
                            className="flex-1 bg-[#161b22] border border-[#30363d] focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                          >
                            <optgroup label="Model Bawaan">
                              {provider.models.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </optgroup>
                            {(userCustomModels[provider.id] || []).length > 0 && (
                              <optgroup label="Model Custom Anda">
                                {userCustomModels[provider.id].map((m) => (
                                  <option key={m} value={m}>
                                    ⭐ {m}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <option value="custom">✏️ + Ketik Custom Model Manual...</option>
                          </select>
                        </div>

                        {/* If custom is selected, show manual model input */}
                        {isCustomSelected && (
                          <input
                            type="text"
                            placeholder="Ketik nama model (misal: deepseek-coder-v2, gpt-4.5)..."
                            value={customModelInputs[provider.id] || ''}
                            onChange={(e) => handleCustomModelInputChange(provider.id, e.target.value)}
                            className="w-full bg-[#161b22] border border-cyan-500/60 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-200 placeholder-slate-600 focus:outline-none"
                          />
                        )}

                        {/* Quick Add Custom Model for this provider */}
                        <div className="flex items-center space-x-1.5 pt-1">
                          <input
                            type="text"
                            placeholder={`+ Tambah model baru (misal: deepseek-v4.1-flash)...`}
                            value={newModelInput[provider.id] || ''}
                            onChange={(e) =>
                              setNewModelInput((prev) => ({ ...prev, [provider.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomModel(provider.id);
                              }
                            }}
                            className="flex-1 bg-[#161b22] border border-[#30363d] focus:border-cyan-500 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddCustomModel(provider.id)}
                            className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-cyan-900/60 text-cyan-300 hover:text-cyan-200 border border-[#30363d] text-[11px] font-mono font-semibold flex items-center space-x-1 transition shrink-0"
                            title="Tambahkan model ke daftar provider ini"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah</span>
                          </button>
                        </div>
                      </div>

                      {/* Ping Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#30363d]/60 text-xs">
                        <div className="font-mono text-[11px]">
                          {ping?.loading && (
                            <span className="text-cyan-400 flex items-center space-x-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Testing {activeModel}...</span>
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
                              <span>Failed ({ping.status || 'Err'})</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => testProviderPing(provider.id)}
                          disabled={ping?.loading || !hasKey}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] disabled:opacity-40 text-xs font-semibold text-slate-200 transition"
                        >
                          <Play className="w-3 h-3 text-cyan-400 fill-current" />
                          <span>Test Model</span>
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
