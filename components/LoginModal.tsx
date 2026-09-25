'use client';

import React, { useState } from 'react';
import { Lock, Key, Shield, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: () => void;
}

export function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess();
      } else {
        setError(data.error || 'Invalid Admin Password');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-2xl mx-auto shadow-lg shadow-cyan-500/25">
            9
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">9Router Security Access</h2>
          <p className="text-xs text-slate-400">
            This gateway is password-protected. Enter the Admin Master Key to unlock the dashboard.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1.5">
              ADMIN MASTER PASSWORD
            </label>
            <div className="relative flex items-center">
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full bg-[#161b22] border border-[#30363d] focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none transition shadow-inner"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-mono bg-rose-950/40 border border-rose-900/60 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Authenticating...' : 'Unlock Gateway'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="text-[11px] text-slate-500 text-center font-mono pt-2 border-t border-[#30363d]/60">
          Protected by AES-256 Auth & Rate Limiter
        </div>
      </div>
    </div>
  );
}
