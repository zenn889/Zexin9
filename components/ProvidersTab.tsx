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
  Layers,
  Power,
  Server,
  AlertCircle,
  Users,
  Tag,
  CheckCheck,
} from 'lucide-react';
import { DEFAULT_PROVIDERS } from '@/lib/config';
import { ProviderId, CloudflareAccount, ProviderAccount } from '@/lib/types';

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

interface PingResult {
  loading?: boolean;
  success?: boolean;
  latency?: number;
  error?: string;
  status?: number | string;
  model?: string;
  tried?: string[];
  modelsFound?: string[];
  hint?: string;
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
  const [cfAccountId, setCfAccountId] = useState('');
  const [cfAccounts, setCfAccounts] = useState<CloudflareAccount[]>([]);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountId, setNewAccountId] = useState('');
  const [newAccountToken, setNewAccountToken] = useState('');
  const [showNewToken, setShowNewToken] = useState(false);
  const [isAddingCfAccount, setIsAddingCfAccount] = useState(false);
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);
  const [accountPingResults, setAccountPingResults] = useState<
    Record<string, PingResult>
  >({});

  // 9Router Universal Multi-Account Connections State
  const [providerAccounts, setProviderAccounts] = useState<ProviderAccount[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccProvider, setNewAccProvider] = useState<ProviderId>('deepseek');
  const [newAccName, setNewAccName] = useState('');
  const [newAccKey, setNewAccKey] = useState('');
  const [newAccAccountId, setNewAccAccountId] = useState('');
  const [newAccBaseUrl, setNewAccBaseUrl] = useState('');
  const [showNewAccKey, setShowNewAccKey] = useState(false);
  const [selectedFilterProvider, setSelectedFilterProvider] = useState<string>('all');
  const [testingAccId, setTestingAccId] = useState<string | null>(null);
  const [accPingResults, setAccPingResults] = useState<
    Record<string, PingResult>
  >({});

  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [customModelInputs, setCustomModelInputs] = useState<Record<string, string>>({});
  const [userCustomModels, setUserCustomModels] = useState<Record<string, string[]>>({});
  const [newModelInput, setNewModelInput] = useState<Record<string, string>>({});
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [savingAllKeys, setSavingAllKeys] = useState(false);
  const [saveAllMsg, setSaveAllMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('zexin9_cf_account_id') || localStorage.getItem('9router_cf_account_id');
      if (stored) setCfAccountId(stored);

      const storedCfAccounts =
        localStorage.getItem('zexin9_cf_accounts') || localStorage.getItem('9router_cf_accounts');
      if (storedCfAccounts) {
        try {
          const parsed = JSON.parse(storedCfAccounts);
          if (Array.isArray(parsed)) setCfAccounts(parsed);
        } catch {
          // ignore
        }
      }

      const storedProvAccounts =
        localStorage.getItem('zexin9_provider_accounts') ||
        localStorage.getItem('9router_provider_accounts');
      if (storedProvAccounts) {
        try {
          const parsed = JSON.parse(storedProvAccounts);
          if (Array.isArray(parsed)) setProviderAccounts(parsed);
        } catch {
          // ignore
        }
      }

      const storedModels = localStorage.getItem('zexin9_selected_models') || localStorage.getItem('9router_selected_models');
      if (storedModels) setSelectedModels(JSON.parse(storedModels));

      const storedCustom = localStorage.getItem('zexin9_custom_models') || localStorage.getItem('9router_custom_models');
      if (storedCustom) setCustomModelInputs(JSON.parse(storedCustom));

      const storedUserModels = localStorage.getItem('zexin9_user_models') || localStorage.getItem('9router_user_models');
      if (storedUserModels) {
        try {
          setUserCustomModels(JSON.parse(storedUserModels));
        } catch {
          // ignore error
        }
      }
    }

    // 2. Load from Cloud Database / Server Store
    fetch('/api/providers/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.keys) {
          setKeys((prev) => ({ ...data.keys, ...prev }));
        }
        if (data.baseUrls) {
          setBaseUrls((prev) => ({ ...data.baseUrls, ...prev }));
        }
        if (data.cfAccountId) {
          setCfAccountId((prev) => prev || data.cfAccountId);
        }
        if (Array.isArray(data.cfAccounts) && data.cfAccounts.length > 0) {
          setCfAccounts(data.cfAccounts);
        }
        if (Array.isArray(data.providerAccounts) && data.providerAccounts.length > 0) {
          setProviderAccounts(data.providerAccounts);
        }
      })
      .catch(() => {});
  }, []);

  const saveCfAccountsLocalAndSync = (updated: CloudflareAccount[]) => {
    setCfAccounts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zexin9_cf_accounts', JSON.stringify(updated));
    }
    // Auto sync with server database
    fetch('/api/providers/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keys,
        baseUrls,
        cfAccountId,
        cfAccounts: updated,
        providerAccounts,
      }),
    }).catch(() => {});
  };

  const handleAddCfAccount = () => {
    if (!newAccountId.trim() || !newAccountToken.trim()) return;

    const newAcc: CloudflareAccount = {
      id: `cf-${Date.now()}`,
      name: newAccountName.trim() || `Akun CF #${cfAccounts.length + 1}`,
      accountId: newAccountId.trim(),
      apiToken: newAccountToken.trim(),
      enabled: true,
      lastTested: new Date().toISOString(),
    };

    const updated = [...cfAccounts, newAcc];
    saveCfAccountsLocalAndSync(updated);

    if (!keys['cloudflare']) {
      handleKeyChange('cloudflare', newAcc.apiToken);
    }
    if (!cfAccountId) {
      handleCfAccountIdChange(newAcc.accountId);
    }

    setNewAccountName('');
    setNewAccountId('');
    setNewAccountToken('');
    setIsAddingCfAccount(false);
  };

  const handleToggleCfAccount = (id: string) => {
    const updated = cfAccounts.map((acc) =>
      acc.id === id ? { ...acc, enabled: !acc.enabled } : acc
    );
    saveCfAccountsLocalAndSync(updated);
  };

  const handleDeleteCfAccount = (id: string) => {
    const updated = cfAccounts.filter((acc) => acc.id !== id);
    saveCfAccountsLocalAndSync(updated);
  };

  const handleTestCfAccount = async (acc: CloudflareAccount) => {
    setAccountPingResults((prev) => ({
      ...prev,
      [acc.id]: { loading: true },
    }));

    try {
      const res = await fetch('/api/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'cloudflare',
          apiKey: acc.apiToken,
          accountId: acc.accountId,
        }),
      });
      const data = await res.json();
      setAccountPingResults((prev) => ({
        ...prev,
        [acc.id]: {
          loading: false,
          success: data.success,
          latency: data.latency,
          error: data.error,
        },
      }));
    } catch (err: any) {
      setAccountPingResults((prev) => ({
        ...prev,
        [acc.id]: {
          loading: false,
          success: false,
          error: err.message || 'Gagal terhubung',
        },
      }));
    }
  };

  // --- 9Router Universal Connections Pool Handlers ---
  const saveProviderAccountsLocalAndSync = (updated: ProviderAccount[]) => {
    setProviderAccounts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zexin9_provider_accounts', JSON.stringify(updated));
    }
    // Auto sync with server database
    fetch('/api/providers/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keys,
        baseUrls,
        cfAccountId,
        cfAccounts,
        providerAccounts: updated,
      }),
    }).catch(() => {});
  };

  const handleAddAccount = () => {
    if (!newAccKey.trim()) return;

    const newAcc: ProviderAccount = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      provider: newAccProvider,
      name:
        newAccName.trim() ||
        `${DEFAULT_PROVIDERS.find((p) => p.id === newAccProvider)?.name || newAccProvider} #${
          providerAccounts.filter((a) => a.provider === newAccProvider).length + 1
        }`,
      apiKey: newAccKey.trim(),
      accountId: newAccAccountId.trim() || undefined,
      baseUrl: newAccBaseUrl.trim() || undefined,
      enabled: true,
      lastTested: new Date().toISOString(),
    };

    const updated = [...providerAccounts, newAcc];
    saveProviderAccountsLocalAndSync(updated);

    // If single inputs were empty, populate for backward compatibility
    if (!keys[newAccProvider]) {
      handleKeyChange(newAccProvider, newAcc.apiKey);
    }
    if (newAccProvider === 'cloudflare' && newAcc.accountId && !cfAccountId) {
      handleCfAccountIdChange(newAcc.accountId);
    }

    setNewAccName('');
    setNewAccKey('');
    setNewAccAccountId('');
    setNewAccBaseUrl('');
    setIsAddingAccount(false);
  };

  const handleToggleAccount = (id: string) => {
    const updated = providerAccounts.map((acc) =>
      acc.id === id ? { ...acc, enabled: !acc.enabled } : acc
    );
    saveProviderAccountsLocalAndSync(updated);
  };

  const handleDeleteAccount = (id: string) => {
    const updated = providerAccounts.filter((acc) => acc.id !== id);
    saveProviderAccountsLocalAndSync(updated);
  };

  const handleTestAccount = async (acc: ProviderAccount) => {
    setAccPingResults((prev) => ({
      ...prev,
      [acc.id]: { loading: true },
    }));

    try {
      const res = await fetch('/api/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: acc.provider,
          apiKey: acc.apiKey,
          accountId: acc.accountId,
          baseUrl: acc.baseUrl,
        }),
      });
      const data = await res.json();
      if (data?.success && data?.model) {
        rememberDiscoveredModel(acc.provider, data.model);
      }
      setAccPingResults((prev) => ({
        ...prev,
        [acc.id]: {
          loading: false,
          success: data.success,
          latency: data.latency,
          error: data.error,
          status: data.status,
          model: data.model,
          tried: data.tried,
          modelsFound: data.modelsFound,
          hint: data.hint,
        },
      }));
    } catch (err: any) {
      setAccPingResults((prev) => ({
        ...prev,
        [acc.id]: {
          loading: false,
          success: false,
          error: err.message || 'Gagal terhubung',
        },
      }));
    }
  };

  const handleSaveAllToCloud = async () => {
    setSavingAllKeys(true);
    setSaveAllMsg(null);
    try {
      const res = await fetch('/api/providers/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keys,
          baseUrls,
          cfAccountId,
          cfAccounts,
          providerAccounts,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveAllMsg(`✓ ${data.message}`);
        setTimeout(() => setSaveAllMsg(null), 4000);
        onRefreshStatus();
      }
    } catch (err: any) {
      setSaveAllMsg(`Gagal menyimpan: ${err?.message || 'Error'}`);
    } finally {
      setSavingAllKeys(false);
    }
  };

  const handleCfAccountIdChange = (val: string) => {
    setCfAccountId(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zexin9_cf_account_id', val);
      localStorage.setItem('9router_cf_account_id', val);
    }
  };

  const handleModelSelect = (providerId: string, model: string) => {
    setSelectedModels((prev) => {
      const updated = { ...prev, [providerId]: model };
      if (typeof window !== 'undefined') {
        localStorage.setItem('zexin9_selected_models', JSON.stringify(updated));
        localStorage.setItem('9router_selected_models', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleCustomModelInputChange = (providerId: string, model: string) => {
    setCustomModelInputs((prev) => {
      const updated = { ...prev, [providerId]: model };
      if (typeof window !== 'undefined') {
        localStorage.setItem('zexin9_custom_models', JSON.stringify(updated));
        localStorage.setItem('9router_custom_models', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Adds a model discovered from the endpoint's /models list to the custom-model
  // chips for this provider, so the user can pick it later.
  const rememberDiscoveredModel = (providerId: string, model: string) => {
    if (!model) return;
    setUserCustomModels((prev) => {
      const existing = prev[providerId] || [];
      if (existing.includes(model)) return prev;
      const updated = { ...prev, [providerId]: [...existing, model] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('zexin9_user_models', JSON.stringify(updated));
        localStorage.setItem('9router_user_models', JSON.stringify(updated));
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
        localStorage.setItem('zexin9_user_models', JSON.stringify(updated));
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
        localStorage.setItem('zexin9_user_models', JSON.stringify(updated));
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
        localStorage.setItem('zexin9_keys', JSON.stringify(updated));
        localStorage.setItem('9router_keys', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleBaseUrlChange = (providerId: string, value: string) => {
    setBaseUrls((prev) => {
      const updated = { ...prev, [providerId]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem('zexin9_baseurls', JSON.stringify(updated));
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
    if (providerId === 'custom') {
      // Never fall back to the Ollama-style default list for custom providers —
      // leave it empty so the server auto-detects a model from /models.
      if (sel && sel !== 'custom') return sel;
      return customModelInputs[providerId] || '';
    }
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
      if (providerId === 'custom' && data?.success && data?.model) {
        rememberDiscoveredModel(providerId, data.model);
        if (!modelToTest || modelToTest === data.model) {
          handleModelSelect(providerId, data.model);
        }
      }
      setPingResults((prev) => ({
        ...prev,
        [providerId]: {
          loading: false,
          success: data.success,
          latency: data.latency,
          error: data.error,
          status: data.status,
          model: data.model,
          tried: data.tried,
          modelsFound: data.modelsFound,
          hint: data.hint,
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
    let content = `# Zexin9 Environment Variables for Vercel / Netlify\n\n`;
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
      badgeClass: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    },
    {
      level: 2,
      title: 'Tier 2: Cheap Tier (Pay-As-You-Go Backup)',
      desc: 'Cost-effective frontier alternatives (DeepSeek, SiliconFlow, Mistral, Together, Perplexity).',
      badgeClass: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      level: 3,
      title: 'Tier 3: Free & Edge High-Throughput Tier (Safety Net)',
      desc: 'Free rate limits & edge speeds (Cloudflare Workers AI, Google Gemini, Groq, Cerebras). Zero coding downtime!',
      badgeClass: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  const configuredProvidersCount = DEFAULT_PROVIDERS.filter(
    (p) => Boolean(keys[p.id]?.trim()) || Boolean(envConfigured[p.id])
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8 text-slate-200">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>3-Tier Provider Pool & Model Selector (13+ Providers)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pilih model spesifik untuk masing-masing provider (misal: DeepSeek Chat vs Reasoner, GPT-4o vs o3-mini).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={copyEnvToClipboard}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-xs font-mono font-medium text-slate-200 border border-white/[0.08] transition active:scale-95"
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
            className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-slate-300 transition active:scale-95"
            title="Refresh Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Multi-Provider Pool Status & Cloud Save Banner */}
      <div className="pro-card p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                configuredProvidersCount > 0
                  ? 'bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse'
                  : 'bg-slate-600'
              }`}
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center space-x-2">
                <span>Multi-Provider Active Pool:</span>
                <span className="text-cyan-300 font-mono">
                  {configuredProvidersCount} Provider Aktif Sekaligus
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {configuredProvidersCount > 0
                  ? `Siap auto-failover & balancing: ${DEFAULT_PROVIDERS.filter(
                      (p) => Boolean(keys[p.id]?.trim()) || Boolean(envConfigured[p.id])
                    )
                      .map((p) => p.name)
                      .join(', ')}`
                  : 'Masukkan API key provider di bawah, lalu klik "Simpan Semua Keys" untuk mengaktifkan pool multi-provider!'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveAllToCloud}
            disabled={savingAllKeys}
            className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition disabled:opacity-50 flex items-center space-x-1.5 active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{savingAllKeys ? 'Menyimpan ke Cloud...' : 'Simpan Semua Keys ke Cloud DB'}</span>
          </button>
        </div>

        {saveAllMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveAllMsg}</span>
          </div>
        )}
      </div>

      {/* Gateway Master Key Card */}
      <div className="pro-card p-4 sm:p-5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-white flex items-center space-x-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>PROXY BEARER TOKEN (OPTIONAL PASSWORD GATEWAY)</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
            Security Gate
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Protects your proxy from unauthorized callers. When set, clients must pass this token in <code className="text-cyan-300">Authorization: Bearer</code>.
        </p>
        <input
          type="text"
          placeholder="e.g. sk-zx9-master-token"
          value={gatewaySecret}
          onChange={(e) => handleGatewaySecretChange(e.target.value)}
          className="input-pro w-full max-w-lg"
        />
      </div>

      {/* 9Router Universal Connections & Multi-Account Manager */}
      <div className="pro-card p-5 sm:p-6 space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0 border border-white/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">
                  9Router Multi-Account Connections Pool
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                  {providerAccounts.filter((a) => a.enabled).length} Akun Aktif
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.06] font-medium">
                  {new Set(providerAccounts.map((a) => a.provider)).size} Provider Terhubung
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Koneksikan banyak akun/API key untuk DeepSeek, Gemini, Groq, Cloudflare, OpenAI, dll. Rotasi beban otomatis (round-robin) & failover seketika jika ada akun yang limit (429) atau kehabisan saldo!
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsAddingAccount(!isAddingAccount)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Hubungkan Akun Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <button
            type="button"
            onClick={() => setSelectedFilterProvider('all')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition active:scale-95 ${
              selectedFilterProvider === 'all'
                ? 'bg-white/[0.1] text-white font-semibold border border-white/[0.12] shadow-sm'
                : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/[0.06]'
            }`}
          >
            Semua Akun ({providerAccounts.length})
          </button>
          {DEFAULT_PROVIDERS.map((p) => {
            const count = providerAccounts.filter((a) => a.provider === p.id).length;
            if (count === 0) return null;
            const isSelected = selectedFilterProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedFilterProvider(p.id)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition flex items-center space-x-1.5 active:scale-95 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm'
                    : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/[0.06]'
                }`}
              >
                <span>{p.name.split(' ')[0]}</span>
                <span className="text-[10px] opacity-75 font-bold">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Add Connection Inline Form */}
        {isAddingAccount && (
          <div className="p-4 sm:p-5 rounded-xl bg-black/50 border border-cyan-500/30 space-y-3.5 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Hubungkan Akun / Connection Baru</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingAccount(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-white/[0.06]"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Select Provider */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Pilih Provider AI <span className="text-rose-400">*</span>
                </label>
                <select
                  value={newAccProvider}
                  onChange={(e) => setNewAccProvider(e.target.value as ProviderId)}
                  className="input-pro w-full"
                >
                  {DEFAULT_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Label / Name */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Label / Nama Akun (misal: "DeepSeek Pribadi 2", "Gemini Backup")
                </label>
                <input
                  type="text"
                  placeholder="e.g. Akun Utama 1"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="input-pro w-full"
                />
              </div>

              {/* API Key */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-400">
                    API Key / Token <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewAccKey(!showNewAccKey)}
                    className="text-[10px] text-slate-400 hover:text-slate-200"
                  >
                    {showNewAccKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showNewAccKey ? 'text' : 'password'}
                  placeholder="Masukkan API key untuk akun ini"
                  value={newAccKey}
                  onChange={(e) => setNewAccKey(e.target.value)}
                  className="input-pro w-full"
                />
              </div>

              {/* Cloudflare Account ID (if provider is cloudflare) */}
              {newAccProvider === 'cloudflare' && (
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Cloudflare Account ID (32-karakter hex) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 8f6b89f3a54b38d9751e1882ff207b1c"
                    value={newAccAccountId}
                    onChange={(e) => setNewAccAccountId(e.target.value)}
                    className="input-pro w-full"
                  />
                </div>
              )}

              {/* Custom Base URL (if custom) */}
              {newAccProvider === 'custom' && (
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Endpoint Base URL (Ollama / Localhost / vLLM)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. http://localhost:11434/v1"
                    value={newAccBaseUrl}
                    onChange={(e) => setNewAccBaseUrl(e.target.value)}
                    className="input-pro w-full"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsAddingAccount(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!newAccKey.trim()}
                onClick={handleAddAccount}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition disabled:opacity-40"
              >
                + Hubungkan Akun
              </button>
            </div>
          </div>
        )}

        {/* Connected Accounts Cards List */}
        <div className="space-y-2.5">
          {providerAccounts.filter(
            (a) => selectedFilterProvider === 'all' || a.provider === selectedFilterProvider
          ).length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-white/[0.08] bg-black/20">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">
                Belum ada akun terhubung untuk {selectedFilterProvider === 'all' ? 'kategori ini' : selectedFilterProvider}.
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Klik tombol <strong>+ Hubungkan Akun Baru</strong> di atas untuk menyambungkan akun DeepSeek, Gemini, Groq, atau Cloudflare tambahan milikmu!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {providerAccounts
                .filter(
                  (a) => selectedFilterProvider === 'all' || a.provider === selectedFilterProvider
                )
                .map((acc, idx) => {
                  const meta = PROVIDER_METADATA[acc.provider] || {
                    color: 'from-slate-600 to-slate-800',
                    badge: acc.provider,
                  };
                  const ping = accPingResults[acc.id];
                  const isEnabled = acc.enabled !== false;

                  return (
                    <div
                      key={acc.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                        isEnabled
                          ? 'bg-black/40 border-white/[0.08] hover:border-cyan-500/40'
                          : 'bg-black/20 border-white/[0.04] opacity-60'
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${meta.color} flex items-center justify-center font-bold text-[10px] text-white uppercase shrink-0`}
                            >
                              {acc.provider.slice(0, 2)}
                            </div>
                            <span className="text-xs font-bold text-white truncate max-w-[130px]">
                              {acc.name || `Akun #${idx + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isEnabled
                                  ? acc.lastStatus === 'rate_limited'
                                    ? 'bg-amber-400 animate-pulse'
                                    : 'bg-emerald-400 animate-pulse'
                                  : 'bg-slate-600'
                              }`}
                              title={isEnabled ? 'Akun Aktif' : 'Nonaktif'}
                            />
                            <button
                              type="button"
                              onClick={() => handleToggleAccount(acc.id)}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition ${
                                isEnabled
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 font-medium'
                                  : 'bg-white/[0.04] text-slate-400 border-white/[0.06]'
                              }`}
                            >
                              {isEnabled ? 'ON' : 'OFF'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                              title="Hapus akun"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1 text-[11px] font-mono text-slate-400 mb-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Provider:</span>
                            <span className="text-cyan-300 uppercase text-[10px] font-semibold">{acc.provider}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">API Key:</span>
                            <span className="truncate max-w-[140px] text-slate-300">
                              ••••••••{acc.apiKey ? acc.apiKey.slice(-4) : ''}
                            </span>
                          </div>
                          {acc.accountId && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Account ID:</span>
                              <span className="truncate max-w-[140px] text-slate-300">
                                {acc.accountId.slice(0, 6)}...{acc.accountId.slice(-4)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ping Footer & Test */}
                      <div className="pt-2 border-t border-white/[0.06]">
                        {ping && (
                          <div
                            className={`mb-2 text-[10px] font-mono p-1.5 rounded-lg border ${
                              ping.success
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                            }`}
                          >
                            <div className="break-all whitespace-pre-wrap">
                              {ping.success
                                ? `✓ Siap (${ping.latency}ms)${ping.model ? ` · ${ping.model}` : ''}`
                                : `✗ ${ping.error?.slice(0, 200) || 'Error'}`}
                            </div>
                            {!ping.success && (ping.modelsFound?.length || 0) > 0 && (
                              <div className="mt-0.5 text-amber-300/90 break-all">
                                Model tersedia: {ping.modelsFound!.slice(0, 5).join(', ')}
                                {ping.modelsFound!.length > 5
                                  ? ` (+${ping.modelsFound!.length - 5} lagi)`
                                  : ''}
                              </div>
                            )}
                            {!ping.success && ping.hint && (
                              <div className="mt-0.5 text-slate-400 break-words">{ping.hint}</div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">
                            {acc.lastStatus === 'rate_limited' ? (
                              <span className="text-amber-400">Rate Limited</span>
                            ) : isEnabled ? (
                              <span className="text-emerald-400">Siap Routing</span>
                            ) : (
                              'Disabled'
                            )}
                          </span>
                          <button
                            type="button"
                            disabled={ping?.loading}
                            onClick={() => handleTestAccount(acc)}
                            className="px-2.5 py-1 text-[10px] font-mono rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-cyan-300 border border-white/[0.08] flex items-center space-x-1 transition disabled:opacity-50"
                          >
                            {ping?.loading ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Play className="w-2.5 h-2.5" />
                            )}
                            <span>Ping</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* 3 Tiers Layout */}
      {tiers.map((tierInfo) => {
        const tierProviders = DEFAULT_PROVIDERS.filter(
          (p) => PROVIDER_METADATA[p.id]?.tier === tierInfo.level
        );

        return (
          <div key={tierInfo.level} className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>{tierInfo.title}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${tierInfo.badgeClass}`}>
                    Tier {tierInfo.level}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{tierInfo.desc}</p>
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
                    className={`pro-card p-4 sm:p-5 transition ${
                      hasKey ? '' : 'opacity-85'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${meta.color} flex items-center justify-center font-bold text-xs text-white uppercase shadow-md`}
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
                        {providerAccounts.filter((a) => a.provider === provider.id && a.enabled).length > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                            {providerAccounts.filter((a) => a.provider === provider.id && a.enabled).length} Akun
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setNewAccProvider(provider.id);
                            setIsAddingAccount(true);
                            if (typeof window !== 'undefined') {
                              window.scrollTo({ top: 380, behavior: 'smooth' });
                            }
                          }}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 border border-white/[0.08] transition flex items-center space-x-1"
                          title="Hubungkan akun baru ke provider ini"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Akun</span>
                        </button>
                        {isConfiguredEnv && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-cyan-300 border border-white/[0.08]">
                            ENV
                          </span>
                        )}
                        {hasKey ? (
                          <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ready</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">Not set</span>
                        )}
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3">
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
                          className="input-pro w-full"
                        />
                        {provider.id !== 'cloudflare' && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            💡 Mendukung multi-key (pisahkan dengan koma atau baris baru) untuk failover otomatis.
                          </p>
                        )}
                      </div>

                      {/* Cloudflare Multi-Account Pool Manager */}
                      {provider.id === 'cloudflare' && (
                        <div className="p-3.5 rounded-xl bg-black/40 border border-amber-500/20 space-y-3 mt-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
                                <Layers className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-white block">
                                  Multi-Account Cloudflare Pool
                                </span>
                                <span className="text-[10px] text-amber-300 font-mono">
                                  {cfAccounts.filter((a) => a.enabled !== false).length} Akun Aktif •{' '}
                                  {(
                                    cfAccounts.filter((a) => a.enabled !== false).length * 10000
                                  ).toLocaleString()}{' '}
                                  Neurons Gratis/Hari
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsAddingCfAccount(!isAddingCfAccount)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center space-x-1 transition"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tambah Akun</span>
                            </button>
                          </div>

                          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                            💡 <strong>Auto-Failover Kuota:</strong> Setiap akun Cloudflare dapat 10.000 neuron gratis per hari. Sambungkan beberapa akun Cloudflare kamu di sini — Zexin9 akan otomatis merotasi (round-robin) dan beralih otomatis ke akun berikutnya jika suatu akun terkena limit 429 atau kuotanya habis!
                          </div>

                          {/* Accounts List */}
                          <div className="space-y-2">
                            {cfAccounts.length === 0 ? (
                              <div className="text-center py-2.5 text-xs text-slate-500 border border-dashed border-white/[0.08] rounded-xl">
                                Belum ada akun terdaftar di pool. Klik <strong>Tambah Akun</strong> di atas untuk menyambungkan akun Cloudflare pertamamu!
                              </div>
                            ) : (
                              cfAccounts.map((acc, idx) => {
                                const isEnabled = acc.enabled !== false;
                                const ping = accountPingResults[acc.id];
                                return (
                                  <div
                                    key={acc.id}
                                    className={`p-2.5 rounded-xl border transition ${
                                      isEnabled
                                        ? 'bg-black/30 border-white/[0.08]'
                                        : 'bg-black/10 border-white/[0.04] opacity-60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center space-x-2">
                                        <span
                                          className={`w-2 h-2 rounded-full ${
                                            isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                          }`}
                                        />
                                        <span className="text-xs font-semibold text-slate-200">
                                          {acc.name || `Akun #${idx + 1}`}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-1.5">
                                        {/* Ping Test Button */}
                                        <button
                                          type="button"
                                          disabled={ping?.loading}
                                          onClick={() => handleTestCfAccount(acc)}
                                          className="px-2 py-0.5 text-[10px] font-mono rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-cyan-300 border border-white/[0.08] flex items-center space-x-1 transition disabled:opacity-50"
                                        >
                                          {ping?.loading ? (
                                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                          ) : (
                                            <Play className="w-2.5 h-2.5" />
                                          )}
                                          <span>Test Ping</span>
                                        </button>

                                        {/* Toggle Active */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleCfAccount(acc.id)}
                                          className={`px-2 py-0.5 text-[10px] font-mono rounded-lg border transition ${
                                            isEnabled
                                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 font-medium'
                                              : 'bg-white/[0.04] text-slate-400 border-white/[0.06]'
                                          }`}
                                        >
                                          {isEnabled ? 'Aktif' : 'Nonaktif'}
                                        </button>

                                        {/* Delete */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCfAccount(acc.id)}
                                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                                          title="Hapus akun dari pool"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Account ID & Token preview */}
                                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                      <span className="truncate max-w-[180px]">
                                        ID: {acc.accountId ? `${acc.accountId.slice(0, 6)}...${acc.accountId.slice(-4)}` : 'none'}
                                      </span>
                                      <span className="truncate max-w-[120px]">
                                        Token: ••••••••{acc.apiToken ? acc.apiToken.slice(-4) : ''}
                                      </span>
                                    </div>

                                    {/* Ping Result Banner */}
                                    {ping && (
                                      <div
                                        className={`mt-2 text-[10px] font-mono p-1.5 rounded-lg border flex items-center justify-between ${
                                          ping.success
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                                        }`}
                                      >
                                        <span>
                                          {ping.success
                                            ? `✓ Terkoneksi (${ping.latency}ms) - Kuota Siap`
                                            : `✗ Error: ${ping.error || 'Gagal terhubung'}`}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Add Account Inline Form */}
                          {isAddingCfAccount && (
                            <div className="p-3 rounded-xl bg-black/50 border border-amber-500/30 space-y-2.5 mt-2 animate-in fade-in">
                              <div className="text-xs font-bold text-white flex items-center justify-between">
                                <span>+ Tambah Akun Cloudflare Baru</span>
                                <button
                                  type="button"
                                  onClick={() => setIsAddingCfAccount(false)}
                                  className="text-slate-400 hover:text-white text-xs"
                                >
                                  ✕
                                </button>
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                                  Label / Nama Akun (Opsional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Akun CF Cadangan 1"
                                  value={newAccountName}
                                  onChange={(e) => setNewAccountName(e.target.value)}
                                  className="input-pro w-full"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                                  Cloudflare Account ID <span className="text-rose-400">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. 8f6b89f3a54b38d9751e1882ff207b1c"
                                  value={newAccountId}
                                  onChange={(e) => setNewAccountId(e.target.value)}
                                  className="input-pro w-full"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="text-[10px] font-semibold text-slate-400">
                                    Cloudflare API Token <span className="text-rose-400">*</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setShowNewToken(!showNewToken)}
                                    className="text-[10px] text-slate-400 hover:text-slate-200"
                                  >
                                    {showNewToken ? 'Hide' : 'Show'}
                                  </button>
                                </div>
                                <input
                                  type={showNewToken ? 'text' : 'password'}
                                  placeholder="Workers AI Read/Edit Token"
                                  value={newAccountToken}
                                  onChange={(e) => setNewAccountToken(e.target.value)}
                                  className="input-pro w-full"
                                />
                              </div>

                              <div className="flex justify-end space-x-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setIsAddingCfAccount(false)}
                                  className="px-3 py-1 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  disabled={!newAccountId.trim() || !newAccountToken.trim()}
                                  onClick={handleAddCfAccount}
                                  className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition disabled:opacity-40"
                                >
                                  + Tambahkan ke Pool
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Quick / Single Account ID input for fallback */}
                          <div className="pt-2 border-t border-white/[0.06]">
                            <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Default Cloudflare Account ID (Utama)
                            </span>
                            <input
                              type="text"
                              placeholder="e.g. 8f6b89f3a54b38d9751e1882ff207b1c"
                              value={cfAccountId}
                              onChange={(e) => handleCfAccountIdChange(e.target.value)}
                              className="input-pro w-full"
                            />
                          </div>
                        </div>
                      )}

                      {/* MODEL SELECTOR & MANAGER */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] space-y-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Pilih Model {provider.name}:</span>
                          </span>
                          <span className="font-mono text-[10px] text-cyan-300 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.08] truncate max-w-[170px] flex items-center space-x-1">
                            <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0 inline" />
                            <span>{activeModel || 'default'}</span>
                          </span>
                        </div>

                        {/* Quick Clickable Model Chips / Pills */}
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-0.5 no-scrollbar">
                          {[...provider.models, ...(userCustomModels[provider.id] || [])].map((m) => {
                            const isSelected = activeModel === m;
                            const isUserCustom = (userCustomModels[provider.id] || []).includes(m);
                            return (
                              <span
                                key={m}
                                onClick={() => handleModelSelect(provider.id, m)}
                                className={`cursor-pointer inline-flex items-center space-x-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border transition select-none ${
                                  isSelected
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold shadow-sm'
                                    : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border-white/[0.06] hover:border-white/[0.12]'
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
                            className="flex-1 input-pro"
                          >
                            <optgroup label="Model Bawaan" className="bg-slate-900 text-white">
                              {provider.models.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </optgroup>
                            {(userCustomModels[provider.id] || []).length > 0 && (
                              <optgroup label="Model Custom Anda" className="bg-slate-900 text-cyan-300">
                                {userCustomModels[provider.id].map((m) => (
                                  <option key={m} value={m}>
                                    ⭐ {m}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <option value="custom" className="bg-slate-900 text-amber-300">✏️ + Ketik Custom Model Manual...</option>
                          </select>
                        </div>

                        {/* If custom is selected, show manual model input */}
                        {isCustomSelected && (
                          <input
                            type="text"
                            placeholder="Ketik nama model (misal: deepseek-coder-v2, gpt-4.5)..."
                            value={customModelInputs[provider.id] || ''}
                            onChange={(e) => handleCustomModelInputChange(provider.id, e.target.value)}
                            className="w-full input-pro"
                          />
                        )}

                        {/* Quick Add Custom Model for this provider */}
                        <div className="flex items-center space-x-1.5 pt-1 min-w-0">
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
                            className="flex-1 min-w-0 input-pro py-1 text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddCustomModel(provider.id)}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-white/[0.08] text-[11px] font-mono font-semibold flex items-center space-x-1 transition shrink-0 active:scale-95"
                            title="Tambahkan model ke daftar provider ini"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah</span>
                          </button>
                        </div>
                      </div>

                      {/* Ping Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                        <div className="font-mono text-[11px] min-w-0 flex-1 mr-2">
                          {ping?.loading && (
                            <span className="text-cyan-400 flex items-center space-x-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Testing {activeModel || 'model (auto-detect)'}...</span>
                            </span>
                          )}
                          {ping && !ping.loading && ping.success && (
                            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>
                                {ping.latency}ms OK{ping.model ? ` · ${ping.model}` : ''}
                              </span>
                            </span>
                          )}
                          {ping && !ping.loading && !ping.success && (
                            <span className="text-rose-400 flex items-center space-x-1" title={ping.error}>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Failed ({ping.status || 'Err'})</span>
                            </span>
                          )}
                          {ping && !ping.loading && !ping.success && (ping.modelsFound?.length || 0) > 0 && (
                            <div className="mt-1 text-[10px] text-amber-300/90 break-all">
                              Model tersedia: {ping.modelsFound!.slice(0, 5).join(', ')}
                              {ping.modelsFound!.length > 5
                                ? ` (+${ping.modelsFound!.length - 5} lagi)`
                                : ''}
                            </div>
                          )}
                          {ping && !ping.loading && !ping.success && ping.hint && (
                            <div className="mt-0.5 text-[10px] text-slate-400 break-words">{ping.hint}</div>
                          )}
                        </div>

                        <button
                          onClick={() => testProviderPing(provider.id)}
                          disabled={ping?.loading || (!hasKey && provider.id !== 'custom')}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 text-xs font-medium text-slate-200 border border-white/[0.08] transition active:scale-95"
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
