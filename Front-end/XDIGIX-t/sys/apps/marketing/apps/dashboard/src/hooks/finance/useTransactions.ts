import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchTransactions } from '../../services/finance/financeService';
import { useFinanceScope } from '../useFinanceScope';

export type TransactionsFilters = {
  range: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  type?: string;
  method?: string;
};

export const useTransactions = (filters: TransactionsFilters) => {
  const scope = useFinanceScope();

  return useQuery({
    queryKey: [
      'finance-transactions',
      scope.businessId,
      filters.range.start.valueOf(),
      filters.range.end.valueOf(),
      filters.type,
      filters.method
    ],
    enabled: scope.canView && !scope.loading && Boolean(scope.businessId),
    queryFn: () =>
      fetchTransactions(scope.businessId!, filters.range, {
        type: filters.type,
        method: filters.method
      })
  });
};

