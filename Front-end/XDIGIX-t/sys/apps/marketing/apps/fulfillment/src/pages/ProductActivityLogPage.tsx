/**
 * Product Activity Log – Who created, updated, or deleted products. Admin only.
 */
import { useState, useEffect, useCallback } from 'react';
import { FileText, ChevronDown, Filter } from 'lucide-react';
import { listFulfillmentClients, listProductActivityLog, type FulfillmentClient, type ProductActivityLogEntry } from '../lib/api';

const PAGE_SIZE = 25;

export default function ProductActivityLogPage() {
  const [clients, setClients] = useState<FulfillmentClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [entries, setEntries] = useState<ProductActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const r = await listFulfillmentClients();
      setClients(r.clients || []);
    } catch {
      setClients([]);
    }
  }, []);

  const loadLog = useCallback(async () => {
    if (!selectedClientId) {
      setEntries([]);
      setTotal(0);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listProductActivityLog({
        clientId: selectedClientId,
        page,
        limit: PAGE_SIZE,
      });
      setEntries(result.entries);
      setTotal(result.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load activity log';
      const is404 = typeof msg === 'string' && (msg.includes('404') || msg.includes('Not Found'));
      setError(is404 ? 'Activity log API not available. Ensure the backend is deployed with the latest warehouse routes.' : msg);
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, page]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (clients.length && !selectedClientId) setSelectedClientId(clients[0].id);
  }, [clients.length, selectedClientId]);

  useEffect(() => {
    setPage(1);
  }, [selectedClientId]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clientName = clients.find((c) => c.id === selectedClientId)?.name || selectedClientId || '—';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-amber-500 dark:text-amber-400" />
          Product Activity Log
        </h1>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading activity log...</div>
      ) : !selectedClientId ? (
        <div className="py-12 px-6 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center text-gray-500 dark:text-gray-400">
          Select a client to view activity log.
        </div>
      ) : entries.length === 0 ? (
        <div className="py-12 px-6 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center text-gray-500 dark:text-gray-400">
          No product activity recorded yet for this client.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                  <th className="text-left py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">Action</th>
                  <th className="text-left py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">Product</th>
                  <th className="text-left py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">Client</th>
                  <th className="text-left py-4 px-5 text-gray-500 dark:text-gray-400 font-medium">By</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                    <td className="py-4 px-5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          entry.action === 'created'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : entry.action === 'updated'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                              : 'bg-red-500/20 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-gray-900 dark:text-white font-medium">
                      {entry.productName || entry.productId}
                    </td>
                    <td className="py-4 px-5 text-gray-600 dark:text-gray-300">
                      {clients.find((c) => c.id === entry.clientId)?.name || entry.clientId}
                    </td>
                    <td className="py-4 px-5 text-gray-600 dark:text-gray-300">{entry.performedByEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {clientName} · Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
