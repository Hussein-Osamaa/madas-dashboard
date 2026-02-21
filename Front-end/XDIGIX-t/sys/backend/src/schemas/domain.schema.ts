import mongoose, { Schema, Document, Model } from 'mongoose';

export type DomainStatus =
  | 'pending_dns'
  | 'dns_configured'
  | 'verified'
  | 'ssl_pending'
  | 'active'
  | 'broken'
  | 'suspended';

export interface IDomain extends Document {
  tenantId: string;
  siteId: string;
  domain: string;
  rootDomain: string;
  isSubdomain: boolean;
  status: DomainStatus;
  verificationToken: string;
  dnsRecords?: {
    aRecords?: string[];
    cnameTarget?: string;
    txtRecord?: { host: string; value: string };
  };
  failureCount: number;
  lastCheckedAt?: Date;
  lastCheckResult?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const DomainSchema = new Schema<IDomain>(
  {
    tenantId: { type: String, required: true },
    siteId: { type: String, required: true },
    domain: { type: String, required: true },
    rootDomain: { type: String, required: true },
    isSubdomain: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending_dns', 'dns_configured', 'verified', 'ssl_pending', 'active', 'broken', 'suspended'],
      default: 'pending_dns',
    },
    verificationToken: { type: String, required: true },
    dnsRecords: Schema.Types.Mixed,
    failureCount: { type: Number, default: 0 },
    lastCheckedAt: Date,
    lastCheckResult: Schema.Types.Mixed,
  },
  { timestamps: true, _id: true }
);

DomainSchema.index({ domain: 1 }, { unique: true });
DomainSchema.index({ tenantId: 1 });

export const Domain: Model<IDomain> = mongoose.model<IDomain>('Domain', DomainSchema);
