import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  Product,
  updateProduct
} from '../services/productsService';

const aggregateTotals = (products: Product[]) => {
  const totals = {
    totalProducts: products.length,
    totalStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  };

  products.forEach((product) => {
    const locationValues = Object.values(product.stockByLocation ?? {});
    const sizeValues = Object.values(product.stock ?? {});

    const hasLocation = locationValues.length > 0;
    const hasSizes = sizeValues.length > 0;

    const sum = hasLocation
      ? locationValues.reduce((acc, qty) => acc + qty, 0)
      : hasSizes
      ? sizeValues.reduce((acc, qty) => acc + qty, 0)
      : 0;

    const minStockValues = hasLocation ? locationValues : hasSizes ? sizeValues : [sum];
    const minStock =
      minStockValues.length > 0
        ? minStockValues.reduce((acc, qty) => Math.min(acc, qty), Number.POSITIVE_INFINITY)
        : sum;

    totals.totalStock += sum;
    totals.totalValue += (product.price ?? 0) * sum;

    if (sum <= 0) {
      totals.outOfStock += 1;
    } else if (minStock <= (product.lowStockAlert ?? 10)) {
      totals.lowStock += 1;
    }
  });

  return totals;
};

const productsKey = (businessId?: string) => ['products', businessId] as const;

export const useProducts = (businessId?: string) => {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: productsKey(businessId),
    enabled: Boolean(businessId),
    queryFn: () => fetchProducts(businessId!),
    initialData: [] as Product[]
  });

  const createMutation = useMutation({
    mutationFn: (payload: Omit<Product, 'id'>) => createProduct(businessId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKey(businessId) });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: Partial<Omit<Product, 'id'>> }) =>
      updateProduct(businessId!, productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKey(businessId) });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => deleteProduct(businessId!, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKey(businessId) });
    }
  });

  const base = productsQuery.data ?? [];
  const stats = useMemo(() => {
    return aggregateTotals(base);
  }, [base]);

  return {
    products: base,
    isLoading: productsQuery.isLoading,
    stats,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending
  };
};

export const calculateInventoryTotals = (products: Product[]) => aggregateTotals(products);

