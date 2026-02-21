/**
 * Warehouse fulfillment orders - list and update across all fulfillment clients.
 * Used by the fulfillment app (staff with WAREHOUSE).
 */
import { Business } from '../../schemas/business.schema';
import { FirestoreDoc } from '../../schemas/document.schema';
import { recordTransaction } from '../inventory/services/Inventory.service';

export type FulfillmentOrderStatus = 'pending' | 'ready_for_pickup' | 'shipped' | 'delivered' | 'returned' | 'damaged' | 'cancelled';

export interface ListOrdersOptions {
  status?: 'all' | 'pending' | 'ready_for_pickup' | 'shipped';
}

export interface FulfillmentOrderPayload {
  id: string;
  orderId: string;
  orderNumber: string;
  businessId: string;
  businessName: string;
  customer: { name: string; email: string; phone?: string };
  fulfillment: { status: string; type?: string; trackingNumber?: string; shippedAt?: string; deliveredAt?: string };
  financials: { total: number; subtotal?: number; shipping?: number };
  metadata: { createdAt?: string; updatedAt?: string };
  items?: Array<{ productId: string; productName?: string; name?: string; quantity: number; price: number; size?: string; barcode?: string }>;
  shippingAddress?: { address?: string; city?: string; state?: string; country?: string; zipCode?: string };
  date?: string;
  [key: string]: unknown;
}

export async function listFulfillmentOrders(opts: ListOrdersOptions = {}): Promise<FulfillmentOrderPayload[]> {
  const businesses = await Business.find({
    $or: [
      { 'features.fulfillment': true },
      { 'features.fulfillment_service': true },
      { 'features.fulfillmentService': true },
    ],
  })
    .select('businessId name')
    .lean();

  const businessIds = businesses.map((b) => b.businessId);
  const nameByBiz: Record<string, string> = {};
  businesses.forEach((b) => {
    nameByBiz[b.businessId] = (b as { name?: string }).name || b.businessId;
  });

  if (businessIds.length === 0) return [];

  const baseFilter = { businessId: { $in: businessIds }, coll: 'orders' as const };
  const statusVal = opts.status && opts.status !== 'all' ? opts.status : null;

  let filter: Record<string, unknown> = { ...baseFilter };
  if (statusVal === 'pending') {
    filter.$or = [
      { 'data.fulfillment.status': 'pending' },
      { 'data.fulfillment.status': { $exists: false } },
      { 'data.status': 'pending' },
    ];
  } else if (statusVal) {
    filter['data.fulfillment.status'] = statusVal;
  }

  const orderByField = 'data.date';
  const docs = await FirestoreDoc.find(filter)
    .sort({ [orderByField]: -1 })
    .lean();

  const out: FulfillmentOrderPayload[] = [];
  for (const d of docs) {
    const data = (d as { data?: Record<string, unknown> }).data || {};
    const fulfillmentStatus = (data.fulfillment as { status?: string })?.status ?? (data.status as string) ?? 'pending';
    const orderNumber = (data.orderNumber as string) || (data.orderId as string) || d.docId;
    out.push({
      id: d.docId,
      orderId: d.docId,
      orderNumber: String(orderNumber),
      businessId: d.businessId,
      businessName: nameByBiz[d.businessId] || d.businessId,
      customer: (data.customer as Record<string, unknown>) || { name: '', email: '' },
      fulfillment: (data.fulfillment as Record<string, unknown>) || { status: fulfillmentStatus },
      financials: (data.financials as Record<string, unknown>) || { total: 0 },
      metadata: (data.metadata as Record<string, unknown>) || {},
      items: (data.items as any[]) || [],
      shippingAddress: (data.shippingAddress as Record<string, unknown>) || undefined,
      date: (data.date as string) || (data.metadata as { createdAt?: string })?.createdAt,
      ...data,
    });
  }
  return out;
}

