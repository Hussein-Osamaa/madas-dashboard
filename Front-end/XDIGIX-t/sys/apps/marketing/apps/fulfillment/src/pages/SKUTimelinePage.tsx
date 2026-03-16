/**
 * Timeline view for a selected SKU: movements chronologically.
 * Columns: Date → Movement Type → Quantity → Reference ID → Worker → Note
 */
import { useState, useEffect, useCallback } from 'react';
import { Clock, ChevronDown, Building2, Package } from 'lucide-react';
import {
  listFulfillmentClients,
  listProducts,
  listMovements,
  type FulfillmentClient,
  type ProductWithStock,
  type MovementLogEntry,
} from '../lib/api';

const PAGE_SIZE = 50;

export default function SKUTimelinePage() {
  const [clients, setClients] = useState<FulfillmentClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [items, setItems] = useState<MovementLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    try {
      const r = await listFulfillmentClients();
      setClients(r.clients || []);
      if (r.clients?.length && !selectedClientId) setSelectedClientId(r.clients[0].id);
    } catch {
      setClients([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    if (!selectedClientId) {
      setProducts([]);
      setSelectedSku('');
      return;
    }
    setLoadingProducts(true);
    try {
      const r = await listProducts(selectedClientId);
      setProducts(r.products || []);
      setSelectedSku('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedClientId]);

  const loadMovements = useCallback(async () => {
    if (!selectedClientId || !selectedSku) {
      setItems([]);
      setTotal(0);
      return;
    }
    setLoadingMovements(true);
    setError(null);
    try {
      const r = await listMovements({
        clientId: selectedClientId,
        sku: selectedSku,
        page,
        limit: PAGE_SIZE,
        sortOrder: 'asc',
      });
      setItems(r.items || []);
      setTotal(r.total ?? 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load movements';
      const is404 = typeof msg === 'string' && (msg.includes('404') || msg.includes('Not Found'));
      setError(is404 ? 'Movements API not available. Ensure the backend is deployed with the latest warehouse routes.' : msg);
      setItems([]);
      setTotal(0);
    } finally {
      setLoadingMovements(false);
    }
  }, [selectedClientId, selectedSku, page]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const skuOptions = products.map((p) => {
    const sku = (p as { sku?: string }).sku ?? p.id;
    const label = [p.name || p.id, sku !== p.id ? `(${sku})` : ''].filter(Boolean).join(' ');
    return { value: sku, label };
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const chronological = items;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
        <Clock className="w-6 h-6 text-amber-500 dark:text-amber-400" />
        SKU Timeline
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        View movements for a product (SKU) in chronological order.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={loadingProducts}
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
        <div className="flex items-center gap-2 relative">
          <Package className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
          <select
            value={selectedSku}
            onChange={(e) => {
              setSelectedSku(e.target.value);
              setPage(1);
            }}
            disabled={loadingProducts || !selectedClientId}
            className="px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-sm min-w-[200px] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none pr-8"
          >
            <option value="">Select SKU / product</option>
            {skuOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {!selectedSku && selectedClientId && !loadingProducts && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          Select a SKU / product to view its movement timeline.
        </div>
      )}

      {selectedSku && (
        <>
          {loadingMovements ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading movements…</div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Timeline: {selectedSku}
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {total} movement{total !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-[#0a0b1a] z-10">
                    <tr className="border-b border-gray-200 dark:border-white/10">
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        Movement Type
                      </th>
                      <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        Quantity
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        Reference ID
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        Worker
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chronological.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          No movements in this period.
                        </td>
                      </tr>
                    ) : (
                      chronological.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                entry.type === 'STOCK_IN' || entry.type === 'RETURNED'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : entry.type === 'PICKED' || entry.type === 'SHIPPED'
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                    : entry.type === 'DAMAGED'
                                      ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                      : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {entry.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-mono text-xs">
                            {entry.reference_id ?? '—'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                            {entry.worker_id ?? '—'}
                          </td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate" title={entry.note ?? ''}>
                            {entry.note ?? '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 disabled:opacity-50 text-sm"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 disabled:opacity-50 text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
