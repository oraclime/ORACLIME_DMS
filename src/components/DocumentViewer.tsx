import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  FileText, 
  Printer, 
  Download, 
  Eye, 
  EyeOff, 
  Lock, 
  ShieldCheck, 
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { AttachedDocument, TechnicianRecord } from '../types/dms';
import { PdfCanvasViewer } from './PdfCanvasViewer';

interface DocumentViewerProps {
  document: AttachedDocument;
  technician?: TechnicianRecord;
  isAadhaarUnlocked: boolean;
  onRequestUnlockAadhaar: () => void;
  onClose?: () => void;
  highlightedField?: string | null;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  technician,
  isAadhaarUnlocked,
  onRequestUnlockAadhaar,
  onClose,
  highlightedField,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showOcrBoxes, setShowOcrBoxes] = useState<boolean>(true);
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [viewOriginalFile, setViewOriginalFile] = useState<boolean>(Boolean(document.uploadedBlobData));

  const isRestrictedDoc = document.isRestricted || document.docType === 'aadhaar';
  const isLocked = isRestrictedDoc && !isAadhaarUnlocked;

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(200, Math.max(50, prev + delta)));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (document.uploadedBlobData) {
      const a = window.document.createElement('a');
      a.href = document.uploadedBlobData;
      a.download = document.filename;
      a.click();
      return;
    }
    const blob = new Blob([document.extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-lg border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Document Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-cyan-400 font-semibold truncate max-w-[260px]">
              {document.customTitle || document.filename}
            </span>
            {document.customTitle && (
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline truncate max-w-[180px]">
                ({document.filename})
              </span>
            )}
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 uppercase font-mono text-[11px]">
              {document.docType}
            </span>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 font-mono hidden sm:inline">
            {document.fileSizeKb} KB · {document.pageCount} {document.pageCount === 1 ? 'Page' : 'Pages'}
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
            <button
              onClick={() => handleZoom(-15)}
              className="p-1 hover:text-cyan-400 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1 text-slate-300 tabular-nums">
              {zoom}%
            </span>
            <button
              onClick={() => handleZoom(15)}
              className="p-1 hover:text-cyan-400 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Reset Zoom (100%)"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* OCR Box Overlay Toggle */}
          <button
            onClick={() => setShowOcrBoxes(!showOcrBoxes)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-medium transition-colors ${
              showOcrBoxes 
                ? 'bg-cyan-950/60 border-cyan-700/50 text-cyan-300' 
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle OCR Detection Bounding Boxes"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden md:inline">OCR Boxes</span>
          </button>

          {/* Raw Text Drawer Toggle */}
          <button
            onClick={() => setShowRawText(!showRawText)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-medium transition-colors ${
              showRawText 
                ? 'bg-amber-950/60 border-amber-700/50 text-amber-300' 
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Inspect Extracted Text Layer"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden md:inline">Text Layer</span>
          </button>

          {/* Toggle between Uploaded Binary File and Structured Record */}
          {document.uploadedBlobData && (
            <button
              onClick={() => setViewOriginalFile(!viewOriginalFile)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors ${
                viewOriginalFile 
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' 
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Toggle between Original Uploaded Document and Form Sheet"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{viewOriginalFile ? 'Original Upload' : 'Record Sheet'}</span>
            </button>
          )}

          {/* Download & Print */}
          <button
            onClick={handleDownload}
            className="p-1.5 bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Download Original Record"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handlePrint}
            className="p-1.5 bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      <div className="relative flex-1 overflow-auto bg-slate-950/90 p-4 flex justify-center items-start">
        {/* If restricted and locked, show security barrier */}
        {isLocked ? (
          <div className="max-w-md w-full my-auto p-8 rounded-lg bg-slate-900 border border-amber-500/30 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-100 mb-1">
              Restricted Identity Document
            </h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              In compliance with ORACLIME Data Security Protocols, Aadhaar and government identity records are encrypted. Operator clearance PIN is required to inspect this document.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onRequestUnlockAadhaar}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded transition-colors flex items-center gap-2 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Unlock with Operator PIN</span>
              </button>
            </div>
            <div className="mt-4 text-[11px] font-mono text-slate-500">
              Audit logged · Unauthorized access prohibited
            </div>
          </div>
        ) : viewOriginalFile && document.uploadedBlobData ? (
          <div className="w-full max-w-5xl flex flex-col items-center gap-4">
            {/* If bank account, show active bank settlement card */}
            {document.docType === 'bank_account' && technician?.bankDetails && (
              <div className="w-full p-4 rounded-lg bg-slate-900 border border-slate-700 shadow-md text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <div className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Settlement & Bank Account Details</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Active Settlement Account
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bank Name</span>
                    <span className="font-bold text-white">{technician.bankDetails.bankName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Account Holder</span>
                    <span className="font-bold text-white">{technician.bankDetails.accountHolderName || technician.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Account Number</span>
                    <span className="font-mono font-bold text-white tracking-wider">{technician.bankDetails.accountNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">IFSC Code</span>
                    <span className="font-mono font-bold text-cyan-300">{technician.bankDetails.ifscCode || '—'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* If it's an image */}
            {document.fileMimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(document.filename) || document.uploadedBlobData.startsWith('data:image/') ? (
              <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col items-center shadow-xl">
                <div className="w-full mb-3 flex items-center justify-between px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs">
                  <span className="font-mono text-cyan-400 font-semibold">{document.filename}</span>
                  <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    Original Scan / Image File
                  </span>
                </div>
                <img
                  src={document.uploadedBlobData}
                  alt={document.filename}
                  className="max-w-full max-h-[900px] object-contain rounded border border-slate-700 shadow-lg"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                />
              </div>
            ) : document.fileMimeType?.startsWith('video/') || /\.(mp4|webm)$/i.test(document.filename) || document.uploadedBlobData.startsWith('data:video/') ? (
              <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col items-center shadow-xl">
                <div className="w-full mb-3 flex items-center justify-between px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs">
                  <span className="font-mono text-cyan-400 font-semibold">{document.filename}</span>
                  <span className="text-[11px] text-cyan-400 font-mono bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                    Original Video File
                  </span>
                </div>
                <video
                  src={document.uploadedBlobData}
                  controls
                  className="max-w-full max-h-[850px] rounded border border-slate-700 shadow-lg"
                />
              </div>
            ) : (
              /* Genuine PDF or document rendered via canvas - NEVER blocked by Chrome */
              <div className="w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-2xl flex flex-col">
                <PdfCanvasViewer
                  pdfData={document.uploadedBlobData}
                  filename={document.filename}
                  onDownload={handleDownload}
                />
              </div>
            )}
          </div>
        ) : (
          <div 
            className="relative transition-transform duration-150 ease-out origin-top shadow-2xl"
            style={{ 
              transform: `scale(${zoom / 100})`,
              width: '740px',
              minHeight: '1000px',
            }}
          >
            {/* Paper Document Container */}
            <div className="relative bg-white text-slate-900 p-10 rounded-sm min-h-[1000px] font-sans border border-slate-300 shadow-xl overflow-hidden select-text">
              {/* Security Watermark */}
              <div 
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035] select-none text-slate-900 -rotate-30 font-black text-6xl tracking-widest text-center"
              >
                ORACLIME ARCHIVE<br />OFFICIAL RECORD
              </div>

              {/* Render dynamic document template based on document type */}
              {document.docType === 'registration' && (
                <RegistrationFormDocument 
                  technician={technician} 
                  document={document} 
                />
              )}

              {document.docType === 'bank_account' && (
                <BankPassbookDocument 
                  technician={technician} 
                  document={document} 
                />
              )}

              {document.docType === 'aadhaar' && (
                <AadhaarDocument 
                  technician={technician} 
                  document={document} 
                  isUnlocked={isAadhaarUnlocked}
                />
              )}

              {document.docType === 'certificates' && (
                <CertificateDocument 
                  technician={technician} 
                  document={document} 
                />
              )}

              {document.docType === 'experience' && (
                <ExperienceLetterDocument 
                  technician={technician} 
                  document={document} 
                />
              )}

              {document.docType === 'photo' && (
                <PhotoBadgeDocument 
                  technician={technician} 
                  document={document} 
                />
              )}

              {/* Default fallback for custom or other files */}
              {['other', 'police_verification', 'pan_card', 'gst_certificate', 'agreement'].includes(document.docType) && (
                <div className="space-y-4">
                  <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                        Document Record
                      </h2>
                      <p className="text-xs text-slate-500 font-mono">
                        {document.virtualPath}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-800">
                        {document.checksum.substring(0, 18)}...
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Imported: {new Date(document.importDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {document.extractedText}
                  </div>
                </div>
              )}

              {/* OCR Bounding Boxes Layer */}
              {showOcrBoxes && document.boundingBoxes && (
                <div className="absolute inset-0 pointer-events-none">
                  {document.boundingBoxes.map((box) => {
                    const isTargetField = highlightedField === box.field;
                    return (
                      <div
                        key={box.id}
                        className={`absolute border transition-all pointer-events-auto group ${
                          box.isHandwritten
                            ? 'border-amber-500/80 bg-amber-500/10'
                            : isTargetField
                            ? 'border-cyan-500 bg-cyan-500/25 ring-2 ring-cyan-400'
                            : 'border-cyan-600/60 bg-cyan-500/10 hover:border-cyan-400 hover:bg-cyan-500/20'
                        }`}
                        style={{
                          top: `${box.box.top}%`,
                          left: `${box.box.left}%`,
                          width: `${box.box.width}%`,
                          height: `${box.box.height}%`,
                        }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-0 px-1.5 py-0.5 bg-slate-900 text-white text-[10px] font-mono rounded whitespace-nowrap shadow-lg flex items-center gap-1.5 z-20">
                          <span>{box.label}:</span>
                          <span className="font-bold text-cyan-300">{box.confidence}%</span>
                          {box.isHandwritten && (
                            <span className="text-amber-300 font-semibold">(Handwritten)</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Raw Text Drawer on right side if opened */}
        {showRawText && (
          <aside className="absolute right-4 top-4 bottom-4 w-96 bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-2xl flex flex-col z-30">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h5 className="text-xs font-bold text-slate-200">
                  Extracted Text Layer
                </h5>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Engine: {document.ocrEngine}
              </span>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950 p-3 rounded font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text border border-slate-800">
              {document.extractedText}
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex justify-between items-center">
              <span>Confidence: {document.ocrConfidence}%</span>
              <span>Checksum: {document.checksum.substring(0, 10)}...</span>
            </div>
          </aside>
        )}
      </div>

      {/* Footer Status Bar for Document */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <span>Path: <strong className="text-slate-300">{document.virtualPath}</strong></span>
          <span className="text-slate-600">·</span>
          <span>Engine: <strong className="text-slate-300">{document.ocrEngine}</strong></span>
          <span className="text-slate-600">·</span>
          <span>
            OCR Score: <strong className={document.ocrConfidence >= 90 ? 'text-emerald-400' : 'text-amber-400'}>{document.ocrConfidence}%</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {document.isScanned ? (
            <span className="text-amber-400 font-semibold">Scanned PDF (OCR Processed)</span>
          ) : (
            <span className="text-emerald-400 font-semibold">Text PDF (Vector Extracted)</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Form Document (Registration)
function RegistrationFormDocument({ technician, document }: { technician?: TechnicianRecord; document: AttachedDocument }) {
  const appNo = technician?.applicationNumber || document.linkedApplicationNumber || 'PENDING';
  const name = technician?.fullName || document.technicianName || 'Unregistered Candidate';
  const father = technician?.fatherName || '—';
  const mobile = technician?.mobile || '—';
  const district = technician?.district || '—';
  const category = technician?.category || 'Field Technician';
  const address = technician?.address || '—';

  return (
    <div className="space-y-6">
      {/* Official Header */}
      <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-900 text-white rounded font-bold flex items-center justify-center text-xl tracking-wider">
            OL
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              ORACLIME AIR SYSTEMS TECHNICIAN NETWORK
            </h1>
            <p className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
              Field Technician Enrollment & Certification Record · Form AC-01
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="px-2 py-1 bg-slate-100 border border-slate-300 font-mono font-bold text-sm text-slate-900">
            {appNo}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1">
            Barcode: ||| | | || ||| || |
          </div>
        </div>
      </div>

      {/* Grid: Photo & Metadata */}
      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-9 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-2 border border-slate-200 bg-slate-50 rounded">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">1. Application Number</span>
              <span className="font-mono font-bold text-sm text-slate-900">{appNo}</span>
            </div>
            <div className="p-2 border border-slate-200 bg-slate-50 rounded">
              <span className="block text-[10px] text-slate-500 uppercase font-bold">2. Registration Date</span>
              <span className="font-mono text-slate-800">{technician?.registrationDate || '12-03-2026'}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Technician Full Name:</span>
              <span className="col-span-2 font-bold text-slate-900 text-sm">{name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Father's Name:</span>
              <span className="col-span-2 font-semibold text-slate-800">{father}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Primary Contact Mobile:</span>
              <span className="col-span-2 font-mono font-semibold text-slate-900">{mobile}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Operating District:</span>
              <span className="col-span-2 font-semibold text-slate-800">{district} (Uttar Pradesh)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Trade Classification:</span>
              <span className="col-span-2 font-bold text-cyan-800">{category}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Full Address:</span>
              <span className="col-span-2 text-slate-700 leading-snug">{address}</span>
            </div>
          </div>
        </div>

        {/* Passport Photo Box */}
        <div className="col-span-3 flex flex-col items-center">
          <div className="w-32 h-36 border-2 border-dashed border-slate-400 bg-slate-100 flex flex-col items-center justify-center p-2 text-center rounded">
            <div className="w-16 h-16 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-bold mb-2">
              PHOTO
            </div>
            <span className="text-[10px] text-slate-500 leading-tight">
              Passport Size<br />Verified
            </span>
          </div>
          <div className="mt-2 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Self-Attested</span>
          </div>
        </div>
      </div>

      {/* Skills & Experience Table */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
          Technical Qualifications & Field Competencies
        </h4>
        <div className="border border-slate-300 rounded overflow-hidden text-xs">
          <table className="w-full border-collapse">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
              <tr>
                <th className="p-2 text-left font-bold">Certification / Trade</th>
                <th className="p-2 text-left font-bold">Issuing Authority</th>
                <th className="p-2 text-right font-bold">Experience</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2 font-medium">Refrigeration & Air Conditioning (RAC)</td>
                <td className="p-2 text-slate-600">National Council for Vocational Training</td>
                <td className="p-2 text-right font-mono font-bold">{technician?.experienceYears || 7} Yrs</td>
              </tr>
              <tr>
                <td className="p-2 font-medium">Inverter Split & VRF System Specialist</td>
                <td className="p-2 text-slate-600">ORACLIME Authorized Skill Training</td>
                <td className="p-2 text-right font-mono font-bold">Verified</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Stamps & Signatures */}
      <div className="pt-8 mt-6 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="h-12 border-b border-slate-400 flex items-end justify-center pb-1">
            <span className="font-serif italic text-slate-700 text-sm">{name}</span>
          </div>
          <span className="block text-[10px] text-slate-500 mt-1 uppercase">Technician Signature</span>
        </div>
        <div>
          <div className="h-12 border-b border-slate-400 flex items-end justify-center pb-1">
            <div className="w-16 h-10 border border-blue-600 text-blue-700 rounded-full flex items-center justify-center text-[9px] font-bold rotate-6 uppercase">
              REGISTERED
            </div>
          </div>
          <span className="block text-[10px] text-slate-500 mt-1 uppercase">District Office Stamp</span>
        </div>
        <div>
          <div className="h-12 border-b border-slate-400 flex items-end justify-center pb-1">
            <span className="font-serif italic text-slate-700 text-sm">Aman / OP-402</span>
          </div>
          <span className="block text-[10px] text-slate-500 mt-1 uppercase">Verification Officer</span>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Aadhaar Document
function AadhaarDocument({ technician, document, isUnlocked }: { technician?: TechnicianRecord; document: AttachedDocument; isUnlocked: boolean }) {
  const aadhaarDisplay = isUnlocked 
    ? (technician?.unmaskedAadhaar || '—')
    : (technician?.aadhaarNumber || 'XXXX-XXXX-0000');

  return (
    <div className="space-y-6">
      {/* Government of India Header */}
      <div className="border-b-2 border-red-700 pb-3 text-center">
        <h2 className="text-lg font-bold text-slate-900 tracking-wide">
          भारत सरकार / GOVERNMENT OF INDIA
        </h2>
        <p className="text-xs font-semibold text-slate-600">
          भारतीय विशिष्ट पहचान प्राधिकरण / UNIQUE IDENTIFICATION AUTHORITY OF INDIA
        </p>
      </div>

      {/* Aadhaar Card Box */}
      <div className="max-w-md mx-auto border-2 border-slate-400 rounded-lg p-5 bg-gradient-to-br from-amber-50/40 via-white to-red-50/30 shadow-md">
        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
          <div className="text-xs">
            <span className="block font-bold text-slate-800">मेरा आधार, मेरी पहचान</span>
            <span className="text-[10px] text-slate-500">Unique Identification Authority of India</span>
          </div>
          <div className="w-8 h-8 rounded-full border border-red-600 flex items-center justify-center text-red-600 font-bold text-xs">
            UID
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 my-4 items-center">
          <div className="col-span-1">
            <div className="w-24 h-28 border border-slate-300 bg-slate-200 rounded flex items-center justify-center text-slate-500 text-xs">
              Photo
            </div>
          </div>
          <div className="col-span-2 text-xs space-y-1">
            <div className="font-bold text-slate-900 text-sm">
              {technician?.fullName || document.technicianName || '—'}
            </div>
            <div className="text-slate-600">
              जन्म तिथि / DOB: <span className="font-mono">{technician?.dob || '—'}</span>
            </div>
            <div className="text-slate-600">
              लिंग / Gender: <strong>MALE</strong>
            </div>
            <div className="text-[11px] text-slate-600 pt-1 leading-tight">
              S/O {technician?.fatherName || '—'}
            </div>
          </div>
        </div>

        {/* Aadhaar Number Display with Security Masking */}
        <div className="text-center py-3 bg-slate-100 rounded border border-slate-200">
          <span className="text-[10px] text-slate-500 block uppercase font-mono">Aadhaar Number</span>
          <span className="font-mono text-base font-extrabold tracking-widest text-slate-900">
            {aadhaarDisplay}
          </span>
          {!isUnlocked && (
            <span className="block text-[10px] text-amber-700 mt-0.5">
              (Masked per privacy regulations)
            </span>
          )}
        </div>

        <div className="mt-3 text-[10px] text-slate-500 text-center leading-tight">
          आधार पहचान का प्रमाण है, नागरिकता का नहीं। / Aadhaar is proof of identity, not of citizenship.
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Certificate Document
function CertificateDocument({ technician, document }: { technician?: TechnicianRecord; document: AttachedDocument }) {
  return (
    <div className="p-6 border-4 border-double border-slate-800 rounded bg-amber-50/20 space-y-6 text-center">
      <div className="space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700">
          National Council for Vocational Training (NCVT)
        </h3>
        <h2 className="text-xl font-serif font-black text-slate-900 tracking-tight">
          PROVISIONAL NATIONAL TRADE CERTIFICATE
        </h2>
        <p className="text-xs text-slate-600">
          Ministry of Skill Development and Entrepreneurship · Directorate General of Training
        </p>
      </div>

      <div className="my-8 text-sm leading-relaxed text-slate-800 space-y-3 font-serif">
        <p>This is to certify that</p>
        <p className="text-xl font-bold font-sans text-slate-950 uppercase underline decoration-slate-400">
          {technician?.fullName || document.technicianName || '—'}
        </p>
        <p>
          Son/Daughter of <strong className="font-sans">{technician?.fatherName || '—'}</strong>
        </p>
        <p>
          having undergone full training in the trade of
        </p>
        <p className="text-base font-bold font-sans text-cyan-950">
          {technician?.category || 'MECHANIC REFRIGERATION AND AIR CONDITIONING (RAC)'}
        </p>
        <p>
          at Industrial Training Institute, has passed the All India Trade Test (AITT) with <strong className="font-sans">FIRST CLASS</strong>.
        </p>
      </div>

      <div className="grid grid-cols-2 pt-8 border-t border-slate-400 text-xs">
        <div className="text-left font-mono text-[11px] text-slate-600">
          Roll No: 2016-RAC-9841<br />
          Issue Date: 18-07-2016
        </div>
        <div className="text-right">
          <div className="font-serif italic font-bold">Controller of Examinations</div>
          <div className="text-[10px] text-slate-500 uppercase">State Board of Vocational Training</div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Experience Letter Document
function ExperienceLetterDocument({ technician, document }: { technician?: TechnicianRecord; document: AttachedDocument }) {
  return (
    <div className="space-y-6">
      <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-slate-900">COOL-TECH REFRIGERATION & AIR SYSTEMS</h2>
          <p className="text-xs text-slate-600">Authorized Daikin & Voltas VRF Service Associate</p>
        </div>
        <div className="text-right font-mono text-xs text-slate-600">
          Ref: CT/EXP/2026/89<br />
          Date: 28-02-2026
        </div>
      </div>

      <div className="text-center py-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 inline-block px-4 pb-1">
          TO WHOMSOEVER IT MAY CONCERN / EXPERIENCE CERTIFICATE
        </h3>
      </div>

      <div className="text-xs leading-relaxed text-slate-800 space-y-4">
        <p>
          This is to certify that Mr. <strong>{technician?.fullName || document.technicianName || '—'}</strong>, S/O <strong>{technician?.fatherName || '—'}</strong>, was employed with our firm as a <strong>Senior HVAC & VRF Field Technician</strong>.
        </p>
        <p>
          During his tenure, he demonstrated exceptional technical expertise in:
        </p>
        <ul className="list-disc pl-5 space-y-1 font-medium">
          <li>Multi-split VRV/VRF system installation & pressure testing with Dry Nitrogen (550 PSI)</li>
          <li>Inverter compressor troubleshooting and microcontroller board PCB analysis</li>
          <li>Recovery and safe handling of zero-ODP refrigerants (R-32, R-410A)</li>
          <li>Commercial ductable AC maintenance and client SLA management</li>
        </ul>
        <p>
          His conduct was professional, diligent, and disciplined. We wish him continued success in his technical career.
        </p>
      </div>

      <div className="pt-10 flex justify-end">
        <div className="text-center text-xs">
          <div className="h-10 flex items-end justify-center font-serif italic text-slate-800">
            Gaurav Saxena
          </div>
          <span className="font-bold text-slate-900 block">Service Operations Manager</span>
          <span className="text-[10px] text-slate-500">Cool-Tech Air Systems</span>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Photo Badge Document
function PhotoBadgeDocument({ technician, document }: { technician?: TechnicianRecord; document: AttachedDocument }) {
  return (
    <div className="max-w-xs mx-auto border-2 border-slate-400 rounded-lg p-6 bg-slate-50 text-center space-y-4 shadow-lg">
      <div className="w-10 h-10 rounded bg-cyan-700 text-white font-bold flex items-center justify-center mx-auto text-sm">
        OL
      </div>
      <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">
        ORACLIME TECHNICIAN IDENTITY
      </h3>
      
      <div className="w-40 h-44 mx-auto border border-slate-300 rounded bg-slate-200 flex flex-col items-center justify-center p-2 text-slate-500 shadow-inner">
        <div className="w-20 h-20 rounded-full bg-slate-300 flex items-center justify-center font-bold text-xl text-slate-600 mb-2">
          {technician?.fullName ? technician.fullName.charAt(0) : 'T'}
        </div>
        <span className="text-xs font-semibold text-slate-700">Digital Photo Capture</span>
        <span className="text-[10px] text-slate-500 font-mono">142 KB · 300 DPI</span>
      </div>

      <div className="text-xs space-y-1">
        <div className="font-bold text-slate-900 text-base">{technician?.fullName || 'Technician'}</div>
        <div className="font-mono text-cyan-800 font-bold">{technician?.applicationNumber}</div>
        <div className="text-slate-600">{technician?.category}</div>
      </div>
    </div>
  );
}

// Subcomponent: Bank Passbook & Account Details Document
function BankPassbookDocument({ technician, document }: { technician?: TechnicianRecord; document: AttachedDocument }) {
  const bank = technician?.bankDetails;
  return (
    <div className="space-y-6">
      <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
            Bank Account & Passbook Settlement Record
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            {document.virtualPath}
          </p>
        </div>
        <div className="text-right">
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-mono text-xs font-bold">
            Settlement Account
          </span>
          <div className="text-[10px] text-slate-500 mt-1">
            Imported: {new Date(document.importDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="p-5 rounded-lg border border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 space-y-4">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center justify-between">
          <span>Active Banking Details</span>
          <span className="text-cyan-800 font-mono font-bold">{technician?.applicationNumber}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-slate-500 font-mono text-[11px]">Bank Name</div>
            <div className="font-bold text-slate-900 text-sm">{bank?.bankName || 'State Bank of India'}</div>
          </div>
          <div>
            <div className="text-slate-500 font-mono text-[11px]">Account Holder Name</div>
            <div className="font-bold text-slate-900 text-sm">{bank?.accountHolderName || technician?.fullName || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 font-mono text-[11px]">Account Number</div>
            <div className="font-mono font-bold text-slate-900 text-sm tracking-widest">{bank?.accountNumber || '—'}</div>
          </div>
          <div>
            <div className="text-slate-500 font-mono text-[11px]">IFSC Code</div>
            <div className="font-mono font-bold text-cyan-800 text-sm">{bank?.ifscCode || '—'}</div>
          </div>
          {bank?.branchName && (
            <div>
              <div className="text-slate-500 font-mono text-[11px]">Branch Name</div>
              <div className="font-medium text-slate-800">{bank.branchName}</div>
            </div>
          )}
          {bank?.upiId && (
            <div>
              <div className="text-slate-500 font-mono text-[11px]">UPI ID / Net Banking ID</div>
              <div className="font-mono font-semibold text-slate-800">{bank.upiId}</div>
            </div>
          )}
        </div>
      </div>

      {document.extractedText && (
        <div className="p-4 bg-slate-50 rounded border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
          {document.extractedText}
        </div>
      )}
    </div>
  );
}

