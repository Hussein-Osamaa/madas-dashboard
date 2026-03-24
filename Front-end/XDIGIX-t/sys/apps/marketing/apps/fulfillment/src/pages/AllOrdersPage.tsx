/**
 * All Orders – list all fulfillment orders with status filter, selection, delete (admin), and detail/update modals.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Search, RefreshCw, Eye, FileText, Building2, X, Trash2 } from 'lucide-react';
import { listFulfillmentOrders, updateOrderFulfillment, deleteFulfillmentOrders, type FulfillmentOrder } from '../lib/api';
import OrderDetailModal from '../components/OrderDetailModal';
import { useToast, ToastContainer } from '../components/Toast';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useRefetchOnVisible } from '../hooks/useRefetchOnVisible';
import { useWarehouseLive } from '../hooks/useWarehouseLive';
import { useStaffAuth } from '../contexts/StaffAuthContext';

function formatDate(v: string | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString(undefined, { dateStyle: 'short' });
  } catch {
    return String(v);
  }
}

function fmtStatus(s?: string) {
  return (s || 'pending').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(s?: string) {
  switch (s) {
    case 'pending': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
    case 'ready_for_pickup': return 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400';
    case 'shipped': return 'bg-purple-500/15 text-purple-700 dark:text-purple-400';
    case 'delivered': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    case 'returned': return 'bg-orange-500/15 text-orange-700 dark:text-orange-400';
    case 'damaged': return 'bg-rose-500/15 text-rose-700 dark:text-rose-400';
    default: return 'bg-gray-500/15 text-gray-700 dark:text-gray-400';
  }
}

/** Sort newest first by date or createdAt. */
function orderDate(o: FulfillmentOrder): number {
  const d = o.date || o.metadata?.createdAt;
  return d ? new Date(d).getTime() : 0;
}

