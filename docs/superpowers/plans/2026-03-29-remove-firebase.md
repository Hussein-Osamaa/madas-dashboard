# Remove Firebase Permanently — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently remove all Firebase code, config, and packages from the Madas/XDIGIX monorepo and wire every frontend app to the already-deployed MongoDB/JWT/S3/Express backend.

**Architecture:** The replacement stack is 100% complete and deployed. The backend lives at `https://xdigix-os-production.up.railway.app/api`. Each frontend app has (or will have) a `backend-adapter.ts` that mirrors the Firebase SDK API surface, routing calls to the Express backend instead. The `firebase.ts` in each app becomes a simple re-export from `backend-adapter.ts`.

**Tech Stack:** Node.js 20, npm, TypeScript, Vite (frontend apps), Express (backend), MongoDB/Mongoose, JWT, S3/R2.

**Spec:** `docs/superpowers/specs/2026-03-29-remove-firebase-design.md`

**⚠️ IMPORTANT — git worktree:** The path `.claude/worktrees/` inside the repo is a live git worktree. Every `find -delete` command in this plan explicitly excludes `*/.claude/*` to avoid corrupting it.

---

## File Map

### Files to DELETE
- `Madas/UNDO/` — entire directory
- All `functions/` Cloud Functions directories (9 total)
- All `.firebaserc` files
- All `firebase.json` files
- All `firestore.rules`, `firestore.indexes.json`, `storage.rules`
- All `firebaseConfig.js` AND `firebase-config.js` AND `*.backup` files
- All `firebase-impl.ts` files
- `firebaseAdmin.ts` in all backend `src/lib/` directories
- All backend `dist/` directories (explicit paths)
- All firebase source files in `Front-end/dashboard/` and `marketing-website-standalone/` subtrees

### Files to MODIFY
- All `auth.routes.ts` across all backend instances (XDIGIX-t, XDIGIX-vsc, XDIGIX-OS variants) — remove exchange-firebase route + firebaseAdmin import
- All backend `package.json` — remove `firebase-admin`
- All frontend `package.json` — remove `firebase`, `firebase-functions`, `firebase-functions-test`
- All root `package.json` — remove any `functions/` workspace references
- All active `firebase.ts` switcher files — replace with backend-adapter re-export
- All frontend `.env` files — add `VITE_API_BACKEND_URL`, remove Firebase env vars
- Backend `.env` — remove `GOOGLE_APPLICATION_CREDENTIALS`

### Files to CREATE
- `webbuilder-standalone/src/lib/backend-adapter.ts`
- `dashboard-standalone/src/lib/backend-adapter.ts`

---

## Task 1: Git Backup Branch

- [ ] **Step 1: Create backup branch and commit current state**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git checkout -b backup/before-firebase-removal
git add -A
git commit -m "checkpoint: state before firebase removal"
git checkout -
```

Expected: Branch `backup/before-firebase-removal` created.

- [ ] **Step 2: Verify backup exists**

```bash
git branch | grep backup/before-firebase-removal
```

Expected: `backup/before-firebase-removal` listed.

---

## Task 2: Delete UNDO/ Legacy Project + Immediately Note Key Revocation

> ⚠️ Firebase API keys are hardcoded in source files and will remain in git history. **After this task, go to the Firebase Console and revoke both API keys** — see Task 17 for exact steps. The plan places Task 17 last for reference but the keys should be revoked as soon as convenient after deletion begins.

- [ ] **Step 1: Confirm contents of UNDO/**

```bash
ls "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/UNDO/"
```

- [ ] **Step 2: Delete UNDO/**

```bash
rm -rf "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/UNDO"
```

- [ ] **Step 3: Verify gone**

```bash
ls "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/UNDO" 2>&1
```

Expected: `No such file or directory`

- [ ] **Step 4: Commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: delete UNDO legacy Firebase project"
```

---

## Task 3: Audit Workspace References to functions/

- [ ] **Step 1: Find all package.json files with "functions" workspace references (search from root)**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
grep -r '"functions"' "$BASE" --include="package.json" -l \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

- [ ] **Step 2: For each file found, remove the `functions` entry from the `workspaces` array**

Open the file and remove `"functions"` from the workspaces list. If `workspaces` only contained `["functions"]`, remove the entire key.

