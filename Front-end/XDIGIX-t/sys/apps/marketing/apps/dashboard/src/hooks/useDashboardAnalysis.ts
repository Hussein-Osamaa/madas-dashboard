import { db, doc, getDoc } from '../lib/firebase';
import { useQuery } from '@tanstack/react-query';

export type TopProduct = {
  name: string;
  sales: number;
};

export type CategorySales = {
  category: string;
  sales: number;
};

type DashboardAnalysis = {
  topProducts: TopProduct[];
  salesByCategory: CategorySales[];
};

const DEFAULT_ANALYSIS: DashboardAnalysis = {
  topProducts: [],
  salesByCategory: []
};

export const useDashboardAnalysis = (businessId?: string) =>
  useQuery({
    queryKey: ['dashboard', 'analysis', businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      if (!businessId) {
        return DEFAULT_ANALYSIS;
      }

      const [topProductsSnap, salesByCategorySnap] = await Promise.all([
        getDoc(doc(db, 'businesses', businessId, 'analysis', 'topProducts')),
        getDoc(doc(db, 'businesses', businessId, 'analysis', 'salesByCategory'))
      ]);

      const topProducts = (topProductsSnap.data()?.list as TopProduct[] | undefined) ?? [];
      const salesByCategory = (salesByCategorySnap.data()?.list as CategorySales[] | undefined) ?? [];

      return {
        topProducts,
        salesByCategory
      };
    },
    initialData: DEFAULT_ANALYSIS
  });

