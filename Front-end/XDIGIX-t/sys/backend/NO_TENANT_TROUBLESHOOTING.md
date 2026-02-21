# "No tenant associated" (403) – Where customer/tenant data lives

**If it was working before and then started returning 403** (e.g. after adding features or a deploy), the User↔Business link in MongoDB may have been lost or overwritten. Re-run the link script (see "How to fix" below); it is safe to run again.

## What the error means

When the dashboard (or any client) calls the backend with a valid JWT, the **tenant middleware** must resolve a **tenant** for the user. If it cannot, the backend returns **403** with `{ "error": "No tenant associated", "code": "auth/no-tenant" }`.

## Where customer/tenant data is stored (backend)

All of this lives in **MongoDB** (not Firebase):

1. **`User` collection** (see `src/schemas/user.schema.ts`)
   - `uid` – unique (often matches Firebase UID or a generated id)
   - `email` – used for login
   - `type` – e.g. `client_owner`, `client_staff`
   - **`tenantId`** – optional; if set, this is the tenant for the user
   - **`businessId`** – optional; if set, tenant is taken from the Business document

2. **`Business` collection** (see `src/schemas/business.schema.ts`)
   - `businessId` – unique (e.g. Firebase business doc id or generated)
   - **`tenantId`** – required; identifies the tenant
   - `name`, `owner`, `plan`, `features`, etc.

3. **Resolution flow** (`src/services/auth.service.ts` → `getEffectiveTenantId(uid)`)
   - Find **User** by `uid` (from JWT).
   - If no User → **null** → 403 "No tenant associated".
   - If User has **tenantId** → return it.
   - If User has **businessId** → find **Business** by `businessId`; return `business.tenantId` (or null if Business missing).
   - Otherwise → **null** → 403.

So the **customer data** the backend needs to avoid 403 is:

- A **User** document for the logged-in user’s `uid` with either **tenantId** or **businessId** set.
- If **businessId** is set, a **Business** document with that **businessId** and a valid **tenantId**.

## How the dashboard gets the JWT

When `VITE_API_BACKEND_URL` is set, the dashboard login uses the **backend** login:

- **Login:** `POST /auth/login` (or `/auth/client/login`) with email + password.
- Backend looks up **User** by **email** (not uid), checks password, then issues a JWT whose `sub` is **user.uid**.
- Every later request sends this JWT; the backend uses **req.user.uid** and calls `getEffectiveTenantId(uid)`.

So the **same** User document must have:

- The **uid** that is put in the JWT (so `getEffectiveTenantId(uid)` finds it).
- Either **tenantId** or **businessId** (and Business exists with tenantId) so a tenant can be resolved.

## How to fix 403 "No tenant associated"

**Quick fix (recommended):** From the backend directory run:
```bash
UID=<your-jwt-uid> BUSINESS_ID=<your-business-id> npm run link-user
```
Example (from your error): `UID=8834ffc011394d609919 BUSINESS_ID=kdyS5zTsGKiHxKd0UTCI npm run link-user`  
Then log in again and reload the app. Safe to run even if the user was linked before (e.g. after it "stopped working").

1. **Ensure the user exists in MongoDB with a tenant**
   - In MongoDB, open the **users** collection.
   - Find the user by **email** (or by **uid** if you know the JWT’s sub).
   - Ensure the document has either:
     - **tenantId**: set to the correct tenant id (e.g. same as `businessId` or your tenant scheme), or
     - **businessId**: set to an existing **Business** document’s **businessId**, and that Business has **tenantId** set.

2. **Ensure Business documents exist**
   - In the **businesses** collection, each business must have **businessId** and **tenantId**.
   - If the dashboard uses a business id like `kdyS5zTsGKiHxKd0UTCI`, there must be a Business with `businessId: "kdyS5zTsGKiHxKd0UTCI"` and a non-empty **tenantId**.

3. **Linking Firebase users to backend (if you use Firebase Auth + backend API)**
   - If users sign in with Firebase and you later exchange that for a backend JWT, the backend **User** record’s **uid** must match the Firebase UID.
   - Use **Create Client** (e.g. `POST /api/clients` if available) or run a migration/script that creates or updates **User** and **Business** with the same **uid** / **businessId** / **tenantId** so that `getEffectiveTenantId(uid)` returns a value.

4. **Quick check in MongoDB**
   ```js
   // Find user by email (replace with the login email)
   db.users.findOne({ email: "user@example.com" })
   // Must have: uid, and either tenantId or businessId.

   // If businessId is set, Business must exist:
   db.businesses.findOne({ businessId: "<that businessId>" })
   // Must have: tenantId (non-empty).
   ```

After fixing the User (and optionally Business) documents, have the user log in again so a new JWT is issued; then reload the dashboard so API calls use the updated tenant resolution.
