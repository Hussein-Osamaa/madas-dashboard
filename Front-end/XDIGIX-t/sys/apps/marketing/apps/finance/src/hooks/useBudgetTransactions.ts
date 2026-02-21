import { useQuery } from '@tanstack/react-query';
import { fetchBudgetTransactions } from '../services/budgetsService';
import { useTenant } from '../context/TenantProvider';

export const useBudgetTransactions = (budgetId: string | null) => {
  const tenant = useTenant();

  return useQuery({
    queryKey: ['finance-budget-transactions', tenant.workspaceId, tenant.orgId, budgetId],
    enabled: !tenant.loading && Boolean(budgetId),
    queryFn: async () => {
      if (!budgetId) {
        return [];
      }
      return fetchBudgetTransactions(tenant.workspaceId, tenant.orgId, budgetId);
    },
    initialData: [] as Awaited<ReturnType<typeof fetchBudgetTransactions>>
  });
};


