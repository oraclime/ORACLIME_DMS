import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  ExternalLink, 
  Maximize2, 
  AlertCircle,
  FileText,
  Loader2,
  Columns
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure PDF.js worker using Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfCanvasViewerProps {
  pdfData: string; // Base64 data URL (data:application/pdf;base64,...) or raw base64 or URL
  filename: string;
  onDownload?: () => void;
  className?: string;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  pdfData,
  filename,
  onDownload,
  className = '',
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [continuousScroll, setContinuousScroll] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfDocRef = useRef<any>(null);
  const renderTasksRef = useRef<Map<number, any>>(new Map());

  // Convert Base64 data-url or raw string to Uint8Array
  const getUint8Array = useCallback((data: string): Uint8Array => {
    try {
      let base64 = data;
      if (data.includes('base64,')) {
        base64 = data.split('base64,')[1];
      }
      // Remove any whitespace or newlines
      base64 = base64.replace(/\s/g, '');
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (e: any) {
      throw new Error(`Failed to decode base64 PDF stream: ${e?.message || 'Invalid format'}`);
    }
  }, []);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        if (!pdfData) {
          throw new Error('No PDF content provided.');
        }

        let loadingTask: any;
        if (pdfData.startsWith('data:') || pdfData.length > 500) {
          const bytes = getUint8Array(pdfData);
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        } else {
          loadingTask = pdfjsLib.getDocument({ url: pdfData });
        }

        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setIsLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('PDF.js loading error:', err);
        setErrorMessage(err.message || 'Unable to parse original PDF document.');
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
      // Cancel any ongoing render tasks
      renderTasksRef.current.forEach(task => {
        try { task.cancel(); } catch {}
      });
      renderTasksRef.current.clear();
      if (pdfDocRef.current) {
        try { pdfDocRef.current.destroy(); } catch {}
      }
    };
  }, [pdfData, getUint8Array]);

  // Render a specific page to a canvas
  const renderPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDocRef.current || !canvas) return;

    // Cancel existing render on this page if running
    if (renderTasksRef.current.has(pageNum)) {
      try {
        renderTasksRef.current.get(pageNum).cancel();
      } catch {}
      renderTasksRef.current.delete(pageNum);
    }

    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const pixelRatio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: zoomScale });

      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport,
        transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
      };

      const renderTask = page.render(renderContext);
      renderTasksRef.current.set(pageNum, renderTask);

      await renderTask.promise;
      renderTasksRef.current.delete(pageNum);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`Page ${pageNum} render error:`, err);
      }
    }
  }, [zoomScale]);

  // Render visible pages
  useEffect(() => {
    if (isLoading || !numPages || !pdfDocRef.current) return;

    if (continuousScroll) {
      // Render all pages in continuous view
      for (let p = 1; p <= numPages; p++) {
        const c = canvasRefs.current.get(p);
        if (c) {
          renderPage(p, c);
        }
      }
    } else {
      // Render only current page
      const c = canvasRefs.current.get(currentPage);
      if (c) {
        renderPage(currentPage, c);
      }
    }
  }, [isLoading, numPages, currentPage, zoomScale, continuousScroll, renderPage]);

  // Handle Download Original File
  const handleDownloadOriginal = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    try {
      const a = document.createElement('a');
      a.href = pdfData;
      a.download = filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  // Handle Open in New Tab safely via Blob URL
  const handleOpenInNewTab = () => {
    try {
      const bytes = getUint8Array(pdfData);
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        // Fallback to direct anchor click
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error('Could not open in new tab', e);
    }
  };

  return (
    <div className={`w-full flex flex-col bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden ${className}`}>
      {/* Top Floating Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs text-slate-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-mono font-semibold text-white truncate max-w-[280px]" title={filename}>
            {filename}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
            Original PDF Document
          </span>
        </div>

        {/* Multipage Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
          {!continuousScroll ? (
            <>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="p-1 hover:bg-slate-800 disabled:opacity-40 rounded text-slate-300"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-slate-300 select-none">
                {currentPage} / {numPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages || isLoading}
                className="p-1 hover:bg-slate-800 disabled:opacity-40 rounded text-slate-300"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <span className="text-xs font-mono px-2 text-slate-300 select-none">
              All {numPages || 1} Pages
            </span>
          )}

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Toggle Continuous Scroll vs Single Page */}
          <button
            onClick={() => setContinuousScroll(prev => !prev)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              continuousScroll 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Continuous Multipage View"
          >
            <Columns className="w-3.5 h-3.5 inline mr-1" />
            {continuousScroll ? 'Continuous' : 'Single'}
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setZoomScale(z => Math.max(0.5, z - 0.2))}
              disabled={zoomScale <= 0.5 || isLoading}
              className="p-1 hover:bg-slate-800 disabled:opacity-40 rounded text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono text-cyan-400 font-semibold select-none min-w-[46px] text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale(z => Math.min(3.0, z + 0.2))}
              disabled={zoomScale >= 3.0 || isLoading}
              className="p-1 hover:bg-slate-800 disabled:opacity-40 rounded text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomScale(1.2)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Open In New Tab */}
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition-colors ml-1"
            title="Open Original in New Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Download Original File */}
          <button
            onClick={handleDownloadOriginal}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded text-xs flex items-center gap-1.5 transition-colors shadow-sm ml-1"
            title="Download exact original uploaded file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Original</span>
          </button>
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      <div 
        ref={containerRef}
        className="flex-1 bg-slate-950 p-6 overflow-auto flex flex-col items-center min-h-[600px] max-h-[85vh] select-text"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-xs font-mono">Parsing and rendering original vector PDF...</p>
          </div>
        ) : errorMessage ? (
          <div className="max-w-md p-6 bg-slate-900 border border-rose-800 rounded-lg text-center space-y-3 my-auto">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <h5 className="text-sm font-bold text-white">Original Document Display Notice</h5>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {errorMessage}
            </p>
            <button
              onClick={handleDownloadOriginal}
              className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download & Open in External PDF Viewer</span>
            </button>
          </div>
        ) : continuousScroll ? (
          /* Continuous Multipage View */
          <div className="flex flex-col items-center gap-6 pb-12">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div 
                key={pageNum}
                className="relative bg-white rounded shadow-2xl overflow-hidden border border-slate-700 transition-transform duration-100"
              >
                <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded shadow z-10 pointer-events-none">
                  Page {pageNum} of {numPages}
                </div>
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(pageNum, el);
                    else canvasRefs.current.delete(pageNum);
                  }}
                  className="block mx-auto bg-white"
                />
              </div>
            ))}
          </div>
        ) : (
          /* Single Page View */
          <div className="relative bg-white rounded shadow-2xl overflow-hidden border border-slate-700 my-auto">
            <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded shadow z-10 pointer-events-none">
              Page {currentPage} of {numPages}
            </div>
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(currentPage, el);
                else canvasRefs.current.delete(currentPage);
              }}
              className="block mx-auto bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
