'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { OverviewTab } from '@/components/OverviewTab';
import { ProvidersTab } from '@/components/ProvidersTab';
import { PlaygroundTab } from '@/components/PlaygroundTab';
import { IntegrationsTab } from '@/components/IntegrationsTab';
import { DeployTab } from '@/components/DeployTab';
import { CheckCircle2, ShieldCheck, Terminal, Zap } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [baseUrl, setBaseUrl] = useState('');
  const [isGatewayOnline, setIsGatewayOnline] = useState(true);
  const [envConfigured, setEnvConfigured] = useState<Record<string, boolean>>({});
  const [gatewaySecret, setGatewaySecret] = useState('');
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});

  // Initialize from browser localStorage and fetch status from API
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
      } catch (e) {
        console.error('Failed to load keys from localStorage', e);
      }
    }

    refreshStatus();
  }, []);

  const refreshStatus = async () => {
    try {
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
    }
  };

  const configuredCount = Object.keys(keys).filter((k) => keys[k]?.trim().length > 0)
    .concat(Object.keys(envConfigured).filter((k) => envConfigured[k]))
    .filter((v, i, a) => a.indexOf(v) === i).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        baseUrl={baseUrl}
        isGatewayOnline={isGatewayOnline}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
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
            onRefreshStatus={refreshStatus}
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

      {/* Modern Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0c1222] py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-200">9Router Cloud Gateway</span>
            <span>•</span>
            <span>Serverless AI Multiplexer for Cursor & Claude Code</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Vercel & Netlify Ready</span>
            </span>
            <span>•</span>
            <span className="text-slate-500 font-mono">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
