import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserType = 'super_admin' | 'internal_staff' | 'client_owner' | 'client_staff' | 'courier' | 'warehouse_staff';

export interface IUser extends Document {
  uid: string; // Maps to Firebase Auth UID for compatibility
  email: string;
  passwordHash?: string;
  displayName?: string;
  type: UserType;
  businessId?: string; // Primary business for client users
  tenantId?: string;
  permissions?: Record<string, string[]>;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    uid: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: String,
    displayName: String,
    type: { type: String, enum: ['super_admin', 'internal_staff', 'client_owner', 'client_staff', 'courier', 'warehouse_staff'], required: true },
    businessId: String,
    tenantId: String,
    permissions: Schema.Types.Mixed,
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true, _id: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ businessId: 1 });
UserSchema.index({ tenantId: 1 });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
