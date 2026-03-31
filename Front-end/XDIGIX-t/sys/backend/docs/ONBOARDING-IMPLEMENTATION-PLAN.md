# XDIGIX Onboarding Implementation Plan

**Version:** 1.0
**Status:** Implementation plan — approved for execution
**Source of truth:**
- `docs/ONBOARDING-ARCHITECTURE.md`
- `docs/ONBOARDING-SCHEMA-API-CONTRACT.md`

---

## 1. Final Module Ownership

### Decision: New dedicated `modules/onboarding/` module

**Justification:** Onboarding is a multi-step orchestration workflow that:
- Spans Auth, Platform Core, Finance, and Builder modules
- Has its own state machine, resume logic, and background jobs
- Owns `onboarding_progress` collection exclusively
- Must not pollute existing module boundaries

It follows the same pattern as Support, Reporting, and Exports — a self-contained module that calls other module services but owns its own domain state.

### Ownership Table

| Responsibility | Owner | Files |
|---------------|-------|-------|
| User credentials + email verification | **Auth** (existing) | `services/auth.service.ts`, NEW `schemas/email-verification-token.schema.ts` |
| Tenant lifecycle + trial support | **Platform Core** (existing) | `modules/platform-core/tenant.schema.ts` (MODIFY), `tenant.service.ts` (EXTEND) |
| Onboarding workflow state | **Onboarding** (NEW) | `modules/onboarding/*` (all NEW) |
| Business provisioning | **Business** (existing schema) | `schemas/business.schema.ts` (NO CHANGE), onboarding creates via model |
| Subscription lifecycle + payment sessions | **Finance** (existing) | `modules/finance/subscription.schema.ts` (MODIFY), NEW `payment-session.schema.ts`, `subscription.service.ts` (NEW) |
| Default site provisioning | **Builder** (existing) | `modules/builder/builder.service.ts` (NO CHANGE — onboarding calls existing) |
| Owner role assignment | **Onboarding** (orchestrates) | Writes to `users` and `firestoredocs` via existing models |

---

## 2. File-Level Implementation Plan

### NEW FILES

#### Onboarding Module (`modules/onboarding/`)

| File | Purpose | Risk |
|------|---------|------|
| `onboarding-progress.schema.ts` | OnboardingProgress model + state machine + transition validator | Safe additive — new collection |
| `onboarding.service.ts` | Core orchestration: start, verify, selectPlan, provisionBusiness, initStore, complete, resume | Safe additive — calls existing services |
| `onboarding.routes.ts` | Public + authenticated + admin endpoints | Safe additive — new route prefix `/api/onboarding` |
| `onboarding.events.ts` | Event handlers for onboarding notifications | Safe additive |
| `onboarding.jobs.ts` | Background job: abandonStale() | Safe additive |
| `index.ts` | Barrel export | Safe additive |

#### Auth Extension

| File | Purpose | Risk |
|------|---------|------|
| `schemas/email-verification-token.schema.ts` | NEW schema for email verification tokens with TTL | Safe additive — new collection |

#### Finance Extension

| File | Purpose | Risk |
|------|---------|------|
| `modules/finance/payment-session.schema.ts` | NEW schema for payment checkout sessions with TTL | Safe additive — new collection |
| `modules/finance/subscription.service.ts` | NEW service: createSubscription, activateSubscription, createPendingSubscription | Safe additive — wraps existing Subscription model |

### MODIFIED FILES

#### Platform Core

| File | Change | Risk |
|------|--------|------|
| `modules/platform-core/tenant.schema.ts` | Add `'trial'` to planActivation enum. Add `trialExpiresAt` field. | **Low risk** — additive enum value + optional field. Existing records unaffected (default null). |
| `modules/platform-core/tenant.service.ts` | Add `activateTrial()` method alongside existing `activateWithGrace()`. | **Low risk** — new method, no existing method changes. |
| `modules/platform-core/tenant.jobs.ts` | Add `processExpiredTrials()` job alongside existing `processExpiredGrace()`. Same atomic pattern. | **Low risk** — new function, no existing function changes. |