export async function updateOrderFulfillment(
  businessId: string,
  orderId: string,
  payload: { status: string; trackingNumber?: string; notes?: string; shippedAt?: string; deliveredAt?: string }
): Promise<void> {
  const doc = await FirestoreDoc.findOne({ businessId, coll: 'orders', docId: orderId }).lean();
  if (!doc) throw new Error('Order not found');
  const existingData = (doc as { data?: Record<string, unknown> }).data || {};
  const existingFulfillment = (existingData.fulfillment as Record<string, unknown>) || {};
  const mergedFulfillment = { ...existingFulfillment, ...payload };
  await FirestoreDoc.updateOne(
    { businessId, coll: 'orders', docId: orderId },
    {
      $set: {
        'data.updatedAt': new Date(),
        'data.fulfillment': mergedFulfillment,
      },
    }
  );
}

/** Get single order by businessId and orderId */
export async function getOrder(businessId: string, orderId: string): Promise<FulfillmentOrderPayload | null> {
  const doc = await FirestoreDoc.findOne({ businessId, coll: 'orders', docId: orderId }).lean();
  if (!doc) return null;
  const data = (doc as { data?: Record<string, unknown> }).data || {};
  const business = await Business.findOne({ businessId }).select('name').lean();
  const orderNumber = (data.orderNumber as string) || (data.orderId as string) || doc.docId;
  return {
    id: doc.docId,
    orderId: doc.docId,
    orderNumber: String(orderNumber),
    businessId: doc.businessId,
    businessName: (business as { name?: string })?.name || doc.businessId,
    customer: (data.customer as Record<string, unknown>) || { name: '', email: '' },
    fulfillment: (data.fulfillment as Record<string, unknown>) || { status: 'pending' },
    financials: (data.financials as Record<string, unknown>) || { total: 0 },
    metadata: (data.metadata as Record<string, unknown>) || {},
    items: (data.items as any[]) || [],
    shippingAddress: (data.shippingAddress as Record<string, unknown>) || undefined,
    date: (data.date as string) || (data.metadata as { createdAt?: string })?.createdAt,
    ...data,
  };
}

/** Products with barcode fields for scan matching (all products, not just XDF) */
export interface ProductForScan {
  id: string;
  barcode?: string;
  mainBarcode?: string;
  sku?: string;
  sizeBarcodes?: Record<string, string>;
  sizeVariants?: Record<string, { barcode?: string }>;
}

export async function listProductsForScan(clientId: string): Promise<ProductForScan[]> {
  const docs = await FirestoreDoc.find({ businessId: clientId, coll: 'products' })
    .select('docId data')
    .lean();
  return docs.map((d) => {
    const data = (d as { data?: Record<string, unknown> }).data || {};
    return {
      id: d.docId,
      barcode: (data.barcode as string) || undefined,
      mainBarcode: (data.mainBarcode as string) || undefined,
      sku: (data.sku as string) || undefined,
      sizeBarcodes: (data.sizeBarcodes as Record<string, string>) || undefined,
      sizeVariants: (data.sizeVariants as Record<string, { barcode?: string }>) || undefined,
    };
  });
}

function normalizeBarcode(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
}

/** Match barcode to product and size from products list */
function matchBarcodeToProduct(
  barcode: string,
  products: ProductForScan[]
): { productId: string; matchedSize?: string } | null {
  const normalized = normalizeBarcode(barcode);
  for (const p of products) {
    const pb = (p.barcode || '').toLowerCase();
    const pmain = (p.mainBarcode || '').toLowerCase();
    const psku = (p.sku || '').toLowerCase();
    if (
      pb === barcode ||
      normalizeBarcode(pb) === normalized ||
      pmain === barcode ||
      normalizeBarcode(pmain) === normalized ||
      psku === barcode ||
      normalizeBarcode(psku) === normalized
    ) {
      return { productId: p.id };
    }
    if (p.sizeBarcodes && typeof p.sizeBarcodes === 'object') {
      for (const [size, sb] of Object.entries(p.sizeBarcodes)) {
        const s = (sb || '').toLowerCase();
        if (s === barcode || normalizeBarcode(s) === normalized) return { productId: p.id, matchedSize: size };
      }
    }
    if (p.sizeVariants && typeof p.sizeVariants === 'object') {
      for (const [size, variant] of Object.entries(p.sizeVariants)) {
        const vb = ((variant as { barcode?: string })?.barcode || '').toLowerCase();
        if (vb === barcode || normalizeBarcode(vb) === normalized) return { productId: p.id, matchedSize: size };
      }
    }
  }
  return null;
}

