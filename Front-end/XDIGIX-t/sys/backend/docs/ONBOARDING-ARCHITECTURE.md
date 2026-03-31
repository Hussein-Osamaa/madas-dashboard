# XDIGIX Merchant Onboarding + Subscription Architecture

**Version:** 1.0
**Status:** Architecture contract — not yet implemented
**Baseline:** Commit `ac0daec` — all existing modules as reference

---

## 1. System Definition

### What onboarding means in XDIGIX

Merchant onboarding is the process of converting a signup intent into a fully provisioned, plan-activated, store-ready merchant account. It is a multi-step, resumable, auditable workflow that spans multiple modules.

Onboarding is NOT:
- A single API call
- A UI wizard state (UI is a consumer of onboarding state, not the owner)
- Part of authentication (auth creates credentials; onboarding creates the merchant)

### What must exist when onboarding is complete

**Required (hard completion):**
1. User account with `type: 'client_owner'`, verified email
2. Tenant record with `status: 'active'`, valid plan assignment
3. Business profile with name, owner reference, currency
4. Owner role assigned (user linked to tenant + business)
5. Subscription record with valid state (free/trial/paid/grace)
6. Default site created (empty but initialized)
7. Onboarding record with `status: 'completed'`

**Optional (soft completion score, not blocking):**
- First product created
- Payment method configured (required only for paid plans)
- First site publish
- Shipping settings configured
- Custom domain linked
- Staff members invited

---

## 2. Ownership Boundaries

| Resource | Owner Module | Notes |
|----------|-------------|-------|
| User account (credentials, email, password) | **Auth** (existing) | Auth module creates/manages user documents. Onboarding calls auth but does not own users. |
| Tenant record (plan, status, activation) | **Platform Core** (existing) | Tenant.service creates and manages tenant lifecycle. Onboarding calls `tenantService.createTenant()`. |
| Onboarding progress (steps, state machine, resume) | **Onboarding** (NEW) | New module. Sole owner of onboarding workflow state. Does not own any business data. |
| Business profile (name, currency, settings) | **Business** (existing schema, new service) | Business data owned by the business entity. Onboarding provisions it but does not manage it after completion. |
| Subscription (plan binding, billing state, renewal) | **Subscription** (NEW, within Finance) | Extension of Finance module. Owns subscription lifecycle separately from plan limits (which Platform Core owns). |
| Billing state (payment method, invoices) | **Finance** (existing) | Finance handles payment attempts, invoices, ledger entries. Subscription triggers billing events. |
| Default site | **Builder** (existing) | Builder owns sites. Onboarding calls `builderService` to provision an empty site. |
| Owner role assignment | **Onboarding** (orchestrator) | Onboarding coordinates linking user → tenant → business → role. Role data lives in User + FirestoreDoc. |
| Plan entitlements (limits, feature flags) | **Platform Core** (existing enforcement) | Plan limits enforced by `enforcementService`. Onboarding triggers plan assignment, not limit checks. |

### Separation Rule

Onboarding is an **orchestrator**, not an owner. It calls other module services to provision resources. If onboarding fails, each provisioned resource remains in its owning module's collection. Onboarding tracks what was provisioned and can resume from the last successful step.

---

## 3. Core Entities

### User (existing — `users` collection)
```
uid: string (unique)
email: string (unique, lowercase)
passwordHash: string
displayName?: string
type: 'client_owner' | 'client_staff' | ...
businessId?: string
tenantId?: string
emailVerified: boolean
createdAt: Date
```
**No changes to schema. Onboarding uses the existing User model.**

### Tenant (existing — `tenants` collection)
```
tenantId: string (unique)
status: 'active' | 'suspended' | 'cancelled'
plan: string (planId reference)
planActivation: 'paid' | 'grace' | 'default' | 'trial'
createdAt: Date
```
**One addition: `planActivation` must support `'trial'` value.** Currently supports `'paid' | 'grace' | 'default'`.

### Business (existing — `businesses` collection)
```
businessId: string (unique)
tenantId: string
name: string
owner: { userId: string; email: string }
currency: string
createdAt: Date
```
**No schema changes. Onboarding provisions using existing model.**

