import { collection, doc, getDocs, orderBy, query, setDoc, Timestamp, where, db } from '../../lib/firebase';
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

const budgetsCollection = (businessId: string) => collection(db, 'businesses', businessId, 'finance_budgets');

export const fetchBudgets = async (businessId: string, range: DateRange) => {
  const snapshot = await getDocs(
    query(
      budgetsCollection(businessId),
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
  businessId: string,
  payload: {
    name: string;
    category: string;
    allocated: number;
    startDate: Date;
    endDate: Date;
    notes?: string;
  }
) => {
  const ref = doc(budgetsCollection(businessId));
  await setDoc(ref, {
    ...payload,
    spent: 0,
    startDate: Timestamp.fromDate(payload.startDate),
    endDate: Timestamp.fromDate(payload.endDate)
  });
  return ref.id;
};

export const updateBudgetAllocation = async (businessId: string, budgetId: string, allocated: number, endDate: Date) => {
  const ref = doc(db, 'businesses', businessId, 'finance_budgets', budgetId);
  await setDoc(
    ref,
    {
      allocated,
      endDate: Timestamp.fromDate(endDate)
    },
    { merge: true }
  );
};

export const fetchBudgetTransactions = async (businessId: string, budgetId: string) => {
  const base = collection(db, 'businesses', businessId, 'finance_budgets', budgetId, 'transactions');
  const snapshot = await getDocs(query(base, orderBy('createdAt', 'desc')));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      description: data.description,
      amount: data.amount ?? 0,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
    };
  });
};

