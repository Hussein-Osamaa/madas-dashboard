import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { computeAccountTotals, fetchAccounts, fetchRecentTransfers } from '../services/accountsService';
import { useTenant } from '../context/TenantProvider';

type DateRange = { start: dayjs.Dayjs; end: dayjs.Dayjs };

export const useAccounts = ({ range }: { range: DateRange }) => {
  const tenant = useTenant();

  return useQuery({
    queryKey: ['finance-accounts', tenant.workspaceId, tenant.orgId, range.start.valueOf(), range.end.valueOf()],
    enabled: !tenant.loading,
    queryFn: async () => {
      const accounts = await fetchAccounts(tenant.workspaceId, tenant.orgId);
      const totals = computeAccountTotals(accounts);
      const transfers = await fetchRecentTransfers(tenant.workspaceId, tenant.orgId);

      return {
        accounts,
        totals,
        recentTransfers: transfers
      };
    }
  });
};


