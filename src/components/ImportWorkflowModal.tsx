import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  FolderPlus, 
  RefreshCw, 
  ShieldAlert, 
  Layers, 
  AlertCircle,
  CreditCard,
  Building2,
  Warehouse,
  Store,
  Wrench,
  Eye
} from 'lucide-react';
import { 
  TechnicianRecord, 
  AttachedDocument, 
  DocumentType, 
  UserAccount, 
  RecordEntityType, 
  TechnicianCategory,
  BankAccountDetails,
  MainCategory,
  PartnerType
} from '../types/dms';
import { OcrService, ExtractionResult } from '../services/ocrService';
import { StorageService } from '../services/storageService';
import { CryptoService } from '../services/cryptoService';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface ImportWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (record: TechnicianRecord) => void;
  targetTechnicianForAppend?: TechnicianRecord | null;
  currentUser: UserAccount;
}

export const ImportWorkflowModal: React.FC<ImportWorkflowModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  targetTechnicianForAppend,
  currentUser,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [docType, setDocType] = useState<DocumentType>('bank_account');
  const [rawTextContent, setRawTextContent] = useState<string>('');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  
  // Processing state
  const [processingStage, setProcessingStage] = useState<'idle' | 'pymupdf' | 'ocr_fallback' | 'field_match' | 'complete'>('idle');
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);

  // Duplicate prompt state
  const [duplicateTech, setDuplicateTech] = useState<TechnicianRecord | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'update' | 'append'>('append');

  // Step 4 verification state
  const [entityType, setEntityType] = useState<RecordEntityType>('technician');
  const [editableFields, setEditableFields] = useState({
    applicationNumber: '',
    fullName: '',
    fatherName: '',
    mobile: '',
    district: 'Moradabad',
    category: 'Normal AC Technician' as TechnicianCategory,
    address: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: '',
  });

  const [validationError, setValidationError] = useState<string>('');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadedFileName(file.name);

    const buffer = await file.arrayBuffer();
    setFileBuffer(buffer);

    // Read Data URL for original preservation
    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Extract text from PDF buffer or plain text
    let extracted = '';
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      extracted = OcrService.extractTextFromPdfBuffer(buffer);
    } else {
      const textDecoder = new TextDecoder('utf-8');
      extracted = textDecoder.decode(buffer);
    }

    setRawTextContent(extracted);
    startProcessing(extracted, file.name, extracted.length < 50);
  };

  const startProcessing = (text: string, filename: string, isScannedMode: boolean) => {
    setCurrentStep(2);
    setProcessingStage('pymupdf');
    setProcessingLogs([`[INFO] Ingesting original file '${filename}'...`]);

    setTimeout(() => {
      setProcessingLogs(prev => [
        ...prev,
        `[STAGE 1] Ingesting document buffer and computing checksum...`,
      ]);

      setTimeout(() => {
        if (isScannedMode) {
          setProcessingLogs(prev => [
            ...prev,
            `[STAGE 2] Image/scanned document detected. Preserving high-resolution scan...`,
          ]);
          setProcessingStage('ocr_fallback');
        } else {
          setProcessingLogs(prev => [
            ...prev,
            `[STAGE 1] Vector text stream read successfully.`,
          ]);
        }

        setTimeout(() => {
          setProcessingStage('field_match');
          setProcessingLogs(prev => [
            ...prev,
            `[STAGE 3] Parsing metadata, application/partner identifiers...`,
          ]);

          const result = OcrService.processDocument(text, filename, isScannedMode);
          setExtractionResult(result);

          const defaultAppNum = targetTechnicianForAppend 
            ? targetTechnicianForAppend.applicationNumber 
            : (result.applicationNumber || `ORAC-${Math.floor(1000 + Math.random() * 9000)}`);

          // Attempt to extract IFSC or Bank Account from text
          const ifscMatch = text.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/i);
          const ifsc = ifscMatch ? ifscMatch[1].toUpperCase() : (targetTechnicianForAppend?.bankDetails?.ifscCode || '');

          const accMatch = text.match(/(?:A\/C|ACCOUNT|ACC)[\s.:#]*(\d{9,18})/i);
          const accNo = accMatch ? accMatch[1] : (targetTechnicianForAppend?.bankDetails?.accountNumber || '');

          const detectedBankName = targetTechnicianForAppend?.bankDetails?.bankName || (
            /sbi|state\s*bank/i.test(text) ? 'State Bank of India' :
            /hdfc/i.test(text) ? 'HDFC Bank' :
            /icici/i.test(text) ? 'ICICI Bank' :
            /pnb|punjab\s*national/i.test(text) ? 'Punjab National Bank' :
            /bob|bank\s*of\s*baroda/i.test(text) ? 'Bank of Baroda' : ''
          );

          const initialEntityType = targetTechnicianForAppend?.entityType || (
            /service\s*center|workshop/i.test(text) ? 'service_center' :
            /godown|warehouse|depot/i.test(text) ? 'godown' :
            /wholesaler|distributor/i.test(text) ? 'wholesaler' : 'technician'
          );
          setEntityType(initialEntityType);

          setEditableFields({
            applicationNumber: defaultAppNum,
            fullName: targetTechnicianForAppend ? targetTechnicianForAppend.fullName : (result.fullName || ''),
            fatherName: targetTechnicianForAppend ? (targetTechnicianForAppend.fatherName || '') : result.fatherName,
            mobile: targetTechnicianForAppend ? targetTechnicianForAppend.mobile : (result.mobile || ''),
            district: targetTechnicianForAppend ? targetTechnicianForAppend.district : (result.district || 'Moradabad'),
            category: targetTechnicianForAppend ? targetTechnicianForAppend.category : result.category,
            address: targetTechnicianForAppend ? targetTechnicianForAppend.address : result.address,
            bankName: detectedBankName,
            accountNumber: accNo,
            ifscCode: ifsc,
            accountHolderName: targetTechnicianForAppend ? (targetTechnicianForAppend.bankDetails?.accountHolderName || targetTechnicianForAppend.fullName) : (result.fullName || ''),
            upiId: targetTechnicianForAppend?.bankDetails?.upiId || '',
          });

          // Check if Application Number already exists in DB
          if (defaultAppNum && !targetTechnicianForAppend) {
            const existing = StorageService.findByApplicationNumber(defaultAppNum);
            if (existing) {
              setDuplicateTech(existing);
              setProcessingLogs(prev => [
                ...prev,
                `[NOTE] Record ID '${defaultAppNum}' matches existing entity '${existing.fullName}'.`,
              ]);
              setProcessingStage('complete');
              setCurrentStep(3); // Prompt duplicate decision modal
              return;
            }
          }

          setDuplicateTech(null);
          setProcessingStage('complete');
          setCurrentStep(4); // Verification
        }, 300);
      }, 300);
    }, 300);
  };

  const handleDuplicateDecision = (action: 'update' | 'append') => {
    setDuplicateAction(action);
    setCurrentStep(4);
  };

  const handleFinalSave = async () => {
    if (!extractionResult) return;
    setValidationError('');

    const cleanAppNum = editableFields.applicationNumber.trim().toUpperCase();
    if (!cleanAppNum || cleanAppNum.length < 3) {
      setValidationError('Please enter a valid Application / Partner ID.');
      return;
    }

    if (!editableFields.fullName.trim()) {
      setValidationError('Please enter the Full Name / Business Name.');
      return;
    }

    // Create the document record preserving original binary and computed SHA-256
    const newDoc = await OcrService.createDocumentRecord(
      uploadedFileName || `document_${cleanAppNum}.pdf`,
      docType,
      cleanAppNum,
      extractionResult,
      fileBuffer || undefined,
      fileDataUrl || undefined,
      selectedFile ? Math.round(selectedFile.size / 1024) : undefined
    );

    const actorName = `${currentUser.fullName} (${currentUser.username})`;

    const bankDetails: BankAccountDetails | undefined = (editableFields.bankName || editableFields.accountNumber || editableFields.ifscCode) ? {
      bankName: editableFields.bankName.trim(),
      accountNumber: editableFields.accountNumber.trim(),
      ifscCode: editableFields.ifscCode.trim().toUpperCase(),
      accountHolderName: editableFields.accountHolderName.trim() || editableFields.fullName.trim(),
      upiId: editableFields.upiId.trim(),
    } : undefined;

    // If appending to existing technician/partner
    if (duplicateTech && duplicateAction === 'append') {
      const updated = StorageService.appendDocumentToTechnician(
        cleanAppNum,
        newDoc,
        actorName
      );
      if (updated) {
        if (bankDetails && !updated.bankDetails) {
          StorageService.updateTechnician({ ...updated, bankDetails }, 'Bank Details Added from Document', actorName);
        }
        onImportComplete(updated);
        onClose();
        return;
      }
    }

    // If target technician was passed for append
    if (targetTechnicianForAppend) {
      const updated = StorageService.appendDocumentToTechnician(
        targetTechnicianForAppend.applicationNumber,
        newDoc,
        actorName
      );
      if (updated) {
        if (bankDetails) {
          StorageService.updateTechnician({ ...updated, bankDetails }, 'Bank Details Updated from Document', actorName);
        }
        onImportComplete(updated);
        onClose();
        return;
      }
    }

    // If updating existing or creating fresh record
    const isPartner = entityType === 'service_center' || entityType === 'godown' || entityType === 'wholesaler';
    const mainCategory: MainCategory = isPartner ? 'Partner' : 'Technician';
    const partnerType: PartnerType | undefined = isPartner
      ? (entityType === 'service_center' ? 'Service Center' : entityType === 'godown' ? 'Godown / Warehouse' : 'Wholesaler / Dealer')
      : undefined;

    const baseTech: TechnicianRecord = duplicateTech && duplicateAction === 'update'
      ? duplicateTech
      : {
          id: `rec_${Date.now()}`,
          mainCategory,
          partnerType,
          specialization: !isPartner ? (editableFields.category || 'AC Installation & Repair') : undefined,
          entityType,
          applicationNumber: cleanAppNum,
          registrationDate: new Date().toISOString().split('T')[0],
          status: extractionResult.suggestedStatus,
          district: editableFields.district,
          category: mainCategory,
          fullName: editableFields.fullName.trim(),
          fatherName: editableFields.fatherName.trim() || undefined,
          mobile: editableFields.mobile.trim(),
          address: editableFields.address.trim(),
          bankDetails,
          folderPath: `ORACLIME_DMS/Records/${cleanAppNum}/`,
          correctedFields: [],
          documents: [],
          auditTrail: [],
          reviewer: actorName,
          verificationDate: new Date().toISOString(),
        };

    const updatedDocs = [...(baseTech.documents || []), newDoc];
    const updatedRecord: TechnicianRecord = {
      ...baseTech,
      mainCategory,
      partnerType: mainCategory === 'Partner' ? (partnerType || baseTech.partnerType) : undefined,
      specialization: mainCategory === 'Technician' ? (editableFields.category || baseTech.specialization) : undefined,
      category: mainCategory,
      entityType,
      fullName: editableFields.fullName.trim(),
      fatherName: editableFields.fatherName.trim() || undefined,
      mobile: editableFields.mobile.trim(),
      district: editableFields.district,
      address: editableFields.address.trim(),
      bankDetails: bankDetails || baseTech.bankDetails,
      documents: updatedDocs,
      folderPath: `ORACLIME_DMS/Records/${cleanAppNum}/`,
    };

    const saved = StorageService.updateTechnician(
      updatedRecord, 
      duplicateTech ? 'Record Updated via Document Upload' : 'Document Ingested & Record Stored',
      actorName
    );

    onImportComplete(saved);
    onClose();
  };

  const docTypeOptions: { type: DocumentType; label: string; icon: any }[] = [
    { type: 'bank_account', label: 'Bank Passbook / Cheque', icon: CreditCard },
    { type: 'aadhaar', label: 'Aadhaar / ID Card', icon: FileText },
    { type: 'pan_card', label: 'PAN Card', icon: FileText },
    { type: 'gst_certificate', label: 'GST / Trade License', icon: Building2 },
    { type: 'agreement', label: 'Partner Agreement', icon: FileText },
    { type: 'registration', label: 'Registration Form', icon: FileText },
    { type: 'certificates', label: 'Trade Certificate', icon: FileText },
    { type: 'photo', label: 'Shop / Godown / ID Photo', icon: Eye },
    { type: 'other', label: 'Other Document', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-6 font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Upload & Store Original PDF / Document
              </h2>
              <p className="text-xs text-slate-400">
                Unaltered file storage for Bank Passbooks, Cheques, ID proofs, Agreements & Partner documents.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-4 border-b border-slate-800 text-xs font-mono bg-slate-950/60">
          <div className={`p-3 border-r border-slate-800 flex items-center gap-2 ${currentStep === 1 ? 'text-cyan-400 font-bold bg-slate-900' : 'text-slate-500'}`}>
            <span>1.</span> <span>Choose Document Type & File</span>
          </div>
          <div className={`p-3 border-r border-slate-800 flex items-center gap-2 ${currentStep === 2 ? 'text-cyan-400 font-bold bg-slate-900' : 'text-slate-500'}`}>
            <span>2.</span> <span>Ingest File</span>
          </div>
          <div className={`p-3 border-r border-slate-800 flex items-center gap-2 ${currentStep === 3 ? 'text-amber-400 font-bold bg-slate-900' : 'text-slate-500'}`}>
            <span>3.</span> <span>Duplicate Check</span>
          </div>
          <div className={`p-3 flex items-center gap-2 ${currentStep === 4 ? 'text-emerald-400 font-bold bg-slate-900' : 'text-slate-500'}`}>
            <span>4.</span> <span>Verify & Save Record</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[72vh]">
          {/* STEP 1: Select Real File */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Document Type Selector */}
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                <span className="text-slate-300 font-bold text-xs uppercase tracking-wide block">
                  Select What Document You Are Uploading:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {docTypeOptions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.type}
                        onClick={() => setDocType(item.type)}
                        className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs transition-all text-left cursor-pointer ${
                          docType === item.type
                            ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 font-bold shadow-xs'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 text-cyan-400" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drag & Drop Real Files */}
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-xl p-8 text-center bg-slate-950/50 transition-colors">
                <input
                  type="file"
                  id="pdf-upload-input"
                  accept=".pdf,image/*,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="pdf-upload-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3 font-sans"
                >
                  <div className="w-14 h-14 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center border border-slate-700">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-base font-bold text-white block">
                      Choose {docType === 'bank_account' ? 'Bank Passbook / Cheque' : 'Document'} PDF or Image
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">
                      Supports Text PDFs, Scans, JPG, PNG & Photos
                    </span>
                  </div>
                  <span className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow-xs">
                    Browse Computer Files
                  </span>
                </label>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-400">
                <span className="text-cyan-400 font-bold block mb-1">Direct File Preservation:</span>
                <p className="text-[11px] leading-relaxed">
                  The uploaded file will be stored directly with its original format and exact visual appearance. No automated guesses or OCR overrides will overwrite your genuine data.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Ingesting */}
          {currentStep === 2 && (
            <div className="space-y-6 font-mono text-xs">
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-cyan-400 font-bold flex items-center gap-2">
                    <Cpu className="w-4 h-4 animate-spin text-cyan-400" />
                    Ingesting: {uploadedFileName}
                  </span>
                  <span className="text-slate-500 uppercase font-mono text-[11px]">
                    Stage: {processingStage}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 max-h-60 overflow-y-auto">
                  {processingLogs.map((log, idx) => (
                    <div key={idx} className="text-slate-300">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Duplicate ID Prompt */}
          {currentStep === 3 && duplicateTech && (
            <div className="p-6 bg-slate-950 rounded-xl border border-amber-500/40 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Existing Record Found
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Record ID <strong className="font-mono text-amber-300">{duplicateTech.applicationNumber}</strong> already exists under <strong className="text-white">{duplicateTech.fullName}</strong> ({duplicateTech.district}).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <button
                  onClick={() => handleDuplicateDecision('append')}
                  className="p-4 rounded-lg border border-cyan-500/60 bg-cyan-950/20 hover:bg-cyan-950/40 text-left transition-all space-y-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
                    <FolderPlus className="w-4 h-4" />
                    <span>Append to {duplicateTech.fullName} (Recommended)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    Keep the existing record intact and attach <strong>{uploadedFileName}</strong> as an additional verified document in their folder.
                  </p>
                </button>

                <button
                  onClick={() => handleDuplicateDecision('update')}
                  className="p-4 rounded-lg border border-amber-500/50 bg-amber-950/20 hover:bg-amber-950/40 text-left transition-all space-y-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                    <RefreshCw className="w-4 h-4" />
                    <span>Update Record & Banking Details</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    Update {duplicateTech.fullName}'s profile and banking info with details from this file.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Verification & Approval Side-by-Side */}
          {currentStep === 4 && extractionResult && (
            <div className="space-y-6">
              {validationError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Entity Type Selector */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-sans">
                <span className="text-slate-400 font-semibold">Entity Type:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEntityType('technician');
                      setEditableFields(prev => ({ ...prev, category: 'Normal AC Technician' }));
                    }}
                    className={`px-3 py-1 rounded text-xs transition-colors ${entityType === 'technician' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  >
                    AC Technician
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntityType('service_center');
                      setEditableFields(prev => ({ ...prev, category: 'Authorized Service Center' }));
                    }}
                    className={`px-3 py-1 rounded text-xs transition-colors ${entityType === 'service_center' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  >
                    Service Center
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntityType('godown');
                      setEditableFields(prev => ({ ...prev, category: 'Godown & Warehouse' }));
                    }}
                    className={`px-3 py-1 rounded text-xs transition-colors ${entityType === 'godown' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  >
                    Godown / Warehouse
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntityType('wholesaler');
                      setEditableFields(prev => ({ ...prev, category: 'AC Parts & Equipment Wholesaler' }));
                    }}
                    className={`px-3 py-1 rounded text-xs transition-colors ${entityType === 'wholesaler' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  >
                    Wholesaler
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {/* Left: Original File Preview / Extracted text */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 flex flex-col font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span>Uploaded File: {uploadedFileName}</span>
                    </span>
                    <span className="text-emerald-400 text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                      Original Intact
                    </span>
                  </div>

                  {fileDataUrl ? (
                    fileDataUrl.startsWith('data:image/') ? (
                      <div className="flex-1 bg-slate-900 p-2 rounded flex items-center justify-center max-h-72 overflow-hidden border border-slate-800">
                        <img src={fileDataUrl} alt="Preview" className="max-h-64 object-contain rounded" />
                      </div>
                    ) : (
                      <div className="flex-1 bg-slate-900 rounded overflow-hidden max-h-72 border border-slate-800">
                        <PdfCanvasViewer 
                          pdfData={fileDataUrl} 
                          filename={uploadedFileName} 
                          className="h-64 border-0 shadow-none"
                        />
                      </div>
                    )
                  ) : (
                    <div className="flex-1 bg-slate-900 p-3 rounded text-slate-300 text-[11px] whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed border border-slate-800">
                      {rawTextContent || extractionResult.rawExtractedText || 'No text extracted.'}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 font-sans">
                    Classification: <strong className="text-cyan-300 font-mono uppercase">{docType}</strong>
                  </div>
                </div>

                {/* Right: Editable Verification Fields */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 font-sans">
                  <div className="pb-2 border-b border-slate-800 font-bold text-slate-300 text-xs">
                    Verify & Confirm Details
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-mono">
                        {entityType === 'technician' ? 'Application No. *' : 'Partner Code *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={editableFields.applicationNumber}
                        onChange={(e) => setEditableFields({ ...editableFields, applicationNumber: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">
                        {entityType === 'technician' ? 'Full Name *' : 'Business / Firm Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={editableFields.fullName}
                        onChange={(e) => setEditableFields({ ...editableFields, fullName: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white font-semibold focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-mono">Mobile (10 digits) *</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={editableFields.mobile}
                        onChange={(e) => setEditableFields({ ...editableFields, mobile: e.target.value.replace(/\D/g, '') })}
                        placeholder="9876543210"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">District / City</label>
                      <input
                        type="text"
                        value={editableFields.district}
                        onChange={(e) => setEditableFields({ ...editableFields, district: e.target.value })}
                        placeholder="e.g. Moradabad"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Category / Trade Classification</label>
                    <select
                      value={editableFields.category}
                      onChange={(e) => setEditableFields({ ...editableFields, category: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500 text-xs"
                    >
                      {entityType === 'technician' ? (
                        <>
                          <option value="Normal AC Technician">Normal AC Technician</option>
                          <option value="AC Installation & Repair">AC Installation & Repair</option>
                          <option value="Senior AC Technician">Senior AC Technician</option>
                        </>
                      ) : entityType === 'service_center' ? (
                        <>
                          <option value="Authorized Service Center">Authorized Service Center</option>
                          <option value="AC Multi-Brand Workshop">AC Multi-Brand Workshop</option>
                        </>
                      ) : entityType === 'godown' ? (
                        <>
                          <option value="Godown & Warehouse">Godown & Warehouse</option>
                          <option value="AC Spares & Unit Depot">AC Spares & Unit Depot</option>
                        </>
                      ) : (
                        <>
                          <option value="AC Parts & Equipment Wholesaler">AC Parts & Equipment Wholesaler</option>
                          <option value="Authorized Parts Distributor">Authorized Parts Distributor</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Net Bank Account Details sub-card */}
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg space-y-2 text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Net Banking / Bank Account Details</span>
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-0.5">Bank Name</label>
                        <input
                          type="text"
                          value={editableFields.bankName}
                          onChange={(e) => setEditableFields({ ...editableFields, bankName: e.target.value })}
                          placeholder="e.g. State Bank of India"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-0.5">Account Number</label>
                        <input
                          type="text"
                          value={editableFields.accountNumber}
                          onChange={(e) => setEditableFields({ ...editableFields, accountNumber: e.target.value })}
                          placeholder="Account No"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-0.5">IFSC Code</label>
                        <input
                          type="text"
                          value={editableFields.ifscCode}
                          onChange={(e) => setEditableFields({ ...editableFields, ifscCode: e.target.value.toUpperCase() })}
                          placeholder="e.g. SBIN0001234"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px] mb-0.5">Account Holder Name</label>
                        <input
                          type="text"
                          value={editableFields.accountHolderName}
                          onChange={(e) => setEditableFields({ ...editableFields, accountHolderName: e.target.value })}
                          placeholder="Holder Name"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800 font-sans">
          <div>
            {currentStep > 1 && currentStep !== 3 && (
              <button
                onClick={() => setCurrentStep(1)}
                className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-mono"
              >
                ← Back to Upload
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            {currentStep === 4 && (
              <button
                onClick={handleFinalSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold transition-colors shadow-lg cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Record & Store Document</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
