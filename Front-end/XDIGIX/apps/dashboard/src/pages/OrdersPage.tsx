import { useState, useEffect } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useClient } from '../contexts/ClientContext';
import { apiGetList } from '../lib/api';

type Order = {
  _id: string;
  customerName: string;
  phone?: string;
  totalPrice: number;
  shippingStatus?: string;
  paymentStatus?: string;
  createdAt?: string;
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

const statusClass = (status: string | undefined, isDark: boolean) => {
  if (!status) return 'bg-gray-500/20 text-gray-400';
  const pos = isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-sky-500/20 text-sky-600';
  const posAlt = isDark ? 'bg-yellow-600/20 text-yellow-300' : 'bg-sky-600/20 text-sky-700';
  switch (status) {
    case 'pending': return pos;
    case 'processing': return posAlt;
    case 'shipped': return isDark ? 'bg-yellow-700/20 text-yellow-300' : 'bg-sky-700/20 text-sky-700';
    case 'delivered': return posAlt;
    case 'cancelled': return 'bg-red-500/20 text-red-400';
    case 'paid': return posAlt;
    case 'partial': return pos;
    case 'refunded': return 'bg-orange-500/20 text-orange-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

export default function OrdersPage() {
  const { theme } = useTheme();
  const { effectiveClientId } = useClient();
  const isDark = theme === 'dark';
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = effectiveClientId ? { clientId: effectiveClientId } : undefined;
    apiGetList<Order>('/api/orders', params)
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'))
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
  const textSub = isDark ? 'text-gray-500' : 'text-gray-500';

  return (
    <>
      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-yellow-400' : 'text-sky-800'}`}>Orders</h1>
      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      ) : orders.length === 0 ? (
        <div className={`p-8 rounded-xl border ${cardBg} ${cardBorder} ${cardShadow} text-center ${textMuted}`}>
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className={`rounded-xl border ${cardBorder} ${cardShadow} overflow-hidden`}>
          <table className="w-full text-left">
            <thead className={`${tableHeadBg} border-b ${cardBorder}`}>
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Date</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Customer</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Total</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Shipping</th>
                <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Payment</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${divide}`}>
              {orders.map((o) => (
                <tr key={o._id} className={rowHover}>
                  <td className={`px-4 py-3 ${textMuted}`}>{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${textPrimary}`}>{o.customerName}</span>
                    {o.phone && <span className={`block text-sm ${textSub}`}>{o.phone}</span>}
                  </td>
                  <td className={`px-4 py-3 ${textPrimary}`}>{formatMoney(o.totalPrice)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium capitalize ${statusClass(o.shippingStatus, isDark)}`}>
                      {o.shippingStatus || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium capitalize ${statusClass(o.paymentStatus, isDark)}`}>
                      {o.paymentStatus || 'pending'}
                    </span>
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
