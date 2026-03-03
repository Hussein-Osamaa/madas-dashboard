import { Router } from 'express';
import {
  getVirtualWarehouse,
  getStockBreakdownByProduct,
  getAvailableStockByProduct,
} from '../services/stockService.js';
import { Product } from '../models/Product.js';

export const stockRouter = Router();

/** Virtual warehouse for a client: all products with calculated available stock and breakdown */
stockRouter.get('/virtual/:clientId', async (req, res) => {
  try {
    const data = await getVirtualWarehouse(req.params.clientId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Single product stock breakdown */
stockRouter.get('/product/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const breakdown = await getStockBreakdownByProduct(req.params.productId);
    res.json({ product, ...breakdown });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Available quantity for one product */
stockRouter.get('/product/:productId/available', async (req, res) => {
  try {
    const available = await getAvailableStockByProduct(req.params.productId);
    res.json({ productId: req.params.productId, available });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
