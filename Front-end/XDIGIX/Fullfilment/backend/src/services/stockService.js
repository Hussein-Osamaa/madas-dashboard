/**
 * Stock is NEVER manually edited. It is always derived from StockTransaction ledger.
 * Available = INBOUND + RETURNED + ADJUSTMENT - SOLD - DAMAGED - MISSING - RESERVED - SHIPPING
 */

import { StockTransaction } from '../models/StockTransaction.js';
import { Product } from '../models/Product.js';

function getMonth(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Get net quantity contribution of a transaction type.
 * Positive = adds to stock, Negative = subtracts.
 */
function quantityContribution(type, quantity) {
  switch (type) {
    case 'INBOUND':
    case 'RETURNED':
      return quantity;
    case 'SOLD':
    case 'DAMAGED':
    case 'MISSING':
    case 'RESERVED':
    case 'SHIPPING':
      return -quantity;
    case 'ADJUSTMENT':
      return quantity;
    case 'AUDIT':
      return 0;
    default:
      return 0;
  }
}

/**
 * Calculate current available stock for a product (from all transactions up to now).
 */
export async function getAvailableStockByProduct(productId) {
  const transactions = await StockTransaction.find({ productId }).sort({ createdAt: 1 });
  let available = 0;
  for (const t of transactions) {
    available += quantityContribution(t.type, t.quantity);
  }
  return Math.max(0, available);
}

/**
 * Calculate available stock per product for a client (virtual warehouse).
 */
export async function getVirtualWarehouse(clientId) {
  const products = await Product.find({ clientId }).lean();
  const result = [];
  for (const p of products) {
    const available = await getAvailableStockByProduct(p._id);
    const breakdown = await getStockBreakdownByProduct(p._id);
    result.push({
      productId: p._id,
      product: p,
      available,
      ...breakdown,
    });
  }
  return result;
}

/**
 * Get breakdown: reserved, shipping, damaged, missing, etc. for one product.
 */
export async function getStockBreakdownByProduct(productId) {
  const transactions = await StockTransaction.find({ productId });
  const breakdown = {
    inbound: 0,
    returned: 0,
    sold: 0,
    damaged: 0,
    missing: 0,
    reserved: 0,
    shipping: 0,
    adjustment: 0,
  };
  for (const t of transactions) {
    if (t.type === 'INBOUND') breakdown.inbound += t.quantity;
    else if (t.type === 'RETURNED') breakdown.returned += t.quantity;
    else if (t.type === 'SOLD') breakdown.sold += t.quantity;
    else if (t.type === 'DAMAGED') breakdown.damaged += t.quantity;
    else if (t.type === 'MISSING') breakdown.missing += t.quantity;
    else if (t.type === 'RESERVED') breakdown.reserved += t.quantity;
    else if (t.type === 'SHIPPING') breakdown.shipping += t.quantity;
    else if (t.type === 'ADJUSTMENT') breakdown.adjustment += t.quantity;
  }
  const available =
    breakdown.inbound +
    breakdown.returned +
    breakdown.adjustment -
    breakdown.sold -
    breakdown.damaged -
    breakdown.missing -
    breakdown.reserved -
    breakdown.shipping;
  return { ...breakdown, available: Math.max(0, available) };
}

/**
 * Get expected available stock for a product (for audit comparison).
 */
export async function getExpectedAvailableForProduct(productId) {
  return getAvailableStockByProduct(productId);
}

/**
 * Create a stock transaction (only way to change stock). Validates product and client.
 */
export async function createTransaction(data) {
  const month = data.month || getMonth();
  const payload = {
    productId: data.productId,
    clientId: data.clientId,
    type: data.type,
    quantity: data.quantity,
    reference: data.reference || '',
    month,
  };
  const doc = await StockTransaction.create(payload);
  return doc;
}

export { getMonth };
