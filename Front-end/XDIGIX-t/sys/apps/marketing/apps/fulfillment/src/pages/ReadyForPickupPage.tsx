/**
 * Ready for Pickup – orders ready to ship. Move to shipping.
 */
import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Search, RefreshCw, Eye, FileText, Building2, Truck } from 'lucide-react';
import { listFulfillmentOrders, updateOrderFulfillment, type FulfillmentOrder } from '../lib/api';
import OrderDetailModal from '../components/OrderDetailModal';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useWarehouseLive } from '../hooks/useWarehouseLive';

function formatDate(v: string | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString(undefined, { dateStyle: 'short' });
  } catch {
    return String(v);
  }
}

export default function ReadyForPickupPage() {
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { orders: list } = await listFulfillmentOrders('ready_for_pickup');
      setOrders(list);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useLiveRefresh(() => loadOrders(true), 30_000, []);
  useWarehouseLive(() => loadOrders(true), { type: 'orders' });

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    return (
      (o.orderNumber || '').toLowerCase().includes(term) ||
      (o.businessName || '').toLowerCase().includes(term) ||
      (o.customer?.name || '').toLowerCase().includes(term) ||
      (o.customer?.email || '').toLowerCase().includes(term)
    );
  });

  const handleMoveToShipping = async (order: FulfillmentOrder) => {
    setUpdating(true);
    try {
      await updateOrderFulfillment(order.id, { businessId: order.businessId, status: 'shipped' });
      await loadOrders();
      setShowDetailModal(false);
      setSelectedOrder(null);
    } catch (e) {
      console.error(e);
      alert('Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Ready for Pickup</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Orders ready to be shipped to customers</p>
        </div>
        <button
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 min-h-[44px]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white min-h-[44px]"
          />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
          <span className="font-semibold text-cyan-600 dark:text-cyan-400">{orders.length}</span> ready for pickup
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders ready for pickup</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Orders will appear here once they are marked ready.</p>
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-gray-200 dark:divide-white/10">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{order.orderNumber}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{order.businessName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{order.customer?.name || '—'}</p>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">${(order.financials?.total ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }} className="flex-1 min-h-[44px] py-2.5 rounded-lg border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300">
                      View
                    </button>
                    <button onClick={() => handleMoveToShipping(order)} disabled={updating} className="flex-1 min-h-[44px] py-2.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-400 font-medium text-sm">
                      Move to shipping
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">{order.businessName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 dark:text-white">{order.customer?.name || '—'}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{order.customer?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{order.items?.length ?? 0} items</td>
                    <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-medium">${(order.financials?.total ?? 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{formatDate(order.date || order.metadata?.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailModal(true);
                          }}
                          className="p-2 rounded-lg text-gray-500 hover:text-amber-500 hover:bg-amber-500/10"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveToShipping(order)}
                          disabled={updating}
                          className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-400 hover:bg-purple-500/25 disabled:opacity-50"
                        >
                          <Truck className="w-4 h-4" />
                          Move to shipping
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {showDetailModal && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setShowDetailModal(false)}
          actions={
            <button
              onClick={() => handleMoveToShipping(selectedOrder)}
              disabled={updating}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              Move to shipping
            </button>
          }
        />
      )}
    </div>
  );
}
