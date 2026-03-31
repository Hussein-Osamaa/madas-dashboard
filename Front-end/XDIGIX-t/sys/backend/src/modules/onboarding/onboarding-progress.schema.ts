/**
 * OnboardingProgress schema — tracks the merchant onboarding workflow.
 *
 * Source of truth for onboarding journey state. One record per user.
 * Business/Tenant/Subscription remain source of truth for their own domain.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

/* ── Enums ────────────────────────────────────────────────────────── */

/** Wave 1 active states + forward-compatible placeholders for Waves 2-5 */
export type OnboardingStatus =
  | 'not_started'
  | 'account_created'
  | 'email_verified'
  | 'plan_selected'
  | 'business_created'
  | 'payment_pending'    // Wave 4 placeholder
  | 'trial_active'       // Wave 4 placeholder
  | 'grace_active'       // Wave 5 placeholder
  | 'paid_active'        // Wave 4 placeholder
  | 'store_initialized'
  | 'completed'
  | 'abandoned'
  | 'suspended';

export const ONBOARDING_STATUSES: OnboardingStatus[] = [
  'not_started', 'account_created', 'email_verified', 'plan_selected',
  'business_created', 'payment_pending', 'trial_active', 'grace_active',
  'paid_active', 'store_initialized', 'completed', 'abandoned', 'suspended',
];

export type OnboardingStep =
  | 'signup'
  | 'verify_email'
  | 'select_plan'
  | 'create_business'
  | 'activate_plan'
  | 'init_store'
  | 'complete';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'signup', 'verify_email', 'select_plan', 'create_business',
  'activate_plan', 'init_store', 'complete',
];

/* ── State machine ────────────────────────────────────────────────── */

export const VALID_TRANSITIONS: Record<OnboardingStatus, OnboardingStatus[]> = {
  not_started:       ['account_created'],
  account_created:   ['email_verified', 'abandoned'],
  email_verified:    ['plan_selected', 'abandoned'],
  plan_selected:     ['business_created', 'abandoned'],
  business_created:  ['payment_pending', 'trial_active', 'grace_active', 'store_initialized'],
  payment_pending:   ['paid_active', 'business_created', 'abandoned'],
  trial_active:      ['store_initialized', 'suspended'],
  grace_active:      ['store_initialized', 'suspended'],
  paid_active:       ['store_initialized'],
  store_initialized: ['completed'],
  completed:         [],
  abandoned:         ['account_created'],
  suspended:         ['account_created'],
};

export function canTransitionOnboarding(from: OnboardingStatus, to: OnboardingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validateOnboardingTransition(from: OnboardingStatus, to: OnboardingStatus): void {
  if (!canTransitionOnboarding(from, to)) {
    throw new Error(`Invalid onboarding transition: ${from} → ${to}`);
  }
}

/* ── Interface ────────────────────────────────────────────────────── */

export interface IOnboardingMetadata {
  signupSource?: string;
  referralCode?: string;
  adminApprovedBy?: string;
  graceReason?: string;
  adminProvision?: boolean;
}

export interface IOnboardingProgress extends Document {
  onboardingId: string;
  userId: string;
  tenantId?: string | null;
  businessId?: string | null;
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  failedStep?: string | null;
  failureReason?: string | null;
  retryCount: number;
  planIntent?: string | null;
  trialEndsAt?: Date | null;
  metadata: IOnboardingMetadata;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  abandonedAt?: Date | null;
}

/* ── Schema ───────────────────────────────────────────────────────── */

const OnboardingMetadataSchema = new Schema<IOnboardingMetadata>(
  {
    signupSource: { type: String },
    referralCode: { type: String },
    adminApprovedBy: { type: String },
    graceReason: { type: String },
    adminProvision: { type: Boolean, default: false },
  },
  { _id: false },
);

const OnboardingProgressSchema = new Schema<IOnboardingProgress>(
  {
    onboardingId: { type: String, required: true },
    userId: { type: String, required: true },
    tenantId: { type: String, default: null },
    businessId: { type: String, default: null },
    status: {
      type: String,
      enum: ONBOARDING_STATUSES,
      required: true,
      default: 'not_started',
    },
    currentStep: {
      type: String,
      enum: ONBOARDING_STEPS,
      required: true,
      default: 'signup',
    },
    completedSteps: { type: [String], default: [] },
    failedStep: { type: String, default: null },
    failureReason: { type: String, default: null },
    retryCount: { type: Number, default: 0, min: 0 },
    planIntent: { type: String, default: null },
    trialEndsAt: { type: Date, default: null },
    metadata: { type: OnboardingMetadataSchema, default: {} },
    completedAt: { type: Date, default: null },
    abandonedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/* ── Indexes ──────────────────────────────────────────────────────── */
OnboardingProgressSchema.index({ onboardingId: 1 }, { unique: true });
OnboardingProgressSchema.index({ userId: 1 }, { unique: true });
OnboardingProgressSchema.index({ status: 1, updatedAt: 1 });
OnboardingProgressSchema.index({ tenantId: 1 }, { sparse: true });

export const OnboardingProgress: Model<IOnboardingProgress> =
  (mongoose.models.OnboardingProgress as Model<IOnboardingProgress>) ||
  mongoose.model<IOnboardingProgress>('OnboardingProgress', OnboardingProgressSchema);
