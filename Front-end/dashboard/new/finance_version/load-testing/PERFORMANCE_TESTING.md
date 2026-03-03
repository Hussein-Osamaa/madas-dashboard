# Performance Testing Guide for MADAS Dashboard

This guide covers comprehensive performance testing for the MADAS Dashboard system.

## Performance Test Suites

### 1. Performance Baseline Test

**Purpose**: Establish baseline performance metrics under normal load.

**Usage**:
```bash
cd ~/madas-load-test
npm run test:performance-baseline
```

**What it tests**:
- Dashboard home page (low load: 10 users)
- Orders page
- Finance overview page
- Firestore queries

**Duration**: 7 minutes (1m ramp, 5m hold, 1m ramp-down)

**When to run**:
- Before major releases
- After infrastructure changes
- To establish baseline metrics

**Output**: Baseline latency metrics for comparison

---

### 2. Performance Test (Comprehensive)

**Purpose**: Comprehensive performance testing across all critical paths.

**Usage**:
```bash
cd ~/madas-load-test
npm run test:performance
```

**What it tests**:
- Page load performance (Dashboard, Orders, Finance)
- API response times
- Firestore query performance
- Authentication performance
- Performance SLA compliance

**Load Profile**:
- Stage 1: 50 users (2m ramp, 5m hold)
- Stage 2: 100 users (2m ramp, 5m hold)
- Stage 3: 200 users (2m ramp, 5m hold)
- Total: ~26 minutes

**Performance Metrics Tracked**:
- Page load time: p95, p99
- API response time: p95, p99
- Firestore query time: p95, p99
- Authentication time: p95, p99
- SLA compliance rate

**When to run**:
- Regular performance validation
- Before production releases
- After performance optimizations

---

### 3. Performance SLA Validation Test

**Purpose**: Validate system meets defined Performance Service Level Agreements (SLAs).

**Usage**:
```bash
cd ~/madas-load-test
npm run test:performance-sla
```

**SLA Targets**:

| Metric | p95 Target | p99 Target |
|--------|------------|------------|
| Page Loads | < 1.5s | < 2.5s |
| API Responses | < 1s | < 1.5s |
| Firestore Queries | < 800ms | < 1.2s |
| Authentication | < 500ms | < 800ms |
| Error Rate | < 1% | - |
| SLA Compliance | > 95% | - |

**Load Profile**:
- 100 concurrent users
- 14 minutes total (2m ramp, 10m hold, 2m ramp-down)

**When to run**:
- Before production deployments
- Weekly/monthly SLA validation
- After performance-related changes

---

## Running Performance Tests

### Step 1: Establish Baseline

```bash
cd ~/madas-load-test
npm run test:performance-baseline
```

**Save baseline results** for comparison:
- p95/p99 latencies
- Error rates
- Throughput metrics

### Step 2: Run Comprehensive Performance Test

```bash
cd ~/madas-load-test
npm run test:performance
```

**Review results**:
- Compare with baseline
- Identify performance regressions
- Note any bottlenecks

### Step 3: Validate SLA Compliance

```bash
cd ~/madas-load-test
npm run test:performance-sla
```

**Verify**:
- All SLA thresholds are met
- Performance is within acceptable ranges
- No critical issues identified

---

## Performance Test Scenarios

### Scenario 1: Page Load Performance

Tests how fast pages load for users:

```bash
# Tests:
- Dashboard home (/)
- Orders page (/orders)
- Finance overview (/finance/overview)

# Metrics:
- Time to First Byte (TTFB)
- Page Load Time
- Time to Interactive
```

### Scenario 2: API Response Performance

Tests API endpoint performance:

```bash
# Tests:
- Authentication endpoints
- Data fetching endpoints
- Firestore REST API queries

# Metrics:
- Response time (p95, p99)
- Request rate
- Error rate
```

### Scenario 3: Firestore Query Performance

Tests database query performance:

```bash
# Tests:
- Orders collection queries
- Transactions collection queries
- Products collection queries

# Metrics:
- Query latency (p95, p99)
- Query success rate
- Throttling detection
```

### Scenario 4: Authentication Performance

Tests auth flow performance:

```bash
# Tests:
- Firebase Auth login
- Token refresh
- Token validation

# Metrics:
- Auth latency
- Token generation time
- Auth success rate
```

---

## Interpreting Results

### Good Performance

**Baseline (10 users)**:
- Page loads: p95 < 500ms, p99 < 1s
- API calls: p95 < 300ms, p99 < 500ms
- Firestore: p95 < 200ms, p99 < 400ms

**Normal Load (100 users)**:
- Page loads: p95 < 1s, p99 < 2s
- API calls: p95 < 500ms, p99 < 1s
- Firestore: p95 < 400ms, p99 < 800ms

