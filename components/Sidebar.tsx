'use client';

import React from 'react';
import {
  Activity,
  Check,
  Coins,
  Copy,
  Cpu,
  Database,
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
    { id: 'database', label: 'Database (Mongo/Supa)', icon: Database, badge: 'Cloud' },
    { id: 'integrations', label: 'CLI & IDE Setup', icon: Layers, badge: null },
    { id: 'deploy', label: 'Deploy & Publish', icon: Rocket, badge: 'Cloud' },
  ];

  return (
    <aside className="w-72 bg-[#0a0d14] border-r border-[#21262d] flex flex-col shrink-0 min-h-screen text-slate-200 shadow-2xl">
      {/* Zexin9 Authentic Brand Header */}
      <div className="p-5 border-b border-[#21262d] flex items-center justify-between bg-[#0e131f]/60">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/30 font-black text-white text-base tracking-tighter">
              Z9
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0d14]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                Zexin9
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-emerald-950 to-teal-950 text-emerald-300 border border-emerald-700/60 shadow-sm">
                v2.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide">Next-Gen AI Gateway</p>
          </div>
        </div>
      </div>

      {/* Gateway Status Pill */}
      <div className="px-4 py-3 mx-3.5 my-3 rounded-xl bg-[#121826] border border-[#263042] shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider font-semibold">GATEWAY STATUS</span>
          <span className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ONLINE & READY</span>
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-300 bg-[#0a0d14] px-2.5 py-1.5 rounded-lg border border-[#1e2636]">
          <span className="text-slate-500 text-[10px]">HOST:</span>
          <span className="text-cyan-300 truncate max-w-[150px] font-medium" title={baseUrl}>
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
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#121826]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon
                  className={`w-4 h-4 transition ${
                    isActive ? 'text-cyan-400 scale-110' : 'text-slate-400 group-hover:text-cyan-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isActive
                      ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                      : 'bg-[#161f2e] text-slate-400 border border-[#212d40]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Zexin9 Signature Modifiers (RTK Token Saver & Caveman Mode) */}
      <div className="p-4 border-t border-[#21262d] space-y-3 bg-[#0e131f]/70">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
          <span>Zexin9 Modifiers</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            Active
          </span>
        </div>

        {/* RTK Token Saver Toggle */}
        <label className="flex items-center justify-between text-xs cursor-pointer group p-2 rounded-xl hover:bg-[#151c2c] transition border border-transparent hover:border-[#212d40]">
          <div className="flex items-center space-x-2.5">
            <div className={`p-1.5 rounded-lg ${rtkEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-200 text-xs">RTK Token Saver</div>
              <div className="text-[10px] text-slate-400">-30% Input Tokens</div>
            </div>
          </div>
          <div
            onClick={(e) => {
              e.preventDefault();
              setRtkEnabled(!rtkEnabled);
            }}
            className={`w-9 h-5 flex items-center rounded-full p-0.5 duration-300 cursor-pointer ${
              rtkEnabled ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition" />
          </div>
        </label>

        {/* Caveman Mode Toggle */}
        <label className="flex items-center justify-between text-xs cursor-pointer group p-2 rounded-xl hover:bg-[#151c2c] transition border border-transparent hover:border-[#212d40]">
          <div className="flex items-center space-x-2.5">
            <div className={`p-1.5 rounded-lg ${cavemanEnabled ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-200 text-xs">Caveman Mode</div>
              <div className="text-[10px] text-slate-400">Terse Output (No fluff)</div>
            </div>
          </div>
          <div
            onClick={(e) => {
              e.preventDefault();
              setCavemanEnabled(!cavemanEnabled);
            }}
            className={`w-9 h-5 flex items-center rounded-full p-0.5 duration-300 cursor-pointer ${
              cavemanEnabled ? 'bg-orange-500 justify-end' : 'bg-slate-700 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition" />
          </div>
        </label>
      </div>

      {/* Bearer Token Copy Box */}
      <div className="p-4 border-t border-[#21262d] bg-[#0a0d14]">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
          <span>PROXY MASTER KEY</span>
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
        <div className="p-2.5 rounded-xl bg-[#121826] border border-[#212d40] font-mono text-xs text-slate-300 truncate shadow-inner">
          {effectiveToken}
        </div>
        {onOpenSecurity && (
          <button
            onClick={onOpenSecurity}
            className="w-full mt-2.5 py-2 px-3 rounded-xl bg-[#161f2e] hover:bg-cyan-950/80 hover:border-cyan-700 border border-[#212d40] text-slate-300 hover:text-cyan-300 text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition shadow-sm"
            title="Pengaturan Keamanan & Kunci Akses"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Security Gate Settings</span>
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full mt-2 py-1.5 px-3 rounded-xl bg-[#161f2e] hover:bg-rose-950/80 hover:border-rose-800 border border-[#212d40] text-slate-300 hover:text-rose-300 text-xs font-mono font-semibold flex items-center justify-center space-x-2 transition"
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
