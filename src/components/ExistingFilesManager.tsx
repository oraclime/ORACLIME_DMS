import React, { useState, useMemo } from 'react';
import { 
  FolderArchive, 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Link2, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Filter, 
  Layers, 
  UserCheck, 
  Clock, 
  X,
  ExternalLink
} from 'lucide-react';
import { AttachedDocument, DocumentType, TechnicianRecord, UserAccount } from '../types/dms';
import { StorageService } from '../services/storageService';
import { CryptoService } from '../services/cryptoService';
import { DocumentViewer } from './DocumentViewer';

interface ExistingFilesManagerProps {
  technicians: TechnicianRecord[];
  currentUser: UserAccount;
  onRefreshData: () => void;
  showToast: (msg: string) => void;
  isAadhaarUnlocked: boolean;
  onRequestUnlockAadhaar: () => void;
  onSelectTechnician: (tech: TechnicianRecord) => void;
}

export const ExistingFilesManager: React.FC<ExistingFilesManagerProps> = ({
  technicians,
  currentUser,
  onRefreshData,
  showToast,
  isAadhaarUnlocked,
  onRequestUnlockAadhaar,
  onSelectTechnician,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [linkageFilter, setLinkageFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  
  // Document preview state
  const [previewDoc, setPreviewDoc] = useState<AttachedDocument | null>(null);

  // Link to technician modal state
  const [linkingDoc, setLinkingDoc] = useState<AttachedDocument | null>(null);
  const [targetAppNumber, setTargetAppNumber] = useState<string>('');
  const [linkError, setLinkError] = useState<string>('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState<boolean>(false);

  // Upload standalone doc state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('registration');

  // Retrieve all documents
  const allDocs = useMemo(() => {
    return StorageService.getAllDocuments();
  }, [technicians]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allDocs.filter(doc => {
      const matchQuery = 
        !q ||
        doc.filename.toLowerCase().includes(q) ||
        (doc.linkedApplicationNumber && doc.linkedApplicationNumber.toLowerCase().includes(q)) ||
        (doc.technicianName && doc.technicianName.toLowerCase().includes(q)) ||
        doc.checksum.toLowerCase().includes(q);

      const matchType = typeFilter === 'all' || doc.docType === typeFilter;
      const matchLinkage = 
        linkageFilter === 'all' ||
        (linkageFilter === 'linked' && !!doc.linkedApplicationNumber) ||
        (linkageFilter === 'unlinked' && !doc.linkedApplicationNumber);

      return matchQuery && matchType && matchLinkage;
    });
  }, [allDocs, searchQuery, typeFilter, linkageFilter]);

  const handleDownload = (doc: AttachedDocument) => {
    if (doc.uploadedBlobData) {
      const a = document.createElement('a');
      a.href = doc.uploadedBlobData;
      a.download = doc.filename;
      a.click();
      showToast(`Downloaded original file: ${doc.filename}`);
      return;
    }
    const blob = new Blob([doc.extractedText || ''], { type: doc.fileMimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded original file: ${doc.filename}`);
  };

  const handleExecuteLink = (confirmedDuplicate = false) => {
    if (!linkingDoc || !targetAppNumber.trim()) return;
    setLinkError('');

    const targetTech = StorageService.findByApplicationNumber(targetAppNumber);
    if (!targetTech) {
      setLinkError(`No technician found with Application Number '${targetAppNumber.toUpperCase()}'.`);
      return;
    }

    // Check duplicate document inside target technician
    const hasDuplicate = targetTech.documents.some(
      d => d.checksum === linkingDoc.checksum || d.filename.toLowerCase() === linkingDoc.filename.toLowerCase()
    );

    if (hasDuplicate && !confirmedDuplicate) {
      setShowDuplicateWarning(true);
      return;
    }

    const result = StorageService.linkExistingDocumentToTechnician(
      linkingDoc,
      targetTech.applicationNumber,
      `${currentUser.fullName} (${currentUser.username})`
    );

    if (result.success) {
      showToast(result.message);
      onRefreshData();
      setLinkingDoc(null);
      setTargetAppNumber('');
      setShowDuplicateWarning(false);
    } else {
      setLinkError(result.message);
    }
  };

  const handleStandaloneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const checksum = await CryptoService.computeChecksum(arrayBuffer);

    // Duplicate file check by checksum
    const existing = StorageService.detectDuplicateDocument(checksum, file.name);
    if (existing) {
      const confirmUpload = window.confirm(
        `DUPLICATE DOCUMENT DETECTED!\n\nA document with matching SHA-256 checksum (${existing.filename}) already exists in repository.\n\nDo you want to proceed and store another copy, or cancel?`
      );
      if (!confirmUpload) {
        return;
      }
    }

    // Read data URL
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newDoc: AttachedDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        filename: file.name,
        docType: uploadDocType,
        virtualPath: `ORACLIME_DMS/TechnicianFiles/Unassigned/${file.name}`,
        fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
        pageCount: 1,
        checksum,
        importDate: new Date().toISOString(),
        isScanned: false,
        ocrConfidence: 95,
        ocrEngine: 'PyMuPDF Direct',
        extractedText: `IMPORTED ARCHIVE RECORD: ${file.name}\nImported by: ${currentUser.fullName}\nDate: ${new Date().toISOString()}`,
        uploadedBlobData: dataUrl,
        fileMimeType: file.type || 'application/pdf',
      };

      const standalones = StorageService.getStandaloneDocuments();
      StorageService.saveStandaloneDocuments([...standalones, newDoc]);
      StorageService.logAudit(
        `${currentUser.fullName} (${currentUser.username})`,
        'Standalone Document Uploaded',
        `Imported document ${file.name} to repository.`
      );

      showToast(`Document '${file.name}' stored in repository.`);
      onRefreshData();
      setIsUploadModalOpen(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Existing Files & Document Repository
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit, inspect, re-link, or export imported PDFs across all technician directories
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import Standalone PDF</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4 max-w-7xl mx-auto w-full">
        {/* Filters & Search Toolbar */}
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by filename, Application Number, technician name, or SHA-256 checksum..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="all">All Document Types</option>
                  <option value="bank_account">Bank Passbook / Cheque</option>
                  <option value="aadhaar">Aadhaar Identity</option>
                  <option value="pan_card">PAN Card</option>
                  <option value="gst_certificate">GST / Trade License</option>
                  <option value="agreement">Partner Agreement</option>
                  <option value="registration">Registration Forms</option>
                  <option value="certificates">Trade Certificates</option>
                  <option value="experience">Experience Letters</option>
                  <option value="photo">Photo / Badges</option>
                  <option value="other">Other Documents</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Linkage:</span>
                <select
                  value={linkageFilter}
                  onChange={(e) => setLinkageFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="all">All Files ({allDocs.length})</option>
                  <option value="linked">Linked to Technician</option>
                  <option value="unlinked">Unlinked / Standalone</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-md flex-1">
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-3">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Documents in Repository</h4>
              <p className="max-w-md mx-auto text-slate-500">
                {allDocs.length === 0 
                  ? 'No technician PDF files have been imported yet. Use the "Import PDFs" workflow to import original technician registration records.' 
                  : 'No files match your search and filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse font-sans">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-bold">Filename & Path</th>
                    <th className="py-3 px-4 font-bold">App Number</th>
                    <th className="py-3 px-4 font-bold">Technician Name</th>
                    <th className="py-3 px-4 font-bold">Type</th>
                    <th className="py-3 px-4 font-bold">Size & Pages</th>
                    <th className="py-3 px-4 font-bold">SHA-256 Checksum</th>
                    <th className="py-3 px-4 font-bold">Import Date</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDocs.map((doc) => {
                    const isAadhaar = doc.docType === 'aadhaar';
                    const isLinked = !!doc.linkedApplicationNumber;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div>
                              <span className="font-mono font-bold text-white block">
                                {doc.customTitle || doc.filename}
                              </span>
                              {doc.customTitle && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  File: {doc.filename}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-500 block truncate max-w-xs">
                                {doc.virtualPath}
                              </span>
                            </div>
                            {isAadhaar && (
                              <span title="Protected identity doc" className="shrink-0">
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono">
                          {isLinked ? (
                            <button
                              onClick={() => {
                                const t = StorageService.findByApplicationNumber(doc.linkedApplicationNumber!);
                                if (t) onSelectTechnician(t);
                              }}
                              className="text-cyan-400 font-bold hover:underline"
                            >
                              {doc.linkedApplicationNumber}
                            </button>
                          ) : (
                            <span className="text-amber-400 font-mono text-[11px]">Unlinked</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {doc.technicianName || '—'}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[10px] uppercase">
                            {doc.docType}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {doc.fileSizeKb} KB · {doc.pageCount}p
                        </td>

                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                          <span title={doc.checksum}>
                            {doc.checksum.substring(0, 16)}...
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                          {new Date(doc.importDate).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white rounded text-[11px] font-mono transition-colors cursor-pointer"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5 inline mr-1" />
                            <span>Preview</span>
                          </button>

                          <button
                            onClick={() => {
                              setLinkingDoc(doc);
                              setTargetAppNumber(doc.linkedApplicationNumber || '');
                              setLinkError('');
                              setShowDuplicateWarning(false);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono border border-slate-700 transition-colors cursor-pointer"
                            title="Link or Attach to Technician"
                          >
                            <Link2 className="w-3.5 h-3.5 inline mr-1 text-cyan-400" />
                            <span>Link</span>
                          </button>

                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                            title="Download Original"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Document Preview */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center px-6 py-3 bg-slate-950 border-b border-slate-800 text-xs font-mono">
              <span className="font-bold text-white">Repository Preview: {previewDoc.filename}</span>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-3 bg-slate-950">
              <DocumentViewer
                document={previewDoc}
                technician={
                  previewDoc.linkedApplicationNumber 
                    ? StorageService.findByApplicationNumber(previewDoc.linkedApplicationNumber)
                    : undefined
                }
                isAadhaarUnlocked={isAadhaarUnlocked}
                onRequestUnlockAadhaar={onRequestUnlockAadhaar}
                onClose={() => setPreviewDoc(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Link / Attach to Technician Record */}
      {linkingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 text-slate-100 font-mono text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 font-sans">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Link2 className="w-4 h-4 text-cyan-400" />
                <span>Link Document to Technician</span>
              </div>
              <button onClick={() => setLinkingDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
              <div className="text-slate-400">Target Document:</div>
              <div className="text-cyan-300 font-bold">{linkingDoc.filename}</div>
              <div className="text-[10px] text-slate-500">SHA-256: {linkingDoc.checksum.substring(0, 24)}...</div>
            </div>

            {linkError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px]">
                {linkError}
              </div>
            )}

            {showDuplicateWarning && (
              <div className="p-3 bg-amber-950/60 border border-amber-600/60 rounded text-amber-200 text-[11px] space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Duplicate File / Record Notice</span>
                </div>
                <p>
                  A document with filename <strong>{linkingDoc.filename}</strong> or matching SHA-256 checksum is already attached to technician {targetAppNumber.toUpperCase()}.
                </p>
                <p>
                  Do you want to confirm and attach another version, or cancel?
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => handleExecuteLink(true)}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded"
                  >
                    Confirm & Attach
                  </button>
                  <button
                    onClick={() => setShowDuplicateWarning(false)}
                    className="px-3 py-1 bg-slate-800 text-slate-300 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showDuplicateWarning && (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 mb-1">Target Application Number</label>
                  <input
                    type="text"
                    required
                    value={targetAppNumber}
                    onChange={(e) => setTargetAppNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. UPMBD260001"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 font-sans">
                  <button
                    type="button"
                    onClick={() => setLinkingDoc(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecuteLink(false)}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow-sm"
                  >
                    Attach Document
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Upload Standalone Document */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 text-slate-100 text-xs font-mono">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 font-sans">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Import Standalone Document</span>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Document Classification</label>
              <select
                value={uploadDocType}
                onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="bank_account">Bank Passbook / Cancelled Cheque</option>
                <option value="aadhaar">Aadhaar Identity</option>
                <option value="pan_card">PAN Card</option>
                <option value="gst_certificate">GST / Trade License</option>
                <option value="agreement">Partner Agreement / Contract</option>
                <option value="registration">Registration Form</option>
                <option value="certificates">Trade Certificate</option>
                <option value="experience">Experience Letter</option>
                <option value="photo">Photo ID / Shop Photo</option>
                <option value="other">Other Supporting Document</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-lg p-6 text-center bg-slate-950">
              <input
                type="file"
                id="standalone-file-input"
                accept=".pdf,image/*,.txt"
                onChange={handleStandaloneUpload}
                className="hidden"
              />
              <label htmlFor="standalone-file-input" className="cursor-pointer space-y-2 block font-sans">
                <Upload className="w-6 h-6 text-cyan-400 mx-auto" />
                <span className="block text-sm font-semibold text-white">Choose file to store</span>
                <span className="block text-[11px] text-slate-500">Supports PDF, scanned images, PNG, JPG</span>
              </label>
            </div>

            <div className="flex justify-end pt-2 font-sans">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
