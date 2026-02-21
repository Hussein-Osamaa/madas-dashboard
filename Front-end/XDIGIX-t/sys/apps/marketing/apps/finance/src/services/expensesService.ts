import { collection, doc, getDocs, orderBy, query, setDoc, Timestamp, where, db } from '../lib/firebase';
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

export const fetchExpenses = async (workspaceId: string, orgId: string, range: DateRange, filters: Filters) => {
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'expenses');
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
  workspaceId: string,
  orgId: string,
  payload: Omit<ExpenseDoc, 'createdAt'> & { createdAt: Date }
) => {
  const expenseRef = doc(collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'expenses'));
  await setDoc(expenseRef, {
    ...payload,
    createdAt: Timestamp.fromDate(payload.createdAt)
  });
  return expenseRef.id;
};

type VendorAggregate = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalSpent: number;
  lastExpense?: Date;
};

export const fetchVendors = async (workspaceId: string, orgId: string) => {
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'vendors');
  const snapshot = await getDocs(base);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const lastExpense = data.lastExpense as { toDate?: () => Date } | undefined;
    return {
      id: docSnap.id,
      name: (data.vendorName ?? data.name ?? 'Unnamed vendor') as string,
      email: data.email,
      phone: data.phone,
      totalSpent: (data.totalSpent ?? 0) as number,
      lastExpense: lastExpense?.toDate?.()
    } as VendorAggregate;
  });
};


