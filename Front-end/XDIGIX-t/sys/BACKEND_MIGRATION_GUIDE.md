# Firebase → Node.js + MongoDB Migration – Complete

## Overview

The system has been migrated to use a Node.js + MongoDB backend instead of Firebase, with minimal frontend changes. The dashboard can run against either Firebase or the new backend by setting an environment variable.

---

## Quick Start (New Backend)

### 1. Start MongoDB

Ensure MongoDB is running locally or use a cloud instance.

### 2. Start Backend

```bash
cd sys/backend
npm install
cp .env.example .env
npm run seed    # Create test user: admin@test.com / Test123!
npm run dev
```

Backend: **http://localhost:4000**

### 3. Start Dashboard

```bash
cd sys/apps/marketing/apps/dashboard
echo "VITE_API_BACKEND_URL=http://localhost:4000/api" > .env
npm install
npm run dev
```

Dashboard: **http://localhost:5174/dashboard/**

### 4. Log In

- **Email:** admin@test.com  
- **Password:** Test123!

---

## Switch Between Firebase and Backend

| Mode   | Environment variable              | Result                                      |
|--------|-----------------------------------|---------------------------------------------|
| Backend| `VITE_API_BACKEND_URL=http://localhost:4000/api` | Uses new Node.js + MongoDB backend |
| Firebase | Not set or empty               | Uses original Firebase (Firestore, Auth, Storage) |

---

## What Was Implemented

### Backend (sys/backend)

- **Auth** – JWT (access + refresh), bcrypt
- **Firestore compatibility API** – Document CRUD, queries
- **Storage** – File upload (local / S3-ready)
- **Domains** – Add, verify, remove, list
- **Realtime** – Socket.IO
- **Tenant isolation** – tenantId on all requests
- **Migration scripts** – Firebase → MongoDB
- **Seed script** – `npm run seed` for test user

### Frontend (Dashboard)

- **Backend adapter** – Mirrors Firebase API via REST
- **Firebase switching** – `VITE_API_BACKEND_URL` selects backend vs Firebase
- **AuthContext & LoginPage** – Work with both
- **Domain service** – Uses backend when URL is set

### Shared

- **rbacService** – Uses shared firebase.ts (Firestore)
- **shared/firebase.ts** – Exports Firestore helpers including Timestamp

---

## File Structure

```
sys/
├── backend/              # New Node.js + MongoDB API
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── middleware/
│   │   ├── realtime/
│   │   └── migration/
│   └── ARCHITECTURE.md
├── apps/marketing/apps/dashboard/
│   └── src/lib/
│       ├── firebase.ts       # Switches Firebase vs backend
│       ├── firebase-impl.ts  # Firebase SDK
│       └── backend-adapter.ts # Backend API adapter
└── shared/lib/
    ├── firebase.ts
    ├── firebase.js
    └── rbacService.ts
```

---

## Completed

- **Digix Admin** – Backend adapter, `firebase.ts` switching, AuthContext, LoginPage, SetupPasswordPage
- **Finance** – Backend adapter, `firebase.ts` switching, auth & Firestore
- **Dashboard** – PricingPage, DiscountsPage, DataMigrationPage, SetupPasswordPage use `firebase.ts`
- **Backend signup** – `POST /api/auth/signup` for staff/SetupPassword flows
- **Migration validation** – `npm run migrate:validate` (or `SKIP_FIREBASE=1` for MongoDB-only)

## Next Steps (Optional)

1. **S3/Cloudflare R2** – Configure in `.env` for production storage.
2. **Production migration** – Run migration scripts, validate, then cut over.
3. **Domain verification** – Wire DNS TXT checks to background jobs.

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| Login fails | Run `npm run seed` in backend |
| 404 on firebase.js | Ensure `sys/shared/lib/firebase.js` exists and exports Timestamp |
| CORS errors | Check `CORS_ORIGIN` in backend `.env` |
| Port in use | `kill $(lsof -t -i:4000)` or `kill $(lsof -t -i:5174)` |
