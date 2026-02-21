# 🚨 DEPLOY FIRESTORE RULES NOW

You're getting "Missing or insufficient permissions" because the Firestore rules haven't been deployed yet.

## ⚡ Quick Deploy

### Method 1: Firebase Console (30 seconds)

1. **Open**: https://console.firebase.google.com/project/madas-store/firestore/rules
2. **Click** "Edit rules"
3. **Copy everything** from `sys/firestore.rules`
4. **Paste** into the editor
5. **Click** "Publish" (top right)

### Method 2: Check Current Rules

If you're not sure if rules are deployed, check the Firebase Console first:
1. Go to: https://console.firebase.google.com/project/madas-store/firestore/rules
2. See what rules are currently active
3. If they don't match `sys/firestore.rules`, update them

---

## 📋 Updated Rules Summary

The rules now allow:
- ✅ Authenticated users can create `roles`, `permissions`, `role_permissions`
- ✅ Authenticated users can create/read/update `users` collection
- ✅ Authenticated users can create/read/update `tenants` collection

This is for **initial setup only**. In production, you should restrict these further.

---

## ✅ After Deploying

1. **Refresh** your browser
2. **Run the browser console scripts** again from `BROWSER_CONSOLE_SETUP.md`
3. The permissions error should be gone!

---

## 🔍 Troubleshooting

If you still get errors after deploying:

1. **Wait 1-2 minutes** - Rules can take a moment to propagate
2. **Hard refresh** your browser (Cmd+Shift+R / Ctrl+Shift+R)
3. **Check Firebase Console** - Make sure rules were published successfully
4. **Clear browser cache** and try again


