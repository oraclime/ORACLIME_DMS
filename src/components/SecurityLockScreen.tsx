import React, { useState } from 'react';
import { Lock, ShieldCheck, UserCheck, AlertCircle, KeyRound, X, Key, RefreshCw } from 'lucide-react';
import { SystemSettings, UserAccount } from '../types/dms';
import { StorageService } from '../services/storageService';

interface SecurityLockScreenProps {
  settings: SystemSettings;
  currentUser: UserAccount | null;
  onUnlock: () => void;
}

export const SecurityLockScreen: React.FC<SecurityLockScreenProps> = ({
  settings,
  currentUser,
  onUnlock,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) return;
    setError('');
    setIsVerifying(true);

    try {
      // Allow unlocking either via Operator Security PIN or Current User Password
      const isPinValid = await StorageService.verifySecurityPin(pin);
      if (isPinValid) {
        setPin('');
        onUnlock();
        return;
      }

      if (currentUser) {
        const isPasswordValid = await StorageService.authenticateUser(currentUser.username, pin);
        if (isPasswordValid) {
          setPin('');
          onUnlock();
          return;
        }
      }

      setError('Incorrect Operator PIN or User Password.');
    } catch {
      setError('Verification failed. Try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNumClick = (digit: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-6 select-none">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6 text-slate-100">
        {/* Lock Icon Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-mono tracking-widest uppercase text-cyan-400 font-bold block mb-1">
            ORACLIME TECHNICIAN DMS · SECURITY LOCK
          </span>
          <h2 className="text-xl font-black tracking-tight text-white uppercase">
            Workstation Locked
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            All technician PDFs, Aadhaar records, and SQLite databases are secured. Enter Operator PIN to resume session.
          </p>
        </div>

        {/* Operator Badge */}
        {currentUser && (
          <div className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-200 font-semibold">{currentUser.fullName}</span>
            <span className="text-slate-500 uppercase">({currentUser.role})</span>
          </div>
        )}

        {/* PIN Entry Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1">
            <input
              type="password"
              autoFocus
              maxLength={8}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError('');
              }}
              placeholder="••••"
              className="w-48 mx-auto text-center tracking-[0.5em] text-2xl font-mono bg-slate-950 border border-slate-700 rounded-lg py-2.5 text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
            {error && (
              <div className="text-xs text-rose-400 font-mono flex items-center justify-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Quick PIN Pad */}
          <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => handleNumClick(d)}
                className="py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded text-sm font-mono font-bold border border-slate-800 transition-colors"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              className="py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded text-xs font-mono border border-slate-800 transition-colors"
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={() => handleNumClick('0')}
              className="py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded text-sm font-mono font-bold border border-slate-800 transition-colors"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin('')}
              className="py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded text-xs font-mono border border-slate-800 transition-colors"
            >
              C
            </button>
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isVerifying ? 'Verifying PIN...' : 'Unlock System'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

// Modal for unlocking restricted Aadhaar documents inside the app
interface AadhaarUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AadhaarUnlockModal: React.FC<AadhaarUnlockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setError('');
    setIsVerifying(true);

    try {
      const isValid = await StorageService.verifySecurityPin(pin);
      if (isValid) {
        setPin('');
        onSuccess();
        onClose();
      } else {
        setError('Incorrect Operator PIN. Access denied.');
      }
    } catch {
      setError('PIN verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="max-w-sm w-full bg-slate-900 border border-amber-500/40 rounded-xl p-6 shadow-2xl space-y-4 text-center text-slate-100 font-mono text-xs">
        <div className="flex justify-between items-start font-sans">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
            Operator Clearance Required
          </h3>
          <p className="text-slate-400 mt-1 text-[11px]">
            Enter Security PIN to decrypt and unmask government identity records for this technician.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            autoFocus
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError('');
            }}
            placeholder="Security PIN"
            className="w-full text-center bg-slate-950 border border-slate-700 rounded py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 tracking-widest"
          />
          {error && <div className="text-xs text-rose-400">{error}</div>}

          <div className="flex gap-2 pt-2 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-1.5 bg-slate-800 text-slate-300 rounded text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-bold disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Verify PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal for changing Operator Security PIN (Requirement 6)
interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  showToast: (msg: string) => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  showToast,
}) => {
  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPin !== confirmPin) {
      setError('New PIN and confirmation PIN do not match.');
      return;
    }

    if (!newPin || newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      setError('New PIN must be 4 to 8 numeric digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRecoveryMode) {
        // Admin recovery reset
        if (currentUser.role !== 'administrator') {
          setError('Administrator role required for PIN recovery.');
          setIsSubmitting(false);
          return;
        }

        const isAdminValid = await StorageService.authenticateUser(currentUser.username, adminPassword);
        if (!isAdminValid) {
          setError('Invalid administrator credentials.');
          setIsSubmitting(false);
          return;
        }

        const result = await StorageService.adminResetSecurityPin(newPin, currentUser);
        if (result.success) {
          showToast(result.message);
          onClose();
        } else {
          setError(result.message);
        }
      } else {
        // Standard change
        const result = await StorageService.changeSecurityPin(currentPin, newPin, currentUser);
        if (result.success) {
          showToast(result.message);
          onClose();
        } else {
          setError(result.message);
        }
      }
    } catch {
      setError('Failed to update PIN. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 text-slate-100 text-xs font-mono">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800 font-sans">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>{isRecoveryMode ? 'Administrator PIN Recovery' : 'Change Operator Security PIN'}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-slate-400 text-[11px] leading-relaxed">
          The Operator Security PIN is used to unmask Aadhaar numbers and access restricted technician files. Values are salted and cryptographically hashed with SHA-256.
        </p>

        {error && (
          <div className="p-2.5 rounded bg-rose-950/70 border border-rose-800 text-rose-300 text-[11px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isRecoveryMode ? (
            <div>
              <label className="block text-slate-400 mb-1">Current Security PIN</label>
              <input
                type="password"
                required
                maxLength={8}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Enter current PIN"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-slate-400 mb-1">Administrator Password (Authorization)</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter your administrator password"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1">New PIN (4-8 Digits)</label>
            <input
              type="password"
              required
              maxLength={8}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 5821"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-cyan-300 font-mono tracking-widest focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Confirm New PIN</label>
            <input
              type="password"
              required
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter new PIN"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-cyan-300 font-mono tracking-widest focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-2 flex justify-between items-center font-sans">
            {currentUser.role === 'administrator' && (
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(!isRecoveryMode);
                  setError('');
                }}
                className="text-[11px] text-amber-400 hover:underline font-mono"
              >
                {isRecoveryMode ? '← Standard Change' : 'Forgot PIN? Admin Reset'}
              </button>
            )}

            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Save New PIN'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
