import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { useTenant } from '../context/TenantProvider';
import { fetchCashFlow, fetchExpensesByCategory, fetchProfitLoss, fetchTaxSummary } from '../services/reportsService';

type Filters = { range: string };

dayjs.extend(quarterOfYear);

const resolveRange = (rangeId: string) => {
  switch (rangeId) {
    case '60d':
      return { start: dayjs().subtract(59, 'day'), end: dayjs() };
    case 'quarter':
      return { start: dayjs().startOf('quarter'), end: dayjs().endOf('quarter') };
    case 'ytd':
      return { start: dayjs().startOf('year'), end: dayjs() };
    case '30d':
    default:
      return { start: dayjs().subtract(29, 'day'), end: dayjs() };
  }
};

export const useReports = (filters: Filters) => {
  const tenant = useTenant();
  const range = resolveRange(filters.range);

  return useQuery({
    queryKey: ['finance-reports', tenant.workspaceId, tenant.orgId, filters.range],
    enabled: !tenant.loading,
    queryFn: async () => {
      const [profitLoss, cashFlow, expensesByCategory, taxSummary] = await Promise.all([
        fetchProfitLoss(tenant.workspaceId, tenant.orgId, range),
        fetchCashFlow(tenant.workspaceId, tenant.orgId, range),
        fetchExpensesByCategory(tenant.workspaceId, tenant.orgId, range),
        fetchTaxSummary(tenant.workspaceId, tenant.orgId, range)
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

