import { useEffect, useRef } from 'react';

/**
 * Refetch when the user returns to the tab (document becomes visible).
 * Ensures data is fresh without manual refresh when switching back from another tab.
 */
export function useRefetchOnVisible(refetch: () => void): void {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetchRef.current();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
}
