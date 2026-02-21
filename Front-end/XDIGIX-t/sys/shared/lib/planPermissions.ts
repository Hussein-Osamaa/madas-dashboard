/**
 * Plan-based permissions (shared)
 */
const PLAN_PERMISSIONS: Record<string, string[]> = {
  free: ['dashboard:view', 'orders:view', 'products:view'],
  starter: ['dashboard:view', 'orders:view', 'orders:edit', 'products:view', 'products:edit', 'settings:view'],
  growth: ['dashboard:view', 'orders:view', 'orders:edit', 'products:view', 'products:edit', 'settings:view', 'reports:view', 'staff:view'],
  pro: ['dashboard:view', 'orders:view', 'orders:edit', 'products:view', 'products:edit', 'settings:view', 'reports:view', 'staff:view', 'staff:edit', 'roles:view', 'roles:edit'],
  enterprise: ['dashboard:view', 'orders:view', 'orders:edit', 'products:view', 'products:edit', 'settings:view', 'reports:view', 'staff:view', 'staff:edit', 'roles:view', 'roles:edit', 'permissions:view', 'permissions:edit']
};

export function getPlanPermissions(planType: string): string[] {
  return PLAN_PERMISSIONS[planType] ?? PLAN_PERMISSIONS.free ?? [];
}

export function planHasPermission(planType: string, permissionKey: string): boolean {
  return getPlanPermissions(planType).includes(permissionKey);
}

export function planHasAnyPermission(planType: string, permissionKeys: string[]): boolean {
  const perms = getPlanPermissions(planType);
  return permissionKeys.some((k) => perms.includes(k));
}

export function planHasAllPermissions(planType: string, permissionKeys: string[]): boolean {
  const perms = getPlanPermissions(planType);
  return permissionKeys.every((k) => perms.includes(k));
}
