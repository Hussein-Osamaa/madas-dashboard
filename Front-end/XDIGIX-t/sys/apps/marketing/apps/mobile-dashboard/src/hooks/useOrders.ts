import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firestoreQuery, firestoreUpdate } from '../lib/api';
import { useBusiness } from '../contexts/BusinessContext';
import type { Order, OrderStatus } from '../types';

export const useOrders = () => {
  const { businessId } = useBusiness();

  return useQuery({
    queryKey: ['orders', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const docs = await firestoreQuery<Omit<Order, 'id'>>(
        `businesses/${businessId}/orders`,
        [{ type: 'orderBy', field: 'date', direction: 'desc' }]
      );
      return docs.map((d) => ({ id: d.id, ...d.data })) as Order[];
    },
  });
};

export const useUpdateOrderStatus = () => {
  const { businessId } = useBusiness();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      await firestoreUpdate(`businesses/${businessId}/orders/${orderId}`, {
        status,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', businessId] });
    },
  });
};
