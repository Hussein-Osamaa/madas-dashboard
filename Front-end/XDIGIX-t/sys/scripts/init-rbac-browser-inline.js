/**
 * Initialize RBAC System from Browser Console
 * 
 * INSTRUCTIONS:
 * 1. Log in to the DIGIX Admin Dashboard at http://localhost:5177/
 * 2. Open browser console (F12)
 * 3. Copy and paste this ENTIRE script (including the Firebase imports)
 * 4. Press Enter and wait for completion
 */

// First, load Firebase SDK from CDN
const loadFirebase = () => {
  return new Promise((resolve, reject) => {
    if (window.firebase) {
      resolve(window.firebase);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
    script.onload = () => {
      const authScript = document.createElement('script');
      authScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
      authScript.onload = () => {
        const firestoreScript = document.createElement('script');
        firestoreScript.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';
        firestoreScript.onload = () => {
          resolve(window.firebase);
        };
        firestoreScript.onerror = reject;
        document.head.appendChild(firestoreScript);
      };
      authScript.onerror = reject;
      document.head.appendChild(authScript);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

(async function initRBAC() {
  console.log('🚀 Initializing RBAC System...\n');
  
  try {
    // Try to use existing Firebase instance from the app
    let db, auth;
    
    // Check if Firebase is already initialized in the app
    if (window.__FIREBASE_DB__ && window.__FIREBASE_AUTH__) {
      console.log('✅ Using existing Firebase instance');
      db = window.__FIREBASE_DB__;
      auth = window.__FIREBASE_AUTH__;
    } else {
      // Fallback: Load Firebase from CDN and initialize
      console.log('📦 Loading Firebase SDK...');
      const firebase = await loadFirebase();
      
      const firebaseConfig = {
        apiKey: 'AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8',
        authDomain: 'madas-store.firebaseapp.com',
        projectId: 'madas-store',
        storageBucket: 'madas-store.firebasestorage.app',
        messagingSenderId: '527071300010',
        appId: '1:527071300010:web:7470e2204065b4590583d3'
      };
      
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      db = firebase.firestore();
      auth = firebase.auth();
    }
    
    const DEFAULT_PERMISSIONS = [
      { key: 'super_admin.manage_all_tenants', description: 'Manage all tenants', category: 'super_admin' },
      { key: 'super_admin.manage_staff', description: 'Manage super admin staff', category: 'super_admin' },
      { key: 'super_admin.view_analytics', description: 'View platform analytics', category: 'super_admin' },
      { key: 'super_admin.manage_subscriptions', description: 'Manage subscriptions', category: 'super_admin' },
      { key: 'super_admin.manage_roles', description: 'Manage roles', category: 'super_admin' },
      { key: 'super_admin.manage_permissions', description: 'Manage permissions', category: 'super_admin' },
      { key: 'tenant_admin.manage_staff', description: 'Manage tenant staff', category: 'tenant_admin' },
      { key: 'tenant_admin.manage_roles', description: 'Manage tenant roles', category: 'tenant_admin' },
      { key: 'tenant_admin.manage_settings', description: 'Manage tenant settings', category: 'tenant_admin' },
      { key: 'tenant_admin.view_analytics', description: 'View tenant analytics', category: 'tenant_admin' },
      { key: 'users.view', description: 'View users', category: 'users' },
      { key: 'users.create', description: 'Create users', category: 'users' },
      { key: 'users.edit', description: 'Edit users', category: 'users' },
      { key: 'users.delete', description: 'Delete users', category: 'users' },
      { key: 'orders.view', description: 'View orders', category: 'orders' },
      { key: 'orders.create', description: 'Create orders', category: 'orders' },
      { key: 'orders.edit', description: 'Edit orders', category: 'orders' },
      { key: 'orders.delete', description: 'Delete orders', category: 'orders' },
      { key: 'orders.process', description: 'Process orders', category: 'orders' },
      { key: 'products.view', description: 'View products', category: 'products' },
      { key: 'products.create', description: 'Create products', category: 'products' },
      { key: 'products.edit', description: 'Edit products', category: 'products' },
      { key: 'products.delete', description: 'Delete products', category: 'products' },
      { key: 'customers.view', description: 'View customers', category: 'customers' },
      { key: 'customers.create', description: 'Create customers', category: 'customers' },
      { key: 'customers.edit', description: 'Edit customers', category: 'customers' },
      { key: 'customers.delete', description: 'Delete customers', category: 'customers' },
      { key: 'finance.view', description: 'View finance', category: 'finance' },
      { key: 'finance.view_reports', description: 'View finance reports', category: 'finance' },
      { key: 'finance.create_transaction', description: 'Create transactions', category: 'finance' },
      { key: 'finance.edit_transaction', description: 'Edit transactions', category: 'finance' },
      { key: 'finance.delete_transaction', description: 'Delete transactions', category: 'finance' },
      { key: 'finance.manage_accounts', description: 'Manage accounts', category: 'finance' },
      { key: 'settings.view', description: 'View settings', category: 'settings' },
      { key: 'settings.edit', description: 'Edit settings', category: 'settings' }
    ];
    
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
    
    console.log('📝 Step 1: Creating permissions...');
    const permissionMap = new Map();
    
    for (const perm of DEFAULT_PERMISSIONS) {
      const existing = await db.collection('permissions').where('key', '==', perm.key).get();
      
      if (!existing.empty) {
        permissionMap.set(perm.key, existing.docs[0].id);
        continue;
      }
      
      const permRef = db.collection('permissions').doc();
      await permRef.set({
        ...perm,
        created_at: new Date().toISOString()
      });
      permissionMap.set(perm.key, permRef.id);
    }
    
    console.log(`✅ Created ${DEFAULT_PERMISSIONS.length} permissions\n`);
    
    console.log('👑 Step 2: Creating super admin roles...');
    const roleMap = new Map();
    
    for (const roleData of SUPER_ADMIN_ROLES) {
      const existing = await db.collection('roles')
        .where('name', '==', roleData.name)
        .where('tenant_id', '==', null)
        .get();
      
      let roleId;
      if (!existing.empty) {
        roleId = existing.docs[0].id;
        roleMap.set(roleData.name, roleId);
        continue;
      }
      
      const roleRef = db.collection('roles').doc();
      await roleRef.set({
        name: roleData.name,
        tenant_id: roleData.tenant_id,
        description: roleData.description,
        is_system: roleData.is_system,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      roleId = roleRef.id;
      roleMap.set(roleData.name, roleId);
      console.log(`  ✅ Created role: ${roleData.name} (ID: ${roleId})`);
    }
    
    console.log(`\n✅ Created ${SUPER_ADMIN_ROLES.length} super admin roles\n`);
    
    console.log('🔗 Step 3: Assigning permissions to roles...');
    
    for (const roleData of SUPER_ADMIN_ROLES) {
      const roleId = roleMap.get(roleData.name);
      
      for (const permKey of roleData.permissions) {
        const permId = permissionMap.get(permKey);
        if (!permId) continue;
        
        const rpId = `${roleId}_${permId}`;
        const existing = await db.collection('role_permissions')
          .where('role_id', '==', roleId)
          .where('permission_id', '==', permId)
          .get();
        
        if (existing.empty) {
          await db.collection('role_permissions').doc(rpId).set({
            role_id: roleId,
            permission_id: permId,
            created_at: new Date().toISOString()
          });
        }
      }
    }
    
    console.log('✅ Assigned permissions to roles');
    
    const rootRoleId = roleMap.get('Root');
    console.log(`\n🎉 RBAC System initialized!`);
    console.log(`📋 Root Role ID: ${rootRoleId}`);
    console.log(`\n💡 Next: Create your super admin user`);
    window.__ROOT_ROLE_ID = rootRoleId;
    
    return { rootRoleId, roleMap, permissionMap };
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
})();


