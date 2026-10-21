import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  FolderPlus, 
  Building2, 
  Wrench, 
  HardDrive,
  FileCheck
} from 'lucide-react';
import { 
  TechnicianRecord, 
  UserAccount, 
  AttachedDocument, 
  DocumentType 
} from '../types/dms';
import { StorageService } from '../services/storageService';

interface CustomDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: TechnicianRecord[];
  onDocumentUploaded: (targetRecord: TechnicianRecord | null, doc: AttachedDocument) => void;
  currentUser: UserAccount;
  showToast: (msg: string) => void;
  defaultTargetRecord?: TechnicianRecord | null;
}

export const CustomDocumentUploadModal: React.FC<CustomDocumentUploadModalProps> = ({
  isOpen,
  onClose,
  technicians,
  onDocumentUploaded,
  currentUser,
  showToast,
  defaultTargetRecord,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [docCategory, setDocCategory] = useState<DocumentType>('certificates');
  const [targetRecordId, setTargetRecordId] = useState<string>(
    defaultTargetRecord?.id || 'standalone'
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit.');
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');

    // Pre-fill a default custom title if empty
    if (!customTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setCustomTitle(cleanName);
    }

    // Auto-detect category from name if possible
    const lowerName = file.name.toLowerCase();
    if (lowerName.includes('aadhaar')) setDocCategory('aadhaar');
    else if (lowerName.includes('pan')) setDocCategory('pan_card');
    else if (lowerName.includes('bank') || lowerName.includes('passbook') || lowerName.includes('cheque')) setDocCategory('bank_account');
    else if (lowerName.includes('gst')) setDocCategory('gst_certificate');
    else if (lowerName.includes('agree') || lowerName.includes('sla')) setDocCategory('agreement');
    else if (lowerName.includes('reg') || lowerName.includes('form')) setDocCategory('registration');
    else if (lowerName.includes('cert') || lowerName.includes('iti') || lowerName.includes('diploma')) setDocCategory('certificates');

    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedFile || !fileDataUrl) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    if (!customTitle.trim()) {
      setErrorMessage('Please enter a custom title or display name for this document.');
      return;
    }

    setIsUploading(true);

    try {
      const targetRecord = technicians.find(t => t.id === targetRecordId) || null;
      const appNo = targetRecord ? targetRecord.applicationNumber : 'ARCHIVE';
      const actorName = `${currentUser.fullName} (${currentUser.username})`;

      // Generate unique checksum
      const checksum = `sha256-cust-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      // Virtual file path
      const virtualPath = targetRecord 
        ? `Records/${appNo}/${selectedFile.name}` 
        : `GeneralArchive/${selectedFile.name}`;

      // Check duplicate filename in target record or standalone archive
      let finalFilename = selectedFile.name;
      if (targetRecord) {
        const hasDuplicate = targetRecord.documents?.some(d => d.filename.toLowerCase() === finalFilename.toLowerCase());
        if (hasDuplicate) {
          const ext = finalFilename.includes('.') ? finalFilename.substring(finalFilename.lastIndexOf('.')) : '';
          const namePart = finalFilename.includes('.') ? finalFilename.substring(0, finalFilename.lastIndexOf('.')) : finalFilename;
          finalFilename = `${namePart}_${Date.now().toString().slice(-4)}${ext}`;
        }
      }

      const newDoc: AttachedDocument = {
        id: `doc_cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        filename: finalFilename,
        customTitle: customTitle.trim(),
        docType: docCategory,
        virtualPath,
        fileSizeKb: Math.round(selectedFile.size / 1024) || 1,
        pageCount: selectedFile.name.toLowerCase().endsWith('.pdf') ? 1 : 1,
        checksum,
        importDate: new Date().toISOString(),
        isScanned: true,
        ocrConfidence: 98,
        ocrEngine: 'PyMuPDF Direct',
        extractedText: `CUSTOM UPLOADED DOCUMENT\nTitle: ${customTitle.trim()}\nFilename: ${finalFilename}\nCategory: ${docCategory}\nAssociated: ${targetRecord ? targetRecord.applicationNumber + ' (' + targetRecord.fullName + ')' : 'General Archive'}\nImported By: ${actorName}`,
        uploadedBlobData: fileDataUrl,
        linkedApplicationNumber: targetRecord ? targetRecord.applicationNumber : undefined,
        technicianName: targetRecord ? targetRecord.fullName : undefined,
        fileMimeType: selectedFile.type || (selectedFile.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
      };

      if (targetRecord) {
        // Associate with technician / partner record
        StorageService.appendDocumentToTechnician(targetRecord.applicationNumber, newDoc, actorName);
      } else {
        // Save to standalone general documents
        const existingStandalone = StorageService.getStandaloneDocuments();
        StorageService.saveStandaloneDocuments([newDoc, ...existingStandalone]);
        StorageService.logAudit(actorName, 'Custom Document Uploaded', `Saved custom document '${customTitle.trim()}' (${finalFilename}) in General Archive.`);
      }

      onDocumentUploaded(targetRecord, newDoc);
      showToast(`Custom document '${customTitle.trim()}' saved successfully.`);
      onClose();
    } catch (err: any) {
      console.error('Custom document upload error:', err);
      setErrorMessage(err.message || 'Failed to save custom document.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Upload Custom Document
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Upload any file with a custom title, category, and record association
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveDocument} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. File Selection Area */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              1. Select File from Computer <span className="text-rose-400">*</span>
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                selectedFile 
                  ? 'border-cyan-500/70 bg-cyan-950/20 text-cyan-200' 
                  : 'border-slate-700 bg-slate-950/60 hover:border-slate-600 text-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp,.txt,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className={`w-7 h-7 mx-auto mb-2 ${selectedFile ? 'text-cyan-400' : 'text-slate-500'}`} />
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold font-mono text-cyan-300">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB · Type: {selectedFile.type || 'Document'}
                  </p>
                  <span className="inline-block mt-1 text-[10px] text-cyan-400 underline">
                    Click to choose another file
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-200">
                    Click to browse or drag and drop document file
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Supports PDF, Scanned Images (JPG, PNG, WEBP), and Documents up to 25MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 2. Custom Title Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>2. Custom Display Title <span className="text-rose-400">*</span></span>
              <span className="text-[11px] text-slate-500 font-normal">e.g. Technician Trade Certificate</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter custom document title (e.g. Technician Trade Certificate)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-sans"
              />
              <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* 3. Document Category Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              3. Document Classification / Category
            </label>
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as DocumentType)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
            >
              <option value="certificates">Trade & Professional Certificate</option>
              <option value="aadhaar">Aadhaar / Government Identity Card</option>
              <option value="pan_card">PAN Card</option>
              <option value="bank_account">Bank Passbook / Cancelled Cheque</option>
              <option value="gst_certificate">GST Certificate</option>
              <option value="registration">Registration Form / Dossier Sheet</option>
              <option value="agreement">Business SLA & Partnership Agreement</option>
              <option value="experience">Experience Letter / Work Proof</option>
              <option value="police_verification">Police Verification Clearance</option>
              <option value="photo">Official Identity Photograph / Badge</option>
              <option value="other">Other Official Custom Document</option>
            </select>
          </div>

          {/* 4. Target Association */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              4. Target Record Association
            </label>
            <select
              value={targetRecordId}
              onChange={(e) => setTargetRecordId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="standalone">
                [General Archive] Standalone Document (Unlinked / General Repository)
              </option>
              <optgroup label="Technician Dossiers">
                {technicians
                  .filter(t => !t.entityType || t.entityType === 'technician' || t.mainCategory === 'Technician')
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      Technician: {t.applicationNumber} — {t.fullName} ({t.district || 'General'})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Partner Dossiers">
                {technicians
                  .filter(t => t.mainCategory === 'Partner' || ['service_center', 'godown', 'wholesaler'].includes(t.entityType || ''))
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      Partner: {t.applicationNumber} — {t.fullName} ({t.partnerType || 'Partner'})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isUploading ? 'Saving...' : 'Save & Store Document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
