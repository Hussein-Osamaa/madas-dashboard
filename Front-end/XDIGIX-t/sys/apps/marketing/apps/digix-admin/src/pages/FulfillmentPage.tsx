/**
 * Fulfillment Management Page
 * Manage order fulfillment across all client businesses
 */

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import PermissionGuard from '../components/rbac/PermissionGuard';
import { useRBAC } from '../contexts/RBACContext';
import { collection, db, getDocs, doc, updateDoc, query, where, orderBy, addDoc, serverTimestamp, getDoc } from '../lib/firebase';
import type { Order } from '@shared/types';
import {
  Package,
  Search,
  Filter,
  Truck,
  CheckCircle,
  Clock,
  X,
  Eye,
  Edit2,
  Save,
  MapPin,
  Calendar,
  Building2,
  User,
  DollarSign,
  FileText,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Scan,
  ScanLine,
  History
} from 'lucide-react';

type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type FulfillmentType = 'pickup' | 'delivery' | 'shipping';

export default function FulfillmentPage() {
  const { user: rbacUser } = useRBAC();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debug: Log RBAC user info
  useEffect(() => {
    console.log('[FulfillmentPage] RBAC User:', {
      type: rbacUser?.type,
      email: rbacUser?.email,
      role_id: rbacUser?.role_id
    });
  }, [rbacUser]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showScanLogs, setShowScanLogs] = useState(false);
  const [scanLogs, setScanLogs] = useState<any[]>([]);
  const [scanType, setScanType] = useState<'order' | 'return' | 'damaged'>('order');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanBusinessId, setScanBusinessId] = useState<string | null>(null); // Business ID for scanning
  const [scanOrderId, setScanOrderId] = useState<string | null>(null); // Order ID for scanning (to track scanned items)
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set()); // Track scanned item IDs/indexes
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetectedBarcodeRef = useRef<string>('');
  const autoScanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrCodeContainerRef = useRef<HTMLDivElement>(null);
  const [containerReady, setContainerReady] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: 'pending' as FulfillmentStatus,
    trackingNumber: '',
    notes: ''
  });

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (showScanLogs) {
      loadScanLogs();
    }
  }, [showScanLogs]);

  // Camera handling - automatically start when modal opens
  useEffect(() => {
    if (!showScanModal) {
      stopCamera();
      setContainerReady(false);
      return;
    }
    
    // When modal opens, wait for React to render, then start camera
    // Use requestAnimationFrame to ensure DOM is ready
    const startCameraWhenReady = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Double RAF ensures React has finished rendering
          const element = qrCodeContainerRef.current || document.getElementById('html5qr-code-full-region');
          if (element && element.isConnected) {
            setContainerReady(true);
            // Small delay then start camera
            setTimeout(() => {
              startCamera();
            }, 200);
          } else {
            // Element not ready yet, try again
            setTimeout(startCameraWhenReady, 100);
          }
        });
      });
    };
    
    // Wait a bit for modal to fully render
    const timer = setTimeout(startCameraWhenReady, 500);
    
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [showScanModal]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      
      // Try using html5-qrcode library first (more compatible)
      const qrCodeId = 'html5qr-code-full-region';
      
      // Use ref directly - it should be set by the callback ref
      let container = qrCodeContainerRef.current;
      
      // If ref doesn't have it, try by ID
      if (!container) {
        container = document.getElementById(qrCodeId);
      }
      
      // Wait for the element to exist in the DOM (React needs time to render it)
      let attempts = 0;
      const maxAttempts = 30; // Increase attempts even more
      while (!container && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        container = qrCodeContainerRef.current || document.getElementById(qrCodeId);
        attempts++;
      }
      
      if (!container) {
        console.error('[FulfillmentPage] Element not found after', maxAttempts, 'attempts');
        console.error('[FulfillmentPage] Available elements with id:', document.querySelectorAll('[id]'));
        console.error('[FulfillmentPage] Ref value:', qrCodeContainerRef.current);
        console.error('[FulfillmentPage] showScanModal:', showScanModal);
        console.error('[FulfillmentPage] containerReady:', containerReady);
        throw new Error('Camera container element not found. Please try again.');
      }
      
      // Ensure the container has an ID (required by html5-qrcode)
      if (!container.id || container.id !== qrCodeId) {
        container.id = qrCodeId;
      }
      
      console.log('[FulfillmentPage] Found container element:', container.id, container);
      console.log('[FulfillmentPage] Container parent:', container.parentElement);
      console.log('[FulfillmentPage] Container isConnected:', container.isConnected);
      
      // Wait for element to be connected to DOM
      let connectionAttempts = 0;
      while (!container.isConnected && connectionAttempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        container = qrCodeContainerRef.current || document.getElementById(qrCodeId);
        connectionAttempts++;
      }
      
      // Verify element is actually in the DOM
      if (!container || !container.isConnected) {
        console.error('[FulfillmentPage] Container still not connected after waiting');
        console.error('[FulfillmentPage] Container:', container);
        console.error('[FulfillmentPage] Parent:', container?.parentElement);
        throw new Error('Container element is not connected to DOM after waiting');
      }
      
      // Wait and verify element is findable by getElementById (required by Html5Qrcode)
      // The library internally uses getElementById, so we must ensure it's findable
      let verifyElement = document.getElementById(qrCodeId);
      let verifyAttempts = 0;
      while (!verifyElement && verifyAttempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        verifyElement = document.getElementById(qrCodeId);
        verifyAttempts++;
      }
      
      if (!verifyElement) {
        console.error('[FulfillmentPage] Element not findable by getElementById after verification');
        console.error('[FulfillmentPage] Trying querySelector:', document.querySelector(`#${qrCodeId}`));
        console.error('[FulfillmentPage] All elements with that ID:', document.querySelectorAll(`#${qrCodeId}`));
        throw new Error('Element with ID not findable in document by getElementById');
      }
      
      console.log('[FulfillmentPage] Verified element is findable by ID:', verifyElement === container);
      
      // Make sure element is visible before initializing (html5-qrcode needs it visible)
      if (container.style.visibility === 'hidden') {
        container.style.visibility = 'visible';
      }
      if (container.parentElement) {
        const parent = container.parentElement as HTMLElement;
        if (parent.style.visibility === 'hidden') {
          parent.style.visibility = 'visible';
        }
        if (parent.style.opacity === '0') {
          parent.style.opacity = '1';
        }
      }
      
      // Additional small delay to ensure DOM is fully ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('[FulfillmentPage] Initializing Html5Qrcode with element:', container.id, 'isConnected:', container.isConnected);
      
      const html5QrCode = new Html5Qrcode(qrCodeId);
      html5QrCodeRef.current = html5QrCode;
      
      // Calculate qrbox size based on container dimensions
      const containerWidth = container.clientWidth || 300;
      const containerHeight = container.clientHeight || 256;
      // Use 80% of the smaller dimension to ensure it fits well
      const qrboxSize = Math.min(containerWidth, containerHeight) * 0.8;
      
      await html5QrCode.start(
        {
          facingMode: 'environment' // Use back camera on mobile
        },
        {
          fps: 10, // Frames per second
          qrbox: { width: qrboxSize, height: qrboxSize }, // Scanning area - fits container
          aspectRatio: 1.0,
          disableFlip: false // Allow camera to flip if needed
        },
        (decodedText) => {
          // Success callback
          if (decodedText && decodedText !== lastDetectedBarcodeRef.current) {
            lastDetectedBarcodeRef.current = decodedText;
            setBarcodeInput(decodedText);
            
            // Clear any existing auto-scan timeout
            if (autoScanTimeoutRef.current) {
              clearTimeout(autoScanTimeoutRef.current);
            }
            
            // Auto-process after 1.5 seconds
            autoScanTimeoutRef.current = setTimeout(() => {
              const inputElement = document.querySelector('[data-barcode-input]') as HTMLInputElement;
              if (inputElement && inputElement.value === decodedText) {
                const scanButton = document.querySelector('[data-scan-button]') as HTMLButtonElement;
                if (scanButton && !scanButton.disabled) {
                  scanButton.click();
                }
              }
            }, 1500);
          }
        },
        (errorMessage) => {
          // Error callback - ignore scanning errors, they're normal
        }
      );
      
    } catch (error) {
      console.error('[FulfillmentPage] Camera error:', error);
      setCameraError('Failed to access camera. Please allow camera permissions or enter barcode manually.');
      
      // Clean up on error
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().catch(() => {});
        } catch (e) {}
        html5QrCodeRef.current = null;
      }
    }
  };

  const stopCamera = async () => {
    // Stop html5-qrcode scanner
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (error) {
        console.warn('[FulfillmentPage] Error stopping html5-qrcode:', error);
      }
      html5QrCodeRef.current = null;
    }
    
    // Remove html5-qrcode container
    const qrCodeContainer = document.getElementById('html5qr-code-full-region');
    if (qrCodeContainer) {
      qrCodeContainer.remove();
    }
    
    // Clean up old stream-based approach (fallback)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (autoScanTimeoutRef.current) {
      clearTimeout(autoScanTimeoutRef.current);
      autoScanTimeoutRef.current = null;
    }
    lastDetectedBarcodeRef.current = '';
  };

  // Removed startBarcodeDetection - now using html5-qrcode library directly

  const loadOrders = async () => {
    try {
      setLoading(true);
      const allOrders: any[] = [];

      // Get all businesses
      const businessesSnapshot = await getDocs(collection(db, 'businesses'));
      console.log(`[FulfillmentPage] Found ${businessesSnapshot.docs.length} businesses`);
      
      // Load orders from each business that has fulfillment service subscription
      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;
        const businessData = businessDoc.data();
        
        // Check if business has fulfillment service subscription
        const features = businessData.features || {};
        const hasFulfillmentService = 
          features.fulfillment === true || 
          features.fulfillment_service === true ||
          features.fulfillmentService === true;
        
        console.log(`[FulfillmentPage] Business ${businessId} (${businessData.businessName || businessData.name}):`, {
          features,
          hasFulfillmentService,
          'features.fulfillment': features.fulfillment,
          'features.fulfillment_service': features.fulfillment_service,
          'features.fulfillmentService': features.fulfillmentService,
          'fullFeaturesObject': JSON.stringify(features, null, 2)
        });
        
        // TEMPORARY: Check orders even if fulfillment service is not enabled (for debugging)
        // This will help us see if orders exist but feature check is failing
        let shouldLoadOrders = hasFulfillmentService;
        
        if (!hasFulfillmentService) {
          console.log(`[FulfillmentPage] Business ${businessId} does NOT have fulfillment service enabled`);
          console.log(`[FulfillmentPage] Features object:`, features);
          console.log(`[FulfillmentPage] Checking orders anyway for debugging...`);
          // For now, let's check if there are any orders at all
          try {
            const testOrdersRef = collection(db, 'businesses', businessId, 'orders');
            const testSnapshot = await getDocs(testOrdersRef);
            console.log(`[FulfillmentPage] Business ${businessId} has ${testSnapshot.docs.length} orders (but fulfillment service is disabled)`);
            if (testSnapshot.docs.length > 0) {
              console.warn(`[FulfillmentPage] ⚠️ WARNING: Business ${businessId} has ${testSnapshot.docs.length} orders but fulfillment service is NOT enabled!`);
              console.warn(`[FulfillmentPage] Enable fulfillment service in Admin → Clients → [Business Name] → Business Features`);
            }
          } catch (testError) {
            console.error(`[FulfillmentPage] Error checking orders for business ${businessId}:`, testError);
          }
        }
        
        // Only process orders from businesses with fulfillment service
        if (!shouldLoadOrders) {
          console.log(`[FulfillmentPage] Skipping business ${businessId} - no fulfillment service`);
          continue;
        }
        
        try {
          // Try multiple possible order collection paths
          const possiblePaths = [
            `businesses/${businessId}/orders`,
            `orders`, // Top-level orders collection with businessId field
          ];
          
          let ordersSnapshot: any = null;
          let usedPath = '';
          
          // First, try the subcollection path (most likely)
          const ordersRef = collection(db, 'businesses', businessId, 'orders');
          console.log(`[FulfillmentPage] Attempting to load orders from: businesses/${businessId}/orders`);
          
          try {
            // Try multiple ordering options (dashboard uses 'date', some orders might use 'metadata.createdAt')
            try {
              // First try: orderBy 'date' (what dashboard uses)
              ordersSnapshot = await getDocs(
                query(ordersRef, orderBy('date', 'desc'))
              );
              usedPath = `businesses/${businessId}/orders (with orderBy date)`;
              console.log(`[FulfillmentPage] Successfully queried orders with orderBy('date') for business ${businessId}`);
            } catch (dateOrderError) {
              console.warn(`[FulfillmentPage] Could not order by 'date' for business ${businessId}, trying metadata.createdAt:`, dateOrderError);
              try {
                // Second try: orderBy 'metadata.createdAt'
                ordersSnapshot = await getDocs(
                  query(ordersRef, orderBy('metadata.createdAt', 'desc'))
                );
                usedPath = `businesses/${businessId}/orders (with orderBy metadata.createdAt)`;
                console.log(`[FulfillmentPage] Successfully queried orders with orderBy('metadata.createdAt') for business ${businessId}`);
              } catch (metadataOrderError) {
                // Third try: orderBy 'createdAt'
                console.warn(`[FulfillmentPage] Could not order by 'metadata.createdAt' for business ${businessId}, trying createdAt:`, metadataOrderError);
                try {
                  ordersSnapshot = await getDocs(
                    query(ordersRef, orderBy('createdAt', 'desc'))
                  );
                  usedPath = `businesses/${businessId}/orders (with orderBy createdAt)`;
                  console.log(`[FulfillmentPage] Successfully queried orders with orderBy('createdAt') for business ${businessId}`);
                } catch (createdAtOrderError) {
                  // Final fallback: get all orders without ordering
                  console.warn(`[FulfillmentPage] Could not order by any date field for business ${businessId}, loading without order:`, createdAtOrderError);
                  ordersSnapshot = await getDocs(ordersRef);
                  usedPath = `businesses/${businessId}/orders (without orderBy)`;
                  console.log(`[FulfillmentPage] Successfully loaded orders without orderBy for business ${businessId}`);
                }
              }
            }
          } catch (getDocsError) {
            console.error(`[FulfillmentPage] Error loading orders from businesses/${businessId}/orders:`, getDocsError);
            // Try top-level orders collection with businessId filter
            console.log(`[FulfillmentPage] Trying top-level orders collection with businessId filter...`);
            try {
              const topLevelOrdersRef = collection(db, 'orders');
              ordersSnapshot = await getDocs(
                query(topLevelOrdersRef, where('businessId', '==', businessId))
              );
              usedPath = 'orders (top-level with businessId filter)';
              console.log(`[FulfillmentPage] Found orders in top-level collection for business ${businessId}`);
            } catch (topLevelError) {
              console.error(`[FulfillmentPage] Error loading from top-level orders collection:`, topLevelError);
              throw getDocsError; // Throw original error
            }
          }
          
          console.log(`[FulfillmentPage] Found ${ordersSnapshot.docs.length} orders for business ${businessId} from path: ${usedPath}`);
          
          if (ordersSnapshot.docs.length === 0) {
            console.warn(`[FulfillmentPage] ⚠️ No orders found for business ${businessId} (${businessData.businessName || businessData.name})`);
            console.warn(`[FulfillmentPage] Tried paths: ${possiblePaths.join(', ')}`);
            console.warn(`[FulfillmentPage] This business has fulfillment service enabled but no orders exist in Firestore`);
            console.warn(`[FulfillmentPage] Possible reasons:`);
            console.warn(`[FulfillmentPage] 1. Orders are not saved to Firestore (only in local state)`);
            console.warn(`[FulfillmentPage] 2. Orders are stored in a different collection path`);
            console.warn(`[FulfillmentPage] 3. Orders collection doesn't exist yet`);
          } else {
            console.log(`[FulfillmentPage] ✅ Found ${ordersSnapshot.docs.length} orders for business ${businessId} from ${usedPath}`);
          }
          
          ordersSnapshot.docs.forEach(orderDoc => {
            const orderData = orderDoc.data();
            console.log(`[FulfillmentPage] Processing order ${orderDoc.id} from business ${businessId}:`, {
              orderNumber: orderData.orderNumber || orderData.order_id || orderData.id,
              status: orderData.fulfillment?.status || orderData.status,
              customer: orderData.customer?.name || orderData.customerName,
              fulfillment: orderData.fulfillment,
              allKeys: Object.keys(orderData)
            });
            
            // Ensure order has required fields for fulfillment
            const fulfillmentData = orderData.fulfillment || {
              status: orderData.status === 'pending' ? 'pending' : 
                     orderData.status === 'processing' ? 'processing' :
                     orderData.status === 'shipped' ? 'shipped' :
                     orderData.status === 'delivered' ? 'delivered' :
                     orderData.status === 'cancelled' ? 'cancelled' : 'pending',
              type: orderData.fulfillment?.type || orderData.shippingType || 'delivery',
              trackingNumber: orderData.fulfillment?.trackingNumber || orderData.trackingNumber || null,
              address: orderData.fulfillment?.address || orderData.shippingAddress || orderData.address || '',
              shippedAt: orderData.fulfillment?.shippedAt || orderData.shippedAt || null,
              deliveredAt: orderData.fulfillment?.deliveredAt || orderData.deliveredAt || null
            };
            
            allOrders.push({
              id: orderDoc.id,
              orderId: orderDoc.id,
              orderNumber: orderData.orderNumber || orderData.order_id || orderData.id || `#${orderDoc.id.slice(0, 6)}`,
              businessId,
              businessName: businessData.businessName || businessData.name || 'Unknown Business',
              hasFulfillmentService: true,
              customer: orderData.customer || {
                name: orderData.customerName || 'Unknown',
                email: orderData.customerEmail || '',
                phone: orderData.customerPhone || ''
              },
              fulfillment: fulfillmentData,
              financials: orderData.financials || {
                total: orderData.total || orderData.amount || 0
              },
              metadata: orderData.metadata || {
                createdAt: orderData.createdAt || orderData.created_at || orderData.date || new Date().toISOString(),
                updatedAt: orderData.updatedAt || orderData.updated_at || new Date().toISOString()
              },
              ...orderData
            });
          });
        } catch (error) {
          console.error(`[FulfillmentPage] Could not load orders for business ${businessId}:`, error);
        }
      }
      
      console.log(`[FulfillmentPage] Total orders loaded: ${allOrders.length}`);

      // Sort by creation date (newest first)
      allOrders.sort((a, b) => {
        // Get date values - handle various formats (string, Date object, Timestamp)
        const getDateValue = (order: any): Date => {
          // Try metadata.createdAt first
          let dateValue = order.metadata?.createdAt || order.createdAt || order.created_at || order.date || '';
          
          // If it's a Firestore Timestamp, convert it
          if (dateValue && typeof dateValue.toDate === 'function') {
            return dateValue.toDate();
          }
          
          // If it's already a Date object
          if (dateValue instanceof Date) {
            return dateValue;
          }
          
          // If it's a string, try to parse it
          if (typeof dateValue === 'string' && dateValue.length > 0) {
            const parsed = new Date(dateValue);
            if (!isNaN(parsed.getTime())) {
              return parsed;
            }
          }
          
          // Fallback to current date if no valid date found
          return new Date(0); // Use epoch as fallback for invalid dates
        };
        
        const dateA = getDateValue(a);
        const dateB = getDateValue(b);
        
        // Compare dates (newest first)
        return dateB.getTime() - dateA.getTime();
      });

      setOrders(allOrders);
    } catch (error) {
      console.error('[FulfillmentPage] Error loading orders:', error);
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFulfillment = async () => {
    if (!selectedOrder) return;

    setUpdating(true);
    try {
      const orderRef = doc(db, 'businesses', selectedOrder.businessId, 'orders', selectedOrder.id);
      
      // Map fulfillment status to order status for client Order Tracking
      const getOrderStatus = (fulfillmentStatus: string) => {
        switch (fulfillmentStatus) {
          case 'pending': return 'pending';
          case 'processing': return 'pending';
          case 'ready_for_pickup': return 'ready_for_pickup';
          case 'shipped': return 'processing'; // "In Transit" in Order Tracking
          case 'delivered': return 'completed';
          case 'cancelled': return 'cancelled';
          default: return 'pending';
        }
      };
      
      const updateFields: any = {
        'fulfillment.status': updateData.status,
        // Also update main status so it shows in client Order Tracking page
        'status': getOrderStatus(updateData.status),
        'metadata.updatedAt': new Date().toISOString()
      };

      if (updateData.trackingNumber) {
        updateFields['fulfillment.trackingNumber'] = updateData.trackingNumber;
      }

      if (updateData.status === 'shipped' && !selectedOrder.fulfillment?.shippedAt) {
        updateFields['fulfillment.shippedAt'] = new Date().toISOString();
      }

      if (updateData.status === 'delivered' && !selectedOrder.fulfillment?.deliveredAt) {
        updateFields['fulfillment.deliveredAt'] = new Date().toISOString();
      }

      await updateDoc(orderRef, updateFields);
      
      alert('✅ Fulfillment status updated successfully!');
      setShowUpdateModal(false);
      setSelectedOrder(null);
      await loadOrders();
    } catch (error) {
      console.error('[FulfillmentPage] Error updating fulfillment:', error);
      alert('❌ Failed to update fulfillment status');
    } finally {
      setUpdating(false);
    }
  };

  const loadScanLogs = async () => {
    try {
      setLoading(true);
      const allScanLogs: any[] = [];

      // Get all businesses with fulfillment service
      const businessesSnapshot = await getDocs(collection(db, 'businesses'));
      
      for (const businessDoc of businessesSnapshot.docs) {
        const businessId = businessDoc.id;
        const businessData = businessDoc.data();
        
        const features = businessData.features || {};
        const hasFulfillmentService = 
          features.fulfillment === true || 
          features.fulfillment_service === true ||
          features.fulfillmentService === true;
        
        if (!hasFulfillmentService) continue;
        
        try {
          const scanLogsRef = collection(db, 'businesses', businessId, 'scan_log');
          const scanLogsSnapshot = await getDocs(
            query(scanLogsRef, orderBy('timestamp', 'desc'))
          );
          
          scanLogsSnapshot.docs.forEach(logDoc => {
            const logData = logDoc.data();
            // Only include scan logs from fulfillment page
            if (logData.source === 'fulfillment_page') {
              allScanLogs.push({
                id: logDoc.id,
                businessId,
                businessName: businessData.businessName || businessData.name || 'Unknown Business',
                ...logData
              });
            }
          });
        } catch (error) {
          console.warn(`[FulfillmentPage] Could not load scan logs for business ${businessId}:`, error);
        }
      }

      // Sort by timestamp (newest first)
      allScanLogs.sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setScanLogs(allScanLogs);
    } catch (error) {
      console.error('[FulfillmentPage] Error loading scan logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!barcodeInput.trim()) {
      alert('Please enter or scan a barcode');
      return;
    }

    if (!scanOrderId || !scanBusinessId) {
      alert('Please select an order to scan products for');
      return;
    }

    setScanning(true);
    try {
      const barcode = barcodeInput.trim().toLowerCase();
      const barcodeOriginal = barcodeInput.trim();
      
      // Normalize barcode for comparison (remove spaces, handle hyphens)
      const normalizeBarcode = (str: string) => str.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
      const normalizedBarcode = normalizeBarcode(barcodeOriginal);
      
      console.log('[FulfillmentPage] ========== SCAN START ==========');
      console.log('[FulfillmentPage] Scanning barcode:', barcodeOriginal, 'normalized:', normalizedBarcode);
      console.log('[FulfillmentPage] Order ID:', scanOrderId, 'Business ID:', scanBusinessId);
      
      // Get the order from pre-loaded array or Firestore
      let targetOrder = orders.find(o => o.id === scanOrderId);
      
      if (!targetOrder) {
        // Load order from Firestore
        try {
          const orderDoc = await getDoc(doc(db, 'businesses', scanBusinessId, 'orders', scanOrderId));
          if (orderDoc.exists()) {
            const orderData = orderDoc.data();
            const businessDoc = await getDoc(doc(db, 'businesses', scanBusinessId));
            const businessData = businessDoc.exists() ? businessDoc.data() : {};
            
            targetOrder = {
              id: scanOrderId,
              orderId: scanOrderId,
              orderNumber: orderData.orderNumber || `#${scanOrderId.slice(0, 6)}`,
              businessId: scanBusinessId,
              businessName: businessData.businessName || businessData.name || 'Unknown Business',
              customer: orderData.customer || { name: 'Unknown', email: '', phone: '' },
              fulfillment: orderData.fulfillment || { status: 'pending' },
              financials: orderData.financials || { total: 0 },
              metadata: orderData.metadata || {},
              items: orderData.items || [],
              ...orderData
            };
          } else {
            alert('Order not found');
            setBarcodeInput('');
            return;
          }
        } catch (error) {
          console.error('[FulfillmentPage] Error loading order:', error);
          alert('Error loading order: ' + (error as Error).message);
          setBarcodeInput('');
          return;
        }
      }
      
      if (!targetOrder || !targetOrder.items || targetOrder.items.length === 0) {
        alert('Order has no items to scan');
        setBarcodeInput('');
        return;
      }
      
      console.log('[FulfillmentPage] Order items count:', targetOrder.items.length);
      console.log('[FulfillmentPage] Order items:', JSON.stringify(targetOrder.items, null, 2));
      
      // Find which item in the order matches the scanned barcode
      let matchedItemIndex = -1;
      let matchedItem: any = null;
      
      // First, search products to get matching product IDs and their variant IDs
      // Key fix: track both base product IDs and full variant IDs (e.g., "ABC-30")
      const matchingProductData: { baseId: string; variantIds: string[]; costPrice: number | null }[] = [];
      
      try {
        const productsRef = collection(db, 'businesses', scanBusinessId, 'products');
        const productsSnapshot = await getDocs(productsRef);
        
        console.log('[FulfillmentPage] Searching through', productsSnapshot.docs.length, 'products');
        
        for (const productDoc of productsSnapshot.docs) {
          const productData = productDoc.data();
          const productBarcode = productData.barcode?.toString().toLowerCase() || '';
          const productMainBarcode = productData.mainBarcode?.toString().toLowerCase() || '';
          const productBarcodeNormalized = normalizeBarcode(productBarcode);
          const productMainBarcodeNormalized = normalizeBarcode(productMainBarcode);
          const productSku = productData.sku?.toString().toLowerCase() || '';
          const productSkuNormalized = normalizeBarcode(productSku);
          const productId = productDoc.id;
          const productIdLower = productId.toLowerCase();
          
          // Collect all variant IDs that might match this product
          const variantIds: string[] = [productId]; // Base product ID
          let foundMatch = false;
          let matchReason = '';
          
          // Check main product barcode
          if (productBarcode === barcode || productBarcodeNormalized === normalizedBarcode) {
            foundMatch = true;
            matchReason = `main barcode: ${productBarcode}`;
          }
          if (productMainBarcode === barcode || productMainBarcodeNormalized === normalizedBarcode) {
            foundMatch = true;
            matchReason = `mainBarcode: ${productMainBarcode}`;
          }
          if (productSku === barcode || productSkuNormalized === normalizedBarcode) {
            foundMatch = true;
            matchReason = `SKU: ${productSku}`;
          }
          if (productIdLower === barcode || normalizeBarcode(productIdLower) === normalizedBarcode) {
            foundMatch = true;
            matchReason = `product ID direct match`;
          }
          
          // Check size variants - this is crucial!
          // Size variants might be stored as { "30": { barcode: "797891913840" }, "32": { barcode: "..." } }
          if (productData.sizeVariants && typeof productData.sizeVariants === 'object') {
            for (const [sizeKey, variant] of Object.entries(productData.sizeVariants)) {
              const variantObj = variant as any;
              const variantBarcode = variantObj?.barcode?.toString().toLowerCase() || '';
              const variantBarcodeNormalized = normalizeBarcode(variantBarcode);
              const variantSku = variantObj?.sku?.toString().toLowerCase() || '';
              const variantSkuNormalized = normalizeBarcode(variantSku);
              
              // Build full variant ID (e.g., "kZkAin9S4dZ6RpjlxTmG-30")
              const fullVariantId = `${productId}-${sizeKey}`;
              variantIds.push(fullVariantId);
              
              if (variantBarcode === barcode || variantBarcodeNormalized === normalizedBarcode) {
                foundMatch = true;
                matchReason = `size variant ${sizeKey} barcode: ${variantBarcode}`;
              }
              if (variantSku === barcode || variantSkuNormalized === normalizedBarcode) {
                foundMatch = true;
                matchReason = `size variant ${sizeKey} SKU: ${variantSku}`;
              }
            }
          }
          
          // Also check variants array format
          if (productData.variants && Array.isArray(productData.variants)) {
            for (const variant of productData.variants) {
              const variantBarcode = variant?.barcode?.toString().toLowerCase() || '';
              const variantBarcodeNormalized = normalizeBarcode(variantBarcode);
              const variantSize = variant?.size || variant?.name || '';
              
              if (variantSize) {
                variantIds.push(`${productId}-${variantSize}`);
              }
              
              if (variantBarcode === barcode || variantBarcodeNormalized === normalizedBarcode) {
                foundMatch = true;
                matchReason = `variant barcode: ${variantBarcode}`;
              }
            }
          }
          
          if (foundMatch) {
            console.log('[FulfillmentPage] ✅ Product MATCH found:', productId, 'Reason:', matchReason);
            console.log('[FulfillmentPage] Variant IDs for this product:', variantIds);
            // Get cost price from product (price field is cost, sellingPrice is selling)
            const costPrice = productData.price || null;
            matchingProductData.push({ baseId: productId, variantIds, costPrice });
          }
        }
      } catch (error) {
        console.warn('[FulfillmentPage] Error searching products:', error);
      }
      
      console.log('[FulfillmentPage] Total matching products found:', matchingProductData.length);
      
      // Create a flat set of all possible matching product IDs (base + variants)
      const allMatchingIds = new Set<string>();
      matchingProductData.forEach(p => {
        allMatchingIds.add(p.baseId.toLowerCase());
        p.variantIds.forEach(v => allMatchingIds.add(v.toLowerCase()));
      });
      console.log('[FulfillmentPage] All matching IDs:', Array.from(allMatchingIds));
      
      // Check each item in the order
      for (let i = 0; i < targetOrder.items.length; i++) {
        const item = targetOrder.items[i];
        
        // Skip if already scanned
        if (scannedItems.has(i.toString())) {
          console.log(`[FulfillmentPage] Item ${i} already scanned, skipping`);
          continue;
        }
        
        const itemBarcode = item.barcode?.toString().toLowerCase() || '';
        const itemBarcodeNormalized = normalizeBarcode(itemBarcode);
        const itemSku = item.sku?.toString().toLowerCase() || '';
        const itemSkuNormalized = normalizeBarcode(itemSku);
        const itemProductId = item.productId?.toString() || '';
        const itemProductIdLower = itemProductId.toLowerCase();
        const itemProductIdNormalized = normalizeBarcode(itemProductId);
        
        console.log(`[FulfillmentPage] Checking item ${i}:`, {
          productId: itemProductId,
          barcode: itemBarcode || 'N/A',
          sku: itemSku || 'N/A',
          productName: item.productName || item.name || 'Unknown'
        });
        
        // Check if barcode directly matches this item's fields
        let directMatch = 
          (itemBarcode && (itemBarcode === barcode || itemBarcodeNormalized === normalizedBarcode)) ||
          (itemSku && (itemSku === barcode || itemSkuNormalized === normalizedBarcode)) ||
          (itemProductIdLower && (itemProductIdLower === barcode || itemProductIdNormalized === normalizedBarcode));
        
        // Check if item's productId matches any of our found product/variant IDs
        let productIdMatch = false;
        if (itemProductId) {
          // Exact match
          if (allMatchingIds.has(itemProductIdLower)) {
            productIdMatch = true;
            console.log(`[FulfillmentPage] ✅ Item ${i}: Exact productId match!`);
          }
          // Check if item's productId STARTS WITH any base product ID (handles variants like "abc-30")
          else {
            for (const p of matchingProductData) {
              const baseIdLower = p.baseId.toLowerCase();
              // Key fix: use startsWith to handle variant suffixes like "-30"
              if (itemProductIdLower.startsWith(baseIdLower + '-') || itemProductIdLower === baseIdLower) {
                productIdMatch = true;
                console.log(`[FulfillmentPage] ✅ Item ${i}: productId starts with base product ${p.baseId}`);
                break;
              }
              // Also check if base product ID is contained in item's productId
              if (itemProductIdLower.includes(baseIdLower)) {
                productIdMatch = true;
                console.log(`[FulfillmentPage] ✅ Item ${i}: productId contains ${p.baseId}`);
                break;
              }
            }
          }
        }
        
        if (directMatch || productIdMatch) {
          matchedItemIndex = i;
          matchedItem = item;
          console.log(`[FulfillmentPage] ✅ FINAL MATCH at item ${i}:`, item.productName || item.name || 'Unknown');
          break;
        }
      }
      
      if (matchedItemIndex === -1) {
        console.log('[FulfillmentPage] ❌ No match found');
        console.log('[FulfillmentPage] ========== SCAN END (NO MATCH) ==========');
        alert(`Product barcode "${barcodeOriginal}" not found in this order's items.\n\nPlease scan a product that belongs to this order.\n\nDebug: Searched ${matchingProductData.length} matching products, checked ${targetOrder.items.length} order items.`);
        setBarcodeInput('');
        return;
      }
      
      // Mark this item as scanned
      const newScannedItems = new Set(scannedItems);
      newScannedItems.add(matchedItemIndex.toString());
      setScannedItems(newScannedItems);
      
      console.log(`[FulfillmentPage] Item ${matchedItemIndex} scanned. Total scanned: ${newScannedItems.size}/${targetOrder.items.length}`);
      
      // Check if all items are scanned
      const allItemsScanned = newScannedItems.size >= targetOrder.items.length;
      
      if (allItemsScanned) {
        // Update order status to "ready for pickup" if it's pending or processing
        const currentStatus = targetOrder.fulfillment?.status || targetOrder.status || 'pending';
        if (currentStatus === 'pending' || currentStatus === 'processing') {
          try {
            const orderRef = doc(db, 'businesses', scanBusinessId, 'orders', scanOrderId);
            await updateDoc(orderRef, {
              // Update BOTH fulfillment.status AND main status so it shows in admin AND client Order Tracking
              'fulfillment.status': 'ready_for_pickup',
              'status': 'ready_for_pickup',
              'metadata.updatedAt': new Date().toISOString()
            });
            console.log('[FulfillmentPage] Order status updated to ready_for_pickup (both fulfillment.status and status)');
          } catch (error) {
            console.error('[FulfillmentPage] Error updating order status:', error);
          }
        }
      }
      
      // Get cost price from matched product data
      let productCostPrice: number | null = null;
      if (matchedItem.productId) {
        const itemProductIdLower = matchedItem.productId.toLowerCase();
        // Extract base product ID (remove size suffix like "-38" or "_38")
        const baseItemProductId = itemProductIdLower.split('-')[0].split('_')[0];
        console.log(`[FulfillmentPage] Looking for cost price. Item productId: ${matchedItem.productId}, base: ${baseItemProductId}`);
        console.log(`[FulfillmentPage] Matching products data:`, matchingProductData.map(p => ({ baseId: p.baseId, costPrice: p.costPrice })));
        
        for (const p of matchingProductData) {
          const baseIdLower = p.baseId.toLowerCase();
          if (baseItemProductId === baseIdLower || 
              itemProductIdLower.startsWith(baseIdLower + '-') || 
              itemProductIdLower.startsWith(baseIdLower + '_') ||
              itemProductIdLower === baseIdLower) {
            productCostPrice = p.costPrice;
            console.log(`[FulfillmentPage] ✅ Found cost price ${productCostPrice} for product ${p.baseId}`);
            break;
          }
        }
        
        if (productCostPrice === null) {
          console.warn(`[FulfillmentPage] ⚠️ Could not find cost price for product ${matchedItem.productId}`);
        }
      } else {
        console.warn(`[FulfillmentPage] ⚠️ matchedItem has no productId`);
      }
      
      const finalPrice = productCostPrice ?? matchedItem.price ?? matchedItem.unitPrice ?? 0;
      console.log(`[FulfillmentPage] Final price for scan log: ${finalPrice} (costPrice: ${productCostPrice}, itemPrice: ${matchedItem.price})`)
      
      // Log the scan with complete product data
      const scanLogRef = collection(db, 'businesses', scanBusinessId, 'scan_log');
      await addDoc(scanLogRef, {
        barcode: barcodeOriginal,
        orderId: scanOrderId,
        orderNumber: targetOrder.orderNumber,
        businessId: scanBusinessId,
        businessName: targetOrder.businessName,
        type: 'order',
        itemIndex: matchedItemIndex,
        itemScanned: matchedItem.productName || matchedItem.name || 'Unknown',
        productName: matchedItem.productName || matchedItem.name || 'Unknown',
        productId: matchedItem.productId || null,
        // Include size, price, and quantity data
        size: matchedItem.size || matchedItem.selectedSize || matchedItem.variant || null,
        // Use cost price from product, not selling price from order item
        price: finalPrice,
        sellingPrice: matchedItem.price || matchedItem.unitPrice || 0, // Also store selling price for reference
        quantity: matchedItem.quantity || 1,
        // Stock change: for order fulfillment, stock decreases by quantity
        previousStock: matchedItem.stock || matchedItem.currentStock || null,
        newStock: matchedItem.stock ? (matchedItem.stock - (matchedItem.quantity || 1)) : null,
        scannedItemsCount: newScannedItems.size,
        totalItemsCount: targetOrder.items.length,
        allItemsScanned: allItemsScanned,
        timestamp: serverTimestamp(),
        // Display "XDIGIX" as the user in client's scan log
        user: 'XDIGIX',
        userId: 'xdigix-fulfillment',
        // Keep actual admin info for internal tracking
        adminEmail: rbacUser?.email || 'Unknown',
        adminUserId: rbacUser?.id || null,
        scannedBy: 'XDIGIX',
        scannedByUserId: 'xdigix-fulfillment',
        orderStatus: allItemsScanned ? 'ready_for_pickup' : (targetOrder.fulfillment?.status || 'pending'),
        customer: targetOrder.customer?.name || 'Unknown',
        notes: allItemsScanned 
          ? 'All items scanned - Order ready for pickup'
          : `Item ${matchedItemIndex + 1} of ${targetOrder.items.length} scanned`,
        source: 'fulfillment_page'
      });
      
      // Show success message
      if (allItemsScanned) {
        alert(`✅ All items scanned!\n\nOrder ${targetOrder.orderNumber} is now ready for pickup.`);
        setBarcodeInput('');
        setShowScanModal(false);
        setScannedItems(new Set());
        setScanOrderId(null);
        setScanBusinessId(null);
        await loadOrders();
      } else {
        alert(`✅ Item scanned!\n\nScanned: ${newScannedItems.size} / ${targetOrder.items.length} items\n\nContinue scanning remaining items.`);
        setBarcodeInput('');
      }
    } catch (error) {
      console.error('[FulfillmentPage] Error processing scan:', error);
      alert('❌ Failed to process scan: ' + (error as Error).message);
      setBarcodeInput('');
    } finally {
      setScanning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'ready_for_pickup':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'shipped':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'delivered':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'returned':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'damaged':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'ready_for_pickup':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'returned':
        return <RefreshCw className="w-4 h-4" />;
      case 'damaged':
        return <AlertTriangle className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.fulfillment?.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || order.fulfillment?.status === filterStatus;
    const matchesType = filterType === 'all' || order.fulfillment?.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.fulfillment?.status === 'pending').length,
    ready_for_pickup: orders.filter(o => o.fulfillment?.status === 'ready_for_pickup').length,
    shipped: orders.filter(o => o.fulfillment?.status === 'shipped').length,
    delivered: orders.filter(o => o.fulfillment?.status === 'delivered').length,
    cancelled: orders.filter(o => o.fulfillment?.status === 'cancelled').length
  };

  return (
    <PermissionGuard 
      permissions={['super_admin.manage_all_tenants', 'super_admin.view_analytics', 'super_admin.manage_subscriptions']}
      showError={false}
    >
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Fulfillment Management</h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base hidden sm:block">Manage order fulfillment for businesses with fulfillment service subscription</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setShowScanLogs(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all text-sm sm:text-base"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Scan Logs</span>
                <span className="sm:hidden">Logs</span>
              </button>
            </div>
          </div>
        </div>
          
          {/* Info Banner */}
          <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-blue-300">
                Only showing orders from businesses that have subscribed to the fulfillment service
              </p>
            </div>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <span className="text-xs sm:text-sm text-gray-400">Total Orders</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-sm text-gray-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          </div>
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Package className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-sm text-gray-400">Ready for Pickup</span>
            </div>
            <p className="text-2xl font-bold text-cyan-400">{stats.ready_for_pickup}</p>
          </div>
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Truck className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">Shipped</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">{stats.shipped}</p>
          </div>
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm text-gray-400">Delivered</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats.delivered}</p>
          </div>
          <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-3 sm:p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-sm text-gray-400">Cancelled</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.cancelled}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Types</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="shipping">Shipping</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-[#1a1b3e] border border-[#2d2f5a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Order #</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Business</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Type</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Tracking</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Date</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
                      <p className="text-gray-400 mt-4">Loading orders...</p>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg">No orders found</p>
                      <p className="text-gray-500 text-sm mt-2">
                        {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                          ? 'Try adjusting your filters'
                          : orders.length === 0 
                            ? 'No orders found from businesses with fulfillment service. Check browser console (F12) for details.'
                            : 'No orders match your current filters'}
                      </p>
                      {orders.length === 0 && (
                        <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 max-w-md mx-auto">
                          <p className="text-xs text-amber-300">
                            <strong>Debug:</strong> Open browser console (F12) to see which businesses have fulfillment enabled and how many orders were found.
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const fulfillment = order.fulfillment || {};
                    const status = fulfillment.status || 'pending';
                    return (
                      <tr key={order.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-white">{order.orderNumber || order.id.slice(0, 8)}</span>
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
                            <div className="text-white font-medium">{order.customer?.name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{order.customer?.email || ''}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {fulfillment.type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {fulfillment.trackingNumber ? (
                            <span className="text-sm text-gray-300 font-mono">{fulfillment.trackingNumber}</span>
                          ) : (
                            <span className="text-xs text-gray-500">No tracking</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {order.metadata?.createdAt 
                            ? new Date(order.metadata.createdAt).toLocaleDateString()
                            : order.created_at
                            ? new Date(order.created_at).toLocaleDateString()
                            : 'N/A'}
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
                                setUpdateData({
                                  status: (fulfillment.status || 'pending') as FulfillmentStatus,
                                  trackingNumber: fulfillment.trackingNumber || '',
                                  notes: ''
                                });
                                setShowUpdateModal(true);
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                              title="Update Fulfillment"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                // Set the order and business for scanning
                                setScanOrderId(order.id);
                                setScanBusinessId(order.businessId);
                                setBarcodeInput(''); // Clear any previous input
                                setScanType('order'); // Reset scan type
                                setScannedItems(new Set()); // Reset scanned items
                                setShowScanModal(true);
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                              title={`Scan Products for Order ${order.orderNumber}`}
                            >
                              <Scan className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Detail Modal */}
        {showDetailModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Order Details</h2>
                  <p className="text-gray-400 mt-1">Order #{selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedOrder(null);
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Business & Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-gray-400 uppercase">Business</span>
                    </div>
                    <p className="text-white font-medium">{selectedOrder.businessName}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-gray-400 uppercase">Customer</span>
                    </div>
                    <p className="text-white font-medium">{selectedOrder.customer?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">{selectedOrder.customer?.email || ''}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-sm text-white">{item.productName}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity} × ${item.price?.toFixed(2)}</p>
                        </div>
                        <p className="text-sm font-medium text-white">${item.subtotal?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                    <span className="text-sm text-gray-400">Total</span>
                    <span className="text-lg font-bold text-white">
                      ${selectedOrder.financials?.total?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>

                {/* Fulfillment Info */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-3">Fulfillment Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Status</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(selectedOrder.fulfillment?.status || 'pending')}`}>
                        {getStatusIcon(selectedOrder.fulfillment?.status || 'pending')}
                        {(selectedOrder.fulfillment?.status || 'pending').charAt(0).toUpperCase() + (selectedOrder.fulfillment?.status || 'pending').slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Type</span>
                      <span className="text-sm text-white">{selectedOrder.fulfillment?.type || 'N/A'}</span>
                    </div>
                    {selectedOrder.fulfillment?.trackingNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Tracking Number</span>
                        <span className="text-sm text-white font-mono">{selectedOrder.fulfillment.trackingNumber}</span>
                      </div>
                    )}
                    {selectedOrder.fulfillment?.address && (
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-sm text-gray-400">Address</span>
                        <span className="text-sm text-white text-right">{selectedOrder.fulfillment.address}</span>
                      </div>
                    )}
                    {selectedOrder.fulfillment?.shippedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Shipped At</span>
                        <span className="text-sm text-white">
                          {new Date(selectedOrder.fulfillment.shippedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedOrder.fulfillment?.deliveredAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Delivered At</span>
                        <span className="text-sm text-white">
                          {new Date(selectedOrder.fulfillment.deliveredAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update Fulfillment Modal */}
        {showUpdateModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Update Fulfillment</h2>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedOrder(null);
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Order Number</label>
                  <input
                    type="text"
                    value={selectedOrder.orderNumber || selectedOrder.id.slice(0, 8)}
                    disabled
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fulfillment Status</label>
                  <select
                    value={updateData.status}
                    onChange={(e) => setUpdateData({ ...updateData, status: e.target.value as FulfillmentStatus })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="pending">Pending</option>
                    <option value="ready_for_pickup">Ready for Pickup</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="returned">Returned</option>
                    <option value="damaged">Damaged</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tracking Number</label>
                  <input
                    type="text"
                    value={updateData.trackingNumber}
                    onChange={(e) => setUpdateData({ ...updateData, trackingNumber: e.target.value })}
                    placeholder="Enter tracking number (optional)"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowUpdateModal(false);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateFulfillment}
                    disabled={updating}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#0a0b1a] border-t-transparent rounded-full animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" />
                        Update Fulfillment
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan Modal */}
        {showScanModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-4 sm:p-6 max-w-md w-full my-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Scan Barcode</h2>
                  <p className="text-gray-400 mt-1">
                    {scanOrderId && scanBusinessId
                      ? (() => {
                          const order = orders.find(o => o.id === scanOrderId);
                          const itemCount = order?.items?.length || 0;
                          const scannedCount = scannedItems.size;
                          return `Scanning products for Order ${order?.orderNumber || scanOrderId.slice(0, 8)} (${scannedCount}/${itemCount} items scanned)`;
                        })()
                      : scanBusinessId
                      ? `Scanning for: ${orders.find(o => o.businessId === scanBusinessId)?.businessName || scanBusinessId.slice(0, 8)}`
                      : 'Scan or enter barcode to log fulfillment action'}
                  </p>
                </div>
                <button
                    onClick={() => {
                      stopCamera();
                      setShowScanModal(false);
                      setBarcodeInput('');
                      setScanType('order');
                      setScanBusinessId(null);
                      setScanOrderId(null);
                      setScannedItems(new Set());
                    }}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Scan Type Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">Scan Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setScanType('order')}
                      className={`px-4 py-3 rounded-xl border transition-all ${
                        scanType === 'order'
                          ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <Package className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">Order</span>
                    </button>
                    <button
                      onClick={() => setScanType('return')}
                      className={`px-4 py-3 rounded-xl border transition-all ${
                        scanType === 'return'
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <Truck className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">Return</span>
                    </button>
                    <button
                      onClick={() => setScanType('damaged')}
                      className={`px-4 py-3 rounded-xl border transition-all ${
                        scanType === 'damaged'
                          ? 'bg-red-500/20 border-red-500/30 text-red-400'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <AlertCircle className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">Damaged</span>
                    </button>
                  </div>
                </div>

                {/* Camera View - Always visible when modal is open */}
                <div 
                  className="relative bg-black rounded-xl overflow-hidden" 
                  style={{ 
                    display: 'block',
                    minHeight: '300px',
                    height: '300px',
                    width: '100%'
                  }}
                >
                  {/* Camera container - always rendered and visible when modal is open */}
                  <div 
                    ref={(el) => {
                      qrCodeContainerRef.current = el;
                      if (el) {
                        // Ensure element has the required ID
                        el.id = 'html5qr-code-full-region';
                        console.log('[FulfillmentPage] Container ref set:', el.id, 'isConnected:', el.isConnected, 'parent:', el.parentElement);
                      }
                    }}
                    id="html5qr-code-full-region"
                    className="w-full h-full"
                    style={{ 
                      minHeight: '300px', 
                      height: '300px',
                      width: '100%',
                      display: 'block'
                    }}
                  />
                  {cameraError && (
                    <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg text-sm z-10">
                      {cameraError}
                    </div>
                  )}
                  {!cameraError && (
                    <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 px-4 py-2 z-10">
                      Position barcode within the scanning frame
                    </div>
                  )}
                </div>

                {/* Barcode Input */}
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">Barcode / Order Number</label>
                  <input
                    data-barcode-input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => {
                      setBarcodeInput(e.target.value);
                      lastDetectedBarcodeRef.current = ''; // Reset to allow re-detection
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleScan();
                      }
                    }}
                    placeholder="Camera will auto-detect barcode or enter manually..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                    autoFocus={false}
                  />
                  {barcodeInput && (
                    <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Barcode detected: {barcodeInput}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      stopCamera();
                      setShowScanModal(false);
                      setBarcodeInput('');
                      setScanType('order');
                      setCameraError(null);
                      setScanBusinessId(null);
                      setScanOrderId(null);
                      setScannedItems(new Set());
                    }}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    data-scan-button
                    onClick={handleScan}
                    disabled={scanning || !barcodeInput.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0a0b1a] font-semibold rounded-xl hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {scanning ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#0a0b1a] border-t-transparent rounded-full animate-spin" />
                        Scanning...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ScanLine className="w-4 h-4" />
                        Process Scan
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan Logs Modal */}
        {showScanLogs && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
            <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl p-4 sm:p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto my-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Scan Logs</h2>
                  <p className="text-gray-400 mt-1">View all scan activities across all businesses</p>
                </div>
                <button
                  onClick={() => setShowScanLogs(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
                  <p className="text-gray-400 mt-4">Loading scan logs...</p>
                </div>
              ) : scanLogs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No scan logs found</p>
                  <p className="text-gray-500 text-sm mt-2">Scan logs will appear here after scanning barcodes</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="text-left text-xs font-medium text-gray-400 uppercase px-2 sm:px-4 py-2 sm:py-3">Date</th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">Business</th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase px-2 sm:px-4 py-2 sm:py-3">Order #</th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase px-2 sm:px-4 py-2 sm:py-3 hidden md:table-cell">Barcode</th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase px-2 sm:px-4 py-2 sm:py-3">Type</th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase px-2 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">Customer</th>
                        <th className="text-left text-xs font-medium text-gray-400 uppercase px-2 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">Scanned By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {scanLogs.map((log) => {
                        const scanDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp || 0);
                        const typeColors = {
                          order: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                          return: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                          damaged: 'bg-red-500/20 text-red-400 border-red-500/30'
                        };
                        return (
                          <tr key={log.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {scanDate.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-white">{log.businessName}</td>
                            <td className="px-4 py-3 text-sm text-white font-mono">{log.orderNumber || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-300 font-mono">{log.barcode}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${typeColors[log.type as keyof typeof typeColors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                                {log.type === 'order' && <Package className="w-3 h-3" />}
                                {log.type === 'return' && <Truck className="w-3 h-3" />}
                                {log.type === 'damaged' && <AlertCircle className="w-3 h-3" />}
                                {log.type?.charAt(0).toUpperCase() + log.type?.slice(1) || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">{log.customer || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">{log.scannedBy || 'Unknown'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
