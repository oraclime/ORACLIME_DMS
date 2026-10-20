import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Folder, 
  Plus, 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  Award, 
  Lock, 
  Unlock, 
  Save, 
  Printer, 
  History, 
  ExternalLink,
  Edit3
} from 'lucide-react';
import { TechnicianRecord, AttachedDocument, VerificationStatus, UserAccount } from '../types/dms';
import { DocumentViewer } from './DocumentViewer';
import { StorageService } from '../services/storageService';

interface TechnicianProfileModalProps {
  technician: TechnicianRecord;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTechnician: (updated: TechnicianRecord, note?: string) => void;
  isAadhaarUnlocked: boolean;
  onRequestUnlockAadhaar: () => void;
  onOpenAddDocument: (tech: TechnicianRecord) => void;
  currentUser?: UserAccount;
}

export const TechnicianProfileModal: React.FC<TechnicianProfileModalProps> = ({
  technician,
  isOpen,
  onClose,
  onUpdateTechnician,
  isAadhaarUnlocked,
  onRequestUnlockAadhaar,
  onOpenAddDocument,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'edit' | 'security' | 'history'>('documents');
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Form state for edits
  const [formData, setFormData] = useState({
    fullName: technician.fullName,
    fatherName: technician.fatherName,
    mobile: technician.mobile,
    district: technician.district,
    address: technician.address,
    category: technician.category,
    skills: technician.skills.join(', '),
    experienceYears: technician.experienceYears,
    certifications: technician.certifications.join(', '),
    verificationNotes: technician.verificationNotes || '',
    status: technician.status,
  });

  if (!isOpen) return null;

  const currentDoc: AttachedDocument | undefined = technician.documents[selectedDocIndex] || technician.documents[0];

  const handleSaveFields = () => {
    const corrected: string[] = [...(technician.correctedFields || [])];
    if (formData.fatherName !== technician.fatherName && !corrected.includes('fatherName')) {
      corrected.push('fatherName');
    }
    if (formData.fullName !== technician.fullName && !corrected.includes('fullName')) {
      corrected.push('fullName');
    }
    if (formData.mobile !== technician.mobile && !corrected.includes('mobile')) {
      corrected.push('mobile');
    }

    const updated: TechnicianRecord = {
      ...technician,
      fullName: formData.fullName,
      fatherName: formData.fatherName,
      mobile: formData.mobile,
      district: formData.district,
      address: formData.address,
      category: formData.category,
      skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
      experienceYears: Number(formData.experienceYears) || 0,
      certifications: formData.certifications.split(',').map(s => s.trim()).filter(Boolean),
      verificationNotes: formData.verificationNotes,
      status: formData.status,
      correctedFields: corrected,
      verificationDate: formData.status === 'verified' ? new Date().toISOString() : technician.verificationDate,
    };

    onUpdateTechnician(updated, 'Manual Field Corrections Saved');
    setIsEditing(false);
  };

  const handleMarkVerified = () => {
    const reviewerName = currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Authorized Verification Officer';
    const updated: TechnicianRecord = {
      ...technician,
      status: 'verified',
      verificationDate: new Date().toISOString(),
      reviewer: reviewerName,
      verificationNotes: 'Manually inspected original documents and approved record.',
    };
    onUpdateTechnician(updated, 'Record Marked Verified');
  };

  const statusConfig = {
    verified: { label: 'Verified', bg: 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300', icon: CheckCircle2 },
    pending_review: { label: 'Pending Review', bg: 'bg-amber-950/70 border-amber-700/60 text-amber-300', icon: Clock },
    flagged_handwritten: { label: 'Handwritten Flag', bg: 'bg-rose-950/70 border-rose-700/60 text-rose-300', icon: AlertTriangle },
    rejected: { label: 'Rejected', bg: 'bg-slate-800 border-slate-700 text-slate-400', icon: X },
  }[technician.status] || { label: technician.status, bg: 'bg-slate-800 text-slate-300', icon: Clock };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
      <div className="relative w-full max-w-7xl h-[92vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="px-2.5 py-1 bg-cyan-950 border border-cyan-800/80 rounded font-mono font-bold text-cyan-300 text-sm tracking-wider">
              {technician.applicationNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {technician.fullName}
                </h2>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${statusConfig.bg}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{statusConfig.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {technician.district} · {technician.category} · Registered: {technician.registrationDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {technician.status !== 'verified' && (
              <button
                onClick={handleMarkVerified}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Verified</span>
              </button>
            )}

            <button
              onClick={() => onOpenAddDocument(technician)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium transition-colors"
              title="Add another PDF document to this technician folder"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Attach PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800 text-xs shrink-0">
          <div className="flex items-center gap-2 py-2">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'documents'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents ({technician.documents?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'edit'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Extracted Fields & Verification</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'security'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Aadhaar & Security</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail ({technician.auditTrail?.length || 0})</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate max-w-xs">{technician.folderPath}</span>
          </div>
        </div>

        {/* Tab 1: Documents & Inline Interactive Viewer */}
        {activeTab === 'documents' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left list of attached documents */}
            <div className="w-full md:w-72 bg-slate-950/60 border-r border-slate-800 p-3 overflow-y-auto shrink-0 flex flex-col gap-1.5">
              <div className="text-[11px] font-mono uppercase text-slate-400 font-bold px-2 py-1 flex justify-between items-center">
                <span>Associated Files</span>
                <span className="text-cyan-400">{technician.documents?.length || 0}</span>
              </div>

              {technician.documents?.map((doc, idx) => {
                const isSelected = idx === selectedDocIndex;
                const isAadhaarDoc = doc.docType === 'aadhaar';
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-500/60 text-white shadow-xs'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold truncate text-[12px] text-cyan-300">
                        {doc.filename}
                      </span>
                      {isAadhaarDoc && (
                        <span className="p-0.5 rounded bg-amber-500/10 text-amber-400" title="Restricted identity file">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="uppercase">{doc.docType}</span>
                      <span>{doc.fileSizeKb} KB</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>{doc.ocrEngine}</span>
                      <span className={doc.ocrConfidence >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
                        {doc.ocrConfidence}% OCR
                      </span>
                    </div>
                  </button>
                );
              })}

              <button
                onClick={() => onOpenAddDocument(technician)}
                className="mt-3 w-full p-2.5 rounded border border-dashed border-slate-700 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-800/40 text-slate-400 hover:text-cyan-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Document</span>
              </button>
            </div>

            {/* Right Document Viewer Area */}
            <div className="flex-1 bg-slate-950 p-3 overflow-hidden flex flex-col">
              {currentDoc ? (
                <DocumentViewer
                  document={currentDoc}
                  technician={technician}
                  isAadhaarUnlocked={isAadhaarUnlocked}
                  onRequestUnlockAadhaar={onRequestUnlockAadhaar}
                />
              ) : (
                <div className="m-auto text-center text-slate-500 text-sm">
                  No documents found in this technician folder.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Extracted Fields & Verification Editor */}
        {activeTab === 'edit' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Field Verification & Correction Form
                  </h3>
                  <p className="text-xs text-slate-400">
                    Verify text extracted by PyMuPDF and Tesseract OCR against the original document records.
                  </p>
                </div>
                <button
                  onClick={handleSaveFields}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Verified Changes</span>
                </button>
              </div>

              {technician.correctedFields?.length > 0 && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs text-amber-300 flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Operator corrected fields: {technician.correctedFields.join(', ')}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {/* Registration Details */}
                <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>A. Registration Details</span>
                  </h4>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Application Number (Fixed Key)</label>
                    <input
                      type="text"
                      disabled
                      value={technician.applicationNumber}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-300 font-mono font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Verification Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as VerificationStatus })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="verified">Verified (Approved)</option>
                      <option value="pending_review">Pending Review</option>
                      <option value="flagged_handwritten">Flagged (Handwritten Anomaly)</option>
                      <option value="rejected">Rejected / Invalid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Technician Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">District</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Personal Details */}
                <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>B. Personal Details</span>
                  </h4>

                  <div>
                    <label className="block text-slate-400 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Father's Name</label>
                    <input
                      type="text"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Mobile Number (10 digits)</label>
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Full Postal Address</label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Professional Qualifications */}
                <div className="md:col-span-2 p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span>C. Technical Skills & Experience</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 mb-1">Skills (comma separated)</label>
                      <input
                        type="text"
                        value={formData.skills}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Years of Practical Experience</label>
                      <input
                        type="number"
                        value={formData.experienceYears}
                        onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Certifications</label>
                    <input
                      type="text"
                      value={formData.certifications}
                      onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Verification Officer Notes</label>
                    <textarea
                      rows={2}
                      value={formData.verificationNotes}
                      onChange={(e) => setFormData({ ...formData, verificationNotes: e.target.value })}
                      placeholder="Add inspection notes, verification stamp reference, etc."
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Aadhaar Restricted Access */}
        {activeTab === 'security' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80 flex items-center justify-center">
            <div className="max-w-xl w-full p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6 text-center shadow-xl">
              <div className="w-14 h-14 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  Identity Record & Aadhaar Security
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Per Section 3 of ORACLIME Security Specifications, government identity documents and unmasked biometric identifiers are safeguarded by operator security PIN.
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-left space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Aadhaar Number Status:</span>
                  <span className={isAadhaarUnlocked ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {isAadhaarUnlocked ? 'UNMASKED (AUTHORIZED SESSION)' : 'MASKED (PROTECTED)'}
                  </span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Cardholder:</span>
                  <span className="text-slate-200 font-bold">{technician.fullName}</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Aadhaar Identifier:</span>
                  <span className="text-base font-bold tracking-wider text-cyan-300">
                    {isAadhaarUnlocked ? technician.unmaskedAadhaar : technician.aadhaarNumber}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Associated File:</span>
                  <span className="text-slate-300">
                    {technician.folderPath}aadhaar.pdf
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                {isAadhaarUnlocked ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Clearance active for current operator session</span>
                  </div>
                ) : (
                  <button
                    onClick={onRequestUnlockAadhaar}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Full Aadhaar (Enter PIN)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Trail & History */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">
                  Immutable Record Audit Log
                </h3>
                <p className="text-xs text-slate-400">
                  Every extraction, operator modification, and document access event is logged with timestamp and actor ID.
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {technician.auditTrail?.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1"
                  >
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-cyan-400 font-bold">{entry.action}</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-200">{entry.details}</div>
                    <div className="text-[10px] text-slate-500">
                      Actor: <span className="text-slate-400">{entry.actor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
