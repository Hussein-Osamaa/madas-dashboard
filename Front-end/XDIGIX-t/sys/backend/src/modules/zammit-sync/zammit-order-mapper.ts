/**
 * Maps a Zammit purchase to XDIGIX order format with intelligent product matching.
 *
 * Product Matching Strategy (priority order):
 * 1. EXACT name match (after stripping labels like "(XDF)") + size
 * 2. Searches BOTH own products AND linked inventory (XDF) products
 * 3. NO substring/fuzzy matching — exact only to prevent wrong matches
 *
 * Customer Data:
 * - Stored inline on the order document (customerName, customerContact, etc.)
 * - No duplicate customer records created in the customers collection
 */

import type { ZammitPurchase, ZammitPurchaseProduct } from './types';
import { logger } from '../../utils/logger';

// ── Product Catalog Types ─────────────────────────────────────────

export interface XdigixProduct {
  docId: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  sellingPrice?: number;
  images?: string[];
  stock: Record<string, number>;
  reservedStock?: Record<string, number>;
  sizeBarcodes?: Record<string, string>;
  /** Which business owns this product (for linked inventory) */
  businessId?: string;
}

export interface MatchedItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  size: string;
  image: string;
  matched: boolean;
}

// ── Name Normalization ────────────────────────────────────────────

/** Labels to strip from XDIGIX product names before comparing */
const LABEL_PATTERNS = [
  /\s*\(XDF\)\s*/gi,
  /\s*\(XDigix\)\s*/gi,
  /\s*\(XDIGIX\)\s*/gi,
  /\s*\(XDIGIX-FULFILLMENT\)\s*/gi,
  /\s*\(fulfillment\)\s*/gi,
];

/**
 * Normalize a product name for comparison.
 * Strips labels, lowercases, collapses whitespace.
 */
