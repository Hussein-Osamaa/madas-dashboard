/**
 * Firebase Firestore → MongoDB Migration Script
 *
 * Migrates: businesses → clients, products, orders, users
 *
 * Prerequisites:
 * 1. Firebase service account key: Download from Firebase Console → Project Settings → Service Accounts → Generate new private key
 * 2. Save as backend/firebase-service-account.json (or set FIREBASE_SERVICE_ACCOUNT_PATH)
 * 3. MongoDB running and MONGODB_URI in .env
 * 4. Run: node scripts/migrate-firebase-to-mongodb.js
 */
require('dotenv').config();
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const Client = require('../src/models/Client');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const User = require('../src/models/User');

// ============ Config ============
const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '..', 'firebase-service-account.json');

// ============ Initialize ============
function initFirebase() {
  if (admin.apps.length) return admin.firestore();

  let serviceAccount = null;

  // Option 1: JSON string in env (e.g. FIREBASE_SERVICE_ACCOUNT_JSON)
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonEnv) {
    try {
      serviceAccount = JSON.parse(jsonEnv);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON');
    }
  }
  // Option 2: Path to JSON file
  else if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  }

  if (!serviceAccount) {
    const msg = [
      'Firebase service account not found.',
      '',
      'To fix:',
      '1. Go to https://console.firebase.google.com',
      '2. Select your project (madas-store)',
      '3. Project Settings (gear) → Service accounts',
      '4. Click "Generate new private key"',
      '5. Save the file as: backend/firebase-service-account.json',
      '',
      'Or set FIREBASE_SERVICE_ACCOUNT_PATH in .env to your key file path.',
    ].join('\n');
    throw new Error(msg);
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

// ============ Helpers ============
function toPlain(obj) {
  if (!obj) return null;
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = toPlain(obj[k]);
    return out;
  }
  return obj;
}

/** Normalize Firebase quantity: can be number, or object like { small: 9, medium: 10 } */
function normalizeQuantityAndVariants(plain) {
  const rawVariants = plain.variants || [];
  const rawQty = plain.quantity ?? plain.stock;

  if (rawVariants.length > 0) {
    const variants = rawVariants.map((v) => ({
      size: v.size,
      color: v.color,
      sku: v.sku,
      barcode: v.barcode,
      quantity: typeof v.quantity === 'number' ? v.quantity : v.stock ?? 0,
      costPrice: v.costPrice,
      sellingPrice: v.sellingPrice ?? v.price,
    }));
    const totalQty = variants.reduce((s, v) => s + (v.quantity || 0), 0);
    return { variants, totalQty };
  }

  if (rawQty && typeof rawQty === 'object' && !Array.isArray(rawQty)) {
    const variants = Object.entries(rawQty).map(([size, qty]) => ({
      size,
      quantity: typeof qty === 'number' ? qty : 0,
    }));
    const totalQty = variants.reduce((s, v) => s + (v.quantity || 0), 0);
    return { variants, totalQty };
  }

  const totalQty = typeof rawQty === 'number' && !isNaN(rawQty) ? rawQty : 0;
  return { variants: [], totalQty };
}

