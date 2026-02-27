/**
 * Movement-based inventory: the ONLY source of truth for stock.
 * Stock is derived by summing inventory_movements by SKU; no static quantity updates.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const INVENTORY_MOVEMENT_TYPES = [
  'STOCK_IN',
  'PICKED',
  'SHIPPED',
  'RETURNED',
  'DAMAGED',
  'MANUAL_ADJUSTMENT',
] as const;

export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export interface IInventoryMovement extends Document {
  id: string;
  sku: string;
  type: InventoryMovementType;
  quantity: number;
  reference_id?: string;
  worker_id?: string;
  note?: string;
  created_at: Date; // set by timestamps
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
    },
    sku: { type: String, required: true },
    type: {
      type: String,
      enum: INVENTORY_MOVEMENT_TYPES,
      required: true,
    },
    quantity: { type: Number, required: true },
    reference_id: { type: String },
    worker_id: { type: String },
    note: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    _id: true,
  }
);

InventoryMovementSchema.index({ sku: 1, created_at: 1 });
InventoryMovementSchema.index({ created_at: -1 });
InventoryMovementSchema.index({ reference_id: 1 });
InventoryMovementSchema.index({ worker_id: 1, created_at: -1 });

export const InventoryMovement: Model<IInventoryMovement> =
  mongoose.models.InventoryMovement ??
  mongoose.model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);
