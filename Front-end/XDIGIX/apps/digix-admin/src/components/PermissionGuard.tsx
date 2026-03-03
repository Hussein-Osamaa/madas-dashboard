import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionContext';

type PermissionGuardProps = {
  permission?: string;
  /** If true, only admin can access (e.g. Users page). */
  adminOnly?: boolean;
  children: ReactNode;
};

export default function PermissionGuard({ permission, adminOnly, children }: PermissionGuardProps) {
  const { can, isAdmin } = usePermissions();

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  if (permission && !can(permission) && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
