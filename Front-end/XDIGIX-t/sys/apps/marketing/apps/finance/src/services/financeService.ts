import dayjs, { Dayjs } from 'dayjs';
import { collection, doc, getDocs, query, Timestamp, where, orderBy, limit, db, setDoc } from '../lib/firebase';

type DateRange = {
  start: Dayjs;
  end: Dayjs;
};

type FirestoreDoc<T> = T & { id: string };

export type OrderRecord = {
  totalAmount: number;
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

export const createTransaction = async (
  workspaceId: string,
  orgId: string,
  payload: Omit<TransactionRecord, 'createdAt'> & { createdAt?: Date }
) => {
  const transactionRef = doc(collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'transactions'));
  await setDoc(transactionRef, {
    ...payload,
    createdAt: payload.createdAt ? Timestamp.fromDate(payload.createdAt) : Timestamp.fromDate(new Date())
  });
  return transactionRef.id;
};

export const createPayment = async (
  workspaceId: string,
  orgId: string,
  payload: Omit<PaymentRecord, 'createdAt'> & { createdAt?: Date }
) => {
  const paymentRef = doc(collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'payments'));
  await setDoc(paymentRef, {
    ...payload,
    createdAt: payload.createdAt ? Timestamp.fromDate(payload.createdAt) : Timestamp.fromDate(new Date())
  });
  return paymentRef.id;
};

const toMillisRange = (range: DateRange) => ({
  start: Timestamp.fromMillis(range.start.startOf('day').valueOf()),
  end: Timestamp.fromMillis(range.end.endOf('day').valueOf())
});

export const fetchOrders = async (
  workspaceId: string,
  orgId: string,
  range: DateRange,
  branch?: string
): Promise<FirestoreDoc<OrderRecord>[]> => {
  const { start, end } = toMillisRange(range);
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'orders');

  const constraints = [where('createdAt', '>=', start), where('createdAt', '<=', end)];

  if (branch) {
    constraints.push(where('branchId', '==', branch));
  }

  const snap = await getDocs(query(base, ...constraints));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as OrderRecord) }));
};

export const fetchExpenses = async (
  workspaceId: string,
  orgId: string,
  range: DateRange
): Promise<FirestoreDoc<ExpenseRecord>[]> => {
  const { start, end } = toMillisRange(range);
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'expenses');

  const snap = await getDocs(query(base, where('createdAt', '>=', start), where('createdAt', '<=', end)));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as ExpenseRecord) }));
};

export const fetchTransactions = async (
  workspaceId: string,
  orgId: string,
  range: DateRange,
  filters: { type?: string; method?: string }
): Promise<FirestoreDoc<TransactionRecord>[]> => {
  const { start, end } = toMillisRange(range);
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'transactions');

  let q = query(base, where('createdAt', '>=', start), where('createdAt', '<=', end), orderBy('createdAt', 'desc'));

  if (filters.type && filters.type !== 'all') {
    q = query(q, where('type', '==', filters.type));
  }
  if (filters.method && filters.method !== 'all') {
    q = query(q, where('method', '==', filters.method));
  }

  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as TransactionRecord) }));
};

export const fetchPayments = async (
  workspaceId: string,
  orgId: string,
  range: DateRange,
  filters: { method?: string; status?: string }
): Promise<FirestoreDoc<PaymentRecord>[]> => {
  const { start, end } = toMillisRange(range);
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'payments');

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

export const fetchRecentTransactions = async (workspaceId: string, orgId: string) => {
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'transactions');

  const snap = await getDocs(query(base, orderBy('createdAt', 'desc'), limit(5)));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as TransactionRecord) }));
};

