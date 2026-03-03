# Firebase Deprecated - MongoDB Only

XDIGIX has **permanently stopped using Firebase**. All reads and writes use MongoDB via the backend API.

## What Was Removed

- **Backend**: `firebase-admin` removed. Migration scripts moved to `backend/scripts/archive/`
- **digix-admin**: `lib/firebase.ts` replaced with a stub that throws on use
- **dashboard**: `lib/firebase.ts` replaced with a stub. Firebase perf/analytics removed from `main.tsx`

## Current State

- **No Firebase connection** – `initializeApp` is never called
- **Firebase-dependent pages** will throw "Firebase is disabled. Use MongoDB API" when they try to use Firestore/auth/storage
- **Auth & business** – Use `api.ts` and backend JWT auth (already migrated)

## Migrating Firebase-Dependent Pages

Pages that still import from `lib/firebase` need to use the MongoDB API instead:

1. Replace `getDocs(collection(db, 'x'))` with `apiRequest('/api/...')` or `apiGetList('/api/...')`
2. Replace `updateDoc`, `addDoc`, `deleteDoc` with `apiRequest` POST/PATCH/DELETE
3. Replace Firebase Auth with backend JWT login (`/api/auth/login`)
4. Replace Storage uploads with backend upload endpoints

## Public Web-Builder HTML Files

Standalone HTML files in `public/pages/Web-builder/` still contain Firebase CDN imports. They are legacy and need full API migration or removal.
