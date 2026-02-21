import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchCashFlow, fetchExpensesByCategory, fetchProfitLoss, fetchTaxSummary } from '../../services/finance/reportsService';
import { useFinanceScope } from '../useFinanceScope';

type Filters = { startDate: string; endDate: string };

export const useReports = (filters: Filters) => {
  const scope = useFinanceScope();
  const range = {
    start: dayjs(filters.startDate),
    end: dayjs(filters.endDate)
  };

  return useQuery({
    queryKey: ['finance-reports', scope.businessId, filters.startDate, filters.endDate],
    enabled: scope.canManage && !scope.loading && Boolean(scope.businessId),
    queryFn: async () => {
      const businessId = scope.businessId!;
      const [profitLoss, cashFlow, expensesByCategory, taxSummary] = await Promise.all([
        fetchProfitLoss(businessId, range),
        fetchCashFlow(businessId, range),
        fetchExpensesByCategory(businessId, range),
        fetchTaxSummary(businessId, range)
      ]);

      return {
        profitLoss,
        cashFlow,
        expensesByCategory,
        taxSummary
      };
    }
  });
};
