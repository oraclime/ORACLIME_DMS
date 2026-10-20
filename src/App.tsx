/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TechnicianRecord, SystemSettings, AttachedDocument, UserAccount } from './types/dms';
import { StorageService } from './services/storageService';
import { TopNav } from './components/TopNav';
import { SearchDashboard } from './components/SearchDashboard';
import { ImportWorkflowModal } from './components/ImportWorkflowModal';
import { VerificationQueue } from './components/VerificationQueue';
import { ExistingFilesManager } from './components/ExistingFilesManager';
import { FolderStructureExplorer } from './components/FolderStructureExplorer';
import { BackupManagerModal } from './components/BackupManagerModal';
import { UserManagementView } from './components/UserManagementView';
import { TechnicianProfileModal } from './components/TechnicianProfileModal';
import { SecurityLockScreen, AadhaarUnlockModal, ChangePinModal } from './components/SecurityLockScreen';
import { QuickSearchModal } from './components/QuickSearchModal';
import { LoginScreen } from './components/LoginScreen';
import { NewTechnicianModal } from './components/NewTechnicianModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => StorageService.getCurrentUser());
  const [technicians, setTechnicians] = useState<TechnicianRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(() => StorageService.getSettings());
  
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'import' | 'review' | 'existing_files' | 'explorer' | 'database' | 'users'
  >('dashboard');
  
  // Selected technician for profile view
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianRecord | null>(null);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isNewTechnicianModalOpen, setIsNewTechnicianModalOpen] = useState<boolean>(false);
  const [targetTechForAppend, setTargetTechForAppend] = useState<TechnicianRecord | null>(null);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>('');

  // Security, Lock & PIN state
  const [isSystemLocked, setIsSystemLocked] = useState<boolean>(false);
  const [isAadhaarUnlocked, setIsAadhaarUnlocked] = useState<boolean>(false);
  const [isAadhaarUnlockModalOpen, setIsAadhaarUnlockModalOpen] = useState<boolean>(false);
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState<boolean>(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Reload data
  const refreshTechnicians = useCallback(() => {
    const loadedTechs = StorageService.getTechnicians();
    setTechnicians(loadedTechs);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    refreshTechnicians();
  }, [refreshTechnicians]);

  // Inactivity Auto-Screen Lock Timer
  const lastActivityRef = useRef<number>(Date.now());
  useEffect(() => {
    if (!currentUser || isSystemLocked) return;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    const interval = setInterval(() => {
      const timeoutMs = (settings.autoLockMinutes || 15) * 60 * 1000;
      if (Date.now() - lastActivityRef.current > timeoutMs) {
        setIsSystemLocked(true);
        setIsAadhaarUnlocked(false); // Relock unmasked Aadhaar
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      clearInterval(interval);
    };
  }, [currentUser, isSystemLocked, settings.autoLockMinutes]);

  // Global Keyboard Shortcuts (Ctrl+K for search, Ctrl+L for screen lock)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsSystemLocked(true);
        setIsAadhaarUnlocked(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleUpdateTechnician = (updated: TechnicianRecord, note?: string) => {
    const actorName = currentUser ? `${currentUser.fullName} (${currentUser.username})` : 'System';
    const saved = StorageService.updateTechnician(updated, note, actorName);
    refreshTechnicians();
    setSelectedTechnician(saved);
    showToast(note || `Technician record ${saved.applicationNumber} updated.`);
  };

  const handleImportComplete = (saved: TechnicianRecord) => {
    refreshTechnicians();
    showToast(`PDF document imported and indexed for ${saved.applicationNumber}.`);
    setSelectedTechnician(saved);
  };

  const handleTechnicianCreated = (saved: TechnicianRecord) => {
    refreshTechnicians();
    showToast(`Registered technician ${saved.applicationNumber} (${saved.fullName}).`);
    setSelectedTechnician(saved);
  };

  const handleOpenAppendDocument = (tech: TechnicianRecord) => {
    setTargetTechForAppend(tech);
    setIsImportModalOpen(true);
  };

  const handleSelectTechnicianFromFolder = (tech: TechnicianRecord, doc: AttachedDocument) => {
    setSelectedTechnician(tech);
  };

  const handleRestoreCompleted = (count: number) => {
    refreshTechnicians();
    setSettings(StorageService.getSettings());
    showToast(`Restored ${count} technician records from backup archive.`);
  };

  const handleLogout = () => {
    StorageService.logout();
    setCurrentUser(null);
    setIsAadhaarUnlocked(false);
    setIsSystemLocked(false);
    setActiveTab('dashboard');
  };

  // If not authenticated, render Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const pendingReviewCount = technicians.filter(
    t => t.status === 'pending_review' || t.status === 'flagged_handwritten'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Security Full-Screen Lock if locked */}
      {isSystemLocked && (
        <SecurityLockScreen
          settings={settings}
          currentUser={currentUser}
          onUnlock={() => setIsSystemLocked(false)}
        />
      )}

      {/* Top Header conforming to Top Bar Contract */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        currentUser={currentUser}
        onLockSystem={() => {
          setIsSystemLocked(true);
          setIsAadhaarUnlocked(false);
        }}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        onOpenChangePin={() => setIsChangePinModalOpen(true)}
        onLogout={handleLogout}
        pendingReviewCount={pendingReviewCount}
      />

      {/* Toast Notification Bar */}
      {toastMessage && (
        <div className="fixed top-14 right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2.5 bg-slate-900 border border-cyan-500/60 rounded-lg shadow-xl text-xs font-mono text-cyan-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'dashboard' && (
          <SearchDashboard
            technicians={technicians}
            onSelectTechnician={(t) => setSelectedTechnician(t)}
            onOpenImport={() => {
              setTargetTechForAppend(null);
              setIsImportModalOpen(true);
            }}
            onOpenNewTechnician={() => setIsNewTechnicianModalOpen(true)}
            onOpenReview={() => setActiveTab('review')}
            onOpenBackup={() => setActiveTab('database')}
            quickSearchQuery={quickSearchQuery}
            setQuickSearchQuery={setQuickSearchQuery}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'import' && (
          <div className="flex-1 flex flex-col">
            <SearchDashboard
              technicians={technicians}
              onSelectTechnician={(t) => setSelectedTechnician(t)}
              onOpenImport={() => {
                setTargetTechForAppend(null);
                setIsImportModalOpen(true);
              }}
              onOpenNewTechnician={() => setIsNewTechnicianModalOpen(true)}
              onOpenReview={() => setActiveTab('review')}
              onOpenBackup={() => setActiveTab('database')}
              quickSearchQuery={quickSearchQuery}
              setQuickSearchQuery={setQuickSearchQuery}
              currentUser={currentUser}
            />
            <ImportWorkflowModal
              isOpen={true}
              onClose={() => setActiveTab('dashboard')}
              onImportComplete={handleImportComplete}
              targetTechnicianForAppend={null}
              currentUser={currentUser}
            />
          </div>
        )}

        {activeTab === 'review' && (
          <VerificationQueue
            technicians={technicians}
            onUpdateTechnician={handleUpdateTechnician}
            isAadhaarUnlocked={isAadhaarUnlocked}
            onRequestUnlockAadhaar={() => setIsAadhaarUnlockModalOpen(true)}
            onSelectTechnician={(t) => setSelectedTechnician(t)}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'existing_files' && (
          <ExistingFilesManager
            technicians={technicians}
            currentUser={currentUser}
            onRefreshData={refreshTechnicians}
            showToast={showToast}
            isAadhaarUnlocked={isAadhaarUnlocked}
            onRequestUnlockAadhaar={() => setIsAadhaarUnlockModalOpen(true)}
            onSelectTechnician={(t) => setSelectedTechnician(t)}
          />
        )}

        {activeTab === 'explorer' && (
          <FolderStructureExplorer
            technicians={technicians}
            settings={settings}
            onSelectTechnicianDoc={handleSelectTechnicianFromFolder}
            isAadhaarUnlocked={isAadhaarUnlocked}
            onRequestUnlockAadhaar={() => setIsAadhaarUnlockModalOpen(true)}
          />
        )}

        {activeTab === 'database' && (
          <BackupManagerModal
            technicians={technicians}
            settings={settings}
            currentUser={currentUser}
            onUpdateSettings={(newSettings) => setSettings(newSettings)}
            onRestoreCompleted={handleRestoreCompleted}
            showToast={showToast}
          />
        )}

        {activeTab === 'users' && (
          <UserManagementView
            currentUser={currentUser}
            onRefreshUsers={refreshTechnicians}
            showToast={showToast}
          />
        )}
      </main>

      {/* Technician Profile Modal */}
      {selectedTechnician && (
        <TechnicianProfileModal
          technician={selectedTechnician}
          isOpen={!!selectedTechnician}
          onClose={() => setSelectedTechnician(null)}
          onUpdateTechnician={handleUpdateTechnician}
          isAadhaarUnlocked={isAadhaarUnlocked}
          onRequestUnlockAadhaar={() => setIsAadhaarUnlockModalOpen(true)}
          onOpenAddDocument={handleOpenAppendDocument}
          currentUser={currentUser}
        />
      )}

      {/* PDF Import Workflow Modal */}
      <ImportWorkflowModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setTargetTechForAppend(null);
        }}
        onImportComplete={handleImportComplete}
        targetTechnicianForAppend={targetTechForAppend}
        currentUser={currentUser}
      />

      {/* Direct New Technician Registration Modal */}
      <NewTechnicianModal
        isOpen={isNewTechnicianModalOpen}
        onClose={() => setIsNewTechnicianModalOpen(false)}
        onTechnicianCreated={handleTechnicianCreated}
        currentUser={currentUser}
      />

      {/* Quick Search Palette (Ctrl+K) */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        technicians={technicians}
        onSelectTechnician={(t) => setSelectedTechnician(t)}
      />

      {/* Aadhaar PIN Unlock Modal */}
      <AadhaarUnlockModal
        isOpen={isAadhaarUnlockModalOpen}
        onClose={() => setIsAadhaarUnlockModalOpen(false)}
        onSuccess={() => {
          setIsAadhaarUnlocked(true);
          showToast('Security clearance approved. Aadhaar unmasked for active session.');
        }}
      />

      {/* Change Security PIN Modal */}
      <ChangePinModal
        isOpen={isChangePinModalOpen}
        onClose={() => setIsChangePinModalOpen(false)}
        currentUser={currentUser}
        showToast={showToast}
      />
    </div>
  );
}