// ============ Migration ============
async function migrate() {
  const db = initFirebase();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/xdigix_db';
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');

  // Ensure we have a migration user for createdBy references
  let migrationUserId;
  const migrationUser = await User.findOne({ email: 'migration@xdigix.local' });
  if (migrationUser) {
    migrationUserId = migrationUser._id;
    console.log('Using existing migration user');
  } else {
    const created = await User.create({
      name: 'Migration System',
      email: 'migration@xdigix.local',
      password: require('crypto').randomBytes(16).toString('hex'),
      role: 'admin',
      active: false,
    });
    migrationUserId = created._id;
    console.log('Created migration user for createdBy references');
  }

  const businessToClientId = new Map();
  const productIdMap = new Map();

  // --- 1. Businesses → Clients ---
  console.log('\n1. Migrating businesses → clients...');
  const businessesSnap = await db.collection('businesses').get();
  for (const doc of businessesSnap.docs) {
    const d = doc.data();
    const plain = toPlain(d);
    const client = await Client.create({
      brandName: plain.businessName || plain.brandName || doc.id,
      owner: {
        name: plain.owner?.name || 'Owner',
        email: plain.owner?.email || `owner-${doc.id}@migrated.local`,
        phone: plain.owner?.phone,
      },
      contact: plain.contact || {},
      subscriptionPlan: plain.plan?.type || plain.subscriptionPlan || 'standard',
      active: plain.active !== false,
    });
    businessToClientId.set(doc.id, client._id.toString());
    console.log(`  - ${doc.id} → ${client.brandName} (${client._id})`);
  }
  console.log(`  Migrated ${businessToClientId.size} businesses`);

  // --- 2. Products (per business) ---
  console.log('\n2. Migrating products...');
  for (const [businessId, clientId] of businessToClientId) {
    const productsSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('products')
      .get();
    for (const doc of productsSnap.docs) {
      const d = doc.data();
      const plain = toPlain(d);
      const { variants, totalQty } = normalizeQuantityAndVariants(plain);
      const product = await Product.create({
        clientId,
        name: plain.name || 'Unnamed Product',
        sku: plain.sku,
        barcode: plain.barcode,
        variants: variants.length > 0 ? variants : [],
        costPrice: plain.costPrice ?? 0,
        sellingPrice: plain.sellingPrice ?? plain.price ?? 0,
        quantity: totalQty,
        lowStockAlert: plain.lowStockAlert ?? 5,
        active: plain.active !== false,
      });
      productIdMap.set(`${businessId}/${doc.id}`, product._id.toString());
    }
    console.log(`  - ${businessId}: ${productsSnap.size} products`);
  }
  console.log(`  Migrated ${productIdMap.size} products`);

  // --- 3. Orders (per business) ---
  console.log('\n3. Migrating orders...');
  let orderCount = 0;
  for (const [businessId, clientId] of businessToClientId) {
    const ordersSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('orders')
      .get();
    for (const doc of ordersSnap.docs) {
      const d = doc.data();
      const plain = toPlain(d);
      const customer = plain.customer || {};
      const financials = plain.financials || {};
      const fulfillment = plain.fulfillment || {};
      const payment = plain.payment || {};
      const items = (plain.items || [])
        .map((item) => {
          const fbProductId = item.productId || item.product;
          const mongoProductId = productIdMap.get(`${businessId}/${fbProductId}`);
          if (!mongoProductId) return null;
          return {
            product: mongoProductId,
            productName: item.name || item.productName,
            sku: item.sku,
            quantity: item.quantity || 1,
            unitPrice: item.price || item.unitPrice || 0,
            totalPrice: (item.quantity || 1) * (item.price || item.unitPrice || 0),
          };
        })
        .filter(Boolean);
      const totalPrice =
        financials.total ?? plain.total ?? plain.totalPrice ?? 0;
      const address =
        typeof fulfillment.address === 'string'
          ? fulfillment.address
          : plain.shippingAddress?.address ||
            plain.address ||
            [customer.address, customer.city, customer.country].filter(Boolean).join(', ') ||
            'Unknown';

      if (items.length === 0) {
        console.warn(`  - Skip order ${doc.id}: no valid product mappings for items`);
        continue;
      }
      try {
        await Order.create({
          clientId,
          customerName: customer.name || plain.customerName || 'Unknown',
          phone: customer.phone || plain.phone || plain.customerContact,
          address,
          items,
          totalPrice,
          shippingStatus:
            fulfillment.status ||
            plain.status ||
            plain.shippingStatus ||
            'pending',
          paymentStatus: payment.status || plain.paymentStatus || 'pending',
          createdBy: migrationUserId,
          notes: plain.notes,
        });
        orderCount++;
      } catch (err) {
        console.warn(`  - Skip order ${doc.id}: ${err.message}`);
      }
    }
    console.log(`  - ${businessId}: ${ordersSnap.size} orders`);
  }
  console.log(`  Migrated ${orderCount} orders total`);

  // --- 4. Users (Firestore users + Firebase Auth + business owners) ---
  const DEFAULT_PASSWORD = process.env.MIGRATION_DEFAULT_PASSWORD || 'ChangeMe123!';
  const migratedEmails = new Set();

  console.log('\n4. Migrating users...');

  // 4a. Firestore RBAC users
  try {
    const usersSnap = await db.collection('users').get();
    for (const doc of usersSnap.docs) {
      const d = doc.data();
      const plain = toPlain(d);
      const email = (plain.email || '').trim().toLowerCase();
      if (!email || migratedEmails.has(email)) continue;
      try {
        await User.create({
          name: plain.name || email.split('@')[0],
          email,
          password: DEFAULT_PASSWORD,
          role: plain.type === 'super_admin' ? 'admin' : 'staff',
          active: plain.status !== 'suspended' && plain.status !== 'inactive',
          clientId: null, // tenant_id mapping would need tenants collection
        });
        migratedEmails.add(email);
        console.log(`  - Firestore: ${email}`);
      } catch (err) {
        if (err.code === 11000) migratedEmails.add(email);
        else console.warn(`  - Skip user ${email}: ${err.message}`);
      }
    }
    console.log(`  - Firestore users: ${usersSnap.size} found`);
  } catch (err) {
    console.warn('  - Firestore users collection not found or empty:', err.message);
  }

  // 4b. Business owners (from businesses)
  for (const [businessId, clientId] of businessToClientId) {
    const bizDoc = await db.collection('businesses').doc(businessId).get();
    const plain = toPlain(bizDoc.data());
    const ownerEmail = (plain.owner?.email || '').trim().toLowerCase();
    if (!ownerEmail || migratedEmails.has(ownerEmail)) continue;
    try {
      await User.create({
        name: plain.owner?.name || ownerEmail.split('@')[0],
        email: ownerEmail,
        password: DEFAULT_PASSWORD,
        role: 'admin',
        active: true,
        clientId,
      });
      migratedEmails.add(ownerEmail);
      console.log(`  - Owner: ${ownerEmail} (${plain.businessName || businessId})`);
    } catch (err) {
      if (err.code === 11000) migratedEmails.add(ownerEmail);
      else console.warn(`  - Skip owner ${ownerEmail}: ${err.message}`);
    }
  }

  // 4c. Staff from businesses/{id}/staff
  for (const [businessId, clientId] of businessToClientId) {
    const staffSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('staff')
      .get();
    for (const doc of staffSnap.docs) {
      const plain = toPlain(doc.data());
      const email = (plain.email || '').trim().toLowerCase();
      if (!email || migratedEmails.has(email)) continue;
      try {
        await User.create({
          name: plain.name || plain.displayName || email.split('@')[0],
          email,
          password: DEFAULT_PASSWORD,
          role: 'staff',
          active: plain.approved !== false,
          clientId,
        });
        migratedEmails.add(email);
        console.log(`  - Staff: ${email} (${clientId})`);
      } catch (err) {
        if (err.code === 11000) migratedEmails.add(email);
        else console.warn(`  - Skip staff ${email}: ${err.message}`);
      }
    }
  }

  // 4d. Firebase Auth users (not already migrated)
  try {
    const auth = admin.auth();
    let pageToken;
    do {
      const list = await auth.listUsers(1000, pageToken);
      for (const u of list.users) {
        const email = (u.email || '').trim().toLowerCase();
        if (!email || migratedEmails.has(email)) continue;
        try {
          await User.create({
            name: u.displayName || email.split('@')[0],
            email,
            password: DEFAULT_PASSWORD,
            role: 'staff',
            active: true,
            clientId: null,
          });
          migratedEmails.add(email);
          console.log(`  - Auth: ${email}`);
        } catch (err) {
          if (err.code === 11000) migratedEmails.add(email);
          else console.warn(`  - Skip auth user ${email}: ${err.message}`);
        }
      }
      pageToken = list.pageToken;
    } while (pageToken);
  } catch (err) {
    console.warn('  - Firebase Auth listUsers failed:', err.message);
  }

  console.log(`  Migrated ${migratedEmails.size} users total`);
  if (migratedEmails.size > 0) {
    console.log(`  Default password for migrated users: ${DEFAULT_PASSWORD}`);
    console.log('  Users must change password after first login.');
  }

  console.log('\nMigration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
