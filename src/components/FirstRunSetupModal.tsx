import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Key, Lock, AlertCircle, CheckCircle2, ArrowRight, X, Eye, EyeOff } from 'lucide-react';
import { UserAccount } from '../types/dms';
import { StorageService } from '../services/storageService';

interface FirstRunSetupModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSetupSuccess: (admin: UserAccount) => void;
  isMandatory?: boolean;
}

export const FirstRunSetupModal: React.FC<FirstRunSetupModalProps> = ({
  isOpen,
  onClose,
  onSetupSuccess,
  isMandatory = false,
}) => {
  const [fullName, setFullName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
      setError('Username may only contain letters, numbers, underscores, or hyphens.');
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter the administrator full name.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Administrator password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (pin) {
      if (pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
        setError('Operator Security PIN must be 4 to 8 numeric digits.');
        return;
      }
      if (pin !== confirmPin) {
        setError('Security PINs do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await StorageService.setupFirstRunAdministrator({
        username: cleanUsername,
        fullName: fullName.trim(),
        password,
        pin: pin || '1234',
      });

      if (result.success && result.user) {
        onSetupSuccess(result.user);
      } else {
        setError(result.message || 'Failed to initialize administrator account.');
      }
    } catch {
      setError('An error occurred during account initialization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto select-none">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-100 my-auto font-sans">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-tight font-mono">
                Administrator Initial Setup
              </h2>
              <p className="text-xs text-slate-400">
                Configure primary workstation administrator & security PIN
              </p>
            </div>
          </div>
          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
          <p className="text-cyan-300 font-semibold">
            Security Notice:
          </p>
          <p className="text-slate-400 leading-relaxed">
            All user credentials and PINs are salted and hashed using cryptographic SHA-256 before writing to local database storage. Passwords are never stored in plaintext.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">Administrator Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. System Administrator"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-medium font-mono">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="e.g. admin"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">Password (Min. 8 chars)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create strong password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-9 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] font-mono">
                Operator Security PIN (For Aadhaar & Document Unmasking)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-slate-400 text-[11px]">Security PIN (4-8 Digits)</label>
                <input
                  type="password"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono tracking-widest text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-400 text-[11px]">Confirm Security PIN</label>
                <input
                  type="password"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Confirm PIN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono tracking-widest text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 font-sans">
            {!isMandatory && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <span>{isSubmitting ? 'Provisioning Account...' : 'Initialize Administrator & Launch'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
