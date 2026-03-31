import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentAttempt extends Document {
  orderId: string;
  tenantId: string;
  provider: string;  // 'stripe' | 'cod' | 'instapay' | 'vodafone_cash' | 'bank_transfer' | 'manual'
  type: string;      // 'create_intent' | 'webhook_received' | 'manual_confirm' | 'refund'
  status: string;    // 'success' | 'failed' | 'pending'
  request?: Record<string, unknown>;   // sanitized request metadata
  response?: Record<string, unknown>;  // sanitized response metadata
  error?: string;
  correlationId?: string;
  createdAt: Date;
}

const PaymentAttemptSchema = new Schema<IPaymentAttempt>(
  {
    orderId: {
      type: String,
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['stripe', 'cod', 'instapay', 'vodafone_cash', 'bank_transfer', 'manual', 'paymob', 'fawry'],
    },
    type: {
      type: String,
      required: true,
      enum: ['create_intent', 'webhook_received', 'manual_confirm', 'refund', 'cod_confirm'],
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failed', 'pending'],
    },
    request: {
      type: Schema.Types.Mixed,
    },
    response: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
    correlationId: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // append-only: only createdAt
    collection: 'payment_attempts',
  }
);

// Indexes for common queries
PaymentAttemptSchema.index({ orderId: 1 });
PaymentAttemptSchema.index({ tenantId: 1, createdAt: -1 });
PaymentAttemptSchema.index({ provider: 1, status: 1 });

export const PaymentAttempt: Model<IPaymentAttempt> = (mongoose.models.PaymentAttempt as Model<IPaymentAttempt>) || mongoose.model<IPaymentAttempt>(
  'PaymentAttempt',
  PaymentAttemptSchema,
);
