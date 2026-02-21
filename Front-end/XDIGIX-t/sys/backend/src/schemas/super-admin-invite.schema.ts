import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISuperAdminInvite extends Document {
  inviteId: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SuperAdminInviteSchema = new Schema<ISuperAdminInvite>(
  {
    inviteId: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true },
    status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, _id: true }
);

SuperAdminInviteSchema.index({ email: 1, status: 1 });

export const SuperAdminInvite: Model<ISuperAdminInvite> = mongoose.model<ISuperAdminInvite>(
  'SuperAdminInvite',
  SuperAdminInviteSchema
);
