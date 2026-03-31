# XDIGIX Onboarding Schema + API Contract

**Version:** 1.0
**Status:** Contract — not yet implemented
**Source of truth:** `docs/ONBOARDING-ARCHITECTURE.md`

---

## Contradictions Found and Resolved

| # | Contradiction | Resolution |
|---|-------------|------------|
| C1 | Architecture section 5 step 5d says "no subscription needed" for free plan. Section 1 hard completion requires "Subscription record with valid state." | **Resolved:** Free plan gets a Subscription with `status: 'active', planId: 'free', paymentProvider: null`. This keeps completion criteria uniform. The subscription is a zero-cost record. |
| C2 | Architecture's Subscription status list (`trialing`, `active`, `past_due`, `cancelled`, `grace`) does not include `pending`. But step 5a says "Create Subscription with status='pending'." | **Resolved:** Add `'pending'` to Subscription status enum. This represents the payment_pending state before first payment. |

---

## 1. Schema Plan

### 1.1 OnboardingProgress (NEW)

| Property | Details |
|----------|---------|
| **Collection** | `onboarding_progress` |
| **Owner** | Onboarding module |
| **Retention** | Never deleted. Abandoned records persist for analytics. |

**Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `onboardingId` | String | Yes | Generated `ONB-{uuid8}` | Unique. Primary key for all onboarding ops. |
| `userId` | String | Yes | — | Ref to `User.uid`. Set at creation. Unique — one onboarding per user. |
| `tenantId` | String | No | `null` | Set during Step 4 (CREATE_BUSINESS_AND_TENANT). |
| `businessId` | String | No | `null` | Set during Step 4. |
| `status` | OnboardingStatus | Yes | `'not_started'` | State machine enum (12 values). |
| `currentStep` | String | Yes | `'signup'` | Machine-readable step: `signup`, `verify_email`, `select_plan`, `create_business`, `activate_plan`, `init_store`, `complete`. |
| `completedSteps` | [String] | Yes | `[]` | Ordered list of steps that succeeded. |
| `failedStep` | String | No | `null` | Step name that last failed. Cleared on successful retry. |
| `failureReason` | String | No | `null` | Error message from failed step. |
| `retryCount` | Number | Yes | `0` | Incremented on each retry of a failed step. |
| `planIntent` | String | No | `null` | planId the user selected. Set during Step 3. Mutable until Step 4. |
| `trialEndsAt` | Date | No | `null` | Set if trial path chosen. |
| `metadata.signupSource` | String | No | — | UTM or referral source. |
| `metadata.referralCode` | String | No | — | Referral code if any. |
| `metadata.adminApprovedBy` | String | No | — | Admin userId who approved grace/enterprise. |
| `metadata.graceReason` | String | No | — | Reason for grace approval. |
| `metadata.adminProvision` | Boolean | No | `false` | True if created by admin provision endpoint. |
| `createdAt` | Date | Yes | Auto | Mongoose timestamps. |
| `updatedAt` | Date | Yes | Auto | Mongoose timestamps. |
| `completedAt` | Date | No | `null` | Set when status → `completed`. |
| `abandonedAt` | Date | No | `null` | Set when status → `abandoned`. |

**Enums:**

```
OnboardingStatus:
  'not_started' | 'account_created' | 'email_verified' |
  'plan_selected' | 'business_created' | 'payment_pending' |
  'trial_active' | 'grace_active' | 'paid_active' |
  'store_initialized' | 'completed' | 'abandoned' | 'suspended'

OnboardingStep:
  'signup' | 'verify_email' | 'select_plan' | 'create_business' |
  'activate_plan' | 'init_store' | 'complete'
```

**Indexes:**

| Index | Type | Purpose |
|-------|------|---------|
| `{ onboardingId: 1 }` | Unique | Primary lookup. |
| `{ userId: 1 }` | Unique | One onboarding per user. Enables GET progress by JWT userId. |
| `{ status: 1, updatedAt: 1 }` | Compound | Stale onboarding detection job. |
| `{ tenantId: 1 }` | Sparse | Lookup by tenant after provisioning. |
| `{ 'metadata.adminProvision': 1 }` | Sparse | Admin-provisioned filter. |

---

### 1.2 Tenant Addition

| Property | Details |
|----------|---------|
| **Collection** | `tenants` (existing) |
| **Owner** | Platform Core |

**Change required:**

| Field | Current | After |
|-------|---------|-------|
| `planActivation` enum | `'paid' \| 'grace' \| 'default'` | `'paid' \| 'grace' \| 'default' \| 'trial'` |

**New fields (additive, no breaking change):**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `trialExpiresAt` | Date | No | `null` | Set when planActivation → 'trial'. Used by trial expiry job. |

---

### 1.3 Subscription Extension

| Property | Details |
|----------|---------|
| **Collection** | `finance_subscriptions` (existing) |
| **Owner** | Finance module |

