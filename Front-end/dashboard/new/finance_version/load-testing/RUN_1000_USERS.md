# Run Traffic Test with 1000 Users

Quick guide to run a traffic test with ramp-up to 1000 concurrent users.

## Quick Start

```bash
cd ~/madas-load-test
npm run test:traffic:1000
```

This will:
- **Ramp up** to **1000 concurrent users** over **10 minutes**
- **Hold** at **1000 users** for **30 minutes**
- **Ramp down** over **10 minutes**
- **Total duration: ~50 minutes**

---

## Custom Configuration

### Adjust Ramp-Up Time

```bash
# Fast ramp-up (5 minutes)
TARGET_USERS=1000 DURATION=30m RAMP_DURATION=5m npm run test:traffic

# Slow ramp-up (15 minutes)
TARGET_USERS=1000 DURATION=30m RAMP_DURATION=15m npm run test:traffic
```

### Adjust Duration

```bash
# Short test (15 minutes hold)
TARGET_USERS=1000 DURATION=15m RAMP_DURATION=10m npm run test:traffic

# Long test (60 minutes hold)
TARGET_USERS=1000 DURATION=60m RAMP_DURATION=10m npm run test:traffic
```

---

## What Happens

### Load Profile

```
Time    | Users  | Description
--------|--------|------------
0-10m   | 0→1000 | Ramp up (gradual increase)
10-40m  | 1000   | Steady state (full load)
40-50m  | 1000→0 | Ramp down (gradual decrease)
```

### Traffic Generated

The test simulates real user behavior:
- **30%** Dashboard Home page loads
- **20%** Orders page loads
- **20%** Finance Overview page loads
- **20%** Firestore Orders queries
- **10%** Firestore Transactions queries

### Expected Load

With 1000 concurrent users:
- **~200-300 requests per second** (RPS)
- **~10,000-15,000 requests per minute**
- **~300,000-450,000 requests per hour** (during steady state)

---

## Monitor During Test

### 1. Terminal Output

Watch the k6 output for:
- Current virtual users (VUs)
- Requests per second (RPS)
- Response times (p95, p99)
- Error rates

### 2. Firebase Console

Monitor your Firebase resources:

**Firestore**:
```
https://console.firebase.google.com/project/madas-store/firestore
```

**Hosting**:
```
https://console.firebase.google.com/project/madas-store/hosting
```

**Analytics**:
```
https://console.firebase.google.com/project/madas-store/analytics
```

### 3. Performance Monitoring

```
https://console.firebase.google.com/project/madas-store/performance
```

---

## Important Notes

### ⚠️ High Load Warning

**1000 concurrent users is HIGH load**. Make sure:

1. **Firebase Quotas**: Check your Firebase plan limits
   - Firestore: Read/Write quotas
   - Hosting: Bandwidth limits
   - Auth: API call limits

2. **Billing**: High traffic may incur costs
   - Monitor Firebase Console billing
   - Set up budget alerts

3. **System Resources**: Ensure your infrastructure can handle it

### 💡 Best Practices

1. **Start Smaller**: Test with 100 users first
2. **Monitor Closely**: Watch for errors and performance issues
3. **Gradual Increase**: Don't jump straight to 1000 users
4. **Stop if Issues**: Press `Ctrl+C` if you see problems

---

## Stop the Test

To stop the traffic generator:

1. Press `Ctrl+C` in the terminal
2. k6 will gracefully stop all virtual users
3. Final metrics summary will be displayed

---

## Example Output

```
running (15m23.1s), 1000/1000 VUs, 45000 complete and 0 interrupted iterations
default   [  51% ] 1000/1000 VUs  15m23.0s/30m00.0s

     ✓ dashboard home status
     ✓ orders page status
     ✓ finance overview status
     ✓ firestore query status

     checks.........................: 99.95% ✓ 135000 ✗ 67
     data_received..................: 2.1 GB  230 kB/s
     data_sent......................: 45 MB   490 B/s
     http_req_duration..............: avg=245ms min=120ms med=230ms max=1200ms p(95)=450ms p(99)=680ms
     http_reqs......................: 450000 total
     iteration_duration.............: avg=2.5s min=1.2s med=2.3s max=6.8s
     iterations.....................: 45000 total
     vus............................: 1000 current users
     vus_max........................: 1000 max users
```

---

## Troubleshooting

### High Error Rates

If you see >5% errors:
1. Reduce `TARGET_USERS`
2. Increase `RAMP_DURATION` for gradual ramp-up
3. Check Firebase quotas
4. Check network connectivity

### Slow Responses

If response times are high:
1. Check Firestore indexes
2. Review query performance
3. Monitor Firebase Console for throttling
4. Check CDN/hosting performance

### Authentication Errors

If auth fails:
1. Verify `.env` file has correct credentials
2. Check `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`
3. Verify Firebase API key is correct

---

## Full Command Reference

```bash
# 1000 users (default: 10m ramp, 30m hold)
npm run test:traffic:1000

# Custom configuration
TARGET_USERS=1000 DURATION=30m RAMP_DURATION=10m npm run test:traffic

# Fast ramp (5 minutes)
TARGET_USERS=1000 DURATION=30m RAMP_DURATION=5m npm run test:traffic

# Extended test (60 minutes)
TARGET_USERS=1000 DURATION=60m RAMP_DURATION=10m npm run test:traffic
```

---

**Start Test**: `npm run test:traffic:1000`
**Stop Test**: Press `Ctrl+C`

**Firebase Console**: https://console.firebase.google.com/project/madas-store/overview

