'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Shield,
} from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: () => void;
  hasMasterKey?: boolean;
}

export function LoginModal({ onLoginSuccess, hasMasterKey = true }: LoginModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Setup mode validation
    if (!hasMasterKey) {
      if (!password.trim() || password.trim().length < 3) {
        setError('Access Key minimal 3 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi Access Key tidak cocok!');
        return;
      }
    } else {
      if (!password.trim()) {
        setError('Silakan masukkan Access Key.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password.trim(),
          action: !hasMasterKey ? 'setup' : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess();
      } else {
        setError(data.error || 'Access Key salah! Akses ditolak.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menghubungi server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 overflow-y-auto">
      <div className="w-full max-w-md pro-card p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 relative">
        {/* Brand & Badge */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur-md opacity-60" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-2xl mx-auto shadow-xl border border-white/20">
              Z9
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center justify-center space-x-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              <span>Zexin9 Security Gate</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {!hasMasterKey
                ? 'Tentukan Kunci Akses (Master Key) pertama kali untuk mengamankan Zexin9 Gateway ini.'
                : 'Zexin9 Gateway terproteksi. Masukkan Kunci Akses (Master Key) untuk membuka dashboard.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
              <span>{!hasMasterKey ? 'BUAT ACCESS KEY BARU' : 'MASUKKAN ACCESS KEY'}</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-200 text-[11px] font-sans flex items-center space-x-1"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Sembunyikan</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Lihat</span>
                  </>
                )}
              </button>
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={!hasMasterKey ? 'Ketik Access Key baru...' : 'Masukkan Kunci Akses web...'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full input-pro py-2.5"
              />
            </div>
          </div>

          {!hasMasterKey && (
            <div>
              <label className="text-xs font-mono text-slate-300 font-semibold block mb-1.5">
                KONFIRMASI ACCESS KEY
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Ulangi Access Key baru..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full input-pro py-2.5"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-rose-300 text-xs font-mono bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center justify-center space-x-2 active:scale-95"
          >
            <span>
              {isLoading
                ? 'Memverifikasi...'
                : !hasMasterKey
                ? 'Simpan Kunci & Buka Akses'
                : 'Buka Dashboard'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>AES-256 Auth Shield</span>
          </span>
          <span className="text-cyan-400 font-semibold">Zexin9 v2.0</span>
        </div>
      </div>
    </div>
  );
}
