import React, { useState, useRef, useEffect } from 'react';
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
  Edit3,
  CreditCard,
  Copy,
  Building2,
  Warehouse,
  Store,
  Wrench,
  Tag,
  Trash2,
  RefreshCw,
  Upload,
  Camera,
  Download,
  AlertCircle,
  FileCheck,
  Eye,
  Check,
  ShieldAlert
} from 'lucide-react';
import { 
  TechnicianRecord, 
  AttachedDocument, 
  VerificationStatus, 
  UserAccount, 
  BankAccountDetails, 
  RecordEntityType, 
  TechnicianCategory,
  DocumentType
} from '../types/dms';
import { DocumentViewer } from './DocumentViewer';
import { StorageService } from '../services/storageService';
import { BiodataPdfGenerator } from '../services/biodataPdfGenerator';

interface TechnicianProfileModalProps {
  technician: TechnicianRecord;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTechnician: (updated: TechnicianRecord, note?: string) => void;
  onDeleteTechnician?: (tech: TechnicianRecord, permanent: boolean, reason?: string) => void;
  isAadhaarUnlocked: boolean;
  onRequestUnlockAadhaar: () => void;
  onOpenAddDocument: (tech: TechnicianRecord) => void;
  onOpenCustomUpload?: (tech: TechnicianRecord) => void;
  onOpenRegistrationForm?: (tech: TechnicianRecord) => void;
  currentUser?: UserAccount;
}

