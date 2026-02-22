/**
 * RBAC Context Provider
 * Provides role-based access control functionality to the entire app
 */

const SUPER_ADMIN_EMAILS = ['hesainosama@gmail.com'];

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useAuth } from './AuthContext';
import {
  getUserPermissions,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  canAccessTenant,
  canManageUser
} from '@shared/lib/permissions';
import { userService, roleService, permissionService, rolePermissionService } from '@shared/lib/rbacService';
import type { User, Role, Permission, PermissionCheckResult } from '@shared/types/rbac';

type RBACContextValue = {
  // User data
  user: User | null;
  loading: boolean;
  permissions: string[];
  
  // Permission checking
  hasPermission: (permissionKey: string) => Promise<boolean>;
  hasAnyPermission: (permissionKeys: string[]) => Promise<boolean>;
  hasAllPermissions: (permissionKeys: string[]) => Promise<boolean>;
  
  // Access control
  canAccessTenant: (tenantId: string | null) => boolean;
  canManageUser: (targetUser: User) => boolean;
  
  // Data fetching
  getRoles: () => Promise<Role[]>;
  getPermissions: () => Promise<Permission[]>;
  getUserPermissions: (roleId: string) => Promise<string[]>;
  
  // Refresh
  refresh: () => Promise<void>;
};

const RBACContext = createContext<RBACContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export const RBACProvider = ({ children }: Props) => {
  const { user: firebaseUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async () => {
    if (!firebaseUser) {
      setUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Validate Firebase user has required fields
      if (!firebaseUser.uid) {
        console.warn('[RBACProvider] Firebase user missing UID');
        setUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }
      
      // Super admin emails: bypass RBAC lookup and grant full access
      const email = (firebaseUser.email || '').trim().toLowerCase();
      if (SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === email)) {
        const superAdminUser: User = {
          id: firebaseUser.uid,
          name: 'Super Admin',
          email: firebaseUser.email || '',
          type: 'super_admin',
          tenant_id: null,
          role_id: 'root',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          firebase_uid: firebaseUser.uid
        };
        setUser(superAdminUser);
        setPermissions(['super_admin.view_analytics', 'super_admin.manage_all_tenants', 'super_admin.manage_staff', 'super_admin.manage_subscriptions', 'super_admin.manage_roles', 'super_admin.manage_permissions']);
        setLoading(false);
        return;
      }

      // Get RBAC user from Firestore using Firebase UID
      let rbacUser = await userService.getByFirebaseUid(firebaseUser.uid);
      
      // If no RBAC user found, try to find by email (only if email exists)
      if (!rbacUser && firebaseUser.email) {
        rbacUser = await userService.getByEmail(firebaseUser.email);
      }

      if (!rbacUser) {
        console.warn('[RBACProvider] No RBAC user found for Firebase user', {
          uid: firebaseUser.uid,
          email: firebaseUser.email
        });
        setUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      setUser(rbacUser);

      // Load permissions for user's role (validate role_id exists)
      if (rbacUser.role_id) {
        try {
          const userPerms = await getUserPermissions(rbacUser.role_id);
          setPermissions(userPerms);
        } catch (permError) {
          console.error('[RBACProvider] Error loading permissions:', permError);
          setPermissions([]);
        }
      } else {
        console.warn('[RBACProvider] User has no role_id assigned');
        setPermissions([]);
      }
    } catch (error) {
      console.error('[RBACProvider] Error loading user data:', error);
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const hasPermission = useCallback(
    async (permissionKey: string): Promise<boolean> => {
      if (!user) return false;
      if (user.type === 'super_admin' && SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === (user.email || '').toLowerCase())) return true;
      const result = await checkPermission(user.role_id, permissionKey, user.type);
      return result.allowed;
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    async (permissionKeys: string[]): Promise<boolean> => {
      if (!user) return false;
      if (user.type === 'super_admin' && SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === (user.email || '').toLowerCase())) return true;
      const result = await checkAnyPermission(user.role_id, permissionKeys);
      return result.allowed;
    },
    [user]
  );

  const hasAllPermissions = useCallback(
    async (permissionKeys: string[]): Promise<boolean> => {
      if (!user) return false;
      if (user.type === 'super_admin' && SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === (user.email || '').toLowerCase())) return true;
      const result = await checkAllPermissions(user.role_id, permissionKeys);
      return result.allowed;
    },
    [user]
  );

  const canAccessTenantCheck = useCallback(
    (tenantId: string | null): boolean => {
      if (!user) return false;
      return canAccessTenant(user, tenantId);
    },
    [user]
  );

  const canManageUserCheck = useCallback(
    (targetUser: User): boolean => {
      if (!user) return false;
      return canManageUser(user, targetUser);
    },
    [user]
  );

  const getRoles = useCallback(async (): Promise<Role[]> => {
    if (!user) return [];
    
    try {
      if (user.type === 'super_admin') {
        // Super admins can see all roles
        return roleService.getAll();
      } else if (user.tenant_id) {
        // Tenant staff can only see roles for their tenant
        // Convert undefined to null for Firestore compatibility
        const tenantId = user.tenant_id === undefined ? null : user.tenant_id;
        return roleService.getByTenantId(tenantId);
      }
      
      return [];
    } catch (error) {
      console.error('[RBACContext] Error getting roles:', error);
      return [];
    }
  }, [user]);

  const getPermissions = useCallback(async (): Promise<Permission[]> => {
    return permissionService.getAll();
  }, []);

  const getUserPermissionsForRole = useCallback(async (roleId: string): Promise<string[]> => {
    return rolePermissionService.getPermissionKeysByRoleId(roleId);
  }, []);

  const value = useMemo<RBACContextValue>(
    () => ({
      user,
      loading,
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessTenant: canAccessTenantCheck,
      canManageUser: canManageUserCheck,
      getRoles,
      getPermissions,
      getUserPermissions: getUserPermissionsForRole,
      refresh: loadUserData
    }),
    [
      user,
      loading,
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      canAccessTenantCheck,
      canManageUserCheck,
      getRoles,
      getPermissions,
      getUserPermissionsForRole,
      loadUserData
    ]
  );

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
};

const DEFAULT_RBAC: RBACContextValue = {
  user: null,
  loading: true,
  permissions: [],
  hasPermission: async () => false,
  hasAnyPermission: async () => false,
  hasAllPermissions: async () => false,
  canAccessTenant: () => false,
  canManageUser: () => false,
  getRoles: async () => [],
  getPermissions: async () => [],
  getUserPermissions: async () => [],
  refresh: async () => {}
};

export const useRBAC = () => {
  const context = useContext(RBACContext);
  return context ?? DEFAULT_RBAC;
};

export default RBACProvider;