- [ ] **Step 3: Commit any changes**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: remove functions/ workspace references from package.json files" \
  || echo "Nothing to commit"
```

---

## Task 4: Delete All functions/ Directories

- [ ] **Step 1: Delete all known functions/ directories**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"

rm -rf "$BASE/Front-end/XDIGIX-t/sys/functions"
rm -rf "$BASE/Front-end/XDIGIX/sys/functions"
rm -rf "$BASE/Front-end/dashboard/new/finance_version/sys/functions"
rm -rf "$BASE/Front-end/dashboard/new/sys/functions"
rm -rf "$BASE/Front-end/dashboard/public/functions"
rm -rf "$BASE/Front-end/dashboard/public/organized/functions"
rm -rf "$BASE/XDIGIX-OS/Front-end/XDIGIX-t/sys/functions"
rm -rf "$BASE/XDIGIX-OS/Front-end/XDIGIX-vsc/sys/functions"
```

- [ ] **Step 2: Check for any additional functions/ directories (excluding .claude worktree and node_modules)**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -type d -name "functions" \
  -not -path "*/node_modules/*" \
  -not -path "*/.claude/*"
```

Expected: 0 results. If any remain, delete them with `rm -rf`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: delete all Firebase Cloud Functions directories"
```

---

## Task 5: Delete Firebase Config and Rule Files

- [ ] **Step 1: Preview all .firebaserc files to be deleted (excluding .claude)**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name ".firebaserc" -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Review the list — should be 7 files across Front-end/ and XDIGIX-OS/.

- [ ] **Step 2: Preview all firebase.json files**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "firebase.json" -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

- [ ] **Step 3: Preview all rules/index files**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" \( -name "firestore.rules" -o -name "storage.rules" -o -name "firestore.indexes.json" \) \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

- [ ] **Step 4: Preview firebaseConfig.js files (camelCase)**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "firebaseConfig.js" -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

- [ ] **Step 5: Preview firebase-config.js files (hyphenated) and .backup variants**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" \( -name "firebase-config.js" -o -name "firebase-config.js.backup" \) \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: Files in `marketing-website-standalone/` directories across XDIGIX, dashboard/new/, dashboard/sys/.

- [ ] **Step 6: Delete all of the above (after reviewing the previews look correct)**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"

find "$BASE" -name ".firebaserc" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" -delete

find "$BASE" -name "firebase.json" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" -delete

find "$BASE" \( -name "firestore.rules" -o -name "storage.rules" -o -name "firestore.indexes.json" \) \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" -delete

find "$BASE" -name "firebaseConfig.js" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" -delete

find "$BASE" \( -name "firebase-config.js" -o -name "firebase-config.js.backup" \) \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" -delete
```

- [ ] **Step 7: Verify all gone**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" \( -name ".firebaserc" -o -name "firebase.json" -o -name "firebaseConfig.js" \
  -o -name "firebase-config.js" -o -name "firebase-config.js.backup" \
  -o -name "firestore.rules" -o -name "storage.rules" -o -name "firestore.indexes.json" \) \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: 0 results.

- [ ] **Step 8: Commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: delete all Firebase config, rules, and firebaseConfig.js files"
```

---

## Task 6: Delete firebase-impl.ts Files

- [ ] **Step 1: Preview all firebase-impl.ts files (excluding .claude)**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "firebase-impl.ts" -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: ~6 files across XDIGIX-t and XDIGIX-vsc app directories.

- [ ] **Step 2: Delete all**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "firebase-impl.ts" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" -delete
```

- [ ] **Step 3: Verify none remain**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "firebase-impl.ts" -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: 0 results.

- [ ] **Step 4: Commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: delete all firebase-impl.ts raw SDK files"
```

---

## Task 7: Delete firebaseAdmin.ts and Clean Backend dist/

- [ ] **Step 1: Preview all firebaseAdmin.ts files (excluding .claude)**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "firebaseAdmin.ts" -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: 2 files — one in XDIGIX-t backend and one in XDIGIX-vsc backend.

