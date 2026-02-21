import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { computeAccountTotals, fetchAccounts, fetchRecentTransfers } from '../../services/finance/accountsService';
import { useFinanceScope } from '../useFinanceScope';

type DateRange = { start: dayjs.Dayjs; end: dayjs.Dayjs };

export const useAccounts = ({ range }: { range: DateRange }) => {
  const scope = useFinanceScope();

  return useQuery({
    queryKey: ['finance-accounts', scope.businessId, range.start.valueOf(), range.end.valueOf()],
    enabled: scope.canView && !scope.loading && Boolean(scope.businessId),
    queryFn: async () => {
      const businessId = scope.businessId!;
      const accounts = await fetchAccounts(businessId);
      const totals = computeAccountTotals(accounts);
      const transfers = await fetchRecentTransfers(businessId);

      return {
        accounts,
        totals,
        recentTransfers: transfers
      };
    }
  });
};

