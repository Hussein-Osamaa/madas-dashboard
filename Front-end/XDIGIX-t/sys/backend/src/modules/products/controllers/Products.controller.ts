import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FirestoreDoc } from '../../../schemas/document.schema';
import { Business } from '../../../schemas/business.schema';
import { getAvailableStock } from '../../inventory/services/Inventory.service';

/** Client prefix for SKU (first 8 alphanumeric chars of clientId) */
function getClientPrefix(clientId: string): string {
  return clientId
    .replace(/[-]/g, '')
    .slice(0, 8)
    .toUpperCase()
    .padEnd(8, '0');
}

/** Collect all SKUs and barcodes in use for a client (product + size variant barcodes) */
async function getUsedIdentifiers(clientId: string): Promise<{ skus: Set<string>; barcodes: Set<string> }> {
  const docs = await FirestoreDoc.find({ businessId: clientId, coll: 'products' })
    .select('data')
    .lean();
  const skus = new Set<string>();
  const barcodes = new Set<string>();
  for (const d of docs) {
    const data = (d as { data?: Record<string, unknown> }).data || {};
    const sku = String(data.sku ?? '').trim();
    if (sku) skus.add(sku);
    const bc = String(data.barcode ?? '').trim();
    if (bc) barcodes.add(bc);
    const sizeBc = (data.sizeBarcodes as Record<string, string> | undefined) || {};
    Object.values(sizeBc).forEach((v) => {
      if (v && String(v).trim()) barcodes.add(String(v).trim());
    });
  }
  return { skus, barcodes };
}

