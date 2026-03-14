/**
 * Warehouse fulfillment orders - list and update across all fulfillment clients.
 * Used by the fulfillment app (staff with WAREHOUSE).
 * Barcode scan creates PICKED movements; shipment confirmation creates SHIPPED movements.
 */
import { Business } from '../../schemas/business.schema';
import { FirestoreDoc } from '../../schemas/document.schema';
import { createMovement } from '../inventory/services/InventoryMovement.service';

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
    const data = (d as { data?: Record<string, unknown>; businessId?: string; docId: string }).data || {};
    const bid = (d as { businessId?: string }).businessId ?? '';
    const fulfillmentStatus = (data.fulfillment as { status?: string })?.status ?? (data.status as string) ?? 'pending';
    const orderNumber = (data.orderNumber as string) || (data.orderId as string) || (d as { docId: string }).docId;
    const cust = (data.customer as { name?: string; email?: string; phone?: string } | undefined) || {};
    const full = (data.fulfillment as { status?: string; type?: string; trackingNumber?: string; shippedAt?: string; deliveredAt?: string } | undefined) || {};
    const fin = (data.financials as { total?: number; subtotal?: number; shipping?: number } | undefined) || {};
    out.push({
      id: (d as { docId: string }).docId,
      orderId: (d as { docId: string }).docId,
      orderNumber: String(orderNumber),
      businessId: bid,
      businessName: nameByBiz[bid] || bid,
      customer: { name: cust.name ?? '', email: cust.email ?? '', phone: cust.phone },
      fulfillment: { status: fulfillmentStatus, ...full },
      financials: { total: fin.total ?? 0, subtotal: fin.subtotal, shipping: fin.shipping },
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
  payload: {
    status: string;
    trackingNumber?: string;
    notes?: string;
    shippedAt?: string;
    deliveredAt?: string;
    shipmentId?: string;
  }
): Promise<void> {
  const doc = await FirestoreDoc.findOne({ businessId, coll: 'orders', docId: orderId }).lean();
  if (!doc) throw new Error('Order not found');
  const existingData = (doc as { data?: Record<string, unknown> }).data || {};
  const existingFulfillment = (existingData.fulfillment as Record<string, unknown>) || {};
  const mergedFulfillment = { ...existingFulfillment, ...payload };

  const previousStatus = (existingFulfillment.status as string) ?? '';
  if (payload.status === 'shipped' && previousStatus !== 'shipped') {
    const shipment_id = (payload.shipmentId ?? orderId).trim();
    const items =
      (existingData.items as Array<{ productId?: string; quantity?: number }>) || [];
    const products = await listProductsForScan(businessId);
    for (const item of items) {
      const productId = (item.productId ?? '').toString().split('-')[0].split('_')[0];
      const product = products.find(
        (p) => p.id === productId || p.id.split('-')[0].split('_')[0] === productId
      );
      const sku = (product?.sku ?? productId).trim() || productId;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      await createMovement({
        sku,
        type: 'SHIPPED',
        quantity,
        reference_id: shipment_id,
        note: `Order ${orderId} shipped`,
      });
    }
  }

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
  const cust = (data.customer as { name?: string; email?: string; phone?: string } | undefined) || {};
  const full = (data.fulfillment as { status?: string; type?: string; trackingNumber?: string; shippedAt?: string; deliveredAt?: string } | undefined) || {};
  const fin = (data.financials as { total?: number; subtotal?: number; shipping?: number } | undefined) || {};
  return {
    id: doc.docId,
    orderId: doc.docId,
    orderNumber: String(orderNumber),
    businessId: doc.businessId ?? '',
    businessName: ((business as { name?: string })?.name || doc.businessId) ?? '',
    customer: { name: cust.name ?? '', email: cust.email ?? '', phone: cust.phone },
    fulfillment: { status: full.status ?? 'pending', ...full },
    financials: { total: fin.total ?? 0, subtotal: fin.subtotal, shipping: fin.shipping },
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
  const product = products.find((p) => p.id === match.productId);
  const sku = (product?.sku ?? match.productId).trim() || match.productId;
  const productIdForClient = match.productId;

  // Check stock from the same source as warehouse Inventory page (client's product.stock in Firestore)
  const productDoc = await FirestoreDoc.findOne({
    businessId,
    coll: 'products',
    docId: productIdForClient,
  }).lean();
  if (!productDoc) {
    return {
      matched: false,
      scannedCount: scannedItems.length,
      allScanned: false,
      message: `Product not found for client`,
    };
  }
  const productData = (productDoc as { data?: Record<string, unknown> }).data || {};
  const stockRaw = (productData.stock != null && typeof productData.stock === 'object' && !Array.isArray(productData.stock))
    ? (productData.stock as Record<string, number>)
    : {};
  const sizeKey = (matchedItem.size || match.matchedSize || 'default' || '').trim() || 'default';
  let available: number;
  let deductKey: string;
  if (typeof stockRaw[sizeKey] === 'number') {
    available = stockRaw[sizeKey];
    deductKey = sizeKey;
  } else if (Object.keys(stockRaw).length === 1) {
    deductKey = Object.keys(stockRaw)[0] ?? sizeKey;
    available = stockRaw[deductKey] ?? 0;
  } else {
    deductKey = stockRaw['default'] !== undefined ? 'default' : stockRaw[''] !== undefined ? '' : sizeKey;
    available = stockRaw[deductKey] ?? 0;
  }
  if (available < quantityToDeduct) {
    return {
      matched: false,
      scannedCount: scannedItems.length,
      allScanned: false,
      message: `Insufficient stock for ${sku}: available ${available}, needed ${quantityToDeduct}`,
    };
  }

  await createMovement({
    sku,
    type: 'PICKED',
    quantity: quantityToDeduct,
    reference_id: orderId,
    worker_id: staffId ?? undefined,
    note: `Order ${orderId} scan`,
  });

  // Deduct from client warehouse inventory (Firestore product.stock) so /warehouse/inventory stays in sync
  const newStock = { ...stockRaw };
  newStock[deductKey] = Math.max(0, (newStock[deductKey] ?? 0) - quantityToDeduct);
  await FirestoreDoc.updateOne(
    { businessId, coll: 'products', docId: productIdForClient },
    { $set: { 'data.stock': newStock, 'data.updatedAt': new Date().toISOString() } }
  );

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

export type ReturnCondition = 'resellable' | 'damaged';

/**
 * Scan a returned product: create RETURNED (resellable) or DAMAGED movement.
 * Attaches return_reference_id and worker_id; timestamp via movement created_at.
 */
export async function scanReturnedProduct(
  businessId: string,
  params: {
    barcode: string;
    return_reference_id: string;
    condition: ReturnCondition;
    quantity?: number;
    worker_id?: string;
  }
): Promise<{ success: true; movementId: string; type: 'RETURNED' | 'DAMAGED'; sku: string; quantity: number } | { success: false; message: string }> {
  const { barcode, return_reference_id, condition, quantity = 1, worker_id } = params;
  const products = await listProductsForScan(businessId);
  const match = matchBarcodeToProduct(barcode.trim(), products);
  if (!match) {
    return { success: false, message: 'Barcode not found for this business' };
  }
  const product = products.find((p) => p.id === match.productId);
  const sku = (product?.sku ?? match.productId).trim() || match.productId;
  const qty = Math.max(1, Number(quantity) || 1);

  const type = condition === 'damaged' ? 'DAMAGED' : 'RETURNED';
  const { id } = await createMovement({
    sku,
    type,
    quantity: qty,
    reference_id: return_reference_id.trim(),
    worker_id: worker_id?.trim() || undefined,
    note: `Return scan: ${condition}`,
  });
  return { success: true, movementId: id, type, sku, quantity: qty };
}
