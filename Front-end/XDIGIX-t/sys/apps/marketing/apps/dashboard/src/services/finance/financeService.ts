import dayjs, { Dayjs } from 'dayjs';
import {
  collection,
  doc,
  getDocs,
  query,
  Timestamp,
  where,
  orderBy,
  limit,
  setDoc,
  db
} from '../../lib/firebase';
import { trackFirestoreOperation } from '../../lib/performance';

type DateRange = {
  start: Dayjs;
  end: Dayjs;
};

type FirestoreDoc<T> = T & { id: string };

export type OrderRecord = {
  totalAmount?: number;
  total?: number; // Orders use 'total' field, but we support both for compatibility
  status: string;
  createdAt: Timestamp;
  branchId?: string;
  currency?: string;
};

export type ExpenseRecord = {
  amount: number;
  category: string;
  vendorId?: string;
  createdAt: Timestamp;
  currency?: string;
};

export type TransactionRecord = {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  method: string;
  linkedType?: 'order' | 'expense' | 'capital';
  linkedId?: string;
  createdAt: Timestamp;
  currency?: string;
  notes?: string;
  userId?: string;
  status?: string;
};

export type PaymentRecord = {
  amount: number;
  customerName?: string;
  customerId?: string;
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Timestamp;
  orderId?: string;
  currency?: string;
  refunds?: Array<{ amount: number; createdAt: Timestamp; notes?: string }>;
};

const businessCollection = (businessId: string, path: string) =>
  collection(db, 'businesses', businessId, path);

const toMillisRange = (range: DateRange) => ({
  start: Timestamp.fromMillis(range.start.startOf('day').valueOf()),
  end: Timestamp.fromMillis(range.end.endOf('day').valueOf())
});

export const createTransaction = async (
  businessId: string,
  payload: Omit<TransactionRecord, 'createdAt'> & { createdAt?: Date }
) => {
  return trackFirestoreOperation('transactions', 'write', async () => {
    const transactionRef = doc(businessCollection(businessId, 'transactions'));
    await setDoc(transactionRef, {
      ...payload,
      createdAt: payload.createdAt ? Timestamp.fromDate(payload.createdAt) : Timestamp.fromDate(new Date())
    });
    return transactionRef.id;
  });
};

export const createPayment = async (
  businessId: string,
  payload: Omit<PaymentRecord, 'createdAt'> & { createdAt?: Date }
) => {
  const paymentRef = doc(businessCollection(businessId, 'payments'));
  await setDoc(paymentRef, {
    ...payload,
    createdAt: payload.createdAt ? Timestamp.fromDate(payload.createdAt) : Timestamp.fromDate(new Date())
  });
  return paymentRef.id;
};

export const fetchOrders = async (
  businessId: string,
  range: DateRange,
  branch?: string
): Promise<FirestoreDoc<OrderRecord>[]> => {
  return trackFirestoreOperation('orders', 'read', async () => {
    const { start, end } = toMillisRange(range);
    const base = businessCollection(businessId, 'orders');

    const constraints = [where('createdAt', '>=', start), where('createdAt', '<=', end)];

    if (branch) {
      constraints.push(where('branchId', '==', branch));
    }

    const snap = await getDocs(query(base, ...constraints));
    return snap.docs.map((docSnap) => {
      const data = docSnap.data() as OrderRecord;
      // Normalize: ensure totalAmount is set from total if totalAmount doesn't exist
      return {
        id: docSnap.id,
        ...data,
        totalAmount: data.totalAmount ?? data.total ?? 0
      };
    });
  });
};

export const fetchExpenses = async (
  businessId: string,
  range: DateRange
): Promise<FirestoreDoc<ExpenseRecord>[]> => {
  const { start, end } = toMillisRange(range);
  const base = businessCollection(businessId, 'expenses');

  const snap = await getDocs(query(base, where('createdAt', '>=', start), where('createdAt', '<=', end)));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as ExpenseRecord) }));
};

export const fetchTransactions = async (
  businessId: string,
  range: DateRange,
  filters: { type?: string; method?: string }
): Promise<FirestoreDoc<TransactionRecord>[]> => {
  return trackFirestoreOperation('transactions', 'read', async () => {
    const { start, end } = toMillisRange(range);
    const base = businessCollection(businessId, 'transactions');

    let q = query(base, where('createdAt', '>=', start), where('createdAt', '<=', end), orderBy('createdAt', 'desc'));

    if (filters.type && filters.type !== 'all') {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters.method && filters.method !== 'all') {
      q = query(q, where('method', '==', filters.method));
    }

    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as TransactionRecord) }));
  });
};

export const fetchPayments = async (
  businessId: string,
  range: DateRange,
  filters: { method?: string; status?: string }
): Promise<FirestoreDoc<PaymentRecord>[]> => {
  const { start, end } = toMillisRange(range);
  const base = businessCollection(businessId, 'payments');

  let q = query(base, where('createdAt', '>=', start), where('createdAt', '<=', end), orderBy('createdAt', 'desc'));

  if (filters.method && filters.method !== 'all') {
    q = query(q, where('method', '==', filters.method));
  }
  if (filters.status && filters.status !== 'all') {
    q = query(q, where('status', '==', filters.status));
  }

  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as PaymentRecord) }));
};

export const fetchRecentTransactions = async (businessId: string) => {
  const base = businessCollection(businessId, 'transactions');
  const snap = await getDocs(query(base, orderBy('createdAt', 'desc'), limit(5)));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as TransactionRecord) }));
};

