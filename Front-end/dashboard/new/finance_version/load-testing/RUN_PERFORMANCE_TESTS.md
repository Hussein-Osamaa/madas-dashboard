# Running Performance Tests

Quick guide to run performance tests for MADAS Dashboard.

## Quick Start

```bash
cd ~/madas-load-test

# 1. Establish baseline performance (7 minutes)
npm run test:performance-baseline

# 2. Run comprehensive performance test (26 minutes)
npm run test:performance

# 3. Validate SLA compliance (14 minutes)
npm run test:performance-sla
```

## Test Details

### 1. Baseline Test (7 min)
**Purpose**: Establish baseline metrics under low load

```bash
npm run test:performance-baseline
```

- Load: 10 users
- Duration: 7 minutes
- Output: Baseline latency metrics

**Use**: Run before major changes to establish comparison baseline

---

### 2. Comprehensive Performance Test (26 min)
**Purpose**: Test performance across all critical paths

```bash
npm run test:performance
```

- Load: 50 → 100 → 200 users
- Duration: 26 minutes
- Tests:
  - Dashboard Home Page
  - Orders Page
  - Finance Overview
  - Firestore Queries
  - Authentication

**Metrics**:
- Page load time (p95, p99)
- API response time (p95, p99)
- Firestore query time (p95, p99)
- Authentication time (p95, p99)
- SLA compliance rate

---

### 3. SLA Validation Test (14 min)
**Purpose**: Validate system meets performance SLAs

```bash
npm run test:performance-sla
```

- Load: 100 users
- Duration: 14 minutes
- Validates:
  - Page loads: p95 < 1.5s, p99 < 2.5s
  - API responses: p95 < 1s, p99 < 1.5s
  - Firestore queries: p95 < 800ms, p99 < 1.2s
  - Authentication: p95 < 500ms, p99 < 800ms
  - Error rate: < 1%

**Use**: Run before production deployments

---

## Performance Targets

| Metric | p95 Target | p99 Target |
|--------|------------|------------|
| **Page Loads** | < 1.5s | < 2.5s |
| **API Responses** | < 1s | < 1.5s |
| **Firestore Queries** | < 800ms | < 1.2s |
| **Authentication** | < 500ms | < 800ms |
| **Error Rate** | < 1% | - |

---

## Environment Variables

Ensure `.env` file contains:

```bash
BASE_URL=https://madas-store.web.app
FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=madas-store
TEST_USER_EMAIL=hesainyt@gmail.com
TEST_USER_PASSWORD=12341234
```

---

## Interpreting Results

### ✅ Good Performance
- All SLA thresholds met
- p95/p99 within targets
- Error rate < 1%

### ⚠️ Warning Signs
- Some SLA thresholds exceeded occasionally
- p95 > 2s, p99 > 3s
- Error rate 1-2%

**Action**: Review slow queries, optimize pages, check caching

### ❌ Critical Issues
- Multiple SLA thresholds exceeded
- p95 > 5s, p99 > 10s
- Error rate > 5%

**Action**: Immediate investigation required

---

## Comparing with Firebase Performance Monitoring

After running tests, compare results with Firebase Console:

1. **Open Firebase Performance Console**:
   ```
   https://console.firebase.google.com/project/madas-store/performance
   ```

2. **Compare Metrics**:
   - k6 `page_load_time` vs Firebase `page_load_*` traces
   - k6 `firestore_query_time` vs Firebase `firestore_*` traces

3. **Identify Differences**:
   - Client-side vs server-side latency
   - Network impact
   - Browser rendering time

---

## Full Documentation

See `PERFORMANCE_TESTING.md` for detailed documentation.

---

**Performance Console**: https://console.firebase.google.com/project/madas-store/performance

