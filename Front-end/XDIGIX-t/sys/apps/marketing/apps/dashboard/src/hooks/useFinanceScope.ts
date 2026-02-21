import { useMemo } from 'react';
import { useBusiness } from '../contexts/BusinessContext';

export const useFinanceScope = () => {
  const business = useBusiness();

  const result = useMemo(
    () => ({
      businessId: business.businessId,
      businessName: business.businessName,
      currency: (business.plan as { currency?: string } | undefined)?.currency ?? 'USD',
      loading: business.loading,
      permissions: business.permissions?.finance ?? [],
      canView: business.permissions?.finance?.includes('view') ?? false,
      canEdit: business.permissions?.finance?.includes('edit') ?? false,
      canExport: business.permissions?.finance?.includes('export') ?? false,
      canReports: business.permissions?.finance?.includes('reports') ?? false,
      canManage: business.permissions?.finance?.includes('reports') ?? false // Alias for canReports
    }),
    [business.businessId, business.businessName, business.loading, business.permissions?.finance, business.plan]
  );

  return result;
};

export type FinanceScope = ReturnType<typeof useFinanceScope>;

