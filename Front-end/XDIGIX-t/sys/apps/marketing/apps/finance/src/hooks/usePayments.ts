import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchPayments } from '../services/financeService';
import { useTenant } from '../context/TenantProvider';

export type PaymentsFilters = {
  range: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  method?: string;
  status?: string;
};

export const usePayments = (filters: PaymentsFilters) => {
  const tenant = useTenant();

  return useQuery({
    queryKey: [
      'finance-payments',
      tenant.workspaceId,
      tenant.orgId,
      filters.range.start.valueOf(),
      filters.range.end.valueOf(),
      filters.method,
      filters.status
    ],
    enabled: !tenant.loading,
    queryFn: () =>
      fetchPayments(tenant.workspaceId, tenant.orgId, filters.range, {
        method: filters.method,
        status: filters.status
      })
  });
};