### OnboardingProgress (NEW — `onboarding_progress` collection)
```
onboardingId: string (unique)
userId: string (ref to User.uid)
tenantId?: string (set after tenant provisioned)
businessId?: string (set after business provisioned)
status: OnboardingStatus (state machine)
currentStep: string (machine-readable step name)
completedSteps: string[] (ordered list of completed steps)
failedStep?: string | null
failureReason?: string | null
retryCount: number (default: 0)
planIntent: string (which plan the user selected)
trialEndsAt?: Date | null
metadata: {
  signupSource?: string
  referralCode?: string
  adminApprovedBy?: string
  graceReason?: string
}
createdAt: Date
updatedAt: Date
completedAt?: Date | null
abandonedAt?: Date | null
```

### Subscription (NEW — `subscriptions` collection, owned by Finance)
```
subscriptionId: string (unique)
tenantId: string (unique per tenant)
planId: string
status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'grace'
currentPeriodStart: Date
currentPeriodEnd: Date
trialEnd?: Date | null
cancelledAt?: Date | null
paymentProvider?: 'stripe' | 'paymob' | 'manual'
externalSubscriptionId?: string
createdAt: Date
updatedAt: Date
```
**Note:** The existing `modules/finance/subscription.schema.ts` already has a basic Subscription schema. This extends it with proper lifecycle fields.

---

## 4. Onboarding State Machine

### States

```
not_started         — signup intent exists but no action taken
account_created     — User document exists with email + password
email_verified      — user.emailVerified = true
plan_selected       — planIntent set on onboarding record
business_created    — Business + Tenant documents exist
payment_pending     — paid plan selected, awaiting payment
trial_active        — trial plan, tenant active with trial expiry
grace_active        — admin-approved grace, tenant active with grace expiry
paid_active         — payment confirmed, subscription active
store_initialized   — default Site document created
completed           — all required steps done, merchant is live
abandoned           — user did not complete within timeout (30 days)
suspended           — admin or system suspended the onboarding
```

### Valid Transitions

```
not_started       → account_created
account_created   → email_verified
account_created   → abandoned
email_verified    → plan_selected
email_verified    → abandoned
plan_selected     → business_created
plan_selected     → abandoned
business_created  → payment_pending     (if paid plan)
business_created  → trial_active        (if trial plan)
business_created  → grace_active        (if admin-approved grace)
business_created  → store_initialized   (if free plan)
payment_pending   → paid_active         (payment success)
payment_pending   → business_created    (payment failed — retry)
payment_pending   → abandoned           (timeout)
trial_active      → store_initialized
trial_active      → suspended           (trial expired without conversion)
grace_active      → store_initialized
grace_active      → suspended           (grace expired without payment)
paid_active       → store_initialized
store_initialized → completed
completed         → (terminal, but tenant can later be suspended via Tenant module)
abandoned         → account_created     (user returns and resumes)
suspended         → account_created     (admin reactivates)
```

### Invalid Transitions (explicitly forbidden)

```
not_started       → completed           (cannot skip steps)
account_created   → business_created    (email must be verified first)
plan_selected     → completed           (cannot skip provisioning)
payment_pending   → completed           (cannot skip payment)
business_created  → completed           (cannot skip store init)
abandoned         → completed           (must resume from last valid step)
suspended         → completed           (must resume from last valid step)
```

---

## 5. Provisioning Order

### Exact sequence after signup

