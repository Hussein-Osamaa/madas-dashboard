import { useEffect, useRef } from 'react';
import { connectWarehouseSocket, subscribeWarehouseOnConnect, type WarehouseUpdatePayload } from '../lib/warehouseSocket';

type WarehouseUpdateType = WarehouseUpdatePayload['type'];

/**
 * Triggers refetch when: (1) a live warehouse:updated event matches, (2) socket connects/reconnects.
 * Use alongside useLiveRefresh and useRefetchOnVisible so data updates without manual refresh.
 */
export function useWarehouseLive(
  refetch: () => void,
  options: { type: WarehouseUpdateType; clientId?: string | null; refetchOnConnect?: boolean }
): void {
  const { type, clientId, refetchOnConnect = true } = options;
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onUpdate = (payload: WarehouseUpdatePayload) => {
      if (payload.type !== type) return;
      if (payload.clientId != null && payload.clientId !== clientId) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        refetchRef.current();
      }, 0);
    };
    const unsub = connectWarehouseSocket(clientId ?? null, onUpdate);
    const unsubConnect = refetchOnConnect
      ? subscribeWarehouseOnConnect(() => refetchRef.current())
      : () => {};
    return () => {
      unsub();
      unsubConnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [type, clientId ?? '', refetchOnConnect]);
}
