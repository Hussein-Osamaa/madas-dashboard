import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchExpenses, fetchVendors } from '../services/expensesService';
import { useTenant } from '../context/TenantProvider';

type Filters = { vendor?: string; category?: string; status?: string };
type DateRange = { start: dayjs.Dayjs; end: dayjs.Dayjs };

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
  const tenant = useTenant();

  return useQuery({
    queryKey: [
      'finance-expenses-summary',
      tenant.workspaceId,
      tenant.orgId,
      range.start.valueOf(),
      range.end.valueOf(),
      filters.vendor,
      filters.category,
      filters.status
    ],
    enabled: !tenant.loading,
    queryFn: async () => {
      const [expensesRaw, vendors] = await Promise.all([
        fetchExpenses(tenant.workspaceId, tenant.orgId, range, filters),
        fetchVendors(tenant.workspaceId, tenant.orgId)
      ]);

      const expenses = expensesRaw.map((expense) => ({
        id: expense.id,
        vendorName: expense.vendorName,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        status: expense.status,
        currency: expense.currency,
        createdAt: expense.createdAt.toDate()
      }));

      return {
        expenses,
        vendors,
        totals: aggregateTotals(expensesRaw)
      };
    }
  });
};


