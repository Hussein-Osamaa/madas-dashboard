import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Loader2, ShieldOff } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useClient } from '../contexts/ClientContext';
import { apiGetList } from '../lib/api';

type Payment = {
  _id: string;
  amount: number;
  paymentMethod: string;
  date?: string;
  reference?: string;
  notes?: string;
  order?: { _id: string; customerName?: string; totalPrice?: number; paymentStatus?: string };
  clientId?: { _id: string; brandName?: string };
};

function formatDate(s: string | undefined) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString(undefined, { dateStyle: 'short' });
  } catch {
    return '—';
  }
}

function formatMoney(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
}

function formatMethod(m: string) {
  return m ? m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
}

export default function PaymentsPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { effectiveClientId } = useClient();
  const isDark = theme === 'dark';
  const hasFinanceAccess = user?.role !== 'client' || (user?.clientId && typeof user.clientId === 'object' && user.clientId.systemAccess?.finance !== false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = effectiveClientId ? { clientId: effectiveClientId } : undefined;
    apiGetList<Payment>('/api/payments', params)
      .then(setPayments)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load payments'))
      .finally(() => setLoading(false));
  }, [effectiveClientId]);

  if (!hasFinanceAccess) {
    return (
      <div className="py-12 text-center">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
          <ShieldOff className={`w-7 h-7 ${isDark ? 'text-yellow-500' : 'text-sky-600'}`} />
        </div>
        <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No access to Finance</h2>
        <p className={`mb-4 max-w-sm mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Your plan does not include Finance. Contact your administrator to upgrade.</p>
        <Link to="/" className={`inline-block px-4 py-2 rounded-xl font-medium ${isDark ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}>Back to Dashboard</Link>
      </div>
    );
  }

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
  const textSub = isDark ? 'text-gray-500' : 'text-gray-500';

  return (
    <>
      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>Payments</h1>
      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      ) : payments.length === 0 ? (
        <div className={`p-8 rounded-xl border ${cardBg} ${cardBorder} ${cardShadow} text-center ${textMuted}`}>
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No payments yet.</p>
        </div>
      ) : (
        <div className={`rounded-xl border ${cardBorder} ${cardShadow} overflow-hidden`}>
          <table className="w-full text-left">
            <thead className={`${tableHeadBg} border-b ${cardBorder}`}>
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Date</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Amount</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Method</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Order</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Reference</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Brand</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${divide}`}>
              {payments.map((p) => (
                <tr key={p._id} className={rowHover}>
                  <td className={`px-4 py-3 ${textMuted}`}>{formatDate(p.date)}</td>
                  <td className={`px-4 py-3 font-medium ${textPrimary}`}>{formatMoney(p.amount)}</td>
                  <td className={`px-4 py-3 ${textMuted}`}>{formatMethod(p.paymentMethod)}</td>
                  <td className="px-4 py-3">
                    <span className={textPrimary}>{typeof p.order === 'object' && p.order?.customerName ? p.order.customerName : '—'}</span>
                    {typeof p.order === 'object' && p.order?.totalPrice != null && (
                      <span className={`block text-sm ${textSub}`}>{formatMoney(p.order.totalPrice)}</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 ${textMuted}`}>{p.reference || '—'}</td>
                  <td className={`px-4 py-3 ${textMuted}`}>
                    {typeof p.clientId === 'object' && p.clientId?.brandName ? p.clientId.brandName : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
