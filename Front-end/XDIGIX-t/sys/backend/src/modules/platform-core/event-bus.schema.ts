import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
  eventId: string;
  type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'processed' | 'failed' | 'dead_letter';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  correlationId?: string;
  tenantId?: string;
  createdAt: Date;
  processedAt?: Date;
  scheduledAt?: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'processing', 'processed', 'failed', 'dead_letter'],
      default: 'pending',
      required: true,
    },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 5 },
    lastError: String,
    correlationId: String,
    tenantId: String,
    processedAt: Date,
    scheduledAt: Date,
  },
  { timestamps: true }
);

// Query indexes
EventSchema.index({ status: 1, createdAt: 1 });
EventSchema.index({ type: 1, status: 1 });
EventSchema.index({ correlationId: 1 });
EventSchema.index({ tenantId: 1, type: 1 });

// TTL index: auto-delete processed events after 30 days
EventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Event: Model<IEvent> = mongoose.model<IEvent>('Event', EventSchema);
