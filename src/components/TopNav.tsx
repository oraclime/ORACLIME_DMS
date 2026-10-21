import React from 'react';
import { 
  Search, 
  UploadCloud, 
  CheckSquare, 
  FolderArchive,
  FolderTree, 
  Database, 
  Lock, 
  Users, 
  LogOut, 
  KeyRound,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { SystemSettings, UserAccount } from '../types/dms';

interface TopNavProps {
  activeTab: 'dashboard' | 'import' | 'review' | 'existing_files' | 'explorer' | 'database' | 'users';
  setActiveTab: (tab: 'dashboard' | 'import' | 'review' | 'existing_files' | 'explorer' | 'database' | 'users') => void;
  settings: SystemSettings;
  currentUser: UserAccount;
  onLockSystem: () => void;
  onOpenQuickSearch: () => void;
  onOpenChangePin: () => void;
  onLogout: () => void;
  pendingReviewCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  settings,
  currentUser,
  onLockSystem,
  onOpenQuickSearch,
  onOpenChangePin,
  onLogout,
  pendingReviewCount,
}) => {
  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'administrator';

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-6 px-6 py-2.5 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className="text-left group flex items-center gap-2 cursor-pointer focus:outline-none"
        >
          <div className="w-8 h-8 rounded bg-cyan-600 flex items-center justify-center font-bold text-white tracking-wider text-sm shadow-inner">
            OL
          </div>
          <div className="leading-tight">
            <span className="text-base font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors whitespace-nowrap">
              ORACLIME
            </span>
            <span className="block text-[10px] font-mono text-cyan-400 tracking-wider">
              TECH & PARTNER DMS · WIN64 LOCAL
            </span>
          </div>
        </button>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden lg:flex items-center gap-1 text-xs font-medium">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search & Records</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'import'
              ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Import PDFs</span>
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 relative ${
            activeTab === 'review'
              ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>OCR Review</span>
          {pendingReviewCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono rounded font-bold">
              {pendingReviewCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('existing_files')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'existing_files'
              ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Existing Files</span>
        </button>

        <button
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'explorer'
              ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Folder Explorer</span>
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'database'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Database & Backup</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'users'
                  ? 'bg-slate-800 text-cyan-400 font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>User Management</span>
            </button>
          </>
        )}
      </nav>

      {/* Zone 3: User Profile & Security Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenQuickSearch}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors whitespace-nowrap font-mono"
          title="Search by Application Number (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span>App No.</span>
          <kbd className="px-1.5 py-0.2 bg-slate-800 text-slate-400 text-[10px] rounded border border-slate-700">
            Ctrl+K
          </kbd>
        </button>

        {/* User Info Capsule */}
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
          <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="leading-tight text-left">
            <span className="text-white font-bold block truncate max-w-[110px]">
              {currentUser.fullName}
            </span>
            <span className="text-[10px] text-slate-400 uppercase">
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Change Security PIN Button */}
        <button
          onClick={onOpenChangePin}
          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
          title="Change Operator Security PIN"
        >
          <KeyRound className="w-4 h-4" />
        </button>

        {/* Lock Screen Button */}
        <button
          onClick={onLockSystem}
          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
          title="Lock Workstation (Ctrl+L)"
        >
          <Lock className="w-4 h-4" />
        </button>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
