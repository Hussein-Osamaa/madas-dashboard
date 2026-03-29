/**
 * Reports Page - Restock Session Reports
 * Lists all restock reports across clients, with scanned products, sizes & quantities.
 */

import { useState, useEffect, useMemo } from 'react';
import { fetchAdminApi } from '../lib/backend';
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
  Printer,
  ClipboardList,
} from 'lucide-react';

interface RestockReportItem {
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  /** Size-level breakdown sent by the fulfillment app */
  sizes?: Record<string, number>;
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

/** Group items by product and flatten sizes for display (like the phone modal) */
function groupItemsByProduct(items: RestockReportItem[]) {
  const grouped = new Map<
    string,
    { productName: string; sizes: { size: string; count: number }[]; total: number }
  >();

  for (const item of items) {
    const name = item.productName || item.productId;
    if (item.sizes && Object.keys(item.sizes).length > 0) {
      // Has size-level breakdown
      if (!grouped.has(item.productId)) {
        grouped.set(item.productId, { productName: name, sizes: [], total: 0 });
      }
      const g = grouped.get(item.productId)!;
      for (const [size, count] of Object.entries(item.sizes)) {
        g.sizes.push({ size, count });
        g.total += count;
      }
    } else {
      // Legacy report — no size data, show quantity as "total" only
      if (!grouped.has(item.productId)) {
        grouped.set(item.productId, { productName: name, sizes: [], total: 0 });
      }
      const g = grouped.get(item.productId)!;
      g.total += item.quantity;
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.productName.localeCompare(b.productName));
}

/** Open a printable version of a single report in a new tab */
function printReport(report: RestockReport) {
  const rows = groupItemsByProduct(report.items);
  const totalSizes = rows.reduce((s, r) => s + r.sizes.length, 0);
  const dateStr = (() => {
    try {
      const d = new Date(report.finishedAt || report.createdAt);
      return `${d.toLocaleDateString('en-EG', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return report.finishedAt || report.createdAt;
    }
  })();

  const sizeRows = rows
    .map((row) => {
      const badges =
        row.sizes.length > 0
          ? row.sizes
              .slice()
              .sort((a, b) => a.size.localeCompare(b.size))
              .map(
                (sz) =>
                  `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:12px;margin:2px"><span style="color:#374151">${sz.size}</span><span style="font-weight:700;color:#047857">${sz.count}</span></span>`,
              )
              .join(' ')
          : '<span style="color:#9ca3af;font-size:12px">No size data</span>';
      return `<tr style="border-top:1px solid #e5e7eb"><td style="padding:10px 12px;font-weight:500;vertical-align:top">${row.productName}</td><td style="padding:10px 12px;vertical-align:top">${badges}</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:#047857;vertical-align:top">${row.total}</td></tr>`;
    })
    .join('');

  const htmlParts = [
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Restock Report</title>',
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:20px;color:#111827;font-size:14px}@media print{body{padding:10px}}table{border-collapse:collapse}</style></head><body>',
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">',
    '<div style="width:40px;height:40px;border-radius:12px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;font-size:20px">\u{1F4CB}</div>',
    `<div><h1 style="font-size:18px;font-weight:700">Restock Report</h1><p style="font-size:13px;color:#6b7280">${report.clientName || report.clientId} \u00b7 ${dateStr}</p></div></div>`,
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">',
    `<div style="text-align:center;padding:12px;background:#f9fafb;border-radius:12px"><p style="font-size:22px;font-weight:700;color:#2563eb">${report.totalItems}</p><p style="font-size:11px;color:#6b7280;margin-top:2px">Total Units</p></div>`,
    `<div style="text-align:center;padding:12px;background:#f9fafb;border-radius:12px"><p style="font-size:22px;font-weight:700;color:#059669">${rows.length}</p><p style="font-size:11px;color:#6b7280;margin-top:2px">Products</p></div>`,
    `<div style="text-align:center;padding:12px;background:#f9fafb;border-radius:12px"><p style="font-size:22px;font-weight:700;color:#d97706">${totalSizes || report.items.length}</p><p style="font-size:11px;color:#6b7280;margin-top:2px">Size Entries</p></div>`,
    `<div style="text-align:center;padding:12px;background:#f9fafb;border-radius:12px"><p style="font-size:22px;font-weight:700;color:#6b7280">${report.staffEmail || 'N/A'}</p><p style="font-size:11px;color:#6b7280;margin-top:2px">Staff</p></div></div>`,
    '<h3 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:8px">Restocked Products</h3>',
    '<table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">',
    '<thead><tr style="background:#f9fafb"><th style="text-align:left;padding:10px 12px;color:#6b7280;font-weight:500;font-size:13px">Product</th><th style="text-align:left;padding:10px 12px;color:#6b7280;font-weight:500;font-size:13px">Sizes &amp; Quantities</th><th style="text-align:right;padding:10px 12px;color:#6b7280;font-weight:500;font-size:13px">Total</th></tr></thead>',
    `<tbody>${sizeRows}</tbody>`,
    `<tfoot><tr style="background:#f9fafb;border-top:1px solid #e5e7eb"><td style="padding:10px 12px;font-weight:600">Total</td><td style="padding:10px 12px;font-size:12px;color:#6b7280">${rows.length} product${rows.length !== 1 ? 's' : ''}</td><td style="padding:10px 12px;text-align:right;font-weight:700">${report.totalItems}</td></tr></tfoot></table>`,
    '</body></html>',
  ].join('\n');

  const blob = new Blob([htmlParts], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.addEventListener('afterprint', () => URL.revokeObjectURL(url));
    win.addEventListener('load', () => {
      setTimeout(() => win.print(), 400);
    });
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000);
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
            (i.sku || '').toLowerCase().includes(q),
        ),
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
            placeholder="Search by client, staff, product\u2026"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by client ID\u2026"
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
          <p className="text-sm text-gray-500 mt-1">
            Reports appear here after warehouse staff finish restock sessions.
          </p>
        </div>
      )}

      {/* Reports list */}
      {!loading && filteredReports.length > 0 && (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isExpanded = expandedId === report._id;
            const groupedRows = isExpanded ? groupItemsByProduct(report.items) : [];
            const totalSizeEntries = isExpanded
              ? groupedRows.reduce((s, r) => s + Math.max(r.sizes.length, 1), 0)
              : 0;

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
                    <span className="truncate">
                      {report.staffEmail || report.staffId || 'N/A'}
                    </span>
                  </div>

                  {/* Items count */}
                  <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                    <Package className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-blue-300 font-medium">
                      {report.items?.length ?? 0} SKUs
                    </span>
                    <span className="text-gray-500">&middot;</span>
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

                {/* Expanded details — shows scanned products with sizes like the phone modal */}
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
                        {report.emailSent ? 'Report emailed \u2713' : 'Email not sent'}
                      </span>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 rounded-xl bg-white/5">
                        <p className="text-xl font-bold text-blue-400">{report.totalItems}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Total Units</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-white/5">
                        <p className="text-xl font-bold text-emerald-400">{groupedRows.length}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Products</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-white/5">
                        <p className="text-xl font-bold text-amber-400">{totalSizeEntries}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Size Entries</p>
                      </div>
                    </div>

                    {/* Session note */}
                    {report.sessionNote && (
                      <div className="mb-3 px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-300">
                        <span className="font-medium text-gray-400">Note: </span>
                        {report.sessionNote}
                      </div>
                    )}

                    {/* Products & sizes table — matches phone Restock Report modal */}
                    {groupedRows.length > 0 ? (
                      <div className="mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5" /> Restocked Products
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-white/10">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-white/10 bg-white/5">
                                <th className="text-left px-3 py-2.5 text-gray-400 font-medium">
                                  Product
                                </th>
                                <th className="text-left px-3 py-2.5 text-gray-400 font-medium">
                                  Sizes &amp; Quantities
                                </th>
                                <th className="text-right px-3 py-2.5 text-gray-400 font-medium">
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupedRows.map((row, i) => (
                                <tr
                                  key={i}
                                  className="border-b border-white/5 last:border-0 hover:bg-white/5"
                                >
                                  <td className="px-3 py-3 text-white font-medium align-top">
                                    {row.productName}
                                  </td>
                                  <td className="px-3 py-3 align-top">
                                    {row.sizes.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {row.sizes
                                          .slice()
                                          .sort((a, b) => a.size.localeCompare(b.size))
                                          .map((sz) => (
                                            <span
                                              key={sz.size}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs"
                                            >
                                              <span className="text-gray-300">{sz.size}</span>
                                              <span className="font-bold text-emerald-400">
                                                {sz.count}
                                              </span>
                                            </span>
                                          ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-500 italic">No size data</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3 text-right font-bold text-emerald-400 align-top">
                                    {row.total}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-white/5 border-t border-white/10">
                                <td className="px-3 py-2.5 font-semibold text-white">Total</td>
                                <td className="px-3 py-2.5 text-xs text-gray-500">
                                  {groupedRows.length} product
                                  {groupedRows.length !== 1 ? 's' : ''}, {totalSizeEntries} size
                                  entr{totalSizeEntries !== 1 ? 'ies' : 'y'}
                                </td>
                                <td className="px-3 py-2.5 text-right font-bold text-white text-sm">
                                  {report.totalItems}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No item details available.</p>
                    )}

                    {/* Print button */}
                    <button
                      onClick={() => printReport(report)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      Print Report
                    </button>
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
            Page {page} of {pages} &middot; {total} total
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
