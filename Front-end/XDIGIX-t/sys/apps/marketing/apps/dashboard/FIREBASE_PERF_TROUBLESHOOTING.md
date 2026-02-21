# Firebase Performance Monitoring Troubleshooting

## Why Performance Data May Not Appear

### 1. Data Processing Delay ⏱️

**Most Common Reason**: Firebase Performance Monitoring data can take **12-24 hours** to appear in the console after first integration.

- Initial data collection: 5-10 minutes
- First appearance in console: **12-24 hours** (this is normal!)
- After that, data appears within hours

### 2. Verify SDK is Initialized

Open the deployed dashboard in browser and check console:

1. **Open**: https://madas-store.web.app
2. **Open Browser DevTools** (F12)
3. **Check Console** for:
   ```
   [Firebase] Performance Monitoring initialized at app startup
   ```
4. **If you see errors**, the SDK may not be initialized correctly

### 3. Create Test Traces

To verify Performance Monitoring is working, navigate through the dashboard:

1. **Open Dashboard Home** (`/`)
   - Creates trace: `page_load_home`

2. **Navigate to Orders** (`/orders`)
   - Creates trace: `page_load_orders`

3. **Navigate to Finance Overview** (`/finance/overview`)
   - Creates trace: `page_load_finance_overview`

4. **Perform Firestore Operations**
   - View orders, transactions
   - Creates traces: `firestore_read_orders`, `firestore_read_transactions`

### 4. Check Browser Network Tab

1. Open **Network Tab** in DevTools
2. Filter by **"firebase"** or **"performance"**
3. Look for requests to Firebase Performance Monitoring endpoints
4. These requests indicate traces are being sent

### 5. Enable Performance Monitoring in Console

1. Go to Firebase Console: https://console.firebase.google.com/project/madas-store/performance
2. Click **"Add SDK"** if prompted
3. Follow the setup wizard
4. Ensure Performance Monitoring is **enabled** for your app

### 6. Check App Registration

Verify your app is registered with Performance Monitoring:

1. Firebase Console → Project Settings → Your Apps
2. Find your web app: `madas-store` (App ID: `1:527071300010:web:7470e2204065b4590583d3`)
3. Ensure Performance Monitoring is enabled

### 7. Verify Initialization Code

The SDK is initialized in `src/main.tsx`:

```typescript
import { initializePerformance, getPerformance } from 'firebase/performance';
import { app } from './lib/firebase';

if (typeof window !== 'undefined') {
  try {
    initializePerformance(app);
    const perf = getPerformance(app);
    console.log('[Firebase] Performance Monitoring initialized at app startup');
  } catch (error) {
    console.warn('[Firebase] Performance Monitoring initialization:', error);
  }
}
```

### 8. Quick Test

Create a test trace to verify it's working:

1. **Open Browser Console** on deployed dashboard
2. **Run**:
   ```javascript
   // Import Firebase Performance
   import { trace, getPerformance } from 'firebase/performance';
   import { app } from './lib/firebase';
   
   // Create a test trace
   const perf = getPerformance(app);
   const testTrace = trace(perf, 'test_trace');
   testTrace.start();
   setTimeout(() => {
     testTrace.stop();
     console.log('Test trace created!');
   }, 1000);
   ```

### 9. Expected Behavior

**Immediate (Within Minutes)**:
- ✅ Console log: `[Firebase] Performance Monitoring initialized`
- ✅ Network requests to Firebase Performance endpoints
- ✅ Traces created in browser

**After 12-24 Hours**:
- ✅ Data appears in Firebase Performance Console
- ✅ Traces visible in Performance Dashboard
- ✅ Metrics and statistics available

### 10. Common Issues

#### Issue: Console shows "Add SDK" page

**Solution**:
- Performance Monitoring hasn't detected SDK yet
- Wait 12-24 hours after first deployment
- Ensure you navigate through pages to create traces
- Check browser console for initialization message

#### Issue: No console logs

**Solution**:
- Check if Performance Monitoring is enabled in Firebase Console
- Verify app is using correct App ID
- Check browser console for errors

#### Issue: Traces not being sent

**Solution**:
- Check Network tab for Firebase requests
- Verify `initializePerformance()` is being called
- Ensure `getPerformance()` returns a valid instance

### 11. Verify Current Status

To check if Performance Monitoring is active right now:

```bash
# Open deployed dashboard
# Open browser console
# Look for initialization message
# Check Network tab for Firebase Performance requests
```

### 12. Force Data Collection

To ensure traces are being created:

1. **Navigate through multiple pages**:
   - Home → Orders → Finance → Dashboard
   - Repeat 5-10 times

2. **Perform Firestore operations**:
   - Load orders list
   - Load transactions
   - Load finance overview

3. **Wait and check**:
   - Check Network tab for Firebase requests
   - Wait 12-24 hours
   - Check Firebase Performance Console

## Expected Timeline

| Action | Timeframe |
|--------|-----------|
| SDK Deployed | Immediate |
| SDK Initialized | Immediate (check console) |
| Traces Created | Immediate (when user navigates) |
| Data Sent to Firebase | Within minutes |
| **Data Appears in Console** | **12-24 hours** |

## Next Steps

1. ✅ **Verify SDK is initialized** - Check browser console
2. ✅ **Navigate through pages** - Create traces
3. ⏱️ **Wait 12-24 hours** - Data processing time
4. ✅ **Check Firebase Console** - View performance data

---

**Current Status**: SDK is deployed and initialized. Traces will be created as users interact with the dashboard. Data will appear in Firebase Console within 12-24 hours.

**Dashboard URL**: https://madas-store.web.app
**Performance Console**: https://console.firebase.google.com/project/madas-store/performance

