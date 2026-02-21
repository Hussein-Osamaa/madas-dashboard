import { useQuery } from '@tanstack/react-query';
import { fetchFulfillmentStatus } from '../lib/backend-adapter';

const useBackend = !!import.meta.env.VITE_API_BACKEND_URL;

/** Only fetch when backend is used and business is resolved (avoids 403s before tenant is ready). */
export function useFulfillmentSubscription(enabledWhenBusinessReady = true): {
  subscribed: boolean;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['fulfillmentStatus'],
    queryFn: fetchFulfillmentStatus,
    enabled: useBackend && enabledWhenBusinessReady,
    staleTime: 60_000,
    retry: false
  });

  return {
    subscribed: useBackend && query.data?.subscribed === true,
    isLoading: useBackend && query.isLoading
  };
}
