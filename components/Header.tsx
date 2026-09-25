'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Globe,
  Lock,
  Menu,
  RefreshCw,
  Shield,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  baseUrl: string;
  isOnline: boolean;
  onRefresh: () => void;
  onLogout?: () => void;
  onOpenSecurity?: () => void;
  onToggleMobileMenu?: () => void;
}

export function Header({
  activeTab,
  baseUrl,
  isOnline,
  onRefresh,
  onLogout,
  onOpenSecurity,
  onToggleMobileMenu,
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
      title: 'Dashboard & Quota',
      subtitle: 'Monitor token savings, quota health, and failover metrics across providers',
    },
    providers: {
      title: 'Provider Tiers (3-Tier)',
      subtitle: 'Manage Subscription, Cheap, and Free provider tiers with intelligent failover',
    },
    playground: {
      title: 'Playground Console',
      subtitle: 'Live interactive chat streaming with multi-tier failovers and RTK compression',
    },
    integrations: {
      title: 'CLI & IDE Setup',
      subtitle: 'One-click configurations for Claude Code, Cursor, Cline, and Continue.dev',
    },
    database: {
      title: 'Database Cloud Sync',
      subtitle: 'Seamless cloud persistence with MongoDB Atlas or Supabase PostgreSQL',
    },
    deploy: {
      title: 'Deploy & Publish',
      subtitle: 'Deploy your Zexin9 gateway to the cloud with 1-click serverless setup & zero server costs',
    },
  };

  const current = titles[activeTab] || {
    title: 'Zexin9 Gateway',
    subtitle: 'Next-Gen Multi-Provider AI Gateway & High-Availability Proxy',
  };

  return (
    <header className="h-14 sm:h-16 border-b border-white/[0.06] bg-[#07090e]/85 backdrop-blur-2xl px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile Hamburger Toggle + Title */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition active:scale-95 shrink-0"
            title="Buka Menu Navigasi"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Mini Mobile Brand Icon */}
        <div className="md:hidden w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-cyan-500/20 shrink-0">
          Z9
        </div>

        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-xs sm:text-sm md:text-base font-bold text-white tracking-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
              {current.title}
            </h1>
            <span className="hidden md:inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>v2.0</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden lg:block font-normal truncate">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
        {/* Endpoint Pill */}
        <button
          onClick={copyUrl}
          className="flex items-center space-x-1.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-cyan-500/40 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-mono transition shadow-inner active:scale-95"
          title={`Klik untuk menyalin Proxy URL: ${effectiveBaseUrl}`}
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-500 hidden xl:inline uppercase text-[10px] font-semibold">PROXY:</span>
          <span className="text-slate-200 font-medium hidden sm:inline truncate max-w-[120px] md:max-w-[210px]">
            {effectiveBaseUrl.replace(/^https?:\/\//, '')}
          </span>
          <span className="text-cyan-400 font-bold sm:hidden text-[10px] tracking-wide">
            URL
          </span>
          {copiedUrl ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-0.5" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-white shrink-0 ml-0.5" />
          )}
        </button>

        {/* Refresh Status Button */}
        <button
          onClick={onRefresh}
          className="p-1.5 sm:p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.12] text-slate-300 transition active:scale-95"
          title="Refresh Status Gateway"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Security Settings Button */}
        {onOpenSecurity && (
          <button
            onClick={onOpenSecurity}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-white/[0.08] text-slate-300 hover:text-cyan-300 transition flex items-center space-x-1.5 text-xs font-mono font-medium active:scale-95"
            title="Pengaturan Keamanan & Kunci Akses"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden md:inline">Security Gate</span>
          </button>
        )}

        {/* Lock Web Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.02] hover:bg-rose-500/10 hover:border-rose-500/30 border border-white/[0.06] text-slate-400 hover:text-rose-300 transition flex items-center space-x-1.5 text-xs font-mono font-medium active:scale-95"
            title="Kunci Dashboard (Lock Web)"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="hidden md:inline">Kunci Web</span>
          </button>
        )}
      </div>
    </header>
  );
}