#### Finance

| File | Change | Risk |
|------|--------|------|
| `modules/finance/subscription.schema.ts` | Add fields: `subscriptionId`, `trialEnd`, `cancelledAt`, `paymentProvider`, `externalSubscriptionId`, `onboardingId`. Add `'pending'` and `'grace'` to status enum. Add 3 indexes. | **Low risk** — all fields are optional with null defaults. Existing records get null for new fields. Enum extension is additive. |
| `modules/finance/index.ts` | Export new subscription.service and payment-session schema. | Safe additive. |

#### Auth Service

| File | Change | Risk |
|------|--------|------|
| `services/auth.service.ts` | Add `registerForOnboarding()` method that creates User with type='client_owner' but does NOT create tokens (onboarding handles that separately). Add `sendVerificationEmail()` and `verifyEmailToken()` methods. | **Medium risk** — new methods only, existing register/login methods unchanged. Must not break existing `/auth/signup` flow. |

#### App Startup

| File | Change | Risk |
|------|--------|------|
| `app.ts` | Mount onboarding routes at `/api/onboarding`. Mount behind feature flag check. Add trial expiry job to startup block. | **Low risk** — additive route mount. Feature flag prevents accidental exposure. |

### FILES NOT CHANGED

These files are called by onboarding but not modified:

| File | Usage |
|------|-------|
| `modules/builder/builder.service.ts` | Onboarding calls existing Site.create() directly |
| `schemas/business.schema.ts` | Onboarding calls Business.create() directly |
| `schemas/user.schema.ts` | Onboarding calls User.updateOne() to link tenant/business |
| `schemas/document.schema.ts` | Onboarding calls FirestoreDoc.create() for staff entry |
| `modules/platform-core/audit.service.ts` | Onboarding calls auditService.log() for all transitions |
| `modules/platform-core/event-bus.service.ts` | Onboarding calls eventBus.safePublish() for events |
| `modules/platform-core/enforcement.service.ts` | Not called during onboarding. Enforcement activates after onboarding completes. |

---

## 3. Schema Migration Plan

### 3.1 Tenant Schema — ADD `'trial'` + `trialExpiresAt`

| Aspect | Detail |
|--------|--------|
| **Change type** | Additive enum value + optional field |
| **Field additions** | `trialExpiresAt: Date \| null` (default null) |
| **Enum addition** | `planActivation: add 'trial'` |
| **Default values** | `trialExpiresAt: null` — existing records unaffected |
| **Backward compatible** | YES — existing code never sets `'trial'`, so all existing tenants stay on `'paid' \| 'grace' \| 'default'` |
| **Migration script** | NOT NEEDED — additive change, Mongoose handles missing fields as undefined/null |

### 3.2 Subscription Schema — ADD 6 fields + 2 enum values + 3 indexes

| Aspect | Detail |
|--------|--------|
| **Change type** | Additive fields + enum extension |
| **Field additions** | `subscriptionId`, `trialEnd`, `cancelledAt`, `paymentProvider`, `externalSubscriptionId`, `onboardingId` — all optional, default null |
| **Enum addition** | `status: add 'pending', 'grace'` |
| **Default values** | All null — existing records unaffected |
| **Backward compatible** | YES — existing subscriptions don't have these fields, Mongoose returns undefined for them |
| **Migration script** | OPTIONAL — can backfill `subscriptionId` on existing records: `db.finance_subscriptions.find({ subscriptionId: null }).forEach(d => db.finance_subscriptions.updateOne({ _id: d._id }, { $set: { subscriptionId: 'SUB-' + d._id.toString().slice(-8).toUpperCase() } }))` |
| **Index safety** | New indexes are additive. `externalSubscriptionId` is sparse+unique (null values ignored). Build in background. |

### 3.3 OnboardingProgress — NEW collection

| Aspect | Detail |
|--------|--------|
| **Change type** | New collection |
| **Migration** | NONE — new collection, empty at deploy time |
| **Indexes** | Created automatically by Mongoose on first write |
| **Rollback** | Drop collection `onboarding_progress` if rollback needed |

