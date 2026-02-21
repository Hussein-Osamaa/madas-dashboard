/**
 * Permission Checking Utilities
 * Core logic for RBAC permission validation
 */

import { rolePermissionService } from './rbacService';
import type { User, PermissionCheckResult, UserType } from '../types/rbac';

/**
 * Check if a user has a specific permission
 */
export async function checkPermission(
  roleId: string,
  permissionKey: string,
  userType: UserType
): Promise<PermissionCheckResult> {
  try {
    const rolePermissions = await rolePermissionService.getPermissionKeysByRoleId(roleId);
    const hasPermission = rolePermissions.includes(permissionKey);

    if (hasPermission) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `User does not have permission: ${permissionKey}`
    };
  } catch (error) {
    console.error('[checkPermission] Error:', error);
    return {
      allowed: false,
      reason: 'Error checking permissions'
    };
  }
}

/**
 * Check if a user has any of the specified permissions
 */
export async function checkAnyPermission(
  roleId: string,
  permissionKeys: string[]
): Promise<PermissionCheckResult> {
  try {
    const rolePermissions = await rolePermissionService.getPermissionKeysByRoleId(roleId);
    const hasAnyPermission = permissionKeys.some((key) => rolePermissions.includes(key));

    if (hasAnyPermission) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `User does not have any of the required permissions: ${permissionKeys.join(', ')}`
    };
  } catch (error) {
    console.error('[checkAnyPermission] Error:', error);
    return {
      allowed: false,
      reason: 'Error checking permissions'
    };
  }
}

/**
 * Check if a user has all of the specified permissions
 */
export async function checkAllPermissions(
  roleId: string,
  permissionKeys: string[]
): Promise<PermissionCheckResult> {
  try {
    const rolePermissions = await rolePermissionService.getPermissionKeysByRoleId(roleId);
    const hasAllPermissions = permissionKeys.every((key) => rolePermissions.includes(key));

    if (hasAllPermissions) {
      return { allowed: true };
    }

    const missing = permissionKeys.filter((key) => !rolePermissions.includes(key));
    return {
      allowed: false,
      reason: `User missing required permissions: ${missing.join(', ')}`
    };
  } catch (error) {
    console.error('[checkAllPermissions] Error:', error);
    return {
      allowed: false,
      reason: 'Error checking permissions'
    };
  }
}

/**
 * Check if user can access tenant data
 * Super admins can access all tenants
 * Tenant staff can only access their own tenant
 */
export function canAccessTenant(user: User, tenantId: string | null): boolean {
  // Super admins can access all tenants
  if (user.type === 'super_admin') {
    return true;
  }

  // Tenant staff can only access their own tenant
  if (user.type === 'tenant_staff') {
    return user.tenant_id === tenantId;
  }

  return false;
}

/**
 * Check if user can manage another user
 * Super admins can manage super admin users
 * Tenant admins can manage their tenant's staff
 */
export function canManageUser(manager: User, targetUser: User): boolean {
  // Users cannot manage themselves
  if (manager.id === targetUser.id) {
    return false;
  }

  // Super admins can manage other super admins and all tenant staff
  if (manager.type === 'super_admin') {
    return true;
  }

  // Tenant staff can only manage users in their own tenant
  if (manager.type === 'tenant_staff' && targetUser.type === 'tenant_staff') {
    return manager.tenant_id === targetUser.tenant_id;
  }

  return false;
}

/**
 * Get all permissions for a user (cached)
 */
export async function getUserPermissions(roleId: string): Promise<string[]> {
  return rolePermissionService.getPermissionKeysByRoleId(roleId);
}

/**
 * Middleware helper for permission checking
 * Returns a function that checks permissions before allowing action
 */
export function authorize(permissionKey: string) {
  return async (user: User): Promise<PermissionCheckResult> => {
    if (user.status !== 'active') {
      return {
        allowed: false,
        reason: 'User account is not active'
      };
    }

    return checkPermission(user.role_id, permissionKey, user.type);
  };
}

/**
 * Check multiple permissions with OR logic (any permission required)
 */
export function authorizeAny(...permissionKeys: string[]) {
  return async (user: User): Promise<PermissionCheckResult> => {
    if (user.status !== 'active') {
      return {
        allowed: false,
        reason: 'User account is not active'
      };
    }

    return checkAnyPermission(user.role_id, permissionKeys);
  };
}

/**
 * Check multiple permissions with AND logic (all permissions required)
 */
export function authorizeAll(...permissionKeys: string[]) {
  return async (user: User): Promise<PermissionCheckResult> => {
    if (user.status !== 'active') {
      return {
        allowed: false,
        reason: 'User account is not active'
      };
    }

    return checkAllPermissions(user.role_id, permissionKeys);
  };
}


