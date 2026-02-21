/**
 * Ready for Pickup Page
 * Show orders that are ready for pickup and allow moving them to shipping
 */

import { useState, useEffect } from 'react';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { useRBAC } from '../contexts/RBACContext';
import { collection, db, getDocs, doc, updateDoc, query, orderBy, addDoc, serverTimestamp } from '../lib/firebase';
import {
  Package,
  Search,
  Truck,
  CheckCircle,
  Clock,
  X,
  Eye,
  MapPin,
  Building2,
  User,
  DollarSign,
  FileText,
  AlertCircle,
  ArrowRight,
  RefreshCw
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
  }>;
  shippingAddress?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
};

export default function ReadyForPickupPage() {
  const { user: rbacUser } = useRBAC();
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const allOrders: FulfillmentOrder[] = [];
      const businessesSnapshot = await getDocs(collection(db, 'businesses'));
      
      console.log(`[ReadyForPickupPage] Found ${businessesSnapshot.docs.length} total businesses`);

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
            console.warn(`[ReadyForPickupPage] OrderBy failed for ${businessId}, trying without order:`, queryError);
            ordersSnapshot = await getDocs(ordersRef);
          }

          ordersSnapshot.docs.forEach(orderDoc => {
            const orderData = orderDoc.data();
            const fulfillmentStatus = orderData.fulfillment?.status || orderData.status || 'pending';
            
            // Only include ready_for_pickup orders
            if (fulfillmentStatus === 'ready_for_pickup') {
              allOrders.push({
                id: orderDoc.id,
                orderId: orderDoc.id,
                orderNumber: orderData.orderNumber || `#${orderDoc.id.slice(0, 6)}`,
                businessId: businessId,
                businessName: businessData.businessName || businessData.name || 'Unknown Business',
                customer: orderData.customer || { name: 'Unknown', email: '', phone: '' },
                fulfillment: orderData.fulfillment || { status: 'ready_for_pickup' },
                financials: orderData.financials || { total: 0 },
                metadata: orderData.metadata || {},
                items: orderData.items || [],
                shippingAddress: orderData.shippingAddress || orderData.shipping?.address
              });
            }
          });
        } catch (error) {
          console.error(`[ReadyForPickupPage] Error loading orders for business ${businessId}:`, error);
        }
      }
      
      console.log(`[ReadyForPickupPage] Total ready_for_pickup orders loaded: ${allOrders.length}`);

      setOrders(allOrders);
    } catch (error) {
      console.error('[ReadyForPickupPage] Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleMoveToShipping = async (order: FulfillmentOrder) => {
    if (!window.confirm(`Move order ${order.orderNumber} to Shipping?`)) return;
    
    setUpdating(true);
    try {
      const orderRef = doc(db, 'businesses', order.businessId, 'orders', order.id);
      await updateDoc(orderRef, {
        'fulfillment.status': 'shipped',
        'status': 'processing', // processing = In Transit in Order Tracking
        'fulfillment.shippedAt': new Date().toISOString(),
        'metadata.updatedAt': new Date().toISOString()
      });

      // No scan_log entry needed for status changes - they clutter the log

      alert(`✅ Order ${order.orderNumber} moved to Shipping!`);
      await loadOrders();
    } catch (error) {
      console.error('[ReadyForPickupPage] Error updating order:', error);
      alert('❌ Failed to update order: ' + (error as Error).message);
    } finally {
      setUpdating(false);
    }
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
              <Package className="w-8 h-8 text-cyan-400" />
              Ready for Pickup
            </h1>
            <p className="text-gray-400 mt-1">Orders ready to be shipped to customers</p>
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
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Orders Ready for Pickup</p>
              <p className="text-4xl font-bold text-cyan-400">{orders.length}</p>
            </div>
            <Package className="w-16 h-16 text-cyan-400/30" />
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
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Orders Ready for Pickup</h3>
            <p className="text-gray-400">Orders will appear here once all items have been scanned</p>
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
                            onClick={() => handleMoveToShipping(order)}
                            disabled={updating}
                            className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-all disabled:opacity-50"
                            title="Move to Shipping"
                          >
                            <Truck className="w-4 h-4" />
                            <span className="text-sm">Ship</span>
                            <ArrowRight className="w-3 h-3" />
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
                      handleMoveToShipping(selectedOrder);
                    }}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4" />
                    Move to Shipping
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

