/**
 * Generic Firestore-like document storage for subcollections.
 * Path format: businesses/{businessId}/orders/{orderId}
 * We store: tenantId, businessId, collection, docId, data
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFirestoreDoc extends Document {
  tenantId: string;
  businessId?: string;
  coll: string; // e.g. 'orders', 'products', 'collections' (avoid Mongoose reserved 'collection')
  docId: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const FirestoreDocSchema = new Schema<IFirestoreDoc>(
  {
    tenantId: { type: String, required: true },
    businessId: String,
    coll: { type: String, required: true }, // stored as 'coll' to avoid Mongoose conflict
    docId: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, _id: true }
);

// Compound index for efficient queries
FirestoreDocSchema.index({ tenantId: 1, businessId: 1, coll: 1 });
FirestoreDocSchema.index({ tenantId: 1, businessId: 1, coll: 1, docId: 1 }, { unique: true });

export const FirestoreDoc: Model<IFirestoreDoc> = mongoose.model<IFirestoreDoc>(
  'FirestoreDoc',
  FirestoreDocSchema
);
