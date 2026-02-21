# 👑 Create Owner Super Admin Account

This guide will help you create a super admin account for **hesainosama@gmail.com** with full access.

## 📋 Prerequisites

1. ✅ RBAC system initialized (Step 1 completed)
2. ✅ Firestore rules deployed
3. ✅ Logged in to the DIGIX Admin Dashboard

---

## 🚀 Quick Setup

### Step 1: Make sure you're logged in

1. Go to: `http://localhost:5177/login`
2. Log in with your Firebase account (hesainosama@gmail.com)

### Step 2: Run the owner creation script

1. **Open browser console** (F12)
2. **Copy and paste** the entire content from `sys/scripts/create-owner-quick.js`
3. **Press Enter**
4. You should see: "✅ Created owner account!" or "✅ Updated owner account!"

### Step 3: Refresh

**Refresh the page** (Cmd+Shift+R / Ctrl+Shift+R) and you should have full access!

---

## 📝 What This Does

The script will:
- ✅ Create/update a user document in Firestore
- ✅ Set email: `hesainosama@gmail.com`
- ✅ Set name: `Husain Osama`
- ✅ Assign Root role (full access)
- ✅ Set type: `super_admin`
- ✅ Set status: `active`

---

## 🔍 Verify It Worked

After running the script and refreshing:

1. You should see the DIGIX Admin Dashboard
2. All pages should be accessible
3. Check browser console - no "No RBAC user found" errors

---

## 🐛 Troubleshooting

### Error: "Root role not found"
**Fix:** Run Step 1 (Initialize RBAC) first from `sys/scripts/init-rbac-copy-paste.js`

### Error: "Missing or insufficient permissions"
**Fix:** Deploy Firestore rules from `sys/firestore.rules`

### Error: "Not logged in"
**Fix:** Log in at `http://localhost:5177/login` first

---

## 📋 Full Script (Alternative)

If the quick script doesn't work, use the full script from:
`sys/scripts/create-owner-admin.js`

This includes more error handling and diagnostics.


