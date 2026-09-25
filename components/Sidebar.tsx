'use client';

import React from 'react';
import {
  Activity,
  Check,
  Coins,
  Copy,
  Cpu,
  Flame,
  Globe2,
  Key,
  Layers,
  Lock,
  Network,
  Rocket,
  Settings,
  Shield,
  Sliders,
  Terminal,
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
}: SidebarProps) {
  const [copiedToken, setCopiedToken] = React.useState(false);

  const effectiveToken = gatewaySecret || 'Public (No Token Required)';

  const copyToken = () => {
    if (gatewaySecret) {
      navigator.clipboard.writeText(gatewaySecret);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Quota', icon: Activity, badge: null },
    { id: 'providers', label: 'Provider Tiers (3-Tier)', icon: Cpu, badge: '13' },
    { id: 'playground', label: 'Playground', icon: Terminal, badge: 'Active' },
    { id: 'integrations', label: 'CLI & IDE Setup', icon: Layers, badge: null },
    { id: 'deploy', label: 'Deploy & Publish', icon: Rocket, badge: 'Cloud' },
  ];

  return (
    <aside className="w-72 bg-[#0d1117] border-r border-[#30363d] flex flex-col shrink-0 min-h-screen text-slate-200">
      {/* 9Router Authentic Brand Header */}
      <div className="p-5 border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 font-black text-white text-lg">
            9
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">9Router</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                PROD v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">High-Availability AI Gateway</p>
          </div>
        </div>
      </div>

      {/* Gateway Status Pill */}
      <div className="px-4 py-3 mx-4 my-3 rounded-xl bg-[#161b22] border border-[#30363d]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px]">GATEWAY:</span>
          <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ONLINE & READY</span>
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-300">
          <span className="text-slate-500">Endpoint:</span>
          <span className="text-cyan-300 truncate max-w-[140px]" title={baseUrl}>
            {baseUrl.replace(/^https?:\/\//, '') || 'Live Serverless'}
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? 'bg-[#1f6feb]/20 text-[#58a6ff] border border-[#388bfd]/40'
                  : 'text-slate-300 hover:text-white hover:bg-[#161b22]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#58a6ff]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isActive
                      ? 'bg-[#1f6feb] text-white'
                      : 'bg-[#21262d] text-slate-400 border border-[#30363d]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 9Router Signature Toggles (RTK Token Saver & Caveman Mode) */}
      <div className="p-4 border-t border-[#30363d] space-y-3 bg-[#161b22]/50">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
          9Router Modifiers
        </div>

        {/* RTK Token Saver Toggle */}
        <label className="flex items-center justify-between text-xs cursor-pointer group">
          <div className="flex items-center space-x-2">
            <Zap className={`w-4 h-4 ${rtkEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
            <div>
              <div className="font-semibold text-slate-200 text-xs">RTK Token Saver</div>
              <div className="text-[10px] text-slate-400">-30% Input Tokens</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={rtkEnabled}
            onChange={(e) => setRtkEnabled(e.target.checked)}
            className="w-4 h-4 rounded bg-[#0d1117] border-[#30363d] text-cyan-500 focus:ring-0 cursor-pointer"
          />
        </label>

        {/* Caveman Mode Toggle */}
        <label className="flex items-center justify-between text-xs cursor-pointer group">
          <div className="flex items-center space-x-2">
            <Flame className={`w-4 h-4 ${cavemanEnabled ? 'text-orange-400' : 'text-slate-500'}`} />
            <div>
              <div className="font-semibold text-slate-200 text-xs">Caveman Mode</div>
              <div className="text-[10px] text-slate-400">Terse Output (No fluff)</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={cavemanEnabled}
            onChange={(e) => setCavemanEnabled(e.target.checked)}
            className="w-4 h-4 rounded bg-[#0d1117] border-[#30363d] text-amber-500 focus:ring-0 cursor-pointer"
          />
        </label>
      </div>

      {/* Bearer Token Copy Box (9Router signature feature) */}
      <div className="p-4 border-t border-[#30363d] bg-[#0d1117]">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
          <span>BEARER TOKEN</span>
          <button
            onClick={copyToken}
            className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            {copiedToken ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] font-mono text-xs text-slate-300 truncate">
          {effectiveToken}
        </div>
        {onOpenSecurity && (
          <button
            onClick={onOpenSecurity}
            className="w-full mt-2.5 py-1.5 px-3 rounded-lg bg-[#21262d] hover:bg-cyan-950/80 hover:border-cyan-800 border border-[#30363d] text-slate-300 hover:text-cyan-300 text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 transition"
            title="Pengaturan Keamanan & Kunci Akses"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Security Gate Settings</span>
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#21262d] hover:bg-rose-950/80 hover:border-rose-800 border border-[#30363d] text-slate-300 hover:text-rose-300 text-xs font-mono font-semibold flex items-center justify-center space-x-1.5 transition"
            title="Kunci Dashboard Web"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Kunci Dashboard</span>
          </button>
        )}
      </div>
    </aside>
  );
}
