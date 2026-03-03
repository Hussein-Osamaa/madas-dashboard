import { createContext, ReactNode, useMemo, useContext } from 'react';
import { useAuth } from './AuthContext';

/** Permission keys for digix-admin. Admin has all. */
export const PERMISSIONS = {
  clientsRead: 'clients:read',
  clientsWrite: 'clients:write',
  fulfillmentRead: 'fulfillment:read',
  financeRead: 'finance:read',
  shippingRead: 'shipping:read',
  usersRead: 'users:read',
  usersWrite: 'users:write',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

type PermissionContextValue = {
  isAdmin: boolean;
  isStaff: boolean;
  canAccessAdmin: boolean;
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
};

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const value = useMemo<PermissionContextValue>(() => {
    const isAdmin = user?.role === 'admin';
    const isStaff = user?.role === 'staff';
    const perms = user?.permissions || [];
    const canAccessAdmin = isAdmin || isStaff;

    const can = (permission: string) => {
      if (isAdmin) return true;
      if (!isStaff) return false;
      return perms.includes(permission);
    };

    const canAny = (...permissions: string[]) => permissions.some((p) => can(p));

    return { isAdmin, isStaff, canAccessAdmin, can, canAny };
  }, [user]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}
