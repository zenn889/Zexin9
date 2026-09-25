'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  HardDrive,
  Lock,
  RefreshCw,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  baseUrl: string;
  isOnline: boolean;
  onRefresh: () => void;
  onLogout?: () => void;
  onOpenSecurity?: () => void;
}

export function Header({
  activeTab,
  baseUrl,
  isOnline,
  onRefresh,
  onLogout,
  onOpenSecurity,
}: HeaderProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const effectiveBaseUrl = baseUrl ? `${baseUrl}/v1` : 'https://your-zexin9.vercel.app/v1';

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
      title: 'Multi-Provider Pool & Key Management',
      subtitle: 'Manage Subscription, Cheap, and Free provider tiers with intelligent failover',
    },
    playground: {
      title: 'Zexin9 Playground Console',
      subtitle: 'Live interactive chat streaming with multi-tier failovers and RTK compression',
    },
    integrations: {
      title: 'CLI & IDE Integration',
      subtitle: 'One-click configurations for Claude Code, Cursor, Cline, and Continue.dev',
    },
    database: {
      title: 'Cloud Database Synchronization',
      subtitle: 'Seamless cloud persistence with MongoDB Atlas or Supabase PostgreSQL',
    },
    deploy: {
      title: 'Deploy & Publish (Vercel / Netlify)',
      subtitle: 'Deploy your Zexin9 gateway to the cloud with 1-click serverless setup & zero server costs',
    },
  };

  const current = titles[activeTab] || {
    title: 'Zexin9 Gateway',
    subtitle: 'Next-Gen Multi-Provider AI Gateway & High-Availability Proxy',
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#070a14]/90 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40">
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>{current.title}</span>
          </h1>
          <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>v2.0</span>
          </span>
        </div>
        <p className="text-xs text-slate-400 hidden sm:block font-medium">{current.subtitle}</p>
      </div>

      <div className="flex items-center space-x-3">
        {/* Endpoint Pill */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs font-mono transition shadow-inner">
          <span className="text-slate-400 hidden lg:inline">PROXY URL:</span>
          <span className="text-cyan-400 font-semibold truncate max-w-[200px] sm:max-w-xs">{effectiveBaseUrl}</span>
          <button
            onClick={copyUrl}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition"
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
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
          title="Refresh Status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Security Settings Button */}
        {onOpenSecurity && (
          <button
            onClick={onOpenSecurity}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-cyan-950/60 hover:border-cyan-500/50 border border-slate-800 text-slate-300 hover:text-cyan-300 transition flex items-center space-x-1.5 text-xs font-mono font-semibold"
            title="Pengaturan Keamanan & Kunci Akses"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Security Gate</span>
          </button>
        )}

        {/* Lock Web Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 hover:border-rose-500/50 border border-slate-800 text-slate-300 hover:text-rose-300 transition flex items-center space-x-1.5 text-xs font-mono font-semibold"
            title="Kunci Dashboard (Lock Web)"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Kunci Web</span>
          </button>
        )}
      </div>
    </header>
  );
}
