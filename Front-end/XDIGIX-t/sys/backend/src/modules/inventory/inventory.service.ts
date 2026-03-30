import { v4 as uuidv4 } from 'uuid';
import { Product, IProduct, IVariantStock } from './product.schema';
import { Collection, ICollection } from './collection.schema';
import { StockMovement } from './stock-movement.schema';
import { Reservation, IReservationItem } from './reservation.schema';
import { eventBus } from '../platform-core/event-bus.service';
import { auditService } from '../platform-core/audit.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('inventory');

/** Cache to debounce low-stock events per product (productId -> last emitted timestamp). */
const lowStockEmitCache = new Map<string, number>();
const LOW_STOCK_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultStock(): IVariantStock {
  return { on_hand: 0, reserved: 0, damaged: 0, missing: 0 };
}

function computeAvailable(s: IVariantStock): number {
  return s.on_hand - s.reserved - s.damaged - s.missing;
}

function buildStockForVariants(
  variants: Array<{ name: string; values: string[] }>,
  existingStock?: Record<string, IVariantStock>
): Record<string, IVariantStock> {
  const stock: Record<string, IVariantStock> = {};

  if (!variants || variants.length === 0) {
    // Single-variant product: key is "default"
    stock['default'] = existingStock?.['default'] ?? defaultStock();
    return stock;
  }

  // Build all variant combo keys
  const combos = cartesian(variants.map((v) => v.values));
  for (const combo of combos) {
    const key = combo.join('/');
    stock[key] = existingStock?.[key] ?? defaultStock();
  }
  return stock;
}

