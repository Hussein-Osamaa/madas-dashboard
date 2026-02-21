import { useQuery } from '@tanstack/react-query';
import { fetchLinkedInventory, type LinkedInventoryResponse } from '../lib/backend-adapter';

const useBackend = !!import.meta.env.VITE_API_BACKEND_URL;

/** Only fetch when backend is used and business is resolved (avoids 403s before tenant is ready). */
export function useLinkedInventory(enabledWhenBusinessReady = true): {
  data: LinkedInventoryResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: ['linkedInventory'],
    queryFn: fetchLinkedInventory,
    enabled: useBackend && enabledWhenBusinessReady,
    staleTime: 60_000,
    retry: false
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch
  };
}