```
Step 1: CREATE_USER
  → auth.service.register(email, password)
  → Creates User doc with type='client_owner', emailVerified=false
  → Creates OnboardingProgress with status='account_created'
  → IDEMPOTENT: if User with email exists, return existing uid

Step 2: VERIFY_EMAIL
  → Send verification email with token
  → User clicks link → sets emailVerified=true
  → OnboardingProgress → status='email_verified'
  → IDEMPOTENT: if already verified, skip

Step 3: SELECT_PLAN
  → User selects planId (free/starter/pro/enterprise)
  → OnboardingProgress.planIntent = planId
  → OnboardingProgress → status='plan_selected'
  → IDEMPOTENT: can change plan selection until business is created

Step 4: CREATE_BUSINESS_AND_TENANT
  → tenantService.createTenant(tenantId, planId)
  → Business.create({ businessId, tenantId, name, owner })
  → User.updateOne({ uid }, { $set: { tenantId, businessId } })
  → FirestoreDoc.create (staff entry for owner)
  → OnboardingProgress → status='business_created', tenantId, businessId set
  → IDEMPOTENT: check OnboardingProgress.tenantId first
    - If tenantId already set, skip tenant creation
    - If businessId already set, skip business creation
    - Each sub-step checks for existing doc before creating

Step 5a: HANDLE_PAYMENT (paid plans only)
  → Create Subscription with status='pending'
  → Create checkout session (Stripe/Paymob)
  → OnboardingProgress → status='payment_pending'
  → On webhook callback: subscription → 'active'
  → Tenant.planActivation → 'paid'
  → OnboardingProgress → status='paid_active'
  → IDEMPOTENT: webhook uses externalSubscriptionId for dedup

Step 5b: ACTIVATE_TRIAL (trial plans only)
  → Create Subscription with status='trialing', trialEnd=now+14d
  → Tenant.planActivation → 'trial'
  → OnboardingProgress → status='trial_active'
  → IDEMPOTENT: if Subscription already exists for tenant, skip

Step 5c: ACTIVATE_GRACE (admin-approved only)
  → tenantService.activateWithGrace(tenantId, planId, days, reason, actor)
  → Create Subscription with status='grace'
  → OnboardingProgress → status='grace_active'
  → IDEMPOTENT: if already in grace, skip

Step 5d: ACTIVATE_FREE (free plan)
  → Tenant already created with plan='free', planActivation='default'
  → No subscription needed
  → Proceed directly to store init

Step 6: INITIALIZE_STORE
  → Site.create({ tenantId, businessId, name: businessName, status: 'draft' })
  → Seed default notification templates for tenant (already idempotent)
  → Seed default SLA configs (already idempotent)
  → OnboardingProgress → status='store_initialized'
  → IDEMPOTENT: check if Site exists for tenantId first

Step 7: COMPLETE
  → Verify all required resources exist (User, Tenant, Business, Site, valid plan state)
  → OnboardingProgress → status='completed', completedAt=now
  → Emit event: 'onboarding.completed'
  → IDEMPOTENT: if already completed, return success
```

### Retry Safety Matrix

| Step | Can retry? | What happens on retry? |
|------|-----------|----------------------|
| CREATE_USER | Yes | Returns existing user if email matches |
| VERIFY_EMAIL | Yes | Re-sends email; clicking link is idempotent |
| SELECT_PLAN | Yes | Overwrites planIntent |
| CREATE_BUSINESS_AND_TENANT | Yes | Checks each sub-resource; creates only missing ones |
| HANDLE_PAYMENT | Yes | Creates new checkout session; webhook dedup by external ID |
| ACTIVATE_TRIAL | Yes | Checks existing subscription; skips if exists |
| INITIALIZE_STORE | Yes | Checks existing site; skips if exists |
| COMPLETE | Yes | Re-verifies all resources; sets completedAt if not set |

---

## 6. Activation Policy

### When tenant becomes active

| Scenario | Tenant status | Tenant planActivation | When |
|----------|--------------|----------------------|------|
| Free plan | `active` | `default` | Immediately after business creation (Step 4) |
| Trial plan | `active` | `trial` | After trial activation (Step 5b) |
| Paid plan | `active` | `paid` | After payment confirmed (Step 5a webhook) |
| Grace plan | `active` | `grace` | After admin approves grace (Step 5c) |
| Enterprise/manual | `active` | `paid` or `grace` | After admin provisions manually |

### When onboarding is "in progress"

OnboardingProgress.status is anything OTHER than `completed`, `abandoned`, or `suspended`.

### When onboarding is "completed"

ALL of the following are true:
- User exists with `emailVerified: true`
- Tenant exists with `status: 'active'`
- Business exists with `tenantId` set
- User has `tenantId` and `businessId` set
- Plan state is valid (free/trial/paid/grace — not `payment_pending`)
- Default Site exists for the tenant
- OnboardingProgress.status = `completed`

### When store can be published

- Onboarding is `completed`
- Tenant is `active`
- Plan enforcement passes `enforceSiteLimit()`
- Site has at least one section

### When plan entitlements are granted

