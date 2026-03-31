import mongoose, { Schema, Document } from 'mongoose';

/* ── Types ─────────────────────────────────────────────────────── */

export type TrackingEventSource = 'webhook' | 'poll' | 'manual';

export interface ITrackingEvent extends Document {
  shipmentId: string;
  tenantId: string;
  status: string;
  location?: string;
  rawData?: Record<string, unknown>;
  source: TrackingEventSource;
  timestamp: Date;
  createdAt: Date;
}

/* ── Mongoose Schema ───────────────────────────────────────────── */

const TrackingEventSchema = new Schema<ITrackingEvent>(
  {
    shipmentId: { type: String, required: true },
    tenantId: { type: String, required: true },
    status: { type: String, required: true },
    location: { type: String },
    rawData: { type: Schema.Types.Mixed },
    source: { type: String, required: true, enum: ['webhook', 'poll', 'manual'] },
    timestamp: { type: Date, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'tracking_events',
  },
);

/* ── Indexes ───────────────────────────────────────────────────── */
TrackingEventSchema.index({ shipmentId: 1, timestamp: 1 });
TrackingEventSchema.index({ tenantId: 1, createdAt: 1 });

export const TrackingEvent = (mongoose.models.TrackingEvent as mongoose.Model<ITrackingEvent>) || mongoose.model<ITrackingEvent>('TrackingEvent', TrackingEventSchema);
export default TrackingEvent;
