import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchTransactions } from '../services/financeService';
import { useTenant } from '../context/TenantProvider';

export type TransactionsFilters = {
  range: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  type?: string;
  method?: string;
};

export const useTransactions = (filters: TransactionsFilters) => {
  const tenant = useTenant();

  return useQuery({
    queryKey: [
      'finance-transactions',
      tenant.workspaceId,
      tenant.orgId,
      filters.range.start.valueOf(),
      filters.range.end.valueOf(),
      filters.type,
      filters.method
    ],
    enabled: !tenant.loading,
    queryFn: () =>
      fetchTransactions(tenant.workspaceId, tenant.orgId, filters.range, {
        type: filters.type,
        method: filters.method
      })
  });
};

