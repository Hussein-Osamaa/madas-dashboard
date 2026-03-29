/**
 * Permission helpers (shared) - backend-adapter only.
 * Call `initPermissionsApi(api, db)` before using any function.
 */
import type { User, PermissionCheckResult } from '../types/rbac';

/* ------------------------------------------------------------------ */
/*  Pluggable API surface                                             */
/* ------------------------------------------------------------------ */

interface FirestoreLikeApi {
  collection: (db: unknown, ...segments: string[]) => unknown;
  query: (ref: unknown, ...constraints: unknown[]) => unknown;
  where: (field: string, op: string, value: unknown) => unknown;
  getDocs: (q: unknown) => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>;
}

let _api: FirestoreLikeApi | null = null;
let _db: unknown = null;

/** Inject a backend-adapter-compatible API so queries go through the backend. */
export function initPermissionsApi(api: FirestoreLikeApi, db?: unknown) {
  _api = api;
  _db = db ?? {};
}

function getApi(): { api: FirestoreLikeApi; db: unknown } {
  if (!_api) {
    console.warn('[permissions] Backend API not initialized. Call initPermissionsApi() first.');
    return { api: null as unknown as FirestoreLikeApi, db: null };
  }
  return { api: _api, db: _db };
}

/* ------------------------------------------------------------------ */
/*  Permission checks                                                 */
/* ------------------------------------------------------------------ */

export async function getUserPermissions(roleId: string): Promise<string[]> {
  const { api, db } = getApi();
  if (!db) return [];
  try {
    const snap = await api.getDocs(
      api.query(
        api.collection(db, 'role_permissions'),
        api.where('role_id', '==', roleId)
      )
    );
    const keys: string[] = [];
    snap.docs.forEach((d) => {
      const k = d.data().permission_key ?? d.data().key;
      if (k) keys.push(k as string);
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
