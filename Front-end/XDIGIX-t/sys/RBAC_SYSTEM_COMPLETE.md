# 🔐 RBAC System Implementation - Complete

## Overview

A complete Role-Based Access Control (RBAC) system has been implemented for your multi-tenant management platform. This system provides two-layer permission control:

1. **Super Admin Layer**: Super admins can manage their internal staff (Root, Finance, Ops, Support roles)
2. **Tenant Layer**: Tenant admins can manage their company's staff (Owner, Manager, Sales, Viewer roles)

---

## 📁 File Structure

### Type Definitions
- `sys/shared/types/rbac.ts` - Complete TypeScript types for RBAC system

### Service Layer
- `sys/shared/lib/rbacService.ts` - Firestore operations for RBAC
- `sys/shared/lib/permissions.ts` - Permission checking utilities
- `sys/shared/lib/auth.ts` - Authentication and token management

### Frontend Context & Components
- `sys/apps/dashboard/src/contexts/RBACContext.tsx` - RBAC context provider
- `sys/apps/dashboard/src/components/rbac/PermissionGuard.tsx` - Component for protecting UI elements
- `sys/apps/dashboard/src/pages/rbac/RolesPage.tsx` - Roles management page
- `sys/apps/dashboard/src/pages/rbac/UsersPage.tsx` - Users management page

### Backend API
- `sys/functions/rbac.js` - RBAC API endpoints for Cloud Functions
- `sys/functions/index.js` - Updated with RBAC routes

### Initialization
- `sys/scripts/init-rbac.js` - Script to initialize default roles and permissions

---

## 🗄️ Database Structure

### Firestore Collections

```
/users
  - id (string)
  - name (string)
  - email (string)
  - password (hashed, only in creation/update)
  - tenant_id (string | null) // null for super admin users
  - role_id (string)
  - type ('super_admin' | 'tenant_staff')
  - status ('active' | 'inactive' | 'suspended')
  - firebase_uid (string) // Link to Firebase Auth
  - created_at (timestamp)
  - updated_at (timestamp)
  - last_login_at (timestamp)

/tenants
  - id (string)
  - name (string)
  - plan ('basic' | 'professional' | 'enterprise')
  - status ('active' | 'trial' | 'suspended' | 'cancelled')
  - created_at (timestamp)
  - updated_at (timestamp)

/roles
  - id (string)
  - name (string)
  - tenant_id (string | null) // null for super admin roles
  - description (string)
  - is_system (boolean) // true for default roles
  - created_at (timestamp)
  - updated_at (timestamp)

/permissions
  - id (string)
  - key (string) // e.g., 'users.create', 'orders.view'
  - description (string)
  - category (string) // e.g., 'users', 'orders', 'finance'
  - created_at (timestamp)

/role_permissions
  - id (string) // Format: {role_id}_{permission_id}
  - role_id (string)
  - permission_id (string)
  - created_at (timestamp)
```

---

## 🔑 Default Permissions

### Super Admin Permissions
- `super_admin.manage_all_tenants` - Manage all tenants
- `super_admin.manage_staff` - Manage super admin staff
- `super_admin.view_analytics` - View platform analytics
- `super_admin.manage_subscriptions` - Manage subscriptions
- `super_admin.manage_roles` - Manage roles
- `super_admin.manage_permissions` - Manage permissions

### Tenant Admin Permissions
- `tenant_admin.manage_staff` - Manage tenant staff
- `tenant_admin.manage_roles` - Manage tenant roles
- `tenant_admin.manage_settings` - Manage tenant settings
- `tenant_admin.view_analytics` - View tenant analytics

### Common Permissions
- `users.view`, `users.create`, `users.edit`, `users.delete`
- `orders.view`, `orders.create`, `orders.edit`, `orders.delete`, `orders.process`
- `products.view`, `products.create`, `products.edit`, `products.delete`
- `customers.view`, `customers.create`, `customers.edit`, `customers.delete`
- `finance.view`, `finance.view_reports`, `finance.create_transaction`, etc.
- `settings.view`, `settings.edit`

