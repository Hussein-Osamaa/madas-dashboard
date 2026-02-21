import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  Customer,
  CustomerDraft,
  updateCustomer
} from '../services/customersService';

const customersKey = (businessId?: string) => ['customers', businessId] as const;

export const useCustomers = (businessId?: string) => {
  const queryClient = useQueryClient();

  const customersQuery = useQuery({
    queryKey: customersKey(businessId),
    enabled: Boolean(businessId),
    queryFn: () => fetchCustomers(businessId!),
    initialData: [] as Customer[]
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: customersKey(businessId) }).catch((error) => {
      console.error('[useCustomers] Failed to invalidate cache', error);
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Omit<CustomerDraft, 'id'>) => createCustomer(businessId!, payload),
    onSuccess: invalidate
  });

  const updateMutation = useMutation({
    mutationFn: ({ customerId, payload }: { customerId: string; payload: Partial<CustomerDraft> }) =>
      updateCustomer(businessId!, customerId, payload),
    onSuccess: invalidate
  });

  const deleteMutation = useMutation({
    mutationFn: (customerId: string) => deleteCustomer(businessId!, customerId),
    onSuccess: invalidate
  });

  const customers = customersQuery.data ?? [];

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((customer) => customer.status === 'active').length;
    const vip = customers.filter((customer) => customer.status === 'vip').length;
    const newThisMonth = customers.filter((customer) => {
      if (!customer.createdAt) return false;
      const diff = Date.now() - customer.createdAt.getTime();
      return diff <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    const totalRevenue = customers.reduce((sum, customer) => sum + (customer.totalSpent ?? 0), 0);

    return { total, active, vip, newThisMonth, totalRevenue };
  }, [customers]);

  return {
    customers,
    stats,
    isLoading: customersQuery.isLoading,
    createCustomer: createMutation.mutateAsync,
    updateCustomer: updateMutation.mutateAsync,
    deleteCustomer: deleteMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending
  };
};

export type { Customer, CustomerDraft };

