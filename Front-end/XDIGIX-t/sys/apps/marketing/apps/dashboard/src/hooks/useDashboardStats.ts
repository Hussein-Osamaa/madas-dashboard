import { db, doc, getDoc } from '../lib/firebase';
import { useQuery } from '@tanstack/react-query';

export type DashboardStats = {
  totalSales: number;
  orders: number;
  customers: number;
  products: number;
};

const DEFAULT_STATS: DashboardStats = {
  totalSales: 0,
  orders: 0,
  customers: 0,
  products: 0
};

export const useDashboardStats = (businessId?: string) =>
  useQuery({
    queryKey: ['dashboard', 'stats', businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      if (!businessId) {
        return DEFAULT_STATS;
      }

      const statsRef = doc(db, 'businesses', businessId, 'stats', 'dashboard');
      const snapshot = await getDoc(statsRef);

      if (!snapshot.exists()) {
        return DEFAULT_STATS;
      }

      const data = snapshot.data() as Partial<DashboardStats>;
      return {
        totalSales: Number(data.totalSales) || 0,
        orders: Number(data.orders) || 0,
        customers: Number(data.customers) || 0,
        products: Number(data.products) || 0
      };
    }
  });

