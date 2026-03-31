# XDIGIX Soft Launch Plan

**Baseline:** Commit `9c86604` — staging verified 2026-03-31
**Decision:** GO for controlled production launch
**Mode:** Soft launch with supervision

---

## 1. Soft Launch Plan

### Pre-Launch Checklist (Day 0, before traffic)

- [ ] Verify Railway environment variables are production-grade:
  - `NODE_ENV=production`
  - `JWT_ACCESS_SECRET` — cryptographically random, ≥32 chars
  - `JWT_REFRESH_SECRET` — different from access secret, ≥32 chars
  - `MONGODB_URI` — Atlas production cluster with IP whitelist
  - `CORS_ORIGIN` — set to actual frontend domains only
  - `S3_*` variables if file uploads are needed
- [ ] Verify health endpoint returns healthy: `GET /health`
- [ ] Verify Railway auto-deploy is connected to `xdigix/main` branch
- [ ] Confirm Railway instance has restart policy (auto-restart on crash)
- [ ] Set Railway memory limit to at least 512MB
- [ ] Enable Railway deployment logs retention

### Launch Sequence

1. **T-1h:** Final health check on Railway
2. **T-0:** Point DNS / frontend to Railway backend URL
3. **T+5m:** Verify first real request in logs
4. **T+15m:** Check health endpoint, verify MongoDB connected
5. **T+1h:** Review Railway logs for errors/warnings
6. **T+4h:** First metrics review (see 72-hour plan)

### Initial Traffic Limits

- First 24h: invite-only merchants (3-5 merchants max)
- Days 2-3: expand to 10-15 merchants
- Day 4+: open registration if metrics are clean

---

## 2. 72-Hour Production Watch Plan

### Hour 0-4: Critical Watch

**Check every 30 minutes:**
- `GET /health` — must return `{"status":"healthy"}`
- Railway logs: search for `error`, `FATAL`, `OverwriteModelError`, `ECONNREFUSED`
- MongoDB Atlas: check connection count, no spikes above 50

**Alert triggers (immediate action):**
- Health returns non-200
- Any `OverwriteModelError` in logs
- MongoDB connection failures
- Memory usage above 400MB
- Process restart count > 0

### Hour 4-24: Active Monitoring

**Check every 2 hours:**
- Health endpoint
- Railway logs for `[Error]`, `Slow request`, `limit_violation`
- MongoDB Atlas metrics: operations/sec, connections, disk I/O
- Check background job execution:
  - Event bus worker running (look for `Event bus worker started`)
  - No `Failed to initialize` in recent logs

**Key metrics to watch:**
- Request count per hour (baseline: establish normal)
- Error rate (target: <1%)
- p95 latency (target: <1.5s on Railway)
- Background job success (no stuck `processing` events)

### Hour 24-72: Steady State

**Check every 6 hours:**
- Health endpoint
- Railway error log count
- MongoDB slow query log (Atlas Performance Advisor)
- Event bus: dead letter count (`status: 'dead_letter'` in events collection)

**End of 72h review:**
- [ ] Total error count
- [ ] Unique error types
- [ ] Peak concurrent connections
- [ ] Slowest endpoints
- [ ] Any data inconsistencies reported by merchants
- [ ] Background job completion rates

---

## 3. Rollback Plan

### When to Rollback

Trigger rollback if ANY of these occur:
1. Server crash loop (>3 restarts in 10 minutes)
2. MongoDB connection permanently lost
3. Checkout endpoint returning 500 errors to customers
4. Data corruption detected (orders with wrong totals, missing products)
5. Security breach detected (unauthorized data access)

### Rollback Procedure

**Time to execute: <5 minutes**

```bash
# Step 1: Identify last known good commit
git log --oneline -10
# Known good: 7118fe4 (pre-P2 stabilization)

# Step 2: Revert to last good commit
git revert --no-commit HEAD..7118fe4
git commit -m "ROLLBACK: revert to 7118fe4 due to [reason]"
git push xdigix main

# Step 3: Railway auto-deploys from push
# Monitor: Railway dashboard for deployment completion

# Step 4: Verify rollback
curl https://xdigix-os-production.up.railway.app/health
```

**Alternative: Railway instant rollback**
1. Go to Railway dashboard
2. Click on the service
3. Click "Deployments"
4. Find last successful deployment before the issue
5. Click "Redeploy" on that deployment