function cartesian(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const subCombos = cartesian(rest);
  const result: string[][] = [];
  for (const val of first) {
    for (const sub of subCombos) {
      result.push([val, ...sub]);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Product CRUD
// ---------------------------------------------------------------------------

async function createProduct(
  tenantId: string,
  businessId: string,
  data: Partial<IProduct>,
  actor: string
): Promise<IProduct> {
  if (!data.name) throw new Error('Product name is required');
  if (data.price == null || data.price < 0) throw new Error('Valid price is required');

  const variants = data.variants ?? [];
  const stock = buildStockForVariants(variants, data.stock as Record<string, IVariantStock> | undefined);

  const product = await Product.create({
    tenantId,
    businessId,
    name: data.name,
    description: data.description ?? '',
    price: data.price,
    compareAtPrice: data.compareAtPrice,
    sellingPrice: data.sellingPrice,
    currency: data.currency ?? 'EGP',
    images: data.images ?? [],
    vendor: data.vendor,
    sku: data.sku,
    barcode: data.barcode,
    tags: data.tags ?? [],
    variants,
    stock,
    lowStockThreshold: data.lowStockThreshold ?? 0,
    status: data.status ?? 'active',
    collectionId: data.collectionId,
    onSale: data.onSale ?? false,
    salePrice: data.salePrice,
    deleted: false,
  });

  await eventBus.safePublish('product.created', {
    productId: product._id.toString(),
    tenantId,
    businessId,
    name: product.name,
  }, { tenantId });

  await auditService.log({
    actor,
    actorType: 'user',
    module: 'inventory',
    action: 'product.create',
    entityType: 'product',
    entityId: product._id.toString(),
    tenantId,
    details: { name: product.name, sku: product.sku },
  });

  log.info('Product created', { tenantId, productId: product._id.toString() });
  return product;
}

async function updateProduct(
  productId: string,
  data: Partial<IProduct>,
  actor: string
): Promise<IProduct> {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  // Whitelist of updatable fields
  const updatable: (keyof IProduct)[] = [
    'name', 'description', 'price', 'compareAtPrice', 'sellingPrice',
    'currency', 'images', 'vendor', 'sku', 'barcode', 'tags',
    'variants', 'lowStockThreshold', 'status', 'collectionId',
    'onSale', 'salePrice',
  ];

  const $set: Record<string, unknown> = {};
  for (const key of updatable) {
    if (data[key] !== undefined) {
      $set[key] = data[key];
    }
  }

  // If variants changed, ensure stock keys are updated
  if (data.variants) {
    const existingStock = (product.stock ?? {}) as Record<string, IVariantStock>;
    $set.stock = buildStockForVariants(data.variants, existingStock);
  }

  const updated = await Product.findByIdAndUpdate(
    productId,
    { $set },
    { new: true }
  );
  if (!updated) throw new Error('Product update failed');

  await eventBus.safePublish('product.updated', {
    productId,
    tenantId: updated.tenantId,
    businessId: updated.businessId,
    changes: Object.keys($set),
  }, { tenantId: updated.tenantId });

  await auditService.log({
    actor,
    actorType: 'user',
    module: 'inventory',
    action: 'product.update',
    entityType: 'product',
    entityId: productId,
    tenantId: updated.tenantId,
    details: { fields: Object.keys($set) },
  });

  log.info('Product updated', { productId, fields: Object.keys($set).join(',') });
  return updated;
}

async function deleteProduct(productId: string, actor: string): Promise<void> {
  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: { deleted: true, status: 'archived' } },
    { new: true }
  );
  if (!product) throw new Error('Product not found');

  await eventBus.safePublish('product.deleted', {
    productId,
    tenantId: product.tenantId,
    businessId: product.businessId,
  }, { tenantId: product.tenantId });

  await auditService.log({
    actor,
    actorType: 'user',
    module: 'inventory',
    action: 'product.delete',
    entityType: 'product',
    entityId: productId,
    tenantId: product.tenantId,
  });

  log.info('Product soft-deleted', { productId });
}

async function getProduct(productId: string): Promise<IProduct | null> {
  return Product.findById(productId);
}

interface ListProductsOpts {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  collection?: string;
  search?: string;
  ids?: string[];
  status?: string;
}

async function listProducts(
  tenantId: string,
  businessId: string,
  opts: ListProductsOpts = {}
): Promise<{ products: Record<string, unknown>[]; total: number }> {
  const {
    page = 1,
    limit = 20,
    sort = 'createdAt',
    order = 'desc',
    collection,
    search,
    ids,
    status,
  } = opts;

  const filter: Record<string, unknown> = {
    tenantId,
    businessId,
    deleted: { $ne: true },
  };

  if (status) filter.status = status;
  if (collection) filter.collectionId = collection;
  if (ids && ids.length > 0) filter._id = { $in: ids };

  if (search) {
    // Try text search first, fallback to regex
    const textFilter = { ...filter, $text: { $search: search } };
    const textCount = await Product.countDocuments(textFilter);
    if (textCount > 0) {
      const skip = (page - 1) * limit;
      const products = await Product.find(textFilter)
        .sort({ score: { $meta: 'textScore' }, [sort]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      return { products: products.map(enrichProduct), total: textCount };
    }
    // Fallback to regex
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: regex },
      { description: regex },
      { tags: regex },
      { vendor: regex },
      { sku: regex },
    ];
  }

  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { products: products.map(enrichProduct), total };
}

async function searchProducts(
  tenantId: string,
  businessId: string,
  query: string,
  page = 1,
  limit = 20
): Promise<{ products: Record<string, unknown>[]; total: number }> {
  return listProducts(tenantId, businessId, { page, limit, search: query });
}

/** Add computed fields to a lean product. */
function enrichProduct(product: Record<string, unknown>): Record<string, unknown> {
  const stock = (product.stock ?? {}) as Record<string, IVariantStock>;
  let totalStock = 0;
  let totalAvailable = 0;
  const available: Record<string, number> = {};

  for (const [key, s] of Object.entries(stock)) {
    const avail = computeAvailable(s);
    available[key] = avail;
    totalAvailable += avail;
    totalStock += s.on_hand;
  }

  return {
    ...product,
    available,
    totalStock,
    inStock: totalAvailable > 0,
  };
}

// ---------------------------------------------------------------------------
// Collection CRUD
// ---------------------------------------------------------------------------

async function createCollection(
  tenantId: string,
  businessId: string,
  data: Partial<ICollection>,
  actor: string
): Promise<ICollection> {
  if (!data.name) throw new Error('Collection name is required');

  const slug =
    data.slug ??
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const collection = await Collection.create({
    tenantId,
    businessId,
    name: data.name,
    slug,
    description: data.description,
    image: data.image,
    productIds: data.productIds ?? [],
    status: data.status ?? 'active',
  });

  await auditService.log({
    actor,
    actorType: 'user',
    module: 'inventory',
    action: 'collection.create',
    entityType: 'collection',
    entityId: collection._id.toString(),
    tenantId,
    details: { name: collection.name, slug },
  });

  log.info('Collection created', { tenantId, collectionId: collection._id.toString() });
  return collection;
}

async function updateCollection(
  collectionId: string,
  data: Partial<ICollection>,
  actor: string
): Promise<ICollection> {
  const collection = await Collection.findById(collectionId);
  if (!collection) throw new Error('Collection not found');

  const $set: Record<string, unknown> = {};
  if (data.name !== undefined) $set.name = data.name;
  if (data.slug !== undefined) $set.slug = data.slug;
  if (data.description !== undefined) $set.description = data.description;
  if (data.image !== undefined) $set.image = data.image;
  if (data.productIds !== undefined) $set.productIds = data.productIds;
  if (data.status !== undefined) $set.status = data.status;

  const updated = await Collection.findByIdAndUpdate(
    collectionId,
    { $set },
    { new: true }
  );
  if (!updated) throw new Error('Collection update failed');

  await auditService.log({
    actor,
    actorType: 'user',
    module: 'inventory',
    action: 'collection.update',
    entityType: 'collection',
    entityId: collectionId,
    tenantId: updated.tenantId,
    details: { fields: Object.keys($set) },
  });

  log.info('Collection updated', { collectionId });
  return updated;
}

async function listCollections(
  tenantId: string,
  businessId: string
): Promise<ICollection[]> {
  return Collection.find({ tenantId, businessId }).sort({ name: 1 }).lean<ICollection[]>();
}

// ---------------------------------------------------------------------------
// Stock Management
// ---------------------------------------------------------------------------

async function getAvailable(productId: string): Promise<Record<string, number>> {
  const product = await Product.findById(productId).lean();
  if (!product) throw new Error('Product not found');

  const stock = (product.stock ?? {}) as Record<string, IVariantStock>;
  const result: Record<string, number> = {};
  for (const [key, s] of Object.entries(stock)) {
    result[key] = computeAvailable(s);
  }
  return result;
}

async function requestReservation(
  tenantId: string,
  businessId: string,
  orderId: string,
  items: IReservationItem[],
  ttlMinutes: number
): Promise<string> {
  if (!items.length) throw new Error('No items to reserve');

  const reservationId = uuidv4();
  const correlationId = uuidv4();
  const successfulIncrements: Array<{ productId: string; variantId: string; qty: number }> = [];

  try {
    // Phase 1: Atomically reserve each item with optimistic check
    for (const item of items) {
      const result = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          [`stock.${item.variantId}`]: { $exists: true },
          $expr: {
            $gte: [
              {
                $subtract: [
                  { $ifNull: [`$stock.${item.variantId}.on_hand`, 0] },
                  {
                    $add: [
                      { $ifNull: [`$stock.${item.variantId}.reserved`, 0] },
                      { $ifNull: [`$stock.${item.variantId}.damaged`, 0] },
                      { $ifNull: [`$stock.${item.variantId}.missing`, 0] },
                    ],
                  },
                ],
              },
              item.qty,
            ],
          },
        },
        { $inc: { [`stock.${item.variantId}.reserved`]: item.qty } },
        { new: true }
      );

      if (!result) {
        // Get actual availability for error message
        const product = await Product.findById(item.productId).lean();
        const variantStock = product
          ? ((product.stock as Record<string, IVariantStock>)?.[item.variantId] ?? null)
          : null;
        const availableQty = variantStock ? computeAvailable(variantStock) : 0;

        throw new Error(
          `OUT_OF_STOCK: product=${item.productId} variant=${item.variantId} ` +
          `requested=${item.qty} available=${availableQty}`
        );
      }

      successfulIncrements.push({
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
      });
    }

    // Phase 2: Create reservation document
    await Reservation.create({
      reservationId,
      tenantId,
      businessId,
      orderId,
      status: 'active',
      items,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });

    // Phase 3: Create stock movement entries
    const movements = items.map((item) => ({
      tenantId,
      businessId,
      productId: item.productId,
      variantId: item.variantId,
      type: 'reservation' as const,
      qty: -item.qty,
      referenceType: 'reservation',
      referenceId: reservationId,
      actor: 'system',
      correlationId,
      createdAt: new Date(),
    }));
    await StockMovement.insertMany(movements);

    // Phase 4: Emit event
    await eventBus.safePublish('stock.reserved', {
      reservationId,
      orderId,
      tenantId,
      businessId,
      items,
    }, { tenantId, correlationId });

    log.info('Reservation created', { reservationId, orderId, itemCount: String(items.length) });
    return reservationId;
  } catch (err) {
    // Rollback: undo all successful increments
    for (const inc of successfulIncrements) {
      try {
        await Product.findByIdAndUpdate(inc.productId, {
          $inc: { [`stock.${inc.variantId}.reserved`]: -inc.qty },
        });
      } catch (rollbackErr) {
        log.error('Reservation rollback failed', {
          productId: inc.productId,
          variantId: inc.variantId,
          error: (rollbackErr as Error).message,
        });
      }
    }
    throw err;
  }
}