### 3.4 EmailVerificationToken — NEW collection

| Aspect | Detail |
|--------|--------|
| **Change type** | New collection with TTL |
| **Migration** | NONE — new collection |
| **TTL index** | `{ createdAt: 1 }` with `expireAfterSeconds: 86400` (24h) |
| **Rollback** | Drop collection `email_verification_tokens` |

### 3.5 PaymentSession — NEW collection

| Aspect | Detail |
|--------|--------|
| **Change type** | New collection with TTL |
| **Migration** | NONE — new collection |
| **TTL index** | `{ createdAt: 1 }` with `expireAfterSeconds: 259200` (72h) |
| **Rollback** | Drop collection `payment_sessions` |

---

## 4. Endpoint Rollout Plan

### Phase A: Minimal Onboarding Read/Write

**Depends on:** OnboardingProgress schema, EmailVerificationToken schema, auth.service extension

| # | Endpoint | Feature flag | Dependencies |
|---|----------|-------------|-------------|
| E1 | `POST /api/onboarding/signup` | `onboarding_enabled` | OnboardingProgress schema, auth.service.registerForOnboarding(), email sending |
| E2 | `POST /api/onboarding/verify-email` | `onboarding_enabled` | EmailVerificationToken schema |
| E3 | `POST /api/onboarding/resend-verification` | `onboarding_enabled` | EmailVerificationToken schema |
| E4 | `GET /api/onboarding/progress` | `onboarding_enabled` | OnboardingProgress schema only (read-only) |
| E5 | `POST /api/onboarding/select-plan` | `onboarding_enabled` | Plans collection (existing) |

**Shippable behind feature flag:** YES. No impact on existing auth/signup flows.

### Phase B: Business Provisioning + Free Plan Completion

**Depends on:** Phase A + Subscription schema extension

| # | Endpoint | Feature flag | Dependencies |
|---|----------|-------------|-------------|
| E6 | `POST /api/onboarding/business` | `onboarding_enabled` | Tenant.service, Business model, User model, FirestoreDoc |
| E10 | `POST /api/onboarding/complete` | `onboarding_enabled` | Site model (read check), completion criteria logic |
| E11 | `POST /api/onboarding/resume` | `onboarding_enabled` | OnboardingProgress state machine |

**At this point:** Free-plan onboarding works end-to-end. Store initialization happens automatically during business provisioning for free plan.

### Phase C: Paid Plan + Trial

**Depends on:** Phase B + Subscription.service, PaymentSession schema

| # | Endpoint | Feature flag | Dependencies |
|---|----------|-------------|-------------|
| E7 | `POST /api/onboarding/create-checkout` | `onboarding_enabled` | PaymentSession schema, Stripe/Paymob SDK |
| E8 | `POST /api/onboarding/confirm-subscription` | `onboarding_enabled` | Webhook signature verification, Subscription.service |
| E9 | `POST /api/onboarding/activate-trial` | `onboarding_enabled` | Tenant.activateTrial(), Subscription.service |

### Phase D: Admin Tools

**Depends on:** Phases A-C working

| # | Endpoint | Feature flag | Dependencies |
|---|----------|-------------|-------------|
| E12 | `POST /api/admin/onboarding/provision` | Always available to admins | All provisioning services |
| E13 | `POST /api/admin/onboarding/:id/activate-grace` | Always available to admins | Tenant.activateWithGrace() (existing) |
| E14 | `GET /api/admin/onboarding` | Always available to admins | OnboardingProgress read-only |

---

## 5. Service Implementation Plan

### Build Order

