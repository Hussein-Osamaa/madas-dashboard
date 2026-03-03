import { Router } from 'express';
import { Client } from '../models/Client.js';

export const clientRouter = Router();

clientRouter.get('/', async (req, res) => {
  try {
    const list = await Client.find().sort({ name: 1 }).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

clientRouter.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).lean();
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

clientRouter.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });
    const client = await Client.create({ name, email, phone: phone || '' });
    res.status(201).json(client);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

clientRouter.patch('/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).lean();
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
