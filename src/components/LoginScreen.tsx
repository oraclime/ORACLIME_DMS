import React, { useState, useEffect } from 'react';
import { User, Key, ShieldCheck, AlertCircle, ArrowRight, Eye, EyeOff, Wrench, Lock, CheckCircle2 } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { UserAccount } from '../types/dms';
import { FirstRunSetupModal } from './FirstRunSetupModal';

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Temporary Password change step
  const [mustChangePasswordUser, setMustChangePasswordUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [changePasswordError, setChangePasswordError] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // First-run setup state
  const [isFirstRunOpen, setIsFirstRunOpen] = useState<boolean>(false);
  const [hasAdmin, setHasAdmin] = useState<boolean>(true);

  useEffect(() => {
    const adminExists = StorageService.hasAdminUser();
    setHasAdmin(adminExists);
    if (!adminExists) {
      setIsFirstRunOpen(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await StorageService.authenticateUserDetailed(username, password);
      if (result.success && result.user) {
        if (result.user.mustChangePassword) {
          // Trigger temporary password change flow
          setMustChangePasswordUser(result.user);
        } else {
          onLoginSuccess(result.user);
        }
      } else {
        setError(result.error || 'Invalid username or password.');
      }
    } catch {
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mustChangePasswordUser) return;
    setChangePasswordError('');

    if (newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await StorageService.changeUserPassword(
        mustChangePasswordUser.id,
        password, // old temporary password
        newPassword
      );

      if (result.success) {
        const refreshedUser = StorageService.getUserById(mustChangePasswordUser.id);
        if (refreshedUser) {
          StorageService.setCurrentUser(refreshedUser);
          onLoginSuccess(refreshedUser);
        }
      } else {
        setChangePasswordError(result.message);
      }
    } catch {
      setChangePasswordError('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSetupSuccess = (admin: UserAccount) => {
    setIsFirstRunOpen(false);
    setHasAdmin(true);
    onLoginSuccess(admin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-6 select-none overflow-y-auto">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-slate-100 my-auto font-sans">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-cyan-600 text-white font-bold flex items-center justify-center mx-auto text-xl shadow-lg font-mono">
            OL
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase font-sans">
              ORACLIME DMS
            </h1>
            <p className="text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase">
              Technician & Partner Digital File Management System
            </p>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Windows 64-bit Local Station · Authenticated Office Access
          </p>
        </div>

        {/* Temporary Password Change Form if required */}
        {mustChangePasswordUser ? (
          <form onSubmit={handleExecuteChangePassword} className="space-y-4 text-xs font-mono">
            <div className="p-3 bg-amber-950/70 border border-amber-800 rounded-lg text-amber-300 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Temporary password assigned. Please set your permanent password to continue.</span>
            </div>

            {changePasswordError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{changePasswordError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">New Permanent Password</label>
              <input
                type="password"
                required
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{isChangingPassword ? 'Updating Password...' : 'Save Password & Enter System'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Regular Login Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
            {error && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">Username / Operator ID</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter username"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-10 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs transition-colors shadow-sm cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Workstation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Security Info & Setup Options */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2.5 text-[11px] font-mono">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SHA-256 Salted Hashing Active</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setError('');
                setIsFirstRunOpen(true);
              }}
              className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 transition-colors"
            >
              <Wrench className="w-3 h-3" />
              <span>{!hasAdmin ? 'First-Run Setup' : 'Admin Provisioning'}</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed text-center">
            All authentication attempts are audited locally. Original technician and partner PDFs remain preserved in managed folder storage.
          </p>
        </div>
      </div>

      {/* First Run Administrator Setup Modal */}
      <FirstRunSetupModal
        isOpen={isFirstRunOpen}
        onClose={() => setIsFirstRunOpen(false)}
        onSetupSuccess={handleSetupSuccess}
        isMandatory={!hasAdmin}
      />
    </div>
  );
};
