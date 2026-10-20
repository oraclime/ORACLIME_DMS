import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Edit3, 
  Lock, 
  Clock, 
  Save, 
  X 
} from 'lucide-react';
import { UserAccount, UserRole } from '../types/dms';
import { StorageService } from '../services/storageService';

interface UserManagementViewProps {
  currentUser: UserAccount;
  onRefreshUsers: () => void;
  showToast: (msg: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  onRefreshUsers,
  showToast,
}) => {
  const [users, setUsers] = useState<UserAccount[]>(StorageService.getUsers());
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserAccount | null>(null);

  // New user form state
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('operator');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Password reset state
  const [resetPasswordValue, setResetPasswordValue] = useState<string>('');
  const [resetConfirmValue, setResetConfirmValue] = useState<string>('');
  const [resetError, setResetError] = useState<string>('');

  // Permission Guard
  if (currentUser.role !== 'administrator') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950 text-slate-100">
        <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-600/50 flex items-center justify-center text-rose-400 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">
          Access Restricted: Administrator Role Required
        </h2>
        <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
          User Management is an administrative function. Your current account ({currentUser.fullName}) is assigned the <strong className="text-cyan-400 uppercase">{currentUser.role}</strong> role and does not have administrative privileges.
        </p>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    const result = await StorageService.createUser(
      {
        username: newUsername,
        fullName: newFullName,
        role: newRole,
        password: newPassword,
      },
      currentUser
    );

    if (result.success) {
      showToast(result.message);
      setUsers(StorageService.getUsers());
      onRefreshUsers();
      setIsAddModalOpen(false);
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setFormError(result.message);
    }
  };

  const handleToggleStatus = (targetUser: UserAccount) => {
    const result = StorageService.toggleUserStatus(targetUser.id, currentUser);
    if (result.success) {
      showToast(result.message);
      setUsers(StorageService.getUsers());
      onRefreshUsers();
    } else {
      showToast(result.message);
    }
  };

  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    setResetError('');

    if (resetPasswordValue !== resetConfirmValue) {
      setResetError('Passwords do not match.');
      return;
    }

    const result = await StorageService.resetUserPassword(
      selectedUserForReset.id,
      resetPasswordValue,
      currentUser
    );

    if (result.success) {
      showToast(result.message);
      setIsResetModalOpen(false);
      setSelectedUserForReset(null);
      setResetPasswordValue('');
      setResetConfirmValue('');
    } else {
      setResetError(result.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Header */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              User & Access Control Management
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Role-Based Access Control (RBAC) · Passwords stored with SHA-256 cryptographic salts
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors shadow-sm cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Authorized User</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Users Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-md">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Configured Accounts ({users.length})
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Logged in as: <strong className="text-cyan-400">{currentUser.fullName}</strong> (Administrator)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Username</th>
                  <th className="py-3 px-4 font-bold">Full Name</th>
                  <th className="py-3 px-4 font-bold">Role</th>
                  <th className="py-3 px-4 font-bold">Account Status</th>
                  <th className="py-3 px-4 font-bold">Created Date</th>
                  <th className="py-3 px-4 font-bold">Last Activity</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                        {u.username}
                        {isCurrent && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px]">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {u.fullName}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {u.role === 'administrator' ? (
                          <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700/60 text-blue-300 font-bold text-[10px] uppercase">
                            Administrator
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium text-[10px] uppercase">
                            Operator
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {u.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setResetPasswordValue('');
                            setResetConfirmValue('');
                            setResetError('');
                            setIsResetModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-mono border border-slate-700 transition-colors cursor-pointer"
                          title="Reset Password"
                        >
                          Reset Pwd
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrent}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                            u.status === 'active'
                              ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 disabled:opacity-30'
                              : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60'
                          }`}
                          title={isCurrent ? 'Cannot deactivate currently active account' : 'Toggle status'}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Role Permissions Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Administrator Privileges</span>
            </h4>
            <ul className="text-slate-300 space-y-1 list-disc pl-4 text-[11px]">
              <li>Full access to Search & Technician Records</li>
              <li>PDF Import and OCR Verification Studio</li>
              <li>User Account Creation, Status & Password Resets</li>
              <li>Security Settings & Operator PIN Management</li>
              <li>System Backup Generation & Disaster Restore</li>
              <li>Full Immutable Audit Log Access</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-300 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span>Operator Privileges</span>
            </h4>
            <ul className="text-slate-400 space-y-1 list-disc pl-4 text-[11px]">
              <li>Instant Search by Application Number</li>
              <li>PDF Ingestion & Field Extraction Inspection</li>
              <li>Document Viewing & Verification Approval</li>
              <li>Managed Folder & Existing Document Explorer</li>
              <li>Aadhaar inspection with authorized Security PIN</li>
              <li className="text-rose-400">Restricted from User Management & System Settings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal: Add Authorized User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                <span>Create Authorized User Account</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-mono">
              {formError && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 text-[11px]">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. aman_rac"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Aman Sharma"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assigned Security Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="operator">Operator (Daily Ingestion & Verification)</option>
                  <option value="administrator">Administrator (Full System & User Control)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Password (min 6 characters)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {isResetModalOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Reset Password for {selectedUserForReset.username}</span>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePasswordReset} className="space-y-4 text-xs font-mono">
              {resetError && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 text-[11px]">
                  {resetError}
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={resetConfirmValue}
                  onChange={(e) => setResetConfirmValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-xs font-bold shadow-sm"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
