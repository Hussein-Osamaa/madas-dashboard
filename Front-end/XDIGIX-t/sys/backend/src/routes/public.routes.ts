/**
 * Public Storefront API  (/api/public/:tenantId/*)
 * ──────────────────────────────────────────────────
 * No authentication required — accessible by any storefront visitor.
 * All endpoints are scoped to a single tenant via the URL parameter.
 *
 * Endpoints:
 *   GET  /:tenantId/products                 paginated product list
 *   GET  /:tenantId/products/:id             single product
 *   GET  /:tenantId/collections              collection list
 *   GET  /:tenantId/collections/:slug        collection detail + its products
 *   GET  /:tenantId/cart                     cart by token (header x-cart-token)
 *   POST /:tenantId/cart/add                 add item to cart
 *   PATCH /:tenantId/cart/item               update item quantity
 *   DELETE /:tenantId/cart/item              remove item
 *   DELETE /:tenantId/cart                   clear cart
 *   POST /:tenantId/newsletter/subscribe     subscribe to newsletter
 *   POST /:tenantId/contact                  contact form submission
 */
import { Router, Request, Response } from 'express';
import { cacheGet, cacheSet } from '../lib/cache';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { Business } from '../schemas/business.schema';
import { FirestoreDoc } from '../schemas/document.schema';
import {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
} from '../modules/storefront/cart.service';

/* ── CORS: storefronts are cross-origin ───────────────────────────────────── */
const publicCors = cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });

/* ── Rate limiters ────────────────────────────────────────────────────────── */
const catalogLimiter = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });
const cartLimiter    = rateLimit({ windowMs: 60_000, max:  60, standardHeaders: true, legacyHeaders: false });
const formLimiter    = rateLimit({ windowMs: 60_000, max:   5, standardHeaders: true, legacyHeaders: false });

/* ── Helper: resolve businessId from tenantId ─────────────────────────────── */
async function resolveBusiness(
  tenantId: string
): Promise<{ businessId: string; currency: string } | null> {
  const biz = await Business.findOne({ tenantId }).lean() as {
    businessId: string;
    plan?: { currency?: string };
  } | null;
  if (!biz) return null;
  return {
    businessId: biz.businessId,
    currency:   biz.plan?.currency || 'SAR',
  };
}

/* ── Helper: strip internal Mongo fields ─────────────────────────────────── */
function stripMeta(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, __v, businessId: _b, tenantId: _t, coll: _c, ...rest } = doc;
  return rest;
}

const router = Router({ mergeParams: true });
router.use(publicCors);

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/public/:tenantId/search
 * Full-text product search across name, description, tags, vendor, SKU.
 * Uses MongoDB text index with weighted scoring.
 * Query params: q (search query), page, limit
 */
