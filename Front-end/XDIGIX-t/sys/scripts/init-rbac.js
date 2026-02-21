/**
 * Initialize RBAC System
 * Creates default roles and permissions in Firestore
 * 
 * Run this script once to set up the RBAC system:
 * node sys/scripts/init-rbac.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  // Already initialized
  if (error.code !== 'app/already-initialized') {
    console.error('Error initializing Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

const COLLECTIONS = {
  PERMISSIONS: 'permissions',
  ROLES: 'roles',
  ROLE_PERMISSIONS: 'role_permissions'
};

// Default permissions
const DEFAULT_PERMISSIONS = [
  // Super Admin Permissions
  { key: 'super_admin.manage_all_tenants', description: 'Manage all tenants', category: 'super_admin' },
  { key: 'super_admin.manage_staff', description: 'Manage super admin staff', category: 'super_admin' },
  { key: 'super_admin.view_analytics', description: 'View platform analytics', category: 'super_admin' },
  { key: 'super_admin.manage_subscriptions', description: 'Manage subscriptions', category: 'super_admin' },
  { key: 'super_admin.manage_roles', description: 'Manage roles', category: 'super_admin' },
  { key: 'super_admin.manage_permissions', description: 'Manage permissions', category: 'super_admin' },
  
  // Tenant Admin Permissions
  { key: 'tenant_admin.manage_staff', description: 'Manage tenant staff', category: 'tenant_admin' },
  { key: 'tenant_admin.manage_roles', description: 'Manage tenant roles', category: 'tenant_admin' },
  { key: 'tenant_admin.manage_settings', description: 'Manage tenant settings', category: 'tenant_admin' },
  { key: 'tenant_admin.view_analytics', description: 'View tenant analytics', category: 'tenant_admin' },
  
  // User Permissions
  { key: 'users.view', description: 'View users', category: 'users' },
  { key: 'users.create', description: 'Create users', category: 'users' },
  { key: 'users.edit', description: 'Edit users', category: 'users' },
  { key: 'users.delete', description: 'Delete users', category: 'users' },
  
  // Order Permissions
  { key: 'orders.view', description: 'View orders', category: 'orders' },
  { key: 'orders.create', description: 'Create orders', category: 'orders' },
  { key: 'orders.edit', description: 'Edit orders', category: 'orders' },
  { key: 'orders.delete', description: 'Delete orders', category: 'orders' },
  { key: 'orders.process', description: 'Process orders', category: 'orders' },
  
  // Product Permissions
  { key: 'products.view', description: 'View products', category: 'products' },
  { key: 'products.create', description: 'Create products', category: 'products' },
  { key: 'products.edit', description: 'Edit products', category: 'products' },
  { key: 'products.delete', description: 'Delete products', category: 'products' },
  
  // Customer Permissions
  { key: 'customers.view', description: 'View customers', category: 'customers' },
  { key: 'customers.create', description: 'Create customers', category: 'customers' },
  { key: 'customers.edit', description: 'Edit customers', category: 'customers' },
  { key: 'customers.delete', description: 'Delete customers', category: 'customers' },
  
  // Finance Permissions
  { key: 'finance.view', description: 'View finance', category: 'finance' },
  { key: 'finance.view_reports', description: 'View finance reports', category: 'finance' },
  { key: 'finance.create_transaction', description: 'Create transactions', category: 'finance' },
  { key: 'finance.edit_transaction', description: 'Edit transactions', category: 'finance' },
  { key: 'finance.delete_transaction', description: 'Delete transactions', category: 'finance' },
  { key: 'finance.manage_accounts', description: 'Manage accounts', category: 'finance' },
  
  // Settings Permissions
  { key: 'settings.view', description: 'View settings', category: 'settings' },
  { key: 'settings.edit', description: 'Edit settings', category: 'settings' }
];

// Default roles for Super Admin
const SUPER_ADMIN_ROLES = [
  {
    name: 'Root',
    tenant_id: null,
    description: 'Super admin root role with all permissions',
    is_system: true,
    permissions: [
      'super_admin.manage_all_tenants',
      'super_admin.manage_staff',
      'super_admin.view_analytics',
      'super_admin.manage_subscriptions',
      'super_admin.manage_roles',
      'super_admin.manage_permissions'
    ]
  },
  {
    name: 'Finance',
    tenant_id: null,
    description: 'Super admin finance role',
    is_system: true,
    permissions: [
      'super_admin.view_analytics',
      'super_admin.manage_subscriptions',
      'finance.view',
      'finance.view_reports'
    ]
  },
  {
    name: 'Ops',
    tenant_id: null,
    description: 'Super admin operations role',
    is_system: true,
    permissions: [
      'super_admin.view_analytics',
      'users.view',
      'users.edit'
    ]
  },
  {
    name: 'Support',
    tenant_id: null,
    description: 'Super admin support role',
    is_system: true,
    permissions: [
      'users.view',
      'orders.view'
    ]
  }
];

// Default roles for Tenants
const TENANT_ROLES = [
  {
    name: 'Owner',
    tenant_id: null, // Will be set per tenant
    description: 'Tenant owner with full access',
    is_system: true,
    permissions: [
      'tenant_admin.manage_staff',
      'tenant_admin.manage_roles',
      'tenant_admin.manage_settings',
      'tenant_admin.view_analytics',
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'orders.view',
      'orders.create',
      'orders.edit',
      'orders.delete',
      'orders.process',
      'products.view',
      'products.create',
      'products.edit',
      'products.delete',
      'customers.view',
      'customers.create',
      'customers.edit',
      'customers.delete',
      'finance.view',
      'finance.view_reports',
      'finance.create_transaction',
      'finance.edit_transaction',
      'finance.delete_transaction',
      'finance.manage_accounts',
      'settings.view',
      'settings.edit'
    ]
  },
  {
    name: 'Manager',
    tenant_id: null,
    description: 'Tenant manager role',
    is_system: true,
    permissions: [
      'orders.view',
      'orders.create',
      'orders.edit',
      'orders.process',
      'products.view',
      'products.create',
      'products.edit',
      'customers.view',
      'customers.create',
      'customers.edit',
      'finance.view',
      'finance.view_reports',
      'settings.view'
    ]
  },
  {
    name: 'Sales',
    tenant_id: null,
    description: 'Tenant sales role',
    is_system: true,
    permissions: [
      'orders.view',
      'orders.create',
      'products.view',
      'customers.view',
      'customers.create',
      'customers.edit'
    ]
  },
  {
    name: 'Viewer',
    tenant_id: null,
    description: 'Tenant viewer role (read-only)',
    is_system: true,
    permissions: [
      'orders.view',
      'products.view',
      'customers.view',
      'finance.view',
      'settings.view'
    ]
  }
];

async function initializePermissions() {
  console.log('📝 Initializing permissions...');
  
  const batch = db.batch();
  const permissionMap = new Map();

  for (const perm of DEFAULT_PERMISSIONS) {
    // Check if permission already exists
    const existing = await db
      .collection(COLLECTIONS.PERMISSIONS)
      .where('key', '==', perm.key)
      .limit(1)
      .get();

    if (!existing.empty) {
      console.log(`  ⚠️  Permission "${perm.key}" already exists, skipping...`);
      permissionMap.set(perm.key, existing.docs[0].id);
      continue;
    }

    const permRef = db.collection(COLLECTIONS.PERMISSIONS).doc();
    batch.set(permRef, {
      ...perm,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    permissionMap.set(perm.key, permRef.id);
  }

  await batch.commit();
  console.log(`  ✅ Created ${DEFAULT_PERMISSIONS.length} permissions`);
  
  return permissionMap;
}

async function initializeSuperAdminRoles(permissionMap) {
  console.log('👑 Initializing super admin roles...');
  
  const batch = db.batch();
  const roleMap = new Map();

  for (const roleData of SUPER_ADMIN_ROLES) {
    // Check if role already exists
    const existing = await db
      .collection(COLLECTIONS.ROLES)
      .where('name', '==', roleData.name)
      .where('tenant_id', '==', null)
      .limit(1)
      .get();

    let roleId;
    if (!existing.empty) {
      console.log(`  ⚠️  Role "${roleData.name}" already exists, skipping...`);
      roleId = existing.docs[0].id;
      roleMap.set(roleData.name, roleId);
      continue;
    }

    const roleRef = db.collection(COLLECTIONS.ROLES).doc();
    batch.set(roleRef, {
      name: roleData.name,
      tenant_id: roleData.tenant_id,
      description: roleData.description,
      is_system: roleData.is_system,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    roleId = roleRef.id;
    roleMap.set(roleData.name, roleId);
  }

  await batch.commit();
  console.log(`  ✅ Created ${SUPER_ADMIN_ROLES.length} super admin roles`);

  // Assign permissions to roles
  console.log('🔗 Assigning permissions to super admin roles...');
  const rpBatch = db.batch();

  for (const roleData of SUPER_ADMIN_ROLES) {
    const roleId = roleMap.get(roleData.name);
    
    for (const permKey of roleData.permissions) {
      const permId = permissionMap.get(permKey);
      if (!permId) {
        console.warn(`  ⚠️  Permission "${permKey}" not found for role "${roleData.name}"`);
        continue;
      }

      const rpId = `${roleId}_${permId}`;
      const rpRef = db.collection(COLLECTIONS.ROLE_PERMISSIONS).doc(rpId);
      
      // Check if already exists
      const existing = await rpRef.get();
      if (!existing.exists) {
        rpBatch.set(rpRef, {
          role_id: roleId,
          permission_id: permId,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  }

  await rpBatch.commit();
  console.log('  ✅ Assigned permissions to super admin roles');

  return roleMap;
}

async function main() {
  try {
    console.log('🚀 Initializing RBAC System...\n');

    // Initialize permissions
    const permissionMap = await initializePermissions();
    console.log('');

    // Initialize super admin roles
    const superAdminRoleMap = await initializeSuperAdminRoles(permissionMap);
    console.log('');

    console.log('✅ RBAC System initialized successfully!');
    console.log('\n📋 Summary:');
    console.log(`  - ${DEFAULT_PERMISSIONS.length} permissions created`);
    console.log(`  - ${SUPER_ADMIN_ROLES.length} super admin roles created`);
    console.log('\n💡 Note: Tenant roles should be created per tenant when needed.');
    console.log('   Use the same structure as TENANT_ROLES but set tenant_id.');

  } catch (error) {
    console.error('❌ Error initializing RBAC system:', error);
    process.exit(1);
  }
}

// Run initialization
main();


