'use client';

import React from 'react';
import {
  Activity,
  Check,
  Copy,
  Cpu,
  Database,
  Flame,
  Globe,
  Layers,
  Lock,
  Menu,
  Rocket,
  Shield,
  Terminal,
  X,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  baseUrl: string;
  gatewaySecret: string;
  rtkEnabled: boolean;
  setRtkEnabled: (val: boolean) => void;
  cavemanEnabled: boolean;
  setCavemanEnabled: (val: boolean) => void;
  isOnline: boolean;
  onLogout?: () => void;
  onOpenSecurity?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenMobile?: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  baseUrl,
  gatewaySecret,
  rtkEnabled,
  setRtkEnabled,
  cavemanEnabled,
  setCavemanEnabled,
  isOnline,
  onLogout,
  onOpenSecurity,
  mobileOpen = false,
  onCloseMobile,
  onOpenMobile,
}: SidebarProps) {
  const [copiedToken, setCopiedToken] = React.useState(false);

  const effectiveToken = gatewaySecret || 'Public (No Master Token Required)';

  const copyToken = () => {
    if (gatewaySecret) {
      navigator.clipboard.writeText(gatewaySecret);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onCloseMobile?.();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Quota', icon: Activity, badge: null },
    { id: 'providers', label: 'Provider Tiers (3-Tier)', icon: Cpu, badge: '13+' },
    { id: 'playground', label: 'Playground Console', icon: Terminal, badge: 'Active' },
    { id: 'database', label: 'Database Sync', icon: Database, badge: 'Cloud' },
    { id: 'integrations', label: 'CLI & IDE Setup', icon: Layers, badge: null },
    { id: 'deploy', label: 'Deploy & Publish', icon: Rocket, badge: 'Cloud' },
  ];

  // Reusable Sidebar Inner Content
  const renderSidebarContent = (isMobileDrawer: boolean = false) => (
    <div className="flex flex-col h-full justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between bg-black/20">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-white/20 font-black text-white text-base tracking-tighter transition-transform group-hover:scale-105 duration-200">
                Z9
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#080b12] ring-1 ring-emerald-400/40" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">
                  Zexin9
                </span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wide">Next-Gen AI Gateway</p>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {isMobileDrawer && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] transition"
              title="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Gateway Status Pill */}
        <div className="px-3.5 py-2.5 mx-3 my-3 rounded-xl bg-white/[0.02] border border-white/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider font-semibold">GATEWAY STATUS</span>
            <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span className="tracking-tight">ONLINE</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/[0.05]">
            <span className="text-slate-500 text-[10px] uppercase font-semibold">HOST:</span>
            <span className="text-cyan-300 truncate max-w-[150px] font-medium" title={baseUrl}>
              {baseUrl.replace(/^https?:\/\//, '') || 'Live Edge'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 py-1 space-y-1">
          <div className="px-3 pb-1.5 text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-white/[0.08] text-white border border-white/[0.12] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span className={isActive ? 'font-semibold text-white' : ''}>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-white/[0.04] text-slate-400 border border-white/[0.06]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto">
        {/* Zexin9 Signature Modifiers */}
        <div className="p-3.5 border-t border-white/[0.06] space-y-2 bg-black/20">
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center justify-between px-1">
            <span>Modifiers</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
              Edge
            </span>
          </div>

          {/* RTK Token Saver Toggle */}
          <div
            onClick={() => setRtkEnabled(!rtkEnabled)}
            className="flex items-center justify-between text-xs cursor-pointer group p-2 rounded-xl hover:bg-white/[0.04] transition border border-transparent hover:border-white/[0.06]"
          >
            <div className="flex items-center space-x-2.5">
              <div className={`p-1.5 rounded-lg border transition ${
                rtkEnabled
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-white/[0.04] text-slate-500 border-white/[0.06]'
              }`}>
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-slate-200 text-xs">RTK Token Saver</div>
                <div className="text-[10px] text-slate-400">-30% Prompt Tokens</div>
              </div>
            </div>
            <div
              className={`w-8 h-4.5 flex items-center rounded-full p-0.5 duration-200 transition-colors ${
                rtkEnabled ? 'bg-cyan-500 justify-end' : 'bg-white/10 justify-start'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
            </div>
          </div>

          {/* Caveman Mode Toggle */}
          <div
            onClick={() => setCavemanEnabled(!cavemanEnabled)}
            className="flex items-center justify-between text-xs cursor-pointer group p-2 rounded-xl hover:bg-white/[0.04] transition border border-transparent hover:border-white/[0.06]"
          >
            <div className="flex items-center space-x-2.5">
              <div className={`p-1.5 rounded-lg border transition ${
                cavemanEnabled
                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                  : 'bg-white/[0.04] text-slate-500 border-white/[0.06]'
              }`}>
                <Flame className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-slate-200 text-xs">Caveman Mode</div>
                <div className="text-[10px] text-slate-400">Terse Output (No fluff)</div>
              </div>
            </div>
            <div
              className={`w-8 h-4.5 flex items-center rounded-full p-0.5 duration-200 transition-colors ${
                cavemanEnabled ? 'bg-orange-500 justify-end' : 'bg-white/10 justify-start'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
            </div>
          </div>
        </div>

        {/* Master Key Copy Box & Security Controls */}
        <div className="p-3.5 border-t border-white/[0.06] bg-black/40">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5 px-0.5">
            <span className="font-semibold uppercase tracking-wider">GATEWAY MASTER KEY</span>
            <button
              onClick={copyToken}
              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition"
            >
              {copiedToken ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="p-2 rounded-xl bg-black/50 border border-white/[0.06] font-mono text-[11px] text-slate-300 truncate shadow-inner">
            {effectiveToken}
          </div>

          {onOpenSecurity && (
            <button
              onClick={() => {
                onOpenSecurity();
                onCloseMobile?.();
              }}
              className="w-full mt-2 py-1.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] text-slate-300 hover:text-white text-xs font-mono font-medium flex items-center justify-center space-x-2 transition shadow-sm"
              title="Pengaturan Keamanan & Kunci Akses"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Security Gate</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={() => {
                onLogout();
                onCloseMobile?.();
              }}
              className="w-full mt-1.5 py-1.5 px-3 rounded-xl bg-white/[0.02] hover:bg-rose-500/10 border border-white/[0.05] hover:border-rose-500/30 text-slate-400 hover:text-rose-300 text-xs font-mono font-medium flex items-center justify-center space-x-2 transition"
              title="Kunci Dashboard Web"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Kunci Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-[#090d16]/95 backdrop-blur-2xl border-r border-white/[0.06] flex-col shrink-0 min-h-screen text-slate-200 shadow-2xl sticky top-0 h-screen overflow-y-auto">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile Slide-Over Drawer with Backdrop Blur */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Dark Backdrop */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />

        {/* Slide-out Drawer Container */}
        <aside
          className={`fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-[#090d16] border-r border-white/[0.08] flex flex-col z-10 text-slate-200 shadow-2xl transition-transform duration-300 ease-in-out h-full overflow-y-auto ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderSidebarContent(true)}
        </aside>
      </div>

      {/* 3. Mobile Bottom Navigation Bar (Thumb Friendly) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#07090e]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 py-1.5 flex items-center justify-around md:hidden shadow-2xl">
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === 'dashboard' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Dashboard</span>
        </button>
        <button
          onClick={() => handleTabClick('providers')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === 'providers' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Providers</span>
        </button>
        <button
          onClick={() => handleTabClick('playground')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === 'playground' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Playground</span>
        </button>
        <button
          onClick={() => handleTabClick('database')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            activeTab === 'database' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Database</span>
        </button>
        <button
          onClick={mobileOpen ? onCloseMobile : onOpenMobile}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            mobileOpen ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </div>
    </>
  );
}