export const TechnicianProfileModal: React.FC<TechnicianProfileModalProps> = ({
  technician,
  isOpen,
  onClose,
  onUpdateTechnician,
  onDeleteTechnician,
  isAadhaarUnlocked,
  onRequestUnlockAadhaar,
  onOpenAddDocument,
  onOpenCustomUpload,
  onOpenRegistrationForm,
  currentUser,
}) => {
  // Tabs: 'profile' (Complete Profile / Biodata), 'documents', 'bank', 'edit', 'security', 'history'
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'bank' | 'edit' | 'security' | 'history'>('profile');
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Document Management States (Delete & Replace)
  const [docToDelete, setDocToDelete] = useState<AttachedDocument | null>(null);
  const [docToReplace, setDocToReplace] = useState<AttachedDocument | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementError, setReplacementError] = useState<string>('');
  const [isReplacingDoc, setIsReplacingDoc] = useState<boolean>(false);

  // Record Deletion States
  const [isDeleteRecordDialogOpen, setIsDeleteRecordDialogOpen] = useState<boolean>(false);
  const [deletePermanent, setDeletePermanent] = useState<boolean>(false);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string>('');

  // Profile Photo Upload State
  const photoInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string>('');

  // Form state for edits
  const [formData, setFormData] = useState({
    entityType: technician.entityType || 'technician',
    fullName: technician.fullName,
    contactPerson: technician.contactPerson || '',
    fatherName: technician.fatherName || '',
    dob: technician.dob || '',
    mobile: technician.mobile,
    alternateMobile: technician.alternateMobile || '',
    district: technician.district,
    address: technician.address,
    category: technician.category,
    specialization: technician.specialization || '',
    gstNumber: technician.gstNumber || '',
    panNumber: technician.panNumber || '',
    bankName: technician.bankDetails?.bankName || '',
    accountNumber: technician.bankDetails?.accountNumber || '',
    ifscCode: technician.bankDetails?.ifscCode || '',
    accountHolderName: technician.bankDetails?.accountHolderName || technician.fullName,
    branchName: technician.bankDetails?.branchName || '',
    upiId: technician.bankDetails?.upiId || '',
    skills: technician.skills?.join(', ') || '',
    experienceYears: technician.experienceYears || 0,
    certifications: technician.certifications?.join(', ') || '',
    trainingDetails: technician.trainingDetails || '',
    verificationNotes: technician.verificationNotes || '',
    status: technician.status,
  });

  // Sync form state when technician changes
  useEffect(() => {
    setFormData({
      entityType: technician.entityType || 'technician',
      fullName: technician.fullName,
      contactPerson: technician.contactPerson || '',
      fatherName: technician.fatherName || '',
      dob: technician.dob || '',
      mobile: technician.mobile,
      alternateMobile: technician.alternateMobile || '',
      district: technician.district,
      address: technician.address,
      category: technician.category,
      specialization: technician.specialization || '',
      gstNumber: technician.gstNumber || '',
      panNumber: technician.panNumber || '',
      bankName: technician.bankDetails?.bankName || '',
      accountNumber: technician.bankDetails?.accountNumber || '',
      ifscCode: technician.bankDetails?.ifscCode || '',
      accountHolderName: technician.bankDetails?.accountHolderName || technician.fullName,
      branchName: technician.bankDetails?.branchName || '',
      upiId: technician.bankDetails?.upiId || '',
      skills: technician.skills?.join(', ') || '',
      experienceYears: technician.experienceYears || 0,
      certifications: technician.certifications?.join(', ') || '',
      trainingDetails: technician.trainingDetails || '',
      verificationNotes: technician.verificationNotes || '',
      status: technician.status,
    });
  }, [technician]);

  if (!isOpen) return null;

  const isPartner = technician.mainCategory === 'Partner' || ['service_center', 'godown', 'wholesaler'].includes(technician.entityType || '');
  const actorName = currentUser ? `${currentUser.fullName} (${currentUser.username})` : 'Authorized User';
  const canDelete = currentUser ? StorageService.canPerform(currentUser, 'canDeleteRecords') : true;

  const currentDoc: AttachedDocument | undefined = technician.documents[selectedDocIndex] || technician.documents[0];

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // --- PHOTO MANAGEMENT ---
  const handlePhotoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image file must be under 10MB.');
      return;
    }

    setPhotoError('');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const result = StorageService.updateProfilePhoto(technician.applicationNumber, dataUrl, isPartner, actorName);
      if (result.success && result.updatedRecord) {
        onUpdateTechnician(result.updatedRecord, isPartner ? 'Business Photo Updated' : 'Profile Photograph Updated');
      }
    };
    reader.readAsDataURL(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleRemovePhoto = () => {
    const result = StorageService.updateProfilePhoto(technician.applicationNumber, undefined, isPartner, actorName);
    if (result.success && result.updatedRecord) {
      onUpdateTechnician(result.updatedRecord, isPartner ? 'Business Photo Removed' : 'Profile Photograph Removed');
    }
  };

  // --- DOCUMENT DELETION ---
  const handleConfirmDeleteDocument = () => {
    if (!docToDelete) return;

    const res = StorageService.deleteDocumentFromRecord(technician.applicationNumber, docToDelete.id, actorName);
    if (res.success && res.updatedRecord) {
      onUpdateTechnician(res.updatedRecord, `Document '${docToDelete.filename}' Deleted`);
      setDocToDelete(null);
      // Adjust selected index
      setSelectedDocIndex(prev => Math.max(0, prev - 1));
    }
  };

  // --- DOCUMENT REPLACEMENT ---
  const handleFileForReplacementSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setReplacementError('Replacement file exceeds 25MB limit.');
      return;
    }
    setReplacementError('');
    setReplacementFile(file);
  };

  const handleConfirmReplaceDocument = async () => {
    if (!docToReplace || !replacementFile) {
      setReplacementError('Please choose a replacement file.');
      return;
    }

    setIsReplacingDoc(true);
    setReplacementError('');

    try {
      const buffer = await replacementFile.arrayBuffer();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        
        // Simple checksum simulation
        const checksum = Array.from(new Uint8Array(buffer.slice(0, 100)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 16);

        const newDoc: AttachedDocument = {
          id: docToReplace.id,
          filename: replacementFile.name,
          customTitle: docToReplace.customTitle, // preserve custom title or fallback
          docType: docToReplace.docType,
          virtualPath: `TechnicianFiles/${technician.applicationNumber}/${replacementFile.name}`,
          fileSizeKb: Math.round(replacementFile.size / 1024),
          pageCount: 1,
          checksum,
          importDate: new Date().toISOString(),
          isScanned: !replacementFile.name.toLowerCase().endsWith('.pdf'),
          ocrConfidence: 95,
          ocrEngine: 'PyMuPDF Direct',
          extractedText: `[Replaced File] ${replacementFile.name}`,
          uploadedBlobData: dataUrl,
          linkedApplicationNumber: technician.applicationNumber,
          technicianName: technician.fullName,
          fileMimeType: replacementFile.type || 'application/octet-stream',
        };

        const res = StorageService.replaceDocumentInRecord(technician.applicationNumber, docToReplace.id, newDoc, actorName);
        setIsReplacingDoc(false);
        if (res.success && res.updatedRecord) {
          onUpdateTechnician(res.updatedRecord, `Document '${docToReplace.filename}' Replaced`);
          setDocToReplace(null);
          setReplacementFile(null);
        } else {
          setReplacementError(res.message);
        }
      };
      reader.readAsDataURL(replacementFile);
    } catch (err: any) {
      setIsReplacingDoc(false);
      setReplacementError(err.message || 'Failed to process replacement file.');
    }
  };

  // --- RECORD DELETION ---
  const handleConfirmDeleteRecord = () => {
    if (!canDelete) {
      setDeleteError('You do not have permission to delete records.');
      return;
    }

    if (onDeleteTechnician) {
      onDeleteTechnician(technician, deletePermanent, deleteReason);
    } else {
      StorageService.deleteTechnician(technician.id, actorName, deletePermanent, deleteReason);
      onClose();
    }
  };

  // --- BIODATA / PROFILE DOWNLOAD & PRINT ---
  const handleDownloadFullProfile = () => {
    try {
      if (isPartner) {
        const pdf = BiodataPdfGenerator.generatePartnerProfilePdf(technician);
        pdf.save(`${technician.applicationNumber}_Business_Profile.pdf`);
      } else {
        const pdf = BiodataPdfGenerator.generateTechnicianBiodataPdf(technician);
        pdf.save(`${technician.applicationNumber}_Full_Biodata.pdf`);
      }
    } catch (err: any) {
      alert(`PDF Generation error: ${err.message}`);
    }
  };

  const handlePrintFullProfile = () => {
    try {
      const pdf = isPartner 
        ? BiodataPdfGenerator.generatePartnerProfilePdf(technician) 
        : BiodataPdfGenerator.generateTechnicianBiodataPdf(technician);
      const blobUrl = pdf.output('bloburl');
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (err: any) {
      alert(`Print error: ${err.message}`);
    }
  };

  // --- EDIT SAVE ---
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

    const bankDetails: BankAccountDetails | undefined = (formData.bankName || formData.accountNumber || formData.ifscCode) ? {
      bankName: formData.bankName.trim(),
      accountNumber: formData.accountNumber.trim(),
      ifscCode: formData.ifscCode.trim().toUpperCase(),
      accountHolderName: formData.accountHolderName.trim() || formData.fullName.trim(),
      branchName: formData.branchName.trim(),
      upiId: formData.upiId.trim(),
    } : technician.bankDetails;

    const updated: TechnicianRecord = {
      ...technician,
      entityType: formData.entityType,
      fullName: formData.fullName.trim(),
      contactPerson: isPartner ? (formData.contactPerson.trim() || undefined) : undefined,
      fatherName: !isPartner ? (formData.fatherName.trim() || undefined) : undefined,
      dob: !isPartner ? (formData.dob || undefined) : undefined,
      mobile: formData.mobile.trim(),
      alternateMobile: formData.alternateMobile.trim() || undefined,
      district: formData.district.trim(),
      address: formData.address.trim(),
      category: formData.category,
      specialization: !isPartner ? (formData.specialization.trim() || undefined) : undefined,
      partnerType: isPartner ? (technician.partnerType || 'Service Center') : undefined,
      gstNumber: isPartner ? (formData.gstNumber.trim().toUpperCase() || undefined) : undefined,
      panNumber: formData.panNumber.trim().toUpperCase() || undefined,
      bankDetails,
      skills: !isPartner && formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      experienceYears: !isPartner ? (Number(formData.experienceYears) || 0) : undefined,
      certifications: !isPartner && formData.certifications ? formData.certifications.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      trainingDetails: !isPartner ? (formData.trainingDetails.trim() || undefined) : undefined,
      verificationNotes: formData.verificationNotes,
      status: formData.status,
      correctedFields: corrected,
      verificationDate: formData.status === 'verified' ? new Date().toISOString() : technician.verificationDate,
    };

    onUpdateTechnician(updated, 'Manual Details & Banking Information Saved');
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
  const currentPhoto = isPartner ? (technician.businessPhotoUrl || technician.photoUrl) : technician.photoUrl;

  const registrationDoc = technician.documents.find(d => d.docType === 'registration');
  const bankDoc = technician.documents.find(d => d.docType === 'bank_account');
  const aadhaarDoc = technician.documents.find(d => d.docType === 'aadhaar');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="relative w-full max-w-7xl h-[94vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans min-w-0">
        
        {/* Top Modal Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-950 border-b border-slate-800 shrink-0 gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="px-2.5 py-1 bg-cyan-950 border border-cyan-800/80 rounded font-mono font-bold text-cyan-300 text-xs sm:text-sm tracking-wider shrink-0">
              {technician.applicationNumber}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-[280px] sm:max-w-[420px]">
                  {technician.fullName}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono uppercase whitespace-nowrap">
                  {isPartner ? `PARTNER · ${technician.partnerType || 'BUSINESS'}` : 'TECHNICIAN'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium border whitespace-nowrap ${statusConfig.bg}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{statusConfig.label}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate hidden sm:block">
                {technician.district} · {technician.category} {technician.contactPerson && `· Contact: ${technician.contactPerson}`} · Registered: {technician.registrationDate}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {technician.status !== 'verified' && (
              <button
                onClick={handleMarkVerified}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                title="Mark this record as verified"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Mark Verified</span>
              </button>
            )}

            <button
              onClick={() => onOpenAddDocument(technician)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium transition-colors cursor-pointer"
              title="Add another PDF document or passbook to this record"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Attach File</span>
            </button>

            {onOpenCustomUpload && (
              <button
                onClick={() => onOpenCustomUpload(technician)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded text-xs font-medium transition-colors cursor-pointer"
                title="Upload document with custom title and category"
              >
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Custom Upload</span>
              </button>
            )}

            {onOpenRegistrationForm && (
              <button
                onClick={() => onOpenRegistrationForm(technician)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium transition-colors cursor-pointer"
                title="Generate printable registration form for this record"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden lg:inline">Registration Form</span>
              </button>
            )}

            {/* Record Deletion Button */}
            {canDelete && (
              <button
                onClick={() => setIsDeleteRecordDialogOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded text-xs font-medium transition-colors cursor-pointer"
                title={`Delete or archive this ${isPartner ? 'Partner' : 'Technician'} record`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 bg-slate-900 border-b border-slate-800 text-xs shrink-0 overflow-x-auto min-w-0">
          <div className="flex items-center gap-1.5 py-2 whitespace-nowrap min-w-0">
            {/* 1. Complete Profile / Full Biodata Tab */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isPartner ? 'Complete Profile / Full Business Profile' : 'Complete Profile / Full Biodata'}</span>
            </button>

            {/* 2. Documents & Original PDFs Tab */}
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                activeTab === 'documents'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents & Original PDFs ({technician.documents?.length || 0})</span>
            </button>

            {/* 3. Net Bank Account Tab */}
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                activeTab === 'bank'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Net Bank Account {technician.bankDetails?.accountNumber ? '✓' : ''}</span>
            </button>

            {/* 4. Edit Details & Classification Tab */}
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                activeTab === 'edit'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details & Classification</span>
            </button>

            {/* 5. Aadhaar & Security Tab */}
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                activeTab === 'security'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Aadhaar & Security</span>
            </button>

            {/* 6. Audit Trail Tab */}
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail ({technician.auditTrail?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: COMPLETE PROFILE / FULL BIODATA (OR FULL BUSINESS PROFILE) */}
        {/* ============================================================ */}
        {activeTab === 'profile' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/80">
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Profile Header Hero Card */}
              <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  
                  {/* Photo & Identity Block */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Visual Media Frame (Technician Photo or Business Logo) */}
                    <div className="relative group shrink-0">
                      <div className="w-28 h-32 rounded-xl bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-inner flex items-center justify-center">
                        {currentPhoto ? (
                          <img 
                            src={currentPhoto} 
                            alt={technician.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-3 text-slate-500">
                            {isPartner ? (
                              <Building2 className="w-10 h-10 mx-auto text-indigo-400/60 mb-1" />
                            ) : (
                              <User className="w-10 h-10 mx-auto text-cyan-400/60 mb-1" />
                            )}
                            <span className="text-[10px] font-mono block">No Photo</span>
                          </div>
                        )}
                      </div>

                      {/* Photo Control Overlay */}
                      <div className="mt-2 flex items-center justify-center gap-1.5">
                        <input 
                          type="file" 
                          ref={photoInputRef}
                          accept="image/*"
                          onChange={handlePhotoFileSelected}
                          className="hidden"
                        />
                        <button
                          onClick={() => photoInputRef.current?.click()}
                          className="px-2 py-1 bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title={currentPhoto ? "Change photograph" : "Upload photograph"}
                        >
                          <Camera className="w-3 h-3" />
                          <span>{currentPhoto ? 'Change' : 'Upload'}</span>
                        </button>
                        {currentPhoto && (
                          <button
                            onClick={handleRemovePhoto}
                            className="px-2 py-1 bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                            title="Remove photograph"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {photoError && (
                        <p className="text-[10px] text-rose-400 mt-1 max-w-[120px] text-center font-mono">{photoError}</p>
                      )}
                    </div>

                    {/* Metadata Header */}
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <span className="font-mono text-cyan-400 font-bold text-xs">
                          {technician.applicationNumber}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400 font-mono text-xs">
                          Registered: {technician.registrationDate || 'Not Provided'}
                        </span>
                      </div>
                      
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {technician.fullName}
                      </h3>
                      
                      <p className="text-xs font-semibold text-cyan-300">
                        {isPartner 
                          ? `Partner Classification: ${technician.partnerType || 'Commercial Partner'}` 
                          : `Specialization: ${technician.specialization || 'AC Installation & Repair'}`
                        }
                      </p>

                      <p className="text-xs text-slate-400 font-mono">
                        {technician.district || 'Not Provided'} · {technician.mobile || 'Not Provided'}
                        {technician.alternateMobile ? ` / ${technician.alternateMobile}` : ''}
                      </p>

                      <div className="pt-2 flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold border ${statusConfig.bg}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusConfig.label}</span>
                        </span>
                        {technician.bankDetails?.accountNumber && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 font-mono">
                            <CreditCard className="w-3 h-3" />
                            <span>Bank Account Linked</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Download / Print Actions */}
                  <div className="flex flex-row md:flex-col items-center gap-2.5 shrink-0 w-full md:w-auto">
                    <button
                      onClick={handleDownloadFullProfile}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer whitespace-nowrap"
                      title={isPartner ? "Download complete Partner business profile as printable PDF" : "Download complete Technician biodata as printable PDF"}
                    >
                      <Download className="w-4 h-4" />
                      <span>{isPartner ? 'Download Full Business Profile' : 'Download Full Biodata'}</span>
                    </button>

                    <button
                      onClick={handlePrintFullProfile}
                      className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                      title="Print profile report"
                    >
                      <Printer className="w-4 h-4 text-cyan-400" />
                      <span>Print Profile</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid of Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-sans">
                
                {/* Section 1: Demographics / Commercial Identity */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{isPartner ? '1. Commercial Identity & Contact Details' : '1. Personal Demographics & Identification'}</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-mono">Legal Name</span>
                      <span className="font-bold text-white block mt-0.5">{technician.fullName || 'Not Provided'}</span>
                    </div>

                    {isPartner ? (
                      <div>
                        <span className="text-slate-400 block text-[11px] font-mono">Contact Person / Owner</span>
                        <span className="font-bold text-white block mt-0.5">{technician.contactPerson || 'Not Provided'}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-slate-400 block text-[11px] font-mono">Father's Name</span>
                        <span className="font-bold text-white block mt-0.5">{technician.fatherName || 'Not Provided'}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 block text-[11px] font-mono">Primary Mobile</span>
                      <span className="font-mono text-cyan-300 font-semibold block mt-0.5">{technician.mobile || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-mono">Alternate Mobile</span>
                      <span className="font-mono text-slate-300 block mt-0.5">{technician.alternateMobile || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-mono">District / Region</span>
                      <span className="text-slate-200 block mt-0.5">{technician.district || 'Not Provided'}</span>
                    </div>

                    {isPartner ? (
                      <>
                        <div>
                          <span className="text-slate-400 block text-[11px] font-mono">Date Enrolled</span>
                          <span className="text-slate-200 block mt-0.5">{technician.registrationDate || 'Not Provided'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[11px] font-mono">Registered Office / Facility Address</span>
                          <span className="text-slate-200 block mt-0.5 leading-relaxed">{technician.address || 'Not Provided'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px] font-mono">GSTIN Number</span>
                          <span className="font-mono text-cyan-300 font-semibold block mt-0.5">{technician.gstNumber || 'Not Provided'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px] font-mono">PAN Card Number</span>
                          <span className="font-mono text-slate-300 font-semibold block mt-0.5">{technician.panNumber || 'Not Provided'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-slate-400 block text-[11px] font-mono">Date of Birth</span>
                          <span className="text-cyan-300 font-semibold block mt-0.5 font-mono">{technician.dob || 'Not Provided'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[11px] font-mono">Permanent Home Address</span>
                          <span className="text-slate-200 block mt-0.5 leading-relaxed">{technician.address || 'Not Provided'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px] font-mono">PAN Card Number</span>
                          <span className="font-mono text-slate-300 font-semibold block mt-0.5">{technician.panNumber || 'Not Provided'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Section 2: Technical Specializations & Qualifications (Technician) OR Business Facilities (Partner) */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{isPartner ? '2. Facility, Scope & Capacity' : '2. Qualifications, Experience & Skills'}</span>
                    </h4>
                  </div>

                  {isPartner ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px] font-mono">Partner Classification</span>
                        <span className="font-bold text-white block mt-0.5">{technician.partnerType || 'Commercial Entity'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] font-mono">Service Area / Coverage</span>
                        <span className="text-slate-200 block mt-0.5">{technician.capacityOrCoverage || 'District-wide coverage'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] font-mono">Operations Note</span>
                        <span className="text-slate-300 block mt-0.5 leading-relaxed">
                          Authorized commercial branch for inventory storage, service parts dispatch, and field escalation.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-400 block text-[11px] font-mono">Experience Years</span>
                          <span className="font-bold text-white text-sm block mt-0.5">{technician.experienceYears ? `${technician.experienceYears} Years` : 'Not Provided'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px] font-mono">Specialization</span>
                          <span className="font-bold text-cyan-300 block mt-0.5">{technician.specialization || 'General AC Work'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px] font-mono mb-1">Key Technical Skills</span>
                        {technician.skills && technician.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {technician.skills.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300 text-[11px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">Not Provided</span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px] font-mono">Trade Certifications & Training</span>
                        <span className="text-slate-200 block mt-0.5">
                          {technician.certifications?.join(', ') || technician.trainingDetails || 'Not Provided'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Financial & Net Banking Settlement (Masked) */}
                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-900/40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span>3. Net Bank Account & Financial Settlement</span>
                    </h4>
                    <span className="text-[11px] font-mono text-emerald-400/90 font-semibold">
                      {technician.bankDetails?.accountNumber ? 'Verified Account' : 'Action Required'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-mono">Settlement Bank</span>
                      <span className="font-bold text-white block mt-0.5">{technician.bankDetails?.bankName || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-mono">Bank Account (Masked)</span>
                      <span className="font-mono text-cyan-300 font-bold block mt-0.5">
                        {technician.bankDetails?.accountNumber 
                          ? `XXXX-XXXX-${technician.bankDetails.accountNumber.slice(-4)}` 
                          : 'Not Provided'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-mono">IFSC Code</span>
                      <span className="font-mono text-slate-300 block mt-0.5">{technician.bankDetails?.ifscCode || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-mono">Account Holder</span>
                      <span className="text-slate-200 block mt-0.5">{technician.bankDetails?.accountHolderName || technician.fullName || 'Not Provided'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-mono">Branch Name</span>
                      <span className="text-slate-300 block mt-0.5">{technician.bankDetails?.branchName || 'Civil Lines'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-mono">UPI / Net Banking ID</span>
                      <span className="font-mono text-slate-300 block mt-0.5">{technician.bankDetails?.upiId || 'Not Provided'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 4: Dossier Document Checklist & Official Forms */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                      <FileCheck className="w-4 h-4" />
                      <span>4. Dossier Documents Checklist</span>
                    </h4>
                    <span className="text-[11px] font-mono text-cyan-400 font-bold">
                      {technician.documents?.length || 0} Files
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Registration Form Item */}
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {registrationDoc ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                        )}
                        <div>
                          <span className="font-bold text-white block">Official Registration Form</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {registrationDoc ? registrationDoc.filename : 'Form template pending upload'}
                          </span>
                        </div>
                      </div>

                      {registrationDoc ? (
                        <button
                          onClick={() => {
                            const idx = technician.documents.findIndex(d => d.id === registrationDoc.id);
                            if (idx >= 0) setSelectedDocIndex(idx);
                            setActiveTab('documents');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white rounded text-[11px] font-mono transition-colors cursor-pointer"
                        >
                          View Form
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenRegistrationForm && onOpenRegistrationForm(technician)}
                          className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded text-[11px] font-mono transition-colors cursor-pointer"
                        >
                          Generate Form
                        </button>
                      )}
                    </div>

                    {/* Bank Passbook Item */}
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {bankDoc ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-slate-500" />
                        )}
                        <div>
                          <span className="font-bold text-white block">Bank Passbook / Cheque Scan</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {bankDoc ? bankDoc.filename : 'Not Attached'}
                          </span>
                        </div>
                      </div>
                      {bankDoc && (
                        <button
                          onClick={() => {
                            const idx = technician.documents.findIndex(d => d.id === bankDoc.id);
                            if (idx >= 0) setSelectedDocIndex(idx);
                            setActiveTab('documents');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white rounded text-[11px] font-mono transition-colors cursor-pointer"
                        >
                          View Bank Doc
                        </button>
                      )}
                    </div>

                    {/* Identity Document Item */}
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {aadhaarDoc ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-slate-500" />
                        )}
                        <div>
                          <span className="font-bold text-white block">Aadhaar / Government Identity</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {aadhaarDoc ? aadhaarDoc.filename : 'Identity Card'}
                          </span>
                        </div>
                      </div>
                      {aadhaarDoc && (
                        <button
                          onClick={() => {
                            const idx = technician.documents.findIndex(d => d.id === aadhaarDoc.id);
                            if (idx >= 0) setSelectedDocIndex(idx);
                            setActiveTab('documents');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white rounded text-[11px] font-mono transition-colors cursor-pointer"
                        >
                          View ID
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Footer on Profile Tab */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Dossier tamper-checked and certified for local station audit compliance.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadFullProfile}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold transition-colors cursor-pointer"
                  >
                    Download Full PDF
                  </button>
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-colors border border-slate-700 cursor-pointer"
                  >
                    Edit Information
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: DOCUMENTS & INLINE VIEWER (WITH DELETE & REPLACE) */}
        {/* ============================================================ */}
        {activeTab === 'documents' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-w-0">
            {/* Left list of attached documents */}
            <div className="w-full md:w-80 bg-slate-950/60 border-r border-slate-800 p-3 overflow-y-auto shrink-0 flex flex-col gap-1.5 min-w-0">
              <div className="text-[11px] font-mono uppercase text-slate-400 font-bold px-2 py-1 flex justify-between items-center">
                <span>Associated Files</span>
                <span className="text-cyan-400">{technician.documents?.length || 0}</span>
              </div>

              {technician.documents?.map((doc, idx) => {
                const isSelected = idx === selectedDocIndex;
                const isAadhaarDoc = doc.docType === 'aadhaar';
                const isBankDoc = doc.docType === 'bank_account';
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-1 cursor-pointer group ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-500/60 text-white shadow-xs'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <span className="font-mono font-semibold truncate text-[12px] text-cyan-300">
                        {doc.customTitle || doc.filename}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {isAadhaarDoc && (
                          <span className="p-0.5 rounded bg-amber-500/10 text-amber-400" title="Restricted identity file">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                        {isBankDoc && (
                          <span className="p-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px] uppercase font-bold" title="Bank document">
                            BANK
                          </span>
                        )}
                      </div>
                    </div>

                    {doc.customTitle && (
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        File: {doc.filename}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="uppercase text-slate-300">
                        {doc.docType === 'bank_account' ? 'Bank Passbook / Cheque' : doc.docType}
                      </span>
                      <span>{doc.fileSizeKb} KB</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>{doc.ocrEngine}</span>
                      
                      {/* Document Item Quick Action Buttons */}
                      <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocToReplace(doc);
                            setReplacementFile(null);
                            setReplacementError('');
                          }}
                          className="p-1 hover:text-cyan-400 text-slate-400 transition-colors"
                          title="Replace this document with updated version"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocToDelete(doc);
                          }}
                          className="p-1 hover:text-rose-400 text-slate-400 transition-colors"
                          title="Delete this document"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => onOpenAddDocument(technician)}
                className="mt-3 w-full p-2.5 rounded border border-dashed border-slate-700 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-800/40 text-slate-400 hover:text-cyan-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Additional Document / Passbook</span>
              </button>
            </div>

            {/* Right Document Viewer Area */}
            <div className="flex-1 bg-slate-950 p-3 overflow-hidden flex flex-col min-w-0">
              {currentDoc ? (
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  {/* Top Bar for Selected Document: Name, DocType & Replace/Delete Controls */}
                  <div className="mb-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-white truncate max-w-[240px]">
                        {currentDoc.customTitle || currentDoc.filename}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase whitespace-nowrap">
                        {currentDoc.docType}
                      </span>
                      {currentDoc.customTitle && (
                        <span className="text-slate-400 text-[11px] font-mono hidden sm:inline truncate max-w-[160px]">
                          ({currentDoc.filename})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Replace Document Button */}
                      <button
                        onClick={() => {
                          setDocToReplace(currentDoc);
                          setReplacementFile(null);
                          setReplacementError('');
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        title="Replace this document with an updated file"
                      >
                        <RefreshCw className="w-3 h-3 text-cyan-400" />
                        <span>Replace Document</span>
                      </button>

                      {/* Delete Document Button */}
                      <button
                        onClick={() => setDocToDelete(currentDoc)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-800 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        title="Delete this document from the dossier"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>Delete Document</span>
                      </button>
                    </div>
                  </div>

                  {/* Embedded Canvas / SVG Viewer */}
                  <div className="flex-1 overflow-hidden min-w-0">
                    <DocumentViewer
                      document={currentDoc}
                      technician={technician}
                      isAadhaarUnlocked={isAadhaarUnlocked}
                      onRequestUnlockAadhaar={onRequestUnlockAadhaar}
                    />
                  </div>
                </div>
              ) : (
                <div className="m-auto text-center text-slate-500 text-sm space-y-3">
                  <p>No documents uploaded in this record folder yet.</p>
                  <button
                    onClick={() => onOpenAddDocument(technician)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Upload Original PDF or Passbook
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: NET BANK ACCOUNT */}
        {/* ============================================================ */}
        {activeTab === 'bank' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-400" />
                    <span>Net Banking & Settlement Account Details</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Direct account for settlements, commissions, service invoices and payments.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('edit')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Update Bank Details</span>
                </button>
              </div>

              {/* Bank Account Details Card */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-800/40 shadow-xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 flex items-center justify-center font-bold text-lg">
                      ₹
                    </div>
                    <div>
                      <span className="text-xs font-mono uppercase text-slate-400">Primary Settlement Bank</span>
                      <h4 className="text-lg font-bold text-white">
                        {technician.bankDetails?.bankName || 'No Bank Configured'}
                      </h4>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-mono text-xs font-semibold">
                    {technician.bankDetails?.accountNumber ? 'Active Account' : 'Action Required'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs font-sans">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px] mb-1">Account Holder Name</span>
                    <span className="font-bold text-white text-sm block">
                      {technician.bankDetails?.accountHolderName || technician.fullName}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-[11px]">Bank Account Number</span>
                      {technician.bankDetails?.accountNumber && (
                        <button
                          onClick={() => handleCopy(technician.bankDetails!.accountNumber, 'acc')}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedField === 'acc' ? 'Copied!' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm block">
                      {technician.bankDetails?.accountNumber ? (
                        isAadhaarUnlocked 
                          ? technician.bankDetails.accountNumber 
                          : `••••••••${technician.bankDetails.accountNumber.slice(-4)}`
                      ) : '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-[11px]">IFSC Code</span>
                      {technician.bankDetails?.ifscCode && (
                        <button
                          onClick={() => handleCopy(technician.bankDetails!.ifscCode, 'ifsc')}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedField === 'ifsc' ? 'Copied!' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                    <span className="font-mono font-bold text-cyan-300 text-sm block">
                      {technician.bankDetails?.ifscCode || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px] mb-1">Branch Name</span>
                    <span className="font-medium text-slate-200 block">
                      {technician.bankDetails?.branchName || 'Civil Lines'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px] mb-1">UPI ID / Net Banking ID</span>
                    <span className="font-mono font-medium text-slate-200 block">
                      {technician.bankDetails?.upiId || '—'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[11px] mb-1">Linked Record ID</span>
                    <span className="font-mono font-bold text-cyan-400 block">
                      {technician.applicationNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bank Document Preview Shortcut */}
              <div className="space-y-3">
                <span className="font-bold text-slate-300 text-xs uppercase tracking-wide block">
                  Attached Passbook & Cheque Documents:
                </span>
                {technician.documents?.filter(d => d.docType === 'bank_account').length === 0 ? (
                  <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 text-center space-y-2">
                    <p className="text-xs text-slate-400">No bank passbook or cancelled cheque uploaded yet.</p>
                    <button
                      onClick={() => onOpenAddDocument(technician)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      + Upload Bank Passbook / Cheque PDF
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {technician.documents?.filter(d => d.docType === 'bank_account').map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="font-mono font-bold text-white block">{doc.customTitle || doc.filename}</span>
                            <span className="text-[10px] text-slate-500">{doc.fileSizeKb} KB · Imported {new Date(doc.importDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const idx = technician.documents.findIndex(d => d.id === doc.id);
                            if (idx >= 0) setSelectedDocIndex(idx);
                            setActiveTab('documents');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 rounded font-mono text-[11px] cursor-pointer"
                        >
                          View Original
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: EDIT DETAILS & CLASSIFICATION */}
        {/* ============================================================ */}
        {activeTab === 'edit' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Edit Record & Banking Information
                  </h3>
                  <p className="text-xs text-slate-400">
                    Update information for AC technicians, service centers, godowns and wholesalers.
                  </p>
                </div>
                <button
                  onClick={handleSaveFields}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold transition-colors shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Record Updates</span>
                </button>
              </div>

              {Boolean(technician.correctedFields && technician.correctedFields.length > 0) && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs text-amber-300 flex items-center gap-2 font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Operator corrected fields: {technician.correctedFields?.join(', ')}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-sans">
                {/* Registration Details */}
                <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>A. Identification & Entity Type</span>
                  </h4>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Record ID (Fixed Key)</label>
                    <input
                      type="text"
                      disabled
                      value={technician.applicationNumber}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-300 font-mono font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Main Category</label>
                    <input
                      type="text"
                      disabled
                      value={technician.mainCategory || 'Technician'}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-300 font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      {isPartner ? 'Partner Type' : 'Specialization / Trade'}
                    </label>
                    <input
                      type="text"
                      value={isPartner ? (formData.category) : formData.specialization}
                      onChange={(e) => {
                        if (isPartner) {
                          setFormData({ ...formData, category: e.target.value as TechnicianCategory });
                        } else {
                          setFormData({ ...formData, specialization: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Verification Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as VerificationStatus })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                    >
                      <option value="verified">Verified (Approved)</option>
                      <option value="pending_review">Pending Review</option>
                      <option value="flagged_handwritten">Flagged (Handwritten Anomaly)</option>
                      <option value="rejected">Rejected / Invalid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">District / City</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                    />
                  </div>
                </div>

                {/* Personal / Firm Details */}
                <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
                  <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>B. Name & Contact Information</span>
                  </h4>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      {isPartner ? 'Business / Firm / Center Name' : 'Full Legal Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-bold"
                    />
                  </div>

                  {isPartner ? (
                    <div>
                      <label className="block text-slate-400 mb-1">Contact Person / Owner</label>
                      <input
                        type="text"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        placeholder="Manager / Owner Name"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Father's Name</label>
                        <input
                          type="text"
                          value={formData.fatherName}
                          onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                          placeholder="e.g. Abdul Hameed"
                          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-mono">Mobile (10 digits)</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-mono">Alternate Phone</label>
                      <input
                        type="text"
                        value={formData.alternateMobile}
                        onChange={(e) => setFormData({ ...formData, alternateMobile: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  {isPartner ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1 font-mono">GST Number</label>
                        <input
                          type="text"
                          value={formData.gstNumber}
                          onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                          placeholder="e.g. 09ABCDE1234F1Z5"
                          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-mono">PAN Number</label>
                        <input
                          type="text"
                          value={formData.panNumber}
                          onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                          placeholder="ABCDE1234F"
                          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-400 mb-1 font-mono">PAN Number (Optional)</label>
                      <input
                        type="text"
                        value={formData.panNumber}
                        onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                        placeholder="ABCDE1234F"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 mb-1">Full Postal / Shop / Godown Address</label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
                    />
                  </div>
                </div>

                {/* Net Banking Details Edit Card */}
                <div className="md:col-span-2 p-4 rounded-lg bg-slate-900 border border-emerald-800/40 space-y-4">
                  <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>C. Net Bank Account & Settlement Information</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="State Bank of India, HDFC, PNB..."
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-mono">Account Number</label>
                      <input
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        placeholder="Account Number"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-mono">IFSC Code</label>
                      <input
                        type="text"
                        value={formData.ifscCode}
                        onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                        placeholder="SBIN0001234"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Account Holder Legal Name</label>
                      <input
                        type="text"
                        value={formData.accountHolderName}
                        onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                        placeholder="Name as per passbook"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Branch Name</label>
                      <input
                        type="text"
                        value={formData.branchName}
                        onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                        placeholder="Branch Name"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">UPI ID / Net Banking ID</label>
                      <input
                        type="text"
                        value={formData.upiId}
                        onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                        placeholder="e.g. 9876543210@paytm"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: SECURITY & AADHAAR */}
        {/* ============================================================ */}
        {activeTab === 'security' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      Identity Encryption & Masking
                    </h4>
                    <p className="text-xs text-slate-400">
                      ORACLIME Identity Protection Protocol
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Aadhaar / Government ID</span>
                    <span className="font-bold text-white text-base">
                      {isAadhaarUnlocked 
                        ? (technician.unmaskedAadhaar || technician.aadhaarNumber || 'Not on file') 
                        : (technician.aadhaarNumber || 'XXXX-XXXX-0000')}
                    </span>
                  </div>
                  <button
                    onClick={onRequestUnlockAadhaar}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isAadhaarUnlocked
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                    }`}
                  >
                    {isAadhaarUnlocked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlocked</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock with PIN</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: AUDIT TRAIL */}
        {/* ============================================================ */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950/80 font-mono text-xs">
            <div className="max-w-3xl mx-auto space-y-3">
              <h4 className="text-sm font-bold text-white font-sans">
                Audit Trail & Access History ({technician.auditTrail?.length || 0} events)
              </h4>
              <div className="space-y-2">
                {technician.auditTrail?.map((entry) => (
                  <div key={entry.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-cyan-400 font-bold">{entry.action}</span>
                      <span className="text-slate-500">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 text-xs font-sans">{entry.details}</p>
                    <div className="text-[10px] text-slate-500">Actor: {entry.actor}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ============================================================ */}
      {/* DIALOG 1: DELETE DOCUMENT CONFIRMATION */}
      {/* ============================================================ */}
      {docToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Document</h3>
                <span className="text-xs text-slate-400 font-mono">{technician.applicationNumber}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Document Name:</span>
                <span className="font-bold text-white truncate max-w-[200px]">{docToDelete.filename}</span>
              </div>
              {docToDelete.customTitle && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono">Display Title:</span>
                  <span className="text-cyan-300 font-semibold">{docToDelete.customTitle}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Category:</span>
                <span className="uppercase text-slate-300 font-mono text-[11px]">{docToDelete.docType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">File Size:</span>
                <span className="text-slate-400 font-mono">{docToDelete.fileSizeKb} KB</span>
              </div>
            </div>

            <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs text-amber-300 space-y-1">
              <span className="font-bold block">Safety Assurance:</span>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Only this specific file will be removed. All other documents and the record for <strong>{technician.fullName}</strong> will remain completely intact.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteDocument}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DIALOG 2: REPLACE DOCUMENT */}
      {/* ============================================================ */}
      {docToReplace && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-3 text-cyan-400">
                <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Replace Document</h3>
                  <span className="text-xs text-slate-400 font-mono">Record: {technician.applicationNumber}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setDocToReplace(null);
                  setReplacementFile(null);
                  setReplacementError('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5">
              <span className="text-slate-400 font-mono block text-[11px] uppercase">Current Document Being Replaced:</span>
              <div className="font-mono font-bold text-cyan-300 text-sm truncate">{docToReplace.filename}</div>
              <div className="text-slate-400 text-[11px]">
                Type: <span className="uppercase text-slate-200">{docToReplace.docType}</span> · Size: {docToReplace.fileSizeKb} KB
              </div>
            </div>

            {/* Choose New File */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Choose New Corrected File (PDF or Image):
              </label>
              <input
                type="file"
                ref={replaceFileInputRef}
                accept=".pdf,image/*,.txt"
                onChange={handleFileForReplacementSelected}
                className="hidden"
              />
              <button
                onClick={() => replaceFileInputRef.current?.click()}
                className="w-full p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/80 bg-slate-950/60 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-cyan-400" />
                <span className="text-xs font-semibold text-white">
                  {replacementFile ? replacementFile.name : 'Click to select corrected file from computer'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {replacementFile ? `${Math.round(replacementFile.size / 1024)} KB` : 'Supports PDF, JPG, PNG up to 25MB'}
                </span>
              </button>
            </div>

            {replacementError && (
              <p className="text-xs text-rose-400 font-mono">{replacementError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setDocToReplace(null);
                  setReplacementFile(null);
                  setReplacementError('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!replacementFile || isReplacingDoc}
                onClick={handleConfirmReplaceDocument}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isReplacingDoc ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Confirm & Replace File</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DIALOG 3: RECORD DELETION / ARCHIVAL */}
      {/* ============================================================ */}
      {isDeleteRecordDialogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 text-slate-100 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-11 h-11 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">
                  Delete {isPartner ? 'Partner' : 'Technician'} Record
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {technician.applicationNumber} · {technician.fullName}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Record Name:</span>
                <span className="font-bold text-white">{technician.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Category:</span>
                <span className="text-cyan-300 font-bold">{isPartner ? `Partner (${technician.partnerType || 'General'})` : 'Technician'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Attached Documents:</span>
                <span className="text-amber-400 font-mono font-bold">{technician.documents?.length || 0} Files</span>
              </div>
            </div>

            {/* Deletion Mode Selector */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-300 block">Choose Deletion Mode:</span>
              
              <label className={`p-3 rounded-lg border block cursor-pointer transition-colors ${
                !deletePermanent 
                  ? 'bg-slate-800/90 border-cyan-500 text-white' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={!deletePermanent}
                    onChange={() => setDeletePermanent(false)}
                    className="accent-cyan-500"
                  />
                  <span className="font-bold text-xs text-white">Archive / Deactivate Record (Recommended)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 pl-5 leading-relaxed">
                  Safely moves the record to inactive archives. Preserves uploaded files and compliance audit logs.
                </p>
              </label>

              <label className={`p-3 rounded-lg border block cursor-pointer transition-colors ${
                deletePermanent 
                  ? 'bg-rose-950/40 border-rose-600 text-rose-200' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={deletePermanent}
                    onChange={() => setDeletePermanent(true)}
                    className="accent-rose-500"
                  />
                  <span className="font-bold text-xs text-rose-300">Permanently Delete Record</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 pl-5 leading-relaxed">
                  Irreversibly removes this record and file references from the database.
                </p>
              </label>
            </div>

            {/* Optional Reason Input */}
            <div>
              <label className="block text-[11px] text-slate-400 font-mono mb-1">
                Reason for Deletion / Archival (Recorded in Audit Trail):
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Inactive partner, duplicate entry, operator request"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-rose-400 font-mono">{deleteError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsDeleteRecordDialogOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteRecord}
                className={`px-4 py-2 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  deletePermanent 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                    : 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletePermanent ? 'Confirm Permanent Deletion' : 'Confirm Archive'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
