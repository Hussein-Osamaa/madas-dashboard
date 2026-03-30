import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICollection extends Document {
  tenantId: string;
  businessId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productIds: string[];
  status: 'active' | 'draft' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    productIds: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

CollectionSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
CollectionSchema.index({ tenantId: 1, businessId: 1 });

export const Collection: Model<ICollection> = mongoose.model<ICollection>(
  'Collection',
  CollectionSchema
);
