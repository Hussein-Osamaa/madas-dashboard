# 🔒 Deploy Firestore Rules

The Firestore security rules have been updated to allow RBAC setup. You need to deploy these rules to Firebase.

## 🚀 Deploy Rules

### Option 1: Firebase Console (Easiest)

1. **Open Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `madas-store`
3. **Go to Firestore Database** → **Rules** tab
4. **Copy and paste** the contents of `sys/firestore.rules`
5. **Click "Publish"**

### Option 2: Firebase CLI

```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/new/finance_version"

# Deploy rules
firebase deploy --only firestore:rules
```

### Option 3: Manual Copy

1. Open `sys/firestore.rules`
2. Copy all contents
3. Go to Firebase Console → Firestore → Rules
4. Paste and click "Publish"

---

## ✅ After Deploying Rules

Once the rules are deployed, you can run the browser console scripts again:

1. **Refresh the page** at `http://localhost:5177/`
2. **Run Step 1** (Initialize RBAC) from `BROWSER_CONSOLE_SETUP.md`
3. **Run Step 2** (Create Super Admin User)
4. **Refresh** and you should have access!

---

## 🔒 Production Considerations

⚠️ **Important**: The current rules allow any authenticated user to create roles, permissions, and users. This is fine for initial setup, but in production, you should:

1. Restrict `roles` and `permissions` creation to super admins only
2. Restrict `users` creation to super admins or tenant admins
3. Add proper RBAC permission checks in the rules

For now, these rules will allow you to complete the setup.


