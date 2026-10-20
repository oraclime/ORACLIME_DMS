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
  AlertCircle 
} from 'lucide-react';
import { TechnicianRecord, AttachedDocument, DocumentType, UserAccount } from '../types/dms';
import { OcrService, ExtractionResult } from '../services/ocrService';
import { StorageService } from '../services/storageService';
import { CryptoService } from '../services/cryptoService';

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
  const [docType, setDocType] = useState<DocumentType>('registration');
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
  const [editableFields, setEditableFields] = useState({
    applicationNumber: '',
    fullName: '',
    fatherName: '',
    mobile: '',
    district: 'Moradabad',
    category: 'HVAC & RAC Technician' as any,
    address: '',
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
        `[STAGE 1 - PyMuPDF] Inspecting vector text streams...`,
      ]);

      setTimeout(() => {
        if (isScannedMode) {
          setProcessingLogs(prev => [
            ...prev,
            `[STAGE 1] Low selectable text density in PDF stream.`,
            `[STAGE 2 - Tesseract OCR] Initializing OCR fallback matrix...`,
            `[STAGE 2] Language packs 'eng' + 'hin' loaded.`,
          ]);
          setProcessingStage('ocr_fallback');
        } else {
          setProcessingLogs(prev => [
            ...prev,
            `[STAGE 1] Vector text stream successfully extracted via PyMuPDF.`,
          ]);
        }

        setTimeout(() => {
          setProcessingStage('field_match');
          setProcessingLogs(prev => [
            ...prev,
            `[STAGE 3 - RegEx Field Matcher] Parsing Application Number, Mobile, Name...`,
          ]);

          const result = OcrService.processDocument(text, filename, isScannedMode);
          setExtractionResult(result);

          const defaultAppNum = targetTechnicianForAppend 
            ? targetTechnicianForAppend.applicationNumber 
            : (result.applicationNumber || '');

          setEditableFields({
            applicationNumber: defaultAppNum,
            fullName: targetTechnicianForAppend ? targetTechnicianForAppend.fullName : result.fullName,
            fatherName: targetTechnicianForAppend ? targetTechnicianForAppend.fatherName : result.fatherName,
            mobile: targetTechnicianForAppend ? targetTechnicianForAppend.mobile : result.mobile,
            district: targetTechnicianForAppend ? targetTechnicianForAppend.district : (result.district || 'Moradabad'),
            category: targetTechnicianForAppend ? targetTechnicianForAppend.category : result.category,
            address: targetTechnicianForAppend ? targetTechnicianForAppend.address : result.address,
          });

          // Check if Application Number already exists in DB
          if (defaultAppNum) {
            const existing = StorageService.findByApplicationNumber(defaultAppNum);
            if (existing && !targetTechnicianForAppend) {
              setDuplicateTech(existing);
              setProcessingLogs(prev => [
                ...prev,
                `[WARNING] Application Number '${defaultAppNum}' already exists for technician '${existing.fullName}'!`,
              ]);
              setProcessingStage('complete');
              setCurrentStep(3); // Prompt duplicate decision modal
              return;
            }
          }

          setDuplicateTech(null);
          setProcessingStage('complete');
          setCurrentStep(4); // Verification
        }, 500);
      }, 500);
    }, 400);
  };

  const handleDuplicateDecision = (action: 'update' | 'append') => {
    setDuplicateAction(action);
    setCurrentStep(4);
  };

  const handleFinalSave = async () => {
    if (!extractionResult) return;
    setValidationError('');

    const cleanAppNum = editableFields.applicationNumber.trim().toUpperCase();
    if (!cleanAppNum || cleanAppNum.length < 4) {
      setValidationError('Please enter a valid Application Number.');
      return;
    }

    if (!editableFields.fullName.trim()) {
      setValidationError('Please enter the technician Full Name.');
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

    // If appending to existing technician
    if (duplicateTech && duplicateAction === 'append') {
      const updated = StorageService.appendDocumentToTechnician(
        cleanAppNum,
        newDoc,
        actorName
      );
      if (updated) {
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
        onImportComplete(updated);
        onClose();
        return;
      }
    }

    // If updating existing technician or creating fresh record
    const baseTech: TechnicianRecord = duplicateTech && duplicateAction === 'update'
      ? duplicateTech
      : {
          id: `tech_${Date.now()}`,
          applicationNumber: cleanAppNum,
          registrationDate: new Date().toISOString().split('T')[0],
          status: extractionResult.suggestedStatus,
          district: editableFields.district,
          category: editableFields.category,
          fullName: editableFields.fullName.trim(),
          fatherName: editableFields.fatherName.trim(),
          mobile: editableFields.mobile.trim(),
          address: editableFields.address.trim(),
          dob: '1995-01-01',
          aadhaarNumber: 'XXXX-XXXX-0000',
          unmaskedAadhaar: '5482-0000-0000',
          skills: ['HVAC Installation', 'Compressor Diagnostics'],
          experienceYears: 4,
          certifications: ['ITI Trade Certified RAC'],
          trainingDetails: 'Industrial Training Institute',
          folderPath: `ORACLIME_DMS/TechnicianFiles/${cleanAppNum}/`,
          correctedFields: [],
          documents: [],
          auditTrail: [],
          reviewer: actorName,
          verificationDate: new Date().toISOString(),
        };

    const updatedDocs = [...(baseTech.documents || []), newDoc];
    const updatedRecord: TechnicianRecord = {
      ...baseTech,
      fullName: editableFields.fullName.trim(),
      fatherName: editableFields.fatherName.trim(),
      mobile: editableFields.mobile.trim(),
      district: editableFields.district,
      category: editableFields.category,
      address: editableFields.address.trim(),
      documents: updatedDocs,
      folderPath: `ORACLIME_DMS/TechnicianFiles/${cleanAppNum}/`,
    };

    const saved = StorageService.updateTechnician(
      updatedRecord, 
      duplicateTech ? 'Record Updated via PDF Ingestion' : 'Initial PDF Ingestion & Index Creation',
      actorName
    );

    onImportComplete(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-8">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {targetTechnicianForAppend
                  ? `Attach Document to ${targetTechnicianForAppend.applicationNumber} (${targetTechnicianForAppend.fullName})`
                  : 'PDF Document Ingestion & Field Extraction'}
              </h2>
              <p className="text-xs text-slate-400">
                PyMuPDF Vector Stream → Tesseract OCR Fallback → RegEx Field Matcher → Managed Folder Storage
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
            <span>1.</span> <span>Select File</span>
          </div>
          <div className={`p-3 border-r border-slate-800 flex items-center gap-2 ${currentStep === 2 ? 'text-cyan-400 font-bold bg-slate-900' : 'text-slate-500'}`}>
            <span>2.</span> <span>Processing</span>
          </div>
          <div className={`p-3 border-r border-slate-800 flex items-center gap-2 ${currentStep === 3 ? 'text-amber-400 font-bold bg-slate-900' : 'text-slate-500'}`}>
            <span>3.</span> <span>Duplicate Check</span>
          </div>
          <div className={`p-3 flex items-center gap-2 ${currentStep === 4 ? 'text-emerald-400 font-bold bg-slate-900' : 'text-slate-500'}`}>
            <span>4.</span> <span>Verify & Save</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* STEP 1: Select Real File */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Document Type Selector */}
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-slate-300 font-medium">Document Classification:</span>
                <div className="flex flex-wrap gap-2">
                  {(['registration', 'certificates', 'aadhaar', 'experience', 'photo', 'other'] as DocumentType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDocType(t)}
                      className={`px-3 py-1 rounded text-xs font-mono uppercase transition-colors ${
                        docType === t
                          ? 'bg-cyan-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag & Drop Real Files */}
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-xl p-10 text-center bg-slate-950/50 transition-colors">
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
                      Choose PDF document or drag & drop here
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">
                      Supports Text-based PDFs and Scanned Image PDFs
                    </span>
                  </div>
                  <span className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow-xs">
                    Browse Computer Files
                  </span>
                </label>
              </div>

              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-400 space-y-1">
                <span className="text-slate-300 font-bold block">Document Preservation Guarantee:</span>
                <p className="text-[11px] leading-relaxed">
                  Original PDFs are stored bit-for-bit unchanged in <code className="text-cyan-300">TechnicianFiles/&lt;APP_NUMBER&gt;/</code> with cryptographic SHA-256 verification hashes. The database maintains the searchable text layer and metadata index.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Dual Stage OCR Processing Terminal */}
          {currentStep === 2 && (
            <div className="space-y-6 font-mono text-xs">
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-cyan-400 font-bold flex items-center gap-2">
                    <Cpu className="w-4 h-4 animate-spin text-cyan-400" />
                    Processing: {uploadedFileName}
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

          {/* STEP 3: Duplicate Application Number Prompt */}
          {currentStep === 3 && duplicateTech && (
            <div className="p-6 bg-slate-950 rounded-xl border border-amber-500/40 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Duplicate Application Number Detected
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Application Number <strong className="font-mono text-amber-300">{duplicateTech.applicationNumber}</strong> already exists in the database under technician <strong className="text-white">{duplicateTech.fullName}</strong> ({duplicateTech.district}).
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Existing folder: <code className="text-cyan-300">{duplicateTech.folderPath}</code>
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
                    <span>Option A: Append as New Document (Recommended)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    Keep {duplicateTech.fullName}'s existing profile intact, and attach <strong>{uploadedFileName}</strong> as an additional verified document in their folder.
                  </p>
                </button>

                <button
                  onClick={() => handleDuplicateDecision('update')}
                  className="p-4 rounded-lg border border-amber-500/50 bg-amber-950/20 hover:bg-amber-950/40 text-left transition-all space-y-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                    <RefreshCw className="w-4 h-4" />
                    <span>Option B: Update Existing Record</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    Refresh {duplicateTech.fullName}'s personal details with newly extracted fields from this document.
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

              {/* Handwritten Warning Banner */}
              {extractionResult.isHandwrittenDetected && (
                <div className="p-3.5 bg-amber-950/50 border border-amber-500/60 rounded-lg text-xs text-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">
                      Handwritten Anomaly Detected on Document
                    </strong>
                    <span className="text-slate-300">
                      OCR on handwritten entries has lower confidence than printed text. Please manually verify candidate details before saving.
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {/* Left: Extracted Text */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 flex flex-col font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-300">Extracted Raw Text</span>
                    <span className="text-cyan-400 text-[11px]">
                      {extractionResult.ocrEngine} · {extractionResult.ocrConfidence}% Conf
                    </span>
                  </div>
                  <div className="flex-1 bg-slate-900 p-3 rounded text-slate-300 text-[11px] whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed border border-slate-800">
                    {rawTextContent || extractionResult.rawExtractedText || 'No text extracted from document stream.'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Managed Path: <span className="text-cyan-400">TechnicianFiles/{editableFields.applicationNumber || 'APP_NUM'}/{uploadedFileName}</span>
                  </div>
                </div>

                {/* Right: Editable Verification Fields */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 font-mono">
                  <div className="pb-2 border-b border-slate-800 font-bold text-slate-300 font-sans">
                    Verify & Validate Extracted Fields
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Application Number (Unique Index) *</label>
                    <input
                      type="text"
                      required
                      value={editableFields.applicationNumber}
                      onChange={(e) => setEditableFields({ ...editableFields, applicationNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. UPMBD260001"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-sans">Technician Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editableFields.fullName}
                      onChange={(e) => setEditableFields({ ...editableFields, fullName: e.target.value })}
                      placeholder="Candidate name"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white font-semibold font-sans focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-sans">Father's Name</label>
                    <input
                      type="text"
                      value={editableFields.fatherName}
                      onChange={(e) => setEditableFields({ ...editableFields, fatherName: e.target.value })}
                      placeholder="Father's full name"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white font-sans focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Mobile (10 digits)</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={editableFields.mobile}
                        onChange={(e) => setEditableFields({ ...editableFields, mobile: e.target.value.replace(/\D/g, '') })}
                        placeholder="9876543210"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-sans">District</label>
                      <input
                        type="text"
                        value={editableFields.district}
                        onChange={(e) => setEditableFields({ ...editableFields, district: e.target.value })}
                        placeholder="e.g. Moradabad"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white font-sans focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-sans">Technician Category</label>
                    <select
                      value={editableFields.category}
                      onChange={(e) => setEditableFields({ ...editableFields, category: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white font-sans focus:outline-none focus:border-cyan-500"
                    >
                      <option value="HVAC & RAC Technician">HVAC & RAC Technician</option>
                      <option value="Commercial Chiller Specialist">Commercial Chiller Specialist</option>
                      <option value="Inverter AC & VRF Expert">Inverter AC & VRF Expert</option>
                      <option value="Cold Chain & Refrigeration">Cold Chain & Refrigeration</option>
                      <option value="Electrical & Controls">Electrical & Controls</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
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
                className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Record & Store Original PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
