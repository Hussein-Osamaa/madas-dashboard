# 🚀 Quick Setup: Initialize RBAC and Create Super Admin User

Follow these steps to set up your DIGIX Admin Dashboard access.

## Step 1: Initialize RBAC System (Create Roles & Permissions)

### Option A: Browser Console (Easiest - No service account needed)

1. **Log in** to the DIGIX Admin Dashboard at `http://localhost:5177/`
2. **Open browser console** (F12 or Cmd+Option+I)
3. **Copy and paste** this entire script:

```javascript
(async function initRBAC() {
  console.log('🚀 Initializing RBAC System...\n');
  
  try {
    const { db, collection, doc, setDoc, query, where, getDocs } = await import('/src/lib/firebase.js');
    
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
      const existingQuery = query(collection(db, 'permissions'), where('key', '==', perm.key));
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        permissionMap.set(perm.key, existingSnapshot.docs[0].id);
        continue;
      }
      
      const permRef = doc(collection(db, 'permissions'));
      await setDoc(permRef, {
        ...perm,
        created_at: new Date().toISOString()
      });
      permissionMap.set(perm.key, permRef.id);
    }
    
    console.log(`✅ Created ${DEFAULT_PERMISSIONS.length} permissions\n`);
    
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
    }
    
    console.log(`✅ Created ${SUPER_ADMIN_ROLES.length} super admin roles\n`);
    
    console.log('🔗 Step 3: Assigning permissions to roles...');
    
    for (const roleData of SUPER_ADMIN_ROLES) {
      const roleId = roleMap.get(roleData.name);
      
      for (const permKey of roleData.permissions) {
        const permId = permissionMap.get(permKey);
        if (!permId) continue;
        
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
    console.log(`\n🎉 RBAC System initialized!`);
    console.log(`📋 Root Role ID: ${rootRoleId}`);
    console.log(`\n💡 Next: Create your super admin user (see Step 2)`);
    
    // Store for next step
    window.__ROOT_ROLE_ID = rootRoleId;
    
    return { rootRoleId, roleMap, permissionMap };
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
```

4. **Wait** for the script to complete
5. **Note the Root Role ID** shown in the console (or check `window.__ROOT_ROLE_ID`)

### Option B: Node.js Script (If you have serviceAccountKey.json)

```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/new/finance_version"
node sys/scripts/init-rbac.js
```

## Step 2: Create Your Super Admin User

### Browser Console (Easiest)

1. **Still in the browser console** (or open it again)
2. **Copy and paste** this script:

```javascript
(async function createSuperAdmin() {
  const { db, collection, doc, setDoc, query, where, getDocs, updateDoc } = await import('/src/lib/firebase.js');
  const { auth } = await import('/src/lib/firebase.js');
  const user = auth.currentUser;
  
  if (!user) {
    console.error('❌ Please log in first!');
    return;
  }
  
  // Get Root role ID
  const rolesQuery = query(collection(db, 'roles'), where('name', '==', 'Root'), where('tenant_id', '==', null));
  const rolesSnapshot = await getDocs(rolesQuery);
  
  if (rolesSnapshot.empty) {
    console.error('❌ Root role not found! Run Step 1 first.');
    return;
  }
  
  const roleId = rolesSnapshot.docs[0].id;
  console.log('✅ Found Root role:', roleId);
  
  // Check if user exists
  const userQuery = query(collection(db, 'users'), where('firebase_uid', '==', user.uid));
  const userSnapshot = await getDocs(userQuery);
  
  const userData = {
    firebase_uid: user.uid,
    name: user.displayName || 'Super Admin',
    email: user.email,
    type: 'super_admin',
    role_id: roleId,
    tenant_id: null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  if (!userSnapshot.empty) {
    await updateDoc(doc(db, 'users', userSnapshot.docs[0].id), userData);
    console.log('✅ Updated user! Refresh the page.');
  } else {
    await setDoc(doc(collection(db, 'users')), userData);
    console.log('✅ Created user! Refresh the page.');
  }
})();
```

3. **Refresh the page** after the script completes

## Step 3: Verify Access

1. Refresh the browser page
2. You should now see the DIGIX Admin Dashboard
3. If you still see errors, check the browser console for details

## Troubleshooting

- **"Root role not found"**: Run Step 1 first to initialize RBAC
- **"No RBAC user found"**: Make sure you completed Step 2
- **Still can't access**: Check browser console for specific errors


