import { useQuery } from '@tanstack/react-query';
import { fetchWarehouses, Warehouse } from '../services/warehousesService';

export const useWarehouses = (businessId?: string) => {
  const query = useQuery({
    queryKey: ['warehouses', businessId],
    enabled: Boolean(businessId),
    queryFn: () => fetchWarehouses(businessId!),
    initialData: [] as Warehouse[],
    initialDataUpdatedAt: 0
  });

  return {
    warehouses: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch
  };
};

export type { Warehouse };