**Current fields remain unchanged. New fields added:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `subscriptionId` | String | Yes | Generated `SUB-{uuid8}` | Unique. Replaces reliance on `_id`. |
| `trialEnd` | Date | No | `null` | Trial expiry timestamp. |
| `cancelledAt` | Date | No | `null` | When subscription was cancelled. |
| `paymentProvider` | String | No | `null` | `'stripe' \| 'paymob' \| 'manual' \| null` |
| `externalSubscriptionId` | String | No | `null` | Stripe/Paymob subscription ID for dedup. |
| `onboardingId` | String | No | `null` | Ref to OnboardingProgress. Set during onboarding. |

**Status enum change:**

| Current | After |
|---------|-------|
| `'active' \| 'past_due' \| 'cancelled' \| 'trialing'` | `'pending' \| 'active' \| 'past_due' \| 'cancelled' \| 'trialing' \| 'grace'` |

**New indexes:**

| Index | Type | Purpose |
|-------|------|---------|
| `{ subscriptionId: 1 }` | Unique | Primary lookup by ID. |
| `{ externalSubscriptionId: 1 }` | Unique, sparse | Webhook deduplication. |
| `{ status: 1, currentPeriodEnd: 1 }` | Compound | Expiry/renewal job queries. |

---

### 1.4 EmailVerificationToken (NEW)

| Property | Details |
|----------|---------|
| **Collection** | `email_verification_tokens` |
| **Owner** | Auth module (or Onboarding — see note) |
| **Retention** | TTL: auto-delete 24 hours after creation. |

**Note:** Auth module owns email credentials. If Auth already has a verification mechanism, use it. If not, Onboarding creates this collection and delegates verification to it.

**Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `token` | String | Yes | `crypto.randomBytes(32).toString('hex')` | Unique. URL-safe. |
| `userId` | String | Yes | — | Ref to User.uid. |
| `email` | String | Yes | — | Email to verify. |
| `used` | Boolean | Yes | `false` | Prevents reuse. |
| `createdAt` | Date | Yes | Auto | TTL anchor. |

**Indexes:**

| Index | Type | Purpose |
|-------|------|---------|
| `{ token: 1 }` | Unique | Lookup by token. |
| `{ userId: 1 }` | Standard | Lookup by user. |
| `{ createdAt: 1 }` | TTL (86400s) | Auto-expire after 24h. |

---

### 1.5 PaymentSession (NEW, optional — only if tracking checkout sessions)

| Property | Details |
|----------|---------|
| **Collection** | `payment_sessions` |
| **Owner** | Finance module |
| **Retention** | TTL: auto-delete 72 hours after creation. |

**Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `sessionId` | String | Yes | Generated | Unique. XDIGIX-internal session ID. |
| `onboardingId` | String | Yes | — | Ref to OnboardingProgress. |
| `tenantId` | String | Yes | — | |
| `planId` | String | Yes | — | Plan being purchased. |
| `provider` | String | Yes | — | `'stripe' \| 'paymob'` |
| `externalSessionId` | String | No | — | Stripe checkout session ID or Paymob order ID. |
| `status` | String | Yes | `'created'` | `'created' \| 'completed' \| 'expired' \| 'failed'` |
| `amount` | Number | Yes | — | Plan price in smallest currency unit. |
| `currency` | String | Yes | — | ISO currency code. |
| `createdAt` | Date | Yes | Auto | TTL anchor. |
| `completedAt` | Date | No | `null` | Set on successful payment callback. |

**Indexes:**

| Index | Type | Purpose |
|-------|------|---------|
| `{ sessionId: 1 }` | Unique | Primary lookup. |
| `{ externalSessionId: 1 }` | Unique, sparse | Webhook correlation. |
| `{ onboardingId: 1 }` | Standard | Link back to onboarding. |
| `{ createdAt: 1 }` | TTL (259200s) | Auto-expire after 72h. |

---

## 2. Resource Ownership Map

| Field Group | Owner Module | Collection | Access Pattern |
|-------------|-------------|------------|----------------|
| User credentials (email, password, emailVerified) | **Auth** | `users` | Onboarding calls auth.service to create/verify |
| User tenant/business linking (tenantId, businessId) | **Auth** (field owner), **Onboarding** (sets values) | `users` | Onboarding calls `User.updateOne` via auth service |
| Tenant lifecycle (status, plan, planActivation) | **Platform Core** | `tenants` | Onboarding calls `tenantService.createTenant()` |
| Tenant trial fields (trialExpiresAt) | **Platform Core** | `tenants` | Onboarding triggers, Platform Core owns |
| Onboarding progress (state, steps, resume) | **Onboarding** | `onboarding_progress` | Sole owner. No other module writes here. |
| Business profile (name, currency, owner) | **Business** (schema owner) | `businesses` | Onboarding provisions, business module manages after |
| Subscription lifecycle (plan binding, billing cycle) | **Finance** | `finance_subscriptions` | Onboarding creates via `financeService.createSubscription()` |
| Payment sessions (checkout intents) | **Finance** | `payment_sessions` | Onboarding triggers, Finance manages sessions |
| Email verification tokens | **Auth** | `email_verification_tokens` | Onboarding triggers send, Auth owns the token lifecycle |
| Default site | **Builder** | `sites` | Onboarding calls `builderService` or `Site.create()` |
| Owner staff entry | **Business** (FirestoreDoc) | `firestoredocs` | Onboarding provisions the staff entry |
| Plan limits / enforcement | **Platform Core** | `plans` | Not modified by onboarding. Read-only reference. |