router.get('/:tenantId/search', catalogLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const q = ((req.query.q as string) || '').trim().slice(0, 200);
  if (!q) { res.json({ products: [], total: 0, query: '' }); return; }

  // Redis cache — 30s TTL for search results
  const cacheKey = `search:${tenantId}:${q}:${req.query.page || 1}`;
  const cached = await cacheGet<Record<string, unknown>>(cacheKey);
  if (cached) { res.json(cached); return; }

  const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const skip  = (page - 1) * limit;

  try {
    const baseFilter: Record<string, unknown> = {
      businessId: biz.businessId,
      coll: 'products',
      'data.deleted': { $ne: true },
    };

    // Try text search first (uses indexed fields: name, description, tags, vendor, sku)
    const textFilter = { ...baseFilter, $text: { $search: q } };
    let [docs, total] = await Promise.all([
      FirestoreDoc.find(textFilter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip).limit(limit).lean(),
      FirestoreDoc.countDocuments(textFilter),
    ]);

    // Fallback to regex if text search returns nothing (partial word matching)
    if (docs.length === 0) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexFilter = {
        ...baseFilter,
        $or: [
          { 'data.name': { $regex: escaped, $options: 'i' } },
          { 'data.description': { $regex: escaped, $options: 'i' } },
          { 'data.tags': { $regex: escaped, $options: 'i' } },
          { 'data.vendor': { $regex: escaped, $options: 'i' } },
          { 'data.sku': { $regex: escaped, $options: 'i' } },
        ],
      };
      [docs, total] = await Promise.all([
        FirestoreDoc.find(regexFilter).skip(skip).limit(limit).lean(),
        FirestoreDoc.countDocuments(regexFilter),
      ]);
    }

    const products = docs.map((d: any) => ({
      id: d.docId,
      ...(d.data as Record<string, unknown>),
    }));
    const result = { products, total, query: q, page, limit };
    await cacheSet(cacheKey, result, 30); // 30s TTL
    res.json(result);
  } catch (err) {
    // Text index might not exist yet — fallback to regex only
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexFilter = {
      businessId: biz.businessId,
      coll: 'products',
      'data.deleted': { $ne: true },
      'data.name': { $regex: escaped, $options: 'i' },
    };
    const [docs, total] = await Promise.all([
      FirestoreDoc.find(regexFilter).skip(skip).limit(limit).lean(),
      FirestoreDoc.countDocuments(regexFilter),
    ]);
    res.json({
      products: docs.map((d: any) => ({ id: d.docId, ...(d.data as Record<string, unknown>) })),
      total, query: q, page, limit,
    });
  }
});

/**
 * GET /api/public/:tenantId/products
 * Query params: page, limit, sort (name|price|createdAt), order (asc|desc), collection, search
 */
router.get('/:tenantId/products', catalogLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const page        = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit       = Math.min(50, parseInt(req.query.limit as string) || 20);
  const skip        = (page - 1) * limit;
  const sortField   = ['name', 'price', 'createdAt'].includes(req.query.sort as string)
    ? `data.${req.query.sort}`
    : 'data.name';
  const sortOrder   = req.query.order === 'desc' ? -1 : 1;
  const collection  = req.query.collection as string | undefined;
  const search      = req.query.search     as string | undefined;

  // Redis cache — 60s TTL for product listings
  const prodCacheKey = `products:${tenantId}:${page}:${limit}:${sortField}:${sortOrder}:${collection || ''}:${search || ''}:${req.query.ids || ''}`;
  const prodCached = await cacheGet<Record<string, unknown>>(prodCacheKey);
  if (prodCached) { res.json(prodCached); return; }

  const filter: Record<string, unknown> = {
    businessId: biz.businessId,
    coll:       'products',
    'data.deleted': { $ne: true },
  };
  if (collection) filter['data.collectionId'] = collection;
  if (search) {
    // Escape regex special characters to prevent ReDoS / injection
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
    filter['data.name'] = { $regex: escaped, $options: 'i' };
  }
  // Filter by specific product IDs (used by sections with selectedProducts)
  const ids = req.query.ids as string | undefined;
  if (ids) {
    const idList = ids.split(',').slice(0, 100).map((s: string) => s.trim()).filter(Boolean);
    if (idList.length > 0) filter['docId'] = { $in: idList };
  }

  const [docs, total] = await Promise.all([
    FirestoreDoc.find(filter)
      .sort({ [sortField]: sortOrder } as Record<string, 1 | -1>)
      .skip(skip)
      .limit(limit)
      .lean(),
    FirestoreDoc.countDocuments(filter),
  ]);

  const products = docs.map(d => {
    const raw = { id: d.docId, ...stripMeta(d as unknown as Record<string, unknown>), ...((d as {data?: Record<string, unknown>}).data || {}) } as Record<string, unknown>;
    // Compute available stock = physical stock - reserved (pending orders)
    const stockMap = (raw.stock ?? {}) as Record<string, number>;
    const reservedMap = (raw.reservedStock ?? {}) as Record<string, number>;
    const totalAvailable = Object.keys(stockMap).reduce((s, k) => s + Math.max(0, (Number(stockMap[k]) || 0) - (Number(reservedMap[k]) || 0)), 0);
    raw.totalStock = totalAvailable;
    raw.inStock = totalAvailable > 0;
    // Don't expose reservedStock to public API
    delete raw.reservedStock;
    return raw;
  });

  const prodResult = { products, total, page, limit, hasMore: skip + limit < total };
  await cacheSet(prodCacheKey, prodResult, 60); // 60s TTL

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  res.json({
    products,
    total,
    page,
    limit,
    hasMore: skip + products.length < total,
  });
});

