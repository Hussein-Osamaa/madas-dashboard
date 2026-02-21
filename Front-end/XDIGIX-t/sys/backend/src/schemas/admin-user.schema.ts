/**
 * AdminUser - Separate identity for platform admins.
 * Controls staff, clients, and system configuration.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  role: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AdminUserSchema.index({ email: 1 });

export const AdminUser: Model<IAdminUser> =
  mongoose.models.AdminUser ?? mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);
