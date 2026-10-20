import React, { useState, useMemo } from 'react';
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Folder, 
  Eye, 
  Plus, 
  Filter, 
  Layers, 
  FileCheck, 
  Download, 
  UserCheck, 
  ChevronRight, 
  HardDrive, 
  UserPlus
} from 'lucide-react';
import { TechnicianRecord, VerificationStatus, UserAccount } from '../types/dms';

interface SearchDashboardProps {
  technicians: TechnicianRecord[];
  onSelectTechnician: (tech: TechnicianRecord) => void;
  onOpenImport: () => void;
  onOpenNewTechnician: () => void;
  onOpenReview: () => void;
  onOpenBackup: () => void;
  quickSearchQuery: string;
  setQuickSearchQuery: (q: string) => void;
  currentUser: UserAccount;
}

export const SearchDashboard: React.FC<SearchDashboardProps> = ({
  technicians,
  onSelectTechnician,
  onOpenImport,
  onOpenNewTechnician,
  onOpenReview,
  onOpenBackup,
  quickSearchQuery,
  setQuickSearchQuery,
  currentUser,
}) => {
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Compute aggregate statistics from actual saved records
  const totalTechnicians = technicians.length;
  const totalDocuments = technicians.reduce((acc, t) => acc + (t.documents?.length || 0), 0);
  const pendingReview = technicians.filter(t => t.status === 'pending_review').length;
  const flaggedCount = technicians.filter(t => t.status === 'flagged_handwritten').length;

  // Available districts dynamically calculated
  const districts = useMemo(() => {
    const set = new Set(technicians.map(t => t.district).filter(Boolean));
    return Array.from(set);
  }, [technicians]);

  // Filtered technicians
  const filteredTechnicians = useMemo(() => {
    const q = quickSearchQuery.trim().toUpperCase();
    return technicians.filter(t => {
      const matchQuery = 
        !q ||
        t.applicationNumber.toUpperCase().includes(q) ||
        t.fullName.toUpperCase().includes(q) ||
        t.mobile.includes(q) ||
        t.district.toUpperCase().includes(q) ||
        t.category.toUpperCase().includes(q);

      const matchDistrict = districtFilter === 'all' || t.district === districtFilter;
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;

      return matchQuery && matchDistrict && matchStatus;
    });
  }, [technicians, quickSearchQuery, districtFilter, statusFilter]);

  const statusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 border border-emerald-800/70 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Verified</span>
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/60 border border-amber-800/70 text-amber-300">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Pending Review</span>
          </span>
        );
      case 'flagged_handwritten':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950/60 border border-rose-800/70 text-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Handwritten Flag</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 text-slate-100">
      {/* Hero Header Area */}
      <section className="px-6 py-6 border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <span>Windows 64-bit Local Station · Offline SQLite Index</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                ORACLIME TECHNICIAN RECORD MANAGER
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Original PDF repository with indexed local database. Search any technician record instantly by unique Application Number.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={onOpenNewTechnician}
                className="flex items-center gap-2 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>New Registration</span>
              </button>

              <button
                onClick={onOpenImport}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Import PDFs</span>
              </button>

              <button
                onClick={onOpenReview}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Review Queue ({pendingReview + flaggedCount})</span>
              </button>

              {currentUser.role === 'administrator' && (
                <button
                  onClick={onOpenBackup}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
                  title="System Backup & SQLite Snapshot"
                >
                  <HardDrive className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">Backup</span>
                </button>
              )}
            </div>
          </div>

          {/* 4-Column KPI Stats Strip - Real Data Only */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-mono">
                  Technicians
                </span>
                <span className="text-2xl font-mono font-bold text-white tabular-nums">
                  {totalTechnicians}
                </span>
              </div>
              <div className="w-8 h-8 rounded bg-slate-800 text-cyan-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-mono">
                  Original PDFs Managed
                </span>
                <span className="text-2xl font-mono font-bold text-white tabular-nums">
                  {totalDocuments}
                </span>
              </div>
              <div className="w-8 h-8 rounded bg-slate-800 text-cyan-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-mono">
                  Pending Review
                </span>
                <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
                  {pendingReview}
                </span>
              </div>
              <div className="w-8 h-8 rounded bg-slate-800 text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-mono">
                  Handwritten Flags
                </span>
                <span className="text-2xl font-mono font-bold text-rose-400 tabular-nums">
                  {flaggedCount}
                </span>
              </div>
              <div className="w-8 h-8 rounded bg-slate-800 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Search & Query Center */}
      <section className="px-6 py-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Search Bar */}
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Find a Technician by Application Number</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Indexed Local Database Lookup
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={quickSearchQuery}
              onChange={(e) => setQuickSearchQuery(e.target.value)}
              placeholder="Enter Application Number (e.g. UPMBD260001) or Technician Name / Phone..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-16 py-3 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 shadow-inner"
            />
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
            {quickSearchQuery && (
              <button
                onClick={() => setQuickSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 font-mono"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filters Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {districts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">District:</span>
                  <select
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="all">All Districts</option>
                    {districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="flagged_handwritten">Handwritten Flag</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <span>Showing <strong>{filteredTechnicians.length}</strong> of {totalTechnicians} records</span>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2 py-0.5 rounded transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2 py-0.5 rounded transition-colors ${viewMode === 'cards' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results List / Table or Empty State */}
        {filteredTechnicians.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {totalTechnicians === 0 ? 'No Technician Records Stored' : 'No Matching Technician Found'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                {totalTechnicians === 0 
                  ? 'Your local ORACLIME database is ready for production use. Import technician PDF enrollment files or register a technician to index their files.'
                  : `No records match "${quickSearchQuery}". Check application number spelling or clear search filters.`}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={onOpenNewTechnician}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors shadow-sm"
              >
                Register New Technician
              </button>
              <button
                onClick={onOpenImport}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold transition-colors"
              >
                Import PDF Documents
              </button>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          /* High-Density Data Grid */
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-bold">Application No.</th>
                    <th className="py-3 px-4 font-bold">Technician Name</th>
                    <th className="py-3 px-4 font-bold">Trade Classification</th>
                    <th className="py-3 px-4 font-bold">District</th>
                    <th className="py-3 px-4 font-bold">Mobile</th>
                    <th className="py-3 px-4 font-bold">Linked Documents</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredTechnicians.map((tech) => (
                    <tr
                      key={tech.id}
                      onClick={() => onSelectTechnician(tech)}
                      className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                        {tech.applicationNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="leading-tight">
                          <span>{tech.fullName}</span>
                          {tech.fatherName && (
                            <span className="block text-[11px] font-normal text-slate-400">
                              S/O {tech.fatherName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {tech.category}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {tech.district}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {tech.mobile}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {tech.documents?.slice(0, 3).map((d) => (
                            <span
                              key={d.id}
                              className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400"
                            >
                              {d.filename.replace(/\.pdf$/i, '')}
                            </span>
                          ))}
                          {(tech.documents?.length || 0) > 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-[10px] text-cyan-400">
                              +{(tech.documents?.length || 0) - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {statusBadge(tech.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTechnician(tech);
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Profile</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards Grid Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechnicians.map((tech) => (
              <div
                key={tech.id}
                onClick={() => onSelectTechnician(tech)}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 transition-all cursor-pointer flex flex-col justify-between space-y-3 group shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-mono font-bold text-cyan-300 text-sm">
                      {tech.applicationNumber}
                    </span>
                    {statusBadge(tech.status)}
                  </div>

                  <div className="mt-2.5">
                    <h3 className="font-bold text-white text-base group-hover:text-cyan-200 transition-colors">
                      {tech.fullName}
                    </h3>
                    {tech.fatherName && (
                      <p className="text-xs text-slate-400">
                        S/O {tech.fatherName}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trade:</span>
                      <span className="font-medium text-slate-200">{tech.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">District:</span>
                      <span className="font-mono text-slate-200">{tech.district}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mobile:</span>
                      <span className="font-mono text-slate-200">{tech.mobile}</span>
                    </div>
                  </div>

                  {/* Documents count & list */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">
                      Stored Documents ({tech.documents?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tech.documents?.map((d) => (
                        <span
                          key={d.id}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 truncate max-w-[140px]"
                        >
                          {d.filename}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="truncate max-w-[180px] text-[10px]">
                    {tech.folderPath}
                  </span>
                  <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                    Inspect →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
