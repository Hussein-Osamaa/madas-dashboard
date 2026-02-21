// ============================================================================
// STEP 1: INITIALIZE RBAC SYSTEM
// Copy everything from here to the end of this file and paste in browser console
// ============================================================================

(async function initRBAC() {
  console.log('🚀 Initializing RBAC System...\n');
  
  // Load Firebase SDK from CDN (most reliable for console scripts)
  console.log('📦 Loading Firebase SDK from CDN...');
  const loadFirebase = () => new Promise((resolve, reject) => {
    if (window.firebase) {
      resolve(window.firebase);
      return;
    }
    const script1 = document.createElement('script');
    script1.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
    script1.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js';
      script2.onload = () => {
        const script3 = document.createElement('script');
        script3.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js';
        script3.onload = () => resolve(window.firebase);
        script3.onerror = reject;
        document.head.appendChild(script3);
      };
      script2.onerror = reject;
      document.head.appendChild(script2);
    };
    script1.onerror = reject;
    document.head.appendChild(script1);
  });
  
  try {
    const firebase = await loadFirebase();
    
    // Verify Firebase is loaded correctly
    if (!firebase || typeof firebase.firestore !== 'function') {
      throw new Error('Firebase Firestore SDK not loaded. Please refresh and try again.');
    }
    
    const firebaseConfig = {
      apiKey: 'AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8',
      authDomain: 'madas-store.firebaseapp.com',
      projectId: 'madas-store',
      storageBucket: 'madas-store.firebasestorage.app',
      messagingSenderId: '527071300010',
      appId: '1:527071300010:web:7470e2204065b4590583d3'
    };
    
    // Initialize Firebase (don't create duplicate apps)
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Wait a bit for Firebase to initialize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Get Firestore and Auth instances using Compat API
    const db = firebase.firestore();
    const auth = firebase.auth();
    
    // Verify db is a Firestore instance
    if (!db || typeof db.collection !== 'function') {
      console.error('❌ Firestore not initialized correctly');
      console.error('db object:', db);
      console.error('db.collection type:', typeof db.collection);
      throw new Error('Firestore not initialized correctly. db.collection is not a function. Please refresh the page and try again.');
    }
    
    console.log('✅ Firestore initialized successfully');
    
    // Check if user is authenticated
    let currentUser = auth.currentUser;
    
    // Wait a bit for auth state to load
    if (!currentUser) {
      await new Promise(resolve => setTimeout(resolve, 500));
      currentUser = auth.currentUser;
    }
    
    if (!currentUser) {
      console.error('❌ ERROR: You are not logged in!');
      console.error('\n💡 Please:');
      console.error('   1. Log in at http://localhost:5177/login');
      console.error('   2. Then run this script again');
      console.error('\n   OR sign in here with:');
      console.error('   await auth.signInWithEmailAndPassword("hesainosama@gmail.com", "YOUR_PASSWORD")');
      return;
    }
    
    console.log('✅ Authenticated as:', currentUser.email);
    
    // Now db and auth are available in this scope
    console.log('✅ Firebase initialized and ready\n');
    
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
      await permRef.set({ ...perm, created_at: new Date().toISOString() });
      permissionMap.set(perm.key, permRef.id);
    }
    console.log(`✅ Created ${DEFAULT_PERMISSIONS.length} permissions\n`);
    
    console.log('👑 Step 2: Creating super admin roles...');
    const roleMap = new Map();
    for (const roleData of SUPER_ADMIN_ROLES) {
      const existing = await db.collection('roles').where('name', '==', roleData.name).where('tenant_id', '==', null).get();
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
        const existing = await db.collection('role_permissions').where('role_id', '==', roleId).where('permission_id', '==', permId).get();
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
    window.__ROOT_ROLE_ID = rootRoleId;
    
    return { rootRoleId, roleMap, permissionMap };
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    if (error.message && error.message.includes('collection is not a function')) {
      console.error('   - Firebase may not have loaded correctly');
      console.error('   - Try refreshing the page and running the script again');
      console.error('   - Make sure all Firebase scripts loaded from CDN');
    }
    if (error.code === 'permission-denied') {
      console.error('   - Deploy Firestore rules first:');
      console.error('   - https://console.firebase.google.com/project/madas-store/firestore/rules');
    }
  }
})();

