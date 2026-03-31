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

// Text index for product search (name, description, tags, sku, vendor)
FirestoreDocSchema.index(
  { 'data.name': 'text', 'data.description': 'text', 'data.tags': 'text', 'data.sku': 'text', 'data.vendor': 'text' },
  { weights: { 'data.name': 10, 'data.tags': 5, 'data.vendor': 3, 'data.sku': 2, 'data.description': 1 }, name: 'product_search_text' }
);
// Partial index for product listing queries (non-deleted products sorted by name)
FirestoreDocSchema.index({ businessId: 1, coll: 1, 'data.deleted': 1, 'data.name': 1 });

export const FirestoreDoc: Model<IFirestoreDoc> = (mongoose.models.FirestoreDoc as mongoose.Model<IFirestoreDoc>) || mongoose.model<IFirestoreDoc>('FirestoreDoc', FirestoreDocSchema);
