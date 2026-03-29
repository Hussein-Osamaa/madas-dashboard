# Remove Firebase Permanently — Design Spec
**Date:** 2026-03-29
**Status:** Approved
**Approach:** Full rip-out (Option A)

---

## Overview

Permanently remove all Firebase dependencies from the entire Madas/XDIGIX platform and replace with the already-built replacement stack:

| Firebase Service | Replacement | Status |
|---|---|---|
| Firestore | MongoDB Atlas (Mongoose, 27 schemas) | Complete |
| Firebase Auth | JWT + bcrypt | Complete |
| Cloud Storage | S3/R2/MinIO (@aws-sdk/client-s3) | Complete |
| Cloud Functions | Express.js API (17 route modules) | Complete |
| Frontend SDK | backend-adapter.ts (mirrors Firebase API) | Complete |
| Realtime | Socket.IO | Complete |

Backend deployed at: `https://xdigix-os-production.up.railway.app/api`

---

## Scope — All Projects

1. `Front-end/XDIGIX-t/sys/` — active main platform (frontend + backend)
2. `Front-end/XDIGIX/sys/` — secondary variant
3. `Front-end/dashboard/` — standalone dashboard (all subdirectories: `new/`, `sys/`, `public/`, `website/`, `admin/`)
4. `XDIGIX-OS/Front-end/XDIGIX-t/` — OS variant
5. `XDIGIX-OS/Front-end/XDIGIX-vsc/` — VSC variant
6. `webbuilder-standalone/` — standalone webbuilder app
7. `dashboard-standalone/` — standalone dashboard app
8. `UNDO/` — legacy Firebase platform → **DELETE ENTIRELY**

---

## Pre-Execution: Rollback Safety

Before making any changes, create a git branch as a checkpoint:
```bash
git checkout -b backup/before-firebase-removal
git add -A && git commit -m "checkpoint: before firebase removal"
git checkout -
```
This allows full rollback if anything goes wrong.

Also: **Revoke Firebase API keys** in the Firebase console for both projects (`madas-store` and `undo-12`) before or immediately after file deletions, since the keys are hardcoded in several source files and will remain in git history.

---

## Section 1 — Directories to Delete Entirely

**Note on `functions/` scope:** Before deletion (Step 3), audit each root `package.json` for workspace declarations referencing `functions/` directories (e.g. `"workspaces": ["functions"]`). Remove those references first, or `npm install` in Step 17 will fail trying to resolve a deleted workspace.

| Directory | Reason |
|---|---|
| `Madas/UNDO/` | Legacy Firebase platform, fully superseded by XDIGIX-t |
| `Front-end/XDIGIX-t/sys/functions/` | Firebase Cloud Functions, replaced by Express backend |
| `Front-end/XDIGIX/sys/functions/` | Firebase Cloud Functions, replaced by Express backend |
| `Front-end/dashboard/new/finance_version/sys/functions/` | Firebase Cloud Functions |
| `Front-end/dashboard/new/sys/functions/` | Firebase Cloud Functions |
| `Front-end/dashboard/public/functions/` | Firebase Cloud Functions |
| `Front-end/dashboard/public/organized/functions/` | Firebase Cloud Functions |
| `XDIGIX-OS/Front-end/XDIGIX-t/sys/functions/` | Firebase Cloud Functions |
| `XDIGIX-OS/Front-end/XDIGIX-vsc/sys/functions/` | Firebase Cloud Functions |

**Confirmed no `functions/` directories in:** `dashboard/sys/`, `dashboard/admin/`, `webbuilder-standalone/`, `dashboard-standalone/` — verify during execution and note if found.

---

## Section 2 — Firebase Config Files to Delete

### `.firebaserc` files (all locations)
- `Front-end/.firebaserc`
- `Front-end/XDIGIX-t/sys/.firebaserc`
- `Front-end/XDIGIX/sys/.firebaserc`
- `Front-end/dashboard/.firebaserc`
- `XDIGIX-OS/Front-end/.firebaserc`
- `XDIGIX-OS/Front-end/XDIGIX-t/.firebaserc`
- `XDIGIX-OS/Front-end/XDIGIX-vsc/.firebaserc`
- Any other `.firebaserc` found by grep

