/**
 * Permission helpers (shared) - uses Firestore when available
 */
import { getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import type { User, PermissionCheckResult } from '../types/rbac';

function getDb() {
  const app = getApps()[0];
  return app ? getFirestore(app) : null;
}

export async function getUserPermissions(roleId: string): Promise<string[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, 'role_permissions'),
        where('role_id', '==', roleId)
      )
    );
    const keys: string[] = [];
    snap.docs.forEach((d) => {
      const k = d.data().permission_key ?? d.data().key;
      if (k) keys.push(k);
    });
    return keys;
  } catch {
    return [];
  }
}

export async function checkPermission(
  _roleId: string,
  _permissionKey: string,
  _userType?: string
): Promise<PermissionCheckResult> {
  const db = getDb();
  if (!db) return { allowed: false };
  try {
    const perms = await getUserPermissions(_roleId);
    return { allowed: perms.includes(_permissionKey) };
  } catch {
    return { allowed: false };
  }
}

export async function checkAnyPermission(
  roleId: string,
  permissionKeys: string[]
): Promise<PermissionCheckResult> {
  const perms = await getUserPermissions(roleId);
  const allowed = permissionKeys.some((k) => perms.includes(k));
  return { allowed };
}

export async function checkAllPermissions(
  roleId: string,
  permissionKeys: string[]
): Promise<PermissionCheckResult> {
  const perms = await getUserPermissions(roleId);
  const allowed = permissionKeys.every((k) => perms.includes(k));
  return { allowed };
}

export function canAccessTenant(user: User, tenantId: string | null): boolean {
  if (user.type === 'super_admin') return true;
  if (user.tenant_id == null && tenantId == null) return true;
  return user.tenant_id === tenantId;
}

export function canManageUser(currentUser: User, targetUser: User): boolean {
  if (currentUser.type === 'super_admin') return true;
  if (currentUser.tenant_id !== targetUser.tenant_id) return false;
  return currentUser.type === 'admin' || currentUser.type === 'staff';
}
