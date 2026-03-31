import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVariantStock {
  on_hand: number;
  reserved: number;
  damaged: number;
  missing: number;
}

export interface IProduct extends Document {
  tenantId: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sellingPrice?: number;
  currency: string;
  images: string[];
  vendor?: string;
  sku?: string;
  barcode?: string;
  tags: string[];
  variants: Array<{ name: string; values: string[] }>;
  stock: Record<string, IVariantStock>;
  lowStockThreshold: number;
  status: 'active' | 'draft' | 'archived';
  collectionId?: string;
  onSale?: boolean;
  salePrice?: number;
  deleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    compareAtPrice: { type: Number },
    sellingPrice: { type: Number },
    currency: { type: String, default: 'EGP' },
    images: { type: [String], default: [] },
    vendor: { type: String },
    sku: { type: String },
    barcode: { type: String },
    tags: { type: [String], default: [] },
    variants: {
      type: [
        {
          name: { type: String, required: true },
          values: { type: [String], required: true },
          _id: false,
        },
      ],
      default: [],
    },
    stock: { type: Schema.Types.Mixed, default: {} },
    lowStockThreshold: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'draft', 'archived'],
      default: 'active',
    },
    collectionId: { type: String },
    onSale: { type: Boolean, default: false },
    salePrice: { type: Number },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Query indexes
ProductSchema.index({ tenantId: 1, businessId: 1 });
ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true, sparse: true });
ProductSchema.index({ tenantId: 1, status: 1 });
ProductSchema.index({ tenantId: 1, collectionId: 1 });
ProductSchema.index({ businessId: 1, deleted: 1, status: 1 });

// Text search index
ProductSchema.index(
  { name: 'text', description: 'text', tags: 'text', vendor: 'text', sku: 'text' },
  { weights: { name: 10, tags: 5, vendor: 3, sku: 2, description: 1 } }
);

export const Product: Model<IProduct> = (mongoose.models.Product as Model<IProduct>) || mongoose.model<IProduct>(
  'Product',
  ProductSchema,
);
