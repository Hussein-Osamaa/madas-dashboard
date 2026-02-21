import { collection, getDocs, orderBy, query, Timestamp, where, db } from '../lib/firebase';
import dayjs from 'dayjs';

type RangeFilter = { start: dayjs.Dayjs; end: dayjs.Dayjs };

export const fetchProfitLoss = async (workspaceId: string, orgId: string, range: RangeFilter) => {
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'reports', 'profit_loss', 'snapshots');
  const snapshot = await getDocs(
    query(
      base,
      where('periodStart', '>=', Timestamp.fromDate(range.start.toDate())),
      where('periodEnd', '<=', Timestamp.fromDate(range.end.toDate())),
      orderBy('periodEnd', 'desc')
    )
  );
  const latest = snapshot.docs[0]?.data() as Record<string, unknown> | undefined;
  if (!latest) {
    return null;
  }
  return {
    revenue: (latest.revenue ?? 0) as number,
    costOfGoods: (latest.costOfGoods ?? 0) as number,
    operatingExpenses: (latest.operatingExpenses ?? 0) as number,
    netProfit: (latest.netProfit ?? 0) as number
  };
};

export const fetchCashFlow = async (workspaceId: string, orgId: string, range: RangeFilter) => {
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'reports', 'cash_flow', 'entries');
  const snapshot = await getDocs(
    query(
      base,
      where('date', '>=', Timestamp.fromDate(range.start.toDate())),
      where('date', '<=', Timestamp.fromDate(range.end.toDate())),
      orderBy('date', 'asc')
    )
  );
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const dateVal = data.date as { toDate?: () => Date } | undefined;
    return {
      label: dayjs(dateVal?.toDate?.() ?? new Date()).format('MMM DD'),
      inflow: (data.inflow ?? 0) as number,
      outflow: (data.outflow ?? 0) as number,
      net: ((data.inflow ?? 0) as number) - ((data.outflow ?? 0) as number)
    };
  });
};

export const fetchExpensesByCategory = async (workspaceId: string, orgId: string, range: RangeFilter) => {
  const base = collection(
    db,
    'workspaces',
    workspaceId,
    'organizations',
    orgId,
    'reports',
    'expenses_by_category',
    'entries'
  );
  const snapshot = await getDocs(
    query(
      base,
      where('month', '>=', range.start.format('YYYY-MM')),
      where('month', '<=', range.end.format('YYYY-MM'))
    )
  );

  const aggregate = new Map<string, number>();
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const category = (data.category ?? 'uncategorized') as string;
    const amount = (data.amount ?? 0) as number;
    aggregate.set(category, (aggregate.get(category) ?? 0) + amount);
  });

  return Array.from(aggregate.entries()).map(([category, amount]) => ({ category, amount }));
};

export const fetchTaxSummary = async (workspaceId: string, orgId: string, range: RangeFilter) => {
  const base = collection(db, 'workspaces', workspaceId, 'organizations', orgId, 'reports', 'tax_summary', 'entries');
  const snapshot = await getDocs(
    query(
      base,
      where('periodStart', '>=', Timestamp.fromDate(range.start.toDate())),
      where('periodEnd', '<=', Timestamp.fromDate(range.end.toDate())),
      orderBy('periodEnd', 'desc')
    )
  );
  const latest = snapshot.docs[0]?.data() as Record<string, unknown> | undefined;
  if (!latest) {
    return null;
  }
  return {
    collected: (latest.collected ?? 0) as number,
    payable: (latest.payable ?? 0) as number,
    adjustments: (latest.adjustments ?? 0) as number
  };
};