---

## 👥 Default Roles

### Super Admin Roles
1. **Root** - Full access to all system features
2. **Finance** - Access to analytics and subscriptions
3. **Ops** - Access to user management and analytics
4. **Support** - Limited access to users and orders

### Tenant Roles
1. **Owner** - Full access to tenant (equivalent to tenant admin)
2. **Manager** - Access to orders, products, customers, and reports
3. **Sales** - Access to orders, products, and customers
4. **Viewer** - Read-only access to all tenant data

---

## 🚀 Getting Started

### Step 1: Initialize RBAC System

Run the initialization script to create default roles and permissions:

```bash
cd sys
node scripts/init-rbac.js
```

This will create:
- All default permissions in Firestore
- Super admin roles (Root, Finance, Ops, Support)
- Role-permission mappings

### Step 2: Create Your First Super Admin User

Create a super admin user in Firestore:

```javascript
// Use Firebase Admin SDK or Firestore Console
const user = {
  name: 'Your Name',
  email: 'admin@example.com',
  tenant_id: null, // null for super admin
  role_id: 'root_role_id', // ID of Root role
  type: 'super_admin',
  status: 'active',
  firebase_uid: 'firebase_auth_uid', // Link to Firebase Auth user
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

### Step 3: Use RBAC in Your Frontend

#### Using PermissionGuard Component

```tsx
import PermissionGuard from './components/rbac/PermissionGuard';

// Protect a component
<PermissionGuard permission="users.create">
  <button>Create User</button>
</PermissionGuard>

// Show error if no permission
<PermissionGuard permission="users.delete" showError>
  <DeleteButton />
</PermissionGuard>

// Check multiple permissions (any)
<PermissionGuard permissions={['orders.view', 'orders.create']}>
  <OrdersComponent />
</PermissionGuard>

// Check multiple permissions (all)
<PermissionGuard allPermissions={['users.edit', 'users.delete']}>
  <AdvancedUserActions />
</PermissionGuard>
```

#### Using RBAC Hook

```tsx
import { useRBAC } from './contexts/RBACContext';

function MyComponent() {
  const { 
    user, 
    permissions, 
    hasPermission, 
    hasAnyPermission,
    canAccessTenant,
    canManageUser 
  } = useRBAC();

  // Check permission
  const canCreateUsers = await hasPermission('users.create');
  
  // Check multiple (any)
  const canViewOrders = await hasAnyPermission(['orders.view', 'orders.create']);
  
  // Check access
  const canAccess = canAccessTenant(tenantId);
  
  // Check if can manage user
  const canManage = canManageUser(targetUser);
  
  return <div>...</div>;
}
```

---

## 🔌 API Endpoints

All RBAC endpoints require authentication via Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <firebase_id_token>
```

### User Endpoints

- `GET /api/rbac/users` - Get all users (requires auth)
- `GET /api/rbac/users/:id` - Get user by ID (requires auth)
- `POST /api/rbac/users` - Create user (requires `users.create` permission)
- `PUT /api/rbac/users/:id` - Update user (requires `users.edit` permission)
- `DELETE /api/rbac/users/:id` - Delete user (requires `users.delete` permission)

### Role Endpoints

- `GET /api/rbac/roles` - Get all roles (requires auth)
- `POST /api/rbac/roles` - Create role (requires `roles.create` permission)
- `PUT /api/rbac/roles/:id/permissions` - Update role permissions (requires `roles.edit` permission)

### Permission Endpoints

- `GET /api/rbac/permissions` - Get all permissions (requires auth)
- `GET /api/rbac/roles/:id/permissions` - Get permissions for a role (requires auth)

---

## 🛡️ Permission Checking Middleware

### Backend Middleware