- Plan limits are enforced from the moment `Tenant.plan` is set
- For trial: full plan limits during trial period
- For grace: full grace-plan limits until grace expiry
- For free: free-plan limits immediately
- For paid: full paid-plan limits after payment confirmation
- **NEVER before successful payment** (except trial/grace/free which are explicitly authorized states)

---

## 7. Failure and Recovery Cases

### Email not verified
- **State:** `account_created`
- **Recovery:** Resend verification email. User can request resend via API.
- **Timeout:** After 30 days without verification, transition to `abandoned`.
- **Impact:** Cannot proceed to plan selection. No resources provisioned beyond User.

### Payment failed
- **State:** `payment_pending`
- **Recovery:** User retries payment. New checkout session created. Old session expires.
- **Timeout:** After 48 hours without payment, remain in `payment_pending`. After 30 days, transition to `abandoned`.
- **Impact:** Tenant exists but `planActivation` remains `default`. No store access.

### Business creation failed
- **State:** `plan_selected` (failed to transition to `business_created`)
- **Recovery:** Retry the provisioning step. Idempotent checks create only missing resources.
- **Impact:** `failedStep='create_business'`, `failureReason` logged. User sees "setup incomplete" in onboarding UI.

### Site initialization failed
- **State:** `paid_active` / `trial_active` / `grace_active` (failed to transition to `store_initialized`)
- **Recovery:** Retry store initialization. If Site.create fails, log error and allow manual retry.
- **Impact:** Merchant can access dashboard but cannot publish. Onboarding shows "almost done."

### Duplicate retry
- **All steps are idempotent.** Retrying any step checks for existing resources before creating.
- User retrying the same step twice produces the same result.
- No duplicate tenants, businesses, or subscriptions.