async function releaseReservation(reservationId: string): Promise<void> {
  const reservation = await Reservation.findOne({ reservationId });
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.status !== 'active') {
    throw new Error(`Cannot release reservation with status: ${reservation.status}`);
  }

  const correlationId = uuidv4();

  // Release reserved qty for each item
  for (const item of reservation.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { [`stock.${item.variantId}.reserved`]: -item.qty },
    });
  }

  // Update reservation status
  await Reservation.findOneAndUpdate(
    { reservationId },
    { $set: { status: 'released' } }
  );

  // Create stock movements
  const movements = reservation.items.map((item) => ({
    tenantId: reservation.tenantId,
    businessId: reservation.businessId,
    productId: item.productId,
    variantId: item.variantId,
    type: 'release' as const,
    qty: item.qty,
    referenceType: 'reservation',
    referenceId: reservationId,
    actor: 'system',
    correlationId,
    createdAt: new Date(),
  }));
  await StockMovement.insertMany(movements);

  await eventBus.safePublish('stock.released', {
    reservationId,
    orderId: reservation.orderId,
    tenantId: reservation.tenantId,
    businessId: reservation.businessId,
  }, { tenantId: reservation.tenantId, correlationId });

  log.info('Reservation released', { reservationId });
}

async function confirmFulfillment(reservationId: string): Promise<void> {
  const reservation = await Reservation.findOne({ reservationId });
  if (!reservation) throw new Error('Reservation not found');
  if (reservation.status !== 'active') {
    throw new Error(`Cannot fulfill reservation with status: ${reservation.status}`);
  }

  const correlationId = uuidv4();

  // Decrement both on_hand and reserved
  for (const item of reservation.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: {
        [`stock.${item.variantId}.on_hand`]: -item.qty,
        [`stock.${item.variantId}.reserved`]: -item.qty,
      },
    });
  }

  await Reservation.findOneAndUpdate(
    { reservationId },
    { $set: { status: 'fulfilled' } }
  );

  const movements = reservation.items.map((item) => ({
    tenantId: reservation.tenantId,
    businessId: reservation.businessId,
    productId: item.productId,
    variantId: item.variantId,
    type: 'fulfillment' as const,
    qty: -item.qty,
    referenceType: 'reservation',
    referenceId: reservationId,
    actor: 'system',
    correlationId,
    createdAt: new Date(),
  }));
  await StockMovement.insertMany(movements);

  await eventBus.safePublish('stock.fulfilled', {
    reservationId,
    orderId: reservation.orderId,
    tenantId: reservation.tenantId,
    businessId: reservation.businessId,
  }, { tenantId: reservation.tenantId, correlationId });

  log.info('Reservation fulfilled', { reservationId });

  // Check low stock for all affected products
  for (const item of reservation.items) {
    const product = await Product.findById(item.productId);
    if (product) await checkLowStock(product);
  }
}

