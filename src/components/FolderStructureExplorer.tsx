import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Database, 
  Settings, 
  ShieldAlert, 
  HardDrive, 
  Terminal, 
  ChevronRight, 
  ChevronDown, 
  FileCode, 
  Lock, 
  Unlock, 
  ExternalLink, 
  Trash2,
  CheckCircle2,
  Search
} from 'lucide-react';
import { TechnicianRecord, AttachedDocument, SystemSettings } from '../types/dms';

interface FolderStructureExplorerProps {
  technicians: TechnicianRecord[];
  settings: SystemSettings;
  onSelectTechnicianDoc: (tech: TechnicianRecord, doc: AttachedDocument) => void;
  isAadhaarUnlocked: boolean;
  onRequestUnlockAadhaar: () => void;
}

export const FolderStructureExplorer: React.FC<FolderStructureExplorerProps> = ({
  technicians,
  settings,
  onSelectTechnicianDoc,
  isAadhaarUnlocked,
  onRequestUnlockAadhaar,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<{ [key: string]: boolean }>({
    root: true,
    TechnicianFiles: true,
    config: true,
    database: true,
    Backups: true,
    OCR_Temp: true,
  });

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    path: string;
    sizeKb: number;
    type: string;
    details?: string;
    tech?: TechnicianRecord;
    doc?: AttachedDocument;
  } | null>(null);

  const [treeSearch, setTreeSearch] = useState<string>('');

  const toggleFolder = (key: string) => {
    setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalFiles = technicians.reduce((acc, t) => acc + (t.documents?.length || 0), 0) + 4; // plus config & db
  const totalStorage = technicians.reduce((acc, t) => acc + (t.documents?.reduce((dAcc, d) => dAcc + d.fileSizeKb, 0) || 0), 1250);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Desktop Managed Folder Structure (ORACLIME_DMS)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Location: {settings.baseStoragePath}/ · Fixed paths protect against broken database linkages
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400">Total Size:</span>{' '}
            <strong className="text-cyan-400 tabular-nums">{(totalStorage / 1024).toFixed(2)} MB</strong>
          </div>
          <div className="text-slate-700">|</div>
          <div>
            <span className="text-slate-400">Managed Files:</span>{' '}
            <strong className="text-white tabular-nums">{totalFiles}</strong>
          </div>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Directory Tree View */}
        <div className="w-1/2 md:w-2/5 lg:w-1/3 bg-slate-950 border-r border-slate-800 p-4 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
          {/* Tree Search Filter */}
          <div className="relative">
            <input
              type="text"
              value={treeSearch}
              onChange={(e) => setTreeSearch(e.target.value)}
              placeholder="Filter files or folder..."
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
          </div>

          <div className="space-y-1 select-none">
            {/* Root: ORACLIME_DMS/ */}
            <div>
              <div 
                onClick={() => toggleFolder('root')}
                className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer text-cyan-300 font-bold"
              >
                {expandedFolders['root'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                <span>ORACLIME_DMS/</span>
              </div>

              {expandedFolders['root'] && (
                <div className="pl-5 space-y-1 border-l border-slate-800/80 ml-2 mt-1">
                  {/* ORACLIME_DMS.exe */}
                  <div
                    onClick={() => setSelectedFile({
                      name: 'ORACLIME_DMS.exe',
                      path: 'ORACLIME_DMS/ORACLIME_DMS.exe',
                      sizeKb: 18432,
                      type: 'Windows Portable Executable (x86_64)',
                      details: 'Compiled Python + PySide6 runtime. Standalone offline desktop binary.',
                    })}
                    className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer text-slate-300 hover:text-white"
                  >
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ORACLIME_DMS.exe</span>
                    <span className="text-[10px] text-slate-500 ml-auto">18.4 MB</span>
                  </div>

                  {/* config/ */}
                  <div>
                    <div
                      onClick={() => toggleFolder('config')}
                      className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer text-slate-300"
                    >
                      {expandedFolders['config'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <Folder className="w-4 h-4 text-amber-400" />
                      <span>config/</span>
                    </div>
                    {expandedFolders['config'] && (
                      <div className="pl-5 border-l border-slate-800/80 ml-2">
                        <div
                          onClick={() => setSelectedFile({
                            name: 'settings.json',
                            path: 'ORACLIME_DMS/config/settings.json',
                            sizeKb: 4,
                            type: 'JSON Configuration File',
                            details: JSON.stringify(settings, null, 2),
                          })}
                          className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer text-slate-400 hover:text-white"
                        >
                          <FileCode className="w-3.5 h-3.5 text-amber-300" />
                          <span>settings.json</span>
                          <span className="text-[10px] text-slate-600 ml-auto">4 KB</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* database/ */}
                  <div>
                    <div
                      onClick={() => toggleFolder('database')}
                      className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer text-slate-300"
                    >
                      {expandedFolders['database'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <Folder className="w-4 h-4 text-blue-400" />
                      <span>database/</span>
                    </div>
                    {expandedFolders['database'] && (
                      <div className="pl-5 border-l border-slate-800/80 ml-2">
                        <div
                          onClick={() => setSelectedFile({
                            name: 'oraclime.db',
                            path: 'ORACLIME_DMS/database/oraclime.db',
                            sizeKb: 1228,
                            type: 'SQLite Database 3.x',
                            details: `Schema Tables:\n- technicians (${technicians.length} rows)\n- documents (${totalFiles - 4} rows)\n- audit_log\nIndexes: PRIMARY KEY (application_number), idx_mobile`,
                          })}
                          className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer text-slate-400 hover:text-white"
                        >
                          <Database className="w-3.5 h-3.5 text-blue-400" />
                          <span>oraclime.db</span>
                          <span className="text-[10px] text-slate-600 ml-auto">1.2 MB</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TechnicianFiles/ */}
                  <div>
                    <div
                      onClick={() => toggleFolder('TechnicianFiles')}
                      className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer text-cyan-300 font-semibold"
                    >
                      {expandedFolders['TechnicianFiles'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <FolderOpen className="w-4 h-4 text-cyan-400" />
                      <span>TechnicianFiles/</span>
                      <span className="text-[10px] text-slate-500 ml-auto font-normal">({technicians.length} folders)</span>
                    </div>

                    {expandedFolders['TechnicianFiles'] && (
                      <div className="pl-5 space-y-1 border-l border-slate-800/80 ml-2 mt-1">
                        {technicians.length === 0 ? (
                          <div className="text-[11px] text-slate-500 py-1 italic">
                            (No technician folders yet)
                          </div>
                        ) : (
                          technicians
                            .filter(tech => {
                              if (!treeSearch.trim()) return true;
                              const q = treeSearch.trim().toLowerCase();
                              return (
                                tech.applicationNumber.toLowerCase().includes(q) ||
                                tech.fullName.toLowerCase().includes(q) ||
                                tech.documents?.some(d => d.filename.toLowerCase().includes(q))
                              );
                            })
                            .map((tech) => {
                          const isExpanded = !!expandedFolders[tech.applicationNumber];
                          return (
                            <div key={tech.id}>
                              <div
                                onClick={() => toggleFolder(tech.applicationNumber)}
                                className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer text-slate-300"
                              >
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                <Folder className="w-3.5 h-3.5 text-yellow-500" />
                                <span className="font-bold text-cyan-400">{tech.applicationNumber}/</span>
                                <span className="text-[10px] text-slate-500 ml-auto">
                                  {tech.documents?.length || 0} files
                                </span>
                              </div>

                              {isExpanded && (
                                <div className="pl-5 border-l border-slate-800/80 ml-2 space-y-0.5">
                                  {tech.documents?.map((doc) => {
                                    const isAadhaar = doc.docType === 'aadhaar';
                                    return (
                                      <div
                                        key={doc.id}
                                        onClick={() => setSelectedFile({
                                          name: doc.filename,
                                          path: doc.virtualPath,
                                          sizeKb: doc.fileSizeKb,
                                          type: doc.docType,
                                          details: doc.extractedText,
                                          tech,
                                          doc,
                                        })}
                                        className={`flex items-center gap-2 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer ${
                                          selectedFile?.path === doc.virtualPath
                                            ? 'bg-slate-800 text-cyan-300'
                                            : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        <FileText className="w-3 h-3 text-slate-400" />
                                        <span className="truncate">{doc.filename}</span>
                                        {isAadhaar && (
                                          <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                        )}
                                        <span className="text-[10px] text-slate-600 ml-auto">
                                          {doc.fileSizeKb} KB
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      </div>
                    )}
                  </div>

                  {/* OCR_Temp/ */}
                  <div>
                    <div
                      onClick={() => toggleFolder('OCR_Temp')}
                      className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer text-slate-400"
                    >
                      {expandedFolders['OCR_Temp'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <Folder className="w-4 h-4 text-purple-400" />
                      <span>OCR_Temp/</span>
                      <span className="text-[10px] text-slate-600 ml-auto">0 items</span>
                    </div>
                  </div>

                  {/* Backups/ */}
                  <div>
                    <div
                      onClick={() => toggleFolder('Backups')}
                      className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-slate-900 cursor-pointer text-slate-400"
                    >
                      {expandedFolders['Backups'] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      <Folder className="w-4 h-4 text-emerald-400" />
                      <span>Backups/</span>
                      <span className="text-[10px] text-slate-600 ml-auto">Snapshot point</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: File Details & Preview Pane */}
        <div className="flex-1 bg-slate-900/60 p-6 overflow-y-auto flex flex-col">
          {selectedFile ? (
            <div className="max-w-2xl w-full mx-auto space-y-6">
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-cyan-400 font-bold block">
                      {selectedFile.type}
                    </span>
                    <h3 className="text-lg font-mono font-bold text-white mt-0.5">
                      {selectedFile.name}
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
                    {selectedFile.sizeKb} KB
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Virtual File Path:</span>
                    <span className="text-slate-200">{selectedFile.path}</span>
                  </div>

                  {selectedFile.doc && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">SHA-256 Checksum:</span>
                        <span className="text-slate-300 truncate max-w-xs">{selectedFile.doc.checksum}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Extraction Engine:</span>
                        <span className="text-cyan-400">{selectedFile.doc.ocrEngine}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">OCR Confidence:</span>
                        <span className={selectedFile.doc.ocrConfidence >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
                          {selectedFile.doc.ocrConfidence}%
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* If selected file is an attached document, provide open button */}
                {selectedFile.tech && selectedFile.doc && (
                  <div className="pt-2">
                    {selectedFile.doc.docType === 'aadhaar' && !isAadhaarUnlocked ? (
                      <div className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-amber-300">
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>Aadhaar document protected. Unlock with PIN.</span>
                        </div>
                        <button
                          onClick={onRequestUnlockAadhaar}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors"
                        >
                          Unlock PIN
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectTechnicianDoc(selectedFile.tech!, selectedFile.doc!)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Inspect in High-Resolution Document Viewer</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Text content or schema preview */}
              {selectedFile.details && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold block">
                    File Contents / Extract Stream
                  </span>
                  <pre className="p-3 bg-slate-900 rounded font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed border border-slate-800">
                    {selectedFile.details}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="m-auto text-center space-y-3">
              <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">
                Select a file from the ORACLIME directory tree
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click any technician's registration.pdf, certificates.pdf, or database file on the left to inspect file properties, virtual path, and extracted text.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
