import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clearScanLogs, deleteScanLogs, fetchScanLogs, ScanLog } from '../services/scanLogsService';

const scanLogsKey = (businessId?: string) => ['scanLogs', businessId] as const;

export const useScanLogs = (businessId?: string) => {
  const queryClient = useQueryClient();

  const scanLogsQuery = useQuery({
    queryKey: scanLogsKey(businessId),
    enabled: Boolean(businessId),
    queryFn: () => fetchScanLogs(businessId!),
    initialData: [] as ScanLog[]
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: scanLogsKey(businessId) }).catch((error) => {
      console.error('[useScanLogs] Failed to invalidate scan logs query', error);
    });
  };

  const handleDeleteLogs = async (ids: string[]) => {
    if (!businessId || ids.length === 0) return;
    await deleteScanLogs(businessId, ids);
    invalidate();
  };

  const handleClearLogs = async () => {
    if (!businessId) return;
    await clearScanLogs(businessId);
    invalidate();
  };

  return {
    scanLogs: scanLogsQuery.data ?? [],
    isLoading: scanLogsQuery.isLoading,
    refetch: scanLogsQuery.refetch,
    deleteLogs: handleDeleteLogs,
    clearLogs: handleClearLogs
  };
};

export type { ScanLog };

