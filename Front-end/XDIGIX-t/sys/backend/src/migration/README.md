# Firebase to MongoDB Migration

## Overview

Migration scripts read data from Firebase (Firestore, Auth, Storage) and transform/insert into MongoDB.

**CRITICAL: Do NOT overwrite production.** Run validation first.

## Prerequisites

- Firebase Admin SDK credentials (service account JSON)
- MongoDB connection string
- Node.js 18+

## Environment

```env
FIREBASE_PROJECT_ID=madas-store
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account.json
MONGODB_URI=mongodb://localhost:27017/madas
```

## Scripts

### 1. Migration (Dry Run)

```bash
npm run migrate
```

Reads Firebase collections, transforms, validates. Does NOT write to MongoDB by default.

### 2. Migration (Execute)

Set `DRY_RUN=false` to perform actual insert:

```bash
DRY_RUN=false npm run migrate
```

### 3. Validation

After migration, run validation to compare counts:

```bash
npm run migrate:validate
```

Compares:
- Tenants
- Businesses
- Products
- Orders
- Users
- Domains
- Deposits (wallet)

If mismatch exists, the script reports and exits with code 1.

**MongoDB-only mode** (when Firebase credentials are not available):

```bash
SKIP_FIREBASE=1 npm run migrate:validate
```

Prints MongoDB document counts without comparing to Firebase.

## Data Transformation

| Firebase | MongoDB |
|----------|---------|
| businesses/{id} | Business collection |
| businesses/{id}/orders | FirestoreDoc (collection=orders) |
| businesses/{id}/products | FirestoreDoc (collection=products) |
| businesses/{id}/customers | FirestoreDoc (collection=customers) |
| businesses/{id}/deposits, expenses, finance_settings, profit_*, finance_budgets, finance_reports, transactions, payments, finance_accounts, etc. | FirestoreDoc (same coll names) |
| users (Auth + profile) | User collection |
| customDomains | Domain collection |
| tenants | Tenant collection |

All documents receive `tenantId` during migration. Existing `businessId` maps to tenant for subcollections.

---

## Getting Firebase data for new client accounts

If you **created new client accounts** (via Digix Admin → Create Client) for each old Firebase client and want those accounts to see their **products, orders, and all data** from Firebase:

### Step 1: Run the migration (Firebase → MongoDB)

This copies all businesses, products, orders, staff, etc. into MongoDB.

```bash
# Optional: dry run first
npm run migrate

# Execute (requires GOOGLE_APPLICATION_CREDENTIALS and MONGODB_URI)
DRY_RUN=false npm run migrate
```

### Step 2: Link new client accounts to migrated data

This script matches each new client owner (by email) to the migrated business and points their account to that business. The empty business/tenant created by create-client is removed.

```bash
# Dry run first (prints what would be linked)
npm run migrate:link-clients

# Execute
DRY_RUN=false npm run migrate:link-clients
```

After this, when a new client logs in (email + password), they will see their migrated products, orders, and all data.

### Step 3: Validate counts (optional)

```bash
npm run migrate:validate
# or MongoDB-only: SKIP_FIREBASE=1 npm run migrate:validate
```
