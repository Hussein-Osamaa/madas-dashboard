import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface IPasswordResetToken extends Document {
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PasswordResetTokenSchema.index({ email: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken: Model<IPasswordResetToken> = (mongoose.models.PasswordResetToken as mongoose.Model<IPasswordResetToken>) || mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
