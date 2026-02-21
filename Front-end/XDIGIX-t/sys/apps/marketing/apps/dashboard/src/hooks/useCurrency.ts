import { useMemo } from 'react';
import { useBusiness } from '../contexts/BusinessContext';
import { formatCurrency as formatCurrencyUtil } from '../lib/finance/format';

/**
 * Hook to get currency and formatting functions based on business settings
 */
export const useCurrency = () => {
  const { plan } = useBusiness();
  
  // Get currency from business plan, default to USD
  const currency = (plan as { currency?: string } | undefined)?.currency ?? 'USD';
  
  // Create currency formatter
  const formatter = useMemo(
    () => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2
    }),
    [currency]
  );
  
  // Format currency value
  const formatCurrency = (value: number) => {
    return formatCurrencyUtil(value, currency);
  };
  
  // Format currency value with custom formatter (for cases where you need more control)
  const formatCurrencyCustom = (value: number, options?: { maximumFractionDigits?: number }) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2
    }).format(value || 0);
  };
  
  // Get currency symbol
  const currencySymbol = useMemo(() => {
    return formatter.formatToParts(1).find(part => part.type === 'currency')?.value || '$';
  }, [formatter]);
  
  return {
    currency,
    formatCurrency,
    formatCurrencyCustom,
    currencySymbol,
    formatter
  };
};

