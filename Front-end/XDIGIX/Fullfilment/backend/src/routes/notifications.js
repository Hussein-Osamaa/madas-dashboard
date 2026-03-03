import { Router } from 'express';
import { Notification } from '../models/Notification.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', async (req, res) => {
  try {
    const { clientId, read, limit = 50 } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (read !== undefined) filter.read = read === 'true';
    const list = await Notification.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

notificationsRouter.patch('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true } },
      { new: true }
    ).lean();
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    res.json(notif);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

notificationsRouter.post('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true } },
      { new: true }
    ).lean();
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    res.json(notif);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
