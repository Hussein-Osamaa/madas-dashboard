/**
 * Maps a Zammit purchase (API response) to the XDIGIX internal order format.
 *
 * Key decisions:
 * - items[].productId is empty string — Zammit products are NOT in the XDIGIX catalog.
 *   This means stock reservation is intentionally skipped for Zammit orders.
 * - source is set to 'zammit' for identification.
 * - externalOrderId stores the Zammit purchase ID for deduplication.
 */

import type { ZammitPurchase } from './types';

/**
 * Map Zammit fulfillment status to XDIGIX order status.
 * Zammit uses separate `status` and `fulfillment` fields.
 */
function mapOrderStatus(
  zammitStatus: string,
  fulfillment: string
): string {
  // Zammit statuses: 'draft', 'active', 'cancelled'
  // Zammit fulfillment: 'unfulfilled', 'fulfilled', 'partially_fulfilled'
  if (zammitStatus === 'cancelled') return 'cancelled';
  if (fulfillment === 'fulfilled') return 'completed';
  if (fulfillment === 'partially_fulfilled') return 'processing';
  // Default for active + unfulfilled
  return 'pending';
}

/**
 * Map Zammit payment status to XDIGIX-friendly string.
 */
function mapPaymentStatus(payment: string): string {
  // Zammit uses: 'unpaid', 'paid', 'partially_paid', 'refunded'
  switch (payment) {
    case 'paid':
      return 'paid';
    case 'partially_paid':
      return 'partially_paid';
    case 'refunded':
      return 'refunded';
    default:
      return 'unpaid';
  }
}

/**
 * Map a single Zammit purchase to the XDIGIX order document shape.
 * This object gets stored in `businesses/{businessId}/orders` via addDocument().
 */
export function mapZammitPurchaseToOrder(purchase: ZammitPurchase): Record<string, unknown> {
  const customer = purchase.customer;
  const address = purchase.address;

  // Map line items
  const items = (purchase.purchaseProducts || []).map((pp) => ({
    productId: '', // Not in XDIGIX catalog
    name: pp.name || 'Unknown Product',
    quantity: pp.quantity || 1,
    price: pp.priceAtPurchase || pp.unitPriceWithAddons || 0,
    size: pp.variantName || (pp.values?.[0] ?? ''),
    image: pp.image || '',
    sku: pp.sku || '',
    zammitProductId: String(pp.productId),
    zammitVariantId: String(pp.variantId),
  }));

  return {
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
          district: address.region || '', // Zammit 'region' = XDIGIX 'district' (area)
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

    // Metadata for debugging / audit
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
}
