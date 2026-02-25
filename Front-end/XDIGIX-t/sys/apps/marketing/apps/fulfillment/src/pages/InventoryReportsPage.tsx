/**
 * Inventory Reports – View and download weekly, monthly, and yearly inventory reports per client.
 */
import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Building2, Search, ChevronDown } from 'lucide-react';
import { listFulfillmentClients, listReports, downloadReport, type FulfillmentClient, type InventoryReportItem } from '../lib/api';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useWarehouseLive } from '../hooks/useWarehouseLive';

export default function InventoryReportsPage() {
  const [clients, setClients] = useState<FulfillmentClient[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [reports, setReports] = useState<InventoryReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    listFulfillmentClients()
      .then((r) => setClients(r.clients || []))
      .catch(() => setClients([]));
  }, []);

  const loadReports = useCallback(async (silent = false) => {
    if (!selectedClientId) {
      setReports([]);
      return;
    }
    if (!silent) setLoadingReports(true);
    if (!silent) setError(null);
    listReports(selectedClientId)
      .then((r) => setReports(r.reports || []))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load reports');
        setReports([]);
      })
      .finally(() => {
        if (!silent) setLoadingReports(false);
      });
  }, [selectedClientId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!selectedClientId) {
      setReports([]);
      return;
    }
    loadReports();
  }, [selectedClientId, loadReports]);

  useLiveRefresh(() => loadClients(), 60_000, []);
  useLiveRefresh(() => loadReports(true), 30_000, [selectedClientId]);
  useWarehouseLive(() => loadReports(true), { type: 'reports', clientId: selectedClientId || undefined });

  const handleDownload = async (reportId: string) => {
    if (!selectedClientId) return;
    setDownloadId(reportId);
    try {
      await downloadReport(selectedClientId, reportId);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadId(null);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      !clientSearch.trim() ||
      (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.id || '').toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return d;
    }
  };

  const periodBadge = (period: string) => {
    const styles: Record<string, string> = {
      WEEKLY: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
      MONTHLY: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
      YEARLY: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[period] ?? 'bg-gray-500/20 text-gray-700 dark:text-gray-400'}`}>
        {period}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0b1a] p-3 sm:p-6 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500 shrink-0" />
          <span>Inventory Reports</span>
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          View and download weekly, monthly, and yearly inventory reports for each client.
        </p>

        {/* Client selector */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-amber-500" />
            Select client
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search client..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            <div className="relative flex-1 sm:min-w-[200px]">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Choose a client</option>
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Reports list */}
        {selectedClientId && (
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedClient?.name || selectedClientId}
              </h2>
              {loadingReports && (
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading…</span>
              )}
            </div>

            {error && (
              <div className="p-4 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {!loadingReports && !error && reports.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No reports yet. Weekly reports are generated when an audit session is finished; monthly and yearly reports run automatically.
              </div>
            )}

            {!loadingReports && reports.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Period</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Label</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Date range</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Closing balance</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        <td className="px-4 py-3">{periodBadge(r.period)}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                          {r.periodLabel ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                          {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {r.closingBalance.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleDownload(r.id)}
                            disabled={downloadId === r.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 min-h-[44px] sm:min-h-0"
                          >
                            <Download className="w-4 h-4 shrink-0" />
                            {downloadId === r.id ? 'Downloading…' : 'PDF'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!selectedClientId && (
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 text-center text-gray-500 dark:text-gray-400">
            Select a client above to view their inventory reports.
          </div>
        )}
      </div>
    </div>
  );
}
