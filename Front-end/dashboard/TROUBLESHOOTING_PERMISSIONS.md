# Permission System Troubleshooting Guide

## Quick Diagnosis

### Step 1: Check Debug Page

1. Navigate to `debug-permissions.html`
2. Check the authentication status
3. Verify user data exists in Firestore
4. Check permission status
5. Review local storage data

### Step 2: Common Issues & Solutions

## Issue 1: "User not found in staff collection"

**Symptoms:**

- User can log in but gets redirected to no-access page
- Debug page shows "No User Data" status

**Causes:**

- User signed up but admin hasn't approved them
- User email doesn't match between Auth and Firestore
- User was deleted from staff collection

**Solutions:**

1. Go to Admin page (`pages/Admin.html`)
2. Check if user appears in the staff list
3. If user exists but not approved, click "Approve"
4. If user doesn't exist, have them sign up again
5. Verify email addresses match exactly

## Issue 2: "User not approved"

**Symptoms:**

- User exists in staff collection but can't access pages
- Debug page shows "Approved: ❌ No"

**Solutions:**

1. Go to Admin page
2. Find the user in the staff list
3. Click "Approve" button
4. Set appropriate permissions using "Edit" button

## Issue 3: "User lacks required permissions"

**Symptoms:**

- User is approved but can't access specific pages
- Debug page shows missing permissions

**Solutions:**

1. Go to Admin page
2. Click "Edit" on the user
3. Check the required permissions for the page:
   - Home page: `home.view`
   - Orders page: `orders.search`
   - Products page: `inventory.view`
   - Customers page: `customers.view`
   - Admin page: `employees.view`
4. Save the changes

## Issue 4: API Key Mismatch

**Symptoms:**

- Firebase errors in console
- Authentication fails
- Network request failed errors

**Solutions:**

1. Check all files use the same API key: `AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8`
2. Verify Firebase version consistency (use v10.12.0)
3. Clear browser cache and localStorage

## Issue 5: Redirect Loops

**Symptoms:**

- Page keeps redirecting between login and no-access
- Browser shows "too many redirects" error

**Solutions:**

1. Clear browser cache and cookies
2. Clear localStorage: `localStorage.clear()`
3. Check if user has proper permissions
4. Verify Firebase authentication state

## Issue 6: Buttons Not Showing

**Symptoms:**

- Edit/delete buttons missing
- Add buttons not visible
- UI elements hidden

**Solutions:**

1. Check user permissions for that section
2. Verify UI element IDs match the code
3. Check browser console for JavaScript errors
4. Ensure user has edit permissions for that section

## Testing Steps

### 1. Test Admin Access

1. Login with `hesainosama@gmail.com`
2. Should automatically get full permissions
3. Should be able to access all pages

### 2. Test New User Flow

1. Create new user account via Signup
2. Login with new account
3. Should be redirected to no-access (not approved yet)
4. Login as admin and approve the user
5. Set appropriate permissions
6. Test access again

### 3. Test Permission Restrictions

1. Login with limited user
2. Try accessing pages without permission
3. Should be redirected to no-access
4. Try accessing pages with permission
5. Should work normally

## Debug Commands

### Browser Console Commands

```javascript
// Check current user
console.log(auth.currentUser);

// Check localStorage
console.log(localStorage.getItem("madasUser"));

// Clear everything
localStorage.clear();
auth.signOut();

// Check Firebase config
console.log(firebaseConfig);
```

### Check Firestore Data

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check `staff` collection
4. Verify user documents exist and have correct data

## File Checklist

Ensure these files have correct configurations:

- [ ] `public/Signup.html` - Correct API key and Firebase version
- [ ] `public/Login.html` - Correct API key and Firebase version
- [ ] `public/index.html` - Permission checks added
- [ ] `public/pages/Admin.html` - Redirect logic enabled
- [ ] `public/pages/products.html` - Permission checks working
- [ ] `public/pages/orders.html` - Permission checks working
- [ ] `public/pages/Customer.html` - Permission checks working
- [ ] `public/js/auth-check.js` - Correct API key
- [ ] `public/js/permissions.js` - Utility functions working

## Emergency Reset

If everything is broken:

1. Clear browser data completely
2. Delete all users from Firestore staff collection
3. Create admin user again with `hesainosama@gmail.com`
4. Test admin access
5. Create new staff users as needed

## Support

If issues persist:

1. Check browser console for errors
2. Use debug-permissions.html to diagnose
3. Verify Firebase project settings
4. Check Firestore security rules
5. Test with different browser/incognito mode
