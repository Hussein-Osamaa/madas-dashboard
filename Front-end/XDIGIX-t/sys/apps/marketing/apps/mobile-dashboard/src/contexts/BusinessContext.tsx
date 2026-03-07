import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { firestoreQuery, firestoreGet } from '../lib/api';
import type { BusinessInfo } from '../types';

type BusinessContextValue = BusinessInfo & {
  loading: boolean;
  formatCurrency: (value: number) => string;
};

const defaultValue: BusinessContextValue = {
  businessId: '',
  businessName: '',
  currency: 'USD',
  role: '',
  permissions: {},
  loading: true,
  formatCurrency: (v) => `$${v.toFixed(2)}`,
};

const BusinessContext = createContext<BusinessContextValue>(defaultValue);

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<BusinessContextValue, 'formatCurrency'>>({
    businessId: '',
    businessName: '',
    currency: 'USD',
    role: '',
    permissions: {},
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState((prev) => ({ ...prev, loading: false, businessId: '' }));
      return;
    }

    (async () => {
      try {
        const profile = await firestoreGet<{ businessId?: string }>(`users/${user.uid}`);

        let businessId = profile?.businessId;
        let role = 'owner';
        let permissions: Record<string, string[]> = {
          home: ['view'],
          orders: ['view', 'search', 'create', 'edit'],
          inventory: ['view', 'edit'],
          customers: ['view', 'edit'],
          finance: ['view', 'reports'],
          analytics: ['view', 'export'],
          settings: ['view', 'edit'],
        };

        if (!businessId) {
          const ownerDocs = await firestoreQuery<{
            owner?: { userId?: string };
            businessName?: string;
            name?: string;
            plan?: { currency?: string };
            currency?: string;
          }>('businesses', [{ type: 'where', field: 'owner.userId', op: '==', value: user.uid }]);

          if (ownerDocs.length > 0) {
            businessId = ownerDocs[0].id;
          }
        }

        if (!businessId) {
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }

        const businessData = await firestoreGet<{
          businessName?: string;
          name?: string;
          plan?: { currency?: string; type?: string };
          currency?: string;
        }>(`businesses/${businessId}`);

        const businessName = businessData?.businessName || businessData?.name || 'Business';
        const currency = businessData?.currency || businessData?.plan?.currency || 'USD';

        if (profile?.businessId) {
          const staffData = await firestoreGet<{
            role?: string;
            permissions?: Record<string, string[]> | string[];
          }>(`businesses/${businessId}/staff/${user.uid}`);

          if (staffData) {
            role = staffData.role || 'staff';
            if (staffData.permissions && !Array.isArray(staffData.permissions)) {
              permissions = staffData.permissions;
            }
          }
        }

        setState({
          businessId,
          businessName,
          currency,
          role,
          permissions,
          loading: false,
        });
      } catch (err) {
        console.error('Failed to resolve business:', err);
        setState((prev) => ({ ...prev, loading: false }));
      }
    })();
  }, [user]);

  const value = useMemo<BusinessContextValue>(() => {
    const fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: state.currency || 'USD',
      maximumFractionDigits: 2,
    });
    return {
      ...state,
      formatCurrency: (v: number) => fmt.format(v || 0),
    };
  }, [state]);

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
};

export const useBusiness = () => useContext(BusinessContext);
