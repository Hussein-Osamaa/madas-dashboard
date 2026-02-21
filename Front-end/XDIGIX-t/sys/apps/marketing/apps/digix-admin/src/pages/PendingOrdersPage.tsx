/**
 * Pending Orders Page
 * Show pending orders and allow scanning items to move to ready for pickup
 */

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { useRBAC } from '../contexts/RBACContext';
import { collection, db, getDocs, doc, updateDoc, query, orderBy, addDoc, serverTimestamp, getDoc } from '../lib/firebase';
import {
  Clock,
  Search,
  Package,
  CheckCircle,
  X,
  Eye,
  Building2,
  FileText,
  RefreshCw,
  Scan,
  Camera,
  ArrowRight
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
    stock?: number;
  }>;
  shippingAddress?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
};

export default function PendingOrdersPage() {
  const { user: rbacUser } = useRBAC();
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
  const [updating, setUpdating] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const allOrders: FulfillmentOrder[] = [];
      const businessesSnapshot = await getDocs(collection(db, 'businesses'));
      
      console.log(`[PendingOrdersPage] Found ${businessesSnapshot.docs.length} total businesses`);

      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;
        const businessData = businessDoc.data();
        
        // Check if business has fulfillment service
        const hasFulfillment = 
          businessData.features?.fulfillment === true ||
          businessData.features?.fulfillment_service === true ||
          businessData.features?.fulfillmentService === true;

        console.log(`[PendingOrdersPage] Business ${businessId} (${businessData.businessName || businessData.name}): fulfillment=${hasFulfillment}`);

        if (!hasFulfillment) continue;

        try {
          const ordersRef = collection(db, 'businesses', businessId, 'orders');
          
          // Try with orderBy first, fallback to without if it fails
          let ordersSnapshot;
          try {
            const ordersQuery = query(ordersRef, orderBy('date', 'desc'));
            ordersSnapshot = await getDocs(ordersQuery);
          } catch (queryError) {
            console.warn(`[PendingOrdersPage] OrderBy failed for ${businessId}, trying without order:`, queryError);
            ordersSnapshot = await getDocs(ordersRef);
          }
          
          console.log(`[PendingOrdersPage] Business ${businessId}: found ${ordersSnapshot.docs.length} orders`);

          ordersSnapshot.docs.forEach(orderDoc => {
            const orderData = orderDoc.data();
            const fulfillmentStatus = orderData.fulfillment?.status || orderData.status || 'pending';
            
            console.log(`[PendingOrdersPage] Order ${orderDoc.id}: status=${fulfillmentStatus}`);
            
            // Only include pending orders
            if (fulfillmentStatus === 'pending') {
              allOrders.push({
                id: orderDoc.id,
                orderId: orderDoc.id,
                orderNumber: orderData.orderNumber || `#${orderDoc.id.slice(0, 6)}`,
                businessId: businessId,
                businessName: businessData.businessName || businessData.name || 'Unknown Business',
                customer: orderData.customer || { name: 'Unknown', email: '', phone: '' },
                fulfillment: orderData.fulfillment || { status: 'pending' },
                financials: orderData.financials || { total: 0 },
                metadata: orderData.metadata || {},
                items: orderData.items || [],
                shippingAddress: orderData.shippingAddress || orderData.shipping?.address
              });
            }
          });
        } catch (error) {
          console.error(`[PendingOrdersPage] Error loading orders for business ${businessId}:`, error);
        }
      }

      console.log(`[PendingOrdersPage] Total pending orders loaded: ${allOrders.length}`);
      setOrders(allOrders);
    } catch (error) {
      console.error('[PendingOrdersPage] Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleScan = async () => {
    if (!barcodeInput.trim() || !selectedOrder) return;
    
    setScanning(true);
    const barcode = barcodeInput.trim().toLowerCase();
    const normalizeBarcode = (str: string) => str.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
    const normalizedBarcode = normalizeBarcode(barcode);
    
    // Find matching item in order
    let matchedIndex = -1;
    let matchedItem: any = null;
    let matchedProductId: string | null = null;
    let matchedProductData: any = null;
    let matchedSize: string | null = null;
    
    // First, search products to get matching product IDs and data
    const matchingProducts: { id: string; data: any; matchedSize?: string }[] = [];
    try {
      const productsRef = collection(db, 'businesses', selectedOrder.businessId, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      for (const productDoc of productsSnapshot.docs) {
        const productData = productDoc.data();
        const productBarcode = productData.barcode?.toString().toLowerCase() || '';
        const productMainBarcode = productData.mainBarcode?.toString().toLowerCase() || '';
        const productSku = productData.sku?.toString().toLowerCase() || '';
        
        // Check size barcodes (sizeBarcodes object)
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
        
        // Check size variants (sizeVariants object)
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
          normalizeBarcode(productMainBarcode) === normalizedBarcode ||
          productSku === barcode ||
          normalizeBarcode(productSku) === normalizedBarcode;
        
        if (matchesMain || foundSize) {
          matchingProducts.push({ 
            id: productDoc.id, 
            data: productData,
            matchedSize: foundSize
          });
        }
      }
    } catch (error) {
      console.warn('[PendingOrdersPage] Error searching products:', error);
    }
    
    // Check each item in the order
    for (let i = 0; i < (selectedOrder.items?.length || 0); i++) {
      const item = selectedOrder.items![i];
      
      // Skip if already scanned
      if (scannedItems.has(i)) continue;
      
      const itemBarcode = item.barcode?.toString().toLowerCase() || '';
      const itemProductId = item.productId?.toString() || '';
      const itemProductIdLower = itemProductId.toLowerCase();
      const itemSize = item.size || '';
      
      // Check direct barcode match
      const directMatch = 
        itemBarcode === barcode ||
        normalizeBarcode(itemBarcode) === normalizedBarcode;
      
      // Check if any matching product matches this item
      const productMatch = matchingProducts.find(mp => {
        const productIdMatches = itemProductIdLower.startsWith(mp.id.toLowerCase()) ||
          itemProductIdLower === mp.id.toLowerCase();
        
        // If we matched a specific size barcode, ensure it's the right size
        if (mp.matchedSize && itemSize) {
          return productIdMatches && mp.matchedSize.toLowerCase() === itemSize.toLowerCase();
        }
        return productIdMatches;
      });
      
      if (directMatch || productMatch) {
        matchedIndex = i;
        matchedItem = item;
        matchedProductId = productMatch?.id || itemProductId.split('_')[0] || null;
        matchedProductData = productMatch?.data || null;
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
    
    // Get current stock and update it
    let previousStock: number | null = null;
    let newStock: number | null = null;
    let productCostPrice: number | null = null; // Cost price from product, not selling price
    const quantityToDeduct = matchedItem.quantity || 1;
    
    if (matchedProductId) {
      try {
        // Extract base product ID (remove size suffix like "-38" or "_38")
        const baseProductId = matchedProductId.split('-')[0].split('_')[0];
        console.log(`[PendingOrdersPage] Looking up product with base ID: ${baseProductId} (original: ${matchedProductId})`);
        
        const productRef = doc(db, 'businesses', selectedOrder.businessId, 'products', baseProductId);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const productData = productSnap.data();
          console.log(`[PendingOrdersPage] Product data:`, JSON.stringify({ price: productData.price, sellingPrice: productData.sellingPrice }));
          
          // Get the cost price from the product (price field is cost, sellingPrice is selling)
          // Try multiple possible field names for cost price
          const costPrice = productData.price ?? productData.costPrice ?? productData.cost ?? null;
          productCostPrice = typeof costPrice === 'number' ? costPrice : null;
          console.log(`[PendingOrdersPage] Found product ${baseProductId}, cost price: ${productCostPrice}`);
          const stockObj = productData.stock || {};
          const sizeKey = matchedSize || matchedItem.size || 'default';
          
          // Get previous stock for this size
          if (typeof stockObj === 'object' && stockObj[sizeKey] !== undefined) {
            previousStock = stockObj[sizeKey];
            newStock = Math.max(0, previousStock - quantityToDeduct);
            
            // Update stock in database
            await updateDoc(productRef, {
              [`stock.${sizeKey}`]: newStock
            });
            console.log(`[PendingOrdersPage] Updated stock for ${matchedProductId} size ${sizeKey}: ${previousStock} -> ${newStock}`);
          } else if (typeof stockObj === 'number') {
            // Legacy: stock is a single number, not per-size
            previousStock = stockObj;
            newStock = Math.max(0, previousStock - quantityToDeduct);
            
            await updateDoc(productRef, {
              stock: newStock
            });
            console.log(`[PendingOrdersPage] Updated total stock for ${matchedProductId}: ${previousStock} -> ${newStock}`);
          }
        } else {
          console.warn(`[PendingOrdersPage] Product not found with ID: ${baseProductId}`);
        }
      } catch (stockError) {
        console.error('[PendingOrdersPage] Error updating stock:', stockError);
        // Continue anyway - don't block the scan
      }
    } else {
      console.warn(`[PendingOrdersPage] No matchedProductId available`);
    }
    
    // Mark item as scanned
    const newScannedItems = new Set(scannedItems);
    newScannedItems.add(matchedIndex);
    setScannedItems(newScannedItems);
    
    const allItemsScanned = newScannedItems.size >= (selectedOrder.items?.length || 0);
    
    // Log the scan with full product data
    const finalPrice = productCostPrice ?? matchedItem.price ?? matchedItem.unitPrice ?? 0;
    console.log(`[PendingOrdersPage] Logging scan with price: ${finalPrice} (costPrice: ${productCostPrice}, itemPrice: ${matchedItem.price})`);
    
    const scanLogRef = collection(db, 'businesses', selectedOrder.businessId, 'scan_log');
    await addDoc(scanLogRef, {
      barcode: barcodeInput,
      orderId: selectedOrder.id,
      orderNumber: selectedOrder.orderNumber,
      businessId: selectedOrder.businessId,
      businessName: selectedOrder.businessName,
      type: 'order',
      itemIndex: matchedIndex,
      productName: matchedItem.productName || matchedItem.name || 'Unknown',
      productId: matchedProductId || matchedItem.productId || null,
      // Include size, price, and quantity data
      size: matchedSize || matchedItem.size || matchedItem.selectedSize || matchedItem.variant || null,
      // Use cost price from product, not selling price from order item
      price: finalPrice,
      sellingPrice: matchedItem.price || matchedItem.unitPrice || 0, // Also store selling price for reference
      quantity: quantityToDeduct,
      // Stock change - now with actual values
      previousStock: previousStock,
      newStock: newStock,
      stockUpdated: previousStock !== null,
      scannedItemsCount: newScannedItems.size,
      totalItemsCount: selectedOrder.items?.length || 0,
      allItemsScanned: allItemsScanned,
      timestamp: serverTimestamp(),
      user: 'XDIGIX',
      userId: 'xdigix-fulfillment',
      adminEmail: rbacUser?.email || 'Unknown',
      adminUserId: rbacUser?.id || null,
      orderStatus: allItemsScanned ? 'ready_for_pickup' : 'pending',
      customer: selectedOrder.customer?.name || 'Unknown',
      notes: allItemsScanned 
        ? 'All items scanned - Order ready for pickup'
        : `Item ${matchedIndex + 1} of ${selectedOrder.items?.length} scanned`,
      source: 'pending_orders_page'
    });
    
    // If all items scanned, update order status
    if (allItemsScanned) {
      try {
        const orderRef = doc(db, 'businesses', selectedOrder.businessId, 'orders', selectedOrder.id);
        await updateDoc(orderRef, {
          'fulfillment.status': 'ready_for_pickup',
          'status': 'ready_for_pickup',
          'metadata.updatedAt': new Date().toISOString()
        });
        
        alert(`✅ All items scanned!\n\nOrder ${selectedOrder.orderNumber} is now Ready for Pickup!`);
        stopCamera();
        setShowScanModal(false);
        setScannedItems(new Set());
        setSelectedOrder(null);
        await loadOrders();
      } catch (error) {
        console.error('[PendingOrdersPage] Error updating order:', error);
        alert('❌ Failed to update order status');
      }
    } else {
      const stockMsg = previousStock !== null 
        ? `\nStock: ${previousStock} → ${newStock}` 
        : '';
      alert(`✅ Item scanned!${stockMsg}\n\nScanned: ${newScannedItems.size} / ${selectedOrder.items?.length} items\n\nContinue scanning remaining items.`);
      setBarcodeInput('');
    }
    
    setScanning(false);
  };

  const startCamera = async () => {
    // First, show the camera container
    setShowCameraContainer(true);
    
    // Wait a bit for the DOM to update
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      const container = document.getElementById('pending-scanner');
      if (!container) {
        console.error('[PendingOrdersPage] Camera container not found');
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
      
      const html5QrCode = new Html5Qrcode('pending-scanner');
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
      console.error('[PendingOrdersPage] Camera error:', error);
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
        console.error('[PendingOrdersPage] Error stopping camera:', error);
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
      order.businessName?.toLowerCase().includes(searchTerm.toLowerCase());
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
              <Clock className="w-8 h-8 text-amber-400" />
              Pending Orders
            </h1>
            <p className="text-gray-400 mt-1">Scan items to prepare orders for pickup</p>
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
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Pending Orders</p>
              <p className="text-4xl font-bold text-amber-400">{orders.length}</p>
            </div>
            <Clock className="w-16 h-16 text-amber-400/30" />
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
              placeholder="Search by order number, customer, business..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-12 text-center">
            <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Pending Orders</h3>
            <p className="text-gray-400">All orders have been processed</p>
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
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
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
                        <span className="text-gray-300">{order.items?.length || 0} items</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-400 font-medium">
                          ${(order.financials?.total || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 text-sm">
                          {formatDate(order.metadata?.createdAt)}
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
                              setScannedItems(new Set());
                              setBarcodeInput('');
                              setShowScanModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-all"
                            title="Scan Items"
                          >
                            <Scan className="w-4 h-4" />
                            <span className="text-sm">Scan</span>
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

        {/* Scan Modal */}
        {showScanModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-[#2d2f5a]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Scan className="w-5 h-5 text-amber-400" />
                      Scan Order Items
                    </h2>
                    <p className="text-gray-400 mt-1">
                      Order: {selectedOrder.orderNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      stopCamera();
                      setShowScanModal(false);
                      setScannedItems(new Set());
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
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-400 font-medium">Scan Progress</span>
                    <span className="text-white font-bold">
                      {scannedItems.size} / {selectedOrder.items?.length || 0}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${((scannedItems.size / (selectedOrder.items?.length || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        scannedItems.has(idx) 
                          ? 'bg-emerald-500/10 border border-emerald-500/30' 
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div>
                        <p className="text-white">{item.productName || item.name}</p>
                        <div className="flex items-center gap-3 text-gray-500 text-sm">
                          {item.size && <span>Size: {item.size}</span>}
                          <span>Qty: {item.quantity}</span>
                          <span>${item.price?.toFixed(2)}</span>
                        </div>
                      </div>
                      {scannedItems.has(idx) ? (
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
                      onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                      placeholder="Enter or scan barcode..."
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                    />
                    <button
                      onClick={handleScan}
                      disabled={scanning || !barcodeInput.trim()}
                      className="px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
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
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    {cameraActive ? 'Stop Camera' : showCameraContainer ? 'Starting Camera...' : 'Use Camera'}
                  </button>
                  
                  {showCameraContainer && (
                    <div className="relative">
                      <div id="pending-scanner" className="w-full rounded-xl overflow-hidden bg-black" style={{ minHeight: '250px' }} />
                      {!cameraActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-400 border-t-transparent mx-auto mb-2" />
                            <p className="text-gray-400 text-sm">Initializing camera...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* All scanned indicator */}
                {scannedItems.size >= (selectedOrder.items?.length || 0) && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-400 font-medium">All items scanned!</p>
                    <p className="text-gray-400 text-sm">Order will be moved to Ready for Pickup</p>
                  </div>
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
                {/* Order Info */}
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
                    <p className="text-gray-500 text-sm">Date</p>
                    <p className="text-white">{formatDate(selectedOrder.metadata?.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Status</p>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-sm">
                      <Clock className="w-4 h-4" />
                      Pending
                    </span>
                  </div>
                </div>

                {/* Items */}
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

                {/* Shipping Address */}
                {selectedOrder.shippingAddress && (
                  <div>
                    <p className="text-gray-500 text-sm mb-2">Shipping Address</p>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-white">{selectedOrder.shippingAddress.address}</p>
                      <p className="text-gray-400">
                        {[selectedOrder.shippingAddress.city, selectedOrder.shippingAddress.state, selectedOrder.shippingAddress.zipCode]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action */}
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
                      setScannedItems(new Set());
                      setBarcodeInput('');
                      setShowScanModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <Scan className="w-4 h-4" />
                    Start Scanning
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

