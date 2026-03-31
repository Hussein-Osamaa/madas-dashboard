import mongoose, { Schema, Document } from 'mongoose';

/* ── Types ──────────────────────────────────────────────────────── */

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

/* ── Interface ──────────────────────────────────────────────────── */

export interface ISubscription extends Document {
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  paymentMethod?: string;
  lastInvoiceId?: string;
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
      enum: ['active', 'past_due', 'cancelled', 'trialing'],
      default: 'active',
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    paymentMethod: { type: String },
    lastInvoiceId: { type: String },
  },
  {
    timestamps: true,
    collection: 'finance_subscriptions',
  }
);

/* ── Indexes ────────────────────────────────────────────────────── */

SubscriptionSchema.index({ tenantId: 1 }, { unique: true });

export const Subscription = (mongoose.models.Subscription as mongoose.Model<ISubscription>) || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;
