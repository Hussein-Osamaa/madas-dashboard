import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReservationItem {
  productId: string;
  variantId: string;
  qty: number;
}

export interface IReservation extends Document {
  reservationId: string;
  tenantId: string;
  businessId: string;
  orderId: string;
  status: 'active' | 'released' | 'fulfilled' | 'expired';
  items: IReservationItem[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    reservationId: { type: String, required: true },
    tenantId: { type: String, required: true },
    businessId: { type: String, required: true },
    orderId: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'released', 'fulfilled', 'expired'],
      default: 'active',
    },
    items: {
      type: [
        {
          productId: { type: String, required: true },
          variantId: { type: String, required: true },
          qty: { type: Number, required: true },
          _id: false,
        },
      ],
      required: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

ReservationSchema.index({ reservationId: 1 }, { unique: true });
ReservationSchema.index({ orderId: 1 });
ReservationSchema.index({ status: 1, expiresAt: 1 });
ReservationSchema.index({ tenantId: 1 });

export const Reservation: Model<IReservation> = mongoose.model<IReservation>(
  'Reservation',
  ReservationSchema
);