| Order | Service Method | Dependencies | Test Priority |
|-------|---------------|-------------|---------------|
| 1 | `onboarding-progress.schema.ts` — model + state machine + validator | None | HIGH — state machine must be tested first |
| 2 | `onboardingService.getProgress()` | Schema only | HIGH — read path, used by all other methods |
| 3 | `onboardingService.start()` | auth.service.registerForOnboarding(), EmailVerificationToken | HIGH — entry point for entire flow |
| 4 | `onboardingService.verifyEmail()` | EmailVerificationToken, User model | HIGH |
| 5 | `onboardingService.selectPlan()` | Plan model (existing, read-only) | MEDIUM |
| 6 | `onboardingService.provisionBusiness()` | tenantService.createTenant(), Business model, User model, FirestoreDoc | HIGH — most complex provisioning step |
| 7 | `onboardingService.initializeStore()` | Site model | MEDIUM |
| 8 | `onboardingService.complete()` | All models (read checks) | HIGH — gates merchant access |
| 9 | `onboardingService.resume()` | State machine logic | MEDIUM |
| 10 | `financeService.createPendingSubscription()` | Subscription schema extension | HIGH |
| 11 | `financeService.activateSubscription()` | Subscription model | HIGH |
| 12 | `onboardingService.createCheckoutSession()` | PaymentSession, Stripe/Paymob SDK | MEDIUM — can stub payment provider |
| 13 | `onboardingService.handlePaymentWebhook()` | financeService.activateSubscription() | HIGH — payment correctness |
| 14 | `onboardingService.activateTrial()` | tenantService.activateTrial() | MEDIUM |
| 15 | `onboardingService.abandonStale()` | OnboardingProgress query + atomic update | LOW — background job, not user-facing |
| 16 | `tenantService.activateTrial()` | Tenant schema with trial support | MEDIUM |
| 17 | `tenant.jobs.processExpiredTrials()` | Tenant model | LOW — same pattern as grace expiry |

---

## 6. Event Implementation Plan

### Required Events (Phase 1-2)

These events are needed for correctness or critical notifications:

| Event | Phase | Why required |
|-------|-------|-------------|
| `onboarding.started` | A | Welcome email trigger |
| `onboarding.email_verified` | A | Verification confirmation email |
| `onboarding.completed` | B | Merchant ready notification + reporting |
| `onboarding.payment_succeeded` | C | Payment confirmation email + finance ledger entry |

### Optional Events (Phase 3-4)

These are useful for analytics and observability but not blocking:

| Event | Phase | Why optional |
|-------|-------|-------------|
| `onboarding.plan_selected` | A | Analytics only |
| `onboarding.business_created` | B | Analytics only |
| `onboarding.payment_pending` | C | Analytics only |
| `onboarding.site_initialized` | B | Analytics only |

### Deferred Events (Phase 5-6)

These can be added after core flow is stable:

| Event | Phase | Why deferred |
|-------|-------|-------------|
| `onboarding.trial_started` | 5 | Trial welcome email (nice to have) |
| `onboarding.grace_started` | 5 | Admin notification (nice to have) |
| `onboarding.abandoned` | 5 | Win-back email (non-critical) |
| `onboarding.suspended` | 5 | System alert (non-critical) |

### Consumer Mapping

| Event | Consumers |
|-------|----------|
| `onboarding.started` | Notifications (welcome email) |
| `onboarding.email_verified` | Notifications (verified confirmation) |
| `onboarding.completed` | Notifications (onboarding complete), Reporting (tenant growth) |
| `onboarding.payment_succeeded` | Notifications (receipt), Finance (ledger entry) |
| `onboarding.abandoned` | Notifications (win-back), Analytics |

---

## 7. Failure Recovery Design

### F1: User signs up but never verifies email

| Aspect | Detail |
|--------|--------|
| **Source of truth** | `OnboardingProgress.status = 'account_created'` |
| **Retry entry point** | `POST /api/onboarding/resend-verification` |
| **Idempotency** | New token created each time. Old tokens expire via TTL. User can verify with any valid token. |
| **User-visible result** | "Check your email" message. After 30 days: `abandonStale()` sets status='abandoned'. User can still resume via login + `/resume`. |

### F2: Tenant created but business draft missing

| Aspect | Detail |
|--------|--------|
| **Source of truth** | `OnboardingProgress.tenantId` set, `OnboardingProgress.businessId` is null |
| **Retry entry point** | `POST /api/onboarding/business` (same endpoint, idempotent) |
| **Idempotency** | Tenant creation skipped (tenantId already set). Business creation proceeds. |
| **User-visible result** | "Continue setting up your store" — progress shows business step incomplete. |

