import { collection, doc, getDocs, orderBy, query, setDoc, updateDoc, deleteDoc, Timestamp, where, db } from '../../lib/firebase';
import dayjs from 'dayjs';

type DateRange = { start: dayjs.Dayjs; end: dayjs.Dayjs };
type Filters = { vendor?: string; category?: string; status?: string };

export type ExpenseDoc = {
  amount: number;
  category: string;
  vendorName?: string;
  description?: string;
  tax?: number;
  status?: string;
  createdAt: Timestamp;
  currency?: string;
};

const businessCollection = (businessId: string, path: string) =>
  collection(db, 'businesses', businessId, path);

/** Normalize Firestore/backend date to Date (handles Timestamp, string, number, { seconds }) */
function toDate(v: unknown): Date | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? undefined : d; }
  if (typeof v === 'number') { const d = new Date(v < 1e12 ? v * 1000 : v); return isNaN(d.getTime()) ? undefined : d; }
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'object' && v !== null) {
    const sec = (v as { seconds?: number; _seconds?: number }).seconds ?? (v as { _seconds?: number })._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) return new Date(sec * 1000);
  }
  return undefined;
}

export const fetchExpenses = async (businessId: string, range: DateRange, filters: Filters) => {
  const base = businessCollection(businessId, 'expenses');
  const start = Timestamp.fromMillis(range.start.startOf('day').valueOf());
  const end = Timestamp.fromMillis(range.end.endOf('day').valueOf());

  let q = query(base, where('createdAt', '>=', start), where('createdAt', '<=', end), orderBy('createdAt', 'desc'));

  if (filters.vendor) {
    q = query(q, where('vendorName', '==', filters.vendor));
  }
  if (filters.category) {
    q = query(q, where('category', '==', filters.category));
  }
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as ExpenseDoc)
  }));
};

export const createExpense = async (
  businessId: string,
  payload: Omit<ExpenseDoc, 'createdAt'> & { createdAt: Date }
) => {
  const expenseRef = doc(businessCollection(businessId, 'expenses'));
  
  // Filter out undefined values - Firestore doesn't accept undefined
  const cleanPayload: Record<string, unknown> = {
    amount: payload.amount,
    category: payload.category,
    createdAt: Timestamp.fromDate(payload.createdAt)
  };
  
  // Only add optional fields if they have values
  if (payload.vendorName !== undefined && payload.vendorName !== null) {
    cleanPayload.vendorName = payload.vendorName;
  }
  if (payload.description !== undefined && payload.description !== null) {
    cleanPayload.description = payload.description;
  }
  if (payload.tax !== undefined && payload.tax !== null) {
    cleanPayload.tax = payload.tax;
  }
  if (payload.status !== undefined && payload.status !== null) {
    cleanPayload.status = payload.status;
  }
  if (payload.currency !== undefined && payload.currency !== null) {
    cleanPayload.currency = payload.currency;
  }
  
  await setDoc(expenseRef, cleanPayload);
  return expenseRef.id;
};

export const updateExpense = async (
  businessId: string,
  expenseId: string,
  payload: Omit<ExpenseDoc, 'createdAt'> & { createdAt: Date }
) => {
  const expenseRef = doc(db, 'businesses', businessId, 'expenses', expenseId);
  
  // Filter out undefined values - Firestore doesn't accept undefined
  const cleanPayload: Record<string, unknown> = {
    amount: payload.amount,
    category: payload.category,
    createdAt: Timestamp.fromDate(payload.createdAt)
  };
  
  // Only add optional fields if they have values
  if (payload.vendorName !== undefined && payload.vendorName !== null) {
    cleanPayload.vendorName = payload.vendorName;
  }
  if (payload.description !== undefined && payload.description !== null) {
    cleanPayload.description = payload.description;
  }
  if (payload.tax !== undefined && payload.tax !== null) {
    cleanPayload.tax = payload.tax;
  }
  if (payload.status !== undefined && payload.status !== null) {
    cleanPayload.status = payload.status;
  }
  if (payload.currency !== undefined && payload.currency !== null) {
    cleanPayload.currency = payload.currency;
  }
  
  await updateDoc(expenseRef, cleanPayload);
};

export const deleteExpense = async (businessId: string, expenseId: string) => {
  const expenseRef = doc(db, 'businesses', businessId, 'expenses', expenseId);
  await deleteDoc(expenseRef);
};

type VendorAggregate = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalSpent: number;
  lastExpense?: Date;
};

export const fetchVendors = async (businessId: string) => {
  const base = businessCollection(businessId, 'vendors');
  const snapshot = await getDocs(base);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: (data.vendorName as string | undefined) ?? (data.name as string | undefined) ?? 'Unnamed vendor',
      email: data.email as string | undefined,
      phone: data.phone as string | undefined,
      totalSpent: (data.totalSpent as number | undefined) ?? 0,
      lastExpense: toDate(data.lastExpense)
    } as VendorAggregate;
  });
};