/**
 * GET /api/public/:tenantId/products/:id
 */
router.get('/:tenantId/products/:id', catalogLimiter, async (req: Request, res: Response) => {
  const { tenantId, id } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const doc = await FirestoreDoc.findOne({
    businessId: biz.businessId,
    coll:       'products',
    docId:      id,
    'data.deleted': { $ne: true },
  }).lean();

  if (!doc) { res.status(404).json({ error: 'Product not found' }); return; }

  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  res.json({ id: doc.docId, ...(doc as {data?: Record<string, unknown>}).data });
});

/* ═══════════════════════════════════════════════════════════════════════════
   COLLECTIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/public/:tenantId/collections
 */
router.get('/:tenantId/collections', catalogLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const docs = await FirestoreDoc.find({
    businessId: biz.businessId,
    coll:       'collections',
    'data.deleted': { $ne: true },
  }).lean();

  const collections = docs.map(d => ({ id: d.docId, ...(d as {data?: Record<string, unknown>}).data }));
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  res.json({ collections });
});

/**
 * GET /api/public/:tenantId/collections/:slug
 * Returns collection metadata + its first 20 products.
 */
router.get('/:tenantId/collections/:slug', catalogLimiter, async (req: Request, res: Response) => {
  const { tenantId, slug } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  // Find collection by slug or docId
  const collDoc = await FirestoreDoc.findOne({
    businessId: biz.businessId,
    coll: 'collections',
    $or: [{ docId: slug }, { 'data.slug': slug }, { 'data.id': slug }],
  }).lean();

  if (!collDoc) { res.status(404).json({ error: 'Collection not found' }); return; }

  const collectionId = collDoc.docId;
  const productDocs  = await FirestoreDoc.find({
    businessId: biz.businessId,
    coll:       'products',
    'data.collectionId': collectionId,
    'data.deleted':      { $ne: true },
  }).limit(20).lean();

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  res.json({
    collection: { id: collDoc.docId, ...(collDoc as {data?: Record<string, unknown>}).data },
    products:   productDocs.map(d => ({ id: d.docId, ...(d as {data?: Record<string, unknown>}).data })),
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   CART
═══════════════════════════════════════════════════════════════════════════ */

function getCartToken(req: Request): string | undefined {
  return (req.headers['x-cart-token'] as string | undefined) ||
         (req.query.cartToken as string | undefined);
}

/**
 * GET /api/public/:tenantId/cart
 */
router.get('/:tenantId/cart', cartLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const cartToken = getCartToken(req);
  const cart = await getCart(cartToken, tenantId, biz.businessId, biz.currency);
  res.json(cart);
});

/**
 * POST /api/public/:tenantId/cart/add
 * Body: { cartToken?, productId, variantId?, name, price, imageUrl?, quantity? }
 */
router.post('/:tenantId/cart/add', cartLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const { cartToken, productId, variantId, name, price, imageUrl, quantity } = req.body as {
    cartToken?: string;
    productId:  string;
    variantId?: string;
    name:       string;
    price:      number;
    imageUrl?:  string;
    quantity?:  number;
  };

  if (!productId || !name || price === undefined) {
    res.status(400).json({ error: 'productId, name, and price are required' });
    return;
  }

  // Stock availability check — prevent adding out-of-stock items
  try {
    const productDoc = await FirestoreDoc.findOne(
      { businessId: biz.businessId, coll: 'products', docId: productId },
      { 'data.stock': 1, 'data.reservedStock': 1 },
    ).lean();
    const pData = (productDoc as { data?: Record<string, unknown> })?.data ?? {};
    const stockMap = (pData.stock ?? {}) as Record<string, number>;
    const reservedMap = (pData.reservedStock ?? {}) as Record<string, number>;
    const sizeKey = variantId || Object.keys(stockMap)[0] || '';
    const available = sizeKey
      ? (Number(stockMap[sizeKey]) || 0) - (Number(reservedMap[sizeKey]) || 0)
      : Object.keys(stockMap).reduce((s, k) => s + Math.max(0, (Number(stockMap[k]) || 0) - (Number(reservedMap[k]) || 0)), 0);
    const requestedQty = quantity ?? 1;
    if (available < requestedQty) {
      res.status(400).json({ error: 'Out of stock', code: 'OUT_OF_STOCK', available: Math.max(0, available) });
      return;
    }
  } catch {
    // If stock check fails, allow the add (don't block sales on stock check errors)
  }

  const cart = await addToCart(
    cartToken ?? getCartToken(req),
    tenantId,
    biz.businessId,
    { productId, variantId, name, price: Number(price), imageUrl, quantity },
    biz.currency,
  );
  res.json(cart);
});

/**
 * PATCH /api/public/:tenantId/cart/item
 * Body: { cartToken, productId, variantId?, quantity }
 */
router.patch('/:tenantId/cart/item', cartLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const { cartToken, productId, variantId, quantity } = req.body as {
    cartToken:  string;
    productId:  string;
    variantId?: string;
    quantity:   number;
  };

  if (!cartToken || !productId || quantity === undefined) {
    res.status(400).json({ error: 'cartToken, productId and quantity are required' });
    return;
  }

  const cart = await updateCartItem(cartToken, tenantId, productId, variantId, Number(quantity));
  res.json(cart);
});

/**
 * DELETE /api/public/:tenantId/cart/item
 * Body: { cartToken, productId, variantId? }
 */
router.delete('/:tenantId/cart/item', cartLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const { cartToken, productId, variantId } = req.body as {
    cartToken:  string;
    productId:  string;
    variantId?: string;
  };

  if (!cartToken || !productId) {
    res.status(400).json({ error: 'cartToken and productId are required' });
    return;
  }

  const cart = await removeFromCart(cartToken, tenantId, productId, variantId);
  res.json(cart);
});

