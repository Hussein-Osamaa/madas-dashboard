/**
 * SLA configuration schema — defines response and resolution time targets per priority.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { TicketPriority } from './ticket.schema';

export interface ISlaConfig extends Document {
  priority: TicketPriority;
  responseTimeMins: number;
  resolutionTimeMins: number;
  updatedBy: string;
  updatedAt: Date;
}

const SlaConfigSchema = new Schema<ISlaConfig>(
  {
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], required: true, unique: true },
    responseTimeMins: { type: Number, required: true, min: 1 },
    resolutionTimeMins: { type: Number, required: true, min: 1 },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true },
);

export const SlaConfig: Model<ISlaConfig> =
  (mongoose.models.SlaConfig as Model<ISlaConfig>) ||
  mongoose.model<ISlaConfig>('SlaConfig', SlaConfigSchema);

/** Default SLA thresholds. Seeded on first boot. */
export const DEFAULT_SLA: Array<Omit<ISlaConfig, keyof Document>> = [
  { priority: 'urgent', responseTimeMins: 30, resolutionTimeMins: 240, updatedBy: 'system' },
  { priority: 'high', responseTimeMins: 60, resolutionTimeMins: 480, updatedBy: 'system' },
  { priority: 'medium', responseTimeMins: 240, resolutionTimeMins: 1440, updatedBy: 'system' },
  { priority: 'low', responseTimeMins: 480, resolutionTimeMins: 2880, updatedBy: 'system' },
];
