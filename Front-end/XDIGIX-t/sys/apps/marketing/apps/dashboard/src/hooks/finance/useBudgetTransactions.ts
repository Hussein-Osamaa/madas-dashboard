import { useQuery } from '@tanstack/react-query';
import { fetchBudgetTransactions } from '../../services/finance/budgetsService';
import { useFinanceScope } from '../useFinanceScope';

export const useBudgetTransactions = (budgetId: string | null) => {
  const scope = useFinanceScope();

  return useQuery({
    queryKey: ['finance-budget-transactions', scope.businessId, budgetId],
    enabled: scope.canView && !scope.loading && Boolean(scope.businessId && budgetId),
    queryFn: async () => {
      if (!budgetId) {
        return [];
      }
      return fetchBudgetTransactions(scope.businessId!, budgetId);
    },
    initialData: [] as Awaited<ReturnType<typeof fetchBudgetTransactions>>
  });
};

