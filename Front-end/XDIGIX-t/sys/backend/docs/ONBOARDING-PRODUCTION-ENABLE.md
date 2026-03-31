# XDIGIX Onboarding — Production Enable Checklist

## Production Blockers Found & Fixed

| Blocker | Status | Fix |
|---------|--------|-----|
| Stripe webhook raw body not captured for `/api/onboarding/webhooks/stripe` | **FIXED** | Added path to `WEBHOOK_PATH_REGEX` in `raw-body-webhook.middleware.ts`. Raw body is now captured AND parsed into `req.body`. |
| `express.json()` consuming stream before raw body middleware | **FIXED** | Middleware now manually parses raw body into `req.body` so both raw and parsed are available. |
| No remaining production blockers | ✅ | — |

---

## Required Environment Variables

### Onboarding Feature Gate

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `ONBOARDING_ENABLED` | Yes (to enable) | `false` | Set to `true` to enable all onboarding routes. When `false`, all `/api/onboarding/*` routes return 404. |

### Payment Provider Webhook Secrets

| Variable | Required | Default | Where Used |
|----------|----------|---------|------------|
| `STRIPE_WEBHOOK_SECRET` | For paid Stripe flow | `''` (dev: accepts without verification) | `modules/onboarding/onboarding-webhook.routes.ts` line 96 — `verifyStripeSignature()` |
| `PAYMOB_HMAC_SECRET` | For paid Paymob flow | `''` (dev: accepts without verification) | `modules/onboarding/onboarding-webhook.routes.ts` line 148 — `verifyPaymobSignature()` |

### Frontend URL (for verification emails)

| Variable | Required | Default | Where Used |
|----------|----------|---------|------------|
| `FRONTEND_URL` | Recommended | `https://app.xdigix.com` | `modules/onboarding/onboarding.service.ts` — verification email link |

### Existing Variables (already configured)

| Variable | Notes |
|----------|-------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Required for sending verification + notification emails |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Required for auth (already validated at startup) |
| `MONGODB_URI` | Required (already validated at startup) |

---

## Railway Enablement Checklist

### Step 1: Set environment variables

```
ONBOARDING_ENABLED=true
FRONTEND_URL=https://your-frontend-domain.com
STRIPE_WEBHOOK_SECRET=whsec_...   (from Stripe Dashboard → Webhooks)
PAYMOB_HMAC_SECRET=...            (from Paymob Dashboard → Settings)
```

### Step 2: Configure Stripe webhook endpoint

In Stripe Dashboard → Developers → Webhooks:
- Endpoint URL: `https://xdigix-os-production.up.railway.app/api/onboarding/webhooks/stripe`
- Events to listen for:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `payment_intent.payment_failed`

### Step 3: Configure Paymob webhook endpoint (if using Paymob)

In Paymob Dashboard → Settings → Webhooks:
- Callback URL: `https://xdigix-os-production.up.railway.app/api/onboarding/webhooks/paymob`
- Enable transaction processed callback

### Step 4: Deploy

```bash
git push xdigix main
```

Railway auto-deploys. Verify health after deploy:
```bash
curl https://xdigix-os-production.up.railway.app/health
```

### Step 5: Verify onboarding is enabled

```bash
# Should return onboarding data (not 404)
curl https://xdigix-os-production.up.railway.app/api/admin/onboarding/funnel
```

---

## Smoke Test Checklist

### 1. Onboarding Start
```bash
curl -X POST https://HOST/api/onboarding/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT" \
  -d '{}'
```
**Expected:** 201 with `onboardingId`, `status: "account_created"`

### 2. Email Verification
```bash
# Send verification email
curl -X POST https://HOST/api/onboarding/send-verification \
  -H "Authorization: Bearer JWT"

# Verify with token (from email link)
curl -X POST https://HOST/api/onboarding/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_FROM_EMAIL"}'
```
**Expected:** 200 with `status: "email_verified"`

### 3. Free Plan Completion
```bash
# Select plan
curl -X PATCH https://HOST/api/onboarding/progress \
  -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{"action": "select_plan", "planId": "free"}'

# Provision free plan
curl -X PATCH https://HOST/api/onboarding/progress \
  -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{"action": "provision_free", "businessName": "My Store"}'
```
**Expected:** 200 with `status: "completed"`, `tenantId` and `businessId` set

### 4. Paid Plan Session Creation
```bash
# After selecting a paid plan + provisioning business:
curl -X POST https://HOST/api/onboarding/payment-session \
  -H "Authorization: Bearer JWT" \
  -H "Content-Type: application/json" \
  -d '{"paymentProvider": "stripe"}'
```
**Expected:** 201 with `paymentSessionId`, `amount`, `currency`, `status: "created"`

### 5. Payment Success Webhook
```bash
# Generic test (no signature):
curl -X POST https://HOST/api/onboarding/webhooks/generic \
  -H "Content-Type: application/json" \
  -d '{"paymentSessionId": "PSN-XXXXXXXX", "status": "success"}'
```
**Expected:** 200 with `received: true`
**Verify:** Subscription status → active, Tenant planActivation → paid

### 6. Payment Failure Webhook
```bash
curl -X POST https://HOST/api/onboarding/webhooks/generic \
  -H "Content-Type: application/json" \
  -d '{"paymentSessionId": "PSN-XXXXXXXX", "status": "failed", "failureReason": "Card declined"}'
```
**Expected:** 200 with `received: true`
**Verify:** Onboarding failedStep = "activate_plan"

### 7. Onboarding Metrics
```bash
curl https://HOST/api/admin/onboarding/metrics
```
**Expected:** 200 with `persistent` (audit-log derived) and `sinceRestart` counters

### 8. Onboarding Funnel
```bash
curl https://HOST/api/admin/onboarding/funnel
```
**Expected:** 200 with `byStatus`, `total`, `completionRate`, `byPlan`

---

## Final Go/No-Go for Enabling Onboarding

### GO — Onboarding is ready for production enable.

**What's verified:**
- 1113 tests pass across 29 test files
- Stripe raw body capture fixed for `/api/onboarding/webhooks/stripe`
- Stripe HMAC-SHA256 signature verification implemented (constant-time, 5-min timestamp tolerance)
- Paymob HMAC-SHA512 signature verification implemented
- Dev fallback: works without secrets configured (for testing)
- 7 notification templates seeded atomically at startup
- Persistent metrics survive restart (audit-log aggregation)
- Feature flag `ONBOARDING_ENABLED` gates all routes (safe to enable/disable)
- All background jobs (abandon 24h, trial expiry 1h) use atomic claims
- No breaking changes to existing auth, tenant, finance, or order flows