### `firebase.json` files (all locations)
- `Front-end/XDIGIX-t/sys/firebase.json`
- `Front-end/XDIGIX/sys/firebase.json`
- `Front-end/dashboard/firebase.json`
- `XDIGIX-OS/Front-end/firebase.json`
- `XDIGIX-OS/Front-end/XDIGIX-t/firebase.json`
- `XDIGIX-OS/Front-end/XDIGIX-vsc/firebase.json`
- Any other `firebase.json` found by grep

### Firestore / Storage rules and indexes (all locations)
- All `firestore.rules` files
- All `firestore.indexes.json` files
- All `storage.rules` files

### `firebaseConfig.js` files
- `dashboard/public/firebaseConfig.js`
- `dashboard/website/public/firebaseConfig.js`
- `dashboard/System/Dashboard/firebaseConfig.js`
- `dashboard/public/organized/firebaseConfig.js`
- Any other `firebaseConfig.js` found by grep

---

## Section 3 — Source Files to Delete

### Backend Firebase files
| File | Location |
|---|---|
| `src/lib/firebaseAdmin.ts` | `XDIGIX-t/sys/backend/` |
| `src/lib/firebaseAdmin.ts` | `XDIGIX-vsc/sys/backend/` |
| `dist/lib/firebaseAdmin.js` | `XDIGIX-t/sys/backend/dist/` |
| `dist/lib/firebaseAdmin.d.ts` | `XDIGIX-t/sys/backend/dist/` |

Clean all `dist/` directories in backend projects (they will be rebuilt).

### Frontend `firebase-impl.ts` files (raw Firebase SDK — these stay when adapter is active but must be deleted)
- `XDIGIX-t/sys/apps/marketing/apps/dashboard/src/lib/firebase-impl.ts`
- `XDIGIX-t/sys/apps/marketing/apps/digix-admin/src/lib/firebase-impl.ts`
- `XDIGIX-t/sys/apps/marketing/apps/finance/src/lib/firebase-impl.ts`
- `XDIGIX-vsc/sys/apps/marketing/apps/dashboard/src/lib/firebase-impl.ts`
- `XDIGIX-vsc/sys/apps/marketing/apps/digix-admin/src/lib/firebase-impl.ts`
- `XDIGIX-vsc/sys/apps/marketing/apps/finance/src/lib/firebase-impl.ts`
- Any other `firebase-impl.ts` found by grep

### Dashboard subdirectory Firebase source files
All of the following files inside `Front-end/dashboard/` tree:
- `new/finance_version/sys/shared/lib/firebase.ts`
- `new/finance_version/sys/hhhh/multi-tenancy/firebase-init-plans.js`
- `new/finance_version/sys/hhhh/js/firebase-permission-check.js`
- `new/finance_version/sys/load-testing/src/utils/firebase-perf.ts`
- `new/sys/shared/lib/firebase.ts`
- `new/sys/Dashboard/multi-tenancy/` (all firebase files)
- `new/sys/Dashboard/js/firebase-permission-check.js`
- `sys/shared/lib/firebase.ts`
- `sys/Dashboard/multi-tenancy/` (all firebase files)
- `sys/Dashboard/mobile-app/src/services/firebase-mobile.js`
- `website/src/lib/firebase.ts`
- `admin/src/lib/firebase.ts`
- Any other firebase source files found by grep in this tree

### marketing-website-standalone Firebase files
- Any `firebase-config.js` or firebase imports in `marketing-website-standalone/`

---

## Section 4 — Frontend `firebase.ts` Replacement

For every active frontend app that still has a `firebase.ts` using the real Firebase SDK, replace it with a re-export from the backend-adapter.

**Apps requiring replacement:**
- `XDIGIX-t/sys/apps/marketing/apps/dashboard/src/lib/firebase.ts`
- `XDIGIX-t/sys/apps/marketing/apps/digix-admin/src/lib/firebase.ts`
- `XDIGIX-t/sys/apps/marketing/apps/finance/src/lib/firebase.ts`
- `XDIGIX-vsc/sys/apps/*/src/lib/firebase.ts` (same 3 apps)
- `webbuilder-standalone/src/lib/firebase.ts`
- `dashboard-standalone/src/lib/firebase.ts`

**Replacement content for each `firebase.ts`:**
```typescript
// Firebase removed. All services now route through the backend adapter.
export { auth, db, storage } from './backend-adapter'
```

