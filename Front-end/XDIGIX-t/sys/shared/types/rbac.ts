/**
 * RBAC Type Definitions
 * Complete role-based access control type system
 */

export type UserType = 'super_admin' | 'tenant_staff';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Only in creation/update, never in responses
  tenant_id: string | null; // null for super admin users
  role_id: string;
  type: UserType;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  firebase_uid?: string; // Link to Firebase Auth UID
}

export interface Tenant {
  id: string;
  name: string;
  plan: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  created_at: string;
  updated_at: string;
  metadata?: {
    industry?: string;
    address?: string;
    phone?: string;
    website?: string;
  };
}

export interface Role {
  id: string;
  name: string;
  tenant_id: string | null; // null for super admin roles (Root, Finance, Ops, Support)
  description: string;
  created_at: string;
  updated_at: string;
  is_system: boolean; // true for default roles that can't be deleted
}

export interface Permission {
  id: string;
  key: string; // e.g., 'users.create', 'orders.view', 'finance.reports'
  description: string;
  category: string; // e.g., 'users', 'orders', 'finance', 'settings'
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

// Default permission keys for system-wide permissions
export const PERMISSION_KEYS = {
  // Super Admin Permissions
  SUPER_ADMIN: {
    MANAGE_ALL_TENANTS: 'super_admin.manage_all_tenants',
    MANAGE_SUPER_ADMIN_STAFF: 'super_admin.manage_staff',
    VIEW_PLATFORM_ANALYTICS: 'super_admin.view_analytics',
    MANAGE_SUBSCRIPTIONS: 'super_admin.manage_subscriptions',
    MANAGE_ROLES: 'super_admin.manage_roles',
    MANAGE_PERMISSIONS: 'super_admin.manage_permissions'
  },
  // Tenant Admin Permissions
  TENANT_ADMIN: {
    MANAGE_TENANT_STAFF: 'tenant_admin.manage_staff',
    MANAGE_TENANT_ROLES: 'tenant_admin.manage_roles',
    MANAGE_TENANT_SETTINGS: 'tenant_admin.manage_settings',
    VIEW_TENANT_ANALYTICS: 'tenant_admin.view_analytics'
  },
  // Common Permissions
  USERS: {
    VIEW: 'users.view',
    CREATE: 'users.create',
    EDIT: 'users.edit',
    DELETE: 'users.delete'
  },
  ORDERS: {
    VIEW: 'orders.view',
    CREATE: 'orders.create',
    EDIT: 'orders.edit',
    DELETE: 'orders.delete',
    PROCESS: 'orders.process'
  },
  PRODUCTS: {
    VIEW: 'products.view',
    CREATE: 'products.create',
    EDIT: 'products.edit',
    DELETE: 'products.delete'
  },
  CUSTOMERS: {
    VIEW: 'customers.view',
    CREATE: 'customers.create',
    EDIT: 'customers.edit',
    DELETE: 'customers.delete'
  },
  FINANCE: {
    VIEW: 'finance.view',
    VIEW_REPORTS: 'finance.view_reports',
    CREATE_TRANSACTION: 'finance.create_transaction',
    EDIT_TRANSACTION: 'finance.edit_transaction',
    DELETE_TRANSACTION: 'finance.delete_transaction',
    MANAGE_ACCOUNTS: 'finance.manage_accounts'
  },
  SETTINGS: {
    VIEW: 'settings.view',
    EDIT: 'settings.edit'
  }
} as const;

// Default roles for super admin
export const SUPER_ADMIN_ROLES = {
  ROOT: 'root',
  FINANCE: 'finance',
  OPS: 'ops',
  SUPPORT: 'support'
} as const;

// Default roles for tenants
export const TENANT_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  SALES: 'sales',
  VIEWER: 'viewer'
} as const;

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

// JWT Payload (for token generation)
export interface JWTPayload {
  user_id: string;
  email: string;
  tenant_id: string | null;
  role_id: string;
  type: UserType;
  permissions?: string[]; // Cached permissions
  iat?: number;
  exp?: number;
}


