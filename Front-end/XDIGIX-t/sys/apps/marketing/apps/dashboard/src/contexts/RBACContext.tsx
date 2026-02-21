/**
 * RBAC Context Provider
 * Provides role-based access control functionality to the entire app
 */

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
import { useBusiness } from './BusinessContext';
import {
  getUserPermissions,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  canAccessTenant,
  canManageUser
} from '@shared/lib/permissions';
import {
  getPlanPermissions,
  planHasPermission,
  planHasAnyPermission,
  planHasAllPermissions
} from '@shared/lib/planPermissions';
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
  const businessContext = useBusiness();
  const role = businessContext?.role;
  const plan = businessContext?.plan;
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
      let userPerms: string[] = [];
      
      if (rbacUser.role_id) {
        try {
          userPerms = await getUserPermissions(rbacUser.role_id);
        } catch (permError) {
          console.error('[RBACProvider] Error loading permissions:', permError);
        }
      } else {
        console.warn('[RBACProvider] User has no role_id assigned');
      }
      
      setPermissions(userPerms);
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

  // Update permissions when role or plan changes (for owners)
  useEffect(() => {
    if (role === 'owner' && plan?.type && user) {
      try {
        const planPerms = getPlanPermissions(plan.type);
        setPermissions((prevPerms) => {
          // Merge and deduplicate permissions
          return [...new Set([...prevPerms, ...planPerms])];
        });
      } catch (planError) {
        console.error('[RBACProvider] Error loading plan permissions:', planError);
      }
    }
  }, [role, plan, user]);

  const hasPermission = useCallback(
    async (permissionKey: string): Promise<boolean> => {
      // If user is a business owner, check plan-based permissions first
      if (role === 'owner' && plan?.type) {
        const planPerms = getPlanPermissions(plan.type);
        if (planPerms.includes(permissionKey)) {
          return true;
        }
      }
      
      // Fall back to RBAC permission check
      if (!user) return false;
      const result = await checkPermission(user.role_id, permissionKey, user.type);
      return result.allowed;
    },
    [user, role, plan]
  );

  const hasAnyPermission = useCallback(
    async (permissionKeys: string[]): Promise<boolean> => {
      // If user is a business owner, check plan-based permissions first
      if (role === 'owner' && plan?.type) {
        if (planHasAnyPermission(plan.type, permissionKeys)) {
          return true;
        }
      }
      
      // Fall back to RBAC permission check
      if (!user) return false;
      const result = await checkAnyPermission(user.role_id, permissionKeys);
      return result.allowed;
    },
    [user, role, plan]
  );

  const hasAllPermissions = useCallback(
    async (permissionKeys: string[]): Promise<boolean> => {
      // If user is a business owner, check plan-based permissions first
      if (role === 'owner' && plan?.type) {
        if (planHasAllPermissions(plan.type, permissionKeys)) {
          return true;
        }
      }
      
      // Fall back to RBAC permission check
      if (!user) return false;
      const result = await checkAllPermissions(user.role_id, permissionKeys);
      return result.allowed;
    },
    [user, role, plan]
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

export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within RBACProvider');
  }
  return context;
};

export default RBACProvider;

