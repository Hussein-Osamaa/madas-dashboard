/**
 * Reports Page - Restock Session Reports
 * Lists all restock reports across clients, with client name, date, staff, and item details.
 */

import { useState, useEffect, useMemo } from 'react';
import { fetchAdminApi } from '../lib/firebase';
import {
  FileText,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  User,
  Calendar,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
} from 'lucide-react';

interface RestockReportItem {
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
}

interface RestockReport {
  _id: string;
  clientId: string;
  clientName?: string;
  staffId?: string;
  staffEmail?: string;
  items: RestockReportItem[];
  totalItems: number;
  sessionNote?: string;
  emailSent: boolean;
  finishedAt: string;
  createdAt: string;
}

interface ReportsResponse {
  reports: RestockReport[];
  total: number;
  page: number;
  pages: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<RestockReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState('');
  const LIMIT = 25;

  const loadReports = async (targetPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(LIMIT),
      });
      if (clientFilter.trim()) params.set('clientId', clientFilter.trim());
      const fn = fetchAdminApi as (<T>(path: string, opts?: RequestInit) => Promise<T>) | undefined;
      if (!fn) throw new Error('API not available');
      const data = await fn<ReportsResponse>(`/clients/restock-reports?${params}`);
      setReports(data.reports || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err) {
      setError((err as Error).message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientFilter]);

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return reports;
    const q = searchTerm.trim().toLowerCase();
    return reports.filter(
      (r) =>
        (r.clientName || r.clientId).toLowerCase().includes(q) ||
        (r.staffEmail || '').toLowerCase().includes(q) ||
        (r.sessionNote || '').toLowerCase().includes(q) ||
        r.items.some(
          (i) =>
            (i.productName || i.productId).toLowerCase().includes(q) ||
            (i.sku || '').toLowerCase().includes(q)
        )
    );
  }, [reports, searchTerm]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1022] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Reports</h1>
            <p className="text-sm text-gray-400">Warehouse restock session reports</p>
          </div>
        </div>
        <button
          onClick={() => loadReports(page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-gray-400 mb-1">Total Reports</p>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-gray-400 mb-1">Showing</p>
          <p className="text-2xl font-bold text-white">{filteredReports.length}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-gray-400 mb-1">Emails Sent</p>
          <p className="text-2xl font-bold text-emerald-400">
            {reports.filter((r) => r.emailSent).length}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-gray-400 mb-1">Total Units</p>
          <p className="text-2xl font-bold text-amber-400">
            {reports.reduce((s, r) => s + (r.totalItems || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by client, staff, product…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by client ID…"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="sm:w-56 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredReports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-white/5 mb-4">
            <FileText className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400 font-medium">No restock reports found</p>
          <p className="text-sm text-gray-500 mt-1">Reports appear here after warehouse staff finish restock sessions.</p>
        </div>
      )}

      {/* Reports list */}
      {!loading && filteredReports.length > 0 && (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isExpanded = expandedId === report._id;
            return (
              <div
                key={report._id}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
              >
                {/* Report header row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(report._id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  {/* Client name */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Building2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {report.clientName || report.clientId}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{report.clientId}</p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(report.finishedAt || report.createdAt)}</span>
                  </div>

                  {/* Staff */}
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0 max-w-[160px]">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate">{report.staffEmail || report.staffId || 'N/A'}</span>
                  </div>

                  {/* Items count */}
                  <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-blue-300 font-medium">{report.items?.length ?? 0} SKUs</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-amber-400 font-medium">{report.totalItems} units</span>
                  </div>

                  {/* Email sent */}
                  <div className="flex-shrink-0">
                    {report.emailSent ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Email sent</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <XCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">No email</span>
                      </span>
                    )}
                  </div>

                  {/* Expand icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-white/5">
                    {/* Meta row */}
                    <div className="flex flex-wrap gap-4 py-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(report.finishedAt || report.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {report.staffEmail || report.staffId || 'Unknown staff'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {report.emailSent ? 'Report emailed ✓' : 'Email not sent'}
                      </span>
                    </div>

                    {/* Session note */}
                    {report.sessionNote && (
                      <div className="mb-3 px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-300">
                        <span className="font-medium text-gray-400">Note: </span>
                        {report.sessionNote}
                      </div>
                    )}

                    {/* Items table */}
                    {report.items && report.items.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-white/10">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                              <th className="text-left px-3 py-2 text-gray-400 font-medium">#</th>
                              <th className="text-left px-3 py-2 text-gray-400 font-medium">Product</th>
                              <th className="text-left px-3 py-2 text-gray-400 font-medium">SKU</th>
                              <th className="text-right px-3 py-2 text-gray-400 font-medium">Qty Added</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.items.map((item, idx) => (
                              <tr
                                key={item.productId + idx}
                                className="border-b border-white/5 last:border-0 hover:bg-white/5"
                              >
                                <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                                <td className="px-3 py-2 text-white font-medium">
                                  {item.productName || item.productId}
                                </td>
                                <td className="px-3 py-2 text-gray-400">{item.sku || '—'}</td>
                                <td className="px-3 py-2 text-right text-amber-400 font-semibold">
                                  +{item.quantity}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-white/5 border-t border-white/10">
                              <td colSpan={3} className="px-3 py-2 text-right text-gray-400 font-medium">
                                Total units restocked
                              </td>
                              <td className="px-3 py-2 text-right text-amber-400 font-bold text-sm">
                                +{report.totalItems}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No item details available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-400">
            Page {page} of {pages} · {total} total
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => loadReports(page - 1)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-40 transition-all"
            >
              Previous
            </button>
            <button
              disabled={page >= pages || loading}
              onClick={() => loadReports(page + 1)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 disabled:opacity-40 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
