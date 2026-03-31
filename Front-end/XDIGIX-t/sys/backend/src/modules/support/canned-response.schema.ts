/**
 * Canned response schema — pre-written reply templates for agents.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICannedResponse extends Document {
  cannedResponseId: string;
  title: string;
  category: string;
  body: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CannedResponseSchema = new Schema<ICannedResponse>(
  {
    cannedResponseId: { type: String, required: true, unique: true },
    title: { type: String, required: true, maxlength: 200 },
    category: { type: String, required: true, default: 'general' },
    body: { type: String, required: true, maxlength: 5000 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

CannedResponseSchema.index({ category: 1 });

export const CannedResponse: Model<ICannedResponse> =
  (mongoose.models.CannedResponse as Model<ICannedResponse>) ||
  mongoose.model<ICannedResponse>('CannedResponse', CannedResponseSchema);
