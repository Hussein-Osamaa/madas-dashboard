# 🔧 Troubleshooting Blank Screen

If you're seeing a blank screen, follow these steps:

## ✅ Step 1: Check the Correct Port

The DIGIX Admin Dashboard runs on **port 5177**, not 5176.

**Correct URL:**
```
http://localhost:5177/
```

**Wrong URL:**
```
http://localhost:5176/  ❌
```

## ✅ Step 2: Check Browser Console

1. **Open Developer Tools** (F12 or Cmd+Option+I)
2. **Go to Console tab**
3. **Look for red error messages**

Common errors and fixes:

### Error: "No RBAC user found"
**Fix:** Create your super admin user (see `BROWSER_CONSOLE_SETUP.md`)

### Error: "Permission denied"
**Fix:** Deploy Firestore rules (see `DEPLOY_RULES_NOW.md`)

### Error: "Cannot find module..."
**Fix:** Stop dev server and restart:
```bash
cd sys/apps/digix-admin
npm run dev
```

## ✅ Step 3: Verify Dev Server is Running

Check terminal output - you should see:
```
VITE v5.4.21  ready in 299 ms
➜  Local:   http://localhost:5177/
```

If not running:
```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/new/finance_version/sys/apps/digix-admin"
npm run dev
```

## ✅ Step 4: Hard Refresh Browser

1. **Hard refresh** (Cmd+Shift+R / Ctrl+Shift+R)
2. **Clear browser cache** if needed
3. **Try incognito/private window**

## ✅ Step 5: Check Network Tab

1. **Open Developer Tools** → **Network tab**
2. **Reload page**
3. **Look for failed requests** (red entries)
4. **Check if main.tsx and other assets are loading**

## ✅ Step 6: Verify Firebase Connection

Open browser console and run:
```javascript
import('/src/lib/firebase.js').then(({ db, auth }) => {
  console.log('Firebase initialized:', { db, auth });
  console.log('Current user:', auth.currentUser);
});
```

## 🐛 Common Issues

### Issue: "Loading..." Screen Forever
**Cause:** RBAC user not found or permission check failing
**Fix:** 
1. Check browser console for errors
2. Create RBAC user (see `BROWSER_CONSOLE_SETUP.md`)
3. Verify Firestore rules are deployed

### Issue: Blank White/Black Screen
**Cause:** JavaScript error preventing render
**Fix:**
1. Check browser console for errors
2. Check if `index.html` has `<div id="root"></div>`
3. Verify all dependencies are installed: `npm install`

### Issue: Redirect Loop
**Cause:** AppShell redirecting between pages
**Fix:**
1. Clear browser cache
2. Check if you're logged in
3. Verify RBAC user exists

## 📞 Still Not Working?

1. **Check all errors** in browser console
2. **Share the error messages** with support
3. **Try starting fresh:**
   ```bash
   cd sys/apps/digix-admin
   rm -rf node_modules .vite
   npm install
   npm run dev
   ```


