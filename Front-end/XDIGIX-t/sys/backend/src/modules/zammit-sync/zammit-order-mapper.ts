/**
 * Maps a Zammit purchase (API response) to the XDIGIX internal order format.
 *
 * Product Matching:
 * - Looks up XDIGIX products by name to find the real productId.
 * - Strips labels like "(XDF)", "(XDigix)", etc. from XDIGIX product names for comparison.
 * - Matches on: normalized product name + size variant.
 * - If matched: uses real productId, image, and price from XDIGIX catalog.
 * - If unmatched: falls back to empty productId (shows as "Unknown Product").
 */

import type { ZammitPurchase, ZammitPurchaseProduct } from './types';
import { logger } from '../../utils/logger';

// ── Product Catalog Types ─────────────────────────────────────────

export interface XdigixProduct {
  docId: string;
  name: string;
  price: number;
  sellingPrice?: number;
  images?: string[];
  stock: Record<string, number>;
  reservedStock?: Record<string, number>;
}

export interface MatchedItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  size: string;
  image: string;
  matched: boolean; // true if matched to XDIGIX catalog
}

// ── Name Normalization ────────────────────────────────────────────

/**
 * Remove common labels/suffixes from product names for comparison.
 * e.g. "Nike Dunk Low Cacao Wow (XDF)" → "nike dunk low cacao wow"
 */
function normalizeName(name: string): string {
  return name
    .replace(/\s*\(XDF\)\s*/gi, ' ')
    .replace(/\s*\(XDigix\)\s*/gi, ' ')
    .replace(/\s*\(XDIGIX\)\s*/gi, ' ')
    .replace(/\s*\(fulfillment\)\s*/gi, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Check if two product names are a match (fuzzy).
 * Handles cases where Zammit has "adidas Campus 00s Core Black"
 * and XDIGIX has "adidas Campus 00s Core Black (XDF)".
 */
function namesMatch(zammitName: string, xdigixName: string): boolean {
  const a = normalizeName(zammitName);
  const b = normalizeName(xdigixName);

  // Exact match after normalization
  if (a === b) return true;

  // One contains the other (handles partial name differences)
  if (a.includes(b) || b.includes(a)) return true;

  return false;
}

// ── Product Matching ──────────────────────────────────────────────

/**
 * Match a Zammit purchase product to an XDIGIX catalog product.
 * Matches by name similarity + size availability.
 */
function matchProduct(
  zammitProduct: ZammitPurchaseProduct,
  catalog: XdigixProduct[]
): { product: XdigixProduct; size: string } | null {
  const zName = zammitProduct.name || '';
  const zSize = zammitProduct.variantName || zammitProduct.values?.[0] || '';

  for (const xProduct of catalog) {
    if (!namesMatch(zName, xProduct.name)) continue;

    // Check if the product has the requested size in stock
    const stockKeys = Object.keys(xProduct.stock || {});

    if (zSize) {
      // Exact size match
      if (stockKeys.includes(zSize)) {
        return { product: xProduct, size: zSize };
      }
      // Try case-insensitive size match
      const matchedSize = stockKeys.find(
        (k) => k.toLowerCase() === zSize.toLowerCase()
      );
      if (matchedSize) {
        return { product: xProduct, size: matchedSize };
      }
    } else if (stockKeys.length > 0) {
      // No size specified — match product with first available size
      return { product: xProduct, size: stockKeys[0] };
    } else {
      // No sizes at all — still a name match
      return { product: xProduct, size: '' };
    }
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

/**
 * Map a Zammit purchase to XDIGIX order format.
 * Attempts to match each line item to the XDIGIX product catalog.
 *
 * @param purchase - Zammit API purchase object
 * @param catalog - Array of XDIGIX products for this business (pre-loaded)
 * @returns { orderData, matchedItems } — order document + info about which items were matched
 */
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

  const orderData: Record<string, unknown> = {
    // Customer info
    customerName: customer?.name || address?.name || '',
    customerContact: customer?.phoneNumber || address?.phoneNumber || '',
    customerEmail: customer?.email || '',

    // Order status
    status: mapOrderStatus(purchase.status, purchase.fulfillment),

    // Items
    items,

    // Pricing
    subtotal: purchase.subtotal || 0,
    total: purchase.total || 0,
    shippingFee: purchase.shippingFee || 0,
    discountValue: purchase.discountValue || 0,
    currency: purchase.currency || 'EGP',
    codFee: purchase.codFee || 0,

    // Shipping address
    shippingAddress: address
      ? {
          address: address.addressLine1 || '',
          city: address.city || '',
          district: address.region || '',
          building: address.building || '',
          floor: address.floor || '',
          apartment: address.apartment || '',
          country: address.country || 'Egypt',
        }
      : undefined,

    // Fulfillment
    fulfillment: {
      status: purchase.fulfillment || 'unfulfilled',
    },

    // Payment
    paymentType: purchase.paymentType || '',
    paymentStatus: mapPaymentStatus(purchase.payment),

    // Source tracking
    source: 'zammit',
    channel: purchase.channel || 'online_store',
    externalOrderId: String(purchase.id),

    // Metadata
    metadata: {
      importedFrom: 'zammit',
      zammitPurchaseId: purchase.id,
      zammitStatus: purchase.status,
      zammitFulfillment: purchase.fulfillment,
      zammitPayment: purchase.payment,
      zammitCreatedAt: purchase.createdAt,
      zammitActivatedAt: purchase.activatedAt,
      zammitCourier: purchase.courier,
      zammitCourierTrackingId: purchase.courierTrackingId,
      zammitNotes: purchase.notes,
      zammitCompanyId: purchase.companyId,
      syncedAt: new Date().toISOString(),
    },

    // Timestamps
    date: purchase.activatedAt || purchase.createdAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { orderData, matchedItems };
}
