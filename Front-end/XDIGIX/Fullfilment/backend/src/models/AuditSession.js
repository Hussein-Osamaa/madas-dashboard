import mongoose from 'mongoose';

const auditSessionSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    scannedBarcodes: [{ type: String }],
  },
  { timestamps: true }
);

auditSessionSchema.index({ clientId: 1, startedAt: -1 });

export const AuditSession = mongoose.model('AuditSession', auditSessionSchema);
