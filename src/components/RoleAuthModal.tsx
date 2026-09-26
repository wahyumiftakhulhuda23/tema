import React, { useState } from 'react';
import { useTeMa } from '../context/TeMaContext';
import { ShieldAlert, X, Eye, EyeOff, ShieldCheck, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTap } from '../utils/sound';

interface Props {
  isOpen: boolean;
  targetRole: 'guru' | 'admin';
  onClose: () => void;
  onSuccess: () => void;
}

export const RoleAuthModal: React.FC<Props> = ({
  isOpen,
  targetRole,
  onClose,
  onSuccess,
}) => {
  const { loginAsGuru, loginAsAdmin } = useTeMa();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!isOpen) return null;

  const isGuru = targetRole === 'guru';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password) {
      setHasError(true);
      return;
    }

    let success = false;
    if (isGuru) {
      success = loginAsGuru(password);
    } else {
      success = loginAsAdmin(password);
    }

    if (success) {
      setHasError(false);
      setPassword('');
      onSuccess();
    } else {
      setHasError(true);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xs overflow-hidden shadow-2xl p-5 text-center relative"
        >
          {/* Close button */}
          <button
            onClick={() => {
              playTap();
              onClose();
            }}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Badge */}
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-3 shadow-lg ${
              isGuru
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400 shadow-indigo-500/10'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-amber-500/10'
            }`}
          >
            {isGuru ? <Users className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>

          <h3 className="text-sm font-bold text-white">
            {isGuru ? 'Autentikasi Guru Pembimbing' : 'Autentikasi Administrator'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            {isGuru
              ? 'Masukkan password guru untuk mengakses pengelolaan siswa, data DUDI & rekapitulasi.'
              : 'Masukkan password administrator untuk konfigurasi aturan sistem & database.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setHasError(false);
                }}
                placeholder={isGuru ? 'Masukkan Password Guru' : 'Masukkan Password Admin'}
                className={`w-full text-center text-sm font-mono font-bold py-2.5 px-9 rounded-xl border transition-all ${
                  hasError
                    ? 'border-rose-500 bg-rose-500/10 text-rose-300 ring-2 ring-rose-500/20'
                    : 'border-slate-700 bg-slate-800 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                } focus:outline-none`}
                autoFocus
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {hasError && (
              <div className="flex items-center justify-center gap-1 text-[11px] text-rose-400 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Password salah! Periksa kembali password Anda.</span>
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 text-white ${
                  isGuru
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                }`}
              >
                Masuk Sekarang &rarr;
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