export default function AllOrdersPage() {
  const { user } = useStaffAuth();
  const isAdmin = (user?.allowedApps || []).includes('ADMIN');

  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateData, setUpdateData] = useState({ status: 'pending', trackingNumber: '', notes: '' });

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [toasts, addToast, removeToast] = useToast();

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const status = filterStatus === 'all' ? undefined : (filterStatus as 'pending' | 'ready_for_pickup' | 'shipped');
      const { orders: list } = await listFulfillmentOrders(status);
      setOrders(list);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadOrders();
    setSelectedIds(new Set());
  }, [loadOrders]);

  useLiveRefresh(() => loadOrders(true), 15_000, [filterStatus]);
  useRefetchOnVisible(() => loadOrders(true));
  useWarehouseLive(() => loadOrders(true), { type: 'orders' });

  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return orders
      .filter((o) =>
        (o.orderNumber || '').toLowerCase().includes(term) ||
        (o.businessName || '').toLowerCase().includes(term) ||
        (o.customer?.name || '').toLowerCase().includes(term) ||
        (o.customer?.email || '').toLowerCase().includes(term)
      )
      .sort((a, b) => orderDate(b) - orderDate(a));
  }, [orders, searchTerm]);

  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.has(o.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { deletedCount } = await deleteFulfillmentOrders(ids);
      addToast(`Deleted ${deletedCount} order(s)`, 'success');
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      await loadOrders();
    } catch (e) {
      addToast((e as Error).message || 'Failed to delete orders', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateFulfillment = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      await updateOrderFulfillment(selectedOrder.id, {
        businessId: selectedOrder.businessId,
        status: updateData.status,
        ...(updateData.trackingNumber && { trackingNumber: updateData.trackingNumber }),
        ...(updateData.notes && { notes: updateData.notes }),
      });
      setShowUpdateModal(false);
      setSelectedOrder(null);
      addToast('Order updated successfully', 'success');
      await loadOrders();
    } catch (e) {
      addToast((e as Error).message || 'Failed to update order', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">All Orders</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">View and manage fulfillment orders</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && someSelected && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/25 min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => loadOrders()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 min-h-[44px] touch-target"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search order #, business, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white min-h-[44px]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 sm:py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white min-h-[44px] w-full sm:w-auto"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="ready_for_pickup">Ready for Pickup</option>
          <option value="shipped">Shipping</option>
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
          <span className="font-semibold text-gray-900 dark:text-white">{filteredOrders.length}</span> orders
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Orders will appear here for businesses with fulfillment enabled.</p>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-white/10">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-white/20 text-amber-500 focus:ring-amber-500/50 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{order.orderNumber}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{order.businessName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{order.customer?.name || '—'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${statusColor(order.fulfillment?.status)}`}>
                          {fmtStatus(order.fulfillment?.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm mb-3">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">${(order.financials?.total ?? 0).toFixed(2)}</span>
                    <span className="text-gray-500 dark:text-gray-400">{formatDate(order.date || order.metadata?.createdAt)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setUpdateData({
                          status: order.fulfillment?.status || 'pending',
                          trackingNumber: order.fulfillment?.trackingNumber || '',
                          notes: '',
                        });
                        setShowUpdateModal(true);
                      }}
                      className="flex-1 min-h-[44px] py-2.5 px-3 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 font-medium text-sm"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                  <tr>
                    {isAdmin && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-amber-500 focus:ring-amber-500/50"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Business</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className={`hover:bg-gray-50 dark:hover:bg-white/5 ${selectedIds.has(order.id) ? 'bg-amber-500/5' : ''}`}>
                      {isAdmin && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={() => toggleSelect(order.id)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-amber-500 focus:ring-amber-500/50"
                          />
                        </td>
                      )}
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
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${statusColor(order.fulfillment?.status)}`}>
                          {fmtStatus(order.fulfillment?.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-medium">
                        ${(order.financials?.total ?? 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{formatDate(order.date || order.metadata?.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }}
                            className="p-2 rounded-lg text-gray-500 hover:text-amber-500 hover:bg-amber-500/10"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setUpdateData({
                                status: order.fulfillment?.status || 'pending',
                                trackingNumber: order.fulfillment?.trackingNumber || '',
                                notes: '',
                              });
                              setShowUpdateModal(true);
                            }}
                            className="text-sm px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25"
                          >
                            Update status
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
              onClick={() => {
                setShowDetailModal(false);
                setUpdateData({
                  status: selectedOrder.fulfillment?.status || 'pending',
                  trackingNumber: selectedOrder.fulfillment?.trackingNumber || '',
                  notes: '',
                });
                setShowUpdateModal(true);
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              Update status
            </button>
          }
        />
      )}

      {showUpdateModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 w-full sm:max-w-md sm:rounded-2xl p-4 sm:p-6 shadow-xl max-h-[90dvh] overflow-y-auto safe-area-inset-bottom">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Update fulfillment</h2>
              <button onClick={() => setShowUpdateModal(false)} className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 touch-target flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData((d) => ({ ...d, status: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white min-h-[44px]"
                >
                  <option value="pending">Pending</option>
                  <option value="ready_for_pickup">Ready for Pickup</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tracking number (optional)</label>
                <input
                  type="text"
                  value={updateData.trackingNumber}
                  onChange={(e) => setUpdateData((d) => ({ ...d, trackingNumber: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white min-h-[44px]"
                  placeholder="e.g. 1Z999..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={updateData.notes}
                  onChange={(e) => setUpdateData((d) => ({ ...d, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white min-h-[44px]"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
              <button onClick={() => setShowUpdateModal(false)} className="min-h-[44px] px-4 py-3 bg-gray-100 dark:bg-white/10 rounded-lg text-gray-700 dark:text-gray-300 order-2 sm:order-1">
                Cancel
              </button>
              <button onClick={handleUpdateFulfillment} disabled={updating} className="min-h-[44px] px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 order-1 sm:order-2">
                {updating ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete orders?</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Are you sure you want to delete <strong>{selectedIds.size}</strong> order(s)? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-white/10 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
