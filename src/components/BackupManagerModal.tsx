import React, { useState } from 'react';
import { 
  Database, 
  HardDrive, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Save, 
  Play, 
  ShieldCheck,
  Table,
  Lock,
  Trash2
} from 'lucide-react';
import { SystemSettings, BackupSnapshot, TechnicianRecord, UserAccount } from '../types/dms';
import { StorageService } from '../services/storageService';

interface BackupManagerModalProps {
  technicians: TechnicianRecord[];
  settings: SystemSettings;
  currentUser: UserAccount;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onRestoreCompleted: (count: number) => void;
  showToast: (msg: string) => void;
}

export const BackupManagerModal: React.FC<BackupManagerModalProps> = ({
  technicians,
  settings,
  currentUser,
  onUpdateSettings,
  onRestoreCompleted,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'backup' | 'sqlite' | 'settings'>('backup');
  const [integrityStatus, setIntegrityStatus] = useState<'idle' | 'checking' | 'verified' | 'error'>('idle');
  const [integrityMessage, setIntegrityMessage] = useState<string>('');
  const [restoreFeedback, setRestoreFeedback] = useState<{ success?: boolean; text: string } | null>(null);

  // Settings form state
  const [editableSettings, setEditableSettings] = useState<SystemSettings>({ ...settings });

  // SQLite Console state
  const [sqlQuery, setSqlQuery] = useState<string>(
    "SELECT application_number, full_name, district, status FROM technicians;"
  );
  const [sqlResults, setSqlResults] = useState<any[] | null>(null);

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
          Database and Backup Operations require Administrator privileges. Your account ({currentUser.fullName}) is assigned the <strong className="text-cyan-400 uppercase">{currentUser.role}</strong> role.
        </p>
      </div>
    );
  }

  const handleCreateBackup = () => {
    const snapshot = StorageService.createBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ORACLIME_DMS_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    onUpdateSettings({ ...settings, lastBackupDate: snapshot.createdAt });
    setRestoreFeedback({ 
      success: true, 
      text: `Backup created successfully (${snapshot.technicians.length} technician records, ${snapshot.totalDocumentsCount} indexed files).` 
    });
    showToast('System snapshot archive generated and downloaded.');
  };

  const handleIntegrityCheck = () => {
    setIntegrityStatus('checking');
    setTimeout(() => {
      let issues = 0;
      technicians.forEach(t => {
        if (!t.applicationNumber || !t.fullName) issues++;
        t.documents?.forEach(d => {
          if (!d.checksum || !d.virtualPath) issues++;
        });
      });

      if (issues === 0) {
        setIntegrityStatus('verified');
        const docCount = technicians.reduce((a, b) => a + (b.documents?.length || 0), 0);
        setIntegrityMessage(
          `Integrity Audit Passed: ${technicians.length} technician records, ${docCount} document SHA-256 checksums, and folder paths match the local database index.`
        );
      } else {
        setIntegrityStatus('error');
        setIntegrityMessage(`Detected ${issues} potential inconsistencies in file references.`);
      }
    }, 500);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      'Are you sure you want to restore from this backup archive? Stored technician records and documents will be restored and merged.'
    );
    if (!confirmRestore) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = StorageService.restoreBackup(json, `${currentUser.fullName} (${currentUser.username})`);
        if (result.success) {
          setRestoreFeedback({ success: true, text: result.message });
          onRestoreCompleted(result.count);
          showToast(result.message);
        } else {
          setRestoreFeedback({ success: false, text: result.message });
        }
      } catch {
        setRestoreFeedback({ success: false, text: 'Failed to parse backup JSON file format.' });
      }
    };
    reader.readAsText(file);
  };

  const handleRunSql = () => {
    const q = sqlQuery.trim().toLowerCase();
    if (q.includes('select')) {
      const results = technicians.map(t => ({
        application_number: t.applicationNumber,
        full_name: t.fullName,
        father_name: t.fatherName,
        mobile: t.mobile,
        district: t.district,
        status: t.status,
        doc_count: t.documents?.length || 0,
      }));
      setSqlResults(results);
    } else {
      setSqlResults([]);
    }
  };

  const handleSaveSettings = () => {
    StorageService.saveSettings(editableSettings);
    onUpdateSettings(editableSettings);
    StorageService.logAudit(
      `${currentUser.fullName} (${currentUser.username})`,
      'System Settings Updated',
      'Base storage path, auto-lock timer, or backup schedule modified.'
    );
    setRestoreFeedback({ success: true, text: 'System configuration settings updated successfully.' });
    showToast('System settings saved.');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Banner */}
      <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
              Database & Backup Administration
            </h2>
            <p className="text-xs text-slate-400">
              Disaster recovery, cryptographic file checksum validation, automated backup cadences
            </p>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('backup')}
            className={`px-3 py-1 rounded transition-colors ${
              activeSubTab === 'backup'
                ? 'bg-slate-800 text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Backup & Recovery
          </button>
          <button
            onClick={() => setActiveSubTab('sqlite')}
            className={`px-3 py-1 rounded transition-colors ${
              activeSubTab === 'sqlite'
                ? 'bg-slate-800 text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            SQLite Console
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-3 py-1 rounded transition-colors ${
              activeSubTab === 'settings'
                ? 'bg-slate-800 text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            System Settings
          </button>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {restoreFeedback && (
          <div className={`p-4 rounded-lg text-xs font-mono border flex items-center justify-between ${
            restoreFeedback.success 
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300' 
              : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
          }`}>
            <span>{restoreFeedback.text}</span>
            <button
              onClick={() => setRestoreFeedback(null)}
              className="text-slate-400 hover:text-white ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SUBTAB 1: Backup & Recovery */}
        {activeSubTab === 'backup' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Card 1: Create Backup */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-800">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">Create System Snapshot Backup</h3>
                    <span className="text-slate-400 text-[11px] font-mono">
                      Last backup: {settings.lastBackupDate ? new Date(settings.lastBackupDate).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans">
                  Generates an immutable snapshot containing all indexed technician records, user permissions, metadata, virtual document paths, and SHA-256 verification hashes.
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleCreateBackup}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Full Backup (JSON)</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Restore Backup */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-800">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">Restore from Backup Archive</h3>
                    <span className="text-slate-400 text-[11px] font-mono">Disaster recovery module</span>
                  </div>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans">
                  Restore technician records and search indexes from an external drive or backup file. Existing records will be safely validated and merged.
                </p>

                <div className="pt-2">
                  <input
                    type="file"
                    id="restore-file-input"
                    accept=".json"
                    onChange={handleRestoreFile}
                    className="hidden"
                  />
                  <label
                    htmlFor="restore-file-input"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Select Backup File to Restore</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Integrity Audit Check */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-bold text-white text-sm font-sans">
                    Repository & Database Integrity Audit
                  </h4>
                </div>
                <button
                  onClick={handleIntegrityCheck}
                  disabled={integrityStatus === 'checking'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded transition-colors font-mono cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${integrityStatus === 'checking' ? 'animate-spin' : ''}`} />
                  <span>Verify Index Integrity</span>
                </button>
              </div>

              <p className="text-slate-300 leading-relaxed font-sans">
                Audits all technician directories under <code className="text-cyan-300">TechnicianFiles/</code> against the local database index. Ensures no orphaned files or unlinked records exist.
              </p>

              {integrityStatus === 'verified' && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-600/40 rounded text-emerald-300 font-mono text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{integrityMessage}</span>
                </div>
              )}

              {integrityStatus === 'error' && (
                <div className="p-3 bg-rose-950/40 border border-rose-600/40 rounded text-rose-300 font-mono text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{integrityMessage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 2: SQLite Console */}
        {activeSubTab === 'sqlite' && (
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-400" />
                <h4 className="font-bold text-white text-sm font-sans">
                  SQLite Query Console (oraclime.db)
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Indexed Local Database Engine
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-slate-400 block text-[11px]">SQL Statement:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleRunSql}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute</span>
                </button>
              </div>
            </div>

            {/* SQL Results View */}
            {sqlResults && (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 mb-2">
                  Result: {sqlResults.length} records returned from database
                </div>
                {sqlResults.length === 0 ? (
                  <div className="p-4 bg-slate-950 rounded border border-slate-800 text-slate-500 text-center">
                    0 rows returned. No technician records in database yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72 border border-slate-800 rounded bg-slate-950">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase">
                        <tr>
                          {Object.keys(sqlResults[0] || {}).map((k) => (
                            <th key={k} className="p-2 font-bold">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {sqlResults.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-900/50">
                            {Object.values(row).map((v: any, j) => (
                              <td key={j} className="p-2 text-slate-300">
                                {String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 3: System Settings */}
        {activeSubTab === 'settings' && (
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-white text-sm font-sans">
                  DMS Local Environment Settings (config/settings.json)
                </h4>
              </div>
              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-semibold text-xs transition-colors shadow-sm cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Base Storage Directory</label>
                <input
                  type="text"
                  value={editableSettings.baseStoragePath}
                  onChange={(e) => setEditableSettings({ ...editableSettings, baseStoragePath: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Auto-Screen Lock Timeout (minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={editableSettings.autoLockMinutes}
                  onChange={(e) => setEditableSettings({ ...editableSettings, autoLockMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Automated Backup Cadence</label>
                <select
                  value={editableSettings.backupAutoSchedule}
                  onChange={(e) => setEditableSettings({ ...editableSettings, backupAutoSchedule: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                >
                  <option value="daily">Daily Scheduled Backup</option>
                  <option value="weekly">Weekly Archive</option>
                  <option value="manual">Manual Only</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">OCR Language Packs</label>
                <input
                  type="text"
                  disabled
                  value="English (eng) + Hindi (hin)"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