function normalizeName(name: string): string {
  let cleaned = name;
  for (const pattern of LABEL_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  return cleaned.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ── Product Matching ──────────────────────────────────────────────

/**
 * Match a Zammit product to the XDIGIX catalog.
 *
 * Strategy: EXACT normalized name match + size.
 * No substring matching — prevents wrong matches like
 * "Nike Campus" matching "Nike Campus White" when the order is for "Nike Campus Black".
 */
function matchProduct(
  zammitProduct: ZammitPurchaseProduct,
  catalog: XdigixProduct[]
): { product: XdigixProduct; size: string } | null {
  const zName = normalizeName(zammitProduct.name || '');
  const zSize = (zammitProduct.variantName || zammitProduct.values?.[0] || '').trim();

  if (!zName) return null;

  // Find all products with an exact normalized name match
  const nameMatches = catalog.filter((xp) => normalizeName(xp.name) === zName);

  if (nameMatches.length === 0) {
    return null;
  }

  // Among name matches, find the one with the right size
  for (const xProduct of nameMatches) {
    const stockKeys = Object.keys(xProduct.stock || {});

    if (zSize) {
      // Exact size match
      if (stockKeys.includes(zSize)) {
        return { product: xProduct, size: zSize };
      }
      // Case-insensitive size match
      const matchedSize = stockKeys.find(
        (k) => k.toLowerCase() === zSize.toLowerCase()
      );
      if (matchedSize) {
        return { product: xProduct, size: matchedSize };
      }
    } else {
      // No size specified — return the product with first size
      return { product: xProduct, size: stockKeys[0] || '' };
    }
  }

  // Name matched but no size match — still return the first name match without size
  // (better than "Unknown Product", at least the product is identified)
  if (nameMatches.length > 0) {
    logger.warn('Zammit mapper: name matched but size not found in stock', {
      zammitName: zammitProduct.name,
      zammitSize: zSize,
      xdigixName: nameMatches[0].name,
      availableSizes: Object.keys(nameMatches[0].stock || {}).join(', '),
    });
    return { product: nameMatches[0], size: zSize };
  }

  return null;
}

// ── Status Mapping ────────────────────────────────────────────────

function mapOrderStatus(zammitStatus: string, fulfillment: string): string {
  if (zammitStatus === 'cancelled') return 'cancelled';
  if (fulfillment === 'fulfilled') return 'completed';
  if (fulfillment === 'partially_fulfilled') return 'processing';
  return 'pending';
}

function mapPaymentStatus(payment: string): string {
  switch (payment) {
    case 'paid': return 'paid';
    case 'partially_paid': return 'partially_paid';
    case 'refunded': return 'refunded';
    default: return 'unpaid';
  }
}

// ── Main Mapper ───────────────────────────────────────────────────

export function mapZammitPurchaseToOrder(
  purchase: ZammitPurchase,
  catalog: XdigixProduct[] = []
): { orderData: Record<string, unknown>; matchedItems: MatchedItem[] } {
  const customer = purchase.customer;
  const address = purchase.address;

  // Map line items with product matching
  const matchedItems: MatchedItem[] = [];
  const items = (purchase.purchaseProducts || []).map((pp) => {
    const match = catalog.length > 0 ? matchProduct(pp, catalog) : null;

    const item: MatchedItem = match
      ? {
          productId: match.product.docId,
          name: pp.name || match.product.name,
          quantity: pp.quantity || 1,
          price: pp.priceAtPurchase || pp.unitPriceWithAddons || match.product.sellingPrice || match.product.price || 0,
          size: match.size,
          image: (match.product.images?.[0]) || pp.image || '',
          matched: true,
        }
      : {
          productId: '',
          name: pp.name || 'Unknown Product',
          quantity: pp.quantity || 1,
          price: pp.priceAtPurchase || pp.unitPriceWithAddons || 0,
          size: pp.variantName || (pp.values?.[0] ?? ''),
          image: pp.image || '',
          matched: false,
        };

    if (!match && pp.name) {
      logger.warn('Zammit mapper: no XDIGIX match for product', {
        zammitName: pp.name,
        zammitSize: pp.variantName || '',
        zammitPurchaseId: String(purchase.id),
      });
    } else if (match) {
      logger.debug('Zammit mapper: product matched', {
        zammitName: pp.name,
        xdigixDocId: match.product.docId,
        xdigixName: match.product.name,
        size: match.size,
      });
    }

    matchedItems.push(item);
    return {
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      image: item.image,
    };
  });

  const productCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const isCOD = purchase.paymentType === 'cash_on_delivery';

  const orderData: Record<string, unknown> = {
    // ── Customer info (inline on order — no separate customer record) ──
    customerName: customer?.name || address?.name || '',
    customerContact: customer?.phoneNumber || address?.phoneNumber || '',
    customerEmail: customer?.email || '',

    // ── Order status ──
    status: mapOrderStatus(purchase.status, purchase.fulfillment),

    // ── Items ──
    items,
    productCount,

    // ── Pricing ──
    total: purchase.total || 0,
    shippingFees: purchase.shippingFee || 0,
    discount: purchase.discountValue || 0,
    codAmount: isCOD ? (purchase.total || 0) : 0,

    // ── Shipping address ──
    shippingAddress: address
      ? {
          address: address.addressLine1 || '',
          city: address.city || '',
          district: address.region || '',
          building: address.building || '',
          floor: address.floor || '',
          apartment: address.apartment || '',
        }
      : undefined,

    // ── Payment ──
    paymentStatus: mapPaymentStatus(purchase.payment),

    // ── Source tracking ──
    source: 'zammit',
    channel: purchase.channel || 'online_store',
    externalOrderId: String(purchase.id),
    notes: purchase.notes || '',

    // ── Metadata ──
    metadata: {
      importedFrom: 'zammit',
      zammitPurchaseId: purchase.id,
      zammitStatus: purchase.status,
      zammitFulfillment: purchase.fulfillment,
      zammitPayment: purchase.payment,
      zammitPaymentType: purchase.paymentType,
      zammitCreatedAt: purchase.createdAt,
      zammitActivatedAt: purchase.activatedAt,
      zammitCourier: purchase.courier,
      zammitCourierTrackingId: purchase.courierTrackingId,
      zammitCompanyId: purchase.companyId,
      zammitCurrency: purchase.currency,
      zammitSubtotal: purchase.subtotal,
      zammitShippingFee: purchase.shippingFee,
      zammitCodFee: purchase.codFee,
      syncedAt: new Date().toISOString(),
    },

    // ── Timestamps ──
    date: purchase.activatedAt || purchase.createdAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { orderData, matchedItems };
}
