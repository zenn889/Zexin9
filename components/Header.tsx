'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  HardDrive,
  RefreshCw,
  Terminal,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  baseUrl: string;
  isOnline: boolean;
  onRefresh: () => void;
}

export function Header({ activeTab, baseUrl, isOnline, onRefresh }: HeaderProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const effectiveBaseUrl = baseUrl ? `${baseUrl}/v1` : 'https://your-9router.vercel.app/v1';

  const copyUrl = () => {
    navigator.clipboard.writeText(effectiveBaseUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const titles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard & Quota Tracking',
      subtitle: 'Monitor token savings, quota health, and failover metrics across providers',
    },
    providers: {
      title: '3-Tier Provider Pool',
      subtitle: 'Manage Subscription, Cheap, and Free provider tiers with auto-failover',
    },
    playground: {
      title: 'Playground Console',
      subtitle: 'Live interactive chat streaming with multi-tier failovers and RTK compression',
    },
    integrations: {
      title: 'CLI & IDE Integration',
      subtitle: 'One-click configurations for Claude Code, Cursor, Cline, and Continue.dev',
    },
    deploy: {
      title: 'Deploy & Publish (Vercel / Netlify)',
      subtitle: 'Deploy your 9Router to the cloud with 1-click serverless setup & zero server costs',
    },
  };

  const current = titles[activeTab] || {
    title: '9Router Gateway',
    subtitle: 'High-availability AI proxy server',
  };

  return (
    <header className="h-16 border-b border-[#30363d] bg-[#0d1117] px-6 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight">{current.title}</h1>
        <p className="text-xs text-slate-400 hidden sm:block">{current.subtitle}</p>
      </div>

      <div className="flex items-center space-x-3">
        {/* Endpoint Pill */}
        <div className="flex items-center space-x-2 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs font-mono">
          <span className="text-slate-400">PROXY URL:</span>
          <span className="text-cyan-400 font-semibold">{effectiveBaseUrl}</span>
          <button
            onClick={copyUrl}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#21262d] transition"
            title="Copy Base URL"
          >
            {copiedUrl ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Refresh Status Button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-slate-300 transition"
          title="Refresh Status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
