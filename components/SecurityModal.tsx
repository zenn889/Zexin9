'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Key,
  Lock,
  Shield,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function SecurityModal({ isOpen, onClose, onLogout }: SecurityModalProps) {
  const [currentKey, setCurrentKey] = useState('');
  const [newKey, setNewKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentKey();
      setError('');
      setSuccess('');
      setNewKey('');
      setConfirmKey('');
    }
  }, [isOpen]);

  const fetchCurrentKey = async () => {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const data = await res.json();
        if (data.currentKey) setCurrentKey(data.currentKey);
      }
    } catch {
      // ignore
    }
  };

  const handleCopy = () => {
    if (currentKey) {
      navigator.clipboard.writeText(currentKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleChangeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newKey.trim() || newKey.trim().length < 3) {
      setError('Access Key baru minimal 3 karakter!');
      return;
    }

    if (newKey !== confirmKey) {
      setError('Konfirmasi Access Key baru tidak cocok!');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change',
          newKey: newKey.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Kunci Akses (Master Key) berhasil diubah!');
        setCurrentKey(newKey.trim());
        setNewKey('');
        setConfirmKey('');
      } else {
        setError(data.error || 'Gagal mengubah Kunci Akses.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060913]/90 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#0f172a]/95 to-[#070b14]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center shadow-inner">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
                <span>Zexin9 Security Gate & Master Key</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Proteksi Akses Web Dashboard & Proxy Master Key
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Badge Card */}
        <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-300 block">Status Security Gate:</span>
            <span className="text-[11px] text-slate-400">
              Setiap pengunjung wajib memasukkan key sebelum membuka dashboard.
            </span>
          </div>
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>TERKUNCI & AMAN</span>
          </span>
        </div>

        {/* Current Key Display */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>KUNCI AKSES AKTIF SAAT INI:</span>
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-sans text-[11px]"
            >
              {showKey ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>Sembunyikan</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Lihat Kunci</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type={showKey ? 'text' : 'password'}
              readOnly
              value={currentKey || 'Belum di-set (Open Access)'}
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2 text-xs font-mono text-cyan-300 select-all focus:outline-none"
            />
            <button
              onClick={handleCopy}
              disabled={!currentKey}
              className="px-3 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-mono text-slate-300 transition flex items-center space-x-1"
              title="Salin Kunci Akses"
            >
              {copiedKey ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Salin</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form Change Key */}
        <form onSubmit={handleChangeKey} className="space-y-3 pt-2 border-t border-[#30363d]/60">
          <div className="flex items-center space-x-1 text-xs font-mono font-bold text-slate-300">
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>UBAH KUNCI AKSES (GANTI PASSWORD):</span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Masukkan Kunci Akses Baru..."
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Konfirmasi Kunci Akses Baru..."
              value={confirmKey}
              onChange={(e) => setConfirmKey(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-mono bg-rose-950/40 border border-rose-900/60 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono bg-emerald-950/40 border border-emerald-900/60 p-2.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !newKey.trim()}
            className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold text-xs transition shadow-md flex items-center justify-center space-x-1.5"
          >
            <span>{isLoading ? 'Menyimpan...' : 'Simpan & Terapkan Kunci Baru'}</span>
          </button>
        </form>

        {/* Lock Web Now Button */}
        <div className="pt-3 border-t border-[#30363d] flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Ingin menguji layar kunci atau keluar sekarang?
          </div>
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-mono font-semibold flex items-center space-x-1.5 transition"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Kunci Web Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
