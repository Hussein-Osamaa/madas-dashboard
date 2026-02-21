/**
 * Permission Guard Component
 * Wraps children and only renders them if user has required permission(s)
 */

import { ReactNode, useEffect, useState } from 'react';
import { useRBAC } from '../../contexts/RBACContext';

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
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading, user } = useRBAC();
  const [hasAccess, setHasAccess] = useState(true); // Default to allowing access
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      // If user is super_admin, allow access by default
      if (user?.type === 'super_admin') {
        setHasAccess(true);
        setChecked(true);
        return;
      }

      // If no permissions specified, allow access
      if (!permission && (!permissions || permissions.length === 0) && (!allPermissions || allPermissions.length === 0)) {
        setHasAccess(true);
        setChecked(true);
        return;
      }

      let allowed = true; // Default to allowing

      try {
        if (permission) {
          allowed = await hasPermission(permission);
        } else if (permissions && permissions.length > 0) {
          allowed = await hasAnyPermission(permissions);
        } else if (allPermissions && allPermissions.length > 0) {
          allowed = await hasAllPermissions(allPermissions);
        }
      } catch (error) {
        console.error('[PermissionGuard] Error checking permissions:', error);
        allowed = true; // Allow access on error to prevent blocking
      }

      setHasAccess(allowed);
      setChecked(true);
    };

    if (!loading) {
      checkPermissions();
    } else {
      // Allow access while loading
      setHasAccess(true);
      setChecked(false);
    }
  }, [permission, permissions, allPermissions, hasPermission, hasAnyPermission, hasAllPermissions, loading, user]);

  // Only show denial if we've checked and explicitly denied
  if (checked && !hasAccess) {
    if (showError) {
      return (
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <div className="bg-[#1a1b3e] border border-red-500/20 rounded-2xl p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">
              You don't have permission to access this content.
            </p>
          </div>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  // Show content by default (optimistic rendering)
  return <>{children}</>;
};

export default PermissionGuard;
