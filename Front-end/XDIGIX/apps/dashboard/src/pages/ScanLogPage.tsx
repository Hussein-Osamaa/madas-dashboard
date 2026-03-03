import { useState, useEffect } from 'react';
import { ScanBarcode, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useClient } from '../contexts/ClientContext';
import { apiGetListWithTotal } from '../lib/api';

type ScanLog = {
  _id: string;
  action: string;
  quantity: number;
  barcode?: string;
  createdAt?: string;
  product?: { _id: string; name?: string; sku?: string; barcode?: string };
  user?: { _id: string; name?: string; email?: string };
  orderRef?: { _id: string; totalPrice?: number };
};

function formatDate(s: string | undefined) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export default function ScanLogPage() {
  const { theme } = useTheme();
  const { effectiveClientId } = useClient();
  const isDark = theme === 'dark';
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = effectiveClientId ? { clientId: effectiveClientId } : undefined;
    apiGetListWithTotal<ScanLog>('/api/scan-logs', params)
      .then(({ data, total: t }) => {
        setLogs(data);
        setTotal(t);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load scan logs'))
      .finally(() => setLoading(false));
  }, [effectiveClientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-yellow-500' : 'text-sky-500'}`} />
      </div>
    );
  }

  const cardBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const cardShadow = isDark ? '' : 'shadow-sm';
  const tableHeadBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const divide = isDark ? 'divide-white/5' : 'divide-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';

  return (
    <>
      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>Scan Log</h1>
      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      ) : logs.length === 0 ? (
        <div className={`p-8 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} ${cardShadow} text-center ${textMuted}`}>
          <ScanBarcode className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No scan logs yet.</p>
        </div>
      ) : (
        <div className={`rounded-xl border ${cardBorder} ${cardShadow} overflow-hidden`}>
          <p className={`px-4 py-2 text-sm ${textMuted}`}>Showing {logs.length} of {total}</p>
          <table className="w-full text-left">
            <thead className={`${tableHeadBg} border-b ${cardBorder}`}>
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Date</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Action</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Product</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Quantity</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>User</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${divide}`}>
              {logs.map((log) => (
                <tr key={log._id} className={rowHover}>
                  <td className={`px-4 py-3 ${textMuted}`}>{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium capitalize ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-sky-100 text-sky-700'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${textPrimary}`}>
                    {log.product?.name ?? '—'}
                    {log.barcode && <span className={`block text-xs ${textMuted}`}>{log.barcode}</span>}
                  </td>
                  <td className={`px-4 py-3 ${textPrimary}`}>{log.quantity}</td>
                  <td className={`px-4 py-3 ${textMuted}`}>{log.user?.name ?? log.user?.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
