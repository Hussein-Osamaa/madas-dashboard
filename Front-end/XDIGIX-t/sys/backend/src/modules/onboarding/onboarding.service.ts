/**
 * Onboarding service — Wave 1+2: start, progress, resume, email verification,
 * free-plan completion.
 *
 * Orchestrates user/tenant/business provisioning but does NOT own those entities.
 * OnboardingProgress is the sole source of truth for workflow state.
 */
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import {
  OnboardingProgress, IOnboardingProgress, OnboardingStatus, OnboardingStep,
  validateOnboardingTransition,
} from './onboarding-progress.schema';
import {
  EmailVerificationToken, generateVerificationToken, tokenExpiresAt,
} from './email-verification-token.schema';
import { auditService } from '../platform-core/audit.service';
import { eventBus } from '../platform-core/event-bus.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('onboarding');

/* ── Types ────────────────────────────────────────────────────────── */

export interface StartInput {
  userId: string;
  email: string;
  signupSource?: string;
  referralCode?: string;
}

export interface BusinessInput {
  businessName: string;
  currency?: string;
}

export interface CompletionCheck {
  emailVerified: boolean;
  businessExists: boolean;
  planValid: boolean;
  siteExists: boolean;
  userLinked: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function genId(): string {
  return `ONB-${uuidv4().slice(0, 8).toUpperCase()}`;
}

async function transition(
  onboardingId: string,
  from: OnboardingStatus,
  to: OnboardingStatus,
  updates: Record<string, unknown> = {},
): Promise<IOnboardingProgress | null> {
  validateOnboardingTransition(from, to);
  const merged: Record<string, unknown> = { status: to, ...updates };
  if (to === 'completed') merged.completedAt = new Date();
  if (to === 'abandoned') merged.abandonedAt = new Date();

  return OnboardingProgress.findOneAndUpdate(
    { onboardingId, status: from },
    { $set: merged },
    { new: true },
  ).lean<IOnboardingProgress>();
}

/* ── Service ──────────────────────────────────────────────────────── */

export const onboardingService = {

  /**
   * Start a new onboarding record for a user. Idempotent — returns existing if found.
   */
  async start(input: StartInput): Promise<IOnboardingProgress> {
    // Idempotent: check for existing onboarding by userId
    const existing = await OnboardingProgress.findOne({ userId: input.userId }).lean<IOnboardingProgress>();
    if (existing) {
      log.info(`Onboarding already exists for user ${input.userId}: ${existing.onboardingId}`);
      return existing;
    }

    const onboardingId = genId();
    const record = await OnboardingProgress.create({
      onboardingId,
      userId: input.userId,
      status: 'account_created',
      currentStep: 'verify_email',
      completedSteps: ['signup'],
      metadata: {
        signupSource: input.signupSource,
        referralCode: input.referralCode,
      },
    });

    await auditService.log({
      actor: input.email,
      actorType: 'user',
      module: 'onboarding',
      action: 'onboarding_started',
      entityType: 'onboarding',
      entityId: onboardingId,
      details: { userId: input.userId, signupSource: input.signupSource },
    });

    await eventBus.safePublish(
      'onboarding.started',
      { onboardingId, userId: input.userId, email: input.email },
    );

    log.info(`Onboarding started: ${onboardingId}`, { userId: input.userId });
    return record.toObject() as IOnboardingProgress;
  },

  /**
   * Get onboarding progress for a user. Returns null if not found.
   */
  async getProgress(userId: string): Promise<IOnboardingProgress | null> {
    return OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
  },

  /**
   * Get onboarding by ID.
   */
  async getById(onboardingId: string): Promise<IOnboardingProgress | null> {
    return OnboardingProgress.findOne({ onboardingId }).lean<IOnboardingProgress>();
  },

  /**
   * Mark email as verified. Transitions account_created → email_verified.
   */
  async markEmailVerified(userId: string): Promise<IOnboardingProgress | null> {
    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record) return null;

    // Already verified — idempotent
    if (record.status === 'email_verified' || record.completedSteps.includes('verify_email')) {
      return record;
    }

    const updated = await transition(record.onboardingId, 'account_created', 'email_verified', {
      currentStep: 'select_plan',
      completedSteps: [...record.completedSteps, 'verify_email'],
      failedStep: null,
      failureReason: null,
    });

    if (updated) {
      await auditService.log({
        actor: userId,
        actorType: 'user',
        module: 'onboarding',
        action: 'email_verified',
        entityType: 'onboarding',
        entityId: record.onboardingId,
      });

      await eventBus.safePublish(
        'onboarding.email_verified',
        { onboardingId: record.onboardingId, userId },
      );
    }

    return updated;
  },

  /**
   * Select a plan. Transitions email_verified → plan_selected.
   * Allows re-selection if already plan_selected.
   */
  async selectPlan(userId: string, planId: string): Promise<IOnboardingProgress | null> {
    // Validate plan exists
    const Plan = mongoose.models.Plan;
    if (Plan) {
      const plan = await Plan.findOne({ planId, isActive: true }).lean();
      if (!plan) throw new Error(`Plan not found or inactive: ${planId}`);
    }

    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record) return null;

    // Allow re-selection if already plan_selected
    if (record.status === 'plan_selected') {
      return OnboardingProgress.findOneAndUpdate(
        { userId, status: 'plan_selected' },
        { $set: { planIntent: planId } },
        { new: true },
      ).lean<IOnboardingProgress>();
    }

    const updated = await transition(record.onboardingId, 'email_verified', 'plan_selected', {
      planIntent: planId,
      currentStep: 'create_business',
      completedSteps: [...record.completedSteps, 'select_plan'],
    });

    if (updated) {
      await eventBus.safePublish(
        'onboarding.plan_selected',
        { onboardingId: record.onboardingId, userId, planId },
      );
    }

