/**
 * Load test seed script — populates MongoDB with test data.
 *
 * Creates a test tenant with products, orders, shipments, tickets,
 * ledger entries, and notifications for realistic load testing.
 *
 * Usage: npx tsx loadtest/seed.ts
 *
 * Environment:
 *   MONGODB_URI  — MongoDB connection string
 *   SEED_TENANT  — tenant ID (default: loadtest-tenant)
 *   SEED_COUNT   — multiplier for data volume (default: 1, max: 10)
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';
const TENANT_ID = process.env.SEED_TENANT || 'loadtest-tenant';
const BUSINESS_ID = `${TENANT_ID}-biz`;
const COUNT = Math.min(Number(process.env.SEED_COUNT) || 1, 10);

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB. Seeding tenant: ${TENANT_ID}, count multiplier: ${COUNT}`);

  const db = mongoose.connection.db!;

  // 1. Tenant + Plan
  await db.collection('tenants').updateOne(
    { tenantId: TENANT_ID },
    { $setOnInsert: { tenantId: TENANT_ID, status: 'active', plan: 'pro', planActivation: 'paid', createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true },
  );
  console.log('Tenant seeded');

  // 2. Products (50 * COUNT)
  const productCount = 50 * COUNT;
  const products = [];
  for (let i = 0; i < productCount; i++) {
    products.push({
      tenantId: TENANT_ID,
      businessId: BUSINESS_ID,
      name: `Load Test Product ${i + 1}`,
      price: 50 + Math.floor(Math.random() * 500),
      currency: 'EGP',
      status: 'active',
      deleted: false,
      sku: `LT-SKU-${String(i + 1).padStart(4, '0')}`,
      stock: { default: { on_hand: 100, reserved: 0, damaged: 0, missing: 0 } },
      lowStockThreshold: 10,
      tags: ['loadtest'],
      variants: [],
      images: [],
      createdAt: new Date(Date.now() - Math.random() * 90 * 86400000),
      updatedAt: new Date(),
    });
  }
  await db.collection('products').deleteMany({ tenantId: TENANT_ID, 'tags': 'loadtest' });
  if (products.length) await db.collection('products').insertMany(products);
  console.log(`${products.length} products seeded`);

  // 3. Orders (100 * COUNT)
  const orderCount = 100 * COUNT;
  const statuses = ['pending', 'awaiting_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  const paymentMethods = ['cod', 'stripe', 'paymob', 'instapay'];
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
      customer: { email: `customer-${i}@loadtest.com`, firstName: 'Load', lastName: `Test ${i}`, phone: '+20100000000' },
      shipping: { address: `${i} Test St`, city: 'Cairo', state: 'Cairo', postalCode: '11511', country: 'EG', method: 'standard', cost: 30 },
      items: [{ productId: products[i % productCount]?.sku || 'p1', name: `Product ${i % productCount}`, price: 100, quantity: 1 + Math.floor(Math.random() * 3) }],
      subtotal: 100,
      shippingCost: 30,
      total: 130,
      currency: 'EGP',
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      paymentStatus: status === 'delivered' ? 'paid' : 'pending',
      status,
      publicLookupToken: `lt-pub-${i}`,
      createdAt: new Date(Date.now() - Math.random() * 60 * 86400000),
      updatedAt: new Date(),
    });
  }
  await db.collection('storefrontorders').deleteMany({ tenantId: TENANT_ID, orderId: /^LT-ORD-/ });
  if (orders.length) await db.collection('storefrontorders').insertMany(orders);
  console.log(`${orders.length} orders seeded`);

  // 4. Shipments (50 * COUNT)
  const shipmentCount = 50 * COUNT;
  const shipStatuses = ['created', 'picked_up', 'in_transit', 'delivered', 'failed_delivery'];
  const shipments = [];
  for (let i = 0; i < shipmentCount; i++) {
    const st = shipStatuses[Math.floor(Math.random() * shipStatuses.length)];
    shipments.push({
      shipmentId: `LT-SHP-${String(i + 1).padStart(6, '0')}`,
      tenantId: TENANT_ID,
      businessId: BUSINESS_ID,
      orderId: orders[i % orderCount]?.orderId || `LT-ORD-${i}`,
      type: 'outbound',
      status: st,
      trackingNumber: `LT-TRK-${String(i + 1).padStart(6, '0')}`,
      shippingAddress: { address: `${i} Ship St`, city: 'Cairo', country: 'EG' },
      codAmount: Math.random() > 0.5 ? 130 : 0,
      codCollected: st === 'delivered' && Math.random() > 0.3,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(Date.now() - Math.random() * 60 * 86400000),
      updatedAt: new Date(),
      pickedUpAt: ['picked_up', 'in_transit', 'delivered'].includes(st) ? new Date(Date.now() - Math.random() * 30 * 86400000) : null,
      deliveredAt: st === 'delivered' ? new Date(Date.now() - Math.random() * 15 * 86400000) : null,
    });
  }
  await db.collection('shipments').deleteMany({ tenantId: TENANT_ID, shipmentId: /^LT-SHP-/ });
  if (shipments.length) await db.collection('shipments').insertMany(shipments);
  console.log(`${shipments.length} shipments seeded`);

  // 5. Ledger entries (100 * COUNT)
  const ledgerCount = 100 * COUNT;
  const ledgerTypes = ['revenue_receivable', 'revenue_recognized', 'payment_received', 'refund', 'cod_receipt'];
  const entries = [];
  for (let i = 0; i < ledgerCount; i++) {
    entries.push({
      tenantId: TENANT_ID,
      businessId: BUSINESS_ID,
      type: ledgerTypes[Math.floor(Math.random() * ledgerTypes.length)],
      amount: 50 + Math.floor(Math.random() * 500),
      currency: 'EGP',
      referenceType: 'order',
      referenceId: orders[i % orderCount]?.orderId || `LT-ORD-${i}`,
      orderId: orders[i % orderCount]?.orderId,
      status: 'pending',
      createdAt: new Date(Date.now() - Math.random() * 90 * 86400000),
    });
  }
  await db.collection('ledgerentries').deleteMany({ tenantId: TENANT_ID });
  if (entries.length) await db.collection('ledgerentries').insertMany(entries);
  console.log(`${entries.length} ledger entries seeded`);

  // 6. Support tickets (20 * COUNT)
  const ticketCount = 20 * COUNT;
  const ticketStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  const tickets = [];
  for (let i = 0; i < ticketCount; i++) {
    tickets.push({
      ticketId: `LT-TKT-${String(i + 1).padStart(4, '0')}`,
      tenantId: TENANT_ID,
      subject: `Load test ticket ${i + 1}`,
      status: ticketStatuses[Math.floor(Math.random() * ticketStatuses.length)],
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      category: 'general',
      visibility: 'tenant',
      createdBy: { type: 'customer', email: `ticket-${i}@loadtest.com` },
      tags: ['loadtest'],
      createdAt: new Date(Date.now() - Math.random() * 60 * 86400000),
      updatedAt: new Date(),
    });
  }
  await db.collection('tickets').deleteMany({ tenantId: TENANT_ID, 'tags': 'loadtest' });
  if (tickets.length) await db.collection('tickets').insertMany(tickets);
  console.log(`${tickets.length} tickets seeded`);

  // 7. Notification logs (50 * COUNT)
  const notifCount = 50 * COUNT;
  const notifStatuses = ['sent', 'failed', 'skipped'];
  const notifs = [];
  for (let i = 0; i < notifCount; i++) {
    notifs.push({
      notificationId: `LT-NOTIF-${String(i + 1).padStart(6, '0')}`,
      tenantId: TENANT_ID,
      recipient: `notif-${i}@loadtest.com`,
      channel: Math.random() > 0.3 ? 'email' : 'sms',
      eventType: 'order.confirmed',
      status: notifStatuses[Math.floor(Math.random() * notifStatuses.length)],
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date(Date.now() - Math.random() * 60 * 86400000),
    });
  }
  await db.collection('notificationlogs').deleteMany({ tenantId: TENANT_ID });
  if (notifs.length) await db.collection('notificationlogs').insertMany(notifs);
  console.log(`${notifs.length} notification logs seeded`);

  console.log('\nSeed complete. Summary:');
  console.log(`  Tenant:        ${TENANT_ID}`);
  console.log(`  Products:      ${productCount}`);
  console.log(`  Orders:        ${orderCount}`);
  console.log(`  Shipments:     ${shipmentCount}`);
  console.log(`  Ledger:        ${ledgerCount}`);
  console.log(`  Tickets:       ${ticketCount}`);
  console.log(`  Notifications: ${notifCount}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
