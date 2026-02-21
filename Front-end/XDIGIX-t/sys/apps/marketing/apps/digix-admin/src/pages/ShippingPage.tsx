/**
 * Shipping Page
 * Manage orders that are being shipped - mark as delivered, returned, or damaged
 */

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { useRBAC } from '../contexts/RBACContext';
import { collection, db, getDocs, doc, updateDoc, query, orderBy, addDoc, serverTimestamp, getDoc, increment } from '../lib/firebase';
import {
  Truck,
  Search,
  CheckCircle,
  X,
  Eye,
  Building2,
  DollarSign,
  FileText,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  XCircle,
  Scan,
  Camera
} from 'lucide-react';
import { format } from 'date-fns';

type FulfillmentOrder = {
  id: string;
  orderId: string;
  orderNumber: string;
  businessId: string;
  businessName: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  fulfillment: {
    status: string;
    type?: string;
    trackingNumber?: string;
    shippedAt?: string;
    deliveredAt?: string;
  };
  financials: {
    total: number;
    subtotal?: number;
    shipping?: number;
  };
  metadata: {
    createdAt?: string;
    updatedAt?: string;
  };
  items?: Array<{
    productId: string;
    productName?: string;
    name?: string;
    quantity: number;
    price: number;
    size?: string;
    barcode?: string;
  }>;
  shippingAddress?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
};

type ActionType = 'delivered' | 'returned' | 'damaged';

