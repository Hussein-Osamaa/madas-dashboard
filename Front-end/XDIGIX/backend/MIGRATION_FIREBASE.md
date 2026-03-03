# Firebase → MongoDB Migration Guide

This guide explains how to migrate your existing Firebase Firestore data to MongoDB.

## What Gets Migrated

| Firebase | MongoDB |
|----------|---------|
| `businesses` | `clients` |
| `businesses/{id}/products` | `products` (with `clientId`) |
| `businesses/{id}/orders` | `orders` (with `clientId`) |
| `users` (Firestore RBAC) | `users` |
| Business owners | `users` (role: admin, linked to client) |
| `businesses/{id}/staff` | `users` (role: staff, linked to client) |
| Firebase Auth | `users` (for any not already migrated) |

## Prerequisites

1. **Firebase service account key** (required to read Firestore)
   - Open [Firebase Console](https://console.firebase.google.com) → your project (madas-store)
   - Go to **Project Settings** (gear icon) → **Service accounts**
   - Click **Generate new private key**
   - Save the JSON file as `backend/firebase-service-account.json`
   - Or set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env` to the file path

2. **MongoDB** running and `MONGODB_URI` set in `.env`

## Run Migration

```bash
cd backend
npm install
node scripts/migrate-firebase-to-mongodb.js
```

Or use the npm script:

```bash
npm run migrate:firebase
```

## Field Mapping

### Businesses → Clients
- `businessName` / `brandName` → `brandName`
- `owner.name`, `owner.email`, `owner.phone` → `owner`
- `plan.type` / `subscriptionPlan` → `subscriptionPlan`

### Products
- `name`, `sku`, `barcode`, `variants` → mapped
- `quantity` / `stock` → `quantity`
- `costPrice`, `sellingPrice` / `price` → mapped

### Orders
- `customer.name` / `customerName` → `customerName`
- `customer.phone` / `phone` → `phone`
- `fulfillment.address` / `shippingAddress` → `address`
- `items` → `items` (product IDs mapped to new MongoDB product IDs)
- `financials.total` / `total` → `totalPrice`
- `fulfillment.status` → `shippingStatus`
- `payment.status` → `paymentStatus`

## Users migration

- Migrated users get a **default password** (`ChangeMe123!` unless you set `MIGRATION_DEFAULT_PASSWORD` in `.env`)
- Sources: Firestore `users`, business owners, `businesses/{id}/staff`, Firebase Auth
- Users should change their password after first login

## Notes

- A **migration user** (`migration@xdigix.local`) is created for `createdBy` on orders
- Orders with no matching product references are skipped
- Run the migration once; re-running will create duplicates (no deduplication)
- For a clean migration, use an empty MongoDB database or drop collections first
