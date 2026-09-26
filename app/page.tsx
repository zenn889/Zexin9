'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DashboardTab } from '@/components/DashboardTab';
import { ProvidersTab } from '@/components/ProvidersTab';
import { PlaygroundTab } from '@/components/PlaygroundTab';
import { IntegrationsTab } from '@/components/IntegrationsTab';
import { DeployTab } from '@/components/DeployTab';
import { DatabaseTab } from '@/components/DatabaseTab';
import { LoginModal } from '@/components/LoginModal';
import { SecurityModal } from '@/components/SecurityModal';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [baseUrl, setBaseUrl] = useState('');
  const [isGatewayOnline, setIsGatewayOnline] = useState(true);
  const [envConfigured, setEnvConfigured] = useState<Record<string, boolean>>({});
  const [gatewaySecret, setGatewaySecret] = useState('');
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
  const [rtkEnabled, setRtkEnabled] = useState(true);
  const [cavemanEnabled, setCavemanEnabled] = useState(false);

  // Security / Auth states
  const [authChecking, setAuthChecking] = useState(true);
  const [hasMasterKey, setHasMasterKey] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);

      try {
        const storedKeys = localStorage.getItem('zexin9_keys') || localStorage.getItem('9router_keys');
        if (storedKeys) setKeys(JSON.parse(storedKeys));

        const storedBaseUrls = localStorage.getItem('zexin9_baseurls') || localStorage.getItem('9router_baseurls');
        if (storedBaseUrls) setBaseUrls(JSON.parse(storedBaseUrls));

        const storedSecret = localStorage.getItem('zexin9_gateway_secret') || localStorage.getItem('9router_gateway_secret');
        if (storedSecret) setGatewaySecret(storedSecret);

        const storedRtk = localStorage.getItem('zexin9_rtk') ?? localStorage.getItem('9router_rtk');
        if (storedRtk !== null) setRtkEnabled(storedRtk === 'true');

        const storedCaveman = localStorage.getItem('zexin9_caveman') ?? localStorage.getItem('9router_caveman');
        if (storedCaveman !== null) setCavemanEnabled(storedCaveman === 'true');
      } catch (e) {
        console.error('Failed to load settings from localStorage', e);
      }
    }

    checkAuthAndStatus();
  }, []);

  // --- Self-heal: restore connected accounts to the server ---
  // Server-side storage can be ephemeral (no database connected / cold start),
  // which made accounts "disappear" after a refresh even though this browser
  // still holds a saved copy. Whenever the dashboard loads and the server
  // reports no accounts at all while the browser has some, push them back up.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const localAccountsRaw =
          localStorage.getItem('zexin9_provider_accounts') ||
          localStorage.getItem('9router_provider_accounts');
        const localAccounts = localAccountsRaw ? JSON.parse(localAccountsRaw) : [];
        const localCfRaw =
          localStorage.getItem('zexin9_cf_accounts') || localStorage.getItem('9router_cf_accounts');
        const localCfAccounts = localCfRaw ? JSON.parse(localCfRaw) : [];
        const localCfAccountId =
          localStorage.getItem('zexin9_cf_account_id') ||
          localStorage.getItem('9router_cf_account_id') ||
          '';

        const hasLocal =
          (Array.isArray(localAccounts) && localAccounts.length > 0) ||
          (Array.isArray(localCfAccounts) && localCfAccounts.length > 0);
        if (!hasLocal) return;

        const res = await fetch('/api/providers/config', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const serverAccounts = Array.isArray(data?.providerAccounts) ? data.providerAccounts : [];
        const serverCfAccounts = Array.isArray(data?.cfAccounts) ? data.cfAccounts : [];
        if (serverAccounts.length > 0 || serverCfAccounts.length > 0) return;

        const post = await fetch('/api/providers/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keys: data?.keys || {},
            baseUrls: data?.baseUrls || {},
            cfAccountId: String(data?.cfAccountId || '') || localCfAccountId,
            cfAccounts: Array.isArray(localCfAccounts) ? localCfAccounts : [],
            providerAccounts: Array.isArray(localAccounts) ? localAccounts : [],
          }),
        });
        if (post.ok && !cancelled) {
          // Let the Providers tab and the Playground refresh their views.
          window.dispatchEvent(new Event('zexin9-config-changed'));
        }
      } catch {
        // best effort — never block the dashboard
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const checkAuthAndStatus = async () => {
    try {
      // Check auth status
      const authRes = await fetch('/api/auth');
      if (authRes.ok) {
        const authData = await authRes.json();
        setHasMasterKey(Boolean(authData.hasMasterKey));
        // If no master key set (open access), server returns isAuthenticated=true directly
        setIsAuthenticated(Boolean(authData.isAuthenticated));
        if (authData.currentKey) {
          setGatewaySecret(authData.currentKey);
          if (typeof window !== 'undefined') {
            localStorage.setItem('zexin9_gateway_secret', authData.currentKey);
            localStorage.setItem('9router_gateway_secret', authData.currentKey);
          }
        }
      }

      // Check gateway status
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setIsGatewayOnline(true);
        const envMap: Record<string, boolean> = {};
        if (Array.isArray(data.providers)) {
          data.providers.forEach((p: any) => {
            envMap[p.id] = p.configuredInEnv;
          });
        }
        setEnvConfigured(envMap);
      } else {
        setIsGatewayOnline(false);
      }

      // Load stored provider keys from cloud DB / server store
      try {
        const provRes = await fetch('/api/providers/config');
        if (provRes.ok) {
          const cfg = await provRes.json();
          if (cfg.keys && Object.keys(cfg.keys).length > 0) {
            setKeys((prev) => ({ ...cfg.keys, ...prev }));
          }
          if (cfg.baseUrls && Object.keys(cfg.baseUrls).length > 0) {
            setBaseUrls((prev) => ({ ...cfg.baseUrls, ...prev }));
          }
        }
      } catch {
        // ignore
      }
    } catch {
      setIsGatewayOnline(false);
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
  };

  const handleRtkToggle = (val: boolean) => {
    setRtkEnabled(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zexin9_rtk', String(val));
      localStorage.setItem('9router_rtk', String(val));
    }
  };

  const handleCavemanToggle = (val: boolean) => {
    setCavemanEnabled(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zexin9_caveman', String(val));
      localStorage.setItem('9router_caveman', String(val));
    }
  };

  const configuredCount = Object.keys(keys).filter((k) => keys[k]?.trim().length > 0)
    .concat(Object.keys(envConfigured).filter((k) => envConfigured[k]))
    .filter((v, i, a) => a.indexOf(v) === i).length;

  // 1. Loading screen while verifying auth
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090e] text-cyan-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur-md opacity-60 animate-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-cyan-500/25 border border-cyan-300/40">
              Z9
            </div>
          </div>
          <span className="font-mono text-xs text-slate-400">Memeriksa Keamanan Zexin9 Gateway...</span>
        </div>
      </div>
    );
  }

  // 2. Security Gate: If not authenticated, show ONLY LoginModal
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-transparent">
        <LoginModal
          hasMasterKey={hasMasterKey}
          onLoginSuccess={() => {
            setIsAuthenticated(true);
            checkAuthAndStatus();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-transparent text-slate-100 font-sans">
      {/* Zexin9 Authentic Left Sidebar (Desktop + Mobile Drawer + Bottom Nav) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        baseUrl={baseUrl}
        gatewaySecret={gatewaySecret}
        rtkEnabled={rtkEnabled}
        setRtkEnabled={handleRtkToggle}
        cavemanEnabled={cavemanEnabled}
        setCavemanEnabled={handleCavemanToggle}
        isOnline={isGatewayOnline}
        onLogout={handleLogout}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenMobile={() => setMobileMenuOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent w-full overflow-x-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          baseUrl={baseUrl}
          isOnline={isGatewayOnline}
          onRefresh={checkAuthAndStatus}
          onLogout={handleLogout}
          onOpenSecurity={() => setIsSecurityModalOpen(true)}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto pb-24 md:pb-6 overflow-x-hidden">

          {activeTab === 'dashboard' && (
            <DashboardTab
              onSelectTab={setActiveTab}
              configuredCount={configuredCount}
            />
          )}

          {activeTab === 'providers' && (
            <ProvidersTab
              keys={keys}
              setKeys={setKeys}
              baseUrls={baseUrls}
              setBaseUrls={setBaseUrls}
              gatewaySecret={gatewaySecret}
              setGatewaySecret={setGatewaySecret}
              envConfigured={envConfigured}
              onRefreshStatus={checkAuthAndStatus}
            />
          )}

          {activeTab === 'playground' && (
            <PlaygroundTab
              keys={keys}
              baseUrls={baseUrls}
              gatewaySecret={gatewaySecret}
            />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsTab
              baseUrl={baseUrl}
              gatewaySecret={gatewaySecret}
            />
          )}

          {activeTab === 'database' && <DatabaseTab />}

          {activeTab === 'deploy' && <DeployTab />}
        </main>
      </div>

      {/* Dedicated Security Settings Modal */}
      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => {
          setIsSecurityModalOpen(false);
          checkAuthAndStatus();
        }}
        onLogout={handleLogout}
      />
    </div>
  );
}
