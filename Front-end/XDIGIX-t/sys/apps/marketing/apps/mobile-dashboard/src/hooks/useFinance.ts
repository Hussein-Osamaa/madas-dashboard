import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firestoreQuery, firestoreAdd } from '../lib/api';
import { useBusiness } from '../contexts/BusinessContext';
import type { Expense, Deposit, FinanceOverview, Order } from '../types';

export const useFinanceOverview = () => {
  const { businessId } = useBusiness();

  return useQuery({
    queryKey: ['finance-overview', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const [orderDocs, expenseDocs, depositDocs] = await Promise.all([
        firestoreQuery<Omit<Order, 'id'>>(`businesses/${businessId}/orders`, []),
        firestoreQuery<Omit<Expense, 'id'>>(`businesses/${businessId}/expenses`, []),
        firestoreQuery<Omit<Deposit, 'id'>>(`businesses/${businessId}/deposits`, []),
      ]);

      const totalSales = orderDocs.reduce((sum, d) => sum + (d.data.total || 0), 0);
      const totalExpenses = expenseDocs.reduce((sum, d) => sum + (d.data.amount || 0), 0);
      const totalDeposits = depositDocs.reduce((sum, d) => sum + (d.data.amount || 0), 0);

      return {
        totalSales,
        totalExpenses,
        netProfit: totalSales - totalExpenses,
        totalDeposits,
      } as FinanceOverview;
    },
  });
};

export const useExpenses = () => {
  const { businessId } = useBusiness();

  return useQuery({
    queryKey: ['expenses', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const docs = await firestoreQuery<Omit<Expense, 'id'>>(
        `businesses/${businessId}/expenses`,
        [{ type: 'orderBy', field: 'date', direction: 'desc' }]
      );
      return docs.map((d) => ({ id: d.id, ...d.data })) as Expense[];
    },
  });
};

export const useDeposits = () => {
  const { businessId } = useBusiness();

  return useQuery({
    queryKey: ['deposits', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const docs = await firestoreQuery<Omit<Deposit, 'id'>>(
        `businesses/${businessId}/deposits`,
        [{ type: 'orderBy', field: 'date', direction: 'desc' }]
      );
      return docs.map((d) => ({ id: d.id, ...d.data })) as Deposit[];
    },
  });
};

export const useAddExpense = () => {
  const { businessId } = useBusiness();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
      await firestoreAdd(`businesses/${businessId}/expenses`, {
        ...expense,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', businessId] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview', businessId] });
    },
  });
};

export const useAddDeposit = () => {
  const { businessId } = useBusiness();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deposit: Omit<Deposit, 'id' | 'createdAt'>) => {
      await firestoreAdd(`businesses/${businessId}/deposits`, {
        ...deposit,
        createdAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deposits', businessId] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview', businessId] });
    },
  });
};
