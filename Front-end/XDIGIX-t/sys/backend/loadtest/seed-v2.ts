/**
 * Load test seed v2 — seeds ALL collections the routes actually query.
 *
 * Key insight: Public routes query `firestoredocs` (legacy), not `products`.
 * Also seeds: businesses (for tenant resolution), tenant, and a test JWT.
 */
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix-loadtest';
const TENANT_ID = process.env.SEED_TENANT || 'loadtest-tenant';
const BUSINESS_ID = `${TENANT_ID}-biz`;
const COUNT = Math.min(Number(process.env.SEED_COUNT) || 1, 10);
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-local-only';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected. Seeding ${TENANT_ID}, count=${COUNT}`);
  const db = mongoose.connection.db!;

  // 1. Business (for tenant→business resolution in public routes)
  await db.collection('businesses').updateOne(
    { businessId: BUSINESS_ID },
    {
      $setOnInsert: {
        businessId: BUSINESS_ID,
        tenantId: TENANT_ID,
        name: 'Load Test Store',
        currency: 'EGP',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  console.log('Business seeded');

  // 2. Tenant
  await db.collection('tenants').updateOne(
    { tenantId: TENANT_ID },
    {
      $setOnInsert: {
        tenantId: TENANT_ID,
        status: 'active',
        plan: 'pro',
        planActivation: 'paid',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  console.log('Tenant seeded');

  // 3. Plans
  const plans = [
    { planId: 'free', name: 'Free', limits: { products: 50, staff: 2, sites: 1, monthlyOrders: 100, storageMB: 500 }, price: 0, currency: 'USD', isActive: true },
    { planId: 'pro', name: 'Pro', limits: { products: -1, staff: 25, sites: 10, monthlyOrders: -1, storageMB: 10000 }, price: 79, currency: 'USD', isActive: true },
  ];
  for (const p of plans) {
    await db.collection('plans').updateOne({ planId: p.planId }, { $setOnInsert: p }, { upsert: true });
  }
  console.log('Plans seeded');

  // 4. Products in firestoredocs (what public routes actually query)
  const productCount = 50 * COUNT;
  await db.collection('firestoredocs').deleteMany({ tenantId: TENANT_ID, coll: 'products' });
  const products = [];
  for (let i = 0; i < productCount; i++) {
    products.push({
      tenantId: TENANT_ID,
      businessId: BUSINESS_ID,
      coll: 'products',
      docId: `prod-${String(i + 1).padStart(4, '0')}`,
      data: {
        name: `Load Test Product ${i + 1}`,
        price: 50 + Math.floor(Math.random() * 500),
        sellingPrice: 50 + Math.floor(Math.random() * 500),
        currency: 'EGP',
        deleted: false,
        stock: { default: 100, M: 50, L: 50 },
        reservedStock: { default: 0, M: 0, L: 0 },
        images: [`https://placeholder.com/product-${i}.jpg`],
        description: `Test product ${i + 1} for load testing`,
        tags: ['loadtest', 'test'],
        sku: `LT-SKU-${String(i + 1).padStart(4, '0')}`,
        vendor: 'Load Test Vendor',
      },
      createdAt: new Date(Date.now() - Math.random() * 90 * 86400000),
      updatedAt: new Date(),
    });
  }
  if (products.length) await db.collection('firestoredocs').insertMany(products);
  console.log(`${productCount} products seeded (firestoredocs)`);

  // Also seed into products collection for module queries
  await db.collection('products').deleteMany({ tenantId: TENANT_ID, 'tags': 'loadtest' });
  const moduleProducts = products.map((p) => ({
    tenantId: p.tenantId,
    businessId: p.businessId,
    name: p.data.name,
    price: p.data.price,
    currency: 'EGP',
    status: 'active',
    deleted: false,
    sku: p.data.sku,
    stock: { default: { on_hand: 100, reserved: 0, damaged: 0, missing: 0 } },
    lowStockThreshold: 10,
    tags: ['loadtest'],
    variants: [],
    images: [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  if (moduleProducts.length) await db.collection('products').insertMany(moduleProducts);

  // 5. Orders (in storefrontorders)
  const orderCount = 100 * COUNT;
  const statuses = ['pending', 'awaiting_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const paymentMethods = ['cod', 'stripe', 'paymob', 'instapay'];
  await db.collection('storefrontorders').deleteMany({ tenantId: TENANT_ID, orderId: /^LT-ORD-/ });
  const orders = [];
  for (let i = 0; i < orderCount; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    orders.push({
      orderId: `LT-ORD-${String(i + 1).padStart(6, '0')}`,
      tenantId: TENANT_ID,
      businessId: BUSINESS_ID,
      siteId: `${TENANT_ID}-site`,
      cartToken: `lt-cart-${i}`,
      checkoutSource: 'storefront',
      customer: { email: `c${i}@loadtest.com`, firstName: 'Load', lastName: `Test${i}`, phone: '+20100000000' },
      shipping: { address: `${i} St`, city: 'Cairo', state: 'Cairo', postalCode: '11511', country: 'EG', method: 'standard', cost: 30 },
      items: [{ productId: `prod-${String((i % productCount) + 1).padStart(4, '0')}`, name: `Product ${i % productCount}`, price: 100, quantity: 1 }],
      subtotal: 100, shippingCost: 30, total: 130, currency: 'EGP',
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      paymentStatus: status === 'delivered' ? 'paid' : 'pending',
      status,
      publicLookupToken: `lt-pub-${i}`,
      createdAt: new Date(Date.now() - Math.random() * 60 * 86400000),
      updatedAt: new Date(),
    });
  }
  if (orders.length) await db.collection('storefrontorders').insertMany(orders);
  console.log(`${orderCount} orders seeded`);

  // 6. Shipments
  const shipCount = 50 * COUNT;
  await db.collection('shipments').deleteMany({ tenantId: TENANT_ID, shipmentId: /^LT-SHP-/ });
  const shipments = [];
  for (let i = 0; i < shipCount; i++) {
    const st = ['created', 'picked_up', 'in_transit', 'delivered', 'failed_delivery'][Math.floor(Math.random() * 5)];
    shipments.push({
      shipmentId: `LT-SHP-${String(i + 1).padStart(6, '0')}`,
      tenantId: TENANT_ID, businessId: BUSINESS_ID,
      orderId: orders[i % orderCount]?.orderId,
      type: 'outbound', status: st,
      trackingNumber: `LT-TRK-${String(i + 1).padStart(6, '0')}`,
      shippingAddress: { address: `${i} Ship St`, city: 'Cairo', country: 'EG' },
      codAmount: Math.random() > 0.5 ? 130 : 0,
      codCollected: st === 'delivered',
      retryCount: 0, maxRetries: 3,
      createdAt: new Date(Date.now() - Math.random() * 60 * 86400000),
      updatedAt: new Date(),
      pickedUpAt: ['picked_up', 'in_transit', 'delivered'].includes(st) ? new Date() : null,
      deliveredAt: st === 'delivered' ? new Date() : null,
    });
  }
  if (shipments.length) await db.collection('shipments').insertMany(shipments);
  console.log(`${shipCount} shipments seeded`);

  // 7. Ledger entries
  const ledgerCount = 100 * COUNT;
  await db.collection('ledgerentries').deleteMany({ tenantId: TENANT_ID });
  const entries = [];
  const ledgerTypes = ['revenue_receivable', 'revenue_recognized', 'payment_received', 'refund', 'cod_receipt'];
  for (let i = 0; i < ledgerCount; i++) {
    entries.push({
      tenantId: TENANT_ID, businessId: BUSINESS_ID,
      type: ledgerTypes[Math.floor(Math.random() * ledgerTypes.length)],
      amount: 50 + Math.floor(Math.random() * 500), currency: 'EGP',
      referenceType: 'order', referenceId: orders[i % orderCount]?.orderId,
      orderId: orders[i % orderCount]?.orderId, status: 'pending',
      createdAt: new Date(Date.now() - Math.random() * 90 * 86400000),
    });
  }
  if (entries.length) await db.collection('ledgerentries').insertMany(entries);
  console.log(`${ledgerCount} ledger entries seeded`);

  // 8. Support tickets
  const ticketCount = 20 * COUNT;
  await db.collection('tickets').deleteMany({ tenantId: TENANT_ID, 'tags': 'loadtest' });
  const tickets = [];
  for (let i = 0; i < ticketCount; i++) {
    tickets.push({
      ticketId: `LT-TKT-${String(i + 1).padStart(4, '0')}`,
      tenantId: TENANT_ID, subject: `Ticket ${i + 1}`,
      status: ['open', 'in_progress', 'resolved', 'closed'][Math.floor(Math.random() * 4)],
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      category: 'general', visibility: 'tenant',
      createdBy: { type: 'customer', email: `t${i}@loadtest.com` },
      tags: ['loadtest'],
      createdAt: new Date(Date.now() - Math.random() * 60 * 86400000),
      updatedAt: new Date(),
    });
  }
  if (tickets.length) await db.collection('tickets').insertMany(tickets);
  console.log(`${ticketCount} tickets seeded`);

  // 9. Notification logs
  await db.collection('notificationlogs').deleteMany({ tenantId: TENANT_ID });
  const notifs = [];
  for (let i = 0; i < 50 * COUNT; i++) {
    notifs.push({
      notificationId: `LT-N-${String(i + 1).padStart(6, '0')}`,
      tenantId: TENANT_ID, recipient: `n${i}@loadtest.com`,
      channel: Math.random() > 0.3 ? 'email' : 'sms', eventType: 'order.confirmed',
      status: ['sent', 'failed', 'skipped'][Math.floor(Math.random() * 3)],
      attempts: 1, maxAttempts: 3,
      createdAt: new Date(Date.now() - Math.random() * 60 * 86400000),
    });
  }
  if (notifs.length) await db.collection('notificationlogs').insertMany(notifs);

  // 10. Generate test JWT
  const adminToken = jwt.sign(
    { userId: 'loadtest-admin', accountType: 'ADMIN', email: 'admin@loadtest.com', role: 'super_admin' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '24h' },
  );
  const merchantToken = jwt.sign(
    { userId: 'loadtest-merchant', accountType: 'CLIENT', email: 'merchant@loadtest.com', role: 'owner', businessId: BUSINESS_ID, tenantId: TENANT_ID },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '24h' },
  );

  console.log(`\n✅ Seed complete.`);
  console.log(`\nTest tokens (valid 24h):`);
  console.log(`ADMIN_TOKEN=${adminToken}`);
  console.log(`MERCHANT_TOKEN=${merchantToken}`);

  await mongoose.disconnect();
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
