import { useEffect, useRef } from 'react';
import { connectWarehouseSocket, type WarehouseUpdatePayload } from '../lib/warehouseSocket';

type WarehouseUpdateType = WarehouseUpdatePayload['type'];

/**
 * Triggers refetch when a live warehouse:updated event matches the current view (type and optional clientId).
 * Use alongside useLiveRefresh so data still updates when socket is disabled or disconnected.
 */
export function useWarehouseLive(
  refetch: () => void,
  options: { type: WarehouseUpdateType; clientId?: string | null }
): void {
  const { type, clientId } = options;
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
    return () => {
      unsub();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [type, clientId ?? '']);
}