```javascript
const { verifyAuth, authorize } = require('./rbac');

// Protect route with authentication
app.get('/api/users', verifyAuth, getUsers);

// Protect route with permission
app.post('/api/users', verifyAuth, authorize('users.create'), createUser);
```

### Frontend Permission Check

```typescript
import { checkPermission } from './shared/lib/permissions';

// Check if user has permission
const result = await checkPermission(roleId, 'users.create', 'super_admin');
if (result.allowed) {
  // User has permission
}
```

---

## 📝 Usage Examples

### Creating a User with Role

```typescript
import { userService } from './shared/lib/rbacService';

const newUser = await userService.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'hashed_password', // Hash before storing
  tenant_id: 'tenant_123', // or null for super admin
  role_id: 'role_456',
  type: 'tenant_staff',
  status: 'active',
  firebase_uid: 'firebase_auth_uid'
});
```

### Assigning Permissions to Role

```typescript
import { rolePermissionService } from './shared/lib/rbacService';

// Get permission IDs
const permissionIds = ['perm_1', 'perm_2', 'perm_3'];

// Assign permissions to role
await rolePermissionService.updateRolePermissions('role_id', permissionIds);
```

### Checking Permissions

```typescript
import { checkPermission, getUserPermissions } from './shared/lib/permissions';

// Check single permission
const canCreate = await checkPermission(roleId, 'users.create', 'super_admin');

// Get all permissions for a role
const permissions = await getUserPermissions(roleId);
```

---

## 🎯 Two-Layer Permission Control

### Super Admin Layer
- Super admins can create roles with `tenant_id = null`
- Super admins can manage all users (both super admin and tenant staff)
- Super admins have access to all tenants

### Tenant Layer
- Tenant admins can create roles with `tenant_id = their_tenant_id`
- Tenant admins can only manage users in their tenant
- Tenant staff can only access data from their tenant

### Access Control Rules

```typescript
// Super admin can access all tenants
canAccessTenant(superAdminUser, anyTenantId) // returns true

// Tenant staff can only access their tenant
canAccessTenant(tenantStaffUser, theirTenantId) // returns true
canAccessTenant(tenantStaffUser, otherTenantId) // returns false

// Super admin can manage all users
canManageUser(superAdminUser, anyUser) // returns true

// Tenant admin can only manage users in their tenant
canManageUser(tenantAdminUser, sameTenantUser) // returns true
canManageUser(tenantAdminUser, otherTenantUser) // returns false
```

---

## 🧪 Testing

### Test Permission Checking

```typescript
import { useRBAC } from './contexts/RBACContext';

// In a component
const { hasPermission, permissions } = useRBAC();
const canEdit = await hasPermission('users.edit');
console.log('Can edit users:', canEdit);
console.log('User permissions:', permissions);
```

### Test API Endpoints

```bash
# Get Firebase ID token first (from frontend)
TOKEN="your_firebase_id_token"

# Get all users
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api-url/api/rbac/users

# Create a user (requires users.create permission)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","role_id":"role_id","type":"tenant_staff"}' \
  https://your-api-url/api/rbac/users
```

---

## 🔄 Next Steps

1. **Create Super Admin Users**: Create your first super admin users with Root role
2. **Migrate Existing Users**: Link existing Firebase Auth users to RBAC users
3. **Add Routes**: Add RBAC management pages to your router
4. **Test Permissions**: Test that permissions are working correctly
5. **Deploy**: Deploy the updated Cloud Functions

---

## 📚 Additional Resources

- See `sys/shared/types/rbac.ts` for all type definitions
- See `sys/shared/lib/permissions.ts` for permission checking logic
- See `sys/scripts/init-rbac.js` for initialization logic

---

## ✅ System Status

- ✅ Type definitions created
- ✅ Service layer implemented
- ✅ Permission checking utilities created
- ✅ Frontend context and hooks implemented
- ✅ Backend API endpoints created
- ✅ UI components created
- ✅ Initialization script created
- ⏳ Ready for initialization and testing

---

**Your RBAC system is ready to use!** 🎉