/**
 * DELETE /api/public/:tenantId/cart
 * Body: { cartToken }
 */
router.delete('/:tenantId/cart', cartLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const { cartToken } = req.body as { cartToken: string };
  if (!cartToken) { res.status(400).json({ error: 'cartToken is required' }); return; }

  const cart = await clearCart(cartToken, tenantId);
  res.json(cart);
});

/* ═══════════════════════════════════════════════════════════════════════════
   PAYMENT METHODS
═══════════════════════════════════════════════════════════════════════════ */

const PAYMENT_METHOD_LABELS: Record<string, { label: string; type: string }> = {
  cod:           { label: 'Cash on Delivery', type: 'offline' },
  stripe:        { label: 'Credit / Debit Card', type: 'online' },
  paymob:        { label: 'Paymob', type: 'online' },
  fawry:         { label: 'Fawry', type: 'online' },
  instapay:      { label: 'InstaPay', type: 'manual' },
  vodafone_cash: { label: 'Vodafone Cash', type: 'manual' },
  bank_transfer: { label: 'Bank Transfer', type: 'manual' },
};

/**
 * GET /api/public/:tenantId/payment-methods
 * Returns enabled payment methods with public-safe info (no secret keys).
 */
router.get('/:tenantId/payment-methods', catalogLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  // Redis cache — 300s TTL for payment methods (rarely change)
  const pmCacheKey = `paymethods:${tenantId}`;
  const pmCached = await cacheGet<Record<string, unknown>>(pmCacheKey);
  if (pmCached) { res.json(pmCached); return; }

  try {
    const doc = await FirestoreDoc.findOne({
      businessId: biz.businessId,
      coll: 'settings',
      docId: 'payments',
    }).lean();
    const settings = ((doc?.data ?? {}) as Record<string, any>);
    const methods: Array<Record<string, unknown>> = [];

    for (const [code, meta] of Object.entries(PAYMENT_METHOD_LABELS)) {
      const config = settings[code];
      if (!config || !config.enabled) continue;
      const method: Record<string, unknown> = {
        code,
        label: meta.label,
        type: meta.type,
        enabled: true,
      };
      // Include only public-safe fields per method
      if (code === 'stripe' && config.publishableKey) {
        method.publishableKey = config.publishableKey;
      }
      if (code === 'instapay') {
        if (config.accountName) method.accountName = config.accountName;
        if (config.accountNumber) method.accountNumber = config.accountNumber;
        if (config.instructions) method.instructions = String(config.instructions).slice(0, 1000);
      }
      if (code === 'vodafone_cash') {
        if (config.phoneNumber) method.phoneNumber = config.phoneNumber;
        if (config.instructions) method.instructions = String(config.instructions).slice(0, 1000);
      }
      if (code === 'bank_transfer') {
        if (config.bankName) method.bankName = config.bankName;
        if (config.accountName) method.accountName = config.accountName;
        if (config.accountNumber) method.accountNumber = config.accountNumber;
        if (config.iban) method.iban = config.iban;
        if (config.instructions) method.instructions = String(config.instructions).slice(0, 1000);
      }
      if (code === 'cod') {
        if (config.maxOrderAmount) method.maxOrderAmount = config.maxOrderAmount;
        if (config.instructions) method.instructions = String(config.instructions).slice(0, 1000);
      }
      methods.push(method);
    }

    const pmResult = { currency: biz.currency || 'SAR', methods };
    await cacheSet(pmCacheKey, pmResult, 300); // 5min TTL
    res.json(pmResult);
  } catch (err) {
    console.error('[payment-methods] Error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to load payment methods' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   NEWSLETTER
═══════════════════════════════════════════════════════════════════════════ */

/**
 * POST /api/public/:tenantId/newsletter/subscribe
 * Body: { email, source? }
 */
router.post('/:tenantId/newsletter/subscribe', formLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const { email, source } = req.body as { email?: string; source?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }

  // Upsert subscriber in the business's subscribers subcollection
  const docId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  await FirestoreDoc.findOneAndUpdate(
    { businessId: biz.businessId, tenantId, coll: 'newsletter_subscribers', docId },
    {
      $set: {
        businessId: biz.businessId,
        tenantId,
        coll:  'newsletter_subscribers',
        docId,
        data: {
          email:       email.toLowerCase(),
          source:      source || 'storefront',
          subscribedAt: new Date().toISOString(),
          active:      true,
        },
      },
    },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, message: 'Subscribed successfully' });
});

/* ═══════════════════════════════════════════════════════════════════════════
   CONTACT FORM
═══════════════════════════════════════════════════════════════════════════ */

/**
 * POST /api/public/:tenantId/contact
 * Body: { name, email, message, subject? }
 */
router.post('/:tenantId/contact', formLimiter, async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const biz = await resolveBusiness(tenantId);
  if (!biz) { res.status(404).json({ error: 'Store not found' }); return; }

  const { name, email, message, subject } = req.body as {
    name?:    string;
    email?:   string;
    message?: string;
    subject?: string;
  };

  if (!name || !email || !message) {
    res.status(400).json({ error: 'name, email and message are required' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }

  const docId = `contact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await FirestoreDoc.create({
    businessId: biz.businessId,
    tenantId,
    coll:  'contact_submissions',
    docId,
    data: {
      name,
      email,
      subject: subject || '',
      message,
      submittedAt: new Date().toISOString(),
      status: 'new',
    },
  });

  res.status(201).json({ success: true, message: 'Message received, we will get back to you soon.' });
});

export default router;
