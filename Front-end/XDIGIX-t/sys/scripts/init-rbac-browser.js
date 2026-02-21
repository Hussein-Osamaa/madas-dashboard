/**
 * Initialize RBAC System from Browser Console
 * Creates default roles and permissions in Firestore
 * 
 * INSTRUCTIONS:
 * 1. Log in to the DIGIX Admin Dashboard (http://localhost:5177/)
 * 2. Open browser console (F12 or Cmd+Option+I)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter
 * 5. Wait for completion message
 */

(async function initRBAC() {
  console.log('🚀 Initializing RBAC System...\n');
  
  try {
    const { db, collection, doc, setDoc, query, where, getDocs, writeBatch } = await import('/src/lib/firebase.js');
    
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
    
    // Step 1: Create permissions
    console.log('📝 Step 1: Creating permissions...');
    const permissionMap = new Map();
    
    for (const perm of DEFAULT_PERMISSIONS) {
      const existingQuery = query(collection(db, 'permissions'), where('key', '==', perm.key));
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        console.log(`  ⚠️  Permission "${perm.key}" already exists`);
        permissionMap.set(perm.key, existingSnapshot.docs[0].id);
        continue;
      }
      
      const permRef = doc(collection(db, 'permissions'));
      await setDoc(permRef, {
        ...perm,
        created_at: new Date().toISOString()
      });
      permissionMap.set(perm.key, permRef.id);
      console.log(`  ✅ Created permission: ${perm.key}`);
    }
    
    console.log(`\n✅ Created ${DEFAULT_PERMISSIONS.length} permissions\n`);
    
    // Step 2: Create roles
    console.log('👑 Step 2: Creating super admin roles...');
    const roleMap = new Map();
    
    for (const roleData of SUPER_ADMIN_ROLES) {
      const existingQuery = query(
        collection(db, 'roles'),
        where('name', '==', roleData.name),
        where('tenant_id', '==', null)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      let roleId;
      if (!existingSnapshot.empty) {
        console.log(`  ⚠️  Role "${roleData.name}" already exists`);
        roleId = existingSnapshot.docs[0].id;
        roleMap.set(roleData.name, roleId);
        continue;
      }
      
      const roleRef = doc(collection(db, 'roles'));
      await setDoc(roleRef, {
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
    
    // Step 3: Assign permissions to roles
    console.log('🔗 Step 3: Assigning permissions to roles...');
    
    for (const roleData of SUPER_ADMIN_ROLES) {
      const roleId = roleMap.get(roleData.name);
      
      for (const permKey of roleData.permissions) {
        const permId = permissionMap.get(permKey);
        if (!permId) {
          console.warn(`  ⚠️  Permission "${permKey}" not found for role "${roleData.name}"`);
          continue;
        }
        
        const rpId = `${roleId}_${permId}`;
        const rpRef = doc(db, 'role_permissions', rpId);
        
        const existing = await getDocs(query(collection(db, 'role_permissions'), where('role_id', '==', roleId), where('permission_id', '==', permId)));
        if (existing.empty) {
          await setDoc(rpRef, {
            role_id: roleId,
            permission_id: permId,
            created_at: new Date().toISOString()
          });
        }
      }
    }
    
    console.log('✅ Assigned permissions to roles');
    
    const rootRoleId = roleMap.get('Root');
    console.log(`\n🎉 RBAC System initialized successfully!`);
    console.log(`\n📋 Summary:`);
    console.log(`  - ${DEFAULT_PERMISSIONS.length} permissions created`);
    console.log(`  - ${SUPER_ADMIN_ROLES.length} super admin roles created`);
    console.log(`  - Root Role ID: ${rootRoleId}`);
    console.log(`\n💡 Next step: Create your super admin user with role_id: ${rootRoleId}`);
    
    return { rootRoleId, roleMap, permissionMap };
    
  } catch (error) {
    console.error('❌ Error initializing RBAC system:', error);
    throw error;
  }
})();

