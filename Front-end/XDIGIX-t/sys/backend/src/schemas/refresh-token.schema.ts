import mongoose, { Schema, Document, Model } from 'mongoose';

export type AccountType = 'CLIENT' | 'STAFF' | 'ADMIN';

export interface IRefreshToken extends Document {
  userId: string;
  accountType: AccountType;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: String, required: true },
    accountType: { type: String, enum: ['CLIENT', 'STAFF', 'ADMIN'], required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ userId: 1, accountType: 1 });
// token already has unique: true → index created automatically
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>(
  'RefreshToken',
  RefreshTokenSchema
);
