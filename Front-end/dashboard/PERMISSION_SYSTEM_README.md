# MADAS Staff Permission System

## Overview

The MADAS dashboard now includes a comprehensive staff permission system that controls access to different sections of the application based on user roles and permissions. This system ensures that staff members can only access and modify data they are authorized to work with.

## How It Works

### 1. Permission Structure

The permission system is organized into 5 main sections:

- **Home**: Dashboard access
- **Orders**: Order management
- **Inventory**: Product management
- **Customers**: Customer management
- **Employees**: Staff management

Each section has specific actions:

- **view**: Read-only access
- **search**: Search functionality
- **create**: Create new records
- **edit**: Modify existing records

### 2. User Authentication Flow

1. User logs in through `Login.html`
2. System checks if user exists in the `staff` collection in Firestore
3. If user is not approved, they are redirected to `no-access.html`
4. If user is approved, their permissions are checked for the current page
5. If user lacks required permissions, they are redirected to `no-access.html`
6. If user has proper permissions, they can access the page

### 3. Admin User

The email `hesainosama@gmail.com` is automatically granted full permissions:

- All sections: view, search, create, edit
- Auto-approved status
- Can manage all staff members

## Implementation Details

### Files Modified

1. **`public/pages/Admin.html`**

   - Added permission-based UI controls
   - Edit/delete buttons hidden for users without edit permissions
   - Staff approval system activated

2. **`public/pages/products.html`**

   - Added authentication check
   - Requires `inventory.view` permission to access
   - Auto-approves admin user

3. **`public/pages/orders.html`**

   - Added authentication check
   - Requires `orders.search` permission to access
   - Auto-approves admin user

4. **`public/pages/Customer.html`**
   - Activated existing permission system
   - Requires `customers.view` permission to access
   - Proper redirects implemented

### New Files Created

1. **`public/js/permissions.js`**

   - Permission management utility class
   - Common permission checks
   - UI control functions

2. **`public/js/auth-check.js`**

   - Comprehensive authentication checker
   - Reusable across all pages
   - Handles admin auto-approval

3. **`public/test-permissions.html`**
   - Test page to verify permission system
   - Shows current user permissions
   - Navigation testing

## Usage

### For Administrators

1. **Managing Staff Permissions**:

   - Go to Admin page (`pages/Admin.html`)
   - Click "Edit" on any staff member
   - Check/uncheck permissions as needed
   - Save changes

2. **Approving New Staff**:
   - New staff members sign up through `Signup.html`
   - They appear in Admin page as "Pending"
   - Click "Approve" to grant access
   - Set appropriate permissions

### For Staff Members

1. **Access Control**:

   - Staff can only access pages they have permission for
   - Unauthorized access redirects to `no-access.html`
   - UI elements are hidden based on permissions

2. **Permission Levels**:
   - **View Only**: Can see data but cannot modify
   - **Search**: Can search through records
   - **Create**: Can add new records
   - **Edit**: Can modify existing records

## Permission Requirements by Page

| Page                  | Required Permission | Description            |
| --------------------- | ------------------- | ---------------------- |
| `index.html`          | `home.view`         | Dashboard access       |
| `pages/orders.html`   | `orders.search`     | View and search orders |
| `pages/products.html` | `inventory.view`    | View inventory         |
| `pages/Customer.html` | `customers.view`    | View customers         |
| `pages/Admin.html`    | `employees.view`    | View staff members     |

## Testing the System

1. **Access the test page**: Navigate to `test-permissions.html`
2. **Check current permissions**: View your current permission status
3. **Test navigation**: Try accessing different pages
4. **Verify restrictions**: Confirm unauthorized pages redirect properly

## Security Features

1. **Client-side checks**: Immediate UI feedback
2. **Server-side validation**: Firestore security rules (configure in Firebase Console)
3. **Authentication required**: All pages require valid login
4. **Approval system**: New users must be approved by admin
5. **Permission granularity**: Fine-grained control over actions

## Firestore Security Rules

Configure these rules in your Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Staff collection - only authenticated users can read/write
    match /staff/{docId} {
      allow read, write: if request.auth != null;
    }

    // Orders collection - only authenticated users
    match /orders/{docId} {
      allow read, write: if request.auth != null;
    }

    // Products collection - only authenticated users
    match /products/{docId} {
      allow read, write: if request.auth != null;
    }

    // Customers collection - only authenticated users
    match /customers/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **User can't access pages**:

   - Check if user is approved in Admin page
   - Verify permissions are set correctly
   - Ensure user email matches Firestore record

2. **Buttons not showing**:

   - Check user permissions for that section
   - Verify UI elements have correct IDs
   - Check browser console for errors

3. **Redirect loops**:
   - Clear browser cache and localStorage
   - Check Firebase authentication state
   - Verify Firestore connection

### Debug Steps

1. Open browser developer tools
2. Check Console for error messages
3. Verify localStorage has user data
4. Test with admin account first
5. Use test-permissions.html to verify current state

## Future Enhancements

1. **Role-based permissions**: Predefined roles (Manager, Cashier, etc.)
2. **Time-based permissions**: Temporary access grants
3. **Audit logging**: Track permission changes
4. **Bulk permission updates**: Modify multiple users at once
5. **Permission inheritance**: Hierarchical permission structure

## Support

For issues or questions about the permission system:

1. Check this README first
2. Use the test page to verify current state
3. Check browser console for error messages
4. Verify Firestore security rules are configured
