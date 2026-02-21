/**
 * Permission Guard Component
 * Wraps children and only renders them if user has required permission(s)
 */

import { ReactNode, useEffect, useState } from 'react';
import { useRBAC } from '../../contexts/RBACContext';
import { useBusiness } from '../../contexts/BusinessContext';

type PermissionGuardProps = {
  children: ReactNode;
  permission?: string;
  permissions?: string[]; // For "any of" check
  allPermissions?: string[]; // For "all of" check
  fallback?: ReactNode;
  showError?: boolean;
};

export const PermissionGuard = ({
  children,
  permission,
  permissions,
  allPermissions,
  fallback = null,
  showError = false
}: PermissionGuardProps) => {
  const { hasPermission: rbacHasPermission, hasAnyPermission: rbacHasAnyPermission, hasAllPermissions: rbacHasAllPermissions, loading: rbacLoading } = useRBAC();
  const { hasPermission: businessHasPermission, hasAnyPermission: businessHasAnyPermission, hasAllPermissions: businessHasAllPermissions, role } = useBusiness();
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (rbacLoading) return;

      let allowed = false;

      try {
        // Use BusinessContext permissions for staff members (from staff document)
        // Use RBAC permissions for RBAC users
        // Owners always have access
        if (role === 'owner') {
          allowed = true;
        } else {
          // Check permissions - try BusinessContext first (staff permissions), then RBAC
          if (permission) {
            allowed = businessHasPermission(permission) || await rbacHasPermission(permission);
          } else if (permissions && permissions.length > 0) {
            allowed = businessHasAnyPermission(permissions) || await rbacHasAnyPermission(permissions);
          } else if (allPermissions && allPermissions.length > 0) {
            allowed = businessHasAllPermissions(allPermissions) || await rbacHasAllPermissions(allPermissions);
          } else {
            allowed = true; // No permissions specified, allow access
          }
        }
      } catch (error) {
        console.error('[PermissionGuard] Error checking permissions:', error);
        allowed = false;
      }

      setHasAccess(allowed);
      setChecking(false);
    };

    checkPermissions();
  }, [permission, permissions, allPermissions, rbacHasPermission, rbacHasAnyPermission, rbacHasAllPermissions, businessHasPermission, businessHasAnyPermission, businessHasAllPermissions, rbacLoading, role]);

  if (checking || rbacLoading) {
    return fallback || <div className="text-center p-4">Checking permissions...</div>;
  }

  if (!hasAccess) {
    if (showError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium">Access Denied</p>
          <p className="text-red-500 text-sm mt-1">
            You don't have permission to access this content.
          </p>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;

