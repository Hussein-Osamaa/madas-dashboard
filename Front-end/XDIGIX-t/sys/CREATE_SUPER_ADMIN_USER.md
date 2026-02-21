# 🔐 Create Super Admin User for DIGIX Admin Dashboard

You need to create a super admin user document in Firestore to access the DIGIX Admin Dashboard.

## 📋 Your Current Firebase User Info:
- **Firebase UID:** `hxNl8FxpwSU37pQGRK9Mz0hHMnI3`
- **Email:** `hesainosama@gmail.com`

## 🚀 Quick Setup (Choose One Method)

### **Method 1: Manual Setup in Firebase Console** (Easiest)

1. **Get the Root Role ID:**
   - First, run the RBAC initialization script (if not done):
     ```bash
     cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/new/finance_version"
     node sys/scripts/init-rbac.js
     ```
   - Go to Firebase Console → Firestore
   - Open the `roles` collection
   - Find the document with `name: "Root"` and `tenant_id: null`
   - Copy the document ID (e.g., `abc123xyz`)

2. **Create User Document:**
   - Go to Firestore Console → `users` collection
   - Click "Add document"
   - **Set Document ID:** (auto-generate or use custom)
   - **Add fields:**
     ```
     firebase_uid: "hxNl8FxpwSU37pQGRK9Mz0hHMnI3"
     name: "Super Admin"
     email: "hesainosama@gmail.com"
     type: "super_admin"
     role_id: "<PASTE_ROOT_ROLE_ID_HERE>"
     tenant_id: null
     status: "active"
     created_at: "2025-01-14T00:00:00Z"
     updated_at: "2025-01-14T00:00:00Z"
     ```
   - Click "Save"

3. **Refresh the page** and log in again

### **Method 2: Run Script (If you have serviceAccountKey.json)**

```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/new/finance_version"
node sys/scripts/create-super-admin-user.js hxNl8FxpwSU37pQGRK9Mz0hHMnI3 hesainosama@gmail.com "Super Admin"
```

### **Method 3: Browser Console Script**

1. Make sure you're logged in to the DIGIX Admin Dashboard
2. Open browser console (F12)
3. Paste this code:

```javascript
(async function createSuperAdminUser() {
  try {
    const { auth, db, collection, doc, setDoc, query, where, getDocs, updateDoc } = await import('/src/lib/firebase.js');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error('❌ Please log in first');
      return;
    }
    
    console.log('🔍 Finding Root role...');
    const rolesQuery = query(collection(db, 'roles'), where('name', '==', 'Root'), where('tenant_id', '==', null));
    const rolesSnapshot = await getDocs(rolesQuery);
    
    if (rolesSnapshot.empty) {
      console.error('❌ Root role not found! Run: node sys/scripts/init-rbac.js');
      return;
    }
    
    const roleId = rolesSnapshot.docs[0].id;
    console.log('✅ Found Root role:', roleId);
    
    const userQuery = query(collection(db, 'users'), where('firebase_uid', '==', currentUser.uid));
    const existingUser = await getDocs(userQuery);
    
    const userData = {
      firebase_uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email.split('@')[0],
      email: currentUser.email,
      type: 'super_admin',
      role_id: roleId,
      tenant_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (!existingUser.empty) {
      console.log('📝 Updating existing user...');
      await updateDoc(doc(db, 'users', existingUser.docs[0].id), userData);
      console.log('✅ User updated! Refresh the page.');
    } else {
      console.log('📝 Creating new user...');
      await setDoc(doc(collection(db, 'users')), userData);
      console.log('✅ User created! Refresh the page.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
```

## ✅ After Creating the User

1. **Refresh the page** in your browser
2. You should now see the DIGIX Admin Dashboard
3. If you still see "No RBAC user found", check:
   - The `firebase_uid` matches exactly: `hxNl8FxpwSU37pQGRK9Mz0hHMnI3`
   - The `role_id` points to a valid Root role
   - The `type` is exactly `"super_admin"` (not `"super_admin "` with spaces)

## 🔍 Verify the User Was Created

1. Go to Firebase Console → Firestore → `users` collection
2. Search for `firebase_uid: "hxNl8FxpwSU37pQGRK9Mz0hHMnI3"`
3. You should see your user document with all the fields set correctly


