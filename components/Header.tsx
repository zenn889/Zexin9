'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  HardDrive,
  Lock,
  Menu,
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
    <header className="h-14 sm:h-16 border-b border-slate-800/80 bg-[#070a14]/90 backdrop-blur-xl px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Hamburger Toggle + Title */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition active:scale-95 shrink-0"
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
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <h1 className="text-xs sm:text-base font-extrabold text-white tracking-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
              {current.title}
            </h1>
            <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>v2.0</span>
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 hidden lg:block font-medium truncate">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
        {/* Endpoint Pill: Compact on mobile */}
        <button
          onClick={copyUrl}
          className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl px-2 sm:px-3 py-1.5 text-xs font-mono transition shadow-inner active:scale-95"
          title={`Klik untuk menyalin Proxy URL: ${effectiveBaseUrl}`}
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-400 hidden xl:inline">PROXY:</span>
          <span className="text-cyan-400 font-semibold hidden sm:inline truncate max-w-[120px] md:max-w-[200px]">
            {effectiveBaseUrl.replace(/^https?:\/\//, '')}
          </span>
          <span className="text-cyan-400 font-bold sm:hidden text-[10px] tracking-wide">
            URL
          </span>
          {copiedUrl ? (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-white shrink-0" />
          )}
        </button>

        {/* Refresh Status Button */}
        <button
          onClick={onRefresh}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition active:scale-95"
          title="Refresh Status Gateway"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Security Settings Button */}
        {onOpenSecurity && (
          <button
            onClick={onOpenSecurity}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-cyan-950/60 hover:border-cyan-500/50 border border-slate-800 text-slate-300 hover:text-cyan-300 transition flex items-center space-x-1.5 text-xs font-mono font-semibold active:scale-95"
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
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 hover:border-rose-500/50 border border-slate-800 text-slate-300 hover:text-rose-300 transition flex items-center space-x-1.5 text-xs font-mono font-semibold active:scale-95"
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
