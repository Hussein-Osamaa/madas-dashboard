import { ReactNode } from 'react';
import { usePermissions } from '../context/PermissionsProvider';

type Props = {
  permission: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * PermissionGate - Conditionally render children based on permissions
 * 
 * @example
 * <PermissionGate permission="finance_view">
 *   <FinanceDashboard />
 * </PermissionGate>
 * 
 * @example
 * <PermissionGate permission={["finance_view", "finance_reports"]} requireAll>
 *   <ReportsPage />
 * </PermissionGate>
 */
const PermissionGate = ({ permission, requireAll = false, fallback = null, children }: Props) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return null; // Or a loading spinner
  }

  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission)
    : hasPermission(permission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;


