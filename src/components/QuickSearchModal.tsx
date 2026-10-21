import React, { useState, useEffect } from 'react';
import { Search, X, ChevronRight, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { TechnicianRecord } from '../types/dms';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  technicians: TechnicianRecord[];
  onSelectTechnician: (tech: TechnicianRecord) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  technicians,
  onSelectTechnician,
}) => {
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle handled by parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = technicians.filter(t => {
    const q = query.trim().toUpperCase();
    if (!q) return true;
    return (
      t.applicationNumber.toUpperCase().includes(q) ||
      t.fullName.toUpperCase().includes(q) ||
      (t.contactPerson && t.contactPerson.toUpperCase().includes(q)) ||
      t.mobile.includes(q) ||
      t.district.toUpperCase().includes(q) ||
      (t.bankDetails?.accountNumber && t.bankDetails.accountNumber.includes(q)) ||
      (t.gstNumber && t.gstNumber.toUpperCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 bg-slate-950 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type Application Number or Technician Name..."
            className="w-full bg-transparent border-none text-sm text-white placeholder-slate-500 font-mono focus:outline-none"
          />
          <kbd className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded border border-slate-700 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/60 font-sans">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching records for "{query}".
            </div>
          ) : (
            filtered.map((tech) => (
              <button
                key={tech.id}
                onClick={() => {
                  onSelectTechnician(tech);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-bold text-xs text-cyan-400">
                    {tech.applicationNumber.slice(-3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-300 text-xs">
                        {tech.applicationNumber}
                      </span>
                      <span className="text-white text-xs font-semibold">
                        {tech.fullName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {tech.district} · {tech.category} · {tech.documents?.length || 0} Docs
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 group-hover:text-slate-300">
                  <span className="text-[10px] uppercase">{tech.status}</span>
                  <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex justify-between">
          <span>Navigate with mouse or keyboard</span>
          <span>Indexed SQLite records: {technicians.length}</span>
        </div>
      </div>
    </div>
  );
};