async function adjustStock(
  tenantId: string,
  productId: string,
  variantId: string,
  qty: number,
  type: 'receiving' | 'adjustment' | 'return',
  reason: string,
  actor: string
): Promise<void> {
  const result = await Product.findByIdAndUpdate(
    productId,
    { $inc: { [`stock.${variantId}.on_hand`]: qty } },
    { new: true }
  );
  if (!result) throw new Error('Product not found');

  await StockMovement.create({
    tenantId,
    businessId: result.businessId,
    productId,
    variantId,
    type,
    qty,
    reason,
    actor,
    createdAt: new Date(),
  });

  await eventBus.safePublish('stock.adjusted', {
    productId,
    variantId,
    qty,
    type,
    tenantId,
  }, { tenantId });

  await auditService.log({
    actor,
    actorType: 'user',
    module: 'inventory',
    action: `stock.${type}`,
    entityType: 'product',
    entityId: productId,
    tenantId,
    details: { variantId, qty, reason },
  });

  log.info('Stock adjusted', { productId, variantId, qty: String(qty), type });
  await checkLowStock(result);
}

async function recordDamage(
  tenantId: string,
  productId: string,
  variantId: string,
  qty: number,
  reason: string,
  actor: string
): Promise<void> {
  const result = await Product.findByIdAndUpdate(
    productId,
    { $inc: { [`stock.${variantId}.damaged`]: qty } },
    { new: true }
  );
  if (!result) throw new Error('Product not found');

  await StockMovement.create({
    tenantId,
    businessId: result.businessId,
    productId,
    variantId,
    type: 'damage',
    qty: -qty,
    reason,
    actor,
    createdAt: new Date(),
  });

  await auditService.log({
    actor,
    actorType: 'user',
    module: 'inventory',
    action: 'stock.damage',
    entityType: 'product',
    entityId: productId,
    tenantId,
    details: { variantId, qty, reason },
  });

  log.info('Damage recorded', { productId, variantId, qty: String(qty) });
  await checkLowStock(result);
}