### User abandoned flow
- **State:** any non-terminal state without activity for 30 days
- **Recovery:** User returns → OnboardingProgress transitions from `abandoned` → `account_created` → resumes from last completed step.
- **Cleanup:** No resources deleted. Orphaned tenants/businesses are acceptable (they're empty shells).

### Grace expired
- **State:** `grace_active` → tenant.planActivation becomes `default` (via tenant.jobs grace expiry)
- **Impact:** Merchant loses paid-plan limits. Existing resources remain readable. New creation blocked by enforcement.
- **Recovery:** Merchant pays → subscription activated → tenant.planActivation → `paid`.

### Downgrade after unpaid path
- **State:** `completed` but payment lapses
- **Impact:** Subscription → `past_due` → `cancelled`. Tenant plan → `free`. Existing resources above free limits become read-only (enforcement blocks new creation, not deletion).

---

## 8. Completion Criteria

### Hard completion (REQUIRED — gates "completed" status)

| Criterion | Check |
|-----------|-------|
| Email verified | `User.emailVerified === true` |
| Business profile exists | `Business.findOne({ tenantId })` returns doc |
| Valid plan state | `Tenant.planActivation` in `['paid', 'trial', 'grace', 'default']` AND NOT `payment_pending` |
| Default site exists | `Site.findOne({ tenantId })` returns doc |
| User linked to tenant | `User.tenantId` is set |

### Soft completion score (OPTIONAL — drives onboarding UX, not system state)

| Item | Points | Description |
|------|--------|-------------|
| First product created | +10 | `Product.findOne({ tenantId })` exists |
| Payment method configured | +15 | Subscription has `paymentProvider` set |
| First site publish | +20 | Site has `activeVersion > 0` |
| Shipping configured | +10 | At least one carrier or shipping zone exists |
| Custom domain linked | +10 | `Domain.findOne({ tenantId })` exists |
| Staff invited | +5 | More than 1 staff member exists |
| Logo uploaded | +5 | Site theme has logo set |

Soft score is purely informational. It drives the onboarding dashboard UI but does not block any system operation.

---

## 9. API Contract List

### Public (no auth required)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/onboarding/signup` | Create user + start onboarding |
| `POST` | `/api/onboarding/verify-email` | Verify email with token |
| `POST` | `/api/onboarding/resend-verification` | Resend verification email |

### Authenticated (requires JWT from signup/login)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/onboarding/progress` | Get current onboarding state + completed steps |
| `POST` | `/api/onboarding/business` | Save business profile info (name, currency) |
| `POST` | `/api/onboarding/select-plan` | Select a plan (free/starter/pro/enterprise) |
| `POST` | `/api/onboarding/create-checkout` | Create payment checkout session (paid plans) |
| `POST` | `/api/onboarding/confirm-subscription` | Webhook callback for payment confirmation |
| `POST` | `/api/onboarding/activate-trial` | Activate trial (trial plans) |
| `POST` | `/api/onboarding/complete` | Verify completion + finalize |
| `POST` | `/api/onboarding/resume` | Resume abandoned onboarding from last step |

### Admin-only

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/admin/onboarding/provision` | Admin creates merchant (replaces `/create-client`) |
| `POST` | `/api/admin/onboarding/:id/activate-grace` | Admin approves grace for a merchant |
| `GET` | `/api/admin/onboarding` | List all onboarding records (with filters) |
| `GET` | `/api/admin/onboarding/:id` | Get specific onboarding details |

### Internal (called by other modules, not exposed as API)

| Service method | Purpose |
|---------------|---------|
| `onboardingService.provisionTenant(onboardingId)` | Idempotent tenant + business + user linking |
| `onboardingService.provisionStore(onboardingId)` | Idempotent site + defaults creation |
| `onboardingService.checkCompletion(onboardingId)` | Verify all hard criteria and transition to completed |
| `onboardingService.handlePaymentWebhook(event)` | Process payment provider callback |
| `onboardingService.abandonStale()` | Background job: mark stale onboardings as abandoned |

---

## 10. Binding Rules for Implementation

1. **Onboarding module is an orchestrator.** It calls other module services. It does NOT directly create User, Tenant, Business, or Site documents — it calls `auth.service`, `tenantService`, `Business.create`, `builderService`.

2. **Every provisioning step must be idempotent.** Check for existing resource before creating. Use `findOne` + conditional `create`, or `updateOne` with `$setOnInsert` + `upsert`.

3. **OnboardingProgress is the single source of truth for onboarding state.** All other modules' data (User.emailVerified, Tenant.plan, Subscription.status) are the source of truth for their own domain — but OnboardingProgress tracks the workflow.

4. **No paid-plan entitlements before successful payment.** The ONLY exceptions are:
   - `trial` — explicitly time-limited, auto-expires
   - `grace` — explicitly admin-approved, auto-expires
   - `free` — always allowed, limited entitlements

5. **State transitions must be validated.** Use the state machine. Invalid transitions throw. All transitions are audited via `auditService.log()`.

6. **Resume must be safe.** A user returning after days/weeks must be able to call `GET /api/onboarding/progress` and see their current step. Calling `POST /api/onboarding/resume` must pick up from the last successful step without duplicating anything.

7. **Failure must be recoverable.** If any provisioning step fails, `OnboardingProgress.failedStep` and `failureReason` are set. The user can retry. The system does not auto-retry provisioning (too risky for payment-related steps).

8. **Events emitted for observability:**
   - `onboarding.started` — after account_created
   - `onboarding.email_verified` — after verification
   - `onboarding.business_created` — after provisioning
   - `onboarding.payment_received` — after payment confirmation
   - `onboarding.completed` — after all criteria met
   - `onboarding.abandoned` — after timeout

9. **Admin provisioning bypasses email verification and payment.** Admin can create a fully provisioned merchant in one call, setting onboarding status directly to `completed`. This replaces the current `/create-client` endpoint.

10. **The existing `/create-client` route must be deprecated** once onboarding is implemented. During migration, both paths coexist but new merchants should use onboarding.

11. **Subscription schema lives in Finance module**, not Onboarding. Onboarding creates the subscription via `financeService.createSubscription()`. Finance owns the subscription lifecycle.

12. **Trial expiry and grace expiry use existing background jobs** (`tenant.jobs.ts` handles grace expiry). A new job for trial expiry follows the same atomic `findOneAndUpdate` pattern.

13. **No UI in this module.** Onboarding module provides API endpoints and state tracking. The frontend consumes the API to render the wizard. The backend never assumes a specific UI flow.

14. **Rate limits on public onboarding endpoints:**
    - Signup: 5/min per IP
    - Verify email: 10/min per IP
    - Resend verification: 3/hour per email
    - Select plan / create checkout: 10/min per user

15. **Onboarding records are never deleted.** Even abandoned onboardings persist for analytics. Use `status` filters for active queries.
