/**
 * RBAC API Endpoints
 * Firebase Cloud Functions for Role-Based Access Control
 */

const admin = require('firebase-admin');

// Lazy initialization of Firestore
let db = null;
const getDb = () => {
  if (!db) {
    db = admin.firestore();
  }
  return db;
};

const COLLECTIONS = {
  USERS: 'users',
  TENANTS: 'tenants',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  ROLE_PERMISSIONS: 'role_permissions'
};

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Verify Firebase ID token and extract user info
 */
async function verifyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next();
  } catch (error) {
    console.error('[verifyAuth] Error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

/**
 * Get RBAC user from Firestore by Firebase UID
 */
async function getRBACUser(firebaseUid) {
  const usersSnapshot = await db
    .collection(COLLECTIONS.USERS)
    .where('firebase_uid', '==', firebaseUid)
    .limit(1)
    .get();

  if (usersSnapshot.empty) return null;
  return { id: usersSnapshot.docs[0].id, ...usersSnapshot.docs[0].data() };
}

/**
 * Check if user has permission
 */
async function checkPermission(roleId, permissionKey) {
  // Get role permissions
  const rolePermsSnapshot = await db
    .collection(COLLECTIONS.ROLE_PERMISSIONS)
    .where('role_id', '==', roleId)
    .get();

  const permissionIds = rolePermsSnapshot.docs.map(doc => doc.data().permission_id);

  // Get permissions
  const permissions = [];
  for (const permId of permissionIds) {
    const permDoc = await getDb().collection(COLLECTIONS.PERMISSIONS).doc(permId).get();
    if (permDoc.exists) {
      permissions.push(permDoc.data().key);
    }
  }

  return permissions.includes(permissionKey);
}

/**
 * Authorization middleware - check permission
 */
function authorize(permissionKey) {
  return async (req, res, next) => {
    try {
      const rbacUser = await getRBACUser(req.user.uid);
      if (!rbacUser || rbacUser.status !== 'active') {
        return res.status(403).json({ error: 'Access denied: User not active' });
      }

      const hasPermission = await checkPermission(rbacUser.role_id, permissionKey);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
      }

      req.rbacUser = rbacUser;
      next();
    } catch (error) {
      console.error('[authorize] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// ============================================================================
// USER ENDPOINTS
// ============================================================================

/**
 * GET /api/rbac/users
 * Get all users (filtered by tenant for tenant staff)
 */
async function getUsers(req, res) {
  try {
    const { tenant_id, type, status } = req.query;
    let query = getDb().collection(COLLECTIONS.USERS);

    // Apply filters
    if (tenant_id) {
      query = query.where('tenant_id', '==', tenant_id);
    }
    if (type) {
      query = query.where('type', '==', type);
    }
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      password: undefined // Never return password
    }));

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('[getUsers] Error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * GET /api/rbac/users/:id
 * Get user by ID
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const userDoc = await getDb().collection(COLLECTIONS.USERS).doc(id).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = { id: userDoc.id, ...userDoc.data() };
    delete userData.password; // Never return password

    res.json({ success: true, data: userData });
  } catch (error) {
    console.error('[getUserById] Error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/**
 * POST /api/rbac/users
 * Create new user
 */
async function createUser(req, res) {
  try {
    const { name, email, password, tenant_id, role_id, type, status } = req.body;

    if (!name || !email || !role_id || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await db
      .collection(COLLECTIONS.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create Firebase Auth user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: name
      });
    } catch (error) {
      console.error('[createUser] Firebase Auth error:', error);
      return res.status(400).json({ error: 'Failed to create user account' });
    }

    // Hash password (in production, use bcrypt)
    // For now, we'll store it (but should hash server-side)

    const userData = {
      name,
      email,
      password: password, // In production, hash this with bcrypt
      tenant_id: tenant_id || null,
      role_id,
      type,
      status: status || 'active',
      firebase_uid: firebaseUser.uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const userRef = await getDb().collection(COLLECTIONS.USERS).add(userData);
    const userDoc = await userRef.get();

    const responseData = { id: userDoc.id, ...userDoc.data() };
    delete responseData.password;

    res.status(201).json({ success: true, data: responseData });
  } catch (error) {
    console.error('[createUser] Error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

/**
 * PUT /api/rbac/users/:id
 * Update user
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, tenant_id, role_id, status } = req.body;

    const updateData = {
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (tenant_id !== undefined) updateData.tenant_id = tenant_id;
    if (role_id) updateData.role_id = role_id;
    if (status) updateData.status = status;

    await getDb().collection(COLLECTIONS.USERS).doc(id).update(updateData);
    const userDoc = await getDb().collection(COLLECTIONS.USERS).doc(id).get();

    const responseData = { id: userDoc.id, ...userDoc.data() };
    delete responseData.password;

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('[updateUser] Error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

/**
 * DELETE /api/rbac/users/:id
 * Delete user
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    
    const userDoc = await getDb().collection(COLLECTIONS.USERS).doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    
    // Delete Firebase Auth user if exists
    if (userData.firebase_uid) {
      try {
        await admin.auth().deleteUser(userData.firebase_uid);
      } catch (error) {
        console.error('[deleteUser] Firebase Auth delete error:', error);
      }
    }

    await getDb().collection(COLLECTIONS.USERS).doc(id).delete();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('[deleteUser] Error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

// ============================================================================
// ROLE ENDPOINTS
// ============================================================================

/**
 * GET /api/rbac/roles
 * Get all roles (filtered by tenant)
 */
async function getRoles(req, res) {
  try {
    const { tenant_id } = req.query;
    let query = getDb().collection(COLLECTIONS.ROLES);

    if (tenant_id !== undefined) {
      query = query.where('tenant_id', '==', tenant_id);
    }

    const snapshot = await query.get();
    const roles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('[getRoles] Error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
}

/**
 * POST /api/rbac/roles
 * Create new role
 */
async function createRole(req, res) {
  try {
    const { name, tenant_id, description, is_system } = req.body;

    if (!name || description === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const roleData = {
      name,
      tenant_id: tenant_id || null,
      description,
      is_system: is_system || false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    const roleRef = await getDb().collection(COLLECTIONS.ROLES).add(roleData);
    const roleDoc = await roleRef.get();

    res.status(201).json({
      success: true,
      data: { id: roleDoc.id, ...roleDoc.data() }
    });
  } catch (error) {
    console.error('[createRole] Error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
}

/**
 * PUT /api/rbac/roles/:id/permissions
 * Update role permissions
 */
async function updateRolePermissions(req, res) {
  try {
    const { id } = req.params;
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({ error: 'permission_ids must be an array' });
    }

    // Get existing permissions
    const existingPerms = await db
      .collection(COLLECTIONS.ROLE_PERMISSIONS)
      .where('role_id', '==', id)
      .get();

    const existingPermIds = new Set(existingPerms.docs.map(doc => doc.data().permission_id));
    const newPermIds = new Set(permission_ids);

    const batch = getDb().batch();

    // Remove permissions not in new list
    existingPerms.docs.forEach(doc => {
      const permId = doc.data().permission_id;
      if (!newPermIds.has(permId)) {
        batch.delete(doc.ref);
      }
    });

    // Add new permissions
    permission_ids.forEach(permId => {
      if (!existingPermIds.has(permId)) {
        const rpId = `${id}_${permId}`;
        const rpRef = getDb().collection(COLLECTIONS.ROLE_PERMISSIONS).doc(rpId);
        batch.set(rpRef, {
          role_id: id,
          permission_id: permId,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    await batch.commit();

    res.json({ success: true, message: 'Role permissions updated successfully' });
  } catch (error) {
    console.error('[updateRolePermissions] Error:', error);
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
}

// ============================================================================
// PERMISSION ENDPOINTS
// ============================================================================

/**
 * GET /api/rbac/permissions
 * Get all permissions
 */
async function getPermissions(req, res) {
  try {
    const { category } = req.query;
    let query = getDb().collection(COLLECTIONS.PERMISSIONS);

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const permissions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('[getPermissions] Error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
}

/**
 * GET /api/rbac/roles/:id/permissions
 * Get permissions for a role
 */
async function getRolePermissions(req, res) {
  try {
    const { id } = req.params;

    const rolePerms = await db
      .collection(COLLECTIONS.ROLE_PERMISSIONS)
      .where('role_id', '==', id)
      .get();

    const permissionIds = rolePerms.docs.map(doc => doc.data().permission_id);
    
    const permissions = [];
    for (const permId of permissionIds) {
      const permDoc = await getDb().collection(COLLECTIONS.PERMISSIONS).doc(permId).get();
      if (permDoc.exists) {
        permissions.push({ id: permDoc.id, ...permDoc.data() });
      }
    }

    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('[getRolePermissions] Error:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  verifyAuth,
  authorize,
  getRBACUser,
  checkPermission,
  // User endpoints
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  // Role endpoints
  getRoles,
  createRole,
  updateRolePermissions,
  // Permission endpoints
  getPermissions,
  getRolePermissions
};


