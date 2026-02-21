import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILinkRequest extends Document {
  fromBusinessId: string;
  fromBusinessName: string;
  toBusinessId: string;
  toBusinessName: string;
  status: 'pending' | 'approved' | 'rejected';
  accessType: 'read' | 'readwrite';
  requestedAt: Date;
  respondedAt?: Date;
}

const LinkRequestSchema = new Schema<ILinkRequest>(
  {
    fromBusinessId: { type: String, required: true },
    fromBusinessName: { type: String, required: true },
    toBusinessId: { type: String, required: true },
    toBusinessName: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    accessType: { type: String, enum: ['read', 'readwrite'], required: true },
    requestedAt: { type: Date, default: Date.now },
    respondedAt: Date,
  },
  { timestamps: true, _id: true }
);

LinkRequestSchema.index({ toBusinessId: 1, status: 1 });
LinkRequestSchema.index({ fromBusinessId: 1, status: 1 });

export const LinkRequest: Model<ILinkRequest> = mongoose.model<ILinkRequest>(
  'LinkRequest',
  LinkRequestSchema
);
