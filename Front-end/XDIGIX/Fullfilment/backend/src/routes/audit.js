import { Router } from 'express';
import { AuditSession } from '../models/AuditSession.js';
import { Product } from '../models/Product.js';
import { finishAuditSession } from '../services/auditService.js';

export const auditRouter = Router();

auditRouter.post('/sessions', async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });
    const session = await AuditSession.create({ clientId, scannedBarcodes: [] });
    res.status(201).json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

auditRouter.get('/sessions', async (req, res) => {
  try {
    const { clientId, limit = 50 } = req.query;
    const filter = clientId ? { clientId } : {};
    const list = await AuditSession.find(filter).sort({ startedAt: -1 }).limit(Number(limit)).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

auditRouter.get('/sessions/:id', async (req, res) => {
  try {
    const session = await AuditSession.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

auditRouter.post('/sessions/:id/scan', async (req, res) => {
  try {
    const { barcode } = req.body;
    if (!barcode) return res.status(400).json({ error: 'barcode required' });
    const session = await AuditSession.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.finishedAt) return res.status(400).json({ error: 'Session already finished' });

    const product = await Product.findOne({ barcode });
    const added = { barcode, product: product || null };
    session.scannedBarcodes.push(barcode);
    await session.save();

    res.json({ session: session.toObject(), added });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

auditRouter.post('/sessions/:id/finish', async (req, res) => {
  try {
    const session = await finishAuditSession(req.params.id);
    res.json(session);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
