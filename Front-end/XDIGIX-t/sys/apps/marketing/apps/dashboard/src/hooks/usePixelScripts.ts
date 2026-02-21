import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, db } from '../lib/firebase';
import { PixelData, generatePixelScripts } from '../utils/pixelScripts';

/**
 * Hook to fetch pixel data and return ready-to-inject scripts
 * @param tenantId - The tenant/business ID
 * @returns Object containing pixel data and generated scripts
 */
export function usePixelScripts(tenantId?: string) {
  const query = useQuery({
    queryKey: ['pixels', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async (): Promise<PixelData> => {
      if (!tenantId) {
        return {};
      }

      try {
        const pixelDocRef = doc(db, 'tenants', tenantId, 'pixels', 'config');
        const pixelDoc = await getDoc(pixelDocRef);
        
        if (pixelDoc.exists()) {
          return pixelDoc.data() as PixelData;
        }
        
        return {};
      } catch (error) {
        console.error('[usePixelScripts] Error fetching pixel data:', error);
        return {};
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const pixelData = query.data || {};
  const scripts = generatePixelScripts(pixelData);

  return {
    pixelData,
    scripts,
    isLoading: query.isLoading,
    error: query.error,
  };
}

