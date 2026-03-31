/**
 * Per-business Zammit integration configuration.
 * Credentials (email/password) are stored AES-256-GCM encrypted.
 * One integration per business; tracks sync state and history.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IZammitSyncLog {
  timestamp: Date;
  status: 'success' | 'error';
  orderCount: number;
  error?: string;
  durationMs?: number;
}

export interface IZammitIntegration extends Document {
  businessId: string;
  tenantId: string;
  /** AES-256-GCM encrypted Zammit login email */
  zammitEmail: string;
  /** AES-256-GCM encrypted Zammit login password */
  zammitPassword: string;
  /** Master toggle: enable/disable automatic sync */
  enabled: boolean;
  /** Minutes between automatic syncs (default: 15) */
  syncIntervalMinutes: number;
  /** When the last sync completed */
  lastSyncAt: Date | null;
  /** Current or last sync run status */
  lastSyncStatus: 'idle' | 'running' | 'success' | 'error';
  /** Error message from last failed sync */
  lastSyncError: string;
  /** Number of orders imported in the last sync */
  lastSyncOrderCount: number;
  /** Set of Zammit purchase IDs already imported (for deduplication) */
  syncedOrderIds: string[];
  /** Rolling log of recent sync runs (last 50) */
  syncLogs: IZammitSyncLog[];
  createdAt: Date;
  updatedAt: Date;
}

const ZammitSyncLogSchema = new Schema<IZammitSyncLog>(
  {
    timestamp: { type: Date, required: true },
    status: { type: String, enum: ['success', 'error'], required: true },
    orderCount: { type: Number, default: 0 },
    error: { type: String },
    durationMs: { type: Number },
  },
  { _id: false }
);

const ZammitIntegrationSchema = new Schema<IZammitIntegration>(
  {
    businessId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true },
    zammitEmail: { type: String, required: true },
    zammitPassword: { type: String, required: true },
    enabled: { type: Boolean, default: false },
    syncIntervalMinutes: { type: Number, default: 15, min: 5, max: 1440 },
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: {
      type: String,
      enum: ['idle', 'running', 'success', 'error'],
      default: 'idle',
    },
    lastSyncError: { type: String, default: '' },
    lastSyncOrderCount: { type: Number, default: 0 },
    syncedOrderIds: { type: [String], default: [] },
    syncLogs: { type: [ZammitSyncLogSchema], default: [] },
  },
  { timestamps: true, _id: true }
);

// businessId already has unique: true in field definition — no duplicate index needed
ZammitIntegrationSchema.index({ tenantId: 1 });
ZammitIntegrationSchema.index({ enabled: 1, lastSyncAt: 1 });

export const ZammitIntegration: Model<IZammitIntegration> =
  mongoose.model<IZammitIntegration>('ZammitIntegration', ZammitIntegrationSchema);