/** Scan one barcode for an order: match to item, deduct stock, mark scanned. Returns itemIndex and allScanned. */
export async function scanOrderBarcode(
  businessId: string,
  orderId: string,
  barcode: string,
  staffId?: string
): Promise<{ matched: boolean; itemIndex?: number; scannedCount: number; allScanned: boolean; message?: string }> {
  const orderDoc = await FirestoreDoc.findOne({ businessId, coll: 'orders', docId: orderId }).lean();
  if (!orderDoc) throw new Error('Order not found');
  const data = (orderDoc as { data?: Record<string, unknown> }).data || {};
  const items = (data.items as Array<{ productId?: string; name?: string; size?: string; quantity?: number }>) || [];
  const fulfillment = (data.fulfillment as { status?: string; scannedItems?: number[] }) || {};
  const scannedItems: number[] = Array.isArray(fulfillment.scannedItems) ? [...fulfillment.scannedItems] : [];

  const products = await listProductsForScan(businessId);
  const match = matchBarcodeToProduct(barcode.trim(), products);
  if (!match) {
    return {
      matched: false,
      scannedCount: scannedItems.length,
      allScanned: false,
      message: 'Barcode not found in any product for this business',
    };
  }

  const baseProductId = match.productId.split('-')[0].split('_')[0];
  let matchedIndex = -1;
  let matchedItem: (typeof items)[0] | null = null;

  for (let i = 0; i < items.length; i++) {
    if (scannedItems.includes(i)) continue;
    const item = items[i];
    const itemProductId = (item.productId || '').toString();
    const itemBase = itemProductId.split('-')[0].split('_')[0];
    const itemSize = (item.size || '').toLowerCase();
    if (itemBase.toLowerCase() !== baseProductId.toLowerCase()) continue;
    if (match.matchedSize && itemSize && match.matchedSize.toLowerCase() !== itemSize) continue;
    matchedIndex = i;
    matchedItem = item;
    break;
  }

  if (matchedIndex === -1 || !matchedItem) {
    return {
      matched: false,
      scannedCount: scannedItems.length,
      allScanned: false,
      message: 'Product not found in this order or already scanned',
    };
  }

  const quantityToDeduct = matchedItem.quantity ?? 1;
  await recordTransaction({
    productId: baseProductId,
    clientId: businessId,
    type: 'MISSING',
    quantity: quantityToDeduct,
    referenceId: `order:${orderId}:scan`,
    performedByStaffId: staffId,
  });

  scannedItems.push(matchedIndex);
  scannedItems.sort((a, b) => a - b);
  const allScanned = scannedItems.length >= items.length;

  const newFulfillment = {
    ...fulfillment,
    scannedItems,
    ...(allScanned ? { status: 'ready_for_pickup' } : {}),
  };
  await FirestoreDoc.updateOne(
    { businessId, coll: 'orders', docId: orderId },
    {
      $set: {
        'data.updatedAt': new Date(),
        'data.fulfillment': newFulfillment,
        ...(allScanned ? { 'data.status': 'ready_for_pickup' } : {}),
      },
    }
  );

  return {
    matched: true,
    itemIndex: matchedIndex,
    scannedCount: scannedItems.length,
    allScanned,
  };
}
