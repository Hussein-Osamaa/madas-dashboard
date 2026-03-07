import { useQuery } from '@tanstack/react-query';
import { firestoreQuery } from '../lib/api';
import { useBusiness } from '../contexts/BusinessContext';
import type { Product } from '../types';

export const useProducts = () => {
  const { businessId } = useBusiness();

  return useQuery({
    queryKey: ['products', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const docs = await firestoreQuery<Omit<Product, 'id'>>(
        `businesses/${businessId}/products`,
        [{ type: 'orderBy', field: 'name', direction: 'asc' }]
      );
      return docs.map((d) => ({ id: d.id, ...d.data })) as Product[];
    },
  });
};

export function getTotalStock(product: Product): number {
  if (!product.stock) return 0;
  return Object.values(product.stock).reduce((sum, qty) => sum + (qty || 0), 0);
}

export function isLowStock(product: Product): boolean {
  const total = getTotalStock(product);
  const threshold = product.lowStockAlert ?? 5;
  return total > 0 && total <= threshold;
}

export function isOutOfStock(product: Product): boolean {
  return getTotalStock(product) === 0;
}
