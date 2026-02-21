/**
 * RBAC types (shared)
 */
export type User = {
  id: string;
  firebase_uid?: string;
  email?: string;
  role_id: string;
  type: 'super_admin' | 'admin' | 'staff' | 'client';
  tenant_id?: string | null;
  [key: string]: unknown;
};

export type Role = {
  id: string;
  name: string;
  tenant_id?: string | null;
  [key: string]: unknown;
};

export type Permission = {
  id: string;
  key: string;
  name?: string;
  [key: string]: unknown;
};

export type PermissionCheckResult = {
  allowed: boolean;
  [key: string]: unknown;
};
