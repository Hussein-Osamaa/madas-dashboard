import { useQuery } from '@tanstack/react-query';
import { firestoreGet } from '../lib/api';
import { useBusiness } from '../contexts/BusinessContext';
import type { DashboardStats } from '../types';

const DEFAULT_STATS: DashboardStats = {
  totalSales: 0,
  orders: 0,
  customers: 0,
  products: 0,
};

export const useDashboardStats = () => {
  const { businessId } = useBusiness();

  return useQuery({
    queryKey: ['dashboard-stats', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const data = await firestoreGet<Partial<DashboardStats>>(
        `businesses/${businessId}/stats/dashboard`
      );
      if (!data) return DEFAULT_STATS;
      return {
        totalSales: Number(data.totalSales) || 0,
        orders: Number(data.orders) || 0,
        customers: Number(data.customers) || 0,
        products: Number(data.products) || 0,
      };
    },
  });
};
