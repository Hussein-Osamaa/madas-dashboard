import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  auth,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  onAuthStateChanged,
  query,
  where
} from '../lib/firebase';
import { useTenant } from './TenantProvider';

type PermissionsContextValue = {
  permissions: string[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

type Props = { children: ReactNode };

// Finance-related permissions - matching the existing permission system in staff-settings.html
export const FINANCE_PERMISSIONS = {
  // Existing permissions from staff-settings.html
  VIEW: 'finance_view',
  DEPOSIT: 'finance_deposit',
  EXPENSES: 'finance_expenses',
  REPORTS: 'finance_reports',
  INSIGHTS: 'finance_insights',
  SHARES: 'finance_shares',
  // New finance app pages - mapped to existing permissions or using VIEW as fallback
  TRANSACTIONS: 'finance_view', // Use finance_view for transactions
  PAYMENTS: 'finance_deposit', // Use finance_deposit for payments
  ACCOUNTS: 'finance_view', // Use finance_view for accounts
  BUDGETS: 'finance_reports', // Use finance_reports for budgets
  TAXES: 'finance_reports', // Use finance_reports for taxes
  CAPITAL: 'finance_view', // Use finance_view for capital
  SETTINGS: 'finance_view', // Use finance_view for settings
  AUDIT: 'finance_view' // Use finance_view for audit
} as const;

const PermissionsProvider = ({ children }: Props) => {
  const { workspaceId, orgId, isSuperAdmin } = useTenant();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: { uid: string } | null) => {
      if (!user || !workspaceId || !orgId) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Super admin has all permissions
      if (isSuperAdmin) {
        setPermissions(Object.values(FINANCE_PERMISSIONS));
        setLoading(false);
        return;
      }

      try {
        // Try to get permissions from businesses/{businessId}/staff/{userId}
        // workspaceId might be the businessId itself, or we need to find it
        let businessId = workspaceId;
        let businessData: any = null;

        // Try direct lookup first (workspaceId = businessId)
        const businessRef = doc(db, 'businesses', workspaceId);
        const businessSnap = await getDoc(businessRef);

        if (businessSnap.exists()) {
          businessData = businessSnap.data();
        } else {
          // Try to find by owner.userId or other fields
          const businessesQuery = await getDocs(
            query(collection(db, 'businesses'), where('owner.userId', '==', user.uid))
          );
          if (!businessesQuery.empty) {
            businessId = businessesQuery.docs[0].id;
            businessData = businessesQuery.docs[0].data();
          }
        }

        let userPermissions: string[] = [];

        if (businessData) {
          // Check if user is owner
          if (businessData.owner?.userId === user.uid) {
            // Owner has all finance permissions
            userPermissions = Object.values(FINANCE_PERMISSIONS);
          } else {
            // Check staff permissions
            const staffRef = doc(db, 'businesses', businessId, 'staff', user.uid);
            const staffSnap = await getDoc(staffRef);

            if (staffSnap.exists()) {
              const staffData = staffSnap.data() as Record<string, unknown> | undefined;
              if (staffData) {
                const perms = staffData.permissions;
                if (Array.isArray(perms)) {
                  userPermissions = perms.filter((p: string) => p.startsWith('finance_'));
                } else if (perms && typeof perms === 'object') {
                  userPermissions = Object.keys(perms).filter(
                    (p) => p.startsWith('finance_') && (perms as Record<string, unknown>)[p] === true
                  );
                }
              }
            }
          }
        }

        setPermissions(userPermissions);
      } catch (error) {
        console.error('[DIGIX Finance] Failed to load permissions', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [workspaceId, orgId, isSuperAdmin]);

  const hasPermission = useMemo(
    () => (permission: string) => {
      if (isSuperAdmin) return true;
      return permissions.includes(permission);
    },
    [permissions, isSuperAdmin]
  );

  const hasAnyPermission = useMemo(
    () => (perms: string[]) => {
      if (isSuperAdmin) return true;
      return perms.some((p) => permissions.includes(p));
    },
    [permissions, isSuperAdmin]
  );

  const hasAllPermissions = useMemo(
    () => (perms: string[]) => {
      if (isSuperAdmin) return true;
      return perms.every((p) => permissions.includes(p));
    },
    [permissions, isSuperAdmin]
  );

  const value = useMemo(
    () => ({
      permissions,
      loading,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions
    }),
    [permissions, loading, hasPermission, hasAnyPermission, hasAllPermissions]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export const usePermissions = () => {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return ctx;
};

export default PermissionsProvider;