### Post-Rollback

- [ ] Notify affected merchants
- [ ] Capture Railway logs from failed deployment
- [ ] Document what went wrong
- [ ] Fix the issue in a branch, test locally, then re-deploy

---

## 4. Incident Response Playbooks

### Playbook A: Checkout Failure

**Symptoms:** Customers getting 500/429/422 on checkout, orders not being created

**Diagnosis:**
```bash
# 1. Check if server is up
curl https://xdigix-os-production.up.railway.app/health

# 2. Check Railway logs for checkout errors
# Search for: "checkout", "ORDER_", "429", "500"

# 3. Check rate limiter (10/min/IP)
# If 429s are from legitimate traffic, not abuse:
# The checkoutLimiter in checkout.routes.ts limits to 10/min per IP
```

**Resolution:**
- If 500: check Railway logs for stack trace, likely MongoDB connection or schema issue
- If 429: rate limiter working correctly; if legitimate traffic spike, increase `max` in checkoutLimiter
- If 422: validation failure in checkout data — check the error message for which field failed
- If orders created but stuck in `awaiting_payment`: the order expiry job runs every 5 minutes and will clean up

**Escalation:** If checkout is completely broken for all users, trigger rollback.

---

### Playbook B: Reservation Mismatch

**Symptoms:** Products showing wrong stock, orders confirmed but no reservation, double-reservations

**Diagnosis:**
```javascript
// Connect to MongoDB Atlas and check:
// 1. Reservation status distribution
db.reservations.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])

// 2. Check for orphaned active reservations (older than 30min)
db.reservations.find({ status: "active", expiresAt: { $lt: new Date() } }).count()

// 3. Check event bus for stuck reservation events
db.events.find({ type: /stock/, status: { $in: ["pending", "processing"] } }).count()
```

**Resolution:**
- Orphaned reservations: the `processExpiredReservations` job runs every 5 minutes with atomic claims. Wait for next cycle.
- If job is not running: check Railway logs for `[inventory-jobs]` entries. If missing, the startup initialization may have failed — restart the Railway service.
- If stock counts are wrong: manually run `db.reservations.updateMany({ status: "active", expiresAt: { $lt: new Date() } }, { $set: { status: "expired" } })` to force-expire stuck reservations.

**Prevention:** The atomic `findOneAndUpdate` claim pattern prevents double-processing. If it still happens, check if multiple Railway instances are running.

---

### Playbook C: Shipping Event Failure

**Symptoms:** Orders not transitioning to "shipped"/"delivered" when shipments update, notifications not sending

**Diagnosis:**
```javascript
// 1. Check event bus for failed/dead events
db.events.find({ type: /shipment/, status: "dead_letter" }).sort({ createdAt: -1 }).limit(5)

// 2. Check event bus for stuck processing events
db.events.find({ type: /shipment/, status: "processing" }).count()

// 3. Check if event handlers are registered (Railway logs)
// Search for: "Handler registered for: shipment.picked_up"
```

**Resolution:**
- Dead letter events: check `lastError` field for the failure reason. Common: target model not found, payload missing required field.
- Stuck processing: the event bus worker retries with exponential backoff (1s-30s). If stuck > 5 minutes, manually reset: `db.events.updateMany({ status: "processing", createdAt: { $lt: new Date(Date.now() - 300000) } }, { $set: { status: "pending" } })`
- If handlers not registered: restart Railway service. Check logs for `[platform-core] Failed to initialize`.

---

### Playbook D: Reporting Failure

**Symptoms:** Dashboard returns 500, reports timeout, empty data

**Diagnosis:**
```bash
# 1. Check if reporting routes are reachable
curl https://xdigix-os-production.up.railway.app/api/admin/reports/tenants

# 2. If 500: check Railway logs for "Report failed"
# 3. If timeout: the aggregation query is too expensive
```

**Resolution:**
- 500 error: likely MongoDB aggregation failure. Check if the target collection has the expected indexes.
- Timeout: add date range filters (`from`/`to` query params) to limit the data scanned. The slow report warning logs at >3 seconds.
- Empty data: verify `tenantId` parameter matches a real tenant. Reports without `tenantId` query all data.
- Route 403: if admin routes return 403, check if the route shadowing fix is deployed (module routes must be mounted before company-admin catch-all in app.ts).

