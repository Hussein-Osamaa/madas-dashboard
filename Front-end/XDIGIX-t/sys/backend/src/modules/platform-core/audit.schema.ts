import mongoose, { Schema, Document, Model } from 'mongoose';

export type ActorType = 'user' | 'admin' | 'system' | 'webhook';

export interface IAuditEntry extends Document {
  actor: string;
  actorType: ActorType;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  tenantId?: string | null;
  details: Record<string, unknown>;
  correlationId?: string | null;
  timestamp: Date;
}

const AuditSchema = new Schema<IAuditEntry>(
  {
    actor: { type: String, required: true },
    actorType: {
      type: String,
      enum: ['user', 'admin', 'system', 'webhook'],
      required: true,
    },
    module: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    tenantId: { type: String, default: null },
    details: { type: Schema.Types.Mixed, default: {} },
    correlationId: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, required: true },
  },
  {
    // No updatedAt — audit logs are append-only
    timestamps: false,
  }
);

// Query indexes
AuditSchema.index({ tenantId: 1, timestamp: -1 });
AuditSchema.index({ module: 1, timestamp: -1 });
AuditSchema.index({ entityType: 1, entityId: 1 });
AuditSchema.index({ correlationId: 1 });

export const AuditLog: Model<IAuditEntry> = mongoose.model<IAuditEntry>(
  'AuditLog',
  AuditSchema
);
