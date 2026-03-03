# Permission Redirect System Summary

## Overview

The permission system now ensures that **ALL** pages redirect unauthorized users to `no-access.html` when they lack proper permissions.

## Redirect Logic Flow

### 1. **Not Authenticated** → `Login.html`

- User is not logged in
- Redirects to login page

### 2. **User Not Found in Staff Collection** → `no-access.html`

- User is logged in but doesn't exist in Firestore staff collection
- Redirects to no-access page

### 3. **User Not Approved** → `no-access.html`

- User exists in staff collection but `approved: false`
- Redirects to no-access page

### 4. **User Lacks Required Permissions** → `no-access.html`

- User is approved but doesn't have the required permissions for the page
- Redirects to no-access page

## Page-by-Page Permission Requirements

| Page                  | Required Permission | Redirect Target  |
| --------------------- | ------------------- | ---------------- |
| `index.html`          | `home.view`         | `no-access.html` |
| `pages/orders.html`   | `orders.search`     | `no-access.html` |
| `pages/products.html` | `inventory.view`    | `no-access.html` |
| `pages/Customer.html` | `customers.view`    | `no-access.html` |
| `pages/Admin.html`    | `employees.view`    | `no-access.html` |
| `pages/scan_log.html` | `orders.search`     | `no-access.html` |
| `pages/last.html`     | `inventory.view`    | `no-access.html` |

## Admin User Exception

- Email: `hesainosama@gmail.com`
- Automatically gets full permissions
- No redirects for admin user

## Code Examples

### Standard Permission Check Pattern

```javascript
// 1. Check if user is authenticated
if (!user) {
  window.location.href = "../Login.html";
  return;
}

// 2. Check if user exists in staff collection
if (querySnapshot.empty) {
  window.location.href = "../no-access.html";
  return;
}

// 3. Check if user is approved
if (!userData.approved) {
  window.location.href = "../no-access.html";
  return;
}

// 4. Check specific permissions
if (!userData.permissions?.section?.includes("action")) {
  window.location.href = "../no-access.html";
  return;
}
```

## Files with Permission Checks

### ✅ **Protected Pages**

- `public/index.html` - Home dashboard
- `public/pages/orders.html` - Orders management
- `public/pages/products.html` - Inventory management
- `public/pages/Customer.html` - Customer management
- `public/pages/Admin.html` - Staff management
- `public/pages/scan_log.html` - Scan history logs
- `public/pages/last.html` - Last size products

### ✅ **Public Pages** (No Permission Required)

- `public/Login.html` - Login page
- `public/Signup.html` - Registration page
- `public/no-access.html` - Access denied page
- `public/debug-permissions.html` - Debug tool
- `public/test-permissions.html` - Test page

## Testing the Redirect System

### Test Case 1: Unauthorized User

1. Login with a user who has no permissions
2. Try to access any protected page
3. **Expected Result**: Redirected to `no-access.html`

### Test Case 2: Unapproved User

1. Create a new user account
2. Login with the new account
3. **Expected Result**: Redirected to `no-access.html`

### Test Case 3: Limited Permissions

1. Login with a user who only has `home.view` permission
2. Try to access `pages/products.html`
3. **Expected Result**: Redirected to `no-access.html`

### Test Case 4: Admin User

1. Login with `hesainosama@gmail.com`
2. Try to access any page
3. **Expected Result**: Full access to all pages

## Debugging Redirects

### Check Current User Status

```javascript
// In browser console
console.log(auth.currentUser);
console.log(localStorage.getItem("madasUser"));
```

### Use Debug Page

Navigate to `debug-permissions.html` to see:

- Authentication status
- User data from Firestore
- Current permissions
- Local storage data

## Common Issues & Solutions

### Issue: Redirect Loop

**Solution**: Clear browser cache and localStorage

```javascript
localStorage.clear();
```

### Issue: Wrong Redirect Path

**Solution**: Check if page is in `/pages/` folder

- Root pages: `"no-access.html"`
- Sub-pages: `"../no-access.html"`

### Issue: Permission Not Working

**Solution**: Verify in Admin page

1. Go to Admin page
2. Find user in staff list
3. Click "Edit"
4. Check required permissions
5. Save changes

## Security Notes

1. **Client-side checks**: Immediate UI feedback
2. **Server-side validation**: Configure Firestore security rules
3. **Consistent redirects**: All unauthorized access goes to `no-access.html`
4. **Admin bypass**: Special handling for admin user
5. **Permission granularity**: Fine-grained control per page

## Firestore Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /staff/{docId} {
      allow read, write: if request.auth != null;
    }
    match /orders/{docId} {
      allow read, write: if request.auth != null;
    }
    match /products/{docId} {
      allow read, write: if request.auth != null;
    }
    match /customers/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```
