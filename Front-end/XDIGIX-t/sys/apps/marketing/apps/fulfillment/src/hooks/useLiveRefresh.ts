import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Calls fetchFn on mount and then every intervalMs while the tab is visible.
 * Pauses polling when the tab is hidden; resumes when visible.
 * Use for live-updating lists without manual refresh.
 */
export function useLiveRefresh(
  fetchFn: () => void | Promise<void>,
  intervalMs: number = DEFAULT_INTERVAL_MS,
  deps: React.DependencyList = []
): void {
  const fnRef = useRef(fetchFn);
  fnRef.current = fetchFn;
  const stableFn = useCallback(() => fnRef.current(), []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const run = () => {
      void Promise.resolve(stableFn()).catch(() => {});
    };

    const startPolling = () => {
      run();
      intervalId = setInterval(run, intervalMs);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs, stableFn, ...deps]);
}
