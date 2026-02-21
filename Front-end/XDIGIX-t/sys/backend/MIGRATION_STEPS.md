# Firebase → MongoDB Migration Steps

## Before You Start

1. **MongoDB** must be running (local or cloud).
2. **Firebase service account key** – download from Firebase Console.

---

## Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com) → your project (**madas-store**).
2. Project Settings (gear icon) → **Service accounts**.
3. Click **Generate new private key** → Save as JSON.
4. Place the file in `sys/backend/` (e.g. `serviceAccountKey.json`).
5. Add to `.gitignore`:
   ```
   serviceAccountKey.json
   *-firebase-adminsdk-*.json
   ```

---

## Step 2: Configure Environment

Edit `sys/backend/.env`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/madas

# Firebase migration (full path to service account JSON)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

Use the correct path to your service account JSON file.

---

## Step 3: Dry Run (Preview)

Runs migration logic without writing to MongoDB:

```bash
cd sys/backend
npm run migrate
```

This prints what would be migrated (tenants, businesses, products, orders, users, domains).

---

## Step 4: Execute Migration

Writes data to MongoDB:

```bash
cd sys/backend
DRY_RUN=false npm run migrate
```

---

## Step 5: Validate

Compare Firebase vs MongoDB counts:

```bash
cd sys/backend
npm run migrate:validate
```

If any counts differ, the script exits with code 1. Fix issues and re-run migration if needed.

**MongoDB-only** (without Firebase credentials):

```bash
SKIP_FIREBASE=1 npm run migrate:validate
```

---

## Data Migrated

| Firebase | MongoDB |
|----------|---------|
| `tenants` | Tenant |
| `businesses` | Business |
| `businesses/{id}/products` | FirestoreDoc |
| `businesses/{id}/orders` | FirestoreDoc |
| `businesses/{id}/staff` | FirestoreDoc |
| `businesses/{id}/deposits` | FirestoreDoc |
| `businesses/{id}/collections` | FirestoreDoc |
| ... (other subcollections) | FirestoreDoc |
| `users` | User |
| `customDomains` | Domain |

---

## Post-Migration: User Passwords

**Important:** User documents are migrated, but **passwords are not** (Firebase Auth stores them separately). Options:

1. **Use backend seed** – create users via `npm run seed` or `npm run seed:super-admin`.
2. **Add password migration** – use Firebase Admin to export users and hash passwords for MongoDB (requires extra work).

For now, migrated users need to use **Reset Password** or be created via seed/SetupPassword flow.