**High Load (200 users)**:
- Page loads: p95 < 1.5s, p99 < 2.5s
- API calls: p95 < 1s, p99 < 1.5s
- Firestore: p95 < 800ms, p99 < 1.2s

### Concerning Performance

**Warning Signs**:
- ⚠️ p95 > 2s consistently
- ⚠️ p99 > 3s frequently
- ⚠️ Error rate > 1%
- ⚠️ Firestore throttling > 0.1%

**Action Required**:
1. Review slow queries
2. Check Firestore indexes
3. Optimize page rendering
4. Review caching strategy

### Critical Performance Issues

**Critical Signs**:
- ❌ p95 > 5s
- ❌ p99 > 10s
- ❌ Error rate > 5%
- ❌ Service unavailability

**Immediate Actions**:
1. Check system resources
2. Review error logs
3. Check Firebase quotas
4. Scale infrastructure if needed

---

## Performance Optimization Checklist

### Firestore Optimization

- [ ] Add composite indexes for common queries
- [ ] Use pagination for large datasets
- [ ] Implement query result caching
- [ ] Avoid querying entire collections
- [ ] Use batch operations when possible

### Page Load Optimization

- [ ] Enable CDN caching
- [ ] Optimize JavaScript bundle size
- [ ] Lazy load components
- [ ] Use React code splitting
- [ ] Optimize images and assets

### API Optimization

- [ ] Implement response caching
- [ ] Use edge functions for static content
- [ ] Optimize data serialization
- [ ] Batch related requests
- [ ] Use HTTP/2 multiplexing

### Authentication Optimization

- [ ] Cache tokens appropriately
- [ ] Use token refresh efficiently
- [ ] Minimize auth API calls
- [ ] Implement session management

---

## Comparing with Firebase Performance Monitoring

After running k6 performance tests, compare results with Firebase Performance Monitoring:

1. **Open Firebase Performance Console**:
   ```
   https://console.firebase.google.com/project/madas-store/performance
   ```

2. **Compare Metrics**:
   - k6 `page_load_time` vs Firebase `page_load_*` traces
   - k6 `firestore_query_time` vs Firebase `firestore_*` traces
   - Look for discrepancies

3. **Identify Differences**:
   - Client-side vs server-side latency
   - Network latency impact
   - Browser rendering time

---

## Performance Test Schedule

### Recommended Testing Frequency

| Test Type | Frequency | When |
|-----------|-----------|------|
| Baseline | Monthly | After major changes |
| Comprehensive | Weekly | Regular validation |
| SLA Validation | Before releases | Pre-deployment |
| After changes | As needed | Performance-related changes |

### Pre-Production Checklist

- [ ] Baseline test passed
- [ ] Performance test passed (p95/p99 within targets)
- [ ] SLA validation test passed
- [ ] Compared with Firebase Performance Monitoring
- [ ] No performance regressions identified
- [ ] Error rate < 1%
- [ ] Documentation updated with new baselines

---

## Customizing Performance Tests

### Adjust Load Profiles

Edit test files to customize load:

```typescript
// Example: Custom load profile
stages: [
  { duration: '5m', target: 50 },
  { duration: '10m', target: 100 },
  { duration: '5m', target: 200 },
  { duration: '10m', target: 200 },
  { duration: '5m', target: 0 },
],
```

### Adjust SLA Targets

Edit thresholds in test files:

```typescript
thresholds: {
  'page_load_latency': ['p(95)<2000', 'p(99)<3000'], // Custom targets
  // ...
}
```

### Add Custom Scenarios

Create custom performance scenarios:

```typescript
// Test specific user journey
function testCheckoutFlow(token: string) {
  // 1. Add to cart
  // 2. View cart
  // 3. Checkout
  // 4. Complete order
}
```

---

## Performance Test Reports

### Generating Reports

k6 automatically generates detailed reports with:

- **Summary Statistics**: Min, max, avg, p95, p99
- **Throughput**: Requests per second
- **Error Rates**: Failed request percentages
- **Timing Breakdown**: Request duration breakdown

### Exporting Results

```bash
# Export to JSON
k6 run --out json=results.json src/tests/performance-test.ts

# Export to CSV
k6 run --out csv=results.csv src/tests/performance-test.ts
```

### Visualizing Results

Use k6 Cloud for visual dashboards:
```bash
k6 cloud src/tests/performance-test.ts
```

---

## Quick Start

```bash
# 1. Establish baseline
npm run test:performance-baseline

# 2. Run comprehensive test
npm run test:performance

# 3. Validate SLA compliance
npm run test:performance-sla

# 4. Compare with Firebase Performance Monitoring
# Open: https://console.firebase.google.com/project/madas-store/performance
```

---

**Performance Console**: https://console.firebase.google.com/project/madas-store/performance
**Load Testing Docs**: See `README.md` for full documentation

