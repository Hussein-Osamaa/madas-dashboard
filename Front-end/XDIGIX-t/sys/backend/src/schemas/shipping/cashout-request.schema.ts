import mongoose, { Document, Schema } from 'mongoose';

export type CashoutStatus = 'pending' | 'approved' | 'rejected';

export interface ICashoutRequest extends Document {
  merchantId:    string;
  amount:        number;
  status:        CashoutStatus;
  bankName?:     string;
  accountName?:  string;
  accountNumber?: string;
  notes?:        string;          // merchant notes
  adminNotes?:   string;          // admin response
  processedBy?:  string;          // adminId
  processedAt?:  Date;
  transactionId?: string;         // linked WalletTransaction._id on approval
}

const CashoutRequestSchema = new Schema<ICashoutRequest>(
  {
    merchantId:    { type: String, required: true, index: true },
    amount:        { type: Number, required: true, min: 1 },
    status:        { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
    bankName:      { type: String },
    accountName:   { type: String },
    accountNumber: { type: String },
    notes:         { type: String },
    adminNotes:    { type: String },
    processedBy:   { type: String },
    processedAt:   { type: Date },
    transactionId: { type: String },
  },
  { timestamps: true }
);

CashoutRequestSchema.index({ status: 1, createdAt: -1 });

export const CashoutRequest = mongoose.model<ICashoutRequest>('CashoutRequest', CashoutRequestSchema);
