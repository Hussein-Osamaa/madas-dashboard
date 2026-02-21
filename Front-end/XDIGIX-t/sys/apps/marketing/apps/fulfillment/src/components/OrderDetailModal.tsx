import { X } from 'lucide-react';
import type { FulfillmentOrder } from '../lib/api';

function formatDate(v: string | undefined): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    return d.toLocaleDateString(undefined, { dateStyle: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
  } catch {
    return String(v);
  }
}

interface OrderDetailModalProps {
  order: FulfillmentOrder;
  onClose: () => void;
  actions?: React.ReactNode;
}

export default function OrderDetailModal({ order, onClose, actions }: OrderDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 safe-area-inset-bottom">
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 w-full max-h-[95dvh] sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl overflow-y-auto shadow-xl flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-white/10 shrink-0 sticky top-0 bg-white dark:bg-white/5 z-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Order Details</h2>
            <button onClick={onClose} className="p-3 sm:p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 touch-target flex items-center justify-center shrink-0" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Order #</p>
              <p className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Business</p>
              <p className="text-gray-900 dark:text-white">{order.businessName}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Customer</p>
              <p className="text-gray-900 dark:text-white">{order.customer?.name || '—'}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{order.customer?.email}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Status</p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">{order.fulfillment?.status || 'pending'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">${(order.financials?.total ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Date</p>
              <p className="text-gray-700 dark:text-gray-300">{formatDate(order.date || order.metadata?.createdAt)}</p>
            </div>
          </div>
          {order.items && order.items.length > 0 && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">Items ({order.items.length})</p>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                    <div>
                      <p className="text-gray-900 dark:text-white">{item.productName || item.name || 'Item'}</p>
                      {item.size && <p className="text-gray-500 dark:text-gray-400 text-sm">Size: {item.size}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-gray-900 dark:text-white">×{item.quantity}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">${(item.price ?? 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {order.shippingAddress && (order.shippingAddress.address || order.shippingAddress.city) && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Shipping Address</p>
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                <p className="text-gray-900 dark:text-white">{order.shippingAddress.address || '—'}</p>
                <p className="text-gray-500 dark:text-gray-400">
                  {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zipCode].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}
          {order.fulfillment?.trackingNumber && (
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Tracking</p>
              <p className="text-gray-900 dark:text-white font-mono">{order.fulfillment.trackingNumber}</p>
            </div>
          )}
          {actions && (
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
              <button onClick={onClose} className="min-h-[44px] px-4 py-3 sm:py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/15">
                Close
              </button>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
