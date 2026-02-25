import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { listTransactions } from '../lib/api';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useWarehouseLive } from '../hooks/useWarehouseLive';

export default function TransactionsListPage() {
  const [clientId, setClientId] = useState('');
  const [productId, setProductId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Record<string, unknown>[]; pagination: { page: number; total: number; pages: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!clientId.trim()) {
      setData(null);
      return;
    }
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const res = await listTransactions(clientId, productId.trim() || undefined, page, 20);
      setData(res);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clientId, productId, page]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(() => load(true), 30_000, [clientId, productId, page]);
  useWarehouseLive(() => load(true), { type: 'transactions', clientId: clientId || undefined });

  return (
    <div>
      <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Transactions</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">View stock transaction history for a client.</p>

      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Client ID *</label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="business_xxx"
            className="px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Product ID (optional)</label>
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="product_xxx"
            className="px-4 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={load}
            disabled={loading || !clientId.trim()}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b1a] font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Type</th>
                  <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Product</th>
                  <th className="text-right p-3 text-gray-500 dark:text-gray-400 font-medium">Qty</th>
                  <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Reference</th>
                  <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-white/5 last:border-0">
                    <td className="p-3 text-gray-900 dark:text-white">{String(row.type)}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{String(row.productId)}</td>
                    <td className="p-3 text-right text-gray-700 dark:text-gray-300">{Number(row.quantity)}</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">{String(row.referenceId || '-')}</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">{row.createdAt ? new Date(row.createdAt as string).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pagination.pages > 1 && (
            <div className="flex gap-2 mt-4 items-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="py-1 text-gray-600 dark:text-gray-400">
                Page {data.pagination.page} / {data.pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.pages}
                className="px-3 py-1 rounded bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
