/**
 * RBAC Service Layer
 * Handles all Firestore operations for RBAC
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
  db
} from './firebase';
import type {
  User,
  Tenant,
  Role,
  Permission,
  RolePermission,
  UserType,
  UserStatus
} from '../types/rbac';

const COLLECTIONS = {
  USERS: 'users',
  TENANTS: 'tenants',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  ROLE_PERMISSIONS: 'role_permissions'
};

// ============================================================================
// USER OPERATIONS
// ============================================================================

export const userService = {
  async create(data: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const userRef = doc(collection(db, COLLECTIONS.USERS));
    const user: User = {
      ...data,
      id: userRef.id,
      created_at: Timestamp.now().toDate().toISOString(),
      updated_at: Timestamp.now().toDate().toISOString()
    };
    await setDoc(userRef, user);
    return user;
  },

  async getById(userId: string): Promise<User | null> {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!userDoc.exists()) return null;
    return userDoc.data() as User;
  },

  async getByEmail(email: string): Promise<User | null> {
    if (!email || email.trim() === '') {
      return null;
    }
    const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as User;
  },

  async getByFirebaseUid(firebaseUid: string): Promise<User | null> {
    if (!firebaseUid || firebaseUid.trim() === '') {
      return null;
    }
    const q = query(collection(db, COLLECTIONS.USERS), where('firebase_uid', '==', firebaseUid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as User;
  },

  async getByTenantId(tenantId: string): Promise<User[]> {
    if (!tenantId) {
      return [];
    }
    const q = query(collection(db, COLLECTIONS.USERS), where('tenant_id', '==', tenantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as User);
  },

  async getSuperAdminUsers(): Promise<User[]> {
    const q = query(collection(db, COLLECTIONS.USERS), where('type', '==', 'super_admin'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as User);
  },

  async update(userId: string, data: Partial<Omit<User, 'id' | 'created_at'>>): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      ...data,
      updated_at: Timestamp.now().toDate().toISOString()
    });
  },

  async delete(userId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  },

  async updateLastLogin(userId: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userRef, {
      last_login_at: Timestamp.now().toDate().toISOString()
    });
  }
};

// ============================================================================
// TENANT OPERATIONS
// ============================================================================

export const tenantService = {
  async create(data: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<Tenant> {
    const tenantRef = doc(collection(db, COLLECTIONS.TENANTS));
    const tenant: Tenant = {
      ...data,
      id: tenantRef.id,
      created_at: Timestamp.now().toDate().toISOString(),
      updated_at: Timestamp.now().toDate().toISOString()
    };
    await setDoc(tenantRef, tenant);
    return tenant;
  },

  async getById(tenantId: string): Promise<Tenant | null> {
    const tenantDoc = await getDoc(doc(db, COLLECTIONS.TENANTS, tenantId));
    if (!tenantDoc.exists()) return null;
    return tenantDoc.data() as Tenant;
  },

  async getAll(): Promise<Tenant[]> {
    const snapshot = await getDocs(collection(db, COLLECTIONS.TENANTS));
    return snapshot.docs.map((doc) => doc.data() as Tenant);
  },

  async update(tenantId: string, data: Partial<Omit<Tenant, 'id' | 'created_at'>>): Promise<void> {
    const tenantRef = doc(db, COLLECTIONS.TENANTS, tenantId);
    await updateDoc(tenantRef, {
      ...data,
      updated_at: Timestamp.now().toDate().toISOString()
    });
  },

  async delete(tenantId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.TENANTS, tenantId));
  }
};

// ============================================================================
// ROLE OPERATIONS
// ============================================================================

export const roleService = {
  async create(data: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> {
    const roleRef = doc(collection(db, COLLECTIONS.ROLES));
    const role: Role = {
      ...data,
      id: roleRef.id,
      created_at: Timestamp.now().toDate().toISOString(),
      updated_at: Timestamp.now().toDate().toISOString()
    };
    await setDoc(roleRef, role);
    return role;
  },

  async getById(roleId: string): Promise<Role | null> {
    const roleDoc = await getDoc(doc(db, COLLECTIONS.ROLES, roleId));
    if (!roleDoc.exists()) return null;
    return roleDoc.data() as Role;
  },

  async getByTenantId(tenantId: string | null): Promise<Role[]> {
    // Firestore where() accepts null but not undefined
    // Convert undefined to null for consistency
    const queryTenantId = tenantId === undefined ? null : tenantId;
    const q = query(collection(db, COLLECTIONS.ROLES), where('tenant_id', '==', queryTenantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Role);
  },

  async getAll(): Promise<Role[]> {
    const snapshot = await getDocs(collection(db, COLLECTIONS.ROLES));
    return snapshot.docs.map((doc) => doc.data() as Role);
  },

  async update(roleId: string, data: Partial<Omit<Role, 'id' | 'created_at'>>): Promise<void> {
    const roleRef = doc(db, COLLECTIONS.ROLES, roleId);
    await updateDoc(roleRef, {
      ...data,
      updated_at: Timestamp.now().toDate().toISOString()
    });
  },

  async delete(roleId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.ROLES, roleId));
  }
};

// ============================================================================
// PERMISSION OPERATIONS
// ============================================================================

export const permissionService = {
  async create(data: Omit<Permission, 'id' | 'created_at'>): Promise<Permission> {
    const permRef = doc(collection(db, COLLECTIONS.PERMISSIONS));
    const permission: Permission = {
      ...data,
      id: permRef.id,
      created_at: Timestamp.now().toDate().toISOString()
    };
    await setDoc(permRef, permission);
    return permission;
  },

  async getById(permissionId: string): Promise<Permission | null> {
    const permDoc = await getDoc(doc(db, COLLECTIONS.PERMISSIONS, permissionId));
    if (!permDoc.exists()) return null;
    return permDoc.data() as Permission;
  },

  async getByKey(key: string): Promise<Permission | null> {
    const q = query(collection(db, COLLECTIONS.PERMISSIONS), where('key', '==', key));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Permission;
  },

  async getAll(): Promise<Permission[]> {
    const snapshot = await getDocs(collection(db, COLLECTIONS.PERMISSIONS));
    return snapshot.docs.map((doc) => doc.data() as Permission);
  },

  async getByCategory(category: string): Promise<Permission[]> {
    const q = query(collection(db, COLLECTIONS.PERMISSIONS), where('category', '==', category));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Permission);
  }
};

// ============================================================================
// ROLE-PERMISSION OPERATIONS
// ============================================================================

export const rolePermissionService = {
  async assignPermission(roleId: string, permissionId: string): Promise<void> {
    const rpId = `${roleId}_${permissionId}`;
    const rpRef = doc(db, COLLECTIONS.ROLE_PERMISSIONS, rpId);
    const rolePermission: RolePermission = {
      role_id: roleId,
      permission_id: permissionId,
      created_at: Timestamp.now().toDate().toISOString()
    };
    await setDoc(rpRef, rolePermission);
  },

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    const rpId = `${roleId}_${permissionId}`;
    await deleteDoc(doc(db, COLLECTIONS.ROLE_PERMISSIONS, rpId));
  },

  async getPermissionsByRoleId(roleId: string): Promise<Permission[]> {
    if (!roleId || roleId.trim() === '') {
      return [];
    }
    const q = query(collection(db, COLLECTIONS.ROLE_PERMISSIONS), where('role_id', '==', roleId));
    const snapshot = await getDocs(q);
    const permissionIds = snapshot.docs.map((doc) => {
      const data = doc.data() as RolePermission;
      return data.permission_id;
    });

    const permissions: Permission[] = [];
    for (const permId of permissionIds) {
      const perm = await permissionService.getById(permId);
      if (perm) permissions.push(perm);
    }
    return permissions;
  },

  async getPermissionKeysByRoleId(roleId: string): Promise<string[]> {
    if (!roleId || roleId.trim() === '') {
      return [];
    }
    const permissions = await this.getPermissionsByRoleId(roleId);
    return permissions.map((p) => p.key);
  },

  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    if (!roleId || roleId.trim() === '') {
      throw new Error('roleId is required');
    }
    const batch = writeBatch(db);

    // Get existing permissions
    const q = query(collection(db, COLLECTIONS.ROLE_PERMISSIONS), where('role_id', '==', roleId));
    const existingSnapshot = await getDocs(q);
    const existingPermIds = new Set(
      existingSnapshot.docs.map((doc) => (doc.data() as RolePermission).permission_id)
    );
    const newPermIds = new Set(permissionIds);

    // Remove permissions not in new list
    for (const doc of existingSnapshot.docs) {
      const data = doc.data() as RolePermission;
      if (!newPermIds.has(data.permission_id)) {
        batch.delete(doc.ref);
      }
    }

    // Add new permissions
    for (const permId of permissionIds) {
      if (!existingPermIds.has(permId)) {
        const rpId = `${roleId}_${permId}`;
        const rpRef = doc(db, COLLECTIONS.ROLE_PERMISSIONS, rpId);
        const rolePermission: RolePermission = {
          role_id: roleId,
          permission_id: permId,
          created_at: Timestamp.now().toDate().toISOString()
        };
        batch.set(rpRef, rolePermission);
      }
    }

    await batch.commit();
  },

  async getRolesByPermissionId(permissionId: string): Promise<Role[]> {
    if (!permissionId || permissionId.trim() === '') {
      return [];
    }
    const q = query(
      collection(db, COLLECTIONS.ROLE_PERMISSIONS),
      where('permission_id', '==', permissionId)
    );
    const snapshot = await getDocs(q);
    const roleIds = snapshot.docs.map((doc) => {
      const data = doc.data() as RolePermission;
      return data.role_id;
    });

    const roles: Role[] = [];
    for (const roleId of roleIds) {
      const role = await roleService.getById(roleId);
      if (role) roles.push(role);
    }
    return roles;
  }
};