### F3: Business saved but site provisioning fails

| Aspect | Detail |
|--------|--------|
| **Source of truth** | `OnboardingProgress.status` is `paid_active`/`trial_active`/`business_created` (for free), `failedStep='init_store'` |
| **Retry entry point** | `POST /api/onboarding/complete` re-checks and retries store init if missing |
| **Idempotency** | `Site.findOne({ tenantId })` — if exists, skip creation |
| **User-visible result** | "Almost done — finalizing your store" |

### F4: Paid plan selected but payment not completed

| Aspect | Detail |
|--------|--------|
| **Source of truth** | `OnboardingProgress.status = 'payment_pending'`, Subscription.status = 'pending' |
| **Retry entry point** | `POST /api/onboarding/create-checkout` creates a new checkout session |
| **Idempotency** | Old payment sessions expire via TTL (72h). New session has new externalSessionId. |
| **User-visible result** | "Complete your payment to activate your plan" with new checkout link |

### F5: Payment succeeded but subscription activation fails

| Aspect | Detail |
|--------|--------|
| **Source of truth** | PaymentSession.status = 'completed' but Subscription.status still 'pending' |
| **Retry entry point** | Webhook retry (payment providers retry failed webhooks). Or admin manual activation. |
| **Idempotency** | `externalSubscriptionId` unique index — second webhook call deduplicates. |
| **User-visible result** | Progress shows 'payment_pending'. Admin can force-activate via E13. |

### F6: Onboarding completed twice

| Aspect | Detail |
|--------|--------|
| **Source of truth** | `OnboardingProgress.status = 'completed'` |
| **Retry entry point** | `POST /api/onboarding/complete` |
| **Idempotency** | `findOneAndUpdate({ status: { $ne: 'completed' } })` — second call matches nothing, returns existing. |
| **User-visible result** | Same success response both times. |

### F7: Retry after partial provisioning

| Aspect | Detail |
|--------|--------|
| **Source of truth** | `OnboardingProgress.completedSteps` + `failedStep` |
| **Retry entry point** | `GET /progress` shows where user is. Frontend auto-resumes from current step. |
| **Idempotency** | Each sub-step checks: tenant exists? skip. business exists? skip. site exists? skip. |
| **User-visible result** | Progress bar shows completed steps. User continues from where they left off. |

### F8: Admin grants grace after failed payment

| Aspect | Detail |
|--------|--------|
| **Source of truth** | `OnboardingProgress.status = 'payment_pending'` |
| **Retry entry point** | `POST /api/admin/onboarding/:id/activate-grace` |
| **Idempotency** | Grace activation uses `tenantService.activateWithGrace()` which is already idempotent. |
| **User-visible result** | Status transitions from `payment_pending` → `grace_active`. User can proceed to store init. |

---

## 8. Test Strategy

### Layer 1: Schema Tests (automated, no DB)

| Test | What it verifies |
|------|------------------|
| OnboardingProgress state machine | All valid transitions pass, all invalid transitions throw |
| OnboardingProgress defaults | Default status, currentStep, retryCount |
| OnboardingStatus enum completeness | All 13 states defined |
| OnboardingStep enum completeness | All 7 steps defined |
| EmailVerificationToken TTL | TTL index configured at 86400s |
| PaymentSession TTL | TTL index configured at 259200s |
| Subscription extended enum | Includes 'pending' and 'grace' |
| Tenant extended enum | Includes 'trial' |

### Layer 2: Service Tests (mocked DB)