/** Generate unique SKU per client: CLT12345-00001 */
async function generateUniqueSku(clientId: string): Promise<string> {
  const { skus } = await getUsedIdentifiers(clientId);
  const prefix = getClientPrefix(clientId);
  for (let n = 1; n <= 999999; n++) {
    const sku = `${prefix}-${String(n).padStart(5, '0')}`;
    if (!skus.has(sku)) return sku;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

/** Generate unique 12-digit numeric barcode per client */
async function generateUniqueBarcode(clientId: string): Promise<string> {
  const { barcodes } = await getUsedIdentifiers(clientId);
  const clientNum = Math.abs(
    clientId
      .split('')
      .reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)
  )
    .toString()
    .slice(-4)
    .padStart(4, '0');
  for (let attempt = 0; attempt < 100; attempt++) {
    const seq = String(Date.now()).slice(-6);
    const rnd = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const bc = `${clientNum}${seq}${rnd}`.slice(0, 12).padStart(12, '0');
    if (!barcodes.has(bc)) return bc;
  }
  return `${clientNum}${Date.now().toString().slice(-8)}`.padStart(12, '0');
}

/** Generate unique barcode for a size variant (extends main barcode or numeric) */
async function generateUniqueSizeBarcode(
  clientId: string,
  size: string,
  mainBarcode: string,
  alsoUsed: Set<string> = new Set()
): Promise<string> {
  const { barcodes } = await getUsedIdentifiers(clientId);
  const used = new Set([...barcodes, ...alsoUsed]);
  const base = mainBarcode ? `${mainBarcode}-${size}` : `${getClientPrefix(clientId)}-${size}`;
  if (!used.has(base)) return base;
  for (let n = 1; n <= 999; n++) {
    const bc = `${base}-${n}`;
    if (!used.has(bc)) return bc;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const XDF_SOURCE = 'XDF'; // XDIGIX-FULFILLMENT – products added from fulfillment inventory only

/**
 * List products with stock for a client (shared logic).
 * When fulfillmentOnly is true, only returns products with inventorySource === 'XDF'.
 */
export async function listProductsWithStock(
  clientId: string,
  opts?: { fulfillmentOnly?: boolean }
): Promise<Array<Record<string, unknown> & { id: string; availableStock?: number }>> {
  const productDocs = await FirestoreDoc.find({
    businessId: clientId,
    coll: 'products',
  }).lean();

  const filtered =
    opts?.fulfillmentOnly === true
      ? productDocs.filter((d) => (d.data as Record<string, unknown>)?.inventorySource === XDF_SOURCE)
      : productDocs;

  return Promise.all(
    filtered.map(async (doc) => {
      const raw = doc.data || {};
      const data = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
      const productId = (doc as { docId: string }).docId;
      const availableStock = await getAvailableStock(productId, clientId);
      // Plain objects so JSON serialization in production (Vercel/serverless) never drops or alters them
      const stockRaw = data.stock != null && typeof data.stock === 'object' ? (data.stock as Record<string, unknown>) : {};
      const stock: Record<string, number> = {};
      for (const [k, v] of Object.entries(stockRaw)) {
        if (k == null) continue;
        const num = typeof v === 'number' && !Number.isNaN(v) ? v : Number(v);
        if (!Number.isNaN(num)) stock[k] = num;
      }
      const sizeBarcodesRaw = data.sizeBarcodes != null && typeof data.sizeBarcodes === 'object' ? data.sizeBarcodes as Record<string, string> : {};
      const sizeBarcodes: Record<string, string> = {};
      for (const [k, v] of Object.entries(sizeBarcodesRaw)) {
        if (k != null && v != null && typeof v === 'string') sizeBarcodes[k] = v;
      }
      return { id: productId, ...data, stock, sizeBarcodes, availableStock } as Record<string, unknown> & {
        id: string;
        availableStock?: number;
      };
    })
  );
}

/**
 * GET /client/warehouse/products - Client read-only stock view (all products)
 */
export async function listWithStock(req: Request, res: Response): Promise<void> {
  const clientId = req.clientId!;
  const products = await listProductsWithStock(clientId);
  res.json({ products });
}

/** Display name for linked inventory in client dashboard */
export const LINKED_INVENTORY_NAME = 'XDF (XDIGIX-FULFILLMENT)';

/**
 * GET /client/warehouse/linked-inventory - XDF products for client dashboard (linked inventory)
 */
export async function listLinkedInventory(req: Request, res: Response): Promise<void> {
  const clientId = req.clientId!;
  const products = await listProductsWithStock(clientId, { fulfillmentOnly: true });
  res.json({ name: LINKED_INVENTORY_NAME, products });
}

/**
 * GET /client/warehouse/fulfillment-status - Whether the client is subscribed to fulfillment service (XDF)
 */
export async function fulfillmentStatus(req: Request, res: Response): Promise<void> {
  const clientId = req.clientId!;
  const business = await Business.findOne({ businessId: clientId }).select('features').lean();
  const features = (business?.features as Record<string, unknown>) ?? {};
  const subscribed =
    features.fulfillment === true ||
    features.fulfillment_service === true ||
    features.fulfillmentService === true;
  res.json({ subscribed: !!subscribed });
}

/** Allowed fields when client updates a linked (XDF) product */
export interface UpdateLinkedProductImagePricingInput {
  images?: string[];
  price?: number;
  sellingPrice?: number;
}

/**
 * PATCH /client/warehouse/products/:productId - Client can only update image, price, sellingPrice for XDF products
 */
export async function updateLinkedProductImagePricing(
  req: Request,
  res: Response
): Promise<void> {
  const clientId = req.clientId!;
  const productId = (req.params.productId || '').trim();
  if (!productId) {
    res.status(400).json({ error: 'Product ID required' });
    return;
  }
  const doc = await FirestoreDoc.findOne({
    businessId: clientId,
    coll: 'products',
    docId: productId,
  });
  if (!doc) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const data = (doc.data || {}) as Record<string, unknown>;
  if (data.inventorySource !== XDF_SOURCE) {
    res.status(403).json({ error: 'Only linked (XDF) products can be updated here' });
    return;
  }
  const body = (req.body || {}) as UpdateLinkedProductImagePricingInput;
  if (body.images !== undefined) data.images = body.images;
  if (body.price !== undefined) data.price = body.price;
  if (body.sellingPrice !== undefined) data.sellingPrice = body.sellingPrice;
  data.updatedAt = new Date().toISOString();

  await FirestoreDoc.updateOne(
    { businessId: clientId, coll: 'products', docId: productId },
    { $set: { data } }
  );
  res.json({ ok: true });
}

export interface CreateProductInput {
  name: string;
  sku?: string;
  barcode?: string;
  warehouse?: string;
  stock?: Record<string, number>;
  sizeBarcodes?: Record<string, string>;
}

/**
 * Create product for a client
 * Auto-generates unique SKU and barcode per client when not provided.
 */
export async function createProduct(clientId: string, input: CreateProductInput): Promise<{ id: string }> {
  const business = await Business.findOne({ businessId: clientId }).select('tenantId').lean();
  if (!business) throw new Error('Client not found');

  const sku = (input.sku ?? '').trim() || (await generateUniqueSku(clientId));
  const barcode = (input.barcode ?? '').trim() || (await generateUniqueBarcode(clientId));

  const stock = input.stock ?? {};
  const sizeBarcodes: Record<string, string> = { ...(input.sizeBarcodes ?? {}) };
  const generatedBarcodes = new Set<string>([barcode]);

  // Auto-generate unique barcodes for sizes that don't have one
  for (const size of Object.keys(stock).filter((k) => !k.includes('|'))) {
    const existing = (sizeBarcodes[size] ?? '').trim();
    if (!existing) {
      const bc = await generateUniqueSizeBarcode(clientId, size, barcode, generatedBarcodes);
      sizeBarcodes[size] = bc;
      generatedBarcodes.add(bc);
    }
  }

  const productId = uuidv4().replace(/-/g, '').slice(0, 20);
  const data: Record<string, unknown> = {
    name: input.name,
    sku,
    barcode,
    warehouse: input.warehouse || '',
    inventorySource: XDF_SOURCE, // XDIGIX-FULFILLMENT – only these show in fulfillment app & as linked inventory
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (Object.keys(stock).length > 0) {
    data.stock = stock;
  }
  if (Object.keys(sizeBarcodes).length > 0) {
    data.sizeBarcodes = sizeBarcodes;
  }

  await FirestoreDoc.create({
    tenantId: (business as { tenantId: string }).tenantId,
    businessId: clientId,
    coll: 'products',
    docId: productId,
    data,
  });

  return { id: productId };
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  barcode?: string;
  warehouse?: string;
  stock?: Record<string, number>;
  sizeBarcodes?: Record<string, string>;
}

/**
 * Update product for a client
 * Auto-generates unique barcodes for new size variants that don't have one.
 */
export async function updateProduct(clientId: string, productId: string, input: UpdateProductInput): Promise<void> {
  const doc = await FirestoreDoc.findOne({
    businessId: clientId,
    coll: 'products',
    docId: productId,
  }).lean();
  if (!doc) throw new Error('Product not found');

  const existing = (doc.data || {}) as Record<string, unknown>;
  const data: Record<string, unknown> = { ...existing };
  if (input.name !== undefined) data.name = input.name;
  if (input.sku !== undefined) data.sku = input.sku;
  if (input.barcode !== undefined) data.barcode = input.barcode;
  if (input.warehouse !== undefined) data.warehouse = input.warehouse;

  let stock: Record<string, number> =
    input.stock !== undefined && input.stock !== null
      ? (typeof input.stock === 'object' ? { ...input.stock } : {})
      : (existing.stock != null && typeof existing.stock === 'object' ? { ...(existing.stock as Record<string, number>) } : {});
  let sizeBarcodes: Record<string, string> =
    input.sizeBarcodes != null && typeof input.sizeBarcodes === 'object'
      ? { ...input.sizeBarcodes }
      : (existing.sizeBarcodes != null && typeof existing.sizeBarcodes === 'object' ? { ...(existing.sizeBarcodes as Record<string, string>) } : {});

  // Auto-generate unique barcodes for sizes that don't have one
  const mainBarcode = String((input.barcode ?? existing.barcode) ?? '').trim() || String(existing.barcode ?? '').trim();
  if (Object.keys(stock).length > 0) {
    const generatedBarcodes = new Set<string>([mainBarcode].filter(Boolean));
    Object.values(sizeBarcodes).forEach((v) => v && generatedBarcodes.add(v));
    for (const size of Object.keys(stock).filter((k) => !k.includes('|'))) {
      const existingBc = (sizeBarcodes[size] ?? '').trim();
      if (!existingBc) {
        const bc = await generateUniqueSizeBarcode(clientId, size, mainBarcode, generatedBarcodes);
        sizeBarcodes[size] = bc;
        generatedBarcodes.add(bc);
      }
    }
  }

  data.stock = stock;
  data.sizeBarcodes = sizeBarcodes;
  data.updatedAt = new Date().toISOString();

  // Replace entire data object so sizes/stock always persist (no dot-notation issues)
  await FirestoreDoc.updateOne(
    { businessId: clientId, coll: 'products', docId: productId },
    { $set: { data } }
  );
}
