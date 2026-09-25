'use client';

import React, { useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  ExternalLink,
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
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'providers', label: 'Providers & Keys', icon: Settings },
    { id: 'playground', label: 'Playground', icon: Terminal },
    { id: 'integrations', label: 'Client Setup', icon: Layers },
    { id: 'deploy', label: 'Deploy to Cloud', icon: Rocket },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-[#0c1222]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                  9Router
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  Cloud Gateway
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Serverless Multi-Tier AI Proxy
              </p>
            </div>
          </div>

          {/* Quick Endpoint Copy */}
          <div className="hidden md:flex items-center bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 space-x-2">
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isGatewayOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-mono text-slate-300">
                {baseUrl ? `${baseUrl}/v1` : 'https://your-9router.vercel.app/v1'}
              </span>
            </div>
            <button
              onClick={copyEndpoint}
              title="Copy Base URL"
              className="text-slate-400 hover:text-cyan-400 p-1 rounded hover:bg-slate-800 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
