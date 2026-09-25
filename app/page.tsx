'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DashboardTab } from '@/components/DashboardTab';
import { ProvidersTab } from '@/components/ProvidersTab';
import { PlaygroundTab } from '@/components/PlaygroundTab';
import { IntegrationsTab } from '@/components/IntegrationsTab';
import { DeployTab } from '@/components/DeployTab';
import { LoginModal } from '@/components/LoginModal';

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);

      try {
        const storedKeys = localStorage.getItem('9router_keys');
        if (storedKeys) setKeys(JSON.parse(storedKeys));

        const storedBaseUrls = localStorage.getItem('9router_baseurls');
        if (storedBaseUrls) setBaseUrls(JSON.parse(storedBaseUrls));

        const storedSecret = localStorage.getItem('9router_gateway_secret');
        if (storedSecret) setGatewaySecret(storedSecret);

        const storedRtk = localStorage.getItem('9router_rtk');
        if (storedRtk !== null) setRtkEnabled(storedRtk === 'true');

        const storedCaveman = localStorage.getItem('9router_caveman');
        if (storedCaveman !== null) setCavemanEnabled(storedCaveman === 'true');
      } catch (e) {
        console.error('Failed to load settings from localStorage', e);
      }
    }

    checkAuthAndStatus();
  }, []);

  const checkAuthAndStatus = async () => {
    try {
      // Check auth status
      const authRes = await fetch('/api/auth');
      if (authRes.ok) {
        const authData = await authRes.json();
        setHasMasterKey(Boolean(authData.hasMasterKey));
        setIsAuthenticated(Boolean(authData.isAuthenticated));
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
      localStorage.setItem('9router_rtk', String(val));
    }
  };

  const handleCavemanToggle = (val: boolean) => {
    setCavemanEnabled(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('9router_caveman', String(val));
    }
  };

  const configuredCount = Object.keys(keys).filter((k) => keys[k]?.trim().length > 0)
    .concat(Object.keys(envConfigured).filter((k) => envConfigured[k]))
    .filter((v, i, a) => a.indexOf(v) === i).length;

  // 1. Loading screen while verifying auth
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-cyan-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-cyan-500/25 border border-cyan-400/30 animate-pulse">
            9
          </div>
          <span className="font-mono text-xs text-slate-400">Memeriksa Keamanan Gateway...</span>
        </div>
      </div>
    );
  }

  // 2. Security Gate: If not authenticated, show ONLY LoginModal
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d1117]">
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
    <div className="min-h-screen flex bg-[#0d1117] text-slate-100 font-sans">
      {/* 9Router Authentic Left Sidebar */}
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
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          baseUrl={baseUrl}
          isOnline={isGatewayOnline}
          onRefresh={checkAuthAndStatus}
          onLogout={handleLogout}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
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

          {activeTab === 'deploy' && <DeployTab />}
        </main>
      </div>
    </div>
  );
}
