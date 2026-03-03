# Quick Start: Testing MADAS Dashboard

This is a **5-step quick start** specifically for testing the **MADAS Dashboard** application.

## Prerequisites

- k6 installed: `brew install k6`
- Node.js v18+ installed
- Access to MADAS Dashboard staging environment
- Test user account(s) with access to test business(es)

## Step 1: Install Dependencies

```bash
cd load-testing
npm install
```

## Step 2: Configure Environment

Create `.env` file in `load-testing/` directory:

```bash
cat > .env << 'EOF'
# Environment
ENV=staging

# MADAS Dashboard Firebase Hosting URL
BASE_URL=https://madas-store.web.app

# Firebase Configuration (from sys/apps/dashboard/src/lib/firebase.ts)
FIREBASE_API_KEY=AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8
FIREBASE_PROJECT_ID=madas-store
FIRESTORE_URL=https://firestore.googleapis.com/v1/projects/madas-store/databases/(default)/documents

# Test User Credentials (must have access to test businesses)
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password

# Test Business IDs (comma-separated)
# These are the business IDs from Firestore 'businesses' collection
TENANT_IDS=business-id-1,business-id-2

# Safety Flags
ALLOW_PROD_TESTS=false
DESTRUCTIVE=false
EOF
```

**Important**: Replace all values with actual test credentials and business IDs.

## Step 3: Verify Test Credentials

1. Open MADAS Dashboard in browser: https://madas-store.web.app (or your staging URL)
2. Log in with `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`
3. Verify you can access at least one business listed in `TENANT_IDS`
4. Check Firestore Console: Ensure test businesses exist in `businesses` collection

## Step 4: Run Small Test First

```bash
# Test with 10 users for 1 minute
ENV=staging K6_VUS=10 k6 run --duration 1m src/tests/dashboard-test.ts
```

**Expected output**:
- ✅ No authentication errors
- ✅ p95 latency < 3s (reasonable for first test)
- ✅ Error rate < 5%
- ✅ Dashboard pages load (status 200)

**If you see errors**:
- **"Failed to authenticate"**: Check `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`
- **"PERMISSION_DENIED"**: Check Firestore rules allow test user access to test businesses
- **"Connection timeout"**: Check `BASE_URL` is correct and accessible

## Step 5: Run Full Dashboard Test

```bash
# Run 1k users dashboard test (25 minutes)
npm run test:dashboard-madas
```

**What this tests**:
- Dashboard home page (`/`)
- Orders page (`/orders`)
- Finance overview page (`/finance/overview`)
- Firestore collections (orders, transactions, products)
- Realistic user journeys through multiple pages

**Monitor**:
- k6 output for metrics (p95/p99, error rate)
- Firebase Console → Usage (watch Firestore reads/writes)
- Firebase Console → Firestore → Quotas

## Understanding Results

### Good Results
- ✅ p95 < 1.5s, p99 < 2.5s
- ✅ Error rate < 1%
- ✅ Firestore throttles < 0.1%
- ✅ All pages load successfully

### Concerning Results
- ⚠️ p95 > 3s, p99 > 5s
- ⚠️ Error rate 1-5%
- ⚠️ Firestore throttles > 1%

### Critical Issues
- ❌ p95 > 5s, p99 > 10s
- ❌ Error rate > 10%
- ❌ Many PERMISSION_DENIED errors

## Common Issues & Solutions

### Issue: Authentication Fails

**Error**: `Failed to authenticate test user`

**Solution**:
1. Verify `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in `.env`
2. Test login manually in browser
3. Check Firebase Auth console - user should exist and be enabled
4. Verify `FIREBASE_API_KEY` matches your Firebase project

### Issue: Permission Denied

**Error**: `PERMISSION_DENIED` in Firestore operations

**Solution**:
1. Check Firestore security rules allow test user
2. Verify test user is owner or staff member of test business:
   - Owner: `businesses/{businessId}` where `owner.userId == request.auth.uid`
   - Staff: `businesses/{businessId}/staff/{userId}` document exists
3. Test user should have read/write access to business sub-collections

### Issue: High Latency

**Symptoms**: p95 > 3s, p99 > 5s

**Solution**:
1. Check Firestore indexes are created (composite indexes for queries)
2. Verify queries aren't scanning entire collections
3. Check Firebase Hosting CDN cache
4. Review query complexity (multiple where clauses need indexes)

### Issue: CORS Errors

**Error**: CORS policy blocks requests

**Solution**:
- Firebase Hosting may block direct k6 requests
- Use hosted URL (`madas-store.web.app`) not localhost
- Or use Firestore REST API directly (bypasses CORS)

## Test Business Setup

To create test businesses for load testing:

1. **Via Dashboard UI**:
   - Log in as super admin or owner
   - Create new business
   - Note the business ID from URL or Firestore Console

2. **Via Firestore Console**:
   - Go to Firestore Console
   - Create document in `businesses` collection
   - Add test user as owner or staff:
     - Owner: `owner.userId = test-user-uid`
     - Staff: Create document in `businesses/{businessId}/staff/{userId}`

3. **Add Business ID to `.env`**:
   ```bash
   TENANT_IDS=your-business-id-1,your-business-id-2
   ```

## Next Steps

After successful first test:

1. **Scale Gradually**
   ```bash
   # Test with different user counts
   K6_VUS=100 k6 run --duration 5m src/tests/dashboard-test.ts
   K6_VUS=500 k6 run --duration 10m src/tests/dashboard-test.ts
   ```

2. **Run Specialized Tests**
   ```bash
   npm run test:stress      # Find capacity limits
   npm run test:soak        # Test stability over time
   npm run test:read-heavy  # Test read operations
   ```

3. **Monitor Costs**
   - Watch Firebase Console during tests
   - 1k users, 10 min ≈ $0.04
   - Clean up test data after tests

## Quick Commands Reference

```bash
# Dashboard-specific test (recommended for MADAS)
npm run test:dashboard-madas

# Generic dashboard test
npm run test:dashboard

# Small test (10 users, 1 min)
K6_VUS=10 k6 run --duration 1m src/tests/dashboard-test.ts

# Custom test
K6_VUS=500 DURATION=30m k6 run src/tests/dashboard-test.ts

# Check TypeScript
npm run typecheck
```

## Cost Estimation

**1k users, 10-minute test**:
- Firestore Reads: ~50k = $0.03
- Firestore Writes: ~5k = $0.009
- **Total: ~$0.04**

**10k spike test**:
- Firestore Reads: ~500k = $0.30
- Firestore Writes: ~50k = $0.09
- **Total: ~$0.40**

## Safety Checklist

Before running tests:

- [ ] **Environment**: `ENV=staging` (not prod)
- [ ] **Businesses**: Using test business IDs only
- [ ] **User**: Test user has access to test businesses
- [ ] **Monitoring**: Firebase Console open
- [ ] **Small Test**: Ran 10 users test first successfully
- [ ] **Backup**: Have plan if test affects staging

---

For detailed documentation, see:
- `DASHBOARD_TESTING.md` - MADAS Dashboard-specific guide
- `README.md` - General load testing documentation
- `QUICK_START.md` - Generic quick start

**Ready to test?** Start with Step 1! 🚀


