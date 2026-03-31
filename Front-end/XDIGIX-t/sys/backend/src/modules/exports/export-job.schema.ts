/**
 * Export Job schema — tracks export requests, processing, and file lifecycle.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

/* ── Enums ────────────────────────────────────────────────────────── */

export type ExportScope = 'merchant_self' | 'admin_tenant';
export type ExportResourceType =
  | 'orders'
  | 'products'
  | 'customers'
  | 'tickets'
  | 'finance'
  | 'inventory'
  | 'audit_logs'
  | 'full_tenant_bundle';
export type ExportFormat = 'json' | 'csv' | 'zip';
export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

export const EXPORT_RESOURCE_TYPES: ExportResourceType[] = [
  'orders', 'products', 'customers', 'tickets', 'finance',
  'inventory', 'audit_logs', 'full_tenant_bundle',
];

export const EXPORT_FORMATS: ExportFormat[] = ['json', 'csv', 'zip'];

/** Default export file retention: 7 days */
export const EXPORT_RETENTION_DAYS = 7;

/* ── Interface ────────────────────────────────────────────────────── */

export interface IExportRequestor {
  userId: string;
  type: 'merchant' | 'admin' | 'system';
  email?: string;
}

export interface IExportFilters {
  from?: Date;
  to?: Date;
  status?: string;
  [key: string]: unknown;
}

export interface IExportJob extends Document {
  exportJobId: string;
  tenantId: string;
  requestedBy: IExportRequestor;
  scope: ExportScope;
  resourceType: ExportResourceType;
  format: ExportFormat;
  status: ExportStatus;
  filePath?: string | null;
  fileSize?: number | null;
  filters?: IExportFilters | null;
  rowCount?: number | null;
  error?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
  expiresAt?: Date | null;
}

/* ── Schema ───────────────────────────────────────────────────────── */

const ExportRequestorSchema = new Schema<IExportRequestor>(
  {
    userId: { type: String, required: true },
    type: { type: String, enum: ['merchant', 'admin', 'system'], required: true },
    email: { type: String },
  },
  { _id: false },
);

const ExportJobSchema = new Schema<IExportJob>(
  {
    exportJobId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true },
    requestedBy: { type: ExportRequestorSchema, required: true },
    scope: { type: String, enum: ['merchant_self', 'admin_tenant'], required: true },
    resourceType: {
      type: String,
      enum: EXPORT_RESOURCE_TYPES,
      required: true,
    },
    format: { type: String, enum: EXPORT_FORMATS, required: true, default: 'csv' },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed', 'expired'],
      required: true,
      default: 'queued',
    },
    filePath: { type: String, default: null },
    fileSize: { type: Number, default: null },
    filters: { type: Schema.Types.Mixed, default: null },
    rowCount: { type: Number, default: null },
    error: { type: String, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ExportJobSchema.index({ tenantId: 1, createdAt: -1 });
ExportJobSchema.index({ status: 1, createdAt: 1 });
ExportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL: auto-delete expired docs

export const ExportJob: Model<IExportJob> =
  (mongoose.models.ExportJob as Model<IExportJob>) ||
  mongoose.model<IExportJob>('ExportJob', ExportJobSchema);
