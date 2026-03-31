/**
 * Payment session schema — tracks onboarding payment checkout attempts.
 *
 * One-time use per session. Retries create new sessions.
 * TTL: auto-deleted 72 hours after creation.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/* ── Types ────────────────────────────────────────────────────────── */

export type PaymentSessionStatus = 'created' | 'pending' | 'completed' | 'failed' | 'expired' | 'cancelled';

export interface IPaymentSession extends Document {
  paymentSessionId: string;
  userId: string;
  tenantId: string;
  onboardingId: string;
  selectedPlanId: string;
  paymentProvider: string;
  amount: number;
  currency: string;
  status: PaymentSessionStatus;
  externalSessionId?: string | null;
  externalPaymentIntentId?: string | null;
  checkoutUrl?: string | null;
  clientSecret?: string | null;
  idempotencyKey?: string | null;
  expiresAt: Date;
  completedAt?: Date | null;
  failedAt?: Date | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Schema ───────────────────────────────────────────────────────── */

const PaymentSessionSchema = new Schema<IPaymentSession>(
  {
    paymentSessionId: { type: String, required: true },
    userId: { type: String, required: true },
    tenantId: { type: String, required: true },
    onboardingId: { type: String, required: true },
    selectedPlanId: { type: String, required: true },
    paymentProvider: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ['created', 'pending', 'completed', 'failed', 'expired', 'cancelled'],
      required: true,
      default: 'created',
    },
    externalSessionId: { type: String, default: null },
    externalPaymentIntentId: { type: String, default: null },
    checkoutUrl: { type: String, default: null },
    clientSecret: { type: String, default: null },
    idempotencyKey: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

/* ── Indexes ──────────────────────────────────────────────────────── */

PaymentSessionSchema.index({ paymentSessionId: 1 }, { unique: true });
PaymentSessionSchema.index({ externalSessionId: 1 }, { unique: true, sparse: true });
PaymentSessionSchema.index({ onboardingId: 1, status: 1 });
PaymentSessionSchema.index({ userId: 1, status: 1 });
PaymentSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 259200 }); // TTL: 72h

/* ── Helpers ──────────────────────────────────────────────────────── */

export function generatePaymentSessionId(): string {
  return `PSN-${uuidv4().slice(0, 8).toUpperCase()}`;
}

export function paymentSessionExpiresAt(): Date {
  return new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h
}

export const TERMINAL_SESSION_STATUSES: PaymentSessionStatus[] = ['completed', 'failed', 'expired', 'cancelled'];

export const PaymentSession: Model<IPaymentSession> =
  (mongoose.models.PaymentSession as Model<IPaymentSession>) ||
  mongoose.model<IPaymentSession>('PaymentSession', PaymentSessionSchema);