async function recordMissing(
  tenantId: string,
  productId: string,
  variantId: string,
  qty: number,
  reason: string,
  actor: string
): Promise<void> {
  const result = await Product.findByIdAndUpdate(
    productId,
    { $inc: { [`stock.${variantId}.missing`]: qty } },
    { new: true }
  );
  if (!result) throw new Error('Product not found');

  await StockMovement.create({
    tenantId,
    businessId: result.businessId,
    productId,
    variantId,
    type: 'missing',
    qty: -qty,
    reason,
    actor,
    createdAt: new Date(),
  });

  await auditService.log({
    actor,
    actorType: 'user',
    module: 'inventory',
    action: 'stock.missing',
    entityType: 'product',
    entityId: productId,
    tenantId,
    details: { variantId, qty, reason },
  });

  log.info('Missing recorded', { productId, variantId, qty: String(qty) });
  await checkLowStock(result);
}

// ---------------------------------------------------------------------------
// Low-stock check
// ---------------------------------------------------------------------------

async function checkLowStock(product: IProduct): Promise<void> {
  if (!product.lowStockThreshold || product.lowStockThreshold <= 0) return;

  const stock = (product.stock ?? {}) as Record<string, IVariantStock>;
  const lowVariants: Array<{ variant: string; available: number }> = [];

  for (const [key, s] of Object.entries(stock)) {
    const avail = computeAvailable(s);
    if (avail < product.lowStockThreshold) {
      lowVariants.push({ variant: key, available: avail });
    }
  }

  if (lowVariants.length === 0) return;

  // Debounce: skip if we emitted for this product recently
  const productId = product._id.toString();
  const lastEmit = lowStockEmitCache.get(productId) ?? 0;
  if (Date.now() - lastEmit < LOW_STOCK_DEBOUNCE_MS) return;

  lowStockEmitCache.set(productId, Date.now());

  await eventBus.safePublish('stock.low', {
    productId,
    tenantId: product.tenantId,
    businessId: product.businessId,
    productName: product.name,
    threshold: product.lowStockThreshold,
    lowVariants,
  }, { tenantId: product.tenantId });

  log.warn('Low stock detected', {
    productId,
    tenantId: product.tenantId,
    variants: lowVariants.map((v) => `${v.variant}:${v.available}`).join(','),
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const inventoryService = {
  // Product CRUD
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  listProducts,
  searchProducts,

  // Collection CRUD
  createCollection,
  updateCollection,
  listCollections,

  // Stock management
  getAvailable,
  requestReservation,
  releaseReservation,
  confirmFulfillment,
  adjustStock,
  recordDamage,
  recordMissing,

  // Helpers (exposed for jobs)
  checkLowStock,
};
