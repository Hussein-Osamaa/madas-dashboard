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

  useEffect(() => {
    const onUpdate = (payload: WarehouseUpdatePayload) => {
      if (payload.type !== type) return;
      if (payload.clientId != null && payload.clientId !== clientId) return;
      refetchRef.current();
    };
    return connectWarehouseSocket(clientId ?? null, onUpdate);
  }, [type, clientId ?? '']);
}
