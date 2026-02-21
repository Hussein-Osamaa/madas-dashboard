import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { getPastMonths } from '../lib/format';
import { fetchExpenses, fetchOrders, fetchRecentTransactions, fetchTransactions } from '../services/financeService';
import { useTenant } from '../context/TenantProvider';

export type OverviewFilters = {
  range: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  branch?: string;
  currency?: string;
};

dayjs.extend(isBetween);

export const useFinanceOverview = (filters: OverviewFilters) => {
  const tenant = useTenant();
  const { range, branch } = filters;

  return useQuery({
    queryKey: ['finance-overview', tenant.workspaceId, tenant.orgId, range.start.valueOf(), range.end.valueOf(), branch],
    enabled: !tenant.loading && Boolean(tenant.workspaceId && tenant.orgId),
    queryFn: async () => {
      const [orders, expenses, transactions, recentTransactions] = await Promise.all([
        fetchOrders(tenant.workspaceId, tenant.orgId, filters.range, branch),
        fetchExpenses(tenant.workspaceId, tenant.orgId, filters.range),
        fetchTransactions(tenant.workspaceId, tenant.orgId, filters.range, { type: 'all', method: 'all' }),
        fetchRecentTransactions(tenant.workspaceId, tenant.orgId)
      ]);

      const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const netProfit = totalSales - totalExpenses;

      const monthlySeries = getPastMonths(6).map((month) => {
        const monthOrders = orders.filter((order) =>
          dayjs(order.createdAt.toDate()).isBetween(month.start, month.end, null, '[]')
        );
        const monthExpenses = expenses.filter((expense) =>
          dayjs(expense.createdAt.toDate()).isBetween(month.start, month.end, null, '[]')
        );
        return {
          label: month.label,
          revenue: monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
          expenses: monthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
        };
      });

      const cashFlow = transactions.reduce(
        (acc, transaction) => {
          if (transaction.type === 'income') {
            acc.inflow += transaction.amount;
          } else if (transaction.type === 'expense') {
            acc.outflow += transaction.amount;
          }
          return acc;
        },
        { inflow: 0, outflow: 0 }
      );

      return {
        totals: {
          totalSales,
          totalExpenses,
          netProfit,
          cashFlowNet: cashFlow.inflow - cashFlow.outflow,
          inflow: cashFlow.inflow,
          outflow: cashFlow.outflow
        },
        charts: {
          revenueVsExpenses: monthlySeries,
          cashFlow: transactions.map((transaction) => ({
            date: dayjs(transaction.createdAt.toDate()).format('MMM D'),
            amount: transaction.type === 'income' ? transaction.amount : -transaction.amount
          }))
        },
        recentTransactions
      };
    }
  });
};

