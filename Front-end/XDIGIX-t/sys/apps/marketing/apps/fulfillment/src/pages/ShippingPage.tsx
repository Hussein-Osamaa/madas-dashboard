/**
 * Shipping – orders in transit. Mark as delivered, returned, or damaged.
 */
import { useState, useEffect, useCallback } from 'react';
import { Truck, Search, RefreshCw, Eye, FileText, Building2, CheckCircle, RotateCcw, XCircle } from 'lucide-react';
import { listFulfillmentOrders, updateOrderFulfillment, type FulfillmentOrder } from '../lib/api';
import OrderDetailModal from '../components/OrderDetailModal';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useRefetchOnVisible } from '../hooks/useRefetchOnVisible';
import { useWarehouseLive } from '../hooks/useWarehouseLive';

function formatDate(v: string | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString(undefined, { dateStyle: 'short' });
  } catch {
    return String(v);
  }
}

type ActionType = 'delivered' | 'returned' | 'damaged';

export default function ShippingPage() {
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { orders: list } = await listFulfillmentOrders('shipped');
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

  useLiveRefresh(() => loadOrders(true), 15_000, []);
  useRefetchOnVisible(() => loadOrders(true));
  useWarehouseLive(() => loadOrders(true), { type: 'orders' });

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    return (
      (o.orderNumber || '').toLowerCase().includes(term) ||
      (o.businessName || '').toLowerCase().includes(term) ||
      (o.customer?.name || '').toLowerCase().includes(term) ||
      (o.customer?.email || '').toLowerCase().includes(term) ||
      (o.fulfillment?.trackingNumber || '').toLowerCase().includes(term)
    );
  });

  const handleAction = async (order: FulfillmentOrder, action: ActionType) => {
    setUpdating(true);
    try {
      await updateOrderFulfillment(order.id, { businessId: order.businessId, status: action });
      await loadOrders();
      setShowActionModal(false);
      setShowDetailModal(false);
      setSelectedOrder(null);
      setActionType(null);
    } catch (e) {
      console.error(e);
      alert('Failed to update order');
    } finally {
      setUpdating(false);
    }
  };

  const openActionModal = (order: FulfillmentOrder, action: ActionType) => {
    setSelectedOrder(order);
    setActionType(action);
    setShowActionModal(true);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Shipping</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Orders in transit – mark delivered, returned, or damaged</p>
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
            placeholder="Search order #, business, tracking..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white min-h-[44px]"
          />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
          <span className="font-semibold text-purple-600 dark:text-purple-400">{orders.length}</span> in transit
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Truck className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders in transit</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Orders will appear here once they are shipped.</p>
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
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{order.customer?.name || '—'}</p>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium shrink-0">${(order.financials?.total ?? 0).toFixed(2)}</span>
                  </div>
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate mb-3">{order.fulfillment?.trackingNumber || '—'}</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }} className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-sm">
                      View
                    </button>
                    <button onClick={() => handleAction(order, 'delivered')} disabled={updating} className="min-h-[44px] px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-sm">
                      Delivered
                    </button>
                    <button onClick={() => openActionModal(order, 'returned')} disabled={updating} className="min-h-[44px] px-3 py-2 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 text-sm">
                      Returned
                    </button>
                    <button onClick={() => openActionModal(order, 'damaged')} disabled={updating} className="min-h-[44px] px-3 py-2 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-400 text-sm">
                      Damaged
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tracking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Shipped</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
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
                    <td className="px-6 py-4 font-mono text-sm text-gray-600 dark:text-gray-400">{order.fulfillment?.trackingNumber || '—'}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{formatDate(order.fulfillment?.shippedAt)}</td>
                    <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-medium">${(order.financials?.total ?? 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
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
                          onClick={() => handleAction(order, 'delivered')}
                          disabled={updating}
                          className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Delivered
                        </button>
                        <button
                          onClick={() => openActionModal(order, 'returned')}
                          disabled={updating}
                          className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Returned
                        </button>
                        <button
                          onClick={() => openActionModal(order, 'damaged')}
                          disabled={updating}
                          className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/25 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Damaged
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
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(selectedOrder, 'delivered')}
                disabled={updating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Delivered
              </button>
              <button
                onClick={() => openActionModal(selectedOrder, 'returned')}
                disabled={updating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-500/30 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> Returned
              </button>
              <button
                onClick={() => openActionModal(selectedOrder, 'damaged')}
                disabled={updating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-lg hover:bg-rose-500/30 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Damaged
              </button>
            </div>
          }
        />
      )}

      {showActionModal && selectedOrder && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Mark as {actionType === 'delivered' ? 'Delivered' : actionType === 'returned' ? 'Returned' : 'Damaged'}?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Order <strong>{selectedOrder.orderNumber}</strong> will be updated.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionType(null);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(selectedOrder, actionType)}
                disabled={updating}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {updating ? 'Updating…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
