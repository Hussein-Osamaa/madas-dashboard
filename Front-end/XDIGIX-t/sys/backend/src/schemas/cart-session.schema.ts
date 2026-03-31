/**
 * CartSession — server-side shopping cart persisted across page navigations.
 *
 * Keyed by a UUID `cartToken` that the storefront saves in sessionStorage.
 * The TTL index auto-deletes sessions after 24 hours of inactivity.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICartItem {
  productId:  string;
  variantId?: string;
  name:       string;
  price:      number;
  imageUrl?:  string;
  quantity:   number;
}

export interface ICartSession extends Document {
  cartToken:  string;           // UUID, lives in storefront sessionStorage
  tenantId:   string;
  businessId: string;
  items:      ICartItem[];
  currency:   string;           // e.g. 'SAR'
  expiresAt:  Date;             // TTL field — Mongo auto-deletes after this
  createdAt:  Date;
  updatedAt:  Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId:  { type: String, required: true },
    variantId:  { type: String },
    name:       { type: String, required: true, default: '' },
    price:      { type: Number, required: true, default: 0 },
    imageUrl:   { type: String },
    quantity:   { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const CartSessionSchema = new Schema<ICartSession>(
  {
    cartToken:  { type: String, required: true, unique: true },
    tenantId:   { type: String, required: true },
    businessId: { type: String, required: true },
    items:      { type: [CartItemSchema], default: [] },
    currency:   { type: String, default: 'SAR' },
    expiresAt:  { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-delete 24 h after expiresAt (the TTL index; MongoDB checks every 60 s)
CartSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
CartSessionSchema.index({ tenantId: 1, cartToken: 1 });

export const CartSession: Model<ICartSession> = mongoose.model<ICartSession>(
  'CartSession',
  CartSessionSchema
);