| Test | What it verifies |
|------|------------------|
| start() creates user + onboarding | Both records created, status='account_created' |
| start() idempotent on duplicate email | Returns existing onboarding, no duplicate |
| verifyEmail() sets emailVerified | User.emailVerified=true, status transitions |
| verifyEmail() rejects expired token | Token past TTL, returns 404 |
| selectPlan() stores planIntent | OnboardingProgress.planIntent updated |
| selectPlan() rejects invalid plan | Returns 404 for non-existent planId |
| provisionBusiness() creates all resources | Tenant, Business, User link, staff entry |
| provisionBusiness() idempotent | Skip existing tenant/business on retry |
| initializeStore() creates site | Site created with correct tenantId/businessId |
| complete() verifies hard criteria | All 5 criteria checked, status='completed' |
| complete() rejects incomplete | Returns error with missing criteria list |
| resume() from abandoned | Transitions to last valid step |
| abandonStale() marks old records | Records > 30 days → abandoned |

### Layer 3: Route Tests (HTTP-level)

| Test | What it verifies |
|------|------------------|
| POST /signup returns 201 + tokens | Full response shape |
| POST /signup 409 on duplicate email | Conflict handling |
| POST /signup 400 on weak password | Validation |
| GET /progress 401 without JWT | Auth enforcement |
| POST /business 422 when email not verified | State precondition enforcement |
| POST /create-checkout 422 for free plan | Cannot create checkout for free |
| POST /complete 422 when incomplete | Hard criteria gate |
| POST /admin/provision requires admin JWT | Auth + role enforcement |

### Layer 4: Idempotency Tests

| Test | What it verifies |
|------|------------------|
| Double start() same email | Same onboardingId returned, no duplicate |
| Double provisionBusiness() | Same tenantId/businessId, no duplicates |
| Double complete() | Same response, completedAt unchanged |
| Double webhook same externalId | Subscription not double-activated |
| provisionBusiness() after partial (tenant created, business missing) | Business created, tenant reused |

### Layer 5: Recovery Tests

| Test | What it verifies |
|------|------------------|
| Resume after abandon | Status transitions correctly, steps preserved |
| Retry after failed business creation | failedStep cleared, business created |
| Complete after partial site init | Site checked, created if missing |

### Minimum Critical Path Test Matrix

```
1. signup → verify → select plan (free) → business → complete ✓
2. signup → verify → select plan (paid) → business → checkout → webhook → complete ✓
3. signup → verify → select plan (trial) → business → trial → complete ✓
4. admin provision → completed immediately ✓
5. signup → abandon → resume → complete ✓
6. signup → business fails → retry → complete ✓
```

---

## 9. Rollout / Feature Flag Plan

### Feature Flag: `onboarding_enabled`

| Scope | Value | Effect |
|-------|-------|--------|
| Global default | `false` | Onboarding routes return 404 |
| Internal testing | `true` for admin accounts | Admins can test full flow |
| Selected tenants | `true` per-tenant flag | Early adopters |
| Full rollout | `true` globally | All new signups use onboarding |

### Implementation

```
// In onboarding.routes.ts — route-level gate
if (process.env.ONBOARDING_ENABLED !== 'true') {
  router.use((req, res) => res.status(404).json({ error: 'Not found' }));
}
```

And per-tenant:
```
// Check feature flag in onboardingService.start()
const enabled = await featureFlagService.getFeatureFlag('__global__', 'onboarding_enabled');
if (!enabled) throw new Error('Onboarding is not yet available');
```

### Rollout Sequence

| Stage | Duration | Scope | Criteria to advance |
|-------|----------|-------|-------------------|
| 1. Internal only | 1 week | Admin accounts + test tenants | All 6 critical path tests pass in production |
| 2. Early adopters | 1 week | 5-10 invited merchants | Zero completion failures, <1% error rate |
| 3. Open beta | 2 weeks | All new signups, opt-in | Smooth completions, payment flow verified |
| 4. GA | Permanent | Replace legacy `/create-client` | Legacy endpoint deprecated with redirect |

### Rollback Strategy

| Level | Action | Effect |
|-------|--------|--------|
| Flag off | Set `ONBOARDING_ENABLED=false` | All onboarding routes return 404. Existing in-progress onboardings pause (users see "temporarily unavailable"). |
| Code revert | `git revert` the onboarding module | Routes removed. OnboardingProgress collection data preserved (no deletion). |
| Full rollback | Revert + drop collections | `onboarding_progress`, `email_verification_tokens`, `payment_sessions` dropped. No impact on tenants, businesses, or users already created. |

