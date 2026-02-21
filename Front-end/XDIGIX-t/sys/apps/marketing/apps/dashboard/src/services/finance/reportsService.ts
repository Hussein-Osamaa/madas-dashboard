import { collection, getDocs, orderBy, query, Timestamp, where, db } from '../../lib/firebase';
import dayjs from 'dayjs';

type RangeFilter = { start: dayjs.Dayjs; end: dayjs.Dayjs };

const reportsCollection = (businessId: string, report: string, sub: string) =>
  collection(db, 'businesses', businessId, 'finance_reports', report, sub);

export const fetchProfitLoss = async (businessId: string, range: RangeFilter) => {
  const snapshot = await getDocs(
    query(
      reportsCollection(businessId, 'profit_loss', 'snapshots'),
      where('periodStart', '>=', Timestamp.fromDate(range.start.toDate())),
      where('periodEnd', '<=', Timestamp.fromDate(range.end.toDate())),
      orderBy('periodEnd', 'desc')
    )
  );
  const latest = snapshot.docs[0]?.data();
  if (!latest) {
    return null;
  }
  return {
    revenue: latest.revenue ?? 0,
    costOfGoods: latest.costOfGoods ?? 0,
    operatingExpenses: latest.operatingExpenses ?? 0,
    netProfit: latest.netProfit ?? 0
  };
};

export const fetchCashFlow = async (businessId: string, range: RangeFilter) => {
  const snapshot = await getDocs(
    query(
      reportsCollection(businessId, 'cash_flow', 'entries'),
      where('date', '>=', Timestamp.fromDate(range.start.toDate())),
      where('date', '<=', Timestamp.fromDate(range.end.toDate())),
      orderBy('date', 'asc')
    )
  );
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      label: dayjs(data.date?.toDate?.() ?? new Date()).format('MMM DD'),
      inflow: data.inflow ?? 0,
      outflow: data.outflow ?? 0,
      net: (data.inflow ?? 0) - (data.outflow ?? 0)
    };
  });
};

export const fetchExpensesByCategory = async (businessId: string, range: RangeFilter) => {
  const snapshot = await getDocs(
    query(
      reportsCollection(businessId, 'expenses_by_category', 'entries'),
      where('month', '>=', range.start.format('YYYY-MM')),
      where('month', '<=', range.end.format('YYYY-MM'))
    )
  );

  const aggregate = new Map<string, number>();
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const category = data.category ?? 'uncategorized';
    const amount = data.amount ?? 0;
    aggregate.set(category, (aggregate.get(category) ?? 0) + amount);
  });

  return Array.from(aggregate.entries()).map(([category, amount]) => ({ category, amount }));
};

export const fetchTaxSummary = async (businessId: string, range: RangeFilter) => {
  const snapshot = await getDocs(
    query(
      reportsCollection(businessId, 'tax_summary', 'entries'),
      where('periodStart', '>=', Timestamp.fromDate(range.start.toDate())),
      where('periodEnd', '<=', Timestamp.fromDate(range.end.toDate())),
      orderBy('periodEnd', 'desc')
    )
  );
  const latest = snapshot.docs[0]?.data();
  if (!latest) {
    return null;
  }
  return {
    collected: latest.collected ?? 0,
    payable: latest.payable ?? 0,
    adjustments: latest.adjustments ?? 0
  };
};

