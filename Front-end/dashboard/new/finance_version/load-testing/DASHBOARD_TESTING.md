# MADAS Dashboard Load Testing Guide

This guide explains how to use the load testing suite specifically for the **MADAS Dashboard** application.

## Dashboard Architecture

The MADAS Dashboard is a **React/Vite SPA** that uses:
- **Firebase Hosting** for static file serving
- **Firebase Auth** for authentication (client-side)
- **Firestore** with multi-tenant structure:
  - Top-level collection: `businesses`
  - Sub-collections: `orders`, `transactions`, `payments`, `expenses`, `products`, `customers`, etc.
  - Each business document has sub-collections scoped to that business

## Key Differences from Generic Suite

1. **No REST API**: The dashboard uses Firebase SDK directly from the client
2. **Multi-tenant via businessId**: Uses `businesses/{businessId}/subcollection` path structure
3. **Client-side routing**: React Router handles navigation
4. **Firestore REST API**: Load tests use Firestore REST API directly for data operations

## Configuration

### Environment Variables for MADAS Dashboard

```bash
# Environment
ENV=staging

# Firebase Configuration (from firebase.ts)
BASE_URL=https://madas-store.web.app  # or your Firebase Hosting URL
FIREBASE_API_KEY=AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8
FIREBASE_PROJECT_ID=madas-store
FIRESTORE_URL=https://firestore.googleapis.com/v1/projects/madas-store/databases/(default)/documents

# Test Credentials (use actual test user accounts)
TEST_USER_EMAIL=loadtest@your-domain.com
TEST_USER_PASSWORD=your_test_password

# Test Business IDs (comma-separated)
# Note: In MADAS, these are business IDs, not tenant IDs (conceptually the same)
TENANT_IDS=business-id-1,business-id-2

# Test Users (should correspond to businesses above)
TEST_USERS=user1@business1.com,user2@business1.com,user1@business2.com
TEST_PASSWORDS=password1,password2,password3
```

## Running Tests

### 1. Dashboard Home Page Test

Tests the main dashboard page load:

```bash
ENV=staging k6 run src/tests/main.ts
```

This simulates users loading:
- Dashboard home page (`/`)
- Orders page (`/orders`)
- Finance overview (`/finance/overview`)
- Firestore collections (orders, transactions, products)

### 2. Firestore-Only Test

Test Firestore operations directly without page loads:

```bash
# Create a custom test file for Firestore-only operations
ENV=staging k6 run src/scenarios/read-heavy.ts
```

### 3. Full User Journey Test

Simulates a complete user session:

```typescript
// In your test file
import { fullDashboardSessionScenario } from '../scenarios/dashboard-madas';

export default function (data: { token: string; businessId: string }) {
  fullDashboardSessionScenario(data.token, data.businessId);
}
```

## Understanding Test Results

### Page Load Metrics

- **Dashboard Home**: Loading the React app and initial render
- **Orders Page**: Orders page with order list
- **Finance Overview**: Financial dashboard with charts and stats

### Firestore Metrics

- **Collection Reads**: Direct Firestore REST API calls
- **Throttling**: Watch for 429 (RESOURCE_EXHAUSTED) responses
- **Latency**: p95/p99 for Firestore operations

### Common Issues

#### 1. Firestore Security Rules

If you see `PERMISSION_DENIED` errors:
- Check Firestore security rules allow test users
- Verify `businessId` matches test business IDs
- Ensure rules check `request.auth.uid` and business membership

#### 2. Authentication Failures

If authentication fails:
- Verify test user exists in Firebase Auth
- Check user has access to test businesses
- Ensure `FIREBASE_API_KEY` is correct

#### 3. CORS Errors

If you see CORS errors when testing locally:
- Firebase Hosting may block direct k6 requests
- Use hosted URL (`madas-store.web.app`) not localhost
- Or use Firestore REST API directly (bypasses CORS)

## Firestore Query Patterns

The dashboard uses these common query patterns:

### Orders Collection
```javascript
// businesses/{businessId}/orders
// Filtered by createdAt with date range
// Ordered by createdAt desc
```

### Transactions Collection
```javascript
// businesses/{businessId}/transactions
// Filtered by createdAt, type, method
// Ordered by createdAt desc
```

### Products Collection
```javascript
// businesses/{businessId}/products
// Ordered by name asc
// Limited to 100 items
```

## Custom Test Scenarios

### Test Dashboard Stats Loading

```typescript
import { loadOrdersCollection, loadTransactionsCollection } from '../scenarios/dashboard-madas';

export default function (data: { token: string; businessId: string }) {
  // Simulate dashboard stats loading
  loadOrdersCollection(data.token, data.businessId);
  loadTransactionsCollection(data.token, data.businessId);
}
```

### Test Order Creation

```typescript
import { createDocument } from '../utils/firestore';
import { getRandomTenantId } from '../utils/tenant';

export default function (data: { token: string }) {
  const businessId = getRandomTenantId();
  
  createDocument(
    'orders',
    {
      totalAmount: Math.random() * 1000,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
    data.token,
    undefined, // auto-generate doc ID
    businessId // use business sub-collection
  );
}
```

## Performance Targets for MADAS Dashboard

Based on Firebase and React SPA best practices:

- **Page Load (First Paint)**: < 1.5s
- **Firestore Query**: < 500ms (p95)
- **Firestore Write**: < 1000ms (p95)
- **Error Rate**: < 1%
- **Firestore Throttling**: < 0.1%

## Cost Estimation

For MADAS Dashboard load testing:

**Example: 1k users, 10-minute test**
- Firestore Reads: ~50k reads = $0.03
- Firestore Writes: ~5k writes = $0.009
- Firebase Hosting: Included in plan
- **Total: ~$0.04 per test**

**10k spike test:**
- Firestore Reads: ~500k reads = $0.30
- Firestore Writes: ~50k writes = $0.09
- **Total: ~$0.40 per test**

## Troubleshooting

### "Permission Denied" Errors

1. Check Firestore rules allow test users
2. Verify business membership in `businesses/{businessId}/staff` collection
3. Test user should be owner or staff member of test business

### Slow Page Loads

1. Check Firebase Hosting CDN cache
2. Verify Firestore indexes are created
3. Review query complexity (multiple where clauses need composite indexes)

### High Firestore Costs

1. Reduce test duration or VU count
2. Use Firestore emulator for local testing
3. Limit collection sizes in test data

## Next Steps

1. **Run Small Test First**: Start with 10 users, 1 minute
2. **Monitor Firebase Console**: Watch usage and quotas
3. **Check Firestore Rules**: Ensure test users can access test businesses
4. **Scale Gradually**: Increase load incrementally
5. **Review Results**: Focus on p95/p99 latency and error rates

---

For general load testing documentation, see [README.md](./README.md)


