import mongoose, { Schema, Document } from 'mongoose';

/* ── Types ──────────────────────────────────────────────────────── */

export type SubscriptionStatus = 'pending' | 'active' | 'past_due' | 'cancelled' | 'trialing' | 'grace';

/* ── Interface ──────────────────────────────────────────────────── */

export interface ISubscription extends Document {
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  paymentMethod?: string;
  lastInvoiceId?: string;
  // Wave 4 additions — all optional, default null
  subscriptionId?: string | null;
  paymentProvider?: string | null;        // 'stripe' | 'paymob' | 'manual' | null
  externalSubscriptionId?: string | null; // Provider subscription ID for webhook dedup
  externalCustomerId?: string | null;     // Provider customer ID
  trialEnd?: Date | null;                 // Forward-compatible (Wave 5)
  cancelledAt?: Date | null;
  lastPaymentAt?: Date | null;
  onboardingId?: string | null;           // Ref to OnboardingProgress
  providerMetadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Schema ─────────────────────────────────────────────────────── */

const SubscriptionSchema = new Schema<ISubscription>(
  {
    tenantId: { type: String, required: true },
    planId: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'active', 'past_due', 'cancelled', 'trialing', 'grace'],
      default: 'active',
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    paymentMethod: { type: String },
    lastInvoiceId: { type: String },
    // Wave 4 additions
    subscriptionId: { type: String, default: null },
    paymentProvider: { type: String, default: null },
    externalSubscriptionId: { type: String, default: null },
    externalCustomerId: { type: String, default: null },
    trialEnd: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    lastPaymentAt: { type: Date, default: null },
    onboardingId: { type: String, default: null },
    providerMetadata: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    collection: 'finance_subscriptions',
  }
);

/* ── Indexes ────────────────────────────────────────────────────── */

SubscriptionSchema.index({ tenantId: 1 }, { unique: true });
SubscriptionSchema.index({ subscriptionId: 1 }, { unique: true, sparse: true });
SubscriptionSchema.index({ externalSubscriptionId: 1 }, { unique: true, sparse: true });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

export const Subscription = (mongoose.models.Subscription as mongoose.Model<ISubscription>) || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;
