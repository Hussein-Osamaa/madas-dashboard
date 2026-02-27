/**
 * Pending Orders – orders awaiting picking/scanning. Scan items like digix-admin.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Clock, Search, RefreshCw, Eye, FileText, Building2, Scan, Camera, X, CheckCircle } from 'lucide-react';
import {
  listFulfillmentOrders,
  getOrder,
  scanOrderBarcode,
  type FulfillmentOrder,
} from '../lib/api';
import OrderDetailModal from '../components/OrderDetailModal';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { useRefetchOnVisible } from '../hooks/useRefetchOnVisible';
import { useWarehouseLive } from '../hooks/useWarehouseLive';

const SCANNER_ID = 'pending-scanner';

function formatDate(v: string | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString(undefined, { dateStyle: 'short' });
  } catch {
    return String(v);
  }
}

export default function PendingOrdersPage() {
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedItems, setScannedItems] = useState<Set<number>>(new Set());
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [showCameraContainer, setShowCameraContainer] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { orders: list } = await listFulfillmentOrders('pending');
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
      (o.customer?.email || '').toLowerCase().includes(term)
    );
  });

  const openScanModal = async (order: FulfillmentOrder) => {
    setSelectedOrder(order);
    setBarcodeInput('');
    setShowScanModal(true);
    setShowCameraContainer(false);
    setCameraActive(false);
    try {
      const { order: fresh } = await getOrder(order.businessId, order.id);
      const scanned = (fresh.fulfillment as { scannedItems?: number[] })?.scannedItems;
      setScannedItems(Array.isArray(scanned) ? new Set(scanned) : new Set());
      setSelectedOrder(fresh);
    } catch {
      setScannedItems(new Set());
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
    setShowCameraContainer(false);
  };

  const startCamera = async () => {
    setShowCameraContainer(true);
    await new Promise((r) => setTimeout(r, 200));
    try {
      const container = document.getElementById(SCANNER_ID);
      if (!container) {
        alert('Camera container not found. Please try again.');
        setShowCameraContainer(false);
        return;
      }
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
        html5QrCodeRef.current = null;
      }
      const html5QrCode = new Html5Qrcode(SCANNER_ID);
      html5QrCodeRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          setBarcodeInput(decodedText);
          html5QrCode.stop().catch(() => {});
          setCameraActive(false);
          setShowCameraContainer(false);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err: unknown) {
      const e = err as Error;
      let msg = 'Failed to start camera.';
      if (e.message?.includes('Permission denied') || (e as { name?: string }).name === 'NotAllowedError')
        msg = 'Camera permission denied. Allow camera access and try again.';
      else if (e.message?.includes('not found') || (e as { name?: string }).name === 'NotFoundError')
        msg = 'No camera found on this device.';
      else if (e.message) msg = e.message;
      alert(msg);
      setShowCameraContainer(false);
      setCameraActive(false);
    }
  };

  const handleScan = async () => {
    const barcode = barcodeInput.trim();
    if (!barcode || !selectedOrder) return;
    setScanning(true);
    try {
      const result = await scanOrderBarcode(selectedOrder.id, selectedOrder.businessId, barcode);
      if (result.matched && result.itemIndex !== undefined) {
        setScannedItems((prev) => new Set([...prev, result.itemIndex!]));
        setBarcodeInput('');
        if (result.allScanned) {
          alert(`All items scanned! Order ${selectedOrder.orderNumber} is now Ready for Pickup.`);
          stopCamera();
          setShowScanModal(false);
          setSelectedOrder(null);
          await loadOrders();
          return;
        }
        const total = selectedOrder.items?.length ?? 0;
        alert(`Item scanned! ${result.scannedCount} / ${total} items. Continue scanning.`);
      } else {
        alert(result.message || 'Barcode not found in this order.');
      }
    } catch (e) {
      console.error(e);
      alert('Scan failed. Try again.');
    } finally {
      setScanning(false);
    }
  };

  const closeScanModal = () => {
    stopCamera();
    setShowScanModal(false);
    setScannedItems(new Set());
    setBarcodeInput('');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Pending Orders</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Scan items to prepare orders for pickup</p>
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
          <span className="font-semibold text-amber-600 dark:text-amber-400">{orders.length}</span> pending
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">No pending orders</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">New orders will appear here.</p>
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
                    <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{order.items?.length ?? 0} items</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">${(order.financials?.total ?? 0).toFixed(2)}</span>
                    <span className="text-gray-500 dark:text-gray-400">{formatDate(order.date || order.metadata?.createdAt)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => openScanModal(order)}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                    >
                      <Scan className="w-4 h-4" />
                      Scan
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }}
                          className="p-2 rounded-lg text-gray-500 hover:text-amber-500 hover:bg-amber-500/10"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openScanModal(order)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                          title="Scan items"
                        >
                          <Scan className="w-4 h-4" />
                          Scan
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

      {/* Detail modal */}
      {showDetailModal && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setShowDetailModal(false)}
          actions={
            <button
              onClick={() => {
                setShowDetailModal(false);
                openScanModal(selectedOrder);
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              <span className="inline-flex items-center gap-2"><Scan className="w-4 h-4" /> Scan items</span>
            </button>
          }
        />
      )}

      {/* Scan modal */}
      {showScanModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 w-full sm:max-w-lg sm:rounded-2xl max-h-[95dvh] overflow-y-auto shadow-xl flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-white/10 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Scan className="w-5 h-5 text-amber-500 shrink-0" />
                    Scan order items
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">Order: {selectedOrder.orderNumber}</p>
                </div>
                <button onClick={closeScanModal} className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 touch-target flex items-center justify-center shrink-0" aria-label="Close">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {/* Progress */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Scan progress</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {scannedItems.size} / {selectedOrder.items?.length || 0}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${((scannedItems.size / (selectedOrder.items?.length || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-2">
                {selectedOrder.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      scannedItems.has(idx)
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
                    }`}
                  >
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{item.productName || item.name || 'Item'}</p>
                      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                        {item.size && <span>Size: {item.size}</span>}
                        <span>Qty: {item.quantity}</span>
                        <span>${(item.price ?? 0).toFixed(2)}</span>
                      </div>
                    </div>
                    {scannedItems.has(idx) ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <span className="text-gray-400 text-sm">Not scanned</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Barcode input + scan */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  placeholder="Enter or scan barcode..."
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  onClick={handleScan}
                  disabled={scanning || !barcodeInput.trim()}
                  className="px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 shrink-0"
                >
                  <Scan className="w-5 h-5" />
                </button>
              </div>

              {/* Camera toggle */}
              <button
                onClick={() => (cameraActive || showCameraContainer ? stopCamera() : startCamera())}
                disabled={showCameraContainer && !cameraActive}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors border ${
                  cameraActive
                    ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                    : showCameraContainer
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                <Camera className="w-5 h-5" />
                {cameraActive ? 'Stop camera' : showCameraContainer ? 'Starting camera…' : 'Use camera'}
              </button>

              {showCameraContainer && (
                <div className="relative">
                  <div id={SCANNER_ID} className="w-full rounded-xl overflow-hidden bg-black" style={{ minHeight: '250px' }} />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-400 border-t-transparent mx-auto mb-2" />
                        <p className="text-gray-300 text-sm">Initializing camera…</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {scannedItems.size >= (selectedOrder.items?.length || 0) && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">All items scanned!</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Order moved to Ready for Pickup</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
