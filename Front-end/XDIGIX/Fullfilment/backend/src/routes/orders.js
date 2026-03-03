import { Router } from 'express';
import { Order } from '../models/Order.js';
import {
  createOrder as createOrderSvc,
  confirmOrder,
  shipOrder,
  deliverOrder,
  returnOrder,
  cancelOrder,
  markOrderLost,
  markOrderDamaged,
} from '../services/orderService.js';

export const orderRouter = Router();

orderRouter.get('/', async (req, res) => {
  try {
    const { clientId, status, limit = 50 } = req.query;
    const filter = {};
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;
    const list = await Order.find(filter)
      .populate('clientId', 'name email')
      .populate('items.productId', 'name sku barcode')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

orderRouter.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('clientId', 'name email')
      .populate('items.productId', 'name sku barcode')
      .lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

orderRouter.post('/', async (req, res) => {
  try {
    const { clientId, items, reference } = req.body;
    if (!clientId || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'clientId and items[] required' });
    const order = await createOrderSvc(clientId, items, reference || '');
    const populated = await Order.findById(order._id)
      .populate('clientId', 'name email')
      .populate('items.productId', 'name sku barcode')
      .lean();
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

orderRouter.post('/:id/confirm', async (req, res) => {
  try {
    const order = await confirmOrder(req.params.id);
    const populated = await Order.findById(order._id)
      .populate('clientId', 'name email')
      .populate('items.productId', 'name sku barcode')
      .lean();
    res.json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

orderRouter.post('/:id/ship', async (req, res) => {
  try {
    const order = await shipOrder(req.params.id);
    const populated = await Order.findById(order._id)
      .populate('clientId', 'name email')
      .populate('items.productId', 'name sku barcode')
      .lean();
    res.json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

orderRouter.post('/:id/deliver', async (req, res) => {
  try {
    const order = await deliverOrder(req.params.id);
    const populated = await Order.findById(order._id)
      .populate('clientId', 'name email')
      .populate('items.productId', 'name sku barcode')
      .lean();
    res.json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

orderRouter.post('/:id/return', async (req, res) => {
  try {
    const order = await returnOrder(req.params.id);
    const populated = await Order.findById(order._id)
      .populate('clientId', 'name email')
      .populate('items.productId', 'name sku barcode')
      .lean();
    res.json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

orderRouter.post('/:id/cancel', async (req, res) => {
  try {
    const order = await cancelOrder(req.params.id);
    const populated = await Order.findById(order._id)
      .populate('clientId', 'name email')
      .populate('items.productId', 'name sku barcode')
      .lean();
    res.json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

orderRouter.post('/:id/lost', async (req, res) => {
  try {
    const order = await markOrderLost(req.params.id);
    const populated = await Order.findById(order._id)
      .populate('clientId', 'name email')
      .populate('items.productId', 'name sku barcode')
      .lean();
    res.json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

orderRouter.post('/:id/damaged', async (req, res) => {
  try {
    const order = await markOrderDamaged(req.params.id);
    const populated = await Order.findById(order._id)
      .populate('clientId', 'name email')
      .populate('items.productId', 'name sku barcode')
      .lean();
    res.json(populated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
