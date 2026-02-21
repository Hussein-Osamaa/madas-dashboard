# 🔐 Super Admin Dashboard Access Guide

This guide explains how to access and set up the Super Admin Dashboard for your multi-tenant management system.

## 📍 How to Access

### **Method 1: Direct URL**
Navigate directly to:
```
http://localhost:PORT/super-admin
```
or
```
https://your-domain.com/super-admin
```

### **Method 2: From Dashboard Home**
1. Log in to the dashboard
2. If you have super admin permissions, you'll see a banner at the top of the dashboard home page
3. Click the **"Go to Super Admin Dashboard"** button

### **Method 3: Sidebar Navigation**
The Super Admin section appears in the sidebar for users with super admin permissions:
- **Super Admin Dashboard** → `/super-admin`
- **Tenants** → `/super-admin/clients`
- **Super Admin Users** → `/super-admin/staff`
- **Access Control** → `/super-admin/access`
- **Subscriptions** → `/super-admin/subscriptions`
- **Analytics** → `/super-admin/analytics`

## ✅ Requirements

To access the Super Admin Dashboard, you need:

1. **Logged in** - Must be authenticated via Firebase
2. **User Type** - Must be `type: 'super_admin'` in the `users` collection
3. **Role Assignment** - Must have a `role_id` assigned
4. **Permission** - Must have the `super_admin.view_analytics` permission

## 🛠️ Setup Instructions

### **Step 1: Initialize RBAC System**

First, initialize the default roles and permissions:

```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/new/finance_version"
node sys/scripts/init-rbac.js
```

This script will:
- Create all default permissions
- Create super admin roles (Root, Finance, Ops, Support)
- Assign permissions to roles

**Note:** You'll need a `serviceAccountKey.json` file in the root directory for this script to work.

### **Step 2: Create a Super Admin User in Firestore**

You need to create a user document in Firestore with the following structure:

**Collection:** `users`  
**Document ID:** (auto-generated or custom)

```javascript
{
  firebase_uid: "YOUR_FIREBASE_AUTH_UID",  // From Firebase Authentication
  name: "Super Admin Name",
  email: "admin@example.com",
  type: "super_admin",  // Required: must be 'super_admin'
  role_id: "ROLE_ID_HERE",  // ID of the 'Root' role (from Step 1)
  tenant_id: null,  // Must be null for super admin users
  status: "active",
  created_at: "2025-01-20T00:00:00Z",
  updated_at: "2025-01-20T00:00:00Z"
}
```

#### **Quick Steps to Create Super Admin User:**

1. **Get your Firebase Auth UID:**
   - Go to Firebase Console → Authentication
   - Create a user or use an existing one
   - Copy the UID

2. **Get the Root Role ID:**
   - After running `init-rbac.js`, check Firestore Console
   - Go to `roles` collection
   - Find the document with `name: "Root"` and `tenant_id: null`
   - Copy the document ID (this is your `role_id`)

3. **Create the user document:**
   - Go to Firestore Console → `users` collection
   - Click "Add document"
   - Set fields as shown above
   - Save

### **Step 3: Verify Access**

1. Log out and log back in (to refresh RBAC context)
2. Navigate to `/super-admin`
3. You should see the Super Admin Dashboard

## 🔍 Troubleshooting

### **Issue: Redirected to home page**

**Possible Causes:**
- User type is not `'super_admin'`
- Missing `role_id` in user document
- Role doesn't have `super_admin.view_analytics` permission

**Solution:**
1. Check Firestore `users` collection - ensure `type: 'super_admin'` and `role_id` is set
2. Check `roles` collection - verify the role exists
3. Check `role_permissions` collection - ensure role has `super_admin.view_analytics` permission
4. Check browser console for errors

### **Issue: "No RBAC user found"**

**Possible Causes:**
- `firebase_uid` in user document doesn't match Firebase Auth UID
- User document doesn't exist

**Solution:**
1. Verify Firebase Authentication UID matches `firebase_uid` in Firestore
2. Ensure user document exists in `users` collection

### **Issue: "User has no role_id assigned"**

**Solution:**
1. Get a role ID from the `roles` collection (use "Root" role for full access)
2. Update the user document: `role_id: "ROLE_ID_HERE"`

### **Issue: RBAC initialization script fails**

**Possible Causes:**
- Missing `serviceAccountKey.json`
- Firebase Admin SDK not configured

**Solution:**
1. Create `serviceAccountKey.json` in project root:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in project root
2. Ensure Firebase Admin SDK is installed: `npm install firebase-admin`

## 📋 Available Super Admin Pages

Once you have access, you can navigate to:

- **Overview** (`/super-admin`) - Platform-wide statistics and metrics
- **Clients** (`/super-admin/clients`) - Manage tenant businesses
- **Staff** (`/super-admin/staff`) - Manage super admin team members
- **Access Control** (`/super-admin/access`) - Manage roles and permissions
- **Subscriptions** (`/super-admin/subscriptions`) - Manage tenant subscriptions
- **Analytics** (`/super-admin/analytics`) - Platform analytics

## 🔑 Default Super Admin Roles

After running `init-rbac.js`, you'll have these roles:

1. **Root** - Full super admin access (all permissions)
2. **Finance** - View analytics and manage subscriptions
3. **Ops** - View analytics and manage users
4. **Support** - View users and orders

Use the **Root** role for your first super admin user to get full access.

## 📝 Example: Creating First Super Admin

Here's a complete example workflow:

```bash
# 1. Initialize RBAC
node sys/scripts/init-rbac.js

# 2. In Firebase Console:
#    - Create user in Authentication (e.g., admin@example.com)
#    - Copy the UID (e.g., "abc123xyz")

# 3. In Firestore Console:
#    - Go to roles collection
#    - Find "Root" role document
#    - Copy document ID (e.g., "role123")

# 4. Create user document in users collection:
{
  firebase_uid: "abc123xyz",
  name: "Super Admin",
  email: "admin@example.com",
  type: "super_admin",
  role_id: "role123",
  tenant_id: null,
  status: "active",
  created_at: "2025-01-20T00:00:00Z"
}

# 5. Log in and navigate to /super-admin
```

## 🔐 Security Notes

- Super Admin users have full platform access
- Always use the **Root** role carefully
- Consider creating role-specific super admin users (Finance, Ops) for limited access
- Ensure Firestore security rules properly restrict access to super admin data


