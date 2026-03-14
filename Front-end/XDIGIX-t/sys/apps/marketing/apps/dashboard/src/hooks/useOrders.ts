import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOrder, deleteOrder, fetchOrders, Order, OrderDraft, updateOrder } from '../services/ordersService';

const ordersKey = (businessId?: string) => ['orders', businessId] as const;

export const useOrders = (businessId?: string) => {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ordersKey(businessId),
    enabled: Boolean(businessId),
    queryFn: () => fetchOrders(businessId!),
    initialData: [] as Order[],
    initialDataUpdatedAt: 0
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ordersKey(businessId) }).catch((error) => {
      console.error('[useOrders] Failed to invalidate orders query', error);
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Omit<OrderDraft, 'id'>) => createOrder(businessId!, payload),
    onSuccess: invalidate
  });

  const updateMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: Partial<OrderDraft> }) =>
      updateOrder(businessId!, orderId, payload),
    onSuccess: invalidate
  });

  const deleteMutation = useMutation({
    mutationFn: (orderId: string) => deleteOrder(businessId!, orderId),
    onSuccess: invalidate
  });

  const orders = useMemo(() => {
    const list = ordersQuery.data ?? [];
    return [...list].sort((a, b) => {
      const dateA = a.date ?? a.createdAt;
      const dateB = b.date ?? b.createdAt;
      const tA = dateA instanceof Date ? dateA.getTime() : dateA ? new Date(dateA as unknown as string).getTime() : 0;
      const tB = dateB instanceof Date ? dateB.getTime() : dateB ? new Date(dateB as unknown as string).getTime() : 0;
      return tB - tA; // newest first
    });
  }, [ordersQuery.data]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((order) => order.status === 'pending').length;
    const preparingForPickup = orders.filter((order) => order.status === 'preparing_for_pickup').length;
    const readyForPickup = orders.filter((order) => order.status === 'ready_for_pickup').length;
    const shipped = orders.filter((order) => order.status === 'shipped').length;
    const processing = orders.filter((order) => order.status === 'processing').length;
    const delivered = orders.filter((order) => order.status === 'delivered').length;
    const completed = orders.filter((order) => order.status === 'completed').length;
    const returned = orders.filter((order) => order.status === 'returned').length;
    const damaged = orders.filter((order) => order.status === 'damaged').length;
    const cancelled = orders.filter((order) => order.status === 'cancelled').length;
    const revenue = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);

    return { total, pending, preparingForPickup, readyForPickup, shipped, processing, delivered, completed, returned, damaged, cancelled, revenue };
  }, [orders]);

  return {
    orders,
    stats,
    isLoading: ordersQuery.isLoading,
    createOrder: createMutation.mutateAsync,
    updateOrder: updateMutation.mutateAsync,
    deleteOrder: deleteMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending
  };
};

export type { Order, OrderDraft };

