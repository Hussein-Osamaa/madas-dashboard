import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc
} from '../lib/backend';
import { decreaseProductStock, restoreProductStock } from './productsService';

export type OrderStatus =
  | 'pending'
  | 'preparing_for_pickup'
  | 'ready_for_pickup'
  | 'shipped'
  | 'processing'
  | 'delivered'
  | 'completed'
  | 'returned'
  | 'damaged'
  | 'cancelled';

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
    size?: string;
    image?: string;
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
  bostaTrackingUrl?: string;
  fulfillmentSynced?: boolean;
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
  // Don't use orderBy('date') — Firestore silently excludes docs where the
  // field is missing/null, which drops orders created without a date field
  // (e.g. Zammit sync, POS, external imports). Sorting is done client-side
  // in the useOrders hook instead.
  const snapshot = await getDocs(ordersCollection(businessId));
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
  // Check stock availability BEFORE creating the order
  if (payload.items && payload.items.length > 0) {
    for (const item of payload.items) {
      if (item.productId) {
        const size = item.size;
        // decreaseProductStock will throw if out of stock
        // We do a dry check first by reading stock
        const productRef = doc(db, 'businesses', businessId, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const data = productSnap.data();
          const stock: Record<string, number> = data.stock ?? {};
          const reserved: Record<string, number> = data.reservedStock ?? {};
          const stockKeys = Object.keys(stock);
          const sizeKey = size || (stockKeys.length === 1 ? stockKeys[0] : '');
          if (sizeKey) {
            const physical = stock[sizeKey] ?? 0;
            const alreadyReserved = reserved[sizeKey] ?? 0;
            const available = physical - alreadyReserved;
            if (available < (item.quantity || 1)) {
              throw new Error(`${item.name || item.productId} (${sizeKey}) — only ${available} available`);
            }
          }
        }
      }
    }
  }

  const now = serverTimestamp();
  const dateValue = payload.date ?? new Date();
  const docRef = await addDoc(ordersCollection(businessId), {
    ...payload,
    status: 'pending',
    date: dateValue,
    createdAt: now,
    updatedAt: now
  });

  // Deduct stock for each item
  if (payload.items && payload.items.length > 0) {
    for (const item of payload.items) {
      if (item.productId) {
        try {
          await decreaseProductStock(businessId, item.productId, item.size, item.quantity || 1);
        } catch (error) {
          console.error(`[ordersService] Failed to decrease stock for ${item.productId}:`, error);
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
  // If status is being changed to cancelled or returned, restore stock
  if (payload.status === 'cancelled' || payload.status === 'returned') {
    const orderDoc = await getDoc(doc(db, 'businesses', businessId, 'orders', orderId));
    if (orderDoc.exists()) {
      const orderData = orderDoc.data();
      const previousStatus = orderData.status;
      
      // Only restore stock if order wasn't already cancelled/returned
      if (previousStatus !== 'cancelled' && previousStatus !== 'returned' && orderData.items && orderData.items.length > 0) {
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


