import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchBudgets } from '../../services/finance/budgetsService';
import { useFinanceScope } from '../useFinanceScope';

type DateRange = { start: dayjs.Dayjs; end: dayjs.Dayjs };

export const useBudgets = ({ range }: { range: DateRange }) => {
  const scope = useFinanceScope();

  return useQuery({
    queryKey: ['finance-budgets', scope.businessId, range.start.valueOf(), range.end.valueOf()],
    enabled: scope.canView && !scope.loading && Boolean(scope.businessId),
    queryFn: async () => {
      const businessId = scope.businessId!;
      const budgets = await fetchBudgets(businessId, range);
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

