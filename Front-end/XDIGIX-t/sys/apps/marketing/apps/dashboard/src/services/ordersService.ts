import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from '../lib/firebase';
import { decreaseProductStock, restoreProductStock } from './productsService';

export type OrderStatus = 'pending' | 'ready_for_pickup' | 'processing' | 'completed' | 'cancelled';

export type Order = {
  id: string;
  customerName: string;
  customerContact?: string;
  customerEmail?: string;
  status: OrderStatus;
  productCount: number;
  total: number;
  date?: Date;
  notes?: string;
  paymentStatus?: string;
  channel?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Shipping fields
  shippingAddress?: {
    address?: string;
    city?: string;
    district?: string;
    floor?: string;
    apartment?: string;
    building?: string;
  };
  items?: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  // Delivery options
  allowOpenPackage?: boolean;
  codAmount?: number; // Cash on delivery amount (full total or just shipping if prepaid)
  shippingFees?: number;
  // Discount fields
  discount?: number; // Calculated discount amount
  discountType?: 'fixed' | 'percentage';
  discountValue?: number; // Original value entered (either fixed amount or percentage)
  discountReason?: string;
  // Bosta integration fields
  shippingProvider?: string;
  bostaTrackingNumber?: string;
  bostaDeliveryId?: string;
  bostaStatus?: string;
  bostaStatusValue?: number;
  bostaStatusLabel?: string;
  bostaLastUpdate?: Date;
  bostaTimeline?: Array<{
    state?: { value: number; code: string };
    timestamp?: string;
    note?: string;
  }>;
};

export type OrderDraft = Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'date'> & {
  id?: string;
  date?: Date;
};

type FirestoreOrder = Omit<Order, 'id' | 'date' | 'createdAt' | 'updatedAt'> & {
  date?: { toDate: () => Date } | Date | string;
  createdAt?: { toDate: () => Date };
  updatedAt?: { toDate: () => Date };
};

const ordersCollection = (businessId: string) => collection(db, 'businesses', businessId, 'orders');

const normalizeDate = (value: FirestoreOrder['date']): Date | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value?.toDate === 'function') {
    return value.toDate();
  }
  return undefined;
};

const normalizeOrder = (id: string, data: FirestoreOrder): Order => {
  const { createdAt, updatedAt, date, ...rest } = data;
  return {
    id,
    ...rest,
    date: normalizeDate(date),
    createdAt: createdAt?.toDate ? createdAt.toDate() : undefined,
    updatedAt: updatedAt?.toDate ? updatedAt.toDate() : undefined
  };
};

export const fetchOrders = async (businessId: string): Promise<Order[]> => {
  const q = query(ordersCollection(businessId), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => normalizeOrder(docSnap.id, docSnap.data() as FirestoreOrder));
};

export const getOrder = async (businessId: string, orderId: string): Promise<Order | null> => {
  const docRef = doc(db, 'businesses', businessId, 'orders', orderId);
  const orderDoc = await getDoc(docRef);
  if (!orderDoc.exists()) {
    return null;
  }
  return normalizeOrder(orderDoc.id, orderDoc.data() as FirestoreOrder);
};

export const createOrder = async (businessId: string, payload: Omit<OrderDraft, 'id'>): Promise<string> => {
  const now = serverTimestamp();
  const dateValue = payload.date ?? new Date();
  const docRef = await addDoc(ordersCollection(businessId), {
    ...payload,
    date: dateValue,
    createdAt: now,
    updatedAt: now
  });
  
  // Decrease stock for each item in the order
  if (payload.items && payload.items.length > 0) {
    console.log('[ordersService] Decreasing stock for order items:', payload.items);
    for (const item of payload.items) {
      if (item.productId) {
        try {
          // Extract size from the item if present (could be in item.size or parsed from productId)
          const size = (item as { size?: string }).size;
          await decreaseProductStock(businessId, item.productId, size, item.quantity || 1);
        } catch (error) {
          console.error(`[ordersService] Failed to decrease stock for product ${item.productId}:`, error);
        }
      }
    }
  }
  
  return docRef.id;
};

export const updateOrder = async (
  businessId: string,
  orderId: string,
  payload: Partial<Omit<OrderDraft, 'id'>>
): Promise<void> => {
  // If status is being changed to cancelled, restore stock
  if (payload.status === 'cancelled') {
    const orderDoc = await getDoc(doc(db, 'businesses', businessId, 'orders', orderId));
    if (orderDoc.exists()) {
      const orderData = orderDoc.data();
      const previousStatus = orderData.status;
      
      // Only restore stock if order wasn't already cancelled
      if (previousStatus !== 'cancelled' && orderData.items && orderData.items.length > 0) {
        console.log('[ordersService] Restoring stock for cancelled order:', orderId);
        for (const item of orderData.items) {
          if (item.productId) {
            try {
              const size = item.size;
              await restoreProductStock(businessId, item.productId, size, item.quantity || 1);
            } catch (error) {
              console.error(`[ordersService] Failed to restore stock for product ${item.productId}:`, error);
            }
          }
        }
      }
    }
  }
  
  await updateDoc(doc(db, 'businesses', businessId, 'orders', orderId), {
    ...payload,
    updatedAt: serverTimestamp()
  });
};

export const deleteOrder = async (businessId: string, orderId: string): Promise<void> => {
  await deleteDoc(doc(db, 'businesses', businessId, 'orders', orderId));
};