export default function ShippingPage() {
  const { user: rbacUser } = useRBAC();
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Return scan state
  const [showReturnScanModal, setShowReturnScanModal] = useState(false);
  const [scannedReturnItems, setScannedReturnItems] = useState<Set<number>>(new Set());
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [showCameraContainer, setShowCameraContainer] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const allOrders: FulfillmentOrder[] = [];
      const businessesSnapshot = await getDocs(collection(db, 'businesses'));
      
      console.log(`[ShippingPage] Found ${businessesSnapshot.docs.length} total businesses`);

      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;
        const businessData = businessDoc.data();
        
        // Check if business has fulfillment service
        const hasFulfillment = 
          businessData.features?.fulfillment === true ||
          businessData.features?.fulfillment_service === true ||
          businessData.features?.fulfillmentService === true;

        if (!hasFulfillment) continue;

        try {
          const ordersRef = collection(db, 'businesses', businessId, 'orders');
          
          // Try with orderBy first, fallback to without if it fails
          let ordersSnapshot;
          try {
            const ordersQuery = query(ordersRef, orderBy('date', 'desc'));
            ordersSnapshot = await getDocs(ordersQuery);
          } catch (queryError) {
            console.warn(`[ShippingPage] OrderBy failed for ${businessId}, trying without order:`, queryError);
            ordersSnapshot = await getDocs(ordersRef);
          }

          ordersSnapshot.docs.forEach(orderDoc => {
            const orderData = orderDoc.data();
            const fulfillmentStatus = orderData.fulfillment?.status || orderData.status || 'pending';
            
            // Only include shipped orders
            if (fulfillmentStatus === 'shipped') {
              allOrders.push({
                id: orderDoc.id,
                orderId: orderDoc.id,
                orderNumber: orderData.orderNumber || `#${orderDoc.id.slice(0, 6)}`,
                businessId: businessId,
                businessName: businessData.businessName || businessData.name || 'Unknown Business',
                customer: orderData.customer || { name: 'Unknown', email: '', phone: '' },
                fulfillment: orderData.fulfillment || { status: 'shipped' },
                financials: orderData.financials || { total: 0 },
                metadata: orderData.metadata || {},
                items: orderData.items || [],
                shippingAddress: orderData.shippingAddress || orderData.shipping?.address
              });
            }
          });
        } catch (error) {
          console.error(`[ShippingPage] Error loading orders for business ${businessId}:`, error);
        }
      }

      console.log(`[ShippingPage] Total shipped orders loaded: ${allOrders.length}`);
      setOrders(allOrders);
    } catch (error) {
      console.error('[ShippingPage] Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleAction = async (action: ActionType) => {
    if (!selectedOrder) return;
    
    // For returns, require scanning
    if (action === 'returned') {
      setActionType('returned');
      setShowActionModal(false);
      setShowReturnScanModal(true);
      setScannedReturnItems(new Set());
      return;
    }
    
    const confirmMessage = action === 'delivered' 
      ? `Mark order ${selectedOrder.orderNumber} as Delivered?`
      : `Mark order ${selectedOrder.orderNumber} as Damaged?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    await updateOrderStatus(action);
  };

  const updateOrderStatus = async (action: ActionType, notes?: string) => {
    if (!selectedOrder) return;
    
    setUpdating(true);
    try {
      const orderRef = doc(db, 'businesses', selectedOrder.businessId, 'orders', selectedOrder.id);
      
      // Map fulfillment status to order status
      const orderStatus = action === 'delivered' ? 'completed' : action === 'returned' ? 'cancelled' : 'cancelled';
      
      await updateDoc(orderRef, {
        'fulfillment.status': action,
        'status': orderStatus,
        ...(action === 'delivered' && { 'fulfillment.deliveredAt': new Date().toISOString() }),
        'metadata.updatedAt': new Date().toISOString()
      });

      // Note: Individual return scans are logged in handleReturnScan() with full product details
      // We don't create a summary log here to avoid duplicate entries with missing product info

      const statusLabel = action === 'delivered' ? 'Delivered' : action === 'returned' ? 'Returned' : 'Damaged';
      alert(`✅ Order ${selectedOrder.orderNumber} marked as ${statusLabel}!`);
      
      setShowActionModal(false);
      setShowReturnScanModal(false);
      setSelectedOrder(null);
      await loadOrders();
    } catch (error) {
      console.error('[ShippingPage] Error updating order:', error);
      alert('❌ Failed to update order: ' + (error as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleReturnScan = async () => {
    if (!barcodeInput.trim() || !selectedOrder) return;
    
    setScanning(true);
    const barcode = barcodeInput.trim().toLowerCase();
    const normalizeBarcode = (str: string) => str.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
    const normalizedBarcode = normalizeBarcode(barcode);
    
    // Find matching item in order
    let matchedIndex = -1;
    let matchedProductId: string | null = null;
    let matchedSize: string | null = null;
    
    // First, search products to get matching product IDs
    const matchingProducts: { id: string; data: any; matchedSize?: string }[] = [];
    try {
      const productsRef = collection(db, 'businesses', selectedOrder.businessId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      for (const productDoc of productsSnapshot.docs) {
        const productData = productDoc.data();
        const productBarcode = productData.barcode?.toString().toLowerCase() || '';
        const productMainBarcode = productData.mainBarcode?.toString().toLowerCase() || '';
        
        // Check size barcodes
        let foundSize: string | undefined = undefined;
        if (productData.sizeBarcodes && typeof productData.sizeBarcodes === 'object') {
          for (const [size, sizeBarcode] of Object.entries(productData.sizeBarcodes)) {
            const sb = (sizeBarcode as string)?.toString().toLowerCase() || '';
            if (sb === barcode || normalizeBarcode(sb) === normalizedBarcode) {
              foundSize = size;
              break;
            }
          }
        }
        
        // Check size variants
        if (!foundSize && productData.sizeVariants && typeof productData.sizeVariants === 'object') {
          for (const [size, variant] of Object.entries(productData.sizeVariants)) {
            const variantBarcode = (variant as any)?.barcode?.toString().toLowerCase() || '';
            if (variantBarcode === barcode || normalizeBarcode(variantBarcode) === normalizedBarcode) {
              foundSize = size;
              break;
            }
          }
        }
        
        const matchesMain = 
          productBarcode === barcode ||
          normalizeBarcode(productBarcode) === normalizedBarcode ||
          productMainBarcode === barcode ||
          normalizeBarcode(productMainBarcode) === normalizedBarcode;
        
        if (matchesMain || foundSize) {
          matchingProducts.push({ 
            id: productDoc.id, 
            data: productData,
            matchedSize: foundSize
          });
        }
      }
    } catch (error) {
      console.warn('[ShippingPage] Error searching products:', error);
    }
    
    // Check each item in the order
    for (let i = 0; i < (selectedOrder.items?.length || 0); i++) {
      const item = selectedOrder.items![i];
      
      // Skip if already scanned
      if (scannedReturnItems.has(i)) continue;
      
      const itemBarcode = item.barcode?.toString().toLowerCase() || '';
      const itemProductId = item.productId?.toString() || '';
      const itemSize = item.size || '';
      
      const directMatch = 
        itemBarcode === barcode ||
        normalizeBarcode(itemBarcode) === normalizedBarcode;
      
      const productMatch = matchingProducts.find(mp => {
        const productIdMatches = itemProductId.toLowerCase().startsWith(mp.id.toLowerCase()) ||
          itemProductId.toLowerCase() === mp.id.toLowerCase();
        
        if (mp.matchedSize && itemSize) {
          return productIdMatches && mp.matchedSize.toLowerCase() === itemSize.toLowerCase();
        }
        return productIdMatches;
      });
      
      if (directMatch || productMatch) {
        matchedIndex = i;
        matchedProductId = productMatch?.id || itemProductId.split('_')[0] || null;
        matchedSize = productMatch?.matchedSize || itemSize || null;
        break;
      }
    }
    
    if (matchedIndex === -1) {
      alert(`❌ Product not found in this order's items.\nBarcode: ${barcodeInput}`);
      setBarcodeInput('');
      setScanning(false);
      return;
    }
    
    const matchedItem = selectedOrder.items![matchedIndex];
    const quantityToReturn = matchedItem.quantity || 1;
    
    // Update stock (increase for returns)
    let previousStock: number | null = null;
    let newStock: number | null = null;
    
    if (matchedProductId) {
      try {
        const productRef = doc(db, 'businesses', selectedOrder.businessId, 'products', matchedProductId);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const productData = productSnap.data();
          const stockObj = productData.stock || {};
          const sizeKey = matchedSize || matchedItem.size || 'default';
          
          if (typeof stockObj === 'object' && stockObj[sizeKey] !== undefined) {
            previousStock = stockObj[sizeKey];
            newStock = previousStock + quantityToReturn;
            
            // Update stock in database (increase for return)
            await updateDoc(productRef, {
              [`stock.${sizeKey}`]: newStock
            });
            console.log(`[ShippingPage] Return: Updated stock for ${matchedProductId} size ${sizeKey}: ${previousStock} -> ${newStock}`);
          } else if (typeof stockObj === 'number') {
            previousStock = stockObj;
            newStock = previousStock + quantityToReturn;
            
            await updateDoc(productRef, {
              stock: newStock
            });
            console.log(`[ShippingPage] Return: Updated total stock for ${matchedProductId}: ${previousStock} -> ${newStock}`);
          }
        }
      } catch (stockError) {
        console.error('[ShippingPage] Error updating stock for return:', stockError);
      }
    }
    
    // Mark item as scanned
    const newScannedItems = new Set(scannedReturnItems);
    newScannedItems.add(matchedIndex);
    setScannedReturnItems(newScannedItems);
    
    // Log the return scan with selling price (from order item)
    const sellingPrice = matchedItem.price || matchedItem.unitPrice || 0;
    const scanLogRef = collection(db, 'businesses', selectedOrder.businessId, 'scan_log');
    await addDoc(scanLogRef, {
      type: 'return',
      barcode: barcodeInput,
      orderId: selectedOrder.id,
      orderNumber: selectedOrder.orderNumber,
      businessId: selectedOrder.businessId,
      businessName: selectedOrder.businessName,
      itemIndex: matchedIndex,
      productId: matchedProductId,
      productName: matchedItem.productName || matchedItem.name || 'Unknown',
      size: matchedSize || matchedItem.size || null,
      // Use selling price for returns (the price customer paid)
      price: sellingPrice,
      sellingPrice: sellingPrice,
      quantity: quantityToReturn,
      // For returns, stock increases
      previousStock: previousStock,
      newStock: newStock,
      stockUpdated: previousStock !== null,
      timestamp: serverTimestamp(),
      user: 'XDIGIX',
      userId: 'xdigix-fulfillment',
      adminEmail: rbacUser?.email || 'Unknown',
      adminUserId: rbacUser?.id || null,
      notes: `Return scan: Item ${matchedIndex + 1} of ${selectedOrder.items?.length}`,
      source: 'shipping_page_return'
    });
    
    const stockMsg = previousStock !== null 
      ? `\nStock: ${previousStock} → ${newStock} (+${quantityToReturn})` 
      : '';
    alert(`✅ Item scanned for return!${stockMsg}\n\nScanned: ${newScannedItems.size} / ${selectedOrder.items?.length} items`);
    setBarcodeInput('');
    setScanning(false);
  };

  const startCamera = async () => {
    // First, show the camera container
    setShowCameraContainer(true);
    
    // Wait a bit for the DOM to update
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      const container = document.getElementById('return-scanner');
      if (!container) {
        console.error('[ShippingPage] Camera container not found');
        alert('Camera container not found. Please try again.');
        setShowCameraContainer(false);
        return;
      }
      
      // Stop any existing instance
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {
          // Ignore
        }
        html5QrCodeRef.current = null;
      }
      
      const html5QrCode = new Html5Qrcode('return-scanner');
      html5QrCodeRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 }
        },
        (decodedText) => {
          setBarcodeInput(decodedText);
          html5QrCode.stop().catch(console.error);
          setCameraActive(false);
          setShowCameraContainer(false);
        },
        () => {}
      );
      
      setCameraActive(true);
    } catch (error: any) {
      console.error('[ShippingPage] Camera error:', error);
      setShowCameraContainer(false);
      setCameraActive(false);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to start camera.';
      if (error.message?.includes('Permission denied') || error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.message?.includes('not found') || error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.message?.includes('insecure') || error.name === 'NotSupportedError') {
        errorMessage = 'Camera access requires HTTPS. Please use a secure connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (error) {
        console.error('[ShippingPage] Error stopping camera:', error);
      }
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
    setShowCameraContainer(false);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.fulfillment?.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy HH:mm');
    } catch {
      return 'N/A';
    }
  };

  return (
    <PermissionGuard 
      permissions={['super_admin.manage_all_tenants', 'super_admin.view_analytics', 'super_admin.manage_subscriptions']}
      showError={false}
    >
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <Truck className="w-8 h-8 text-purple-400" />
              Shipping
            </h1>
            <p className="text-gray-400 mt-1">Manage orders in transit - mark as delivered, returned, or damaged</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadOrders}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Orders In Transit</p>
              <p className="text-4xl font-bold text-purple-400">{orders.length}</p>
            </div>
            <Truck className="w-16 h-16 text-purple-400/30" />
          </div>
        </div>

        {/* Search */}
        <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-5 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order number, customer, tracking number..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-12 text-center">
            <Truck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Orders In Transit</h3>
            <p className="text-gray-400">Orders will appear here once they are shipped</p>
          </div>
        ) : (
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0f1029] border-b border-[#2d2f5a]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order #</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Business</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tracking</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Shipped</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d2f5a]">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-white">{order.orderNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300">{order.businessName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{order.customer?.name || 'Unknown'}</p>
                          <p className="text-gray-500 text-sm">{order.customer?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400">
                          {order.fulfillment?.trackingNumber || 'No tracking'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-400 font-medium">
                          ${(order.financials?.total || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 text-sm">
                          {formatDate(order.fulfillment?.shippedAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetailModal(true);
                            }}
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowActionModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-all text-sm"
                            title="Update Status"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Modal - Choose Delivered/Return/Damaged */}
        {showActionModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-[#2d2f5a]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Update Order Status</h2>
                  <button
                    onClick={() => setShowActionModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <p className="text-gray-400 mt-2">Order: {selectedOrder.orderNumber}</p>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => handleAction('delivered')}
                  disabled={updating}
                  className="w-full flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-white font-medium">Mark as Delivered</p>
                    <p className="text-gray-400 text-sm">Order was successfully delivered to customer</p>
                  </div>
                </button>
                
                <button
                  onClick={() => handleAction('returned')}
                  disabled={updating}
                  className="w-full flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl hover:bg-orange-500/20 transition-all disabled:opacity-50"
                >
                  <RotateCcw className="w-6 h-6 text-orange-400" />
                  <div className="text-left">
                    <p className="text-white font-medium">Mark as Returned</p>
                    <p className="text-gray-400 text-sm">Customer returned the order - requires scanning</p>
                  </div>
                </button>
                
                <button
                  onClick={() => handleAction('damaged')}
                  disabled={updating}
                  className="w-full flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl hover:bg-rose-500/20 transition-all disabled:opacity-50"
                >
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                  <div className="text-left">
                    <p className="text-white font-medium">Mark as Damaged</p>
                    <p className="text-gray-400 text-sm">Order was damaged/stolen during transit</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return Scan Modal */}
        {showReturnScanModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#2d2f5a]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-orange-400" />
                      Return Scan Required
                    </h2>
                    <p className="text-gray-400 mt-1">
                      Scan {selectedOrder.items?.length || 0} items to process return
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      stopCamera();
                      setShowReturnScanModal(false);
                      setShowCameraContainer(false);
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Progress */}
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-orange-400 font-medium">Scan Progress</span>
                    <span className="text-white font-bold">
                      {scannedReturnItems.size} / {selectedOrder.items?.length || 0}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-400 transition-all"
                      style={{ width: `${((scannedReturnItems.size / (selectedOrder.items?.length || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        scannedReturnItems.has(idx) 
                          ? 'bg-emerald-500/10 border border-emerald-500/30' 
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div>
                        <p className="text-white">{item.productName || item.name}</p>
                        {item.size && <p className="text-gray-500 text-sm">Size: {item.size}</p>}
                      </div>
                      {scannedReturnItems.has(idx) ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <span className="text-gray-500 text-sm">Not scanned</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Scanner */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReturnScan()}
                      placeholder="Enter or scan barcode..."
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
                    />
                    <button
                      onClick={handleReturnScan}
                      disabled={scanning || !barcodeInput.trim()}
                      className="px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      <Scan className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => (cameraActive || showCameraContainer) ? stopCamera() : startCamera()}
                    disabled={showCameraContainer && !cameraActive}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors ${
                      cameraActive 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : showCameraContainer
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    {cameraActive ? 'Stop Camera' : showCameraContainer ? 'Starting Camera...' : 'Use Camera'}
                  </button>
                  
                  {showCameraContainer && (
                    <div className="relative">
                      <div id="return-scanner" className="w-full rounded-xl overflow-hidden bg-black" style={{ minHeight: '250px' }} />
                      {!cameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-400 border-t-transparent mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">Initializing camera...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Complete button */}
                {scannedReturnItems.size >= (selectedOrder.items?.length || 0) && (
                  <button
                    onClick={() => updateOrderStatus('returned', `All ${selectedOrder.items?.length} items scanned and returned`)}
                    disabled={updating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Complete Return
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#2d2f5a]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Order Details</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm">Order Number</p>
                    <p className="text-white font-medium">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Business</p>
                    <p className="text-white">{selectedOrder.businessName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Customer</p>
                    <p className="text-white">{selectedOrder.customer?.name}</p>
                    <p className="text-gray-400 text-sm">{selectedOrder.customer?.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Total</p>
                    <p className="text-emerald-400 font-bold text-lg">
                      ${(selectedOrder.financials?.total || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Tracking Number</p>
                    <p className="text-white">{selectedOrder.fulfillment?.trackingNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Shipped At</p>
                    <p className="text-white">{formatDate(selectedOrder.fulfillment?.shippedAt)}</p>
                  </div>
                </div>

                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-sm mb-3">Items ({selectedOrder.items.length})</p>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-white">{item.productName || item.name}</p>
                            {item.size && <p className="text-gray-500 text-sm">Size: {item.size}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-white">x{item.quantity}</p>
                            <p className="text-gray-400 text-sm">${item.price?.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-[#2d2f5a]">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowActionModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

