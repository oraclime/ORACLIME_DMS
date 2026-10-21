import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Building2, 
  Wrench, 
  Paperclip,
  RefreshCw,
  Search,
  ExternalLink
} from 'lucide-react';
import { TechnicianRecord, UserAccount, AttachedDocument } from '../types/dms';
import { FormPdfGenerator } from '../services/formPdfGenerator';
import { PdfCanvasViewer } from './PdfCanvasViewer';
import { StorageService } from '../services/storageService';

interface RegistrationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: 'technician' | 'partner';
  initialRecordId?: string;
  technicians: TechnicianRecord[];
  onAttachToRecord: (targetRecord: TechnicianRecord, doc: AttachedDocument) => void;
  currentUser: UserAccount;
  showToast: (msg: string) => void;
}

export const RegistrationFormModal: React.FC<RegistrationFormModalProps> = ({
  isOpen,
  onClose,
  initialType,
  initialRecordId,
  technicians,
  onAttachToRecord,
  currentUser,
  showToast,
}) => {
  const [formType, setFormType] = useState<'technician' | 'partner'>(initialType);
  const [selectedRecordId, setSelectedRecordId] = useState<string>(initialRecordId || 'blank');
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');
  const [pdfFilename, setPdfFilename] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  // Sync initial type and record when opening
  useEffect(() => {
    setFormType(initialType);
    setSelectedRecordId(initialRecordId || 'blank');
  }, [initialType, initialRecordId, isOpen]);

  // Filter available records based on formType
  const filteredRecords = technicians.filter(t => {
    if (formType === 'technician') {
      return !t.entityType || t.entityType === 'technician' || t.mainCategory === 'Technician';
    } else {
      return t.mainCategory === 'Partner' || ['service_center', 'godown', 'wholesaler'].includes(t.entityType || '');
    }
  });

  const selectedRecord = technicians.find(t => t.id === selectedRecordId);

  // Regenerate PDF whenever formType or selectedRecordId changes
  useEffect(() => {
    if (!isOpen) return;
    setIsGenerating(true);

    try {
      if (formType === 'technician') {
        const { dataUrl, filename } = FormPdfGenerator.generateTechnicianForm(selectedRecord);
        setPdfDataUrl(dataUrl);
        setPdfFilename(filename);
      } else {
        const { dataUrl, filename } = FormPdfGenerator.generatePartnerForm(selectedRecord);
        setPdfDataUrl(dataUrl);
        setPdfFilename(filename);
      }
    } catch (e) {
      console.error('Error generating PDF form:', e);
      showToast('Error generating registration form PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [formType, selectedRecordId, isOpen, selectedRecord]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!pdfDataUrl) return;
    const a = document.createElement('a');
    a.href = pdfDataUrl;
    a.download = pdfFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded ${pdfFilename}`);
  };

  const handlePrint = () => {
    if (!pdfDataUrl) return;
    const printWindow = window.open(pdfDataUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    } else {
      // Fallback
      handleDownload();
    }
  };

  const handleAttachFormToDossier = () => {
    if (!selectedRecord) {
      showToast('Please select an existing Technician or Partner record to attach this form to.');
      return;
    }

    const isDuplicate = selectedRecord.documents?.some(doc => {
      if (doc.filename.toLowerCase() === pdfFilename.toLowerCase()) return true;
      if (doc.docType === 'registration' && doc.filename.includes(selectedRecord.applicationNumber)) return true;
      return false;
    });

    if (isDuplicate) {
      showToast(`Registration form is already attached to ${selectedRecord.applicationNumber}'s dossier folder.`);
      return;
    }

    const docId = `doc_reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDoc: AttachedDocument = {
      id: docId,
      filename: pdfFilename,
      customTitle: formType === 'technician' ? 'Technician Registration Form (AC-01)' : 'Partner Registration & SLA (BP-02)',
      docType: 'registration',
      virtualPath: `Records/${selectedRecord.applicationNumber}/${pdfFilename}`,
      fileSizeKb: Math.max(1, Math.round(pdfDataUrl.length * 0.75 / 1024)),
      pageCount: 1,
      checksum: `sha256-reg-${Date.now()}-${selectedRecord.applicationNumber}`,
      importDate: new Date().toISOString(),
      isScanned: false,
      ocrConfidence: 100,
      ocrEngine: 'PyMuPDF Direct',
      extractedText: `OFFICIAL REGISTRATION DOSSIER\nApplication: ${selectedRecord.applicationNumber}\nName: ${selectedRecord.fullName}\nCategory: ${formType.toUpperCase()}\nStatus: Generated and attached via ORACLIME DMS`,
      uploadedBlobData: pdfDataUrl,
      linkedApplicationNumber: selectedRecord.applicationNumber,
      technicianName: selectedRecord.fullName,
      fileMimeType: 'application/pdf',
    };

    onAttachToRecord(selectedRecord, newDoc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden">
      <div className="relative w-full max-w-6xl h-[94vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${formType === 'technician' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'}`}>
              {formType === 'technician' ? <Wrench className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {formType === 'technician' ? 'Technician Registration Form (AC-01)' : 'Partner Registration & SLA (BP-02)'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Vector Printable PDF
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Official enrollment document with KYC checklist, banking authorization & signature blocks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Print document"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print Form</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Form Type Switcher & Record Selection */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0 text-xs">
          {/* Tabs: Technician vs Partner */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setFormType('technician');
                setSelectedRecordId('blank');
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                formType === 'technician'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Technician Registration Form</span>
            </button>
            <button
              onClick={() => {
                setFormType('partner');
                setSelectedRecordId('blank');
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                formType === 'partner'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Partner Registration Form</span>
            </button>
          </div>

          {/* Record Selector: Blank Template vs Populate from Existing */}
          <div className="flex items-center gap-2">
            <label className="text-slate-400 font-medium">Form Content:</label>
            <select
              value={selectedRecordId}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500 max-w-[280px]"
            >
              <option value="blank">Blank Official Template (To Print & Fill)</option>
              {filteredRecords.map(r => (
                <option key={r.id} value={r.id}>
                  {r.applicationNumber} — {r.fullName} ({r.district || 'General'})
                </option>
              ))}
            </select>

            {selectedRecord && (
              <button
                onClick={handleAttachFormToDossier}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm ml-2"
                title="Attach this generated registration form directly to the dossier"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Attach to Dossier</span>
              </button>
            )}
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-950 overflow-hidden flex flex-col">
          {pdfDataUrl ? (
            <PdfCanvasViewer
              pdfData={pdfDataUrl}
              filename={pdfFilename}
              className="h-full border-0 rounded-none shadow-none"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-mono">
              Generating official registration form document...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