---

## 3. Idempotency Strategy

### 3.1 Onboarding Record Creation

| Aspect | Strategy |
|--------|----------|
| Key | `userId` (unique index on `onboarding_progress`) |
| Behavior | `updateOne({ userId }, { $setOnInsert: { ...initial } }, { upsert: true })` |
| On duplicate | Returns existing record. No error. |
| Recovery | If record exists with `status: 'abandoned'`, transition back to `account_created` via resume. |

### 3.2 Tenant Creation

| Aspect | Strategy |
|--------|----------|
| Key | `OnboardingProgress.tenantId` — if already set, skip creation |
| Behavior | Before creating: `if (onboarding.tenantId) return onboarding.tenantId;` then `tenantService.createTenant(newId, plan)` |
| On duplicate | Tenant uniqueness enforced by `tenantId` unique index. If somehow a dupe attempt, Mongo rejects. Catch error, return existing. |
| Recovery | If tenant created but onboarding.tenantId not set (crash between ops), `Tenant.findOne({ tenantId: generatedId })` — if exists, update onboarding. |
| ID generation | tenantId generated before creation, stored as candidate in onboarding metadata. If creation succeeds, persist to onboarding.tenantId. |

### 3.3 Business Creation

| Aspect | Strategy |
|--------|----------|
| Key | `OnboardingProgress.businessId` — if already set, skip creation |
| Behavior | Same check-before-create as tenant. |
| On duplicate | `businessId` unique index prevents duplicates. |
| Recovery | Same as tenant — check for existing business with candidate ID. |

### 3.4 Default Site Creation

