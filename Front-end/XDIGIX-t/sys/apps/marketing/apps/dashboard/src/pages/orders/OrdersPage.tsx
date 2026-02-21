import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../hooks/useCurrency';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import OrderStats from '../../components/orders/OrderStats';
import OrderModal from '../../components/orders/OrderModal';
import ScanBarcodeModal from '../../components/orders/ScanBarcodeModal';
import ScanSuccessModal from '../../components/orders/ScanSuccessModal';
import { useOrders } from '../../hooks/useOrders';
import { useProducts } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useCustomers';
import { useShippingIntegrations } from '../../hooks/useShippingIntegrations';
import { useAuth } from '../../contexts/AuthContext';
import { Order, OrderDraft, OrderStatus } from '../../services/ordersService';
import { createScanLog } from '../../services/scanLogsService';
import { createBostaDelivery } from '../../services/bostaService';
import { Product } from '../../services/productsService';

/** Convert backend/Firestore date (Date, string, number, Timestamp) to Date or null. */
function toValidDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'number') {
    const d = new Date(v < 1e12 ? v * 1000 : v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'object' && v !== null && 'seconds' in v && typeof (v as { seconds: number }).seconds === 'number') {
    return new Date((v as { seconds: number }).seconds * 1000);
  }
  return null;
}

function formatOrderDate(value: unknown, fmt: string, fallback = 'N/A'): string {
  const d = toValidDate(value);
  return d ? format(d, fmt) : fallback;
}

// Bosta Logo SVG Component
const BostaLogoSmall = () => (
  <svg className="w-4 h-4" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32.6634 8.83273L17.7948 0.266462C17.2016 -0.0888208 16.4503 -0.0888208 15.8572 0.266462L0.9886 8.83273C0.39544 9.18801 0 9.81962 0 10.5302V23.0835C0 23.7941 0.355896 24.4257 0.9886 24.781L15.8572 33.3473C16.1735 33.5052 16.4899 33.6236 16.8458 33.6236C17.2016 33.6236 17.518 33.5447 17.8344 33.3473L32.7029 24.781C33.2961 24.4257 33.6915 23.7941 33.6915 23.0835V10.5302C33.6519 9.81962 33.2565 9.18801 32.6634 8.83273ZM30.2116 19.9649L24.715 16.8069L30.2116 13.6488V19.9649ZM16.8458 3.66139L28.7485 10.5302L16.8458 17.399L4.90345 10.5302L16.8458 3.66139ZM3.44032 13.6093L8.93695 16.7674L3.44032 19.9255V13.6093ZM16.8458 29.9129L4.90345 23.0441L12.3377 18.7412L15.8176 20.7545C16.134 20.9124 16.4503 21.0308 16.8062 21.0308C17.1621 21.0308 17.4785 20.9518 17.7948 20.7545L21.2747 18.7412L28.709 23.0441L16.8458 29.9129Z" fill="#E30613"/>
  </svg>
);

type StatusFilter = 'all' | OrderStatus;

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

const OrdersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { businessId, businessName, permissions, loading } = useBusiness();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const {
    orders,
    stats,
    isLoading,
    createOrder,
    updateOrder,
    deleteOrder,
    creating,
    updating,
    deleting
  } = useOrders(businessId);
  const {
    products,
    updateProduct,
    isLoading: loadingProducts,
    updating: updatingProduct
  } = useProducts(businessId);

  const { customers } = useCustomers(businessId);
  
  const { isBostaEnabled, bostaConfig } = useShippingIntegrations(businessId);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [sendingToBosta, setSendingToBosta] = useState<string | null>(null);
  const [bostaModalOpen, setBostaModalOpen] = useState(false);
  const [selectedOrderForBosta, setSelectedOrderForBosta] = useState<Order | null>(null);
  const [courierDetailModal, setCourierDetailModal] = useState<Order | null>(null);
  const [scanResult, setScanResult] = useState<{
    productName: string;
    type: 'order' | 'return';
    previousStock: number;
    newStock: number;
    price?: number;
    size?: string | null;
  } | null>(null);

  const { hasPermission } = useBusiness();
  const canEdit = hasPermission('order_update') || 
                  hasPermission('order_edit') || 
                  permissions?.orders?.includes('update') ||
                  permissions?.orders?.includes('edit') || 
                  permissions?.inventory?.includes('edit');

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      // Search in basic order fields
      const matchesBasicSearch = term
        ? [order.customerName, order.customerContact, order.customerEmail, order.notes, order.channel]
            .some((value) => value && value.toLowerCase().includes(term)) ||
          order.id.toLowerCase().includes(term)
        : true;

      // Search in product names and sizes within order items
      const matchesProductSearch = term && order.items
        ? order.items.some((item: any) => {
            const nameMatch = item.name?.toLowerCase().includes(term);
            const sizeMatch = item.size?.toLowerCase().includes(term);
            return nameMatch || sizeMatch;
          })
        : false;

      const matchesSearch = term ? (matchesBasicSearch || matchesProductSearch) : true;

      const created = order.date ?? order.createdAt ?? undefined;
      const matchesStart = start ? (created ? created >= start : false) : true;
      const matchesEnd = end ? (created ? created <= end : false) : true;

      return matchesStatus && matchesSearch && matchesStart && matchesEnd;
    });
  }, [orders, statusFilter, searchTerm, startDate, endDate]);

  const openCreateModal = () => {
    setEditingOrder(null);
    setOrderModalOpen(true);
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setOrderModalOpen(true);
  };

  const handleSubmit = async (payload: OrderDraft) => {
    if (!businessId) return;
    if (payload.id) {
      const { id, ...rest } = payload;
      await updateOrder({ orderId: id, payload: rest });
    } else {
      const { id, ...rest } = payload;
      await createOrder(rest as Omit<OrderDraft, 'id'>);
    }
    setOrderModalOpen(false);
    setEditingOrder(null);
  };

  const handleDelete = async (orderId: string) => {
    if (!canEdit) return;
    const confirmed = window.confirm('Delete this order? This action cannot be undone.');
    if (!confirmed) return;
    await deleteOrder(orderId);
  };

  // Print Bosta shipping labels for selected orders
  const printBostaShippingLabels = (ordersToprint: Order[]) => {
    // Filter only orders that have been sent to Bosta
    const bostaOrders = ordersToprint.filter(o => o.bostaTrackingNumber);
    
    if (bostaOrders.length === 0) {
      alert('No orders with Bosta shipping labels found. Orders must be sent to Bosta first.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to print shipping labels.');
      return;
    }

    const labelsHtml = bostaOrders.map((order, index) => {
      const itemsCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || order.productCount || 1;
      const codAmount = order.codAmount || order.total || 0;
      const allowOpen = order.allowOpenPackage !== false ? 'نعم' : 'لا';
      const trackingNumber = order.bostaTrackingNumber || '';
      const shortOrderId = order.id.slice(-6);
      const customerName = order.customerName || 'N/A';
      const customerPhone = order.customerContact || '';
      const address = order.shippingAddress?.address || 'Address not provided';
      const city = order.shippingAddress?.city || 'القاهرة';
      const district = order.shippingAddress?.district || '';
      const floor = order.shippingAddress?.floor || '';
      const apartment = order.shippingAddress?.apartment || '';
      const building = order.shippingAddress?.building || '';
      const createdDate = formatOrderDate(order.createdAt, 'dd MMM, yyyy', format(new Date(), 'dd MMM, yyyy'));
      const merchantName = businessName || 'Merchant';
      const itemsDescription = order.items?.map(item => `${item.name} x${item.quantity}`).join(', ') || 'Items';
      const returnAddress = 'القاهره - القاهره الجديده - التجمع الخامس - شارع التسعين الجنوبي';
      
      // QR Code URL using QR Server API
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(trackingNumber || order.id)}`;
      
      // Barcode URLs using barcodeapi.org (Code 128 format - standard for shipping)
      const mainBarcodeUrl = `https://barcodeapi.org/api/128/${encodeURIComponent(trackingNumber.slice(-8) || order.id.slice(-8))}`;
      const smallBarcodeUrl = `https://barcodeapi.org/api/128/${encodeURIComponent(trackingNumber.slice(-8) || order.id.slice(-8))}`;

      return `
        <div class="label-container ${index > 0 ? 'page-break' : ''}">
          <!-- Label 1 -->
          <div class="label">
            <!-- Header Section -->
            <div class="header">
              <div class="header-left">
                <div class="logo-section">
                  <svg class="bosta-icon" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32.6634 8.83273L17.7948 0.266462C17.2016 -0.0888208 16.4503 -0.0888208 15.8572 0.266462L0.9886 8.83273C0.39544 9.18801 0 9.81962 0 10.5302V23.0835C0 23.7941 0.355896 24.4257 0.9886 24.781L15.8572 33.3473C16.1735 33.5052 16.4899 33.6236 16.8458 33.6236C17.2016 33.6236 17.518 33.5447 17.8344 33.3473L32.7029 24.781C33.2961 24.4257 33.6915 23.7941 33.6915 23.0835V10.5302C33.6519 9.81962 33.2565 9.18801 32.6634 8.83273ZM30.2116 19.9649L24.715 16.8069L30.2116 13.6488V19.9649ZM16.8458 3.66139L28.7485 10.5302L16.8458 17.399L4.90345 10.5302L16.8458 3.66139ZM3.44032 13.6093L8.93695 16.7674L3.44032 19.9255V13.6093ZM16.8458 29.9129L4.90345 23.0441L12.3377 18.7412L15.8176 20.7545C16.134 20.9124 16.4503 21.0308 16.8062 21.0308C17.1621 21.0308 17.4785 20.9518 17.7948 20.7545L21.2747 18.7412L28.709 23.0441L16.8458 29.9129Z" fill="#E30613"/>
                  </svg>
                  <span class="bosta-text">bosta</span>
                </div>
                <div class="delivery-label">توصيل</div>
              </div>
              <div class="header-center">
                <img src="${mainBarcodeUrl}" alt="Barcode" class="barcode-img" />
                <div class="tracking-digits">
                  ${trackingNumber.slice(-8).split('').map(d => `<span>${d}</span>`).join('')}
                </div>
              </div>
              <div class="header-right">
                <img src="${qrCodeUrl}" alt="QR" class="qr-code" />
              </div>
            </div>
            
            <!-- Hub Section -->
            <div class="hub-section">
              <div class="hub-code">E-03</div>
              <div class="hub-name">HELIOPOLIS HUB</div>
            </div>
            
            <!-- Main Content - Two Columns -->
            <div class="main-content">
              <div class="left-column">
                <div class="info-row">
                  <span class="label-text">المنطقة</span>
                  <span class="separator">|</span>
                  <span class="value-text">${city} - ${district || 'Almaza'} - الشقة: ${apartment || '3'} - الدور: ${floor || '2'}</span>
                </div>
                <div class="info-row">
                  <span class="label-text">العنوان</span>
                  <span class="separator">|</span>
                  <span class="value-text">${address}${building ? `، المبنى: ${building}` : ''}</span>
                </div>
                <div class="info-row">
                  <span class="label-text">علامة مميزة</span>
                  <span class="separator">|</span>
                  <span class="value-text">${building ? `المعزة، مبنى ${building}` : 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label-text">وصف الشحنة</span>
                  <span class="separator">|</span>
                  <span class="value-text items-desc">${itemsDescription}</span>
                </div>
              </div>
              <div class="right-column">
                <div class="cod-row">
                  <span class="cod-label">مبلغ التحصيل:</span>
                  <span class="cod-value">${(codAmount / 100).toLocaleString()}ج.م</span>
                </div>
                <div class="cod-row">
                  <span class="cod-label">تكلفة عدم الاستلام:</span>
                  <span class="cod-value">90 ج.م</span>
                </div>
                <div class="receiver-row">
                  <span class="receiver-label">توصيل إلى:</span>
                  <div class="receiver-info">
                    <span>${customerName}</span>
                    <span class="phone">${customerPhone}</span>
                  </div>
                </div>
                <div class="merchant-row">
                  <span class="merchant-label">التاجر:</span>
                  <span class="merchant-value">${merchantName}</span>
                </div>
                <div class="open-package-row">
                  <span class="open-badge">فتح الشحنة : ${allowOpen}</span>
                  <span class="items-badge">${itemsCount} قطع</span>
                </div>
              </div>
            </div>
            
            <!-- Footer Section -->
            <div class="footer">
              <div class="footer-top">
                <div class="notes-section">
                  <span class="notes-label">ملاحظات</span>
                  <span class="separator">|</span>
                  <span class="notes-value">Order #${shortOrderId}</span>
                </div>
              </div>
              <div class="footer-bottom">
                <div class="return-hub">
                  <div class="hub-indicator">-</div>
                  <span class="return-hub-name">KATAMYA_NEW HUB</span>
                </div>
                <div class="return-address">
                  <span class="return-label">عنوان المرتجع</span>
                  <span class="separator">|</span>
                  <span class="return-text">${returnAddress}</span>
                </div>
                <div class="order-ref-section">
                  <img src="${smallBarcodeUrl}" alt="Barcode" class="barcode-small-img" />
                  <div class="ref-numbers">${trackingNumber.slice(-8).split('').map(d => `<span>${d}</span>`).join('')}</div>
                  <div class="ref-text">Order Reference</div>
                  <div class="ref-id">${order.id}</div>
                </div>
              </div>
              <div class="created-date">Created: ${createdDate}</div>
            </div>
          </div>
          
          <!-- Label 2 (duplicate) -->
          <div class="label">
            <!-- Header Section -->
            <div class="header">
              <div class="header-left">
                <div class="logo-section">
                  <svg class="bosta-icon" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32.6634 8.83273L17.7948 0.266462C17.2016 -0.0888208 16.4503 -0.0888208 15.8572 0.266462L0.9886 8.83273C0.39544 9.18801 0 9.81962 0 10.5302V23.0835C0 23.7941 0.355896 24.4257 0.9886 24.781L15.8572 33.3473C16.1735 33.5052 16.4899 33.6236 16.8458 33.6236C17.2016 33.6236 17.518 33.5447 17.8344 33.3473L32.7029 24.781C33.2961 24.4257 33.6915 23.7941 33.6915 23.0835V10.5302C33.6519 9.81962 33.2565 9.18801 32.6634 8.83273ZM30.2116 19.9649L24.715 16.8069L30.2116 13.6488V19.9649ZM16.8458 3.66139L28.7485 10.5302L16.8458 17.399L4.90345 10.5302L16.8458 3.66139ZM3.44032 13.6093L8.93695 16.7674L3.44032 19.9255V13.6093ZM16.8458 29.9129L4.90345 23.0441L12.3377 18.7412L15.8176 20.7545C16.134 20.9124 16.4503 21.0308 16.8062 21.0308C17.1621 21.0308 17.4785 20.9518 17.7948 20.7545L21.2747 18.7412L28.709 23.0441L16.8458 29.9129Z" fill="#E30613"/>
                  </svg>
                  <span class="bosta-text">bosta</span>
                </div>
                <div class="delivery-label">توصيل</div>
              </div>
              <div class="header-center">
                <img src="${mainBarcodeUrl}" alt="Barcode" class="barcode-img" />
                <div class="tracking-digits">
                  ${trackingNumber.slice(-8).split('').map(d => `<span>${d}</span>`).join('')}
                </div>
              </div>
              <div class="header-right">
                <img src="${qrCodeUrl}" alt="QR" class="qr-code" />
              </div>
            </div>
            
            <!-- Hub Section -->
            <div class="hub-section">
              <div class="hub-code">E-03</div>
              <div class="hub-name">HELIOPOLIS HUB</div>
            </div>
            
            <!-- Main Content - Two Columns -->
            <div class="main-content">
              <div class="left-column">
                <div class="info-row">
                  <span class="label-text">المنطقة</span>
                  <span class="separator">|</span>
                  <span class="value-text">${city} - ${district || 'Almaza'} - الشقة: ${apartment || '3'} - الدور: ${floor || '2'}</span>
                </div>
                <div class="info-row">
                  <span class="label-text">العنوان</span>
                  <span class="separator">|</span>
                  <span class="value-text">${address}${building ? `، المبنى: ${building}` : ''}</span>
                </div>
                <div class="info-row">
                  <span class="label-text">علامة مميزة</span>
                  <span class="separator">|</span>
                  <span class="value-text">${building ? `المعزة، مبنى ${building}` : 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="label-text">وصف الشحنة</span>
                  <span class="separator">|</span>
                  <span class="value-text items-desc">${itemsDescription}</span>
                </div>
              </div>
              <div class="right-column">
                <div class="cod-row">
                  <span class="cod-label">مبلغ التحصيل:</span>
                  <span class="cod-value">${(codAmount / 100).toLocaleString()}ج.م</span>
                </div>
                <div class="cod-row">
                  <span class="cod-label">تكلفة عدم الاستلام:</span>
                  <span class="cod-value">90 ج.م</span>
                </div>
                <div class="receiver-row">
                  <span class="receiver-label">توصيل إلى:</span>
                  <div class="receiver-info">
                    <span>${customerName}</span>
                    <span class="phone">${customerPhone}</span>
                  </div>
                </div>
                <div class="merchant-row">
                  <span class="merchant-label">التاجر:</span>
                  <span class="merchant-value">${merchantName}</span>
                </div>
                <div class="open-package-row">
                  <span class="open-badge">فتح الشحنة : ${allowOpen}</span>
                  <span class="items-badge">${itemsCount} قطع</span>
                </div>
              </div>
            </div>
            
            <!-- Footer Section -->
            <div class="footer">
              <div class="footer-top">
                <div class="notes-section">
                  <span class="notes-label">ملاحظات</span>
                  <span class="separator">|</span>
                  <span class="notes-value">Order #${shortOrderId}</span>
                </div>
              </div>
              <div class="footer-bottom">
                <div class="return-hub">
                  <div class="hub-indicator">-</div>
                  <span class="return-hub-name">KATAMYA_NEW HUB</span>
                </div>
                <div class="return-address">
                  <span class="return-label">عنوان المرتجع</span>
                  <span class="separator">|</span>
                  <span class="return-text">${returnAddress}</span>
                </div>
                <div class="order-ref-section">
                  <img src="${smallBarcodeUrl}" alt="Barcode" class="barcode-small-img" />
                  <div class="ref-numbers">${trackingNumber.slice(-8).split('').map(d => `<span>${d}</span>`).join('')}</div>
                  <div class="ref-text">Order Reference</div>
                  <div class="ref-id">${order.id}</div>
                </div>
              </div>
              <div class="created-date">Created: ${createdDate}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bosta Shipping Labels</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          @page {
            size: A4;
            margin: 5mm;
          }
          
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #fff;
            padding: 5mm;
            direction: rtl;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .label-container {
            display: flex;
            flex-direction: column;
            gap: 8mm;
            height: calc(297mm - 10mm);
          }
          
          .label {
            flex: 1;
            border: 1.5px solid #ccc;
            border-radius: 6px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            background: #fff;
            max-height: calc(50% - 4mm);
          }
          
          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
            margin-bottom: 8px;
          }
          
          .header-left {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          
          .logo-section {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .bosta-icon {
            width: 28px;
            height: 28px;
          }
          
          .bosta-text {
            font-size: 22px;
            font-weight: bold;
            color: #333;
            font-family: Arial, sans-serif;
          }
          
          .delivery-label {
            font-size: 16px;
            font-weight: bold;
            color: #E30613;
            margin-right: 34px;
          }
          
          .header-center {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          .barcode-img {
            width: 180px;
            height: 50px;
            object-fit: contain;
          }
          
          .tracking-digits {
            display: flex;
            gap: 8px;
            margin-top: 4px;
            direction: ltr;
          }
          
          .tracking-digits span {
            font-size: 14px;
            font-weight: bold;
            color: #333;
          }
          
          .header-right {
            display: flex;
            align-items: center;
          }
          
          .qr-code {
            width: 70px;
            height: 70px;
          }
          
          /* Hub Section */
          .hub-section {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
          }
          
          .hub-code {
            background: #333;
            color: #fff;
            padding: 6px 14px;
            border-radius: 4px;
            font-size: 18px;
            font-weight: bold;
          }
          
          .hub-name {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            direction: ltr;
          }
          
          /* Main Content */
          .main-content {
            display: flex;
            gap: 10px;
            flex: 1;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
          }
          
          .left-column {
            flex: 1.2;
            padding: 8px;
            border-left: 1px solid #ddd;
          }
          
          .right-column {
            flex: 1;
            padding: 8px;
            display: flex;
            flex-direction: column;
          }
          
          .info-row {
            display: flex;
            align-items: flex-start;
            gap: 6px;
            padding: 6px 0;
            border-bottom: 1px solid #eee;
            font-size: 11px;
          }
          
          .info-row:last-child {
            border-bottom: none;
          }
          
          .label-text {
            color: #666;
            white-space: nowrap;
            font-weight: 500;
          }
          
          .separator {
            color: #ccc;
          }
          
          .value-text {
            color: #333;
            font-weight: 500;
          }
          
          .items-desc {
            font-size: 10px;
            line-height: 1.3;
          }
          
          /* Right Column Styles */
          .cod-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #eee;
            font-size: 12px;
          }
          
          .cod-label {
            color: #333;
          }
          
          .cod-value {
            font-weight: bold;
            color: #333;
            direction: ltr;
          }
          
          .receiver-row {
            padding: 6px 0;
            border-bottom: 1px solid #eee;
          }
          
          .receiver-label {
            font-size: 11px;
            color: #333;
            display: block;
            margin-bottom: 2px;
          }
          
          .receiver-info {
            display: flex;
            flex-direction: column;
            direction: ltr;
            text-align: left;
          }
          
          .receiver-info span {
            font-size: 12px;
            font-weight: bold;
            color: #333;
          }
          
          .receiver-info .phone {
            color: #666;
            font-size: 11px;
          }
          
          .merchant-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #eee;
            font-size: 11px;
          }
          
          .merchant-label {
            color: #333;
          }
          
          .merchant-value {
            font-weight: bold;
            color: #333;
          }
          
          .open-package-row {
            display: flex;
            gap: 8px;
            padding-top: 8px;
            margin-top: auto;
          }
          
          .open-badge, .items-badge {
            border: 1.5px solid #333;
            border-radius: 4px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: bold;
            color: #333;
          }
          
          /* Footer */
          .footer {
            border-top: 1px solid #ddd;
            padding-top: 6px;
            margin-top: 8px;
          }
          
          .footer-top {
            padding-bottom: 6px;
            border-bottom: 1px solid #eee;
          }
          
          .notes-section {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
          }
          
          .notes-label {
            color: #666;
          }
          
          .notes-value {
            color: #333;
            font-weight: 500;
          }
          
          .footer-bottom {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding-top: 6px;
          }
          
          .return-hub {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .hub-indicator {
            background: #333;
            color: #fff;
            width: 20px;
            height: 20px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
          }
          
          .return-hub-name {
            font-size: 10px;
            font-weight: bold;
            direction: ltr;
          }
          
          .return-address {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 9px;
            padding: 0 10px;
          }
          
          .return-label {
            color: #666;
            white-space: nowrap;
          }
          
          .return-text {
            color: #333;
          }
          
          .order-ref-section {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            direction: ltr;
          }
          
          .barcode-small-img {
            width: 100px;
            height: 30px;
            object-fit: contain;
          }
          
          .ref-numbers {
            display: flex;
            gap: 3px;
            font-size: 9px;
            font-weight: bold;
          }
          
          .ref-text {
            font-size: 8px;
            color: #666;
          }
          
          .ref-id {
            font-size: 8px;
            font-weight: bold;
            color: #333;
          }
          
          .created-date {
            text-align: center;
            font-size: 9px;
            color: #666;
            margin-top: 4px;
            direction: ltr;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            .label-container {
              height: calc(297mm - 10mm);
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
      </html>
    `);

    printWindow.document.close();
    
    // Wait for content and QR codes to load then print
    setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  const handleSendToBosta = async (order: Order) => {
    if (!bostaConfig?.apiKey) {
      alert('Bosta API key is not configured. Please configure it in Settings > Integrations > Shipping.');
      return;
    }

    try {
      setSendingToBosta(order.id);
      
      const result = await createBostaDelivery(
        {
          apiKey: bostaConfig.apiKey,
          businessId: bostaConfig.businessId,
          countryId: bostaConfig.countryId,
          testMode: bostaConfig.testMode,
          defaultPickupLocationId: bostaConfig.defaultPickupLocationId
        },
        {
          id: order.id,
          customerName: order.customerName,
          customerContact: order.customerContact,
          customerEmail: order.customerEmail,
          total: order.total,
          codAmount: order.codAmount, // Use pre-calculated COD amount
          shippingFees: order.shippingFees,
          allowOpenPackage: order.allowOpenPackage,
          paymentStatus: order.paymentStatus,
          notes: order.notes,
          shippingAddress: order.shippingAddress,
          items: order.items
        }
      );

      if (result.success) {
        alert(`✅ Order sent to Bosta successfully!\n\nTracking Number: ${result.data?.trackingNumber || 'N/A'}`);
        // Optionally update order with tracking info
        if (result.data?.trackingNumber) {
          await updateOrder({
            orderId: order.id,
            payload: {
              bostaTrackingNumber: result.data.trackingNumber,
              bostaDeliveryId: result.data._id,
              shippingProvider: 'bosta',
              status: 'ready_for_pickup'
            }
          });
        }
      }
    } catch (error: any) {
      console.error('[OrdersPage] Error sending to Bosta:', error);
      
      const errorMsg = error.message || 'Unknown error';
      
      // Check if it's an API key error
      const isApiKeyError = errorMsg.includes('API key') || 
                            errorMsg.includes('authorization') ||
                            errorMsg.includes('401') ||
                            errorMsg.includes('Unauthorized');
      
      // Check if it's a CORS or network error
      const isCorsError = errorMsg.includes('CORS') || 
                          errorMsg.includes('NetworkError') ||
                          errorMsg.includes('Failed to fetch');
      
      if (isApiKeyError) {
        // Offer to copy order data for manual entry
        const shouldCopy = window.confirm(
          `❌ API Key Error\n\n` +
          `Your Bosta API key appears to be invalid.\n\n` +
          `To fix this:\n` +
          `1. Go to Settings → Shipping → Bosta\n` +
          `2. Get a new API key from your Bosta dashboard (app.bosta.co)\n` +
          `3. Use the "Test Key" button to verify it works\n\n` +
          `Would you like to copy the order data to clipboard?\n` +
          `You can create the delivery manually in Bosta's dashboard.`
        );
        
        if (shouldCopy) {
          copyOrderDataForBosta(order);
        }
      } else if (isCorsError) {
        // Offer to copy order data instead
        const shouldCopy = window.confirm(
          `❌ Connection Error\n\n` +
          `Direct API call failed (likely due to browser security restrictions).\n\n` +
          `Would you like to copy the order data to clipboard instead?\n` +
          `You can then paste it in the Bosta dashboard to create the delivery manually.`
        );
        
        if (shouldCopy) {
          copyOrderDataForBosta(order);
        }
      } else {
        alert(`❌ Failed to send order to Bosta.\n\n${errorMsg}`);
      }
    } finally {
      setSendingToBosta(null);
    }
  };

  const copyOrderDataForBosta = (order: Order) => {
    const nameParts = (order.customerName || 'Customer').split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const bostaData = {
      receiver: {
        firstName,
        lastName,
        phone: order.customerContact || '',
        email: order.customerEmail || ''
      },
      dropOffAddress: {
        firstLine: order.shippingAddress?.address || '',
        city: order.shippingAddress?.city || '',
        district: order.shippingAddress?.district || '',
        floor: order.shippingAddress?.floor || '',
        apartment: order.shippingAddress?.apartment || ''
      },
      cod: order.total || 0,
      notes: `Order #${order.id.slice(-6)} - ${order.notes || 'No notes'}`,
      itemsCount: order.items?.reduce((sum, item) => sum + item.quantity, 0) || 1,
      businessReference: order.id
    };

    const formattedText = `
📦 BOSTA ORDER DATA
==================
Order ID: #${order.id.slice(-6)}

👤 RECEIVER:
• Name: ${firstName} ${lastName}
• Phone: ${order.customerContact || 'N/A'}
• Email: ${order.customerEmail || 'N/A'}

📍 ADDRESS:
• Address: ${order.shippingAddress?.address || 'N/A'}
• City: ${order.shippingAddress?.city || 'N/A'}
• District: ${order.shippingAddress?.district || 'N/A'}
• Floor: ${order.shippingAddress?.floor || 'N/A'}
• Apartment: ${order.shippingAddress?.apartment || 'N/A'}

💰 COD Amount: ${order.total || 0}

📝 Notes: ${order.notes || 'None'}

📋 JSON Format:
${JSON.stringify(bostaData, null, 2)}
    `.trim();

    navigator.clipboard.writeText(formattedText).then(() => {
      alert('✅ Order data copied to clipboard!\n\nYou can now paste this in the Bosta dashboard or share it with your team.');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = formattedText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Order data copied to clipboard!');
    });
  };

  const openBostaModal = (order: Order) => {
    setSelectedOrderForBosta(order);
    setBostaModalOpen(true);
  };

  const findProductByBarcode = (barcode: string) => {
    for (const product of products) {
      if (product.barcode && product.barcode.toLowerCase() === barcode.toLowerCase()) {
        return { product, variant: null as string | null };
      }
      for (const [size, sizeBarcode] of Object.entries(product.sizeBarcodes ?? {})) {
        if (sizeBarcode && sizeBarcode.toLowerCase() === barcode.toLowerCase()) {
          return { product, variant: size };
        }
      }
    }
    return null;
  };

  const updateProductStock = async (product: Product, variant: string | null, delta: number) => {
    const currentStockMap = { ...(product.stock ?? {}) };
    const locationStockMap = { ...(product.stockByLocation ?? {}) };
    const existingSizeBarcodes = { ...(product.sizeBarcodes ?? {}) };
    
    if (variant) {
      const current = currentStockMap[variant] ?? 0;
      const next = current + delta;
      if (next < 0) {
        throw new Error(`Cannot adjust stock below zero for variant ${variant}.`);
      }
      currentStockMap[variant] = next;
      await updateProduct({
        productId: product.id,
        payload: {
          stock: currentStockMap,
          sizeBarcodes: existingSizeBarcodes
        }
      });
      return currentStockMap[variant];
    }

    if (Object.keys(currentStockMap).length > 0) {
      const firstKey = Object.keys(currentStockMap)[0];
      const current = currentStockMap[firstKey] ?? 0;
      const next = current + delta;
      if (next < 0) {
        throw new Error('Cannot adjust stock below zero.');
      }
      currentStockMap[firstKey] = next;
      await updateProduct({
        productId: product.id,
        payload: {
          stock: currentStockMap,
          sizeBarcodes: existingSizeBarcodes
        }
      });
      return currentStockMap[firstKey];
    }

    if (Object.keys(locationStockMap).length > 0) {
      const firstLocation = Object.keys(locationStockMap)[0];
      const current = locationStockMap[firstLocation] ?? 0;
      const next = current + delta;
      if (next < 0) {
        throw new Error('Cannot adjust stock below zero.');
      }
      locationStockMap[firstLocation] = next;
      await updateProduct({
        productId: product.id,
        payload: {
          stockByLocation: locationStockMap
        }
      });
      return locationStockMap[firstLocation];
    }

    const fallbackKey = 'default';
    const next = (currentStockMap[fallbackKey] ?? 0) + delta;
    if (next < 0) {
      throw new Error('Cannot adjust stock below zero.');
    }
    currentStockMap[fallbackKey] = next;
    await updateProduct({
      productId: product.id,
      payload: {
        stock: currentStockMap,
        sizeBarcodes: existingSizeBarcodes
      }
    });
    return currentStockMap[fallbackKey];
  };

  const handleScan = async (barcode: string, mode: 'order' | 'return') => {
    if (!businessId) {
      throw new Error('Business context not available.');
    }
    const match = findProductByBarcode(barcode);
    if (!match) {
      throw new Error(`Product not found for barcode ${barcode}`);
    }

    const { product, variant } = match;
    const stockMap = product.stock ?? {};
    const currentStock = variant
      ? stockMap[variant] ?? 0
      : Object.values(stockMap)[0] ?? 0;
    // Order decreases stock (selling), Return increases stock (restocking)
    const delta = mode === 'order' ? -1 : 1;

    if (mode === 'order' && currentStock <= 0) {
      throw new Error(`${product.name} is out of stock.`);
    }

    setScanning(true);
    try {
      const newStock = await updateProductStock(product, variant, delta);
      await createScanLog(businessId, {
        barcode,
        productId: product.id,
        productName: product.name,
        size: variant,
        type: mode,
        previousStock: currentStock,
        newStock,
        price: product.price,
        timestamp: new Date(),
        user: user?.email ?? null,
        userId: user?.uid ?? null
      });
      // Invalidate scan logs query to update stats
      await queryClient.invalidateQueries({ queryKey: ['scanLogs', businessId] });
      
      // Set scan result for success modal
      setScanResult({
        productName: product.name,
        type: mode,
        previousStock: currentStock,
        newStock,
        price: product.price,
        size: variant
      });
    } finally {
      setScanning(false);
    }
  };

  if (loading || loadingProducts) {
    return <FullScreenLoader message="Loading orders..." />;
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Orders</h1>
          <p className="text-sm text-madas-text/70">
            Monitor sales progress, status, and fulfilment activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text transition-colors hover:bg-base"
            onClick={() => setScanModalOpen(true)}
          >
            <span className="material-icons text-base text-current">qr_code_scanner</span>
            Scan barcode
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text transition-colors hover:bg-base"
            onClick={() => navigate('/orders/scan-log')}
          >
            <span className="material-icons text-base text-current">history</span>
            Scan Log
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
            onClick={openCreateModal}
            disabled={!canEdit}
          >
            <span className="material-icons text-base">add</span>
            Add order
          </button>
        </div>
      </header>

      <OrderStats
        total={stats.total}
        pending={stats.pending}
        processing={stats.processing}
        completed={stats.completed}
        cancelled={stats.cancelled}
        revenue={stats.revenue}
      />

      <section className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-base/40 px-4 py-3 text-sm text-madas-text/70 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <span className="material-icons text-madas-text/60">search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by order, customer, product, size..."
              className="w-64 bg-transparent text-xs text-madas-text focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Filter by date"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedOrders.size > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-xs text-primary font-medium transition-colors hover:bg-primary/20"
              >
                <span className="material-icons text-sm">checklist</span>
                {selectedOrders.size} Selected
                <span className="material-icons text-sm">{showMoreOptions ? 'expand_less' : 'expand_more'}</span>
              </button>
              {showMoreOptions && (
                <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                  <div className="px-3 py-2 text-xs font-medium text-madas-text/60 border-b border-gray-100">
                    Bulk Actions ({selectedOrders.size} orders)
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      // Mark selected as completed
                      for (const orderId of selectedOrders) {
                        await updateOrder({ orderId, payload: { status: 'completed' } });
                      }
                      setSelectedOrders(new Set());
                      setShowMoreOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-madas-text hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-icons text-sm text-green-600">check_circle</span>
                    Mark as Completed
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      // Mark selected as cancelled
                      for (const orderId of selectedOrders) {
                        await updateOrder({ orderId, payload: { status: 'cancelled' } });
                      }
                      setSelectedOrders(new Set());
                      setShowMoreOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-madas-text hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-icons text-sm text-red-600">cancel</span>
                    Mark as Cancelled
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button
                    type="button"
                    onClick={() => {
                      // Export selected orders
                      const selectedOrdersList = filteredOrders.filter(o => selectedOrders.has(o.id));
                      const dataStr = JSON.stringify(selectedOrdersList, null, 2);
                      const blob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `orders-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      setShowMoreOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-madas-text hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-icons text-sm">download</span>
                    Export Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                      setShowMoreOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-madas-text hover:bg-gray-50 transition-colors"
                  >
                    <span className="material-icons text-sm">print</span>
                    Print Selected
                  </button>
                  {isBostaEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        const selectedOrdersList = filteredOrders.filter(o => selectedOrders.has(o.id));
                        printBostaShippingLabels(selectedOrdersList);
                        setShowMoreOptions(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-madas-text hover:bg-gray-50 transition-colors"
                    >
                      <BostaLogoSmall />
                      <span>Print Shipping Labels</span>
                    </button>
                  )}
                  <hr className="my-1 border-gray-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrders(new Set());
                      setShowMoreOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span className="material-icons text-sm">deselect</span>
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-madas-text transition-colors hover:bg-base"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setStartDate('');
              setEndDate('');
            }}
          >
            <span className="material-icons text-sm">close</span>
            Clear filters
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center text-madas-text/70">
            <span className="material-icons animate-spin text-3xl text-primary">progress_activity</span>
            <p>Loading orders…</p>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <span className="material-icons text-5xl text-madas-text/30">receipt_long</span>
          <div>
            <h3 className="text-lg font-semibold text-primary">No orders to show</h3>
            <p className="text-sm text-madas-text/60">
              Adjust your filters or create an order to get started.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
            onClick={openCreateModal}
            disabled={!canEdit}
          >
            <span className="material-icons text-base">add</span>
            Add order
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
                        } else {
                          setSelectedOrders(new Set());
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Courier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const statusStyles: Record<OrderStatus, string> = {
                    pending: 'bg-orange-100 text-orange-600',
                    ready_for_pickup: 'bg-purple-100 text-purple-600',
                    processing: 'bg-sky-100 text-sky-600',
                    completed: 'bg-green-100 text-green-600',
                    cancelled: 'bg-red-100 text-red-600'
                  };
                  const dateLabel = formatOrderDate(order.date ?? order.createdAt, 'MMM d, yyyy');
                  return (
                    <tr key={order.id} className={clsx("transition-colors hover:bg-base/60", selectedOrders.has(order.id) && "bg-primary/5")}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedOrders);
                            if (e.target.checked) {
                              newSelected.add(order.id);
                            } else {
                              newSelected.delete(order.id);
                            }
                            setSelectedOrders(newSelected);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        #{order.id.slice(-6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/80">
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">{order.customerName || 'N/A'}</span>
                          <span className="text-xs text-madas-text/50">{order.customerContact || order.customerEmail || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                        {order.productCount ?? 0} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {formatCurrency(order.total ?? 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize', statusStyles[order.status])}>
                          <span className="material-icons text-xs">
                            {order.status === 'completed'
                              ? 'check_circle'
                              : order.status === 'ready_for_pickup'
                                ? 'local_shipping'
                                : order.status === 'processing'
                                  ? 'sync_alt'
                                  : order.status === 'pending'
                                    ? 'hourglass_bottom'
                                    : 'cancel'}
                          </span>
                          {order.status === 'ready_for_pickup' ? 'Ready for Pickup' : order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.bostaTrackingNumber ? (
                          <button
                            type="button"
                            onClick={() => setCourierDetailModal(order)}
                            className="flex flex-col gap-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <span className={clsx(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                              order.bostaStatusValue === 45 ? 'bg-green-100 text-green-700' :
                              order.bostaStatusValue === 47 || order.bostaStatusValue === 46 || order.bostaStatusValue === 48 ? 'bg-red-100 text-red-700' :
                              order.bostaStatusValue === 24 ? 'bg-blue-100 text-blue-700' :
                              order.bostaStatusValue && order.bostaStatusValue >= 20 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            )}>
                              <BostaLogoSmall />
                              {order.bostaStatusLabel || order.bostaStatus || 'Pending'}
                            </span>
                            <span className="text-[10px] text-madas-text/50 flex items-center gap-1">
                              #{order.bostaTrackingNumber.slice(-8)}
                              <span className="material-icons text-[10px]">open_in_new</span>
                            </span>
                          </button>
                        ) : order.shippingAddress?.address ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            <span className="material-icons text-xs">local_shipping</span>
                            Not sent
                          </span>
                        ) : (
                          <span className="text-xs text-madas-text/40">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">{dateLabel}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-madas-text transition-colors hover:bg-base"
                            onClick={() => openEditModal(order)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-madas-text transition-colors hover:bg-base disabled:opacity-60"
                            onClick={() => openEditModal(order)}
                            disabled={!canEdit}
                          >
                            Edit
                          </button>
                          {isBostaEnabled && order.status !== 'cancelled' && !order.bostaTrackingNumber && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
                              onClick={() => openBostaModal(order)}
                              disabled={sendingToBosta === order.id}
                              title="Send to Bosta"
                            >
                              <BostaLogoSmall />
                              {sendingToBosta === order.id ? 'Sending...' : 'Bosta'}
                            </button>
                          )}
                          {order.bostaTrackingNumber && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 border border-green-200 px-2 py-1 text-xs text-green-700">
                              <BostaLogoSmall />
                              {order.bostaTrackingNumber.slice(-8)}
                            </span>
                          )}
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                            onClick={() => handleDelete(order.id)}
                            disabled={!canEdit || deleting}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OrderModal
        open={orderModalOpen}
        onClose={() => {
          setOrderModalOpen(false);
          setEditingOrder(null);
        }}
        onSubmit={handleSubmit}
        onDelete={
          editingOrder
            ? async () => {
                await handleDelete(editingOrder.id);
                setOrderModalOpen(false);
                setEditingOrder(null);
              }
            : undefined
        }
        submitting={creating || updating}
        deleting={deleting}
        initialValue={editingOrder ?? undefined}
        products={products.map(p => {
          // Calculate total stock from stock or stockByLocation
          const stockFromVariants = p.stock ? Object.values(p.stock).reduce((a, b) => a + b, 0) : 0;
          const stockFromLocations = p.stockByLocation ? Object.values(p.stockByLocation).reduce((a, b) => a + b, 0) : 0;
          const totalStock = stockFromVariants || stockFromLocations;
          
          return {
            id: p.id,
            name: p.name,
            price: p.price ?? 0,
            sellingPrice: p.sellingPrice,
            sku: p.sku,
            barcode: p.barcode,
            stock: p.stock,
            totalStock
          };
        })}
        customers={customers.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          addressDetails: c.addressDetails
        }))}
      />

      <ScanBarcodeModal
        open={scanModalOpen}
        onClose={() => {
          setScanModalOpen(false);
          setScanResult(null);
        }}
        onScan={handleScan}
        submitting={scanning || updatingProduct}
      />

      <ScanSuccessModal
        open={scanResult !== null}
        onClose={() => setScanResult(null)}
        result={scanResult}
      />

      {/* Bosta Send Confirmation Modal */}
      {bostaModalOpen && selectedOrderForBosta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32.6634 8.83273L17.7948 0.266462C17.2016 -0.0888208 16.4503 -0.0888208 15.8572 0.266462L0.9886 8.83273C0.39544 9.18801 0 9.81962 0 10.5302V23.0835C0 23.7941 0.355896 24.4257 0.9886 24.781L15.8572 33.3473C16.1735 33.5052 16.4899 33.6236 16.8458 33.6236C17.2016 33.6236 17.518 33.5447 17.8344 33.3473L32.7029 24.781C33.2961 24.4257 33.6915 23.7941 33.6915 23.0835V10.5302C33.6519 9.81962 33.2565 9.18801 32.6634 8.83273ZM30.2116 19.9649L24.715 16.8069L30.2116 13.6488V19.9649ZM16.8458 3.66139L28.7485 10.5302L16.8458 17.399L4.90345 10.5302L16.8458 3.66139ZM3.44032 13.6093L8.93695 16.7674L3.44032 19.9255V13.6093ZM16.8458 29.9129L4.90345 23.0441L12.3377 18.7412L15.8176 20.7545C16.134 20.9124 16.4503 21.0308 16.8062 21.0308C17.1621 21.0308 17.4785 20.9518 17.7948 20.7545L21.2747 18.7412L28.709 23.0441L16.8458 29.9129Z" fill="#E30613"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">Send to Bosta</h3>
                <p className="text-sm text-madas-text/60">Create delivery for this order</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-madas-text/60">Order ID:</span>
                  <span className="font-medium text-primary">#{selectedOrderForBosta.id.slice(-6)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-madas-text/60">Customer:</span>
                  <span className="font-medium">{selectedOrderForBosta.customerName || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-madas-text/60">Phone:</span>
                  <span className="font-medium">{selectedOrderForBosta.customerContact || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-madas-text/60">Total (COD):</span>
                  <span className="font-semibold text-primary">{formatCurrency(selectedOrderForBosta.total ?? 0)}</span>
                </div>
                {selectedOrderForBosta.shippingAddress?.address && (
                  <div className="flex justify-between text-sm">
                    <span className="text-madas-text/60">Address:</span>
                    <span className="font-medium text-right max-w-[200px]">{selectedOrderForBosta.shippingAddress.address}</span>
                  </div>
                )}
              </div>
              
              {!selectedOrderForBosta.customerContact && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                  <span className="material-icons text-sm align-middle mr-1">warning</span>
                  Customer phone number is missing. Bosta requires a phone number for delivery.
                </div>
              )}
              
              {bostaConfig?.testMode && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                  <span className="material-icons text-sm align-middle mr-1">info</span>
                  Test mode is enabled. This will create a sandbox delivery.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBostaModalOpen(false);
                    setSelectedOrderForBosta(null);
                  }}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text hover:bg-base transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSendToBosta(selectedOrderForBosta);
                    setBostaModalOpen(false);
                    setSelectedOrderForBosta(null);
                  }}
                  disabled={sendingToBosta === selectedOrderForBosta.id || !selectedOrderForBosta.customerContact}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {sendingToBosta === selectedOrderForBosta.id ? (
                    <>
                      <span className="material-icons animate-spin text-base">progress_activity</span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-base">local_shipping</span>
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courier Detail Modal */}
      {courierDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <BostaLogoSmall />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Courier Status</h3>
                    <p className="text-xs text-white/80">Order #{courierDetailModal.id.slice(-6)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCourierDetailModal(null)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Tracking Number */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-madas-text/60">Tracking Number</p>
                  <p className="font-mono font-medium text-primary">{courierDetailModal.bostaTrackingNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(courierDetailModal.bostaTrackingNumber || '');
                    alert('Tracking number copied!');
                  }}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <span className="material-icons text-madas-text/60">content_copy</span>
                </button>
              </div>

              {/* Current Status */}
              <div className="p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-madas-text/60 mb-2">Current Status</p>
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    courierDetailModal.bostaStatusValue === 45 ? 'bg-green-100' :
                    courierDetailModal.bostaStatusValue === 47 || courierDetailModal.bostaStatusValue === 46 ? 'bg-red-100' :
                    courierDetailModal.bostaStatusValue === 24 ? 'bg-blue-100' :
                    'bg-yellow-100'
                  )}>
                    <span className={clsx(
                      'material-icons',
                      courierDetailModal.bostaStatusValue === 45 ? 'text-green-600' :
                      courierDetailModal.bostaStatusValue === 47 || courierDetailModal.bostaStatusValue === 46 ? 'text-red-600' :
                      courierDetailModal.bostaStatusValue === 24 ? 'text-blue-600' :
                      'text-yellow-600'
                    )}>
                      {courierDetailModal.bostaStatusValue === 45 ? 'check_circle' :
                       courierDetailModal.bostaStatusValue === 47 || courierDetailModal.bostaStatusValue === 46 ? 'cancel' :
                       courierDetailModal.bostaStatusValue === 24 ? 'local_shipping' :
                       courierDetailModal.bostaStatusValue === 21 ? 'inventory' :
                       courierDetailModal.bostaStatusValue === 22 ? 'route' :
                       'pending'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-primary">
                      {courierDetailModal.bostaStatusLabel || courierDetailModal.bostaStatus || 'Pending'}
                    </p>
                    <p className="text-xs text-madas-text/60">
                      Status Code: {courierDetailModal.bostaStatusValue || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-xs text-madas-text/60 mb-2">Delivery To</p>
                <p className="font-medium text-primary">{courierDetailModal.customerName}</p>
                <p className="text-sm text-madas-text/70">{courierDetailModal.customerContact}</p>
                {courierDetailModal.shippingAddress?.address && (
                  <p className="text-sm text-madas-text/60 mt-1">
                    {courierDetailModal.shippingAddress.address}
                    {courierDetailModal.shippingAddress.city && `, ${courierDetailModal.shippingAddress.city}`}
                  </p>
                )}
              </div>

              {/* Timeline */}
              {courierDetailModal.bostaTimeline && courierDetailModal.bostaTimeline.length > 0 && (
                <div className="p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-madas-text/60 mb-3">Delivery Timeline</p>
                  <div className="space-y-3">
                    {courierDetailModal.bostaTimeline.map((event, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-primary" />
                        <div>
                          <p className="text-sm font-medium text-primary">
                            {event.state?.code || 'Status Update'}
                          </p>
                          {event.timestamp && (
                            <p className="text-xs text-madas-text/50">
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          )}
                          {event.note && (
                            <p className="text-xs text-madas-text/60 mt-0.5">{event.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Track on Bosta */}
              <a
                href={`https://bosta.co/tracking/${courierDetailModal.bostaTrackingNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              >
                <span className="material-icons text-base">open_in_new</span>
                Track on Bosta Website
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;

