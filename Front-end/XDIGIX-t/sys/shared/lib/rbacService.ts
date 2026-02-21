/**
 * RBAC Firestore services (shared)
 */
import { getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc
} from 'firebase/firestore';
import type { User, Role, Permission } from '../types/rbac';

function getDb() {
  const app = getApps()[0];
  return app ? getFirestore(app) : null;
}

async function getCollection<T>(collName: string, mapper: (id: string, data: Record<string, unknown>) => T): Promise<T[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, collName));
  return snap.docs.map((d) => mapper(d.id, { ...d.data(), id: d.id } as Record<string, unknown>));
}

export const userService = {
  async getByFirebaseUid(uid: string): Promise<User | null> {
    const db = getDb();
    if (!db) return null;
    const q = query(collection(db, 'users'), where('firebase_uid', '==', uid));
    const snap = await getDocs(q);
    const d = snap.docs[0];
    if (!d) return null;
    return { id: d.id, ...d.data() } as User;
  },
  async getByEmail(email: string): Promise<User | null> {
    const db = getDb();
    if (!db) return null;
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    const d = snap.docs[0];
    if (!d) return null;
    return { id: d.id, ...d.data() } as User;
  },
  async getByTenantId(tenantId: string): Promise<User[]> {
    const db = getDb();
    if (!db) return [];
    const q = query(collection(db, 'users'), where('tenant_id', '==', tenantId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
  },
  async getSuperAdminUsers(): Promise<User[]> {
    const db = getDb();
    if (!db) return [];
    const q = query(collection(db, 'users'), where('type', '==', 'super_admin'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
  }
};

export const roleService = {
  async getAll(): Promise<Role[]> {
    return getCollection<Role>('roles', (id, data) => ({ id, ...data } as Role));
  },
  async getByTenantId(tenantId: string | null): Promise<Role[]> {
    const db = getDb();
    if (!db) return [];
    const q = tenantId
      ? query(collection(db, 'roles'), where('tenant_id', '==', tenantId))
      : query(collection(db, 'roles'), where('tenant_id', '==', null));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Role));
  }
};

export const permissionService = {
  async getAll(): Promise<Permission[]> {
    return getCollection<Permission>('permissions', (id, data) => ({ id, ...data, key: (data.key as string) || id } as Permission));
  }
};

export const rolePermissionService = {
  async getPermissionKeysByRoleId(roleId: string): Promise<string[]> {
    const db = getDb();
    if (!db) return [];
    const q = query(collection(db, 'role_permissions'), where('role_id', '==', roleId));
    const snap = await getDocs(q);
    const keys: string[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      const k = data.permission_key ?? data.key;
      if (k) keys.push(k);
    });
    return keys;
  }
};
