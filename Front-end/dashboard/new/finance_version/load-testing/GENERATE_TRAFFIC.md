# Generate Traffic on MADAS Dashboard

Quick guide to generate traffic on your system for testing and monitoring.

## Quick Start

### Default Traffic (50 users, 30 minutes)

```bash
cd ~/madas-load-test
npm run test:traffic
```

This will:
- Ramp up to **50 concurrent users** over 5 minutes
- Hold at **50 users** for **30 minutes**
- Ramp down over 5 minutes
- **Total duration: ~40 minutes**

---

## Traffic Levels

### Low Traffic (20 users, 15 minutes)

```bash
npm run test:traffic:low
```

- **20 concurrent users**
- **15 minutes** steady state
- Good for light monitoring and baseline testing

### Medium Traffic (100 users, 30 minutes)

```bash
npm run test:traffic:medium
```

- **100 concurrent users**
- **30 minutes** steady state
- Good for normal load testing

### High Traffic (500 users, 30 minutes)

```bash
npm run test:traffic:high
```

- **500 concurrent users**
- **30 minutes** steady state
- Good for stress testing and capacity planning

---

## Custom Traffic

### Custom User Count and Duration

```bash
cd ~/madas-load-test
TARGET_USERS=200 DURATION=60m k6 run --config k6.config.ts src/tests/traffic-generator.ts
```

**Parameters**:
- `TARGET_USERS`: Number of concurrent users (default: 50)
- `DURATION`: Duration to hold steady (default: 30m)
- `RAMP_DURATION`: Time to ramp up/down (default: 5m)

**Examples**:

```bash
# 10 users for 1 hour
TARGET_USERS=10 DURATION=60m k6 run --config k6.config.ts src/tests/traffic-generator.ts

# 1000 users for 15 minutes
TARGET_USERS=1000 DURATION=15m k6 run --config k6.config.ts src/tests/traffic-generator.ts

# 50 users with fast ramp (2 minutes)
TARGET_USERS=50 DURATION=30m RAMP_DURATION=2m k6 run --config k6.config.ts src/tests/traffic-generator.ts
```

---

## What Traffic is Generated?

The traffic generator simulates real user behavior by:

1. **Dashboard Home** (30% of requests)
   - Loads the main dashboard page
   - Tests page rendering and initial load

2. **Orders Page** (20% of requests)
   - Loads the orders management page
   - Tests orders data fetching

3. **Finance Overview** (20% of requests)
   - Loads the finance overview page
   - Tests financial data aggregation

4. **Firestore Orders Query** (20% of requests)
   - Queries the orders collection
   - Tests database read performance

5. **Firestore Transactions Query** (10% of requests)
   - Queries the transactions collection
   - Tests database query performance

**User Behavior**:
- Random delays between requests (1-5 seconds)
- Simulates realistic browsing patterns
- Uses authenticated requests with tokens

---

## Monitor Traffic

### Firebase Console

While traffic is running, monitor in real-time:

1. **Firebase Performance Console**:
   ```
   https://console.firebase.google.com/project/madas-store/performance
   ```

2. **Firebase Console**:
   ```
   https://console.firebase.google.com/project/madas-store/overview
   ```

3. **Firestore Usage**:
   ```
   https://console.firebase.google.com/project/madas-store/firestore
   ```

### k6 Metrics

The test will output real-time metrics:
- Requests per second (RPS)
- Response times (p95, p99)
- Error rates
- HTTP status codes

**Example output**:
```
     http_req_duration........: avg=245.5ms min=120ms med=230ms max=1200ms p(95)=450ms p(99)=680ms
     http_reqs................: 15234 total
     iteration_duration.......: avg=2.5s min=1.2s med=2.3s max=6.8s
     iterations................: 1234 total
     vus........................: 50 current users
```

---

## Stop Traffic Generation

To stop the traffic generator:

1. Press `Ctrl+C` in the terminal
2. k6 will gracefully stop all virtual users
3. Final metrics summary will be displayed

---

## Use Cases

### 1. Monitor System Performance

Generate steady traffic to monitor:
- Response times under load
- Error rates
- Database query performance
- Resource utilization

```bash
# Run for 1 hour with moderate load
TARGET_USERS=50 DURATION=60m npm run test:traffic
```

### 2. Test Firebase Performance Monitoring

Generate traffic to populate Firebase Performance Console:

```bash
# Generate traffic for 30 minutes
npm run test:traffic

# Then check:
# https://console.firebase.google.com/project/madas-store/performance
```

### 3. Capacity Testing

Test system capacity with increasing load:

```bash
# Start with low traffic
npm run test:traffic:low

# Then increase
npm run test:traffic:medium

# Then high
npm run test:traffic:high
```

### 4. Long-Running Soak Test

Generate traffic for extended periods to test stability:

```bash
# Run for 4 hours
TARGET_USERS=50 DURATION=240m npm run test:traffic
```

---

## Tips

### 1. Start Small

Begin with low traffic and gradually increase:
```bash
# Step 1: Low traffic
npm run test:traffic:low

# Step 2: Medium traffic
npm run test:traffic:medium

# Step 3: High traffic
npm run test:traffic:high
```

### 2. Monitor Resources

While generating traffic, monitor:
- Firebase quotas (Firestore reads/writes)
- Hosting bandwidth
- Error rates
- Response times

### 3. Adjust Based on Results

If you see high error rates or slow responses:
- Reduce `TARGET_USERS`
- Increase `RAMP_DURATION` for gradual ramp-up
- Check Firebase quotas

### 4. Schedule Traffic Generation

Run traffic generation during off-peak hours for testing:
```bash
# Example: Schedule for 2 AM
# (Using cron or task scheduler)
0 2 * * * cd ~/madas-load-test && npm run test:traffic:low
```

---

## Troubleshooting

### High Error Rates

If you see high error rates (>5%):
1. Reduce `TARGET_USERS`
2. Increase delays between requests
3. Check Firebase quotas
4. Verify authentication tokens are valid

### Slow Responses

If responses are slow:
1. Check Firestore indexes
2. Review query performance
3. Check network connectivity
4. Monitor Firebase Console for throttling

### Authentication Errors

If authentication fails:
1. Verify `.env` file has correct credentials
2. Check `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`
3. Verify Firebase API key is correct

---

## Environment Variables

Ensure `.env` file contains:

```bash
BASE_URL=https://madas-store.web.app
FIREBASE_API_KEY=your_api_key
FIREBASE_PROJECT_ID=madas-store
TEST_USER_EMAIL=hesainyt@gmail.com
TEST_USER_PASSWORD=12341234
```

---

## Quick Reference

| Command | Users | Duration | Use Case |
|---------|-------|----------|----------|
| `npm run test:traffic` | 50 | 30m | Default testing |
| `npm run test:traffic:low` | 20 | 15m | Light testing |
| `npm run test:traffic:medium` | 100 | 30m | Normal load |
| `npm run test:traffic:high` | 500 | 30m | Stress test |

---

**Performance Console**: https://console.firebase.google.com/project/madas-store/performance