    return updated;
  },

  /**
   * Provision business + tenant for free plan. Wave 1 only supports free plan.
   * Transitions plan_selected → business_created → store_initialized → completed.
   */
  async provisionFreePlan(
    userId: string,
    input: BusinessInput,
  ): Promise<IOnboardingProgress | null> {
    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record) return null;

    if (record.status !== 'plan_selected') {
      throw new Error(`Cannot provision: onboarding status is ${record.status}, expected plan_selected`);
    }
    if (record.planIntent !== 'free') {
      throw new Error(`Wave 1 only supports free plan provisioning. Selected: ${record.planIntent}`);
    }

    // Idempotent: if tenant already created, reuse
    let tenantId = record.tenantId;
    let businessId = record.businessId;

    if (!tenantId) {
      tenantId = uuidv4().replace(/-/g, '').slice(0, 20);
      const { tenantService } = await import('../platform-core/tenant.service');
      await tenantService.createTenant(tenantId, 'free');
    }

    if (!businessId) {
      businessId = uuidv4().replace(/-/g, '').slice(0, 20);
      const Business = mongoose.models.Business;
      if (Business) {
        await Business.updateOne(
          { businessId },
          { $setOnInsert: { businessId, tenantId, name: input.businessName, currency: input.currency || 'EGP', createdAt: new Date(), updatedAt: new Date() } },
          { upsert: true },
        );
      }
    }

    // Link user to tenant + business (idempotent — only sets if null)
    const User = mongoose.models.User;
    if (User) {
      await User.updateOne(
        { uid: userId, tenantId: null },
        { $set: { tenantId, businessId } },
      );
    }

    // Create owner staff entry (idempotent via upsert)
    const FirestoreDoc = mongoose.models.FirestoreDoc;
    if (FirestoreDoc) {
      const userDoc = User ? await User.findOne({ uid: userId }).lean() : null;
      const email = (userDoc as Record<string, unknown>)?.email || '';
      await FirestoreDoc.updateOne(
        { tenantId, businessId, coll: 'staff', docId: userId },
        {
          $setOnInsert: {
            tenantId, businessId, coll: 'staff', docId: userId,
            data: {
              uid: userId, email, role: 'owner',
              permissions: { all: true }, approved: true, status: 'active',
              joinedAt: new Date(), createdAt: new Date(),
            },
            createdAt: new Date(), updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
    }

    // Create default site (idempotent — check first)
    const Site = mongoose.models.Site;
    let siteExists = false;
    if (Site) {
      const existing = await Site.findOne({ tenantId }).lean();
      if (existing) {
        siteExists = true;
      } else {
        await Site.create({
          tenantId, businessId, name: input.businessName,
          status: 'draft', sections: [], pageSections: {},
          activeVersion: 0, candidateVersion: 0,
        });
        siteExists = true;
      }
    }

    // Create free-plan subscription record (idempotent)
    const Subscription = mongoose.models.Subscription;
    if (Subscription) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 100); // effectively permanent for free
      await Subscription.updateOne(
        { tenantId },
        {
          $setOnInsert: {
            tenantId, planId: 'free', status: 'active',
            currentPeriodStart: now, currentPeriodEnd: periodEnd,
            createdAt: now, updatedAt: now,
          },
        },
        { upsert: true },
      );
    }

    // Update onboarding progress — skip through business_created → store_initialized → completed
    const completedSteps = [...record.completedSteps, 'create_business', 'activate_plan', 'init_store', 'complete'];
    const updated = await OnboardingProgress.findOneAndUpdate(
      { userId },
      {
        $set: {
          tenantId,
          businessId,
          status: 'completed',
          currentStep: 'complete',
          completedSteps,
          failedStep: null,
          failureReason: null,
          completedAt: new Date(),
        },
      },
      { new: true },
    ).lean<IOnboardingProgress>();

    await auditService.log({
      actor: userId,
      actorType: 'user',
      module: 'onboarding',
      action: 'free_plan_provisioned',
      entityType: 'onboarding',
      entityId: record.onboardingId,
      tenantId,
      details: { businessId, businessName: input.businessName, plan: 'free' },
    });

    await eventBus.safePublish(
      'onboarding.completed',
      { onboardingId: record.onboardingId, userId, tenantId, businessId, planId: 'free' },
    );

    log.info(`Free plan onboarding completed: ${record.onboardingId}`, { tenantId, businessId });
    return updated;
  },

  /**
   * Resume an abandoned or suspended onboarding.
   */
  async resume(userId: string): Promise<IOnboardingProgress | null> {
    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record) return null;

    if (record.status !== 'abandoned' && record.status !== 'suspended') {
      // Not in a resumable state — return current progress
      return record;
    }

    // Determine the last valid step to resume from
    const steps = record.completedSteps;
    let resumeStatus: OnboardingStatus = 'account_created';
    let resumeStep: OnboardingStep = 'verify_email';

    if (steps.includes('select_plan')) {
      resumeStatus = 'plan_selected';
      resumeStep = 'create_business';
    } else if (steps.includes('verify_email')) {
      resumeStatus = 'email_verified';
      resumeStep = 'select_plan';
    }

    const updated = await OnboardingProgress.findOneAndUpdate(
      { userId, status: { $in: ['abandoned', 'suspended'] } },
      {
        $set: {
          status: resumeStatus,
          currentStep: resumeStep,
          failedStep: null,
          failureReason: null,
          abandonedAt: null,
        },
      },
      { new: true },
    ).lean<IOnboardingProgress>();

    if (updated) {
      await auditService.log({
        actor: userId,
        actorType: 'user',
        module: 'onboarding',
        action: 'onboarding_resumed',
        entityType: 'onboarding',
        entityId: record.onboardingId,
        details: { previousStatus: record.status, resumedTo: resumeStatus },
      });
    }

    return updated;
  },

  /**
   * Evaluate completion readiness. Returns which hard criteria are met.
   */
  async evaluateCompletion(userId: string): Promise<{ progress: IOnboardingProgress | null; criteria: CompletionCheck }> {
    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record) return { progress: null, criteria: { emailVerified: false, businessExists: false, planValid: false, siteExists: false, userLinked: false } };

    const User = mongoose.models.User;
    const Business = mongoose.models.Business;
    const Site = mongoose.models.Site;
    const Tenant = mongoose.models.Tenant;

    const user = User ? await User.findOne({ uid: userId }).lean() : null;
    const emailVerified = !!(user as Record<string, unknown>)?.emailVerified;
    const userLinked = !!(user as Record<string, unknown>)?.tenantId;

    const businessExists = record.tenantId
      ? !!(Business && await Business.findOne({ tenantId: record.tenantId }).lean())
      : false;

    const siteExists = record.tenantId
      ? !!(Site && await Site.findOne({ tenantId: record.tenantId }).lean())
      : false;

    let planValid = false;
    if (record.tenantId && Tenant) {
      const tenant = await Tenant.findOne({ tenantId: record.tenantId }).lean();
      const activation = (tenant as Record<string, unknown>)?.planActivation;
      planValid = ['paid', 'trial', 'grace', 'default'].includes(activation as string);
    }

    return {
      progress: record,
      criteria: { emailVerified, businessExists, planValid, siteExists, userLinked },
    };
  },

  /* ════════════════════════════════════════════════════════════════
     Wave 2: Email Verification
     ════════════════════════════════════════════════════════════════ */

  /**
   * Create a verification token and send the verification email.
   * Invalidates any existing active token for the same user+purpose.
   * Returns the token (for testing; production relies on email delivery).
   */
  async createAndSendVerification(userId: string, email: string): Promise<{ token: string; expiresAt: Date }> {
    // Invalidate previous active tokens for this user+purpose (supersede, don't delete)
    await EmailVerificationToken.updateMany(
      { userId, purpose: 'onboarding_email_verification', usedAt: null },
      { $set: { usedAt: new Date() } }, // mark as "superseded"
    );

    const token = generateVerificationToken();
    const expiresAt = tokenExpiresAt();

    await EmailVerificationToken.create({
      token,
      userId,
      email: email.toLowerCase().trim(),
      purpose: 'onboarding_email_verification',
      expiresAt,
    });

    // Send email via notifications provider
    try {
      const { emailProvider } = await import('../notifications/providers/email.provider');
      const verifyUrl = `${process.env.FRONTEND_URL || 'https://app.xdigix.com'}/verify-email?token=${token}`;
      await emailProvider.send(
        email,
        'Verify your email — XDIGIX',
        `Welcome to XDIGIX!\n\nPlease verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not sign up, you can safely ignore this email.`,
      );
    } catch (err) {
      log.warn('Failed to send verification email (email delivery issue, token still valid)', {
        userId,
        error: (err as Error).message,
      });
    }

    await auditService.log({
      actor: email,
      actorType: 'user',
      module: 'onboarding',
      action: 'verification_email_sent',
      entityType: 'verification_token',
      entityId: token.slice(0, 8) + '...',
      details: { userId },
    });

    log.info('Verification email sent', { userId });
    return { token, expiresAt };
  },

  /**
   * Verify an email token. One-time use. Updates User.emailVerified and onboarding progress.
   * Returns the updated onboarding progress or null if token invalid.
   */
  async verifyEmailToken(token: string): Promise<{ success: boolean; progress?: IOnboardingProgress | null; error?: string }> {
    // Atomic claim: mark token as used in single operation
    const tokenDoc = await EmailVerificationToken.findOneAndUpdate(
      {
        token,
        purpose: 'onboarding_email_verification',
        usedAt: null, // not yet used
      },
      { $set: { usedAt: new Date() } },
      { new: false }, // return pre-update doc to check expiry
    );

    if (!tokenDoc) {
      // Could be already used, expired (TTL deleted), or never existed
      const exists = await EmailVerificationToken.findOne({ token }).lean();
      if (exists?.usedAt) {
        return { success: false, error: 'Verification link already used' };
      }
      return { success: false, error: 'Invalid or expired verification link' };
    }

    // Check expiry
    if (tokenDoc.expiresAt < new Date()) {
      return { success: false, error: 'Verification link has expired. Please request a new one.' };
    }

    // Update user's emailVerified flag
    const User = mongoose.models.User;
    if (User) {
      await User.updateOne(
        { uid: tokenDoc.userId },
        { $set: { emailVerified: true } },
      );
    }

    // Update onboarding progress
    const progress = await this.markEmailVerified(tokenDoc.userId);

    await auditService.log({
      actor: tokenDoc.email,
      actorType: 'user',
      module: 'onboarding',
      action: 'email_verified_via_token',
      entityType: 'verification_token',
      entityId: token.slice(0, 8) + '...',
      details: { userId: tokenDoc.userId },
    });

    log.info('Email verified via token', { userId: tokenDoc.userId });
    return { success: true, progress };
  },

  /**
   * Resend verification email. Creates a new token (old ones superseded).
   * Rate limit enforcement happens at the route layer.
   */
  async resendVerification(userId: string): Promise<{ success: boolean; error?: string }> {
    const User = mongoose.models.User;
    if (!User) return { success: false, error: 'User system unavailable' };

    const user = await User.findOne({ uid: userId }).lean() as Record<string, unknown> | null;
    if (!user) return { success: false, error: 'User not found' };

    // Already verified — no need to resend
    if (user.emailVerified) {
      return { success: true }; // idempotent
    }

    const email = user.email as string;
    if (!email) return { success: false, error: 'No email on account' };

    await this.createAndSendVerification(userId, email);

    await auditService.log({
      actor: email,
      actorType: 'user',
      module: 'onboarding',
      action: 'verification_email_resent',
      entityType: 'user',
      entityId: userId,
    });

    return { success: true };
  },

  /* ════════════════════════════════════════════════════════════════
     Wave 3: Business Profile Completion + Onboarding Completion
     ════════════════════════════════════════════════════════════════ */

  /** Required business profile fields for onboarding completion. */
  REQUIRED_PROFILE_FIELDS: ['name', 'contactEmail', 'country', 'currency'] as const,

  /**
   * Update the business profile for onboarding. Writes directly to the
   * Business collection (source of truth), not to onboarding progress.
   * Only works after business has been provisioned (tenantId/businessId set).
   */
  async updateBusinessProfile(
    userId: string,
    updates: { name?: string; contactEmail?: string; contactPhone?: string; country?: string; currency?: string; slug?: string; logoUrl?: string },
  ): Promise<{ success: boolean; error?: string }> {
    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record) return { success: false, error: 'No onboarding found' };
    if (!record.businessId) return { success: false, error: 'Business not yet provisioned. Complete plan selection and provisioning first.' };

    const Business = mongoose.models.Business;
    if (!Business) return { success: false, error: 'Business system unavailable' };

    // Filter to only allowed fields
    const allowed: Record<string, unknown> = {};
    if (updates.name !== undefined) allowed.name = updates.name;
    if (updates.contactEmail !== undefined) allowed.contactEmail = updates.contactEmail;
    if (updates.contactPhone !== undefined) allowed.contactPhone = updates.contactPhone;
    if (updates.country !== undefined) allowed.country = updates.country;
    if (updates.currency !== undefined) allowed.currency = updates.currency;
    if (updates.slug !== undefined) allowed.slug = updates.slug;
    if (updates.logoUrl !== undefined) allowed.logoUrl = updates.logoUrl;

    if (Object.keys(allowed).length === 0) {
      return { success: false, error: 'No valid fields provided' };
    }

    await Business.updateOne(
      { businessId: record.businessId },
      { $set: { ...allowed, updatedAt: new Date() } },
    );

    await auditService.log({
      actor: userId,
      actorType: 'user',
      module: 'onboarding',
      action: 'business_profile_updated',
      entityType: 'business',
      entityId: record.businessId,
      tenantId: record.tenantId || undefined,
      details: { updatedFields: Object.keys(allowed) },
    });

    log.info('Business profile updated during onboarding', { userId, businessId: record.businessId });
    return { success: true };
  },

  /**
   * Get the completion checklist — which items are done, which are missing,
   * and whether onboarding is completable right now.
   */
  async getCompletionChecklist(userId: string): Promise<{
    progress: IOnboardingProgress | null;
    checklist: {
      emailVerified: boolean;
      planSelected: boolean;
      businessExists: boolean;
      businessProfileComplete: boolean;
      missingProfileFields: string[];
      siteExists: boolean;
      userLinked: boolean;
    };
    completable: boolean;
    blockedReason: string | null;
  }> {
    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record) {
      return {
        progress: null,
        checklist: { emailVerified: false, planSelected: false, businessExists: false, businessProfileComplete: false, missingProfileFields: [], siteExists: false, userLinked: false },
        completable: false,
        blockedReason: 'No onboarding found',
      };
    }

    const User = mongoose.models.User;
    const Business = mongoose.models.Business;
    const Site = mongoose.models.Site;
    const Tenant = mongoose.models.Tenant;

    const user = User ? await User.findOne({ uid: userId }).lean() as Record<string, unknown> | null : null;
    const emailVerified = !!user?.emailVerified;
    const userLinked = !!user?.tenantId;

    const planSelected = !!record.planIntent;

    let businessExists = false;
    let businessProfileComplete = false;
    const missingProfileFields: string[] = [];

    if (record.tenantId) {
      const biz = Business ? await Business.findOne({ tenantId: record.tenantId }).lean() as Record<string, unknown> | null : null;
      if (biz) {
        businessExists = true;
        // Check required profile fields on the real Business doc
        for (const field of this.REQUIRED_PROFILE_FIELDS) {
          const val = biz[field];
          if (!val || (typeof val === 'string' && val.trim() === '')) {
            missingProfileFields.push(field);
          }
        }
        businessProfileComplete = missingProfileFields.length === 0;
      }
    }

    const siteExists = record.tenantId
      ? !!(Site && await Site.findOne({ tenantId: record.tenantId }).lean())
      : false;

    // Determine if completable
    const allMet = emailVerified && planSelected && businessExists && businessProfileComplete && siteExists && userLinked;

    let blockedReason: string | null = null;
    if (!allMet) {
      if (!emailVerified) blockedReason = 'Email not verified';
      else if (!planSelected) blockedReason = 'Plan not selected';
      else if (!businessExists) blockedReason = 'Business not provisioned';
      else if (!businessProfileComplete) blockedReason = `Missing required fields: ${missingProfileFields.join(', ')}`;
      else if (!siteExists) blockedReason = 'Store not initialized';
      else if (!userLinked) blockedReason = 'User not linked to tenant';
    }

    return {
      progress: record,
      checklist: { emailVerified, planSelected, businessExists, businessProfileComplete, missingProfileFields, siteExists, userLinked },
      completable: allMet,
      blockedReason,
    };
  },

  /**
   * Complete onboarding. Only succeeds when all required conditions are met.
   * Transitions to 'completed' state. Idempotent — returns success if already completed.
   */
  async completeOnboarding(userId: string): Promise<{ success: boolean; progress?: IOnboardingProgress | null; error?: string; blockedReason?: string }> {
    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record) return { success: false, error: 'No onboarding found' };

    // Already completed — idempotent
    if (record.status === 'completed') {
      return { success: true, progress: record };
    }

    // Evaluate completion readiness
    const { completable, blockedReason, checklist } = await this.getCompletionChecklist(userId);
    if (!completable) {
      return { success: false, error: 'Onboarding cannot be completed yet', blockedReason };
    }

    // Only allow completion from store_initialized (or business_created for free plan where store was created during provisioning)
    const allowedFrom: OnboardingStatus[] = ['store_initialized', 'business_created', 'paid_active', 'trial_active', 'grace_active'];
    if (!allowedFrom.includes(record.status)) {
      return { success: false, error: `Cannot complete from status: ${record.status}` };
    }

    const completedSteps = [...new Set([...record.completedSteps, 'complete'])];

    const updated = await OnboardingProgress.findOneAndUpdate(
      { userId, status: { $ne: 'completed' } },
      {
        $set: {
          status: 'completed',
          currentStep: 'complete',
          completedSteps,
          completedAt: new Date(),
          failedStep: null,
          failureReason: null,
        },
      },
      { new: true },
    ).lean<IOnboardingProgress>();

    if (!updated) {
      // Race: another request completed it
      const current = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
      return { success: true, progress: current };
    }

    await auditService.log({
      actor: userId,
      actorType: 'user',
      module: 'onboarding',
      action: 'onboarding_completed',
      entityType: 'onboarding',
      entityId: record.onboardingId,
      tenantId: record.tenantId || undefined,
      details: { plan: record.planIntent, checklist },
    });

    await eventBus.safePublish(
      'onboarding.completed',
      {
        onboardingId: record.onboardingId,
        userId,
        tenantId: record.tenantId,
        businessId: record.businessId,
        planId: record.planIntent,
      },
    );

    log.info(`Onboarding completed: ${record.onboardingId}`, { userId, tenantId: record.tenantId });
    return { success: true, progress: updated };
  },

  /* ════════════════════════════════════════════════════════════════
     Wave 4: Subscription + Payment Session Foundation
     ════════════════════════════════════════════════════════════════ */

  /**
   * Start paid-plan checkout. Creates a pending subscription + payment session.
   * Free plans are rejected — they use provisionFreePlan instead.
   */
  async startPaidPlanCheckout(userId: string, input: {
    paymentProvider: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ success: boolean; paymentSession?: Record<string, unknown>; error?: string }> {
    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record) return { success: false, error: 'No onboarding found' };

    if (!record.planIntent || record.planIntent === 'free') {
      return { success: false, error: 'Free plan does not require payment. Use provision_free action.' };
    }

    // Must have business provisioned
    if (!record.tenantId || !record.businessId) {
      return { success: false, error: 'Business must be provisioned before payment' };
    }

    // Validate plan exists and has a price
    const Plan = mongoose.models.Plan;
    const plan = Plan ? await Plan.findOne({ planId: record.planIntent, isActive: true }).lean() as Record<string, unknown> | null : null;
    if (!plan) return { success: false, error: `Plan not found: ${record.planIntent}` };
    const price = Number(plan.price) || 0;
    if (price <= 0) return { success: false, error: 'Selected plan has no price — use free plan flow' };

    const { PaymentSession, generatePaymentSessionId, paymentSessionExpiresAt } = await import('../finance/payment-session.schema');
    const { Subscription } = await import('../finance/subscription.schema');

    // Create pending subscription (idempotent — upsert by tenantId)
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await Subscription.updateOne(
      { tenantId: record.tenantId },
      {
        $setOnInsert: {
          tenantId: record.tenantId,
          planId: record.planIntent,
          status: 'pending',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          paymentProvider: input.paymentProvider,
          onboardingId: record.onboardingId,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    // Create payment session
    const sessionId = generatePaymentSessionId();
    const session = await PaymentSession.create({
      paymentSessionId: sessionId,
      userId,
      tenantId: record.tenantId,
      onboardingId: record.onboardingId,
      selectedPlanId: record.planIntent,
      paymentProvider: input.paymentProvider,
      amount: price,
      currency: (plan.currency as string) || 'USD',
      status: 'created',
      expiresAt: paymentSessionExpiresAt(),
      idempotencyKey: `${record.onboardingId}-${Date.now()}`,
    });

    // Transition onboarding to payment_pending
    await OnboardingProgress.findOneAndUpdate(
      { userId },
      {
        $set: {
          status: 'payment_pending',
          currentStep: 'activate_plan',
          failedStep: null,
          failureReason: null,
        },
        $addToSet: { completedSteps: 'create_business' },
      },
    );

    await auditService.log({
      actor: userId,
      actorType: 'user',
      module: 'onboarding',
      action: 'payment_session_created',
      entityType: 'payment_session',
      entityId: sessionId,
      tenantId: record.tenantId,
      details: { planId: record.planIntent, provider: input.paymentProvider, amount: price },
    });

    await eventBus.safePublish('onboarding.payment_pending', {
      onboardingId: record.onboardingId,
      userId,
      tenantId: record.tenantId,
      planId: record.planIntent,
      paymentSessionId: sessionId,
    });

    log.info(`Paid plan checkout started: ${sessionId}`, { userId, plan: record.planIntent });

    return {
      success: true,
      paymentSession: {
        paymentSessionId: session.paymentSessionId,
        amount: session.amount,
        currency: session.currency,
        status: session.status,
        expiresAt: session.expiresAt,
        paymentProvider: session.paymentProvider,
      },
    };
  },

  /**
   * Get the latest payment session status for a user's onboarding.
   */
  async getPaymentStatus(userId: string): Promise<{ session: Record<string, unknown> | null; subscriptionStatus: string | null }> {
    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record || !record.tenantId) return { session: null, subscriptionStatus: null };

    const { PaymentSession } = await import('../finance/payment-session.schema');
    const { Subscription } = await import('../finance/subscription.schema');

    const session = await PaymentSession.findOne({ onboardingId: record.onboardingId })
      .sort({ createdAt: -1 })
      .lean();

    const sub = await Subscription.findOne({ tenantId: record.tenantId }).lean();

    return {
      session: session ? {
        paymentSessionId: (session as Record<string, unknown>).paymentSessionId,
        status: (session as Record<string, unknown>).status,
        amount: (session as Record<string, unknown>).amount,
        currency: (session as Record<string, unknown>).currency,
        expiresAt: (session as Record<string, unknown>).expiresAt,
        completedAt: (session as Record<string, unknown>).completedAt,
        failedAt: (session as Record<string, unknown>).failedAt,
        failureReason: (session as Record<string, unknown>).failureReason,
      } : null,
      subscriptionStatus: sub ? (sub as Record<string, unknown>).status as string : null,
    };
  },

  /**
   * Mark payment as succeeded. Activates subscription + tenant plan.
   * Idempotent — if already completed, returns success.
   */
  async markPaymentSucceeded(input: {
    paymentSessionId: string;
    externalPaymentIntentId?: string;
    externalSubscriptionId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { PaymentSession, TERMINAL_SESSION_STATUSES } = await import('../finance/payment-session.schema');
    const { Subscription } = await import('../finance/subscription.schema');

    // Atomic claim: mark session completed
    const session = await PaymentSession.findOneAndUpdate(
      { paymentSessionId: input.paymentSessionId, status: { $nin: TERMINAL_SESSION_STATUSES } },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          externalPaymentIntentId: input.externalPaymentIntentId || null,
        },
      },
      { new: false },
    );

    if (!session) {
      // Check if already completed (idempotent)
      const existing = await PaymentSession.findOne({ paymentSessionId: input.paymentSessionId }).lean();
      if (existing && (existing as Record<string, unknown>).status === 'completed') {
        return { success: true }; // Already processed
      }
      return { success: false, error: 'Payment session not found or already in terminal state' };
    }

    // Activate subscription
    const now = new Date();
    await Subscription.updateOne(
      { tenantId: session.tenantId },
      {
        $set: {
          status: 'active',
          lastPaymentAt: now,
          externalSubscriptionId: input.externalSubscriptionId || null,
          updatedAt: now,
        },
      },
    );

    // Activate tenant plan
    const Tenant = mongoose.models.Tenant;
    if (Tenant) {
      await Tenant.updateOne(
        { tenantId: session.tenantId },
        { $set: { planActivation: 'paid' } },
      );
    }

    // Update onboarding progress
    await OnboardingProgress.findOneAndUpdate(
      { onboardingId: session.onboardingId },
      {
        $set: {
          status: 'paid_active',
          currentStep: 'init_store',
          failedStep: null,
          failureReason: null,
        },
        $addToSet: { completedSteps: 'activate_plan' },
      },
    );

    await auditService.log({
      actor: session.userId,
      actorType: 'user',
      module: 'onboarding',
      action: 'payment_succeeded',
      entityType: 'payment_session',
      entityId: session.paymentSessionId,
      tenantId: session.tenantId,
      details: { planId: session.selectedPlanId, amount: session.amount },
    });

    await eventBus.safePublish('onboarding.payment_succeeded', {
      onboardingId: session.onboardingId,
      userId: session.userId,
      tenantId: session.tenantId,
      planId: session.selectedPlanId,
      paymentSessionId: session.paymentSessionId,
      amount: session.amount,
      currency: session.currency,
    });

    log.info(`Payment succeeded: ${session.paymentSessionId}`, { tenantId: session.tenantId });
    return { success: true };
  },

  /**
   * Mark payment as failed. Leaves onboarding resumable.
   */
  async markPaymentFailed(input: {
    paymentSessionId: string;
    failureReason?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { PaymentSession, TERMINAL_SESSION_STATUSES } = await import('../finance/payment-session.schema');

    const session = await PaymentSession.findOneAndUpdate(
      { paymentSessionId: input.paymentSessionId, status: { $nin: TERMINAL_SESSION_STATUSES } },
      {
        $set: {
          status: 'failed',
          failedAt: new Date(),
          failureReason: input.failureReason || 'Payment failed',
        },
      },
      { new: false },
    );

    if (!session) {
      const existing = await PaymentSession.findOne({ paymentSessionId: input.paymentSessionId }).lean();
      if (existing && (existing as Record<string, unknown>).status === 'failed') {
        return { success: true }; // Already failed — idempotent
      }
      return { success: false, error: 'Payment session not found or already in terminal state' };
    }

    // Update onboarding — stay in payment_pending so user can retry
    await OnboardingProgress.findOneAndUpdate(
      { onboardingId: session.onboardingId },
      {
        $set: {
          failedStep: 'activate_plan',
          failureReason: input.failureReason || 'Payment failed',
        },
      },
    );

    await auditService.log({
      actor: session.userId,
      actorType: 'user',
      module: 'onboarding',
      action: 'payment_failed',
      entityType: 'payment_session',
      entityId: session.paymentSessionId,
      tenantId: session.tenantId,
      details: { reason: input.failureReason },
    });

    log.info(`Payment failed: ${session.paymentSessionId}`, { tenantId: session.tenantId, reason: input.failureReason });
    return { success: true };
  },

  /* ════════════════════════════════════════════════════════════════
     Wave 5: Trial + Grace + Admin Provisioning
     ════════════════════════════════════════════════════════════════ */

  /** Default trial duration in days. */
  TRIAL_DURATION_DAYS: 14,

  /**
   * Activate trial for a user's onboarding. Creates trialing subscription.
   */
  async activateTrial(userId: string): Promise<{ success: boolean; trialEndsAt?: Date; error?: string }> {
    const record = await OnboardingProgress.findOne({ userId }).lean<IOnboardingProgress>();
    if (!record) return { success: false, error: 'No onboarding found' };
    if (!record.tenantId) return { success: false, error: 'Business must be provisioned first' };
    if (!record.planIntent || record.planIntent === 'free') return { success: false, error: 'Free plan does not support trial' };

    // Idempotent — if already trial_active, return existing
    if (record.status === 'trial_active') {
      return { success: true, trialEndsAt: record.trialEndsAt || undefined };
    }

    const { Subscription } = await import('../finance/subscription.schema');
    const Tenant = mongoose.models.Tenant;
    const now = new Date();
    const trialEnd = new Date(now.getTime() + this.TRIAL_DURATION_DAYS * 86400000);

    // Create/update subscription as trialing
    await Subscription.updateOne(
      { tenantId: record.tenantId },
      {
        $set: { status: 'trialing', planId: record.planIntent, trialEnd, currentPeriodStart: now, currentPeriodEnd: trialEnd, updatedAt: now },
        $setOnInsert: { tenantId: record.tenantId, createdAt: now },
      },
      { upsert: true },
    );

    // Update tenant
    if (Tenant) {
      await Tenant.updateOne({ tenantId: record.tenantId }, { $set: { plan: record.planIntent, planActivation: 'trial' } });
    }

    // Update onboarding
    await OnboardingProgress.findOneAndUpdate(
      { userId },
      { $set: { status: 'trial_active', currentStep: 'init_store', trialEndsAt: trialEnd, failedStep: null, failureReason: null }, $addToSet: { completedSteps: 'activate_plan' } },
    );

    await auditService.log({ actor: userId, actorType: 'user', module: 'onboarding', action: 'trial_started', entityType: 'onboarding', entityId: record.onboardingId, tenantId: record.tenantId, details: { planId: record.planIntent, trialEnd: trialEnd.toISOString() } });
    await eventBus.safePublish('onboarding.trial_started', { onboardingId: record.onboardingId, userId, tenantId: record.tenantId, planId: record.planIntent, trialEndsAt: trialEnd });

    log.info(`Trial activated: ${record.onboardingId}`, { userId, trialEnd: trialEnd.toISOString() });
    return { success: true, trialEndsAt: trialEnd };
  },

  /**
   * Admin-only: activate grace period for a tenant's onboarding.
   */
  async activateGraceByAdmin(input: {
    onboardingId: string;
    planId: string;
    graceDays: number;
    reason: string;
    adminUserId: string;
  }): Promise<{ success: boolean; graceExpiresAt?: Date; error?: string }> {
    const record = await OnboardingProgress.findOne({ onboardingId: input.onboardingId }).lean<IOnboardingProgress>();
    if (!record) return { success: false, error: 'Onboarding not found' };
    if (!record.tenantId) return { success: false, error: 'Business must be provisioned first' };
    if (input.graceDays < 1 || input.graceDays > 365) return { success: false, error: 'Grace days must be 1-365' };

    const { tenantService } = await import('../platform-core/tenant.service');
    await tenantService.activateWithGrace(record.tenantId, input.planId, input.graceDays, input.reason, 'grace', input.adminUserId);

    const { Subscription } = await import('../finance/subscription.schema');
    const now = new Date();
    const graceEnd = new Date(now.getTime() + input.graceDays * 86400000);

    await Subscription.updateOne(
      { tenantId: record.tenantId },
      { $set: { status: 'grace', planId: input.planId, currentPeriodStart: now, currentPeriodEnd: graceEnd, updatedAt: now }, $setOnInsert: { tenantId: record.tenantId, createdAt: now } },
      { upsert: true },
    );

    await OnboardingProgress.findOneAndUpdate(
      { onboardingId: input.onboardingId },
      { $set: { status: 'grace_active', planIntent: input.planId, currentStep: 'init_store', failedStep: null, failureReason: null, metadata: { ...record.metadata, adminApprovedBy: input.adminUserId, graceReason: input.reason } }, $addToSet: { completedSteps: 'activate_plan' } },
    );

    await auditService.log({ actor: input.adminUserId, actorType: 'admin', module: 'onboarding', action: 'grace_started', entityType: 'onboarding', entityId: input.onboardingId, tenantId: record.tenantId, details: { planId: input.planId, graceDays: input.graceDays, reason: input.reason } });
    await eventBus.safePublish('onboarding.grace_started', { onboardingId: input.onboardingId, tenantId: record.tenantId, planId: input.planId, graceExpiresAt: graceEnd, approvedBy: input.adminUserId });

    log.info(`Grace activated by admin: ${input.onboardingId}`, { adminUserId: input.adminUserId, graceDays: input.graceDays });
    return { success: true, graceExpiresAt: graceEnd };
  },

  /**
   * Admin-only: provision a complete merchant in one step.
   */
  async adminProvision(input: {
    email: string;
    displayName?: string;
    businessName: string;
    planId: string;
    planActivation: 'default' | 'paid' | 'trial' | 'grace';
    currency?: string;
    graceDays?: number;
    graceReason?: string;
    adminUserId: string;
  }): Promise<{ success: boolean; onboardingId?: string; tenantId?: string; businessId?: string; error?: string }> {
    // Check if user already exists
    const User = mongoose.models.User;
    let uid: string;
    if (User) {
      const existing = await User.findOne({ email: input.email.toLowerCase().trim() }).lean() as Record<string, unknown> | null;
      if (existing) {
        uid = existing.uid as string;
      } else {
        uid = uuidv4().replace(/-/g, '').slice(0, 20);
        await User.create({ uid, email: input.email.toLowerCase().trim(), type: 'client_owner', emailVerified: true, displayName: input.displayName });
      }
    } else {
      uid = uuidv4().replace(/-/g, '').slice(0, 20);
    }

    // Create onboarding record (idempotent)
    let record = await OnboardingProgress.findOne({ userId: uid }).lean<IOnboardingProgress>();
    const onboardingId = record?.onboardingId || `ONB-${uuidv4().slice(0, 8).toUpperCase()}`;

    if (!record) {
      record = (await OnboardingProgress.create({
        onboardingId, userId: uid, status: 'account_created', currentStep: 'signup', completedSteps: ['signup'],
        planIntent: input.planId, metadata: { adminProvision: true, adminApprovedBy: input.adminUserId },
      })).toObject() as IOnboardingProgress;
    }

    // Provision tenant + business (reuse free-plan logic pattern)
    let tenantId = record.tenantId || uuidv4().replace(/-/g, '').slice(0, 20);
    let businessId = record.businessId || uuidv4().replace(/-/g, '').slice(0, 20);

    const { tenantService } = await import('../platform-core/tenant.service');
    if (!record.tenantId) {
      await tenantService.createTenant(tenantId, input.planId);
    } else {
      tenantId = record.tenantId;
    }

    const Business = mongoose.models.Business;
    if (Business && !record.businessId) {
      await Business.updateOne({ businessId }, { $setOnInsert: { businessId, tenantId, name: input.businessName, currency: input.currency || 'EGP', contactEmail: input.email, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
    } else if (record.businessId) {
      businessId = record.businessId;
    }

    if (User) {
      await User.updateOne({ uid, tenantId: null }, { $set: { tenantId, businessId } });
    }

    // Set plan activation on tenant
    const Tenant = mongoose.models.Tenant;
    if (Tenant && input.planActivation !== 'default') {
      const updates: Record<string, unknown> = { plan: input.planId, planActivation: input.planActivation };
      if (input.planActivation === 'grace' && input.graceDays) {
        updates.graceExpiresAt = new Date(Date.now() + input.graceDays * 86400000);
        updates.graceReason = input.graceReason || 'Admin provisioned';
        updates.graceApprovedBy = input.adminUserId;
        updates.graceApprovedAt = new Date();
      }
      await Tenant.updateOne({ tenantId }, { $set: updates });
    }

    // Create site
    const Site = mongoose.models.Site;
    if (Site) {
      const exists = await Site.findOne({ tenantId }).lean();
      if (!exists) await Site.create({ tenantId, businessId, name: input.businessName, status: 'draft', sections: [], pageSections: {}, activeVersion: 0, candidateVersion: 0 });
    }

    // Create subscription
    const { Subscription } = await import('../finance/subscription.schema');
    const now = new Date();
    const periodEnd = new Date(now);
    if (input.planActivation === 'trial') periodEnd.setDate(periodEnd.getDate() + 14);
    else if (input.planActivation === 'grace' && input.graceDays) periodEnd.setDate(periodEnd.getDate() + input.graceDays);
    else periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    const subStatus = input.planActivation === 'trial' ? 'trialing' : input.planActivation === 'grace' ? 'grace' : 'active';
    await Subscription.updateOne({ tenantId }, { $setOnInsert: { tenantId, planId: input.planId, status: subStatus, currentPeriodStart: now, currentPeriodEnd: periodEnd, createdAt: now, updatedAt: now } }, { upsert: true });

    // Complete onboarding
    await OnboardingProgress.findOneAndUpdate(
      { userId: uid },
      { $set: { tenantId, businessId, status: 'completed', currentStep: 'complete', completedSteps: ['signup', 'verify_email', 'select_plan', 'create_business', 'activate_plan', 'init_store', 'complete'], planIntent: input.planId, completedAt: new Date(), metadata: { adminProvision: true, adminApprovedBy: input.adminUserId } } },
    );

    await auditService.log({ actor: input.adminUserId, actorType: 'admin', module: 'onboarding', action: 'admin_provisioned', entityType: 'onboarding', entityId: onboardingId, tenantId, details: { email: input.email, planId: input.planId, planActivation: input.planActivation, businessName: input.businessName } });
    await eventBus.safePublish('onboarding.completed', { onboardingId, userId: uid, tenantId, businessId, planId: input.planId });

    log.info(`Admin provisioned: ${onboardingId}`, { adminUserId: input.adminUserId, tenantId });
    return { success: true, onboardingId, tenantId, businessId };
  },

  /**
   * Admin: reopen a completed/abandoned/suspended onboarding.
   */
  async adminReopen(onboardingId: string, adminUserId: string): Promise<{ success: boolean; error?: string }> {
    const record = await OnboardingProgress.findOne({ onboardingId }).lean<IOnboardingProgress>();
    if (!record) return { success: false, error: 'Onboarding not found' };

    const reopenableFrom: OnboardingStatus[] = ['abandoned', 'suspended'];
    if (!reopenableFrom.includes(record.status)) {
      return { success: false, error: `Cannot reopen from status: ${record.status}` };
    }

    await OnboardingProgress.findOneAndUpdate(
      { onboardingId },
      { $set: { status: 'account_created', currentStep: 'verify_email', failedStep: null, failureReason: null, abandonedAt: null } },
    );

    await auditService.log({ actor: adminUserId, actorType: 'admin', module: 'onboarding', action: 'onboarding_reopened', entityType: 'onboarding', entityId: onboardingId, details: { previousStatus: record.status } });
    log.info(`Onboarding reopened by admin: ${onboardingId}`, { adminUserId });
    return { success: true };
  },
};