**Note:** `webbuilder-standalone` and `dashboard-standalone` do not have a `backend-adapter.ts` yet. One must be created for each, copying the pattern from `XDIGIX-t/sys/apps/marketing/apps/dashboard/src/lib/backend-adapter.ts`.

**⚠️ Steps 11 and 12 must be executed atomically.** Step 11 replaces `firebase.ts` with an import from `./backend-adapter`, but for `webbuilder-standalone` and `dashboard-standalone` that file does not yet exist. Do NOT run a build or test between steps 11 and 12 — the imports will be broken until Step 12 creates the adapter files.

**Required env var in each frontend app's `.env` / `.env.local`:**
```
VITE_API_BACKEND_URL=https://xdigix-os-production.up.railway.app/api
# or for Next.js apps:
NEXT_PUBLIC_API_BACKEND_URL=https://xdigix-os-production.up.railway.app/api
```

---

## Section 5 — Backend Route & Package Changes

### Delete from `auth.routes.ts`:
- `POST /api/auth/admin/exchange-firebase` endpoint
- All `firebaseAdmin` imports in that file

### Delete from `backend/package.json` (all backend instances):
- `firebase-admin`

### Remove from backend `.env`:
```
GOOGLE_APPLICATION_CREDENTIALS=...
```

---

## Section 6 — package.json Cleanup

Remove from **every** `package.json` across the monorepo:
- `firebase`
- `firebase-admin`
- `firebase-functions`
- `firebase-functions-test`

Run package manager install after removal in each workspace root.

---

## Section 7 — Environment Variable Changes

### Backend `.env` — Remove:
```
GOOGLE_APPLICATION_CREDENTIALS=...
```

### Frontend `.env` files — Add to each active app:
```
VITE_API_BACKEND_URL=https://xdigix-os-production.up.railway.app/api
```

### Frontend `.env` files — Remove any:
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
(etc.)
```

---

## Execution Order

1. Create git backup branch
2. Delete `UNDO/` directory entirely
3. Audit all root `package.json` files for workspace references to `functions/` — remove any found
4. Delete all `functions/` directories (9 total)
5. Delete all `.firebaserc` and `firebase.json` files
6. Delete all `firestore.rules`, `storage.rules`, `firestore.indexes.json`
7. Delete all `firebaseConfig.js` files
8. Delete all `firebase-impl.ts` files
9. Delete `firebaseAdmin.ts` from all backend `src/lib/` directories
10. Clean all `dist/` directories in backend projects
11. Remove `exchange-firebase` route from `auth.routes.ts` in all backend instances
12. Create `backend-adapter.ts` for `webbuilder-standalone` and `dashboard-standalone`
13. Replace all active `firebase.ts` files with backend-adapter re-exports (**do not build between steps 12 and 13**)
14. Delete remaining firebase source files in `dashboard/` subtree
15. Remove all firebase packages from every `package.json`
16. Set `VITE_API_BACKEND_URL` / `NEXT_PUBLIC_API_BACKEND_URL` in all frontend `.env` files
17. Remove `GOOGLE_APPLICATION_CREDENTIALS` and Firebase env vars from backend `.env`
18. Run package manager install in all workspace roots
19. Run verification grep (see below)
20. Revoke Firebase API keys in Firebase console (madas-store and undo-12)

---

## Success Criteria

```bash
# Zero Firebase references in source (excluding dist, node_modules, docs, and template files)
grep -r "firebase" \
  --include="*.ts" --include="*.js" --include="*.json" \
  --exclude-dir=dist --exclude-dir=node_modules --exclude-dir=docs \
  --exclude="*.md" --exclude="*.env.example" --exclude="*.env.template" \
  /path/to/Madas/
# Expected: 0 results
# Note: matches in .env.example / .env.template are acceptable documentation — excluded above

# No .firebaserc files
find /path/to/Madas/ -name ".firebaserc" -not -path "*/node_modules/*"
# Expected: 0 results

# No firebase.json files
find /path/to/Madas/ -name "firebase.json" -not -path "*/node_modules/*"
# Expected: 0 results
```

All active frontend apps build without errors. Auth, Firestore reads/writes, and file uploads work via the backend adapter at `https://xdigix-os-production.up.railway.app/api`.