- [ ] **Step 2: Delete all firebaseAdmin.ts files**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "firebaseAdmin.ts" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" -delete
```

- [ ] **Step 3: Delete backend dist/ directories (explicit paths only — NOT a recursive find)**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"

rm -rf "$BASE/Front-end/XDIGIX-t/sys/backend/dist"
rm -rf "$BASE/XDIGIX-OS/Front-end/XDIGIX-t/sys/backend/dist"
rm -rf "$BASE/XDIGIX-OS/Front-end/XDIGIX-vsc/sys/backend/dist"
```

- [ ] **Step 4: Verify firebaseAdmin gone**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "firebaseAdmin*" -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: 0 results.

- [ ] **Step 5: Commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: delete firebaseAdmin.ts files and clean backend dist directories"
```

---

## Task 8: Remove exchange-firebase Route from ALL Backend auth.routes.ts Files

**All 4 backend auth.routes.ts instances must be cleaned:**
1. `Front-end/XDIGIX-t/sys/backend/src/routes/auth.routes.ts`
2. `Front-end/XDIGIX/sys/backend/src/routes/auth.routes.ts` (if exists)
3. `XDIGIX-OS/Front-end/XDIGIX-t/sys/backend/src/routes/auth.routes.ts`
4. `XDIGIX-OS/Front-end/XDIGIX-vsc/sys/backend/src/routes/auth.routes.ts`

- [ ] **Step 1: Find all auth.routes.ts files across all backend instances**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "auth.routes.ts" -path "*/backend/*" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

- [ ] **Step 2: For each auth.routes.ts found, remove the firebaseAdmin import line**

Remove this line:
```typescript
import { verifyFirebaseToken } from '../lib/firebaseAdmin';
```

- [ ] **Step 3: For each auth.routes.ts, remove the exchange-firebase route block**

Remove this entire block:
```typescript
/** POST /auth/admin/exchange-firebase */
router.post(
  '/admin/exchange-firebase',
  authRateLimit,
  [body('firebaseIdToken').isString().notEmpty()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const result = await exchangeFirebaseForAdminToken(req.body.firebaseIdToken, verifyFirebaseToken);
      if (!result) {
        res.status(403).json({ error: 'Not authorized as admin', code: 'auth/not-admin' });
        return;
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
);
```

- [ ] **Step 4: Remove exchangeFirebaseForAdminToken from the imports block in each file**

In each `auth.routes.ts`, find the import from `central-auth.service` and remove `exchangeFirebaseForAdminToken` from the named imports. Example before:
```typescript
import {
  loginClient,
  loginStaff,
  loginAdmin,
  refreshToken,
  exchangeFirebaseForAdminToken,
  type AccountType,
} from '../services/central-auth.service';
```
After:
```typescript
import {
  loginClient,
  loginStaff,
  loginAdmin,
  refreshToken,
  type AccountType,
} from '../services/central-auth.service';
```

- [ ] **Step 5: Find and clean all central-auth.service.ts files — remove exchangeFirebaseForAdminToken function**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "central-auth.service.ts" -path "*/backend/*" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

For each found: open the file, find the `exchangeFirebaseForAdminToken` function definition, and delete the entire function. Also remove any `firebase-admin` or `firebaseAdmin` imports at the top of that file.

- [ ] **Step 6: Verify no firebaseAdmin references remain in any backend src/**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
grep -r "firebaseAdmin\|firebase-admin\|exchangeFirebaseForAdminToken\|verifyFirebaseToken" \
  "$BASE" \
  --include="*.ts" \
  -not -path "*/node_modules/*" \
  -not -path "*/.claude/*"
```

Expected: 0 results.

- [ ] **Step 7: Commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: remove exchange-firebase route and firebaseAdmin from all backend instances"
```

---

## Task 9: Create backend-adapter.ts for Standalone Apps

> ⚠️ **Do NOT run a build after this task until Task 10 is also complete.** Task 10 replaces `firebase.ts` to import from `./backend-adapter`. These two tasks must be done back-to-back without any build/test between them.

- [ ] **Step 1: Find the exact paths for the standalone apps' firebase.ts**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "firebase.ts" -path "*/standalone/src/lib/*" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Note the directory for each result — these are the `src/lib/` directories where `backend-adapter.ts` must be created.

- [ ] **Step 2: Check if the standalone apps use Vite or Next.js**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "package.json" \
  \( -path "*/webbuilder-standalone/package.json" -o -path "*/dashboard-standalone/package.json" \) \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" \
  | xargs grep -l '"next"\|"vite"'
```

If `"next"` appears: use `process.env.NEXT_PUBLIC_API_BACKEND_URL`
If `"vite"` appears: use `import.meta.env.VITE_API_BACKEND_URL`

- [ ] **Step 3: Copy the dashboard backend-adapter as a template**

```bash
cp "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/apps/marketing/apps/dashboard/src/lib/backend-adapter.ts" \
   "<webbuilder-standalone-lib-dir>/backend-adapter.ts"

cp "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/apps/marketing/apps/dashboard/src/lib/backend-adapter.ts" \
   "<dashboard-standalone-lib-dir>/backend-adapter.ts"
```

Replace `<webbuilder-standalone-lib-dir>` and `<dashboard-standalone-lib-dir>` with the actual paths found in Step 1.

- [ ] **Step 4: For Next.js standalone apps — update the API base resolution**

Open each newly created `backend-adapter.ts` and find the line that reads the env var. Change from:
```typescript
const base = (import.meta as any).env?.VITE_API_BACKEND_URL
```
To:
```typescript
const base = process.env.NEXT_PUBLIC_API_BACKEND_URL
  || (typeof window !== 'undefined' ? (window as any).__API_BACKEND_URL : undefined)
```

If the app is Vite, keep `import.meta.env.VITE_API_BACKEND_URL` — no change needed.

- [ ] **Step 5: Verify both files exist**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "backend-adapter.ts" -path "*/standalone/*" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: 2 results.

---

## Task 10: Replace All Active firebase.ts Files with Backend-Adapter Re-Exports

> ⚠️ Run immediately after Task 9. Do NOT build between Tasks 9 and 10.

- [ ] **Step 1: Find all firebase.ts files still importing from 'firebase/*'**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
grep -r "from 'firebase/" "$BASE" \
  --include="firebase.ts" -l \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

This is the authoritative list of files to replace.

- [ ] **Step 2: For each file in the list, check what it currently exports**

```bash
# Run for each file found above:
grep "^export\|export {" <path-to-firebase.ts>
```

- [ ] **Step 3: Replace each firebase.ts with a backend-adapter re-export**

For each file, replace its entire contents with:

```typescript
// Firebase removed. All services now route through the backend adapter.
export {
  auth,
  db,
  storage,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  ref,
  uploadBytes,
  getDownloadURL,
  arrayUnion,
  arrayRemove,
} from './backend-adapter'
```

If any specific export used in the app is not listed above but is exported by `backend-adapter.ts`, add it. If an export is listed above but does NOT exist in `backend-adapter.ts`, remove it from this list.

- [ ] **Step 4: Verify no firebase.ts still imports from firebase/**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
grep -r "from 'firebase/" "$BASE" \
  --include="firebase.ts" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: 0 results.

- [ ] **Step 5: Commit Tasks 9 and 10 together**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "feat: create backend-adapter for standalone apps and replace all firebase.ts with adapter re-exports"
```

---

## Task 11: Delete Remaining Firebase Source Files in dashboard/ and marketing-website-standalone/

- [ ] **Step 1: Find all remaining firebase source files in dashboard/ subtree**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard"
grep -r "firebase" "$BASE" \
  --include="*.ts" --include="*.js" -l \
  --exclude-dir=node_modules
```

Review the list carefully. These should be files that are purely Firebase init/utility files with no other business logic.

- [ ] **Step 2: Delete each file individually (review each path before deleting)**

For each file in the list from Step 1, verify it is a Firebase-only file (not a file that merely references Firebase but has other logic). Then delete it:

```bash
# Repeat for each file found:
rm "<full-path-to-file>"
```

Known files to expect:
- `new/finance_version/sys/shared/lib/firebase.ts`
- `new/finance_version/sys/hhhh/multi-tenancy/firebase-init-plans.js`
- `new/finance_version/sys/hhhh/js/firebase-permission-check.js`
- `new/finance_version/sys/load-testing/src/utils/firebase-perf.ts`
- `new/sys/shared/lib/firebase.ts`
- `new/sys/Dashboard/js/firebase-permission-check.js`
- `sys/shared/lib/firebase.ts`
- `sys/Dashboard/mobile-app/src/services/firebase-mobile.js`
- `website/src/lib/firebase.ts`
- `admin/src/lib/firebase.ts`

Also delete entire multi-tenancy directories if they contain only Firebase files:
```bash
# Only if the directory contains solely Firebase files:
rm -rf "$BASE/new/sys/Dashboard/multi-tenancy"
rm -rf "$BASE/sys/Dashboard/multi-tenancy"
```

- [ ] **Step 3: Find and delete marketing-website-standalone firebase files**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
grep -r "firebase" "$BASE" \
  --include="*.ts" --include="*.js" -l \
  -path "*/marketing-website-standalone/*" \
  --exclude-dir=node_modules
```

Delete each file found (these should only be Firebase config/init files).

- [ ] **Step 4: Verify no firebase references in dashboard/ or marketing-website-standalone/**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
grep -r "firebase" \
  "$BASE/Front-end/dashboard" \
  "$BASE/Front-end/XDIGIX/sys/marketing-website-standalone" \
  "$BASE/Front-end/XDIGIX-t/sys/marketing-website-standalone" \
  --include="*.ts" --include="*.js" \
  --exclude-dir=node_modules 2>/dev/null
```

Expected: 0 results.

- [ ] **Step 5: Commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: delete all remaining Firebase source files from dashboard/ and marketing-website-standalone/"
```

---

## Task 12: Remove Firebase Packages from All package.json Files

- [ ] **Step 1: Find all package.json files with firebase dependencies**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
grep -r '"firebase' "$BASE" --include="package.json" -l \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

- [ ] **Step 2: For each file, remove firebase entries using node**

Run the following for **each package.json** found in Step 1 (replace `FILEPATH` with the actual path):

```bash
node -e "
const fs = require('fs');
const path = 'FILEPATH';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
const keys = ['firebase', 'firebase-admin', 'firebase-functions', 'firebase-functions-test'];
let changed = false;
for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
  if (pkg[section]) {
    keys.forEach(k => { if (pkg[section][k]) { delete pkg[section][k]; changed = true; } });
  }
}
if (changed) {
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Cleaned:', path);
} else {
  console.log('No changes needed:', path);
}
"
```

- [ ] **Step 3: Verify no package.json has firebase dependencies**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
grep -r '"firebase' "$BASE" --include="package.json" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: 0 results.

- [ ] **Step 4: Commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: remove all firebase packages from every package.json"
```

---

## Task 13: Set VITE_API_BACKEND_URL in All Frontend .env Files

- [ ] **Step 1: Find all frontend .env files (not .example or .template)**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" \( -name ".env" -o -name ".env.local" -o -name ".env.production" \) \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" \
  -not -name "*.example" -not -name "*.template"
```

- [ ] **Step 2: For each Vite-based frontend app .env, add VITE_API_BACKEND_URL (if not already present)**

```bash
# Check if it already exists:
grep "VITE_API_BACKEND_URL" <path-to-.env>

# If not present, append:
echo 'VITE_API_BACKEND_URL=https://xdigix-os-production.up.railway.app/api' >> <path-to-.env>
```

- [ ] **Step 3: For each Next.js-based app .env (webbuilder-standalone, dashboard-standalone), add NEXT_PUBLIC version**

```bash
echo 'NEXT_PUBLIC_API_BACKEND_URL=https://xdigix-os-production.up.railway.app/api' >> <path-to-.env>
```

- [ ] **Step 4: Remove any FIREBASE_ / VITE_FIREBASE_ / NEXT_PUBLIC_FIREBASE_ env vars from each .env file**

For each frontend .env file, remove lines matching:
- `VITE_FIREBASE_*`
- `NEXT_PUBLIC_FIREBASE_*`
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, etc.

- [ ] **Step 5: Commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: set API_BACKEND_URL and remove Firebase env vars from all frontend .env files"
```

---

## Task 14: Remove GOOGLE_APPLICATION_CREDENTIALS from Backend .env

- [ ] **Step 1: Find all backend .env files**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name ".env" -path "*/backend/*" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

- [ ] **Step 2: Remove GOOGLE_APPLICATION_CREDENTIALS from each**

Open each file and delete the line starting with `GOOGLE_APPLICATION_CREDENTIALS=`.

- [ ] **Step 3: Verify removed from all files**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
grep -r "GOOGLE_APPLICATION_CREDENTIALS" "$BASE" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" \
  --exclude="*.example" --exclude="*.template" --exclude="*.md"
```

Expected: 0 results.

- [ ] **Step 4: Commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: remove GOOGLE_APPLICATION_CREDENTIALS from backend .env"
```

---

## Task 15: Run npm install in All Workspace Roots

- [ ] **Step 1: Install in main workspace root**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys"
npm install
```

Expected: Installs cleanly. No `firebase-*` packages appear in output.

- [ ] **Step 2: Install in main backend**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend"
npm install
```

Expected: `firebase-admin` is NOT installed.

- [ ] **Step 3: Install in any other backend instances that have their own package-lock.json**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "package-lock.json" -path "*/backend/*" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*" \
  | while read lockfile; do
    dir=$(dirname "$lockfile")
    echo "=== Installing in $dir ==="
    (cd "$dir" && npm install)
  done
```

- [ ] **Step 4: Install in standalone apps**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "package-lock.json" \
  \( -path "*/webbuilder-standalone/*" -o -path "*/dashboard-standalone/*" \) \
  -not -path "*/node_modules/*" \
  | while read lockfile; do
    dir=$(dirname "$lockfile")
    echo "=== Installing in $dir ==="
    (cd "$dir" && npm install)
  done
```

- [ ] **Step 5: Commit updated lockfiles**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: npm install after removing all firebase packages"
```

---

## Task 16: Verification — Zero Firebase References

- [ ] **Step 1: Run the full Firebase grep check (excludes .claude worktrees)**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
grep -r "firebase" "$BASE" \
  --include="*.ts" --include="*.js" --include="*.json" \
  --exclude-dir=dist --exclude-dir=node_modules \
  --exclude-dir=docs --exclude-dir=.claude \
  --exclude="*.md" --exclude="*.env.example" --exclude="*.env.template"
```

Expected: **0 results.** Fix any matches before proceeding.

- [ ] **Step 2: Verify no .firebaserc files remain**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name ".firebaserc" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: 0 results.

- [ ] **Step 3: Verify no firebase.json files remain**

```bash
BASE="/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
find "$BASE" -name "firebase.json" \
  -not -path "*/node_modules/*" -not -path "*/.claude/*"
```

Expected: 0 results.

- [ ] **Step 4: Verify firebase-admin is not installed in backend**

```bash
ls "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/node_modules/firebase-admin" 2>&1
```

Expected: `No such file or directory`

- [ ] **Step 5: Final commit**

```bash
cd "/Users/hesainosamagmail.com/university/Project's/Web/Front-End/Projects/Madas"
git add -A
git commit -m "chore: verified - Firebase completely removed from all projects" \
  || echo "Nothing to commit — all clean"
```

---

## Task 17: Manual — Revoke Firebase API Keys in Console

> ⚠️ The hardcoded API keys are now permanently in git history. This step revokes them so they cannot be used to access Firebase even from git history.

- [ ] **Step 1: Revoke madas-store API key**

1. Go to: https://console.firebase.google.com/project/madas-store/settings/general
2. Under "Your apps" find the Web app with `apiKey: AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8`
3. Delete the web app OR restrict the API key to 0 authorized domains in Google Cloud Console

- [ ] **Step 2: Revoke undo-12 API key**

1. Go to: https://console.firebase.google.com/project/undo-12/settings/general
2. Find `apiKey: AIzaSyCgzJ9oNFsPsXx7-FAhzUkxcHMVJIBZbtQ`
3. Delete or restrict the key

- [ ] **Step 3: Optionally delete both Firebase projects entirely**

If neither project will ever be used again, delete them from Firebase Console to remove all stored data.

---

## Summary

After all 17 tasks complete:

| Check | Expected Result |
|---|---|
| `grep -r "firebase" --include="*.ts" ...` (excl .claude) | 0 results |
| `find . -name ".firebaserc"` (excl .claude) | 0 results |
| `find . -name "firebase.json"` (excl .claude) | 0 results |
| `firebase-admin` in backend `node_modules` | Not present |
| All active frontend apps | Build without errors |
| Auth / Firestore / Storage | Work via `https://xdigix-os-production.up.railway.app/api` |
| Firebase Console API keys | Revoked |
