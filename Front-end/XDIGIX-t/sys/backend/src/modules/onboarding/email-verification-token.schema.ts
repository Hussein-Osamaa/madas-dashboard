/**
 * Email verification token schema — one-time-use tokens for onboarding email verification.
 *
 * TTL: auto-deleted 24 hours after creation.
 * One active token per user per purpose.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

/* ── Types ────────────────────────────────────────────────────────── */

export type VerificationPurpose = 'onboarding_email_verification';

export interface IEmailVerificationToken extends Document {
  token: string;
  userId: string;
  email: string;
  tenantId?: string | null;
  purpose: VerificationPurpose;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

/* ── Schema ───────────────────────────────────────────────────────── */

const EmailVerificationTokenSchema = new Schema<IEmailVerificationToken>(
  {
    token: { type: String, required: true },
    userId: { type: String, required: true },
    email: { type: String, required: true },
    tenantId: { type: String, default: null },
    purpose: {
      type: String,
      enum: ['onboarding_email_verification'],
      required: true,
      default: 'onboarding_email_verification',
    },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

/* ── Indexes ──────────────────────────────────────────────────────── */

EmailVerificationTokenSchema.index({ token: 1 }, { unique: true });
EmailVerificationTokenSchema.index({ userId: 1, purpose: 1 });
EmailVerificationTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // TTL: 24h

/* ── Helpers ──────────────────────────────────────────────────────── */

/** Generate a cryptographically secure URL-safe token (64 hex chars = 256 bits). */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Default token expiry: 24 hours from now. */
export function tokenExpiresAt(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export const EmailVerificationToken: Model<IEmailVerificationToken> =
  (mongoose.models.EmailVerificationToken as Model<IEmailVerificationToken>) ||
  mongoose.model<IEmailVerificationToken>('EmailVerificationToken', EmailVerificationTokenSchema);
