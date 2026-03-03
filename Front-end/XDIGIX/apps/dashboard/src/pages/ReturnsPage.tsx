import { useState, useEffect } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useClient } from '../contexts/ClientContext';
import { apiGetList } from '../lib/api';

type ReturnRecord = {
  _id: string;
  status: string;
  createdAt?: string;
  orderRef?: { _id: string; customerName?: string; totalPrice?: number; createdAt?: string };
  clientId?: { _id: string; brandName?: string };
  processedBy?: { name?: string; email?: string };
};

function formatDate(s: string | undefined) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString(undefined, { dateStyle: 'short' });
  } catch {
    return '—';
  }
}

const statusClass = (status: string, isDark: boolean) => {
  const accent = isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-sky-100 text-sky-700';
  if (status === 'pending') return accent;
  if (status === 'approved') return isDark ? 'bg-yellow-600/20 text-yellow-300' : 'bg-sky-200 text-sky-800';
  if (status === 'rejected') return 'bg-red-500/20 text-red-400';
  return isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600';
};

export default function ReturnsPage() {
  const { theme } = useTheme();
  const { effectiveClientId } = useClient();
  const isDark = theme === 'dark';
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = effectiveClientId ? { clientId: effectiveClientId } : undefined;
    apiGetList<ReturnRecord>('/api/returns', params)
      .then(setReturns)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load returns'))
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
  const cardBg = isDark ? 'bg-white/5' : 'bg-white';
  const cardShadow = isDark ? '' : 'shadow-sm';
  const tableHeadBg = isDark ? 'bg-white/5' : 'bg-gray-50';
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const divide = isDark ? 'divide-white/5' : 'divide-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';

  return (
    <>
      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>Returns</h1>
      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      ) : returns.length === 0 ? (
        <div className={`p-8 rounded-xl border ${cardBg} ${cardBorder} ${cardShadow} text-center ${textMuted}`}>
          <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No returns yet.</p>
        </div>
      ) : (
        <div className={`rounded-xl border ${cardBorder} ${cardShadow} overflow-hidden`}>
          <table className="w-full text-left">
            <thead className={`${tableHeadBg} border-b ${cardBorder}`}>
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Date</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Order</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Status</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Processed by</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Brand</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${divide}`}>
              {returns.map((r) => (
                <tr key={r._id} className={rowHover}>
                  <td className={`px-4 py-3 ${textMuted}`}>{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={textPrimary}>{r.orderRef?.customerName ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium capitalize ${statusClass(r.status, isDark)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${textMuted}`}>{r.processedBy?.name ?? r.processedBy?.email ?? '—'}</td>
                  <td className={`px-4 py-3 ${textMuted}`}>{r.clientId?.brandName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
