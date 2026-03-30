import mongoose, { Schema, Document } from 'mongoose';

/* ── Types ─────────────────────────────────────────────────────── */

export type CarrierType = 'bosta' | 'custom' | 'manual';
export type CarrierStatus = 'active' | 'inactive';

export interface ICarrier extends Document {
  carrierId: string;
  tenantId: string;
  name: string;
  type: CarrierType;
  status: CarrierStatus;
  apiConfig?: Record<string, unknown>;
  supportsWebhook: boolean;
  supportsPickupBooking: boolean;
  supportsReturnShipments: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Mongoose Schema ───────────────────────────────────────────── */

const CarrierSchema = new Schema<ICarrier>(
  {
    carrierId: { type: String, required: true },
    tenantId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ['bosta', 'custom', 'manual'] },
    status: { type: String, required: true, enum: ['active', 'inactive'], default: 'active' },
    apiConfig: { type: Schema.Types.Mixed },
    supportsWebhook: { type: Boolean, required: true, default: false },
    supportsPickupBooking: { type: Boolean, required: true, default: false },
    supportsReturnShipments: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
    collection: 'carriers',
  },
);

/* ── Indexes ───────────────────────────────────────────────────── */
CarrierSchema.index({ carrierId: 1 }, { unique: true });
CarrierSchema.index({ tenantId: 1, status: 1 });

export const Carrier = mongoose.model<ICarrier>('Carrier', CarrierSchema);
export default Carrier;
