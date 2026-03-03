import { Router } from 'express';
import { StockTransaction, STOCK_TRANSACTION_TYPES } from '../models/StockTransaction.js';
import { createTransaction, getMonth } from '../services/stockService.js';
import { Product } from '../models/Product.js';

export const transactionRouter = Router();

transactionRouter.get('/types', (req, res) => {
  res.json(STOCK_TRANSACTION_TYPES);
});

transactionRouter.get('/', async (req, res) => {
  try {
    const { clientId, productId, type, month, limit = 100 } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (productId) filter.productId = productId;
    if (type) filter.type = type;
    if (month) filter.month = month;
    const list = await StockTransaction.find(filter)
      .populate('productId', 'name sku barcode')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

transactionRouter.post('/', async (req, res) => {
  try {
    const { productId, clientId, type, quantity, reference } = req.body;
    if (!productId || !clientId || !type || quantity == null)
      return res.status(400).json({ error: 'productId, clientId, type, quantity required' });
    if (!STOCK_TRANSACTION_TYPES.includes(type))
      return res.status(400).json({ error: 'Invalid type' });
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (String(product.clientId) !== String(clientId))
      return res.status(403).json({ error: 'Product does not belong to client' });
    const doc = await createTransaction({ productId, clientId, type, quantity, reference });
    const populated = await StockTransaction.findById(doc._id)
      .populate('productId', 'name sku barcode')
      .lean();
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
