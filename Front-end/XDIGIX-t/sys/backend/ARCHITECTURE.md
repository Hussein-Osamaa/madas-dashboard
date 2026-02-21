# Firebase Compatibility Backend - Architecture

## Overview

This document describes the architecture for replacing Firebase with a Node.js + MongoDB backend while preserving the behavior of existing React frontends (dashboards, storefronts, marketing site) with minimal or zero changes.

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  React Frontends                                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │  Dashboard   │ │  Digix Admin │ │   Finance    │ │  Storefront  │       │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘       │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                    │                                        │
│         ┌──────────────────────────┴──────────────────────────────────┐    │
│         │  Compatibility SDK (firebase.ts → adapter)                   │    │
│         │  Same API: doc, collection, getDoc, getDocs, onSnapshot,     │    │
│         │  signInWithEmailAndPassword, uploadBytes, getDownloadURL     │    │
│         └──────────────────────────┬──────────────────────────────────┘    │
└───────────────────────────────────┼────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Compatibility API Layer (Express)                                           │
│  REST: /api/firestore/*, /api/auth/*, /api/storage/*                         │
│  WebSocket: Socket.IO for realtime                                           │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Business Logic Services                                                     │
│  auth | tenants | orders | products | inventory | finance | domains | ...    │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  MongoDB + S3-compatible Storage (R2/S3)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Compatibility Strategy

**Goal: Zero or minimal frontend code changes.**

The frontend uses:
- `firebase.ts` – exports: `auth`, `db`, `storage`, `doc`, `getDoc`, `getDocs`, `setDoc`, `updateDoc`, `collection`, `addDoc`, `deleteDoc`, `query`, `where`, `orderBy`, `onSnapshot`, `serverTimestamp`, `Timestamp`, `ref`, `uploadBytes`, `getDownloadURL`
- `AuthContext` – `onAuthStateChanged(auth, callback)`, `user`, `signOut`
- `signInWithEmailAndPassword(auth, email, password)`
- Domain service – REST calls to `addDomain`, `verifyDomain`, etc.

**Approach:** Replace `firebase.ts` with a thin compatibility layer that:
1. Implements the same function signatures.
2. Internally calls our REST API + WebSocket instead of Firebase.
3. Returns data in the same shape (e.g. `{ id, data }` for docs, `snapshot.docs` for queries).

Existing services (`ordersService`, `productsService`, etc.) remain unchanged; they keep importing from `firebase.ts`.

---

## Data Model (Firestore → MongoDB Mapping)

### Current Firestore Structure

| Path | Purpose |
|------|---------|
| `businesses/{businessId}` | Tenant/business profile |
| `businesses/{businessId}/products` | Products |
| `businesses/{businessId}/orders` | Orders |
| `businesses/{businessId}/collections` | Product collections |
| `businesses/{businessId}/published_sites` | Website builder sites |
| `businesses/{businessId}/staff` | Staff members |
| `businesses/{businessId}/abandonedCarts` | Abandoned carts |
| `businesses/{businessId}/scan_log` | Scan logs |
| `businesses/{businessId}/deposits` | Finance deposits |
| `businesses/{businessId}/cash_flow_transactions` | Cash flow |
| `businesses/{businessId}/finance_settings` | Finance settings |
| `businesses/{businessId}/discounts` | Discounts |
| `tenants` | Tenant metadata |
| `users` | User profiles (Firebase Auth UID → profile) |
| `customDomains` | Domain-to-tenant mapping |
| `plans` | Subscription plans |
| `linkRequests` | Business linking |
| `superAdminInvites` | Super admin invites |

### MongoDB Collections (normalized with tenantId)

- `tenants` – tenantId, plan, features
- `businesses` – businessId (tenantId), owner, linkedBusinesses
- `products` – tenantId, businessId, product data
- `orders` – tenantId, businessId, order data
- `collections` – tenantId, businessId, productIds
- `published_sites` – tenantId, businessId, site data
- `staff` – tenantId, businessId, userId, permissions
- `abandoned_carts` – tenantId, businessId
- `scan_log` – tenantId, businessId
- `deposits`, `cash_flow_transactions`, `finance_settings` – tenantId, businessId
- `discounts` – tenantId, businessId
- `users` – uid (MongoDB _id or mapped), email, type, businessId, permissions
- `domains` – tenantId, siteId, domain, status, verificationToken
- `plans` – plan definitions
- `link_requests` – fromBusinessId, toBusinessId, status
- `super_admin_invites` – email, status

---

## Authentication

### Replace Firebase Auth With

- **JWT access tokens** (short-lived, e.g. 15 min)
- **Refresh tokens** (long-lived, stored)
- **Password hashing** (bcrypt)
- **Session persistence** (similar to Firebase `onAuthStateChanged`)

### User Types

- `super_admin` – platform admin
- `internal_staff` – Digix staff
- `client_owner` – business owner
- `client_staff` – business staff
- `courier` – delivery

### Login Response (Firebase-compatible shape)

```json
{
  "user": {
    "uid": "string",
    "email": "string",
    "displayName": "string",
    "emailVerified": true
  },
  "accessToken": "jwt",
  "refreshToken": "string",
  "expiresIn": 3600
}
```

Frontend expects `user.uid`, `user.email`, `getIdToken()` → we return `accessToken` and expose it via a compatibility wrapper.

---

## Realtime (Replace Firestore onSnapshot)

### Current Usage

- `ScanLogPage`: `onSnapshot(collection(db, 'businesses', businessId, 'scan_log'), ...)`
- Orders, inventory, notifications in other flows

### Replacement: Socket.IO

**Events emitted by backend:**
- `order_created`, `order_updated`
- `stock_changed`, `inventory_updated`
- `notification_created`
- `scan_log_added`
- etc.

**Subscription model:**
- Client connects with JWT.
- Client joins rooms by `tenantId` and optional `businessId`.
- On DB change, backend emits to the relevant room(s).
- Frontend compatibility layer: `onSnapshot(query, callback)` opens a WebSocket subscription, maps backend events to Firestore-like `snapshot` format, and calls `callback(snapshot)`.

---

## Multi-Tenancy

- Every document has `tenantId` (and often `businessId`).
- Middleware: resolve `tenantId` from JWT and attach to `req.tenantId`.
- All queries filter by `tenantId`.
- No cross-tenant access.

---

## RBAC

### Roles

| Role | Scope |
|------|-------|
| super_admin | Platform |
| internal_staff | Platform |
| client_owner | Own business |
| client_staff | Assigned business |
| courier | Assigned business / delivery |

### Permission Examples

- `orders.read`, `orders.update`, `orders.create`
- `inventory.scan`, `inventory.edit`
- `finance.view`, `finance.reports`
- `shipping.update_status`
- `reports.view`

Permission checks run in middleware or service layer before DB operations.

---

## Subscription Plans

- Plans: `saas`, `fulfillment`, `shipping`, `all-in-one`
- Feature flags per plan.
- Middleware: reject requests for features the tenant’s plan does not include.

---

## Domain System

- `domains` collection: `tenantId`, `siteId`, `domain`, `status`, `verificationToken`, `dnsRecords`.
- Read `Host` header, resolve domain → tenantId.
- Verify TXT record: `digix-verification=TOKEN`.
- Background job to verify DNS and update `status`.

---

## Finance (Ledger)

- `transactions` collection: `tenantId`, `date`, `type`, `amount`, `reference`, `debit`, `credit`, `balance_after`.
- Reports computed from transactions.
- No direct balance fields; all from ledger.

---

## Storage (Replace Firebase Storage)

- Use S3-compatible storage (AWS S3 or Cloudflare R2).
- Endpoints: `POST /api/storage/upload` (multipart).
- Response: `{ url: "https://..." }` compatible with `getDownloadURL()`.
- Path mapping: `businesses/{businessId}/products/{fileName}` → object key.

---

## Security

- JWT middleware on protected routes.
- Request validation (e.g. Zod/Joi).
- Rate limiting (e.g. per IP, per user).
- Central error handler (no stack traces in prod).
- Audit logs for sensitive actions.

---

## API Endpoints (Compatibility Layer)

### Auth

- `POST /api/auth/login` – email, password → user + tokens
- `POST /api/auth/refresh` – refreshToken → new accessToken
- `POST /api/auth/logout` – invalidate refresh token
- `GET /api/auth/me` – current user (via JWT)

### Firestore-like (document/collection)

- `GET /api/firestore/documents/:path*` – get document(s)
- `POST /api/firestore/documents/:path*` – create
- `PATCH /api/firestore/documents/:path*` – update
- `DELETE /api/firestore/documents/:path*` – delete
- `POST /api/firestore/query` – query collections (where, orderBy, limit)

Path format: `businesses/{businessId}/orders/{orderId}` etc.

### Storage

- `POST /api/storage/upload` – multipart, returns URL
- `GET /api/storage/url/:path*` – signed/redirect URL if needed

### Domains

- `POST /api/domains/add` – addDomain
- `POST /api/domains/verify` – verifyDomain
- `POST /api/domains/remove` – removeDomain
- `GET /api/domains/status` – getDomainStatus
- `GET /api/domains/list` – listDomains

### WebSocket

- `wss://api.example.com` – Socket.IO, auth via `token` query or header.

---

## Migration

1. Scripts read from Firebase (Firestore, Auth, Storage).
2. Transform and add `tenantId` where missing.
3. Write to MongoDB and S3.
4. Validation: compare counts (products, orders, inventory, wallet) before cutover.
5. If mismatch, stop and report; do not overwrite production.

---

## File Structure

```
sys/backend/
├── ARCHITECTURE.md          # This document
├── package.json
├── src/
│   ├── index.ts             # Express app entry
│   ├── config.ts            # Env/config
│   ├── db/                  # MongoDB connection
│   ├── middleware/          # JWT, tenant, RBAC, rate-limit
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── firestore.ts     # Compatibility API
│   │   ├── storage.ts
│   │   ├── domains.ts
│   │   └── index.ts
│   ├── services/            # Business logic
│   │   ├── auth.service.ts
│   │   ├── tenant.service.ts
│   │   ├── orders.service.ts
│   │   └── ...
│   ├── schemas/             # Mongoose schemas
│   ├── realtime/            # Socket.IO handlers
│   └── migration/           # Firebase → MongoDB scripts
```

---

## Frontend Changes Summary

| File | Change |
|------|--------|
| `lib/firebase.ts` | Replace Firebase SDK with compatibility adapter that calls our API + WebSocket |
| `contexts/AuthContext.tsx` | Use compatibility auth (`onAuthStateChanged` → our auth listener) |
| `services/domainService.ts` | Point `API_BASE_URL` to new backend (base URL only) |
| Other services | No change (they use firebase.ts) |

**Net result:** Only `firebase.ts`, `AuthContext`, and the domain `API_BASE_URL` need updates; business logic stays the same.
