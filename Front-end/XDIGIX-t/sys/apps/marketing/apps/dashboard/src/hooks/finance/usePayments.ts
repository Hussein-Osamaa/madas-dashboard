import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchPayments } from '../../services/finance/financeService';
import { useFinanceScope } from '../useFinanceScope';

export type PaymentsFilters = {
  range: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  method?: string;
  status?: string;
};

export const usePayments = (filters: PaymentsFilters) => {
  const scope = useFinanceScope();

  return useQuery({
    queryKey: [
      'finance-payments',
      scope.businessId,
      filters.range.start.valueOf(),
      filters.range.end.valueOf(),
      filters.method,
      filters.status
    ],
    enabled: scope.canView && !scope.loading && Boolean(scope.businessId),
    queryFn: () =>
      fetchPayments(scope.businessId!, filters.range, {
        method: filters.method,
        status: filters.status
      })
  });
};