| Aspect | Strategy |
|--------|----------|
| Key | `Site.findOne({ tenantId })` — if site exists, skip |
| Behavior | Check → create only if missing. |
| On duplicate | Second create attempt for same tenantId may succeed (sites don't have tenant uniqueness by default). Use `updateOne({ tenantId, businessId }, { $setOnInsert: { ...siteData } }, { upsert: true })` on a compound unique index, OR check before create. |
| Recovery | If site created but onboarding not updated, next progress check detects site exists. |

### 3.5 Owner Role Assignment

| Aspect | Strategy |
|--------|----------|
| Key | `User.tenantId` — if already set, skip |
| Behavior | `User.updateOne({ uid, tenantId: null }, { $set: { tenantId, businessId } })` — only updates if tenantId is null. |
| On duplicate | If user already has tenantId set, `updateOne` matches 0 docs. Safe no-op. |
| Recovery | If User updated but FirestoreDoc staff entry missing, check and create the staff entry separately. |

### 3.6 Subscription Creation

| Aspect | Strategy |
|--------|----------|
| Key | `tenantId` unique index on `finance_subscriptions` |
| Behavior | `Subscription.updateOne({ tenantId }, { $setOnInsert: { ...subData } }, { upsert: true })` |
| On duplicate | Returns existing. No error. |
| Recovery | If subscription exists but onboarding status not updated, next progress check detects subscription. |

### 3.7 Payment Session Creation

| Aspect | Strategy |
|--------|----------|
| Key | `onboardingId + planId` compound — one session per onboarding+plan |
| Behavior | Check for existing non-expired session. If exists and status='created', return it. If expired/failed, create new. |
| On duplicate | Multiple active sessions for same onboarding are safe (user pays whichever). Only one webhook callback succeeds. |
| Recovery | Stale sessions auto-expire via TTL (72h). |

### 3.8 Onboarding Completion

| Aspect | Strategy |
|--------|----------|
| Key | `OnboardingProgress.status` — if already `completed`, return success |
| Behavior | `findOneAndUpdate({ onboardingId, status: { $ne: 'completed' } }, { $set: { status: 'completed', completedAt } })` |
| On duplicate | Atomic update matches 0 if already completed. Returns null → service returns existing record. |
| Recovery | If completion event fails to emit but status is set, next call to getProgress shows completed. Event is eventual. |

---

## 4. API Contract Design

### 4.1 POST /api/onboarding/signup

| Property | Value |
|----------|-------|
| **Auth** | None (public) |
| **Rate limit** | 5/min per IP |
| **Owner** | Onboarding module |

**Request:**
```
{
  email: string          // required, valid email
  password: string       // required, min 8, 1 upper, 1 lower, 1 digit
  displayName?: string   // optional, max 100
  signupSource?: string  // optional, UTM source
  referralCode?: string  // optional
}
```

**Response 201:**
```
{
  ok: true
  onboardingId: string
  userId: string
  accessToken: string    // JWT for subsequent calls
  refreshToken: string
  expiresIn: number
  nextStep: 'verify_email'
}
```

**Response 409 (email exists, active onboarding):**
```
{
  ok: false
  error: 'Email already registered'
  code: 'ONBOARDING_EMAIL_EXISTS'
}
```

**Response 409 (email exists, abandoned onboarding):**
```
{
  ok: false
  error: 'Account exists. Please log in to resume.'
  code: 'ONBOARDING_RESUMABLE'
  resumable: true
}
```

**Validation:**
- email: valid format, lowercase, trimmed
- password: min 8 chars, 1 uppercase, 1 lowercase, 1 digit

**Side effects:**
- Creates User doc (type='client_owner', emailVerified=false)
- Creates OnboardingProgress (status='account_created')
- Creates RefreshToken
- Sends verification email
- Emits `onboarding.started` event
- Audit log: `onboarding/signup`

**Error cases:**
- 400: Invalid email or weak password
- 409: Email exists
- 429: Rate limited
- 500: DB failure (partial state possible — see idempotency 3.1)

---

### 4.2 POST /api/onboarding/verify-email

| Property | Value |
|----------|-------|
| **Auth** | None (public — token in body) |
| **Rate limit** | 10/min per IP |
| **Owner** | Onboarding module (delegates to Auth) |

**Request:**
```
{
  token: string          // required, verification token from email
}
```

**Response 200:**
```
{
  ok: true
  status: 'email_verified'
  nextStep: 'select_plan'
}
```

**Side effects:**
- Sets User.emailVerified = true (atomic)
- Marks EmailVerificationToken.used = true (atomic)
- OnboardingProgress → status='email_verified'
- Emits `onboarding.email_verified` event

**Error cases:**
- 400: Missing token
- 404: Invalid or expired token
- 409: Already verified (returns success anyway — idempotent)

---

### 4.3 POST /api/onboarding/resend-verification

| Property | Value |
|----------|-------|
| **Auth** | JWT required |
| **Rate limit** | 3/hour per email |
| **Owner** | Onboarding module |

**Request:**
```
{}  // userId from JWT
```

**Response 200:**
```
{
  ok: true
  message: 'Verification email sent'
}
```

**Side effects:**
- Creates new EmailVerificationToken (old ones still valid until TTL)
- Sends verification email

---

### 4.4 GET /api/onboarding/progress

| Property | Value |
|----------|-------|
| **Auth** | JWT required |
| **Rate limit** | 30/min per user |
| **Owner** | Onboarding module |

**Request:** None (userId from JWT)

**Response 200:**
```
{
  ok: true
  onboarding: {
    onboardingId: string
    status: OnboardingStatus
    currentStep: string
    completedSteps: string[]
    failedStep: string | null
    failureReason: string | null
    planIntent: string | null
    tenantId: string | null
    businessId: string | null
    completionScore: {
      required: { emailVerified: bool, businessExists: bool, planValid: bool, siteExists: bool, userLinked: bool }
      optional: { productCreated: bool, paymentConfigured: bool, sitePublished: bool, ... }
      score: number   // 0-100
    }
    createdAt: Date
    updatedAt: Date
  }
}
```

**Side effects:** None (read-only). May re-evaluate completion score.

---

### 4.5 POST /api/onboarding/business

| Property | Value |
|----------|-------|
| **Auth** | JWT required |
| **Rate limit** | 10/min per user |
| **Owner** | Onboarding module (orchestrates Business + Tenant creation) |

**Precondition:** OnboardingProgress.status must be `plan_selected`.

**Request:**
```
{
  businessName: string    // required, 2-200 chars
  currency?: string       // optional, default 'EGP', ISO 4217
}
```

**Response 200:**
```
{
  ok: true
  tenantId: string
  businessId: string
  status: 'business_created'
  nextStep: 'activate_plan'
}
```

**Side effects:**
- Creates Tenant via `tenantService.createTenant()`
- Creates Business doc
- Links User to Tenant + Business
- Creates FirestoreDoc staff entry (owner role)
- OnboardingProgress → status='business_created', tenantId/businessId set
- Emits `onboarding.business_created` event
- Audit log: `onboarding/business_created`

**Error cases:**
- 400: Missing businessName or invalid currency
- 409: Business/Tenant already created (returns existing — idempotent)
- 422: Wrong onboarding state (email not verified, plan not selected)

---

### 4.6 POST /api/onboarding/select-plan

| Property | Value |
|----------|-------|
| **Auth** | JWT required |
| **Rate limit** | 10/min per user |
| **Owner** | Onboarding module |

**Precondition:** OnboardingProgress.status must be `email_verified` (or `plan_selected` for re-selection).

**Request:**
```
{
  planId: string          // required, must exist in Plans collection
}
```

**Response 200:**
```
{
  ok: true
  planIntent: string
  status: 'plan_selected'
  planDetails: { name, price, currency, limits }
  nextStep: 'create_business'
}
```

**Side effects:**
- OnboardingProgress.planIntent = planId
- OnboardingProgress → status='plan_selected'
- Emits `onboarding.plan_selected` event

**Error cases:**
- 400: Missing planId
- 404: Plan not found or inactive
- 422: Wrong onboarding state

---

### 4.7 POST /api/onboarding/create-checkout

| Property | Value |
|----------|-------|
| **Auth** | JWT required |
| **Rate limit** | 10/min per user |
| **Owner** | Onboarding module (delegates to Finance) |

**Precondition:** OnboardingProgress.status must be `business_created`. planIntent must be a paid plan.

**Request:**
```
{
  provider: 'stripe' | 'paymob'     // required
  successUrl: string                 // required, frontend callback URL
  cancelUrl: string                  // required, frontend callback URL
}
```

**Response 200:**
```
{
  ok: true
  sessionId: string                  // XDIGIX session ID
  checkoutUrl: string                // Redirect URL for payment page
  status: 'payment_pending'
}
```

**Side effects:**
- Creates Subscription (status='pending')
- Creates PaymentSession
- Calls Stripe/Paymob to create checkout session
- OnboardingProgress → status='payment_pending'
- Emits `onboarding.payment_pending` event

**Error cases:**
- 400: Invalid provider or missing URLs
- 422: Plan is free/trial (no checkout needed)
- 422: Wrong onboarding state
- 502: Payment provider error

---

### 4.8 POST /api/onboarding/confirm-subscription

| Property | Value |
|----------|-------|
| **Auth** | Webhook signature (Stripe/Paymob) OR JWT |
| **Rate limit** | None (webhook) |
| **Owner** | Onboarding module (delegates to Finance) |

**Request (webhook):**
```
{
  provider: 'stripe' | 'paymob'
  externalSubscriptionId: string
  externalSessionId: string
  status: 'active' | 'failed'
}
```

**Response 200:**
```
{ ok: true }
```

**Side effects (on success):**
- Subscription → status='active'
- Tenant.planActivation → 'paid'
- PaymentSession → status='completed'
- OnboardingProgress → status='paid_active'
- Emits `onboarding.payment_succeeded` event
- Audit log: `onboarding/payment_confirmed`

**Idempotency:** `externalSubscriptionId` unique index prevents double-processing.

---

### 4.9 POST /api/onboarding/activate-trial

| Property | Value |
|----------|-------|
| **Auth** | JWT required |
| **Rate limit** | 10/min per user |
| **Owner** | Onboarding module (delegates to Platform Core + Finance) |

**Precondition:** OnboardingProgress.status must be `business_created`. planIntent must be a trial-eligible plan.

**Request:**
```
{}  // No additional input — trial terms from plan config
```

**Response 200:**
```
{
  ok: true
  status: 'trial_active'
  trialEndsAt: Date    // 14 days from now
  nextStep: 'init_store'
}
```

**Side effects:**
- Creates Subscription (status='trialing', trialEnd=now+14d)
- Tenant.planActivation → 'trial'
- Tenant.trialExpiresAt → now+14d
- OnboardingProgress → status='trial_active', trialEndsAt set
- Emits `onboarding.trial_started` event

---

### 4.10 POST /api/onboarding/complete

| Property | Value |
|----------|-------|
| **Auth** | JWT required |
| **Rate limit** | 10/min per user |
| **Owner** | Onboarding module |

**Precondition:** OnboardingProgress.status must be `store_initialized`.

**Request:**
```
{}  // Completion is a verification step, no additional input
```

**Response 200:**
```
{
  ok: true
  status: 'completed'
  completedAt: Date
  tenantId: string
  businessId: string
}
```

**Side effects:**
- Verifies all hard completion criteria (email, business, plan, site, user link)
- OnboardingProgress → status='completed', completedAt=now
- Emits `onboarding.completed` event
- Audit log: `onboarding/completed`

**Error cases:**
- 422: Hard criteria not met (returns which criteria failed)
- 409: Already completed (returns success — idempotent)

---

### 4.11 POST /api/onboarding/resume

| Property | Value |
|----------|-------|
| **Auth** | JWT required |
| **Rate limit** | 10/min per user |
| **Owner** | Onboarding module |

**Precondition:** OnboardingProgress.status is `abandoned` or `suspended`.

**Request:**
```
{}
```

**Response 200:**
```
{
  ok: true
  status: 'account_created'     // or last completed step
  currentStep: string
  completedSteps: string[]
  nextStep: string
}
```

**Side effects:**
- OnboardingProgress → status transitions from abandoned/suspended to last valid step
- Clears failedStep, failureReason
- Audit log: `onboarding/resumed`

---

### 4.12 POST /api/admin/onboarding/provision

| Property | Value |
|----------|-------|
| **Auth** | Admin JWT required |
| **Rate limit** | Standard admin limit |
| **Owner** | Onboarding module |

**Request:**
```
{
  email: string
  password: string
  businessName: string
  displayName?: string
  planId: string              // 'free' | 'starter' | 'pro' | 'enterprise'
  planActivation: 'paid' | 'trial' | 'grace' | 'default'
  graceDays?: number          // required if planActivation='grace'
  graceReason?: string        // required if planActivation='grace'
  currency?: string
}
```

**Response 201:**
```
{
  ok: true
  onboardingId: string
  userId: string
  tenantId: string
  businessId: string
  status: 'completed'
}
```

**Side effects:**
- Runs ALL provisioning steps atomically (user, tenant, business, site, subscription)
- Sets emailVerified=true (admin bypass)
- OnboardingProgress created with status='completed' directly
- metadata.adminProvision = true
- Emits `onboarding.completed` event
- Audit log: `onboarding/admin_provisioned`

---

### 4.13 POST /api/admin/onboarding/:id/activate-grace

| Property | Value |
|----------|-------|
| **Auth** | Admin JWT required |
| **Owner** | Onboarding module (delegates to Platform Core) |

**Precondition:** OnboardingProgress.status must be `business_created` or `payment_pending`.

**Request:**
```
{
  planId: string
  graceDays: number       // 1-365
  reason: string
}
```

**Response 200:**
```
{
  ok: true
  status: 'grace_active'
  graceExpiresAt: Date
}
```

---

### 4.14 GET /api/admin/onboarding

| Property | Value |
|----------|-------|
| **Auth** | Admin JWT required |

**Query params:** `status`, `planIntent`, `page`, `limit`, `from`, `to`

**Response 200:**
```
{
  ok: true
  onboardings: OnboardingProgress[]
  total: number
  page: number
  limit: number
}
```

---

## 5. Service Interface Design

### 5.1 onboardingService.start(input)

| Property | Value |
|----------|-------|
| **Inputs** | `{ email, password, displayName?, signupSource?, referralCode? }` |
| **Outputs** | `{ onboardingId, userId, accessToken, refreshToken, nextStep }` |
| **Preconditions** | Email not already in active onboarding |
| **Side effects** | Creates User, OnboardingProgress, RefreshToken. Sends verification email. |
| **Events** | `onboarding.started` |

### 5.2 onboardingService.verifyEmail(token)

| Property | Value |
|----------|-------|
| **Inputs** | `{ token: string }` |
| **Outputs** | `{ ok, status, nextStep }` |
| **Preconditions** | Valid, unexpired, unused verification token |
| **Side effects** | User.emailVerified → true. OnboardingProgress → 'email_verified'. |
| **Events** | `onboarding.email_verified` |

### 5.3 onboardingService.selectPlan(userId, planId)

| Property | Value |
|----------|-------|
| **Inputs** | `{ userId, planId }` |
| **Outputs** | `{ ok, planIntent, planDetails, nextStep }` |
| **Preconditions** | Onboarding status is `email_verified` or `plan_selected` |
| **Side effects** | OnboardingProgress.planIntent → planId, status → 'plan_selected'. |
| **Events** | `onboarding.plan_selected` |

### 5.4 onboardingService.provisionBusiness(userId, businessName, currency)

| Property | Value |
|----------|-------|
| **Inputs** | `{ userId, businessName, currency? }` |
| **Outputs** | `{ tenantId, businessId, status }` |
| **Preconditions** | Onboarding status is `plan_selected` |
| **Side effects** | Creates Tenant, Business, links User, creates staff entry. |
| **Events** | `onboarding.business_created` |

### 5.5 onboardingService.createCheckoutSession(userId, provider, successUrl, cancelUrl)

| Property | Value |
|----------|-------|
| **Inputs** | `{ userId, provider, successUrl, cancelUrl }` |
| **Outputs** | `{ sessionId, checkoutUrl, status }` |
| **Preconditions** | Status is `business_created`, planIntent is paid |
| **Side effects** | Creates Subscription (pending), PaymentSession. Calls payment provider. |
| **Events** | `onboarding.payment_pending` |

### 5.6 onboardingService.handlePaymentWebhook(webhookPayload)

| Property | Value |
|----------|-------|
| **Inputs** | Provider-specific webhook payload |
| **Outputs** | `{ ok }` |
| **Preconditions** | Valid webhook signature |
| **Side effects** | Subscription → active, Tenant.planActivation → paid, OnboardingProgress → paid_active. |
| **Events** | `onboarding.payment_succeeded` |

### 5.7 onboardingService.activateTrial(userId)

| Property | Value |
|----------|-------|
| **Inputs** | `{ userId }` |
| **Outputs** | `{ ok, trialEndsAt, status }` |
| **Preconditions** | Status is `business_created`, planIntent is trial-eligible |
| **Side effects** | Creates Subscription (trialing), Tenant.planActivation → trial. |
| **Events** | `onboarding.trial_started` |

### 5.8 onboardingService.initializeStore(userId)

| Property | Value |
|----------|-------|
| **Inputs** | `{ userId }` |
| **Outputs** | `{ ok, siteId, status }` |
| **Preconditions** | Status is `paid_active` or `trial_active` or `grace_active` or (`business_created` for free plan) |
| **Side effects** | Creates default Site. Seeds tenant-specific defaults. |
| **Events** | `onboarding.site_initialized` |

### 5.9 onboardingService.complete(userId)

| Property | Value |
|----------|-------|
| **Inputs** | `{ userId }` |
| **Outputs** | `{ ok, completedAt, completionScore }` |
| **Preconditions** | Status is `store_initialized`. All hard criteria met. |
| **Side effects** | OnboardingProgress → completed, completedAt set. |
| **Events** | `onboarding.completed` |

### 5.10 onboardingService.abandonStale()

| Property | Value |
|----------|-------|
| **Inputs** | None (background job) |
| **Outputs** | `number` (count of abandoned) |
| **Preconditions** | Called by setInterval every 24 hours |
| **Side effects** | OnboardingProgress where status not in terminal states and updatedAt < 30 days ago → status='abandoned'. |
| **Events** | `onboarding.abandoned` for each |

---

## 6. Event Contract Design

### 6.1 onboarding.started

| Property | Value |
|----------|-------|
| **Emitter** | onboardingService.start() |
| **Consumers** | Notifications (welcome email), Analytics |
| **Payload** | `{ onboardingId, userId, email, signupSource? }` |
| **Idempotency** | Safe to replay — notification dedup by correlationId |

### 6.2 onboarding.email_verified

| Property | Value |
|----------|-------|
| **Emitter** | onboardingService.verifyEmail() |
| **Consumers** | Notifications (verified confirmation), Analytics |
| **Payload** | `{ onboardingId, userId, email }` |

### 6.3 onboarding.plan_selected

| Property | Value |
|----------|-------|
| **Emitter** | onboardingService.selectPlan() |
| **Consumers** | Analytics |
| **Payload** | `{ onboardingId, userId, planId }` |

### 6.4 onboarding.business_created

| Property | Value |
|----------|-------|
| **Emitter** | onboardingService.provisionBusiness() |
| **Consumers** | Analytics, Reporting |
| **Payload** | `{ onboardingId, userId, tenantId, businessId, businessName }` |

### 6.5 onboarding.payment_pending

| Property | Value |
|----------|-------|
| **Emitter** | onboardingService.createCheckoutSession() |
| **Consumers** | Analytics |
| **Payload** | `{ onboardingId, tenantId, planId, provider, sessionId }` |

### 6.6 onboarding.payment_succeeded

| Property | Value |
|----------|-------|
| **Emitter** | onboardingService.handlePaymentWebhook() |
| **Consumers** | Notifications (payment confirmed), Finance (ledger entry), Analytics |
| **Payload** | `{ onboardingId, tenantId, planId, subscriptionId, amount, currency }` |

### 6.7 onboarding.trial_started

| Property | Value |
|----------|-------|
| **Emitter** | onboardingService.activateTrial() |
| **Consumers** | Notifications (trial welcome), Analytics |
| **Payload** | `{ onboardingId, tenantId, planId, trialEndsAt }` |

### 6.8 onboarding.grace_started

| Property | Value |
|----------|-------|
| **Emitter** | Admin activate-grace endpoint |
| **Consumers** | Notifications, Analytics |
| **Payload** | `{ onboardingId, tenantId, planId, graceExpiresAt, approvedBy }` |

### 6.9 onboarding.site_initialized

| Property | Value |
|----------|-------|
| **Emitter** | onboardingService.initializeStore() |
| **Consumers** | Analytics |
| **Payload** | `{ onboardingId, tenantId, siteId }` |

### 6.10 onboarding.completed

| Property | Value |
|----------|-------|
| **Emitter** | onboardingService.complete() |
| **Consumers** | Notifications (onboarding complete), Reporting (tenant growth), Analytics |
| **Payload** | `{ onboardingId, userId, tenantId, businessId, planId, completedAt }` |

### 6.11 onboarding.abandoned

| Property | Value |
|----------|-------|
| **Emitter** | onboardingService.abandonStale() |
| **Consumers** | Notifications (win-back email), Analytics |
| **Payload** | `{ onboardingId, userId, lastStatus, lastStep, abandonedAt }` |

### 6.12 onboarding.suspended

| Property | Value |
|----------|-------|
| **Emitter** | System (trial/grace expiry without conversion) |
| **Consumers** | Notifications, Analytics |
| **Payload** | `{ onboardingId, tenantId, reason }` |

---

## 7. Guardrails

| Rule | Enforcement Point |
|------|-------------------|
| No paid entitlements before payment | `enforcementService` checks `Tenant.planActivation`. `'default'` and `'pending'` get free-plan limits only. |
| Grace is admin-only | `activate-grace` endpoint requires admin JWT. onboardingService rejects non-admin callers. |
| Trial must be policy-based | Trial duration (14 days) comes from plan config, not user input. No custom trial lengths via API. |
| Onboarding must be resumable | `GET /progress` always returns current state. `POST /resume` transitions from abandoned/suspended. |
| No silent partial provisioning | Every provisioning sub-step updates OnboardingProgress with what was created. failedStep/failureReason set on error. |
| No duplicate site creation | `Site.findOne({ tenantId })` check before creation. |
| No duplicate subscription creation | `tenantId` unique index on `finance_subscriptions`. |
| Completion requires hard requirements only | `onboardingService.complete()` checks 5 hard criteria. Optional items affect score, not status. |
| Optional steps must not block completion | Soft completion score is informational only. |
| All activation transitions audited | Every state change calls `auditService.log()` with actor, module='onboarding', and transition details. |

---

## 8. Summary Lists

### Schemas (6)

| # | Schema | Collection | Owner | Status |
|---|--------|------------|-------|--------|
| S1 | OnboardingProgress | `onboarding_progress` | Onboarding | NEW |
| S2 | Tenant (extension) | `tenants` | Platform Core | MODIFY (add `'trial'` to planActivation, add `trialExpiresAt`) |
| S3 | Subscription (extension) | `finance_subscriptions` | Finance | MODIFY (add 6 fields, 2 status values, 3 indexes) |
| S4 | EmailVerificationToken | `email_verification_tokens` | Auth | NEW |
| S5 | PaymentSession | `payment_sessions` | Finance | NEW |
| S6 | User, Business, Site | existing | existing owners | NO CHANGES |

### Endpoints (14)

| # | Method | Path | Auth | Owner |
|---|--------|------|------|-------|
| E1 | POST | `/api/onboarding/signup` | None | Onboarding |
| E2 | POST | `/api/onboarding/verify-email` | None | Onboarding |
| E3 | POST | `/api/onboarding/resend-verification` | JWT | Onboarding |
| E4 | GET | `/api/onboarding/progress` | JWT | Onboarding |
| E5 | POST | `/api/onboarding/select-plan` | JWT | Onboarding |
| E6 | POST | `/api/onboarding/business` | JWT | Onboarding |
| E7 | POST | `/api/onboarding/create-checkout` | JWT | Onboarding |
| E8 | POST | `/api/onboarding/confirm-subscription` | Webhook sig | Onboarding |
| E9 | POST | `/api/onboarding/activate-trial` | JWT | Onboarding |
| E10 | POST | `/api/onboarding/complete` | JWT | Onboarding |
| E11 | POST | `/api/onboarding/resume` | JWT | Onboarding |
| E12 | POST | `/api/admin/onboarding/provision` | Admin JWT | Onboarding |
| E13 | POST | `/api/admin/onboarding/:id/activate-grace` | Admin JWT | Onboarding |
| E14 | GET | `/api/admin/onboarding` | Admin JWT | Onboarding |

### Services (10)

| # | Method | Owner |
|---|--------|-------|
| SV1 | `onboardingService.start()` | Onboarding |
| SV2 | `onboardingService.verifyEmail()` | Onboarding |
| SV3 | `onboardingService.selectPlan()` | Onboarding |
| SV4 | `onboardingService.provisionBusiness()` | Onboarding |
| SV5 | `onboardingService.createCheckoutSession()` | Onboarding |
| SV6 | `onboardingService.handlePaymentWebhook()` | Onboarding |
| SV7 | `onboardingService.activateTrial()` | Onboarding |
| SV8 | `onboardingService.initializeStore()` | Onboarding |
| SV9 | `onboardingService.complete()` | Onboarding |
| SV10 | `onboardingService.abandonStale()` | Onboarding (job) |

### Events (12)

| # | Event | Emitter |
|---|-------|---------|
| EV1 | `onboarding.started` | start() |
| EV2 | `onboarding.email_verified` | verifyEmail() |
| EV3 | `onboarding.plan_selected` | selectPlan() |
| EV4 | `onboarding.business_created` | provisionBusiness() |
| EV5 | `onboarding.payment_pending` | createCheckoutSession() |
| EV6 | `onboarding.payment_succeeded` | handlePaymentWebhook() |
| EV7 | `onboarding.trial_started` | activateTrial() |
| EV8 | `onboarding.grace_started` | admin activate-grace |
| EV9 | `onboarding.site_initialized` | initializeStore() |
| EV10 | `onboarding.completed` | complete() |
| EV11 | `onboarding.abandoned` | abandonStale() |
| EV12 | `onboarding.suspended` | system (trial/grace expiry) |

### Recommended Implementation Order

| Phase | Items | Rationale |
|-------|-------|-----------|
| **Phase 1** | S1 (OnboardingProgress), S4 (EmailVerificationToken), SV1-SV3, E1-E5 | Account creation + email verification + plan selection. No payment, no provisioning. Testable in isolation. |
| **Phase 2** | SV4 (provisionBusiness), SV8 (initializeStore), SV9 (complete), E6, E10 | Business+tenant+site provisioning for free plan. End-to-end free onboarding works. |
| **Phase 3** | S2 (Tenant trial), S3 (Subscription extension), SV7, E9 | Trial plan path. Extends subscription schema. |
| **Phase 4** | S5 (PaymentSession), SV5-SV6, E7-E8 | Paid plan path. Requires payment provider integration (Stripe/Paymob). |
| **Phase 5** | E12-E14 (admin endpoints), SV10 (abandonStale job) | Admin provisioning, grace activation, background cleanup. |
| **Phase 6** | Event handlers (EV1-EV12), notification templates | Wire events to notifications. Non-blocking. |
