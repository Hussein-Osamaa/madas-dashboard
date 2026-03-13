import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLinkedInventory, type LinkedInventoryResponse } from '../lib/backend-adapter';
import { onWarehouseUpdate } from '../lib/realtimeSocket';

const useBackend = !!import.meta.env.VITE_API_BACKEND_URL;

/** Only fetch when backend is used and business is resolved (avoids 403s before tenant is ready). */
export function useLinkedInventory(enabledWhenBusinessReady = true): {
  data: LinkedInventoryResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!useBackend || !enabledWhenBusinessReady) return;
    const unsub = onWarehouseUpdate((payload) => {
      if (payload.type === 'products') {
        queryClient.invalidateQueries({ queryKey: ['linkedInventory'] });
      }
    });
    return unsub;
  }, [enabledWhenBusinessReady, queryClient]);

  const query = useQuery({
    queryKey: ['linkedInventory'],
    queryFn: fetchLinkedInventory,
    enabled: useBackend && enabledWhenBusinessReady,
    staleTime: 5_000,
    retry: 1
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch
  };
}
