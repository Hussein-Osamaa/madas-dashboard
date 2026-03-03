import { Router } from 'express';
import { Product } from '../models/Product.js';

export const productRouter = Router();

productRouter.get('/', async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const list = await Product.find(filter).populate('clientId', 'name email').sort({ name: 1 }).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

productRouter.get('/by-barcode/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode })
      .populate('clientId', 'name email')
      .lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

productRouter.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('clientId', 'name email').lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

productRouter.post('/', async (req, res) => {
  try {
    const { clientId, name, sku, barcode } = req.body;
    if (!clientId || !name || !sku || !barcode)
      return res.status(400).json({ error: 'clientId, name, sku, barcode required' });
    const product = await Product.create({ clientId, name, sku, barcode });
    res.status(201).json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

productRouter.patch('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )
      .populate('clientId', 'name email')
      .lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
