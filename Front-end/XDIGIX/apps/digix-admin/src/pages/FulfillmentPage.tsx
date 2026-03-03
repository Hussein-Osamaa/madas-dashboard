import { useState, useEffect } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { apiGetList } from '../lib/api';

type Order = {
  _id: string;
  customerName: string;
  phone?: string;
  address?: string;
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

const statusClass = (status: string | undefined) => {
  if (!status) return 'bg-gray-500/20 text-gray-400';
  switch (status) {
    case 'pending': return 'bg-amber-500/20 text-amber-400';
    case 'processing': return 'bg-blue-500/20 text-blue-400';
    case 'shipped': return 'bg-purple-500/20 text-purple-400';
    case 'delivered': return 'bg-emerald-500/20 text-emerald-400';
    case 'cancelled': return 'bg-red-500/20 text-red-400';
    case 'paid': return 'bg-emerald-500/20 text-emerald-400';
    case 'partial': return 'bg-amber-500/20 text-amber-400';
    case 'refunded': return 'bg-orange-500/20 text-orange-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

export default function FulfillmentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGetList<Order>('/api/orders')
      .then(setOrders)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Fulfillment — All Orders</h1>
      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
      ) : orders.length === 0 ? (
        <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No orders yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Shipping</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((o) => (
                <tr key={o._id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-400">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {typeof o.clientId === 'object' && o.clientId?.brandName ? o.clientId.brandName : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">{o.customerName}</span>
                    {o.phone && <span className="block text-sm text-gray-500">{o.phone}</span>}
                  </td>
                  <td className="px-4 py-3 text-white">{formatMoney(o.totalPrice)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium capitalize ${statusClass(o.shippingStatus)}`}>
                      {o.shippingStatus || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium capitalize ${statusClass(o.paymentStatus)}`}>
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
