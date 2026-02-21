import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchBudgets } from '../services/budgetsService';
import { useTenant } from '../context/TenantProvider';

type DateRange = { start: dayjs.Dayjs; end: dayjs.Dayjs };

export const useBudgets = ({ range }: { range: DateRange }) => {
  const tenant = useTenant();

  return useQuery({
    queryKey: ['finance-budgets', tenant.workspaceId, tenant.orgId, range.start.valueOf(), range.end.valueOf()],
    enabled: !tenant.loading,
    queryFn: async () => {
      const budgets = await fetchBudgets(tenant.workspaceId, tenant.orgId, range);
      const totals = budgets.reduce(
        (acc, budget) => {
          acc.totalAllocated += budget.allocated;
          acc.totalUsed += budget.spent;
          if (budget.status === 'exceeded') {
            acc.overBudgetCount += 1;
          }
          return acc;
        },
        { totalAllocated: 0, totalUsed: 0, overBudgetCount: 0 }
      );

      const chart = budgets.map((budget) => ({
        category: budget.category,
        allocated: budget.allocated,
        spent: budget.spent
      }));

      return {
        budgets,
        totals,
        chart
      };
    }
  });
};