---

### Playbook E: Export Failure

**Symptoms:** Export stuck in "processing", download returns 404, export creation fails

**Diagnosis:**
```javascript
// 1. Check export job status
db.exportjobs.find({ status: { $in: ["queued", "processing"] } }).sort({ createdAt: -1 }).limit(5)

// 2. Check for expired exports
db.exportjobs.find({ status: "completed", expiresAt: { $lt: new Date() } }).count()
```

**Resolution:**
- Stuck in processing: the atomic claim prevents double-processing. If stuck > 5 minutes, manually reset: `db.exportjobs.updateOne({ exportJobId: "EXP-xxx", status: "processing" }, { $set: { status: "failed", error: "manual reset" } })`
- Download 404: file may have been cleaned up by the 6-hour expiry job. Re-create the export.
- Creation fails: check Railway logs for error. Common: missing tenant data, MongoDB connection timeout.
- Merchant exporting audit logs: returns 403 (correct — audit logs are admin-only).

---

### Playbook F: Support Ticket Backlog

**Symptoms:** Tickets not being created, public ticket endpoint failing, SLA not tracking

**Diagnosis:**
```bash
# 1. Test public ticket creation
curl -X POST https://xdigix-os-production.up.railway.app/api/public/test-tenant/support/tickets \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test","message":"Test","email":"test@test.com"}'

# 2. Check ticket count
curl https://xdigix-os-production.up.railway.app/api/support/tickets?limit=1
```

**Resolution:**
- Public ticket endpoint failing: check CSRF (requests must include proper Origin header or come from allowed domain).
- SLA not tracking: `firstResponseAt` is set when an agent/system replies to a customer-created ticket. If SLA shows null, no agent has responded yet.
- Ticket notifications not sending: check event bus for `ticket.created` events. If the notification templates for ticket events aren't seeded, notifications will be skipped (not failed).

---

## 5. Deferred Technical Debt Roadmap

### Ordered by Business Risk (highest first)

| Priority | ID | Item | Risk if deferred | Effort | Target |
|----------|-----|------|-------------------|--------|--------|
| **P1** | D1 | Migrate 18 legacy routes to module services | Stock/order state can diverge between legacy and module systems | Large (2-3 weeks) | Month 2 |
| **P1** | D2 | Unify `orderEvents` EventEmitter with durable event bus | Dual inventory tracking; silent data drift | Medium (1 week) | Month 2 |
| **P2** | D3 | Add Redis for distributed rate limiting | Rate limit bypass when scaling to multiple instances | Medium (2-3 days) | Before scaling |
| **P2** | D4 | Reduce JWT expiry from 24h to 1-4h | Stolen token reuse window | Small (1 day) | Month 1 |
| **P2** | D8 | Add per-email rate limiting on password reset | Distributed password reset attacks | Small (1 day) | Month 1 |
| **P3** | D5 | Add access token blacklist for logout | Token valid after logout | Medium (3-4 days) | Month 3 |
| **P3** | D6 | Encrypt external API tokens at rest | DB compromise exposes API keys | Medium (2-3 days) | Month 3 |
| **P3** | D7 | Replace regex SVG sanitizer with DOMPurify | XSS in uploaded SVGs | Small (1 day) | Month 2 |
| **P4** | D9 | Remove last duplicate index warning | Cosmetic log noise | Trivial (30 min) | Anytime |
| **P4** | D10 | Storage usage tracking for plan enforcement | Cannot enforce storage quotas | Small (2 days) | When S3 configured |

### Month 1 (Weeks 1-4)
- D4: Reduce JWT expiry
- D8: Per-email password reset rate limiting
- Monitor production metrics, establish baselines

### Month 2 (Weeks 5-8)
- D1: Begin legacy route migration (start with highest-traffic routes: checkout, products, orders)
- D2: Unify event systems (depends on D1 progress)
- D7: SVG sanitizer upgrade

### Month 3 (Weeks 9-12)
- D1: Complete legacy route migration
- D3: Redis integration (if scaling needed)
- D5: Access token blacklist
- D6: Encrypt external API tokens

### Ongoing
- D9: Cleanup (anytime)
- D10: Storage tracking (when S3 is configured)
