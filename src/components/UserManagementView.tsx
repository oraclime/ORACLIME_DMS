import React, { useState, useMemo } from 'react';
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
  X,
  Search,
  Filter,
  Shield,
  LogOut,
  RefreshCw,
  Eye,
  Check,
  History
} from 'lucide-react';
import { UserAccount, UserRole, UserPermissions, AuditEntry } from '../types/dms';
import { StorageService, DEFAULT_ROLE_PERMISSIONS } from '../services/storageService';

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'audit'>('accounts');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  // New user form state
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('operator');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [newMustChangePassword, setNewMustChangePassword] = useState<boolean>(false);
  const [newPermissions, setNewPermissions] = useState<UserPermissions>(DEFAULT_ROLE_PERMISSIONS.operator);
  const [formError, setFormError] = useState<string>('');

  // Edit user state
  const [editFullName, setEditFullName] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('operator');
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(DEFAULT_ROLE_PERMISSIONS.operator);
  const [editError, setEditError] = useState<string>('');

  // Password reset state
  const [resetPasswordValue, setResetPasswordValue] = useState<string>('');
  const [resetConfirmValue, setResetConfirmValue] = useState<string>('');
  const [resetMustChangePassword, setResetMustChangePassword] = useState<boolean>(true);
  const [resetError, setResetError] = useState<string>('');

  // Permission Guard: Only Super Admin and authorized Administrators can manage users
  const isAuthorized = StorageService.canPerform(currentUser, 'canManageUsers');

  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950 text-slate-100">
        <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-600/50 flex items-center justify-center text-rose-400 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">
          Access Restricted: Administrator Role Required
        </h2>
        <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
          User Management is an administrative function. Your current account ({currentUser.fullName}) is assigned the <strong className="text-cyan-400 uppercase">{currentUser.role}</strong> role and does not have administrative user management permissions.
        </p>
      </div>
    );
  }

  // Handle role change in Add form to apply preset permissions
  const handleNewRoleChange = (role: UserRole) => {
    setNewRole(role);
    setNewPermissions({ ...DEFAULT_ROLE_PERMISSIONS[role] });
  };

  const handleEditRoleChange = (role: UserRole) => {
    setEditRole(role);
    setEditPermissions({ ...DEFAULT_ROLE_PERMISSIONS[role] });
  };

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
        permissions: newPermissions,
        mustChangePassword: newMustChangePassword,
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
      setNewMustChangePassword(false);
    } else {
      setFormError(result.message);
    }
  };

  const openEditModal = (u: UserAccount) => {
    setSelectedUser(u);
    setEditFullName(u.fullName);
    setEditRole(u.role);
    setEditPermissions(u.permissions || DEFAULT_ROLE_PERMISSIONS[u.role] || DEFAULT_ROLE_PERMISSIONS.operator);
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setEditError('');

    if (!editFullName.trim()) {
      setEditError('Please enter full name.');
      return;
    }

    const updated: UserAccount = {
      ...selectedUser,
      fullName: editFullName.trim(),
      role: editRole,
      permissions: editPermissions,
    };

    StorageService.updateUser(updated, currentUser);
    showToast(`User '${updated.username}' profile updated.`);
    setUsers(StorageService.getUsers());
    onRefreshUsers();
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };

  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setResetError('');

    if (resetPasswordValue !== resetConfirmValue) {
      setResetError('Passwords do not match.');
      return;
    }

    const result = await StorageService.resetUserPassword(
      selectedUser.id,
      resetPasswordValue,
      currentUser,
      resetMustChangePassword
    );

    if (result.success) {
      showToast(result.message);
      setIsResetModalOpen(false);
      setSelectedUser(null);
      setResetPasswordValue('');
      setResetConfirmValue('');
    } else {
      setResetError(result.message);
    }
  };

  const confirmToggleStatus = (u: UserAccount) => {
    setSelectedUser(u);
    setIsDeactivateConfirmOpen(true);
  };

  const handleExecuteToggleStatus = () => {
    if (!selectedUser) return;
    const result = StorageService.toggleUserStatus(selectedUser.id, currentUser);
    showToast(result.message);
    setUsers(StorageService.getUsers());
    onRefreshUsers();
    setIsDeactivateConfirmOpen(false);
    setSelectedUser(null);
  };

  const handleForceRevokeSession = (u: UserAccount) => {
    StorageService.logAudit(
      `${currentUser.fullName} (${currentUser.username})`,
      'Session Revoked',
      `Forced session revocation for user account '${u.username}'.`
    );
    showToast(`Session revoked for '${u.username}'.`);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter(u => {
      const matchQuery = 
        !q || 
        u.username.toLowerCase().includes(q) || 
        u.fullName.toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchQuery && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Auth & user audit entries
  const userAuditEntries = useMemo(() => {
    const all = StorageService.getAuditLog();
    return all.filter(a => 
      a.action.toLowerCase().includes('user') ||
      a.action.toLowerCase().includes('login') ||
      a.action.toLowerCase().includes('password') ||
      a.action.toLowerCase().includes('session') ||
      a.action.toLowerCase().includes('pin') ||
      a.action.toLowerCase().includes('system initialized')
    );
  }, [users]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] bg-slate-950 text-slate-100 overflow-y-auto font-sans">
      {/* Top Header */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
              User & Access Control Management
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Role-Based Access Control (RBAC) · Super Admin, Administrator & Operator permissions with salted SHA-256 hashes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveSubTab('accounts')}
              className={`px-3 py-1 rounded transition-colors ${activeSubTab === 'accounts' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Accounts ({users.length})
            </button>
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`px-3 py-1 rounded transition-colors ${activeSubTab === 'audit' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Security Audit ({userAuditEntries.length})
            </button>
          </div>

          <button
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Application User</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {activeSubTab === 'accounts' ? (
          <>
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user by username or full name..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Role:</span>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="all">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="administrator">Administrator</option>
                    <option value="operator">Authorized Operator</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">Username</th>
                      <th className="py-3.5 px-4 font-bold">Full Name</th>
                      <th className="py-3.5 px-4 font-bold">Role</th>
                      <th className="py-3.5 px-4 font-bold">Permissions</th>
                      <th className="py-3.5 px-4 font-bold">Account Status</th>
                      <th className="py-3.5 px-4 font-bold">Created Date</th>
                      <th className="py-3.5 px-4 font-bold">Last Login</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 font-mono">
                          No user accounts matched the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isCurrent = u.id === currentUser.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                              {u.username}
                              {isCurrent && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px]">
                                  Active Session
                                </span>
                              )}
                              {u.mustChangePassword && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px]" title="Temporary password assigned">
                                  Pwd Reset Required
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-white">
                              {u.fullName}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {u.role === 'super_admin' ? (
                                <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-700/60 text-purple-300 font-bold text-[10px] uppercase">
                                  Super Admin
                                </span>
                              ) : u.role === 'administrator' ? (
                                <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700/60 text-blue-300 font-bold text-[10px] uppercase">
                                  Admin
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium text-[10px] uppercase">
                                  Operator
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-[11px] font-mono text-slate-400">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {u.role === 'super_admin' ? (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-900 text-[10px]">
                                    Full Access
                                  </span>
                                ) : (
                                  <>
                                    {u.permissions?.canManageUsers && (
                                      <span className="px-1 py-0.2 rounded bg-slate-800 text-cyan-300 text-[10px]">Users</span>
                                    )}
                                    {u.permissions?.canEditRecords && (
                                      <span className="px-1 py-0.2 rounded bg-slate-800 text-emerald-300 text-[10px]">Edit</span>
                                    )}
                                    {u.permissions?.canDeleteRecords && (
                                      <span className="px-1 py-0.2 rounded bg-slate-800 text-rose-300 text-[10px]">Del</span>
                                    )}
                                    {u.permissions?.canVerifyDocuments && (
                                      <span className="px-1 py-0.2 rounded bg-slate-800 text-blue-300 text-[10px]">Verify</span>
                                    )}
                                    {u.permissions?.canExportBackup && (
                                      <span className="px-1 py-0.2 rounded bg-slate-800 text-amber-300 text-[10px]">Backup</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
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
                            <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                              {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => openEditModal(u)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono border border-slate-700 transition-colors cursor-pointer"
                                title="Edit user details and permissions"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setResetPasswordValue('');
                                  setResetConfirmValue('');
                                  setResetMustChangePassword(true);
                                  setResetError('');
                                  setIsResetModalOpen(true);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono border border-slate-700 transition-colors cursor-pointer"
                                title="Reset Password"
                              >
                                Reset Pwd
                              </button>

                              <button
                                onClick={() => confirmToggleStatus(u)}
                                disabled={isCurrent}
                                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                                  u.status === 'active'
                                    ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 disabled:opacity-30'
                                    : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60'
                                }`}
                                title={isCurrent ? 'Cannot deactivate currently active account' : 'Toggle status'}
                              >
                                {u.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>

                              <button
                                onClick={() => handleForceRevokeSession(u)}
                                className="px-2 py-1 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded text-[11px] font-mono border border-slate-700 transition-colors cursor-pointer"
                                title="Revoke Session / Force Logout"
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Role Architecture Reference Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="font-bold text-purple-400 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Super Admin</span>
                </h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Supreme system authority. Unconditional access to User Management, role assignments, security PIN overrides, disaster recovery, and database backups.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Administrator</span>
                </h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Operational administrator. Manages technician & partner dossiers, imports and reviews PDFs, verifies documents, and manages users according to granted permissions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-300 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Authorized Operator</span>
                </h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Field intake & document inspection officer. Performs dossier searches, inspects OCR confidence, and views attachments with security PIN clearance.
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Security & Authentication Audit Log */
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-md">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Authentication & Account Event Audit Log
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Immutable chronological security events
              </span>
            </div>

            <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto font-mono text-xs">
              {userAuditEntries.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No security audit events recorded.</div>
              ) : (
                userAuditEntries.map((entry) => (
                  <div key={entry.id} className="p-3.5 hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-300">{entry.action}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400 font-semibold">{entry.actor}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed font-sans">{entry.details}</p>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Create Authorized User */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Create Authorized Application User
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Username / User ID <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. rajesh_verif"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Full Name & Station Designation <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar (Office Operator)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-sans text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">System Role <span className="text-rose-400">*</span></label>
                <select
                  value={newRole}
                  onChange={(e) => handleNewRoleChange(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                >
                  <option value="operator">Authorized Operator (Record Inspection & Verification)</option>
                  <option value="administrator">Administrator (Operations & Dossier Management)</option>
                  {currentUser.role === 'super_admin' && (
                    <option value="super_admin">Super Admin (Full Unrestricted System Authority)</option>
                  )}
                </select>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase">
                  Explicit System Permissions:
                </label>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canManageUsers}
                      onChange={(e) => setNewPermissions(p => ({ ...p, canManageUsers: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Manage Users</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canEditRecords}
                      onChange={(e) => setNewPermissions(p => ({ ...p, canEditRecords: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Edit Records</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canDeleteRecords}
                      onChange={(e) => setNewPermissions(p => ({ ...p, canDeleteRecords: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Delete Records</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canVerifyDocuments}
                      onChange={(e) => setNewPermissions(p => ({ ...p, canVerifyDocuments: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Verify Documents</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canExportBackup}
                      onChange={(e) => setNewPermissions(p => ({ ...p, canExportBackup: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Export & Backup</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canUnmaskAadhaar}
                      onChange={(e) => setNewPermissions(p => ({ ...p, canUnmaskAadhaar: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Unmask Aadhaar</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Password <span className="text-rose-400">*</span></label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Confirm Password <span className="text-rose-400">*</span></label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Temporary password option */}
              <label className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newMustChangePassword}
                  onChange={(e) => setNewMustChangePassword(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                />
                <span className="text-xs text-slate-300">
                  Temporary password: Require user to change password upon first sign in
                </span>
              </label>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit User & Permissions */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Edit User Details & Permissions
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-slate-400">Username (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={selectedUser.username}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Full Name & Station Designation</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Assigned System Role</label>
                <select
                  value={editRole}
                  onChange={(e) => handleEditRoleChange(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                >
                  <option value="operator">Authorized Operator</option>
                  <option value="administrator">Administrator</option>
                  {currentUser.role === 'super_admin' && (
                    <option value="super_admin">Super Admin</option>
                  )}
                </select>
              </div>

              {/* Explicit Permissions */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase">
                  Explicit System Permissions:
                </label>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canManageUsers}
                      onChange={(e) => setEditPermissions(p => ({ ...p, canManageUsers: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Manage Users</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canEditRecords}
                      onChange={(e) => setEditPermissions(p => ({ ...p, canEditRecords: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Edit Records</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canDeleteRecords}
                      onChange={(e) => setEditPermissions(p => ({ ...p, canDeleteRecords: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Delete Records</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canVerifyDocuments}
                      onChange={(e) => setEditPermissions(p => ({ ...p, canVerifyDocuments: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Verify Documents</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canExportBackup}
                      onChange={(e) => setEditPermissions(p => ({ ...p, canExportBackup: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Export & Backup</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canUnmaskAadhaar}
                      onChange={(e) => setEditPermissions(p => ({ ...p, canUnmaskAadhaar: e.target.checked }))}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                    />
                    <span className="text-slate-300">Unmask Aadhaar</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Password */}
      {isResetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Administrative Password Reset
                </h3>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Resetting password for: <strong className="text-cyan-300 font-bold">{selectedUser.username}</strong> ({selectedUser.fullName})
            </p>

            {resetError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleExecutePasswordReset} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">New Password <span className="text-rose-400">*</span></label>
                <input
                  type="password"
                  required
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Confirm New Password <span className="text-rose-400">*</span></label>
                <input
                  type="password"
                  required
                  value={resetConfirmValue}
                  onChange={(e) => setResetConfirmValue(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetMustChangePassword}
                  onChange={(e) => setResetMustChangePassword(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-600"
                />
                <span className="text-xs text-slate-300">
                  Require user to change password after logging in with this temporary password
                </span>
              </label>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Deactivation Confirmation */}
      {isDeactivateConfirmOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white uppercase font-mono">
                Confirm Account Status Change
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Are you sure you want to {selectedUser.status === 'active' ? 'deactivate' : 'activate'} the account for{' '}
              <strong className="text-white font-mono">{selectedUser.username}</strong> ({selectedUser.fullName})?
              {selectedUser.status === 'active' && (
                <span className="block mt-2 text-rose-300">
                  Deactivated users cannot log in to the ORACLIME DMS system or access any dossiers.
                </span>
              )}
            </p>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeactivateConfirmOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteToggleStatus}
                className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                  selectedUser.status === 'active'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {selectedUser.status === 'active' ? 'Confirm Deactivation' : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
