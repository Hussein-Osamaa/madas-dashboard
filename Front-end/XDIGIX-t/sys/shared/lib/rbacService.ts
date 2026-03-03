/**
 * RBAC Firestore services (shared)
 *
 * By default uses the Firebase SDK directly.  Call `initRbacApi(api)` early
 * in the app to inject a backend-adapter-compatible API so all queries go
 * through the Node backend instead of hitting Firebase Firestore directly.
 */
import type { User, Role, Permission } from '../types/rbac';

/* ------------------------------------------------------------------ */
/*  Pluggable API surface                                             */
/* ------------------------------------------------------------------ */

interface FirestoreLikeApi {
  collection: (db: unknown, ...segments: string[]) => unknown;
  query: (ref: unknown, ...constraints: unknown[]) => unknown;
  where: (field: string, op: string, value: unknown) => unknown;
  getDocs: (q: unknown) => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>;
  getDoc: (ref: unknown) => Promise<{ exists: () => boolean; id: string; data: () => Record<string, unknown> }>;
  doc: (db: unknown, ...segments: string[]) => unknown;
}

let _api: FirestoreLikeApi | null = null;
let _db: unknown = null;

/** Inject a backend-adapter–compatible API so queries go through the backend. */
export function initRbacApi(api: FirestoreLikeApi, db?: unknown) {
  _api = api;
  _db = db ?? {};
}

async function lazyFirebase(): Promise<{ api: FirestoreLikeApi; db: unknown }> {
  if (_api) return { api: _api, db: _db };
  const { getApps } = await import('firebase/app');
  const fb = await import('firebase/firestore');
  const app = getApps()[0];
  return {
    api: {
      collection: fb.collection,
      query: fb.query,
      where: fb.where,
      getDocs: fb.getDocs,
      getDoc: fb.getDoc,
      doc: fb.doc,
    },
    db: app ? fb.getFirestore(app) : null,
  };
}

/* ------------------------------------------------------------------ */
/*  Services                                                          */
/* ------------------------------------------------------------------ */

export const userService = {
  async getByFirebaseUid(uid: string): Promise<User | null> {
    const { api, db } = await lazyFirebase();
    if (!db) return null;
    const q = api.query(api.collection(db, 'users'), api.where('firebase_uid', '==', uid));
    const snap = await api.getDocs(q);
    const d = snap.docs[0];
    if (!d) return null;
    return { id: d.id, ...d.data() } as User;
  },
  async getByEmail(email: string): Promise<User | null> {
    const { api, db } = await lazyFirebase();
    if (!db) return null;
    const q = api.query(api.collection(db, 'users'), api.where('email', '==', email));
    const snap = await api.getDocs(q);
    const d = snap.docs[0];
    if (!d) return null;
    return { id: d.id, ...d.data() } as User;
  },
  async getByTenantId(tenantId: string): Promise<User[]> {
    const { api, db } = await lazyFirebase();
    if (!db) return [];
    const q = api.query(api.collection(db, 'users'), api.where('tenant_id', '==', tenantId));
    const snap = await api.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
  },
  async getSuperAdminUsers(): Promise<User[]> {
    const { api, db } = await lazyFirebase();
    if (!db) return [];
    const q = api.query(api.collection(db, 'users'), api.where('type', '==', 'super_admin'));
    const snap = await api.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
  }
};

export const roleService = {
  async getAll(): Promise<Role[]> {
    const { api, db } = await lazyFirebase();
    if (!db) return [];
    const snap = await api.getDocs(api.collection(db, 'roles'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Role));
  },
  async getByTenantId(tenantId: string | null): Promise<Role[]> {
    const { api, db } = await lazyFirebase();
    if (!db) return [];
    const q = tenantId
      ? api.query(api.collection(db, 'roles'), api.where('tenant_id', '==', tenantId))
      : api.query(api.collection(db, 'roles'), api.where('tenant_id', '==', null));
    const snap = await api.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Role));
  }
};

export const permissionService = {
  async getAll(): Promise<Permission[]> {
    const { api, db } = await lazyFirebase();
    if (!db) return [];
    const snap = await api.getDocs(api.collection(db, 'permissions'));
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data, key: (data.key as string) || d.id } as Permission;
    });
  }
};

export const rolePermissionService = {
  async getPermissionKeysByRoleId(roleId: string): Promise<string[]> {
    const { api, db } = await lazyFirebase();
    if (!db) return [];
    const q = api.query(api.collection(db, 'role_permissions'), api.where('role_id', '==', roleId));
    const snap = await api.getDocs(q);
    const keys: string[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      const k = data.permission_key ?? data.key;
      if (k) keys.push(k as string);
    });
    return keys;
  }
};
