'use client';

import React, { useState } from 'react';
import {
  Activity,
  Check,
  ChevronRight,
  Copy,
  Cpu,
  Flame,
  Globe2,
  Layers,
  Network,
  Rocket,
  Settings,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  baseUrl: string;
  isGatewayOnline: boolean;
}

export function Navbar({
  activeTab,
  setActiveTab,
  baseUrl,
  isGatewayOnline,
}: NavbarProps) {
  const [copied, setCopied] = useState(false);

  const copyEndpoint = () => {
    navigator.clipboard.writeText(`${baseUrl}/v1`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity, badge: null },
    { id: 'providers', label: 'Providers & Keys', icon: Settings, badge: '9' },
    { id: 'playground', label: 'Playground', icon: Terminal, badge: 'Live' },
    { id: 'integrations', label: 'Client Setup', icon: Layers, badge: null },
    { id: 'deploy', label: 'Deploy Cloud', icon: Rocket, badge: 'Free' },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-[#080d1a]/85 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo with Glow */}
          <div
            onClick={() => setActiveTab('overview')}
            className="flex items-center space-x-3.5 cursor-pointer group"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-300" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0f172a] to-[#1e293b] border border-cyan-500/30 flex items-center justify-center shadow-lg">
                <Network className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                  9Router
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-inner">
                  Cloud
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Serverless AI Proxy & Fallback Multiplexer
              </p>
            </div>
          </div>

          {/* Quick Base URL Copy Badge */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-1.5 transition">
            <div className="flex items-center space-x-2 pr-2 border-r border-slate-800">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isGatewayOnline ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isGatewayOnline ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="text-[11px] font-mono font-semibold uppercase text-emerald-400 tracking-wider">
                Online
              </span>
            </div>

            <div className="flex items-center space-x-1.5 font-mono text-xs text-slate-300 pl-1">
              <span className="text-slate-500 text-[10px]">ENDPOINT:</span>
              <span className="text-cyan-300 font-medium">
                {baseUrl ? `${baseUrl}/v1` : 'https://your-9router.vercel.app/v1'}
              </span>
            </div>

            <button
              onClick={copyEndpoint}
              title="Copy Base URL"
              className="text-slate-400 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-slate-800 transition active:scale-95 ml-1"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-cyan-400 scale-110' : 'text-slate-400'
                    }`}
                  />
                  <span className="hidden md:inline">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold uppercase ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
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
      </div>
    </header>
  );
}
