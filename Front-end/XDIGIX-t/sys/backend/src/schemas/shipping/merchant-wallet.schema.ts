import mongoose, { Document, Schema } from 'mongoose';

export interface IMerchantWallet extends Document {
  merchantId: string;          // matches businessId / userId from auth
  currency: string;            // 'EGP'
  balance: number;             // available to cash out
  pendingBalance: number;      // COD collected but not yet settled (shipment in transit)
  totalEarned: number;         // cumulative COD credited
  totalCashedOut: number;      // cumulative cashouts paid
  totalFees: number;           // cumulative shipping + COD fees deducted
  lastActivityAt?: Date;
}

const MerchantWalletSchema = new Schema<IMerchantWallet>(
  {
    merchantId:      { type: String, required: true, unique: true },
    currency:        { type: String, default: 'EGP' },
    balance:         { type: Number, default: 0 },
    pendingBalance:  { type: Number, default: 0 },
    totalEarned:     { type: Number, default: 0 },
    totalCashedOut:  { type: Number, default: 0 },
    totalFees:       { type: Number, default: 0 },
    lastActivityAt:  { type: Date },
  },
  { timestamps: true }
);

export const MerchantWallet = (mongoose.models.MerchantWallet as mongoose.Model<IMerchantWallet>) || mongoose.model<IMerchantWallet>('MerchantWallet', MerchantWalletSchema);
