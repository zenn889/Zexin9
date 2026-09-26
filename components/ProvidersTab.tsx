'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  /** Upstream protocol that served the ping (e.g. 'anthropic-messages'). */
  protocol?: string;
  /** Per-model verification results from the ping. */
  modelStatuses?: Array<{ model?: string; ok?: boolean; status?: number }>;
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
  const providerAccountsRef = useRef<ProviderAccount[]>([]);
  const autoDetectRanRef = useRef(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  // Which account card is currently having its provider changed inline.
  const [editingAccProviderId, setEditingAccProviderId] = useState<string | null>(null);
  // Where the server actually stores accounts (engine + whether it survives a
  // restart). Shown in the pool header so "accounts only exist in this browser"
  // can never hide silently again.
  const [serverPersistence, setServerPersistence] = useState<{
    engine?: string;
    persistent?: boolean;
    accountsCount?: number;
    dataDir?: string;
    cloudConfigured?: boolean;
    build?: string;
    mongoEnvPresent?: boolean;
    mongoUriValid?: boolean;
    connectionOk?: boolean;
    connectionError?: string;
  } | null>(null);
  const [serverSaveError, setServerSaveError] = useState<string | null>(null);
  const [newAccProvider, setNewAccProvider] = useState<ProviderId>('custom');
  const [newAccName, setNewAccName] = useState('');
  const [newAccKey, setNewAccKey] = useState('');
  const [newAccAccountId, setNewAccAccountId] = useState('');
  const [newAccBaseUrl, setNewAccBaseUrl] = useState('');
  const [showNewAccKey, setShowNewAccKey] = useState(false);
  const [formDetecting, setFormDetecting] = useState(false);
  const [formDetectResult, setFormDetectResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [formDetectedModels, setFormDetectedModels] = useState<string[]>([]);
  const [selectedFilterProvider, setSelectedFilterProvider] = useState<string>('all');
  const [testingAccId, setTestingAccId] = useState<string | null>(null);
  const [accPingResults, setAccPingResults] = useState<
    Record<string, PingResult>
  >({});

  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [customModelInputs, setCustomModelInputs] = useState<Record<string, string>>({});
  const [userCustomModels, setUserCustomModels] = useState<Record<string, string[]>>({});
  // Models a live ping got answers from (persisted to localStorage) — ✅ chips.
  const [verifiedModels, setVerifiedModels] = useState<Record<string, string[]>>({});
  const [newModelInput, setNewModelInput] = useState<Record<string, string>>({});
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [savingAllKeys, setSavingAllKeys] = useState(false);
  const [saveAllMsg, setSaveAllMsg] = useState<string | null>(null);

  // Keep a ref copy of accounts so async ping/detect handlers always patch the
  // latest list (avoids stale-closure overwrites when several updates overlap).
  useEffect(() => {
    providerAccountsRef.current = providerAccounts;
  }, [providerAccounts]);

  // One-time model auto-detection on load: for accounts that support an endpoint
  // but have no detected model list yet, probe them silently so the dashboard
  // (and Playground) fills itself without the user clicking anything.
  useEffect(() => {
    if (autoDetectRanRef.current) return;
    const targets = providerAccounts.filter(
      (a) =>
        a.enabled !== false &&
        (a.provider === 'custom' || a.baseUrl) &&
        !(a.detectedModels && a.detectedModels.length > 0)
    );
    if (targets.length === 0) return;
    autoDetectRanRef.current = true;
    targets.slice(0, 3).forEach((acc, i) => {
      setTimeout(() => {
        void handleTestAccount(acc);
      }, 800 + i * 700);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerAccounts]);

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

      const storedVerifiedModels = localStorage.getItem('zexin9_verified_models');
      if (storedVerifiedModels) {
        try {
          setVerifiedModels(JSON.parse(storedVerifiedModels));
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
        if (Array.isArray(data.providerAccounts)) {
          // The server list is the source of truth for routing — reflect it even
          // when empty so the UI never shows accounts the server cannot use.
          setProviderAccounts(data.providerAccounts);
          providerAccountsRef.current = data.providerAccounts;
        }
        if (data.persistence) setServerPersistence(data.persistence);
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
  // Re-read the server config when another part of the app pushes accounts to
  // the server (e.g. the self-heal in page.tsx restoring them from this browser).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onChanged = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fetch('/api/providers/config', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data) return;
            if (Array.isArray(data.providerAccounts)) {
              setProviderAccounts(data.providerAccounts);
              providerAccountsRef.current = data.providerAccounts;
            }
            if (Array.isArray(data.cfAccounts) && data.cfAccounts.length > 0) {
              setCfAccounts(data.cfAccounts);
            }
            if (data.persistence) setServerPersistence(data.persistence);
          })
          .catch(() => {});
      }, 1000);
    };
    window.addEventListener('zexin9-config-changed', onChanged);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('zexin9-config-changed', onChanged);
    };
  }, []);

  const saveProviderAccountsLocalAndSync = (updated: ProviderAccount[]) => {
    setProviderAccounts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zexin9_provider_accounts', JSON.stringify(updated));
      // Let other mounted tabs (Playground model list) refresh immediately.
      window.dispatchEvent(new Event('zexin9-config-changed'));
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
    })
      .then(async (res) => {
        if (!res.ok) {
          let detail = '';
          try {
            const errJson = await res.json();
            detail = String(errJson?.error || errJson?.details || '').slice(0, 140);
          } catch {
            // no body
          }
          setServerSaveError(
            `Gagal menyimpan ke server (HTTP ${res.status})${detail ? `: ${detail}` : ''}. Akun/API key hanya tersimpan di browser ini dan TIDAK dipakai server untuk chat — periksa Access Key dashboard atau koneksi database.`
          );
          return;
        }
        setServerSaveError(null);
        try {
          const data = await res.json();
          if (data?.persistence) setServerPersistence(data.persistence);
        } catch {
          // no body
        }
      })
      .catch((err) => {
        setServerSaveError(
          `Tidak bisa menghubungi server saat menyimpan (${err?.message || err}). Akun/API key hanya tersimpan di browser ini.`
        );
      });
  };

  const updateAccount = (id: string, patch: Partial<ProviderAccount>) => {
    const updated = providerAccountsRef.current.map((a) => (a.id === id ? { ...a, ...patch } : a));
    providerAccountsRef.current = updated;
    saveProviderAccountsLocalAndSync(updated);
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
      ...(formDetectedModels.length > 0
        ? { detectedModels: formDetectedModels, lastDetectedAt: new Date().toISOString() }
        : {}),
    };

    const updated = [...providerAccounts, newAcc];
    providerAccountsRef.current = updated;
    saveProviderAccountsLocalAndSync(updated);

    // Auto-detect models for custom endpoints right after connecting, so the
    // dashboard fills itself instead of requiring a manual ping.
    if (formDetectedModels.length === 0 && (newAcc.provider === 'custom' || newAcc.baseUrl)) {
      setTimeout(() => {
        void handleTestAccount(newAcc);
      }, 400);
    }

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
    setFormDetectedModels([]);
    setFormDetectResult(null);
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
      const found: string[] = Array.isArray(data?.modelsFound) ? data.modelsFound : [];
      const statuses: Array<{ model?: string; ok?: boolean; status?: number }> =
        Array.isArray(data?.modelStatuses) ? data.modelStatuses : [];
      const verified = Array.from(
        new Set(statuses.filter((s) => s?.ok && s?.model).map((s) => String(s.model)))
      );
      if (data?.success && data?.model) {
        rememberDiscoveredModels(acc.provider, [data.model, ...found]);
        if (verified.length > 0) rememberVerifiedModels(acc.provider, verified);
        const merged = Array.from(
          new Set([...(acc.detectedModels || []), ...found, data.model].filter(Boolean))
        );
        updateAccount(acc.id, {
          detectedModels: merged,
          ...(verified.length > 0
            ? { verifiedModels: Array.from(new Set([...(acc.verifiedModels || []), ...verified])) }
            : {}),
          lastDetectedAt: new Date().toISOString(),
          lastStatus: 'ok',
          latencyMs: data.latency,
        });
        if (!selectedModels[acc.provider]) handleModelSelect(acc.provider, data.model);
      } else if (found.length > 0) {
        // Detection worked even if the chat ping failed — save what we found.
        rememberDiscoveredModels(acc.provider, found);
        const merged = Array.from(new Set([...(acc.detectedModels || []), ...found]));
        updateAccount(acc.id, {
          detectedModels: merged,
          lastDetectedAt: new Date().toISOString(),
          lastStatus: 'error',
          lastError: String(data?.error || '').slice(0, 200),
        });
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
          protocol: data.protocol,
          modelStatuses: data.modelStatuses,
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

  // Adds models discovered from the endpoint's /models list to the custom-model
  // chips for this provider, so the user can pick them later (Playground too).
  const rememberDiscoveredModels = (providerId: string, models: string[]) => {
    const cleaned = Array.from(
      new Set((models || []).map((m) => String(m ?? '').trim()).filter((m) => m.length > 0))
    );
    if (cleaned.length === 0) return;
    setUserCustomModels((prev) => {
      const existing = prev[providerId] || [];
      const merged = [...existing];
      cleaned.forEach((m) => {
        if (!merged.includes(m)) merged.push(m);
      });
      if (merged.length === existing.length) return prev;
      const updated = { ...prev, [providerId]: merged };
      if (typeof window !== 'undefined') {
        localStorage.setItem('zexin9_user_models', JSON.stringify(updated));
        localStorage.setItem('9router_user_models', JSON.stringify(updated));
        window.dispatchEvent(new Event('zexin9-config-changed'));
      }
      return updated;
    });
  };

  const rememberDiscoveredModel = (providerId: string, model: string) => {
    rememberDiscoveredModels(providerId, [model]);
  };

  // Records which models a live ping actually got answers from (localStorage map
  // consumed by the Playground to mark ✅ vs ⭐ in the model dropdown).
  const rememberVerifiedModels = (providerId: string, models: string[]) => {
    const cleaned = Array.from(
      new Set((models || []).map((m) => String(m ?? '').trim()).filter((m) => m.length > 0))
    );
    if (cleaned.length === 0 || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('zexin9_verified_models');
      const map = raw ? JSON.parse(raw) || {} : {};
      const existing: string[] = Array.isArray(map[providerId]) ? map[providerId] : [];
      map[providerId] = Array.from(new Set([...existing, ...cleaned]));
      localStorage.setItem('zexin9_verified_models', JSON.stringify(map));
      window.dispatchEvent(new Event('zexin9-config-changed'));
    } catch {
      // ignore storage errors
    }
  };

  // "Auto Deteksi" in the add-account form: probes the endpoint with the key and
  // base URL currently typed in, then lists the models it reports.
  const handleFormDetect = async () => {
    if (!newAccKey.trim()) return;
    setFormDetecting(true);
    setFormDetectResult(null);
    try {
      const res = await fetch('/api/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newAccProvider,
          apiKey: newAccKey.trim(),
          baseUrl: newAccBaseUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      const found: string[] = Array.isArray(data?.modelsFound) ? data.modelsFound : [];
      const detectedStatuses: Array<{ model?: string; ok?: boolean; status?: number }> =
        Array.isArray(data?.modelStatuses) ? data.modelStatuses : [];
      const detectedVerified = Array.from(
        new Set(detectedStatuses.filter((s) => s?.ok && s?.model).map((s) => String(s.model)))
      );
      if (detectedVerified.length > 0) rememberVerifiedModels(newAccProvider, detectedVerified);
      if (found.length > 0) {
        setFormDetectedModels(found);
        rememberDiscoveredModels(newAccProvider, found);
        if (!selectedModels[newAccProvider]) handleModelSelect(newAccProvider, found[0]);
        setFormDetectResult({
          ok: true,
          text: `✓ ${found.length} model terdeteksi: ${found.slice(0, 8).join(', ')}${
            found.length > 8 ? ` (+${found.length - 8} lagi)` : ''
          }${
            detectedVerified.length > 0 && detectedVerified.length < found.length
              ? ` · terverifikasi jalan: ${detectedVerified.slice(0, 4).join(', ')}`
              : ''
          }`,
        });
      } else if (data?.success) {
        setFormDetectResult({ ok: true, text: `✓ Terhubung. Model aktif: ${data.model}` });
      } else {
        setFormDetectResult({
          ok: false,
          text: `✗ ${String(data?.error || 'Gagal mendeteksi model dari endpoint').slice(0, 220)}`,
        });
      }
    } catch (err: any) {
      setFormDetectResult({ ok: false, text: `✗ ${err?.message || 'Gagal terhubung'}` });
    } finally {
      setFormDetecting(false);
    }
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
      if (providerId === 'custom') {
        const found: string[] = Array.isArray(data?.modelsFound) ? data.modelsFound : [];
        if (found.length > 0) rememberDiscoveredModels(providerId, found);
        const statuses: Array<{ model?: string; ok?: boolean; status?: number }> =
          Array.isArray(data?.modelStatuses) ? data.modelStatuses : [];
        const verified = Array.from(
          new Set(statuses.filter((s) => s?.ok && s?.model).map((s) => String(s.model)))
        );
        if (verified.length > 0) rememberVerifiedModels(providerId, verified);
        if (data?.success && data?.model) {
          rememberDiscoveredModels(providerId, [data.model]);
          if (!modelToTest || modelToTest === data.model) {
            handleModelSelect(providerId, data.model);
          }
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
          protocol: data.protocol,
          modelStatuses: data.modelStatuses,
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
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-mono">
                {serverSaveError ? (
                  <span className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 break-words">
                    ⚠️ {serverSaveError}
                  </span>
                ) : serverPersistence && serverPersistence.mongoEnvPresent && serverPersistence.mongoUriValid === false ? (
                  <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 break-words">
                    ⚠️ Env MONGODB_URI terisi, tapi nilainya bukan URI MongoDB (harus diawali <code>mongodb+srv://</code>).
                    Cek Environment Variables — mungkin ketuker dengan MONGODB_DB / Database Name.
                  </span>
                ) : serverPersistence && serverPersistence.engine !== 'local' && serverPersistence.connectionOk === false ? (
                  <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 break-words">
                    ⚠️ {serverPersistence.engine} dikonfigurasi, tapi KONEKSI GAGAL
                    {serverPersistence.connectionError ? `: ${String(serverPersistence.connectionError).slice(0, 170)}` : ''}
                    {' '}— buka tab Database untuk tes ulang (cek IP whitelist Atlas 0.0.0.0/0, password, dan pastikan sudah redeploy).
                  </span>
                ) : serverPersistence ? (
                  <span
                    className={`px-2 py-1 rounded-lg border break-words ${
                      serverPersistence.persistent
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                    }`}
                    title={
                      serverPersistence.persistent
                        ? 'Akun & API key yang tampil di sini benar-benar tersimpan di sisi server.'
                        : 'Server ini menyimpan data di penyimpanan sementara — hubungkan database (env MONGODB_URI / SUPABASE_URL + SUPABASE_KEY / KV_REST_API_URL + KV_REST_API_TOKEN) agar akun tersimpan permanen.'
                    }
                  >
                    💾 Tersimpan di SERVER: {serverPersistence.accountsCount ?? 0} akun · penyimpanan: {serverPersistence.engine}
                    {serverPersistence.persistent
                      ? serverPersistence.engine !== 'local'
                        ? ' (database — permanen)'
                        : ' (file lokal server)'
                      : ' — SEMENTARA: data hilang saat server restart/redeploy. Hubungkan database dulu!'}
                    {serverPersistence.build ? ` · versi server: ${serverPersistence.build}` : ''}
                  </span>
                ) : null}
              </div>
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
                    Endpoint Base URL (Ollama / Localhost / vLLM / API Reseller)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. http://localhost:11434/v1"
                      value={newAccBaseUrl}
                      onChange={(e) => setNewAccBaseUrl(e.target.value)}
                      className="input-pro w-full"
                    />
                    <button
                      type="button"
                      disabled={!newAccKey.trim() || formDetecting}
                      onClick={handleFormDetect}
                      className="shrink-0 px-3 py-2 rounded-xl text-[11px] font-mono border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition disabled:opacity-40 flex items-center space-x-1.5"
                      title="Cek endpoint dan deteksi daftar model secara otomatis"
                    >
                      {formDetecting ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>{formDetecting ? 'Deteksi...' : 'Auto Deteksi'}</span>
                    </button>
                  </div>
                  {formDetectResult && (
                    <div
                      className={`mt-1.5 text-[10px] font-mono p-1.5 rounded-lg border break-all ${
                        formDetectResult.ok
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}
                    >
                      {formDetectResult.text}
                    </div>
                  )}
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
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">Provider:</span>
                            {editingAccProviderId === acc.id ? (
                              <select
                                autoFocus
                                value={acc.provider}
                                onChange={(e) => {
                                  updateAccount(acc.id, { provider: e.target.value as ProviderId });
                                  setEditingAccProviderId(null);
                                }}
                                onBlur={() => setEditingAccProviderId(null)}
                                className="bg-slate-900 border border-cyan-800/60 rounded px-1 py-0.5 text-[10px] text-cyan-300"
                              >
                                {DEFAULT_PROVIDERS.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <span className="text-cyan-300 uppercase text-[10px] font-semibold">
                                  {acc.provider}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingAccProviderId(acc.id)}
                                  className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-white/[0.08] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition"
                                  title="Ubah provider akun ini (mis. dari deepseek ke Custom)"
                                >
                                  Ubah
                                </button>
                              </span>
                            )}
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
                          {acc.detectedModels && acc.detectedModels.length > 0 && (
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-slate-500 shrink-0">
                                Model ({acc.detectedModels.length}):
                              </span>
                              <span
                                className="text-emerald-300/90 text-right break-all"
                                title={acc.detectedModels.join('\n')}
                              >
                                {acc.detectedModels.slice(0, 3).join(', ')}
                                {acc.detectedModels.length > 3
                                  ? ` +${acc.detectedModels.length - 3} lagi`
                                  : ''}
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
                                ? `✓ Siap (${ping.latency}ms)${ping.model ? ` · ${ping.model}` : ''}${
                                    ping.protocol === 'anthropic-messages' ? ' · format Anthropic' : ''
                                  }`
                                : `✗ ${ping.error?.slice(0, 200) || 'Error'}`}
                            </div>
                            {ping.success && (ping.modelStatuses?.length || 0) > 1 && (
                              <div className="mt-0.5 text-[10px] break-all leading-relaxed">
                                {ping.modelStatuses!.some((s) => s.ok) && (
                                  <div className="text-emerald-300/90">
                                    ✅ Bekerja: {ping.modelStatuses!.filter((s) => s.ok).map((s) => s.model).join(', ')}
                                  </div>
                                )}
                                {ping.modelStatuses!.some((s) => !s.ok) && (
                                  <div className="text-rose-300/90">
                                    ❌ Gagal dites: {ping.modelStatuses!.filter((s) => !s.ok).map((s) => `${s.model}${s.status ? ` (${s.status})` : ''}`).join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
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
                        {provider.id === 'custom' &&
                          providerAccounts.filter((a) => a.provider === 'custom').length > 0 && (
                            <p className="text-[10px] text-slate-500 mt-1">
                              ℹ️ {providerAccounts.filter((a) => a.provider === 'custom').length} akun Custom
                              tersambung — API key &amp; endpoint disimpan di tiap akun (lihat bagian Akun
                              Terhubung di atas). Kolom ini opsional: dipakai sebagai default/fallback bila
                              tidak ada akun, dan oleh tombol Test Model di kartu ini.
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
                            const isVerified = isUserCustom && (verifiedModels[provider.id] || []).includes(m);
                            return (
                              <span
                                key={m}
                                onClick={() => handleModelSelect(provider.id, m)}
                                className={`cursor-pointer inline-flex items-center space-x-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border transition select-none ${
                                  isSelected
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold shadow-sm'
                                    : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border-white/[0.06] hover:border-white/[0.12]'
                                }`}
                                title={`Klik untuk pilih model: ${m}${isVerified ? ' (terverifikasi ✅ sudah dijawab endpoint)' : ''}`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                                <span>{isVerified ? '✅ ' : ''}{m}</span>
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
                                {ping.protocol === 'anthropic-messages' ? ' · format Anthropic' : ''}
                              </span>
                            </span>
                          )}
                          {ping && !ping.loading && ping.success && (ping.modelStatuses?.length || 0) > 1 && (
                            <div className="mt-0.5 text-[10px] break-all leading-relaxed">
                              {ping.modelStatuses!.some((s) => s.ok) && (
                                <div className="text-emerald-300/90">
                                  ✅ Bekerja: {ping.modelStatuses!.filter((s) => s.ok).map((s) => s.model).join(', ')}
                                </div>
                              )}
                              {ping.modelStatuses!.some((s) => !s.ok) && (
                                <div className="text-rose-300/90">
                                  ❌ Gagal dites: {ping.modelStatuses!.filter((s) => !s.ok).map((s) => `${s.model}${s.status ? ` (${s.status})` : ''}`).join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                          {ping && !ping.loading && !ping.success && (
                            <span className="text-rose-400 flex items-center space-x-1" title={ping.error}>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Failed ({ping.status || 'Err'})</span>
                            </span>
                          )}
                          {ping && !ping.loading && !ping.success && ping.error && (
                            <div className="mt-0.5 text-[10px] text-rose-300/90 break-words">
                              {ping.error.length > 200 ? `${ping.error.slice(0, 200)}…` : ping.error}
                            </div>
                          )}
                          {ping && !ping.loading && !ping.success && (ping.tried?.length || 0) > 1 && (
                            <div className="mt-0.5 text-[10px] text-slate-400 break-all">
                              Dicoba: {ping.tried!.join(', ')}
                            </div>
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
