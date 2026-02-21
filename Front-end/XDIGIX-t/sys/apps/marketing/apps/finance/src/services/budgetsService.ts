import { collection, doc, getDocs, orderBy, query, setDoc, Timestamp, where, db } from '../lib/firebase';
import dayjs from 'dayjs';

type BudgetDoc = {
  name: string;
  category: string;
  allocated: number;
  spent: number;
  startDate: Timestamp;
  endDate: Timestamp;
  notes?: string;
};

type DateRange = { start: dayjs.Dayjs; end: dayjs.Dayjs };

export const fetchBudgets = async (workspaceId: string, orgId: string, range: DateRange) => {
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'budgets');
  const snapshot = await getDocs(
    query(
      base,
      where('startDate', '>=', Timestamp.fromDate(range.start.toDate())),
      where('endDate', '<=', Timestamp.fromDate(range.end.toDate())),
      orderBy('startDate', 'asc')
    )
  );
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as BudgetDoc;
    const spent = data.spent ?? 0;
    const status: 'on_track' | 'warning' | 'exceeded' =
      spent >= data.allocated ? 'exceeded' : spent >= data.allocated * 0.8 ? 'warning' : 'on_track';
    return {
      id: docSnap.id,
      name: data.name,
      category: data.category,
      allocated: data.allocated,
      spent,
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
      notes: data.notes,
      status
    };
  });
};

export const createBudget = async (
  workspaceId: string,
  orgId: string,
  payload: {
    name: string;
    category: string;
    allocated: number;
    startDate: Date;
    endDate: Date;
    notes?: string;
  }
) => {
  const ref = doc(collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'budgets'));
  await setDoc(ref, {
    ...payload,
    spent: 0,
    startDate: Timestamp.fromDate(payload.startDate),
    endDate: Timestamp.fromDate(payload.endDate)
  });
  return ref.id;
};

export const updateBudgetAllocation = async (
  workspaceId: string,
  orgId: string,
  budgetId: string,
  allocated: number,
  endDate: Date
) => {
  const ref = doc(db, 'workspaces', workspaceId, 'organizations', orgId, 'budgets', budgetId);
  await setDoc(
    ref,
    {
      allocated,
      endDate: Timestamp.fromDate(endDate)
    },
    { merge: true }
  );
};

export const fetchBudgetTransactions = async (workspaceId: string, orgId: string, budgetId: string) => {
  const base = collection(
    db,
    'workspaces',
    workspaceId,
    'organizations',
    orgId,
    'budgets',
    budgetId,
    'transactions'
  );
  const snapshot = await getDocs(query(base, orderBy('createdAt', 'desc')));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
    return {
      id: docSnap.id,
      description: data.description as string | undefined,
      amount: (data.amount ?? 0) as number,
      createdAt: createdAt?.toDate?.() ?? new Date()
    };
  });
};

