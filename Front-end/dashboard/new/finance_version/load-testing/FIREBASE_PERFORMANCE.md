# Firebase Performance Monitoring Integration

This load testing suite includes Firebase Performance Monitoring integration to track performance metrics during load tests.

## Overview

Firebase Performance Monitoring is primarily designed for client-side applications, but we've integrated it with k6 load testing to:

1. **Track Performance Metrics**: Send custom traces and metrics to Firebase Performance Monitoring
2. **Compare Results**: Compare k6 load test results with Firebase Performance Monitoring console
3. **Monitor Real-Time**: Monitor performance in Firebase Console during load tests

## Integration Features

### 1. Performance Trace Tracking

The suite automatically tracks:
- **Page Loads**: Dashboard pages (`/`, `/orders`, `/finance/overview`)
- **Network Requests**: HTTP request performance
- **Firestore Queries**: Database query performance
- **Authentication**: Auth flow performance
- **Custom Traces**: Any custom performance traces

### 2. Metrics Integration

k6 metrics are automatically sent to Firebase Performance Monitoring format:
- **Latency Metrics**: p50, p95, p99 percentiles
- **Throughput**: Requests per second
- **Error Rates**: Failure rates
- **Custom Metrics**: Business-specific metrics

## Usage

### Automatic Integration

Performance tracking is **automatic** - no additional code needed. The metrics utilities automatically send data to Firebase Performance Monitoring when you use:

```typescript
import { recordDashboardLoad, recordApiRequest } from '../utils/metrics';

// Automatically tracked
recordDashboardLoad(duration, { page: 'dashboard' });
recordApiRequest(duration, { url: '/api/orders', method: 'GET' });
```

### Manual Performance Tracking

You can also manually track custom performance traces:

```typescript
import { trackCustomTrace, trackPageLoad, trackFirestoreQuery } from '../utils/performance';

// Track custom trace
trackCustomTrace('my_custom_operation', durationMs, {
  operation_type: 'data_processing',
  record_count: '1000',
});

// Track page load
trackPageLoad('/dashboard', loadTimeMs);

// Track Firestore query
trackFirestoreQuery('orders', queryTimeMs, 'read');
```

## Viewing Performance Data

### Firebase Performance Monitoring Console

1. **Open Firebase Console**:
   ```
   https://console.firebase.google.com/project/madas-store/performance
   ```

2. **View Traces**:
   - Custom traces from load tests
   - Page load traces
   - Network request traces

3. **Compare Metrics**:
   - Compare k6 test results with Firebase Performance Monitoring data
   - Identify performance bottlenecks
   - Track performance trends

### k6 Metrics

Firebase Performance Monitoring metrics are also available in k6 output:

```
firebase_performance_traces: avg=250ms, p95=500ms, p99=800ms
```

## Configuration

### Environment Variables

No additional configuration needed - uses existing Firebase config:

```bash
FIREBASE_PROJECT_ID=madas-store
```

### Firebase Performance Monitoring Setup

1. **Enable Performance Monitoring** in Firebase Console:
   - Go to Firebase Console → Performance
   - Ensure Performance Monitoring is enabled
   - Check collection settings

2. **Service Account** (optional, for REST API):
   - If you want to send traces via REST API
   - Create service account with Performance Monitoring permissions
   - Add credentials to `.env`:

```bash
FIREBASE_PERF_SERVICE_ACCOUNT=/path/to/service-account.json
```

## Metrics Available

### Automatic Metrics

- `firebase_performance_traces`: All performance traces
- `firebase_performance_errors`: Errors sending traces

### Custom Metrics Tracked

- **Page Loads**: `page_load_*`
- **Network Requests**: `network_*`
- **Firestore Queries**: `firestore_*`
- **Authentication**: `auth_*`
- **Dashboard**: `dashboard_load`
- **Custom Traces**: Any custom trace names

## Example Usage in Test

```typescript
import { Options } from 'k6/options';
import { trackPageLoad, trackCustomTrace } from '../utils/performance';

export default function () {
  const startTime = Date.now();
  
  // Load dashboard page
  const response = http.get(baseUrl);
  
  const duration = Date.now() - startTime;
  
  // Automatically tracked via metrics utility
  // OR manually:
  trackPageLoad('/', duration);
  
  // Track custom operation
  trackCustomTrace('dashboard_data_fetch', fetchTime, {
    component_count: '5',
    data_size: '50kb',
  });
}
```

## Integration Status

### ✅ Implemented

- Performance trace tracking
- Automatic metric integration
- Page load tracking
- Network request tracking
- Firestore query tracking
- Custom trace support

### ⚠️ Partial Implementation

- **REST API Integration**: Currently logs traces (placeholder for actual REST API)
- **Service Account Auth**: Not implemented (would require service account setup)

### 🔄 Future Enhancements

1. **Full REST API Integration**:
   - Send traces directly to Firebase Performance Monitoring REST API
   - Requires service account setup

2. **Real-Time Dashboard**:
   - Live sync between k6 and Firebase Performance Monitoring
   - Real-time performance comparison

3. **Automatic Alerts**:
   - Set up Firebase Performance Monitoring alerts
   - Trigger on performance degradation

## Monitoring During Load Tests

### During Test

1. **Open Firebase Performance Monitoring Console**:
   ```
   https://console.firebase.google.com/project/madas-store/performance
   ```

2. **Watch Traces**:
   - Custom traces from load tests appear in real-time
   - Filter by trace name (e.g., `page_load_dashboard`)
   - View duration distributions

3. **Compare with k6 Output**:
   - Compare Firebase Performance Monitoring metrics with k6 metrics
   - Identify discrepancies
   - Validate test accuracy

### After Test

1. **Review Performance Data**:
   - Analyze trace distributions
   - Identify slow operations
   - Compare before/after load test

2. **Export Data**:
   - Export Firebase Performance Monitoring data
   - Compare with k6 results
   - Generate performance reports

## Troubleshooting

### No Traces Appearing

- **Check Firebase Console**: Ensure Performance Monitoring is enabled
- **Verify Project ID**: Check `FIREBASE_PROJECT_ID` in `.env`
- **Check Logs**: Look for `[FIREBASE_PERF]` or `[PERFORMANCE]` logs in k6 output

### Traces Not Sent via REST API

- **Current Behavior**: Traces are logged but not sent via REST API
- **To Enable**: Set up service account and implement REST API integration
- **Workaround**: Use Firebase Performance Monitoring client-side SDK in actual app

## Best Practices

1. **Use Consistent Trace Names**: Follow naming conventions (e.g., `page_load_*`, `firestore_*`)

2. **Add Meaningful Attributes**: Include relevant metadata in trace attributes

3. **Monitor During Tests**: Watch Firebase Performance Monitoring console during load tests

4. **Compare Metrics**: Always compare k6 metrics with Firebase Performance Monitoring data

5. **Set Baselines**: Establish performance baselines before load tests

---

**Firebase Performance Monitoring Console**: https://console.firebase.google.com/project/madas-store/performance

