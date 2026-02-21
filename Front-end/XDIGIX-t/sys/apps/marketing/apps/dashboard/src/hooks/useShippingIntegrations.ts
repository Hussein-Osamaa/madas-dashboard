import { useState, useEffect } from 'react';
import { doc, getDoc, db } from '../lib/firebase';

interface BostaProvider {
  enabled: boolean;
  apiKey?: string;
  businessId?: string;
  countryId?: string;
  testMode?: boolean;
  defaultPickupLocationId?: string;
  webhookUrl?: string;
}

export interface ShippingRegion {
  id: string;
  name: string;
  countries: string[];
  governorates: string[];
  enabled: boolean;
  shippingRate: number;
  freeShippingThreshold?: number;
  estimatedDays: string;
  priority: number;
}

export interface ShippingException {
  id: string;
  name: string;
  type: 'product' | 'category' | 'location' | 'weight';
  condition: string;
  action: 'block' | 'surcharge' | 'free' | 'custom_rate';
  value?: number;
  enabled: boolean;
}

export interface RegionsData {
  enabled: boolean;
  regions: ShippingRegion[];
  exceptions: ShippingException[];
  defaultRate: number;
  defaultEstimatedDays: string;
}

interface ShippingIntegrations {
  bosta?: BostaProvider;
  aramex?: { enabled: boolean };
  dhl?: { enabled: boolean };
  fedex?: { enabled: boolean };
  ups?: { enabled: boolean };
  regions?: RegionsData;
}

export const useShippingIntegrations = (businessId: string | undefined) => {
  const [integrations, setIntegrations] = useState<ShippingIntegrations>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const loadIntegrations = async () => {
      try {
        setLoading(true);
        const shippingDocRef = doc(db, 'tenants', businessId, 'settings', 'shipping');
        const shippingDoc = await getDoc(shippingDocRef);

        if (shippingDoc.exists()) {
          setIntegrations(shippingDoc.data() as ShippingIntegrations);
        } else {
          setIntegrations({});
        }
      } catch (error) {
        console.error('[useShippingIntegrations] Error loading integrations:', error);
        setIntegrations({});
      } finally {
        setLoading(false);
      }
    };

    loadIntegrations();
  }, [businessId]);

  const isBostaEnabled = integrations.bosta?.enabled && !!integrations.bosta?.apiKey;
  const bostaConfig = integrations.bosta;
  
  // Shipping regions
  const regionsEnabled = integrations.regions?.enabled ?? false;
  const shippingRegions = integrations.regions?.regions?.filter(r => r.enabled) ?? [];
  const shippingExceptions = integrations.regions?.exceptions?.filter(e => e.enabled) ?? [];
  const defaultShippingRate = integrations.regions?.defaultRate ?? 50;
  const defaultEstimatedDays = integrations.regions?.defaultEstimatedDays ?? '3-5 days';

  return {
    integrations,
    loading,
    isBostaEnabled,
    bostaConfig,
    // Regions exports
    regionsEnabled,
    shippingRegions,
    shippingExceptions,
    defaultShippingRate,
    defaultEstimatedDays
  };
};

export default useShippingIntegrations;

