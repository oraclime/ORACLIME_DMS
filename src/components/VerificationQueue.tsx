import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Eye, 
  CheckSquare, 
  RefreshCw, 
  XCircle, 
  FileText, 
  ShieldAlert, 
  UserCheck, 
  Layers,
  ChevronRight
} from 'lucide-react';
import { TechnicianRecord, AttachedDocument, VerificationStatus, UserAccount } from '../types/dms';
import { DocumentViewer } from './DocumentViewer';
import { StorageService } from '../services/storageService';

interface VerificationQueueProps {
  technicians: TechnicianRecord[];
  onUpdateTechnician: (updated: TechnicianRecord, note?: string) => void;
  isAadhaarUnlocked: boolean;
  onRequestUnlockAadhaar: () => void;
  onSelectTechnician: (tech: TechnicianRecord) => void;
  currentUser?: UserAccount;
}

export const VerificationQueue: React.FC<VerificationQueueProps> = ({
  technicians,
  onUpdateTechnician,
  isAadhaarUnlocked,
  onRequestUnlockAadhaar,
  onSelectTechnician,
  currentUser,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'handwritten' | 'pending'>('all');
  
  // Pending review or flagged items
  const reviewQueue = technicians.filter(t => {
    if (filterType === 'handwritten') return t.status === 'flagged_handwritten';
    if (filterType === 'pending') return t.status === 'pending_review';
    return t.status === 'pending_review' || t.status === 'flagged_handwritten';
  });

  const [selectedTechId, setSelectedTechId] = useState<string>(reviewQueue[0]?.id || '');
  const activeTech = technicians.find(t => t.id === selectedTechId) || reviewQueue[0];
  const activeDoc: AttachedDocument | undefined = activeTech?.documents?.[0];

  const [activeHighlightedField, setActiveHighlightedField] = useState<string | null>(null);

  // Field edits in review
  const [editedFields, setEditedFields] = useState<{ [key: string]: string }>({});

  const handleFieldChange = (field: string, val: string) => {
    setEditedFields(prev => ({ ...prev, [field]: val }));
  };

  const handleApprove = (tech: TechnicianRecord) => {
    const correctedFields: string[] = [...(tech.correctedFields || [])];
    Object.keys(editedFields).forEach(f => {
      if (!correctedFields.includes(f)) correctedFields.push(f);
    });

    const updated: TechnicianRecord = {
      ...tech,
      fullName: editedFields.fullName ?? tech.fullName,
      fatherName: editedFields.fatherName ?? tech.fatherName,
      mobile: editedFields.mobile ?? tech.mobile,
      district: editedFields.district ?? tech.district,
      category: (editedFields.category as any) ?? tech.category,
      status: 'verified',
      verificationDate: new Date().toISOString(),
      reviewer: currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Authorized Verification Officer',
      correctedFields,
      verificationNotes: 'Approved in OCR Verification Studio after field verification.',
    };

    onUpdateTechnician(updated, 'OCR Record Approved & Verified');
    setEditedFields({});
  };

  const handleFlagForRescan = (tech: TechnicianRecord) => {
    const updated: TechnicianRecord = {
      ...tech,
      status: 'flagged_handwritten',
      verificationNotes: 'Flagged by operator: Rescan requested with higher DPI.',
    };
    onUpdateTechnician(updated, 'Flagged for Document Rescan');
  };

  const handleReject = (tech: TechnicianRecord) => {
    const updated: TechnicianRecord = {
      ...tech,
      status: 'rejected',
      verificationNotes: 'Rejected: Document illegible or invalid credentials.',
    };
    onUpdateTechnician(updated, 'Record Rejected by Verification Officer');
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Banner & Filter Strip */}
      <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              OCR Verification Studio & Review Queue
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Step 3 of DMS Workflow: Verify extracted text against original PDF documents before final indexing.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded transition-colors ${
              filterType === 'all'
                ? 'bg-slate-800 text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Pending ({technicians.filter(t => t.status === 'pending_review' || t.status === 'flagged_handwritten').length})
          </button>
          <button
            onClick={() => setFilterType('handwritten')}
            className={`px-3 py-1 rounded transition-colors ${
              filterType === 'handwritten'
                ? 'bg-amber-950/80 text-amber-300 font-bold border border-amber-600/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Handwritten Flags ({technicians.filter(t => t.status === 'flagged_handwritten').length})
          </button>
          <button
            onClick={() => setFilterType('pending')}
            className={`px-3 py-1 rounded transition-colors ${
              filterType === 'pending'
                ? 'bg-slate-800 text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Standard Queue ({technicians.filter(t => t.status === 'pending_review').length})
          </button>
        </div>
      </div>

      {reviewQueue.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">
            Verification Queue Clear
          </h3>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-4 leading-relaxed">
            All technician PDFs and OCR extractions have been verified and approved. New records uploaded via PDF Ingestion will appear here for review.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: List of items waiting in queue */}
          <div className="w-72 bg-slate-950/70 border-r border-slate-800 p-3 overflow-y-auto shrink-0 flex flex-col gap-2">
            <div className="text-[11px] font-mono text-slate-400 uppercase font-bold px-2 py-1">
              Pending Items ({reviewQueue.length})
            </div>

            {reviewQueue.map((tech) => {
              const isSelected = activeTech?.id === tech.id;
              const isHandwritten = tech.status === 'flagged_handwritten';

              return (
                <button
                  key={tech.id}
                  onClick={() => {
                    setSelectedTechId(tech.id);
                    setEditedFields({});
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex flex-col gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500/80 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-cyan-300 text-[13px]">
                      {tech.applicationNumber}
                    </span>
                    {isHandwritten ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Handwritten</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-white truncate">
                    {tech.fullName}
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono flex justify-between">
                    <span>{tech.district}</span>
                    <span>{tech.documents?.length || 0} Docs</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Center Column: High-Res Original Document Viewer */}
          <div className="flex-1 bg-slate-950 p-3 overflow-hidden flex flex-col">
            {activeDoc && activeTech ? (
              <DocumentViewer
                document={activeDoc}
                technician={activeTech}
                isAadhaarUnlocked={isAadhaarUnlocked}
                onRequestUnlockAadhaar={onRequestUnlockAadhaar}
                highlightedField={activeHighlightedField}
              />
            ) : (
              <div className="m-auto text-slate-500 text-xs">
                Select a record from the review queue.
              </div>
            )}
          </div>

          {/* Right Column: Verification Form & Confidence Inspector */}
          {activeTech && (
            <div className="w-96 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto shrink-0 flex flex-col gap-4 text-xs">
              <div className="pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    {activeTech.applicationNumber}
                  </span>
                  <button
                    onClick={() => onSelectTechnician(activeTech)}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>Full Profile</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-slate-400 text-xs mt-0.5 font-mono">
                  Engine: {activeDoc?.ocrEngine || 'Tesseract OCR v5'} · Score: {activeDoc?.ocrConfidence || 88}%
                </div>
              </div>

              {/* Warning if handwritten */}
              {activeTech.status === 'flagged_handwritten' && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Handwritten Field Warning</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Manual verification required: Handwriting detected on Father's Name or personal details. Verify against original document on the left.
                  </p>
                </div>
              )}

              {/* Editable Fields with Confidence Indicators */}
              <div className="space-y-3">
                <div 
                  onMouseEnter={() => setActiveHighlightedField('fullName')}
                  onMouseLeave={() => setActiveHighlightedField(null)}
                  className="space-y-1"
                >
                  <div className="flex justify-between items-center text-slate-400">
                    <label className="font-medium">Candidate Name</label>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">99% Conf</span>
                  </div>
                  <input
                    type="text"
                    value={editedFields.fullName ?? activeTech.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div 
                  onMouseEnter={() => setActiveHighlightedField('fatherName')}
                  onMouseLeave={() => setActiveHighlightedField(null)}
                  className="space-y-1"
                >
                  <div className="flex justify-between items-center text-slate-400">
                    <label className="font-medium">Father's Name</label>
                    <span className={`text-[10px] font-mono font-bold ${activeTech.status === 'flagged_handwritten' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {activeTech.status === 'flagged_handwritten' ? '68% (Handwritten)' : '98% Conf'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editedFields.fatherName ?? activeTech.fatherName}
                    onChange={(e) => handleFieldChange('fatherName', e.target.value)}
                    className={`w-full bg-slate-950 border rounded px-2.5 py-1.5 text-white focus:outline-none ${
                      activeTech.status === 'flagged_handwritten'
                        ? 'border-amber-500/80 focus:border-amber-400'
                        : 'border-slate-700 focus:border-cyan-500'
                    }`}
                  />
                </div>

                <div 
                  onMouseEnter={() => setActiveHighlightedField('mobile')}
                  onMouseLeave={() => setActiveHighlightedField(null)}
                  className="space-y-1"
                >
                  <div className="flex justify-between items-center text-slate-400">
                    <label className="font-medium">Mobile Number</label>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Conf</span>
                  </div>
                  <input
                    type="text"
                    value={editedFields.mobile ?? activeTech.mobile}
                    onChange={(e) => handleFieldChange('mobile', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div 
                  onMouseEnter={() => setActiveHighlightedField('district')}
                  onMouseLeave={() => setActiveHighlightedField(null)}
                  className="space-y-1"
                >
                  <div className="flex justify-between items-center text-slate-400">
                    <label className="font-medium">District</label>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">98% Conf</span>
                  </div>
                  <input
                    type="text"
                    value={editedFields.district ?? activeTech.district}
                    onChange={(e) => handleFieldChange('district', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-slate-400">
                    <label className="font-medium">Category</label>
                  </div>
                  <input
                    type="text"
                    value={editedFields.category ?? activeTech.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 space-y-2 mt-auto">
                <button
                  onClick={() => handleApprove(activeTech)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Mark Verified</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleFlagForRescan(activeTech)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-600/30 rounded text-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Flag Rescan</span>
                  </button>

                  <button
                    onClick={() => handleReject(activeTech)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-600/30 rounded text-xs transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
