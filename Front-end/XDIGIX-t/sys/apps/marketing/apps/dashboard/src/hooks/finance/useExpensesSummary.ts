import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchExpenses, fetchVendors } from '../../services/finance/expensesService';
import { useFinanceScope } from '../useFinanceScope';

type Filters = { vendor?: string; category?: string; status?: string };
type DateRange = { start: dayjs.Dayjs; end: dayjs.Dayjs };

function toDate(v: unknown): Date | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v;
  if (typeof v === 'string') { const d = new Date(v); return Number.isNaN(d.getTime()) ? undefined : d; }
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'object' && v !== null) {
    const sec = (v as { seconds?: number; _seconds?: number }).seconds ?? (v as { _seconds?: number })._seconds;
    if (typeof sec === 'number') return new Date(sec * 1000);
  }
  return undefined;
}

const aggregateTotals = (expenses: Awaited<ReturnType<typeof fetchExpenses>>) => {
  const total = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const average = expenses.length ? total / expenses.length : 0;

  return {
    total,
    average,
    delta: 12, // Placeholder compared to previous period – implement actual comparison later
    vendorsActive: new Set(expenses.map((expense) => expense.vendorName).filter(Boolean)).size,
    vendorsNew: 0,
    formattedTotal: (currency: string) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(total),
    formattedAverage: (currency: string) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(average)
  };
};

export const useExpensesSummary = ({ range, filters }: { range: DateRange; filters: Filters }) => {
  const scope = useFinanceScope();

  return useQuery({
    queryKey: [
      'finance-expenses-summary',
      scope.businessId,
      range.start.valueOf(),
      range.end.valueOf(),
      filters.vendor,
      filters.category,
      filters.status
    ],
    enabled: scope.canView && !scope.loading && Boolean(scope.businessId),
    queryFn: async () => {
      const businessId = scope.businessId!;
      const [expensesRaw, vendors] = await Promise.all([
        fetchExpenses(businessId, range, filters),
        fetchVendors(businessId)
      ]);

      const expenses = expensesRaw.map((expense) => ({
        id: expense.id,
        vendorName: expense.vendorName,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        status: expense.status,
        currency: expense.currency,
        createdAt: toDate(expense.createdAt) ?? new Date(0)
      }));

      return {
        expenses,
        vendors,
        totals: aggregateTotals(expensesRaw)
      };
    }
  });
};

