import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db, doc, getDoc, onAuthStateChanged } from '../lib/firebase';

type TenantContextValue = {
  workspaceId: string;
  orgId: string;
  loading: boolean;
  tenantName?: string;
  isSuperAdmin?: boolean;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

type Props = { children: ReactNode };

const STORAGE_KEY = 'madas_finance_tenant';

const TenantProvider = ({ children }: Props) => {
  const [state, setState] = useState<TenantContextValue>({
    workspaceId: import.meta.env.VITE_DEFAULT_WORKSPACE_ID || '',
    orgId: import.meta.env.VITE_DEFAULT_ORG_ID || '',
    loading: true
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: { uid: string; getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }> } | null) => {
      if (!user) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Get custom claims from ID token
        const token = await user.getIdTokenResult();
        const claims = token.claims as Record<string, unknown>;
        
        const isSuperAdmin = claims.superAdmin === true || claims.role === 'super_admin';
        const workspaceId = (claims.workspaceId as string) || import.meta.env.VITE_DEFAULT_WORKSPACE_ID || '';
        const orgId = (claims.orgId as string) || import.meta.env.VITE_DEFAULT_ORG_ID || '';

        if (!workspaceId || !orgId) {
          console.warn(
            '[DIGIX Finance] No tenant IDs found in token claims or env vars. Super admin:', isSuperAdmin
          );
          setState((prev) => ({ ...prev, loading: false, isSuperAdmin }));
          return;
        }

        // Try to fetch organization name
        let tenantName = 'Organization';
        try {
          const orgRef = doc(db, 'workspaces', workspaceId, 'organizations', orgId);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists()) {
            tenantName = (orgSnap.data() as { name?: string } | undefined)?.name ?? 'Organization';
          }
        } catch (error) {
          console.warn('[DIGIX Finance] Could not fetch org name, using default');
        }

        const value = { workspaceId, orgId, tenantName, loading: false, isSuperAdmin };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        setState(value);
      } catch (error) {
        console.error('[DIGIX Finance] Failed to resolve tenant context', error);
        setState((prev) => ({ ...prev, loading: false }));
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(() => state, [state]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export default TenantProvider;

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return ctx;
};

