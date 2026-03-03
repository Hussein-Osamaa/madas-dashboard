# System Load Testing Suite

A complete, production-ready k6 load testing suite for **System**, a multi-tenant SaaS application built on Next.js, Firebase (Firestore, Auth, Cloud Functions), and hosted on Vercel or Firebase Hosting.

## Overview

This suite validates performance, capacity, multi-tenant isolation, and failure modes under realistic and extreme loads. It includes:

- ✅ Authentication and tenant switching flows
- ✅ Realistic user journeys (dashboard loads, CRUD operations)
- ✅ Specialized tests (spike, stress, soak, read-heavy, write-heavy)
- ✅ Multi-tenant isolation verification
- ✅ Firestore-safe write patterns (randomized IDs, batch writes, throttling handling)
- ✅ Custom metrics for latency, throughput, and error tracking
- ✅ Environment-based configuration (local, staging, prod)

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Running Tests](#running-tests)
5. [Test Scenarios](#test-scenarios)
6. [Interpreting Results](#interpreting-results)
7. [Scaling Recommendations](#scaling-recommendations)
8. [Cost Awareness](#cost-awareness)
9. [Safety Measures](#safety-measures)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **k6**: v0.48.0 or later
  ```bash
  # macOS
  brew install k6
  
  # Linux
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update
  sudo apt-get install k6
  
  # Windows
  winget install k6
  ```

- **Node.js**: v18+ (for test data generators)
  ```bash
  node --version  # Should be v18 or later
  ```

- **TypeScript**: Installed via npm
  ```bash
  npm install
  ```

### Environment Variables

Create a `.env` file in the `load-testing` directory (see `.env.example`):

```bash
# Environment: local | staging | prod
ENV=staging

# System Application URLs
BASE_URL=https://your-staging-app.web.app

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_project_id
FIRESTORE_URL=https://firestore.googleapis.com/v1/projects/your_project_id/databases/(default)/documents

# Test Credentials
TEST_USER_EMAIL=loadtest@your-tenant.test
TEST_USER_PASSWORD=your_test_password

# Test Tenants (comma-separated)
TENANT_IDS=tenant-id-a,tenant-id-b

# Test Users per Tenant
TEST_USERS=user1@tenant-a.test,user2@tenant-a.test,user1@tenant-b.test,user2@tenant-b.test
TEST_PASSWORDS=password1,password2,password3,password4

# Safety Flags
ALLOW_PROD_TESTS=false
DESTRUCTIVE=false
```

## Quick Start

### 1. Install Dependencies

```bash
cd load-testing
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Run First Test (1k Users Dashboard)

```bash
npm run test:dashboard
```

This runs a 25-minute test simulating 1,000 concurrent users performing dashboard reads and occasional writes, ramping up over 10 minutes.

### 4. Run Spike Test (10k Users)

```bash
npm run test:spike
```

**⚠️ Warning**: This generates significant load. Only run against staging.

## Configuration

### Environments

The suite supports three environments:

- **local**: For local development (`http://localhost:3000`)
- **staging**: For staging/testing environment
- **prod**: For production (requires `ALLOW_PROD_TESTS=true`)

Set environment via:

```bash
ENV=staging k6 run src/tests/main.ts
```

### Thresholds

Thresholds are defined in `config/thresholds.json` per environment:

- **p95/p99 latency**: Response time percentiles
- **Error rate**: Failed request rate
- **Firestore throttles**: RESOURCE_EXHAUSTED (429) rate
- **Cold starts**: Cloud Function cold start rate

Override in individual test files as needed.

### Ramp-up Stages

Default stages can be customized per test:

```typescript
stages: [
  { duration: '2m', target: 100 },  // Ramp up
  { duration: '5m', target: 100 },  // Hold
  { duration: '2m', target: 0 },    // Ramp down
]
```

## Running Tests

### Main Tests

```bash
# 1k users dashboard test (10 min ramp, 10 min hold)
npm run test:dashboard

# 10k users spike test (instant spike to 10k in 30s)
npm run test:spike
```

### Specialized Tests

```bash
# Stress test (gradual increase until failure)
npm run test:stress

# Soak test (1 hour steady load, customizable)
DURATION=4h npm run test:soak

# Read-heavy test (500 concurrent readers)
npm run test:read-heavy

# Write-heavy test (200 concurrent writers with randomized IDs)
npm run test:write-heavy

# Multi-tenant isolation test
npm run test:isolation
```

### Custom Configuration

```bash
# Override VUs and duration
K6_VUS=500 K6_DURATION=10m k6 run src/tests/main.ts

# Run with custom environment
ENV=staging BASE_URL=https://staging.app.com k6 run src/tests/main.ts
```

## Test Scenarios

### 1. Dashboard Load Test (`src/tests/main.ts`)

**Purpose**: Validate realistic user journey under sustained load

**Profile**:
- 1,000 concurrent users
- 80% reads (dashboard, lists, pagination)
- 15% creates
- 5% reads of created resources
- 10-minute ramp-up

**Use Case**: Baseline performance test, capacity planning

### 2. Spike Test (`src/tests/spike-main.ts`)

**Purpose**: Test system's ability to handle sudden traffic spikes

**Profile**:
- 10,000 concurrent users
- Instant ramp-up (30 seconds)
- Primarily dashboard loads
- Hold for 2 minutes

**Use Case**: Black Friday scenarios, viral traffic spikes

**⚠️ Warning**: High cost and load. Use with caution.

### 3. Stress Test (`src/scenarios/stress.ts`)

**Purpose**: Identify breaking points and capacity limits

**Profile**:
- Gradual increase: 100 → 500 → 1k → 2k → 3k users
- Mix of reads (80%) and writes (20%)
- Tracks throttling and errors

**Use Case**: Capacity planning, identifying bottlenecks

### 4. Soak Test (`src/scenarios/soak.ts`)

**Purpose**: Detect memory leaks and gradual degradation

**Profile**:
- 200 concurrent users
- Duration: 1-4 hours (default 1h, configurable via `DURATION`)
- Steady load with realistic mix

**Use Case**: Long-term stability validation

### 5. Read-Heavy Test (`src/scenarios/read-heavy.ts`)

**Purpose**: Test Firestore read capacity and caching

**Profile**:
- 500 concurrent readers
- Multiple collections (projects, orders, users, reports)
- Paginated lists and dashboard loads

**Use Case**: Validate read scaling, cache effectiveness

### 6. Write-Heavy Test (`src/scenarios/write-heavy.ts`)

**Purpose**: Test Firestore write capacity with safe patterns

**Profile**:
- 200 concurrent writers
- Randomized document IDs (`loadtest_{timestamp}_{uuid}`)
- Batch writes when possible
- Tracks throttling (429 responses)

**Use Case**: Validate write scaling, avoid hot-document throttling

### 7. Multi-Tenant Isolation Test (`src/scenarios/isolation.ts`)

**Purpose**: Verify tenant isolation (cross-tenant access prevention)

**Profile**:
- 10 VUs for correctness testing
- Attempts cross-tenant access
- Asserts 403 or empty results

**Use Case**: Security validation, Firestore rules verification

## Interpreting Results

### Key Metrics

#### Latency Percentiles

- **p95**: 95% of requests complete within this time
- **p99**: 99% of requests complete within this time

**Good**: p95 < 1.5s, p99 < 2.5s for dashboard loads  
**Concerning**: p95 > 3s, p99 > 5s  
**Critical**: p95 > 5s, p99 > 10s

#### Error Rate

- **Good**: < 1%
- **Acceptable**: < 5%
- **Critical**: > 10%

#### Firestore Throttles

- **Good**: < 0.1%
- **Concerning**: 0.1% - 1%
- **Critical**: > 1%

Indicates hot-document writes or exceeding Firestore quotas.

#### Cold Start Rate

- **Good**: < 10%
- **Acceptable**: < 20%
- **Concerning**: > 20%

Indicates Cloud Functions are not staying warm.

### Common Failure Signatures

#### 1. Firestore Throttling (429 RESOURCE_EXHAUSTED)

**Symptoms**:
- High `firestore_throttles` rate
- Write operations failing
- Pattern: Writes to same document repeatedly

**Solution**:
- Use randomized document IDs (already implemented)
- Implement batch writes
- Shard writes across multiple documents
- Review Firestore quotas and indexes

#### 2. High p99 Latency

**Symptoms**:
- p99 > 5s consistently
- Some requests timing out

**Solution**:
- Review Firestore indexes (add composite indexes)
- Implement pagination for large queries
- Use Firestore batch reads
- Consider caching layer (Redis, Cloud CDN)

#### 3. Elevated Error Rate

**Symptoms**:
- Error rate > 5%
- Mix of 429, 500, 503 responses

**Solution**:
- Check Cloud Functions timeouts
- Review Firestore security rules
- Verify tenant isolation
- Check Next.js API route limits

#### 4. Cold Start Issues

**Symptoms**:
- High `function_cold_starts` rate
- Sporadic high latency on function invocations

**Solution**:
- Implement Cloud Functions warmup (keep-alive ping)
- Consider moving to Cloud Run (always-on instances)
- Optimize function initialization code

## Scaling Recommendations

### Firestore Optimization

1. **Indexes**
   ```bash
   # Add composite indexes for common queries
   firebase deploy --only firestore:indexes
   ```

2. **Query Optimization**
   - Limit result sets with `.limit()`
   - Use pagination for large datasets
   - Avoid `!=` and `not-in` queries (scan entire collection)

3. **Write Optimization**
   - ✅ Use randomized document IDs (implemented)
   - ✅ Batch writes when possible (implemented)
   - Shard hot documents (e.g., `users/doc_id/shard_1`, `users/doc_id/shard_2`)
   - Use Firestore transactions sparingly

### Next.js SSR Optimization

1. **ISR (Incremental Static Regeneration)**
   - Pre-render dashboard pages
   - Revalidate on interval (e.g., 60s)

2. **API Route Optimization**
   - Implement response caching
   - Use edge functions for static content
   - Consider moving heavy logic to Cloud Functions

### Cloud Functions Optimization

1. **Warmup Strategy**
   ```javascript
   // Keep functions warm with scheduled ping
   exports.keepWarm = functions.pubsub.schedule('*/5 * * * *').onRun(async (context) => {
     // Ping your function endpoint
   });
   ```

2. **Memory/CPU Allocation**
   - Increase memory for CPU-intensive functions
   - Use `--memory 2GB` for heavy operations

3. **Concurrency**
   - Configure max concurrent instances
   - Use Cloud Run for better control

### Multi-Tenant Optimization

1. **Tenant Isolation**
   - Verify Firestore rules enforce tenant boundaries
   - Use tenant-scoped queries (already implemented)

2. **Query Patterns**
   - Always filter by `tenantId`
   - Use composite indexes on `(tenantId, field)`

## Cost Awareness

### Firestore Costs

**Reads**: $0.06 per 100k document reads  
**Writes**: $0.18 per 100k document writes  
**Deletes**: $0.02 per 100k deletes

**Example Load Test Cost** (1k users, 10 min):
- 100k reads: $0.06
- 10k writes: $0.018
- Total: ~$0.08 per test

**10k Spike Test** (10k users, 2 min):
- ~500k reads: $0.30
- ~50k writes: $0.09
- Total: ~$0.40 per test

### Cloud Functions Costs

**Invocations**: $0.40 per million  
**Compute Time**: $0.0000025 per 100ms (depends on memory)

**Example**: 1k users × 5 invocations/min × 10 min = 50k invocations = $0.02

### Hosting Bandwidth

**Vercel/Firebase Hosting**: Usually included in plan

### Cost Mitigation

1. **Use Test Tenants Only**
   - Ensure `TENANT_IDS` points to test tenants
   - Never run against production tenants

2. **Limit Test Duration**
   - Start with shorter tests (5-10 min)
   - Scale up gradually

3. **Monitor Firebase Console**
   - Watch usage during tests
   - Set up billing alerts

4. **Clean Up Test Data**
   ```bash
   npm run cleanup-data -- --tenant-id YOUR_TEST_TENANT --prefix loadtest
   ```

## Safety Measures

### Environment Protection

1. **Production Safety**
   ```bash
   # Tests default to staging
   ENV=staging npm run test:dashboard
   
   # Production requires explicit flag
   ALLOW_PROD_TESTS=true ENV=prod npm run test:dashboard
   ```

2. **Destructive Test Flag**
   ```bash
   # Tests that create/delete data require flag
   DESTRUCTIVE=true npm run test:write-heavy
   ```

### Test Tenant Isolation

- Always use test tenant IDs
- Verify `TENANT_IDS` env var before running
- Never use production tenant IDs

### Data Safety

- All writes use `loadtest_{timestamp}_{uuid}` prefix
- Easy to identify and clean up
- Never overwrite production data

## Troubleshooting

### Authentication Failures

**Error**: `Failed to authenticate test user`

**Solutions**:
1. Verify `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in `.env`
2. Check Firebase Auth console for user status
3. Ensure Firebase Auth API is enabled
4. Verify `FIREBASE_API_KEY` is correct

### Connection Timeouts

**Error**: `connection timeout` or `ETIMEDOUT`

**Solutions**:
1. Check `BASE_URL` is correct and accessible
2. Verify firewall/network allows k6 traffic
3. Check Vercel/Firebase Hosting status
4. Increase timeout in k6 options if needed

### Firestore Permission Denied

**Error**: `PERMISSION_DENIED` or `403 Forbidden`

**Solutions**:
1. Verify Firestore security rules allow test tenant access
2. Check token is valid and includes correct claims
3. Ensure `tenantId` is correctly set in headers/query
4. Review Firestore rules in Firebase Console

### High Memory Usage

**Error**: k6 process using excessive memory

**Solutions**:
1. Reduce `vus` (virtual users) count
2. Reduce test duration
3. Use k6 cloud for distributed load
4. Check for memory leaks in test code

### Inconsistent Results

**Symptoms**: Results vary significantly between runs

**Solutions**:
1. Ensure consistent environment (no background processes)
2. Use k6 cloud for consistent infrastructure
3. Increase test duration for more stable averages
4. Check for external factors (network, Firebase quotas)

## Test Data Generation

### Generate Test Data

```bash
npm run generate-data -- --tenant-id YOUR_TENANT_ID --count 100
```

This creates a JSON file with test data metadata in `data/test-data-{tenantId}.json`.

**Note**: This generates metadata only. You'll need to actually create resources via your API or Admin SDK.

### Load Test Data into System

1. **Via API** (recommended for load testing)
   - Use the test data JSON to create resources via your API endpoints
   - Use the create scenarios in this suite

2. **Via Firebase Admin SDK**
   ```javascript
   const admin = require('firebase-admin');
   const testData = require('./data/test-data-tenant.json');
   
   admin.initializeApp();
   const db = admin.firestore();
   
   // Load projects
   for (const project of testData.projects) {
     await db.collection('projects').doc(project.id).set(project);
   }
   ```

### Clean Up Test Data

```bash
npm run cleanup-data -- --tenant-id YOUR_TENANT_ID --prefix loadtest
```

This generates a cleanup script in `data/cleanup-{tenantId}.ts`. Edit and run with Firebase Admin SDK.

**⚠️ Warning**: Cleanup will delete data. Double-check tenant ID.

## Customization

### Adding New Scenarios

1. Create scenario in `src/scenarios/your-scenario.ts`:

```typescript
import { Options } from 'k6/options';
import { authenticate } from '../utils/auth';
import { dashboardLoadScenario } from './dashboard';

export const options: Options = {
  stages: [
    { duration: '5m', target: 100 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
  },
};

export function setup() {
  const token = authenticate('user@test.com', 'password');
  return { token };
}

export default function (data: { token: string }) {
  dashboardLoadScenario(data.token);
}
```

2. Run with:
```bash
k6 run src/scenarios/your-scenario.ts
```

### Custom Metrics

Add custom metrics in `src/utils/metrics.ts`:

```typescript
export const myCustomMetric = new Trend('my_custom_metric', true);
```

Use in scenarios:
```typescript
import { myCustomMetric } from '../utils/metrics';

myCustomMetric.add(duration);
```

## Quick Reference

### First End-to-End Test Checklist

- [ ] **1. Install k6** (`brew install k6` or equivalent)
- [ ] **2. Install dependencies** (`npm install`)
- [ ] **3. Configure `.env`** (copy from `.env.example`, fill in values)
- [ ] **4. Verify test credentials** (test user can log in via browser)
- [ ] **5. Run small test first** (`ENV=staging K6_VUS=10 K6_DURATION=1m k6 run src/tests/main.ts`)
- [ ] **6. Review results** (check p95/p99, error rate, throttles)
- [ ] **7. Scale up gradually** (increase VUs and duration)
- [ ] **8. Monitor Firebase Console** (watch usage and costs)

### Common Commands

```bash
# Run dashboard test
npm run test:dashboard

# Run spike test
npm run test:spike

# Run with custom config
K6_VUS=500 DURATION=30m k6 run src/tests/main.ts

# Generate test data
npm run generate-data -- --tenant-id tenant-123 --count 100

# Type check
npm run typecheck
```

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review k6 documentation: https://k6.io/docs/
3. Check Firebase quotas: https://firebase.google.com/docs/firestore/quotas
4. Review System's API documentation for endpoint details

## License

This load testing suite is part of the System project and follows the same license.

---

**Remember**: Always start small and scale up. Monitor costs and Firebase quotas. Use test tenants only. Happy load testing! 🚀


