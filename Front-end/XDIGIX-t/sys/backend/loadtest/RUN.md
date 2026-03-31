# Load Testing — Run Guide

## Prerequisites

1. **k6** installed: `brew install k6` (macOS) or see https://k6.io/docs/getting-started/installation/
2. **MongoDB** running with test data seeded
3. **Server** running locally or on staging

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BASE_URL` | No | `http://localhost:3000` | Target server URL |
| `TENANT_ID` | No | `loadtest-tenant` | Test tenant ID |
| `BUSINESS_ID` | No | `loadtest-business` | Test business ID |
| `AUTH_TOKEN` | For admin tests | _(empty)_ | JWT for merchant endpoints |
| `ADMIN_TOKEN` | For admin tests | _(empty)_ | JWT for admin endpoints |
| `MONGODB_URI` | For seeding | _(empty)_ | MongoDB connection string |
| `SEED_COUNT` | For seeding | `1` | Data volume multiplier (1-10) |

## Step 1: Seed Test Data

```bash
cd sys/backend
MONGODB_URI="mongodb://localhost:27017/xdigix" npx tsx loadtest/seed.ts
```

For larger datasets:
```bash
MONGODB_URI="mongodb://localhost:27017/xdigix" SEED_COUNT=5 npx tsx loadtest/seed.ts
```

## Step 2: Start the Server

```bash
cd sys/backend
npm run dev
```

## Step 3: Run Load Tests

### Storefront (customer traffic)
```bash
k6 run loadtest/scenarios/storefront.js
```

### Admin (reporting + dashboard)
```bash
k6 run --env ADMIN_TOKEN=your-jwt-here loadtest/scenarios/admin.js
```

### Checkout burst (flash sale)
```bash
k6 run loadtest/scenarios/checkout-burst.js
```

### Mixed traffic (realistic blend)
```bash
k6 run loadtest/scenarios/mixed.js
```

### Concurrency safety
```bash
k6 run loadtest/scenarios/concurrency.js
```

## Step 4: Interpret Results

### Key Metrics
- `http_req_duration` — request latency (target: p95 < 500ms)
- `http_req_failed` — error rate (target: < 1%)
- `checkout_success_rate` — checkout success (target: > 95%)
- `checkout_duration_ms` — checkout latency (target: p95 < 3s)
- `dashboard_duration_ms` — dashboard latency (target: p95 < 5s)

### Pass/Fail
k6 reports threshold pass/fail at the end. Green ✓ = threshold met.

### JSON Output
Save results for comparison:
```bash
k6 run --out json=results.json loadtest/scenarios/storefront.js
```

## Staging Run

Replace `BASE_URL` with your staging URL:
```bash
k6 run --env BASE_URL=https://staging.xdigix.com loadtest/scenarios/mixed.js
```

## Performance Logging

Set `PERF_LOG_ALL=true` on the server to log every request duration:
```bash
PERF_LOG_ALL=true npm run dev
```

Slow requests (>1s) are always logged regardless of this flag.

## Threshold Targets (not achieved results)

| Metric | Target | Notes |
|--------|--------|-------|
| p95 latency | < 500ms | API endpoints |
| p99 latency | < 2000ms | Under load |
| Error rate | < 1% | Steady state |
| Checkout p95 | < 3000ms | Including DB + reservation |
| Dashboard p95 | < 5000ms | 7 parallel aggregations |
| Checkout success | > 95% | Normal traffic |
| Burst checkout | > 90% | Flash sale pattern |
| Health check | > 99% | Under load |
