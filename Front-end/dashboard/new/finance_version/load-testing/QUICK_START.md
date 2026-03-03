# Quick Start Checklist

## 5-Step Setup for First End-to-End Test

### ✅ Step 1: Install Prerequisites

```bash
# Install k6
brew install k6  # macOS
# or see README.md for Linux/Windows

# Verify installation
k6 version

# Install Node.js dependencies
cd load-testing
npm install
```

### ✅ Step 2: Configure Environment

Create `.env` file in `load-testing/` directory:

```bash
# Copy example (if it exists) or create new
cat > .env << EOF
ENV=staging
BASE_URL=https://your-staging-app.web.app
FIREBASE_API_KEY=your_api_key
FIREBASE_PROJECT_ID=your_project_id
FIRESTORE_URL=https://firestore.googleapis.com/v1/projects/your_project_id/databases/(default)/documents
TEST_USER_EMAIL=loadtest@your-tenant.test
TEST_USER_PASSWORD=your_test_password
TENANT_IDS=tenant-id-a,tenant-id-b
TEST_USERS=user1@tenant-a.test,user2@tenant-a.test
TEST_PASSWORDS=password1,password2
ALLOW_PROD_TESTS=false
DESTRUCTIVE=false
EOF
```

**⚠️ Important**: Replace all placeholders with actual values.

### ✅ Step 3: Verify Test Credentials

```bash
# Verify test user can log in (manually or via script)
# Open browser and test login with TEST_USER_EMAIL and TEST_USER_PASSWORD
```

### ✅ Step 4: Run Small Test First

```bash
# Start with 10 users for 1 minute to verify setup
ENV=staging K6_VUS=10 k6 run --duration 1m src/tests/main.ts
```

**Check**:
- ✅ No authentication errors
- ✅ p95/p99 latency reasonable (< 5s)
- ✅ Error rate < 5%

### ✅ Step 5: Run Full Dashboard Test

```bash
# Run 1k users dashboard test (25 minutes)
npm run test:dashboard
```

**Monitor**:
- Firebase Console → Usage
- Firebase Console → Firestore → Quotas
- k6 output for thresholds

---

## First Test Safety Checklist

- [ ] **Environment**: Running against `staging` (not `prod`)
- [ ] **Tenants**: Using test tenant IDs only
- [ ] **Credentials**: Test user credentials are correct
- [ ] **Firebase**: API key and project ID are correct
- [ ] **Monitoring**: Firebase Console open to watch usage
- [ ] **Small Test**: Ran 10 users test first successfully
- [ ] **Backup**: Have backup plan if test affects staging

## Troubleshooting

### Authentication Fails
→ Check `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in `.env`  
→ Verify Firebase Auth is enabled  
→ Test login manually in browser

### Connection Timeout
→ Check `BASE_URL` is correct and accessible  
→ Verify firewall allows k6 traffic  
→ Check staging app is running

### Permission Denied
→ Check Firestore security rules allow test tenant  
→ Verify token is valid  
→ Check `TENANT_IDS` is set correctly

### High Costs
→ Start with smaller tests (10-100 users)  
→ Reduce test duration  
→ Monitor Firebase Console during test  
→ Use test tenants only

---

## Next Steps

After successful first test:

1. **Scale Gradually**
   - 10 users → 100 users → 500 users → 1k users
   - Monitor results at each step

2. **Run Specialized Tests**
   ```bash
   npm run test:stress      # Capacity testing
   npm run test:soak        # Stability testing
   npm run test:isolation   # Security validation
   ```

3. **Generate Test Data**
   ```bash
   npm run generate-data -- --tenant-id YOUR_TENANT_ID --count 100
   ```

4. **Review README.md**
   - Full documentation
   - Advanced configuration
   - Scaling recommendations

---

## Quick Reference Commands

```bash
# Dashboard test (1k users)
npm run test:dashboard

# Spike test (10k users) - USE WITH CAUTION
npm run test:spike

# Stress test
npm run test:stress

# Soak test (1 hour)
npm run test:soak

# Read-heavy test
npm run test:read-heavy

# Write-heavy test
npm run test:write-heavy

# Isolation test
npm run test:isolation

# Custom test
K6_VUS=500 DURATION=30m k6 run src/tests/main.ts

# Generate test data
npm run generate-data -- --tenant-id TENANT_ID --count 100

# Cleanup test data
npm run cleanup-data -- --tenant-id TENANT_ID --prefix loadtest
```

---

**Remember**: Start small, monitor closely, scale gradually! 🚀

