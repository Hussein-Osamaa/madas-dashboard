import mongoose from 'mongoose';

const periodTypes = ['WEEKLY', 'MONTHLY', 'YEARLY'];

const inventoryReportSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    periodType: { type: String, required: true, enum: periodTypes },
    periodLabel: { type: String, required: true },
    openingBalance: { type: Number, default: 0 },
    totalInbound: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    totalDamaged: { type: Number, default: 0 },
    totalMissing: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },
    pdfUrl: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

inventoryReportSchema.index({ clientId: 1, periodType: 1, periodLabel: 1 }, { unique: true });
inventoryReportSchema.index({ clientId: 1, createdAt: -1 });

export const InventoryReport = mongoose.model('InventoryReport', inventoryReportSchema);
