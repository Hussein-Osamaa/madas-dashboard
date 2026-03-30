import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IStorefrontOrder extends Document {
  orderId: string;
  tenantId: string;
  businessId: string;
  siteId: string;
  cartToken: string;
  checkoutSource: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  shipping: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    method: string;
    cost: number;
  };
  billing: {
    sameAsShipping: boolean;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  items: Array<{
    productId: string;
    variantId?: string;
    name: string;
    price: number;
    imageUrl?: string;
    quantity: number;
  }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  paymentMethod: 'cod' | 'stripe' | 'paymob' | 'fawry' | 'instapay' | 'vodafone_cash' | 'bank_transfer';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'awaiting_manual_confirmation';
  paymentProviderOrderId?: string;
  paymentIntentId?: string;
  paymentReference?: string;
  paymentDetails?: Record<string, unknown>;
  status: 'pending' | 'awaiting_payment' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'failed' | 'expired';
  idempotencyKey?: string;
  checkoutSessionId?: string;
  publicLookupToken: string;
  cartSnapshotHash?: string;
  expiresAt?: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
  failedAt?: Date;
  notes?: string;
  customerNote?: string;
  locale?: string;
  ipAddress?: string;
  userAgent?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StorefrontOrderSchema = new Schema<IStorefrontOrder>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    businessId: {
      type: String,
      required: true,
      index: true,
    },
    siteId: {
      type: String,
      required: true,
      index: true,
    },
    cartToken: {
      type: String,
      required: true,
    },
    checkoutSource: {
      type: String,
      required: true,
      default: 'storefront',
    },
    customer: {
      email: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phone: { type: String },
    },
    shipping: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      method: { type: String, required: true },
      cost: { type: Number, required: true, default: 0 },
    },
    billing: {
      sameAsShipping: { type: Boolean, default: true },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
    },
    items: [
      {
        productId: { type: String, required: true },
        variantId: { type: String },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        imageUrl: { type: String },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['cod', 'stripe', 'paymob', 'fawry', 'instapay', 'vodafone_cash', 'bank_transfer'],
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'failed', 'refunded', 'awaiting_manual_confirmation'],
      default: 'pending',
    },
    paymentProviderOrderId: { type: String },
    paymentIntentId: { type: String },
    paymentReference: { type: String },
    paymentDetails: { type: Schema.Types.Mixed },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'awaiting_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'expired'],
      default: 'pending',
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
    },
    checkoutSessionId: { type: String },
    publicLookupToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    cartSnapshotHash: { type: String },
    expiresAt: { type: Date },
    confirmedAt: { type: Date },
    cancelledAt: { type: Date },
    failedAt: { type: Date },
    notes: { type: String },
    customerNote: { type: String },
    locale: { type: String, default: 'en' },
    ipAddress: { type: String },
    userAgent: { type: String },
    utm: {
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      term: { type: String },
      content: { type: String },
    },
  },
  {
    timestamps: true,
    collection: 'storefront_orders',
  }
);

// Compound indexes
StorefrontOrderSchema.index({ tenantId: 1, businessId: 1, siteId: 1 });
StorefrontOrderSchema.index({ tenantId: 1, status: 1 });
StorefrontOrderSchema.index({ tenantId: 1, paymentStatus: 1 });
StorefrontOrderSchema.index({ tenantId: 1, createdAt: -1 });
StorefrontOrderSchema.index({ 'customer.email': 1, tenantId: 1 });
StorefrontOrderSchema.index({ cartToken: 1, tenantId: 1 });
StorefrontOrderSchema.index({ checkoutSessionId: 1 }, { sparse: true });
StorefrontOrderSchema.index({ paymentIntentId: 1 }, { sparse: true });
StorefrontOrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

/**
 * Generates a human-readable order ID in the format ORD-YYYYMMDD-XXXX
 */
export function generateOrderId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

/**
 * Generates a unique public lookup token using UUID v4
 */
export function generatePublicLookupToken(): string {
  return uuidv4();
}

export const StorefrontOrder = mongoose.model<IStorefrontOrder>('StorefrontOrder', StorefrontOrderSchema);
export default StorefrontOrder;
