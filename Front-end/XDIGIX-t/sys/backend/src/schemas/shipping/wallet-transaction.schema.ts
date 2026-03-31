import mongoose, { Document, Schema } from 'mongoose';

export type WalletTxType =
  | 'cod_credit'        // COD collected on delivery → credited to merchant
  | 'fee_debit'         // shipping + COD fee charged on shipment creation
  | 'cashout_debit'     // cashout request paid out
  | 'refund_credit'     // refund when shipment returned before any delivery
  | 'adjustment';       // manual admin adjustment

export interface IWalletTransaction extends Document {
  merchantId:    string;
  type:          WalletTxType;
  amount:        number;           // always positive; direction implied by type
  balanceBefore: number;
  balanceAfter:  number;
  reference?:    string;           // shipmentId, cashoutId, etc.
  description:   string;
  createdBy?:    string;           // adminId for manual adjustments
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    merchantId:    { type: String, required: true, index: true },
    type:          { type: String, enum: ['cod_credit','fee_debit','cashout_debit','refund_credit','adjustment'], required: true },
    amount:        { type: Number, required: true, min: 0 },
    balanceBefore: { type: Number, required: true },
    balanceAfter:  { type: Number, required: true },
    reference:     { type: String },
    description:   { type: String, required: true },
    createdBy:     { type: String },
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ merchantId: 1, createdAt: -1 });

export const WalletTransaction = (mongoose.models.WalletTransaction as mongoose.Model<IWalletTransaction>) || mongoose.model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema);
