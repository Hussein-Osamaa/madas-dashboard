# ⚡ Quick Copy-Paste Setup

## ⚠️ Important: Copy ONLY the code, NOT the markdown markers

When copying from markdown files, make sure you:
- ✅ Copy the code INSIDE the code block
- ❌ Do NOT copy the ` ```javascript ` or ` ``` ` markers

---

## Step 1: Initialize RBAC

1. Open browser console (F12)
2. Copy the ENTIRE content from `sys/scripts/init-rbac-copy-paste.js`
3. Paste into console
4. Press Enter
5. Wait for "🎉 RBAC System initialized!"

---

## Step 2: Create Super Admin User

After Step 1 completes, copy and paste this:

```javascript
(async function createSuperAdmin() {
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
    const firebaseConfig = {
      apiKey: 'AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8',
      authDomain: 'madas-store.firebaseapp.com',
      projectId: 'madas-store',
      storageBucket: 'madas-store.firebasestorage.app',
      messagingSenderId: '527071300010',
      appId: '1:527071300010:web:7470e2204065b4590583d3'
    };
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ Please log in first!');
      return;
    }
    
    const rolesQuery = await db.collection('roles').where('name', '==', 'Root').where('tenant_id', '==', null).get();
    if (rolesQuery.empty) {
      console.error('❌ Root role not found! Run Step 1 first.');
      return;
    }
    
    const roleId = rolesQuery.docs[0].id;
    console.log('✅ Found Root role:', roleId);
    
    const userQuery = await db.collection('users').where('firebase_uid', '==', user.uid).get();
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
    
    if (!userQuery.empty) {
      await userQuery.docs[0].ref.update(userData);
      console.log('✅ Updated user! Refresh the page.');
    } else {
      await db.collection('users').doc().set(userData);
      console.log('✅ Created user! Refresh the page.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
```

**Remember:** Copy ONLY the code inside the ```javascript block, NOT the ``` markers!

---

## Step 3: Refresh

After Step 2, refresh the page (Cmd+Shift+R / Ctrl+Shift+R)

---

## 🐛 Troubleshooting

### Error: "javascript is not defined"
**Cause:** You copied the markdown code block markers
**Fix:** Copy only the code, not the ` ```javascript ` or ` ``` ` lines

### Error: "Root role not found"
**Fix:** Make sure Step 1 completed successfully. Check console for "🎉 RBAC System initialized!"

### Error: "Missing or insufficient permissions"
**Fix:** Deploy Firestore rules (see `DEPLOY_RULES_NOW.md`)