---

## 10. Recommended Implementation Waves

### Wave 1: Schemas + State Machine + Read API (2-3 days)

**Files:**
- `modules/onboarding/onboarding-progress.schema.ts` (NEW)
- `schemas/email-verification-token.schema.ts` (NEW)
- `modules/onboarding/index.ts` (NEW)
- `modules/platform-core/tenant.schema.ts` (MODIFY — add 'trial' + trialExpiresAt)
- `modules/finance/subscription.schema.ts` (MODIFY — add 6 fields + 2 enum values)

**Tests:** Schema tests, state machine tests, enum completeness.

**Deployable:** YES — no routes exposed, no runtime impact.

### Wave 2: Signup + Email Verification + Plan Selection (3-4 days)

**Files:**
- `modules/onboarding/onboarding.service.ts` (NEW — start, verifyEmail, selectPlan, getProgress)
- `modules/onboarding/onboarding.routes.ts` (NEW — E1-E5)
- `services/auth.service.ts` (MODIFY — add registerForOnboarding, sendVerificationEmail, verifyEmailToken)
- `app.ts` (MODIFY — mount onboarding routes behind feature flag)

**Tests:** Service tests for start/verify/select. Route tests for E1-E5. Idempotency tests.

**Deployable:** YES behind feature flag. Free plan users can sign up but cannot complete yet.

### Wave 3: Business Provisioning + Free Plan Completion (3-4 days)

**Files:**
- `modules/onboarding/onboarding.service.ts` (EXTEND — provisionBusiness, initializeStore, complete, resume)

**Tests:** Provisioning idempotency, completion criteria, resume from abandon. Critical path test #1 (free plan e2e).

**Deployable:** YES. Free plan onboarding works end-to-end.

### Wave 4: Subscription + Payment Flow (4-5 days)

**Files:**
- `modules/finance/subscription.service.ts` (NEW)
- `modules/finance/payment-session.schema.ts` (NEW)
- `modules/onboarding/onboarding.service.ts` (EXTEND — createCheckoutSession, handlePaymentWebhook, activateTrial)
- `modules/platform-core/tenant.service.ts` (EXTEND — activateTrial)

**Tests:** Subscription CRUD, payment session lifecycle, webhook handling, trial activation. Critical path tests #2 and #3.

**Deployable:** YES. Paid and trial onboarding works end-to-end.

### Wave 5: Admin Tools + Grace + Background Jobs (2-3 days)

**Files:**
- `modules/onboarding/onboarding.routes.ts` (EXTEND — E12-E14 admin endpoints)
- `modules/onboarding/onboarding.jobs.ts` (NEW — abandonStale)
- `modules/platform-core/tenant.jobs.ts` (EXTEND — processExpiredTrials)
- `app.ts` (EXTEND — wire abandon job + trial expiry job)

**Tests:** Admin provision e2e (critical path #4), grace activation, abandon job. Critical path #5 (abandon + resume).

**Deployable:** YES. Admin tools available immediately (no feature flag needed for admin).

### Wave 6: Events + Notifications + Rollout (2-3 days)

**Files:**
- `modules/onboarding/onboarding.events.ts` (NEW — event handlers)
- Notification template seeds for onboarding events

**Tests:** Event emission verification, notification delivery (mocked).

**Deployable:** YES. Onboarding feature flag moved to open beta.

---

### Total Estimated Effort: 16-22 days

| Wave | Days | Cumulative | What works |
|------|------|------------|------------|
| 1 | 2-3 | 2-3 | Schemas deployed, no user-facing changes |
| 2 | 3-4 | 5-7 | Signup + verification + plan selection |
| 3 | 3-4 | 8-11 | Free plan onboarding complete |
| 4 | 4-5 | 12-16 | Paid + trial onboarding complete |
| 5 | 2-3 | 14-19 | Admin tools + background jobs |
| 6 | 2-3 | 16-22 | Full onboarding with notifications |
