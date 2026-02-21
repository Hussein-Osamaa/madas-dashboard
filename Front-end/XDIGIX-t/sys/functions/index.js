/**
 * XDIGIX Backend API - Firebase Cloud Functions
 * Configurable multi-tenant e-commerce platform
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rbac = require('./rbac');
const domainService = require('./src/domainService');
const config = require('./src/config');

// Initialize Firebase Admin
admin.initializeApp();

// Export domain service functions (Custom Domain System)
exports.addDomain = domainService.addDomain;
exports.verifyDomain = domainService.verifyDomain;
exports.verifyDomainHttp = domainService.verifyDomainHttp;
exports.connectDomain = domainService.connectDomain;
exports.connectDomainHttp = domainService.connectDomainHttp;
exports.removeDomain = domainService.removeDomain;
exports.getDomainStatus = domainService.getDomainStatus;
exports.listDomains = domainService.listDomains;
exports.checkDomainHealth = domainService.checkDomainHealth;
exports.forceReconnectDomain = domainService.forceReconnectDomain;

const app = express();

// ============================================================================
// CORS CONFIGURATION - Using centralized config
// ============================================================================
app.use(cors({
  origin: config.getAllowedDomains(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Madas-Api-Token',
    'X-Madas-Signature',
    'X-Madas-Event'
  ]
}));

// Use raw body parser for webhook endpoints to capture raw body for signature verification
app.use('/api/external/:tenantId/webhook', bodyParser.raw({ type: 'application/json' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ============================================================================
// EXTERNAL WEBSITE INTEGRATION (API + WEBHOOK)
// ============================================================================

const EXTERNAL_SETTINGS_DOC_ID = 'externalWebsite';

function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

async function getExternalIntegrationConfig(db, tenantId) {
  const ref = db.collection('tenants').doc(tenantId).collection('settings').doc(EXTERNAL_SETTINGS_DOC_ID);
  const snap = await ref.get();
  if (!snap.exists) return { ref, data: null };
  return { ref, data: snap.data() };
}

function computeHmacSha256Hex(secret, rawBodyBuffer) {
  return crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('hex');
}

/**
 * Process incoming webhook events and update the system accordingly
 */
async function processExternalWebhookEvent(db, tenantId, eventType, eventData) {
  console.log(`[External Webhook] Processing event: ${eventType}`, eventData);

  // Handle order events
  if (eventType.startsWith('order.')) {
    const orderId = eventData.orderId || eventData.id;
    if (!orderId) {
      throw new Error('Order ID is required for order events');
    }

    const orderRef = db.collection('businesses').doc(tenantId).collection('orders').doc(orderId);

    if (eventType === 'order.created' || eventType === 'order.updated') {
      const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'external_website',
      };

      // Update status if provided
      if (eventData.status) {
        updateData.status = eventData.status;
      }

      // Update other fields if provided
      if (eventData.total !== undefined) updateData.total = eventData.total;
      if (eventData.subtotal !== undefined) updateData.subtotal = eventData.subtotal;
      if (eventData.shipping !== undefined) updateData.shipping = eventData.shipping;
      if (eventData.tax !== undefined) updateData.tax = eventData.tax;
      if (eventData.notes !== undefined) updateData.notes = eventData.notes;
      if (eventData.customerId !== undefined) updateData.customerId = eventData.customerId;
      if (eventData.shippingAddress !== undefined) updateData.shippingAddress = eventData.shippingAddress;
      if (eventData.billingAddress !== undefined) updateData.billingAddress = eventData.billingAddress;

      // If order doesn't exist and it's a create event, set createdAt
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists && eventType === 'order.created') {
        updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.status = eventData.status || 'pending';
      }

      await orderRef.set(updateData, { merge: true });
      console.log(`[External Webhook] Updated order ${orderId}`);
    } else if (eventType === 'order.cancelled') {
      await orderRef.update({
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelledBy: 'external_website',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[External Webhook] Cancelled order ${orderId}`);
    }
  }

  // Handle product events
  else if (eventType.startsWith('product.')) {
    const productId = eventData.productId || eventData.id;
    if (!productId) {
      throw new Error('Product ID is required for product events');
    }

    const productRef = db.collection('businesses').doc(tenantId).collection('products').doc(productId);

    if (eventType === 'product.created' || eventType === 'product.updated') {
      const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'external_website',
      };

      // Update fields if provided
      if (eventData.name !== undefined) updateData.name = eventData.name;
      if (eventData.description !== undefined) updateData.description = eventData.description;
      if (eventData.price !== undefined) updateData.price = eventData.price;
      if (eventData.sellingPrice !== undefined) updateData.sellingPrice = eventData.sellingPrice;
      if (eventData.stock !== undefined) updateData.stock = eventData.stock;
      if (eventData.status !== undefined) updateData.status = eventData.status;
      if (eventData.category !== undefined) updateData.category = eventData.category;
      if (eventData.sku !== undefined) updateData.sku = eventData.sku;

      // If product doesn't exist and it's a create event, set createdAt
      const productDoc = await productRef.get();
      if (!productDoc.exists && eventType === 'product.created') {
        updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.status = eventData.status || 'active';
      }

      await productRef.set(updateData, { merge: true });
      console.log(`[External Webhook] Updated product ${productId}`);
    } else if (eventType === 'product.stock.updated') {
      // Handle stock-only updates
      const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'external_website',
      };

      if (eventData.stock !== undefined) {
        updateData.stock = eventData.stock;
      }

      // Also update stockByLocation if provided
      if (eventData.stockByLocation !== undefined) {
        updateData.stockByLocation = eventData.stockByLocation;
      }

      await productRef.set(updateData, { merge: true });
      console.log(`[External Webhook] Updated product stock ${productId}`);
    }
  }

  // Handle customer events
  else if (eventType.startsWith('customer.')) {
    const customerId = eventData.customerId || eventData.id;
    if (!customerId) {
      throw new Error('Customer ID is required for customer events');
    }

    const customerRef = db.collection('businesses').doc(tenantId).collection('customers').doc(customerId);

    if (eventType === 'customer.created' || eventType === 'customer.updated') {
      const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'external_website',
      };

      // Update fields if provided
      if (eventData.name !== undefined) updateData.name = eventData.name;
      if (eventData.email !== undefined) updateData.email = eventData.email;
      if (eventData.phone !== undefined) updateData.phone = eventData.phone;
      if (eventData.address !== undefined) updateData.address = eventData.address;
      if (eventData.notes !== undefined) updateData.notes = eventData.notes;

      // If customer doesn't exist and it's a create event, set createdAt
      const customerDoc = await customerRef.get();
      if (!customerDoc.exists && eventType === 'customer.created') {
        updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await customerRef.set(updateData, { merge: true });
      console.log(`[External Webhook] Updated customer ${customerId}`);
    }
  }

  // Handle payment events
  else if (eventType === 'payment.received') {
    const orderId = eventData.orderId;
    if (!orderId) {
      throw new Error('Order ID is required for payment events');
    }

    const orderRef = db.collection('businesses').doc(tenantId).collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Update order with payment information
    const paymentData = {
      paymentReceived: true,
      paymentAmount: eventData.amount || 0,
      paymentMethod: eventData.method || 'unknown',
      paymentTransactionId: eventData.transactionId || null,
      paymentReceivedAt: eventData.paidAt ? admin.firestore.Timestamp.fromDate(new Date(eventData.paidAt)) : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'external_website',
    };

    await orderRef.update(paymentData);

    // Optionally create a payment record in finance system
    if (eventData.amount && eventData.amount > 0) {
      try {
        await db.collection('businesses').doc(tenantId).collection('payments').add({
          orderId: orderId,
          amount: eventData.amount,
          method: eventData.method || 'external',
          transactionId: eventData.transactionId || null,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'external_website',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[External Webhook] Created payment record for order ${orderId}`);
      } catch (paymentError) {
        console.warn(`[External Webhook] Failed to create payment record:`, paymentError);
        // Don't fail the webhook if payment record creation fails
      }
    }

    console.log(`[External Webhook] Recorded payment for order ${orderId}`);
  }

  // Handle inventory adjustment events
  else if (eventType === 'inventory.adjusted') {
    const productId = eventData.productId;
    if (!productId) {
      throw new Error('Product ID is required for inventory adjustment events');
    }

    const productRef = db.collection('businesses').doc(tenantId).collection('products').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      throw new Error(`Product ${productId} not found`);
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'external_website',
    };

    if (eventData.stock !== undefined) {
      updateData.stock = eventData.stock;
    }

    if (eventData.stockByLocation !== undefined) {
      updateData.stockByLocation = eventData.stockByLocation;
    }

    if (eventData.adjustmentReason !== undefined) {
      updateData.lastAdjustmentReason = eventData.adjustmentReason;
    }

    await productRef.set(updateData, { merge: true });
    console.log(`[External Webhook] Adjusted inventory for product ${productId}`);
  }

  // Unknown event type - just log it
  else {
    console.log(`[External Webhook] Unknown event type: ${eventType}, data:`, eventData);
  }
}

/**
 * GET /api/external/:tenantId/webhook
 * Health check for webhook endpoint
 */
app.get('/api/external/:tenantId/webhook', async (req, res) => {
  try {
    const { tenantId } = req.params;
    return res.status(200).json({
      success: true,
      message: 'External webhook endpoint is active',
      tenantId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/external/:tenantId/webhook
 * Receive signed events from external websites
 *
 * Required headers:
 * - X-Madas-Signature: sha256=<hex>
 * Optional:
 * - X-Madas-Event: event.type
 */
app.post('/api/external/:tenantId/webhook', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const db = admin.firestore();

    const { ref: settingsRef, data: settings } = await getExternalIntegrationConfig(db, tenantId);
    if (!settings || !settings.enabled || !settings.webhook || !settings.webhook.enabled) {
      return res.status(404).json({ success: false, message: 'Webhook integration is not enabled' });
    }

    const secret = settings.webhook.secret;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    }

    const provided = (req.get('x-madas-signature') || '').trim();
    if (!provided || !provided.startsWith('sha256=')) {
      return res.status(401).json({ success: false, message: 'Missing or invalid signature header' });
    }

    // Use raw body buffer (from bodyParser.raw) or reconstruct from parsed body
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}), 'utf8');
    const expectedHex = computeHmacSha256Hex(secret, rawBody);
    
    // Parse body if it's still a buffer
    if (Buffer.isBuffer(req.body)) {
      try {
        req.body = JSON.parse(req.body.toString('utf8'));
      } catch (e) {
        // Keep as buffer if parsing fails
      }
    }
    const expected = `sha256=${expectedHex}`;

    const verified = timingSafeEqualString(provided, expected);
    if (!verified) {
      return res.status(401).json({ success: false, message: 'Signature verification failed' });
    }

    const eventTypeHeader = (req.get('x-madas-event') || '').trim();
    const eventTypeBody = req.body && typeof req.body.type === 'string' ? req.body.type : '';
    const eventType = eventTypeHeader || eventTypeBody || 'unknown';

    const enabledEvents = (settings.webhook.enabledEvents || {});
    const isAllowed = enabledEvents[eventType] !== false; // default allow unless explicitly false

    // Store event log for audit / future processing
    const eventLogRef = await db.collection('tenants').doc(tenantId).collection('external_events').add({
      verified: true,
      allowed: isAllowed,
      eventType,
      headers: {
        'x-madas-event': eventTypeHeader || null,
      },
      body: req.body || null,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Process the event if it's allowed and has data
    if (isAllowed && req.body && req.body.data) {
      try {
        await processExternalWebhookEvent(db, tenantId, eventType, req.body.data);
        await eventLogRef.update({
          processed: true,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (processError) {
        console.error('[External Webhook] Event processing error:', processError);
        // Don't fail the webhook, just log the error
        await eventLogRef.update({
          processingError: processError.message,
          processed: false,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else if (isAllowed && req.body && req.body.data) {
      // Event was allowed but had no data to process
      await eventLogRef.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        note: 'No data to process',
      });
    }

    // Update last received
    await settingsRef.set(
      {
        webhook: {
          lastReceivedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({
      success: true,
      verified: true,
      allowed: isAllowed,
      eventType,
      message: isAllowed ? 'Webhook received' : 'Webhook received (event disabled)',
    });
  } catch (error) {
    console.error('[External Webhook] Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/external/:tenantId/ping
 * Simple authenticated endpoint for external API connectivity tests
 */
app.get('/api/external/:tenantId/ping', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const token = (req.get('x-madas-api-token') || '').trim();
    const db = admin.firestore();
    const { data: settings } = await getExternalIntegrationConfig(db, tenantId);

    if (!settings || !settings.enabled || !settings.api || !settings.api.enabled) {
      return res.status(404).json({ success: false, message: 'External API integration is not enabled' });
    }

    const expectedToken = (settings.api.token || '').trim();
    if (!expectedToken) {
      return res.status(500).json({ success: false, message: 'API token not configured' });
    }

    if (!timingSafeEqualString(token, expectedToken)) {
      return res.status(401).json({ success: false, message: 'Invalid API token' });
    }

    return res.status(200).json({ success: true, message: 'OK', tenantId });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/external/:tenantId/products
 * External reads product data from MADAS
 */
app.get('/api/external/:tenantId/products', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const token = (req.get('x-madas-api-token') || '').trim();
    const db = admin.firestore();
    const { data: settings } = await getExternalIntegrationConfig(db, tenantId);

    if (!settings || !settings.enabled || !settings.api || !settings.api.enabled) {
      return res.status(404).json({ success: false, message: 'External API integration is not enabled' });
    }

    const expectedToken = (settings.api.token || '').trim();
    if (!expectedToken) {
      return res.status(500).json({ success: false, message: 'API token not configured' });
    }

    if (!timingSafeEqualString(token, expectedToken)) {
      return res.status(401).json({ success: false, message: 'Invalid API token' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const productsSnap = await db
      .collection('businesses')
      .doc(tenantId)
      .collection('products')
      .limit(limit)
      .get();

    const products = productsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error('[External API] products error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/external/:tenantId/products/:productId
 * Get a single product by ID
 */
app.get('/api/external/:tenantId/products/:productId', async (req, res) => {
  try {
    const { tenantId, productId } = req.params;
    const token = (req.get('x-madas-api-token') || '').trim();
    const db = admin.firestore();
    const { data: settings } = await getExternalIntegrationConfig(db, tenantId);

    if (!settings || !settings.enabled || !settings.api || !settings.api.enabled) {
      return res.status(404).json({ success: false, message: 'External API integration is not enabled' });
    }

    const expectedToken = (settings.api.token || '').trim();
    if (!expectedToken || !timingSafeEqualString(token, expectedToken)) {
      return res.status(401).json({ success: false, message: 'Invalid API token' });
    }

    const productDoc = await db.collection('businesses').doc(tenantId).collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({ success: true, product: { id: productDoc.id, ...productDoc.data() } });
  } catch (error) {
    console.error('[External API] product error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/external/:tenantId/orders
 * External reads order data from MADAS
 */
app.get('/api/external/:tenantId/orders', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const token = (req.get('x-madas-api-token') || '').trim();
    const db = admin.firestore();
    const { data: settings } = await getExternalIntegrationConfig(db, tenantId);

    if (!settings || !settings.enabled || !settings.api || !settings.api.enabled) {
      return res.status(404).json({ success: false, message: 'External API integration is not enabled' });
    }

    const expectedToken = (settings.api.token || '').trim();
    if (!expectedToken || !timingSafeEqualString(token, expectedToken)) {
      return res.status(401).json({ success: false, message: 'Invalid API token' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const status = req.query.status; // optional filter: pending, processing, completed, cancelled
    let query = db.collection('businesses').doc(tenantId).collection('orders').limit(limit);

    if (status) {
      query = query.where('status', '==', status);
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    const ordersSnap = await query.get();
    const orders = ordersSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('[External API] orders error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/external/:tenantId/orders/:orderId
 * Get a single order by ID
 */
app.get('/api/external/:tenantId/orders/:orderId', async (req, res) => {
  try {
    const { tenantId, orderId } = req.params;
    const token = (req.get('x-madas-api-token') || '').trim();
    const db = admin.firestore();
    const { data: settings } = await getExternalIntegrationConfig(db, tenantId);

    if (!settings || !settings.enabled || !settings.api || !settings.api.enabled) {
      return res.status(404).json({ success: false, message: 'External API integration is not enabled' });
    }

    const expectedToken = (settings.api.token || '').trim();
    if (!expectedToken || !timingSafeEqualString(token, expectedToken)) {
      return res.status(401).json({ success: false, message: 'Invalid API token' });
    }

    const orderDoc = await db.collection('businesses').doc(tenantId).collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const data = orderDoc.data();
    return res.status(200).json({
      success: true,
      order: {
        id: orderDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('[External API] order error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/external/:tenantId/customers
 * External reads customer data from MADAS
 */
app.get('/api/external/:tenantId/customers', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const token = (req.get('x-madas-api-token') || '').trim();
    const db = admin.firestore();
    const { data: settings } = await getExternalIntegrationConfig(db, tenantId);

    if (!settings || !settings.enabled || !settings.api || !settings.api.enabled) {
      return res.status(404).json({ success: false, message: 'External API integration is not enabled' });
    }

    const expectedToken = (settings.api.token || '').trim();
    if (!expectedToken || !timingSafeEqualString(token, expectedToken)) {
      return res.status(401).json({ success: false, message: 'Invalid API token' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const customersSnap = await db
      .collection('businesses')
      .doc(tenantId)
      .collection('customers')
      .limit(limit)
      .get();

    const customers = customersSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return res.status(200).json({ success: true, customers });
  } catch (error) {
    console.error('[External API] customers error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/external/:tenantId/customers/:customerId
 * Get a single customer by ID
 */
app.get('/api/external/:tenantId/customers/:customerId', async (req, res) => {
  try {
    const { tenantId, customerId } = req.params;
    const token = (req.get('x-madas-api-token') || '').trim();
    const db = admin.firestore();
    const { data: settings } = await getExternalIntegrationConfig(db, tenantId);

    if (!settings || !settings.enabled || !settings.api || !settings.api.enabled) {
      return res.status(404).json({ success: false, message: 'External API integration is not enabled' });
    }

    const expectedToken = (settings.api.token || '').trim();
    if (!expectedToken || !timingSafeEqualString(token, expectedToken)) {
      return res.status(401).json({ success: false, message: 'Invalid API token' });
    }

    const customerDoc = await db.collection('businesses').doc(tenantId).collection('customers').doc(customerId).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const data = customerDoc.data();
    return res.status(200).json({
      success: true,
      customer: {
        id: customerDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('[External API] customer error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================================
// EMAIL SERVICE CONFIGURATION
// ============================================================================
const createEmailTransporter = () => {
  // Firebase Functions v2 uses environment variables instead of functions.config()
  const emailUser = process.env.EMAIL_USER || 'hesainosama@gmail.com';
  const emailPassword = process.env.EMAIL_PASSWORD || 'prwyujlbjtxahcsj';

  if (!emailUser || !emailPassword) {
    console.warn('⚠️ Email credentials not configured');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/login
 * Handle user login
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    console.log('🔐 Login attempt:', { email, rememberMe });

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful login
    const response = {
      success: true,
      message: 'Login successful',
      user: {
        userId: 'user_' + Date.now(),
        email: email,
        name: email.split('@')[0],
        role: 'owner'
      },
      business: {
        businessId: 'business_' + Date.now(),
        businessName: 'Sample Business',
        plan: 'professional'
      },
      token: 'token_' + Date.now(),
      rememberMe: rememberMe
    };

    console.log('✅ Login successful for:', email);

    res.json(response);

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(401).json({
      error: 'Invalid email or password',
      message: 'Please check your credentials and try again.'
    });
  }
});

/**
 * POST /api/register
 * Register new business account
 */
app.post('/api/register', async (req, res) => {
  try {
    const {
      businessName, industry, businessEmail, phone, companySize,
      plan,
      userName, userEmail, password
    } = req.body;

    console.log('📝 Registration Data Received:');
    console.log('Business:', businessName, industry, companySize);
    console.log('Contact:', businessEmail, phone);
    console.log('Plan:', plan);
    console.log('User:', userName, userEmail);

    // Validate required fields
    if (!businessName || !businessEmail || !plan || !userName || !userEmail || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please fill in all required fields.'
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock successful registration
    const mockBusinessId = `business_${Date.now()}`;
    const mockUserId = `user_${Date.now()}`;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14 day trial

    console.log('✅ Registration completed successfully');
    console.log('📊 Business ID:', mockBusinessId);
    console.log('👤 User ID:', mockUserId);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        userId: mockUserId,
        email: userEmail,
        name: userName,
        role: 'owner'
      },
      business: {
        businessId: mockBusinessId,
        businessName: businessName,
        plan: plan,
        trialEnds: trialEnd.toISOString()
      },
      token: `token_${Date.now()}`
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.'
    });
  }
});

/**
 * POST /api/send-invitation
 * Send staff invitation email
 */
app.post('/api/send-invitation', async (req, res) => {
  try {
    const {
      toEmail,
      staffName,
      businessName,
      role,
      inviterName,
      businessId,
      setupUrl
    } = req.body;

    console.log('📧 Sending invitation to:', toEmail);

    // Validate required fields
    if (!toEmail || !staffName || !businessName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Create email transporter
    const transporter = createEmailTransporter();
    if (!transporter) {
      return res.status(500).json({
        success: false,
        message: 'Email service not configured. Please contact administrator.'
      });
    }

    // Generate setup URL if not provided
    let finalSetupUrl = setupUrl;
    if (!finalSetupUrl) {
      const invitationId = Date.now().toString();
      finalSetupUrl = `https://madas-store.web.app/setup-password?email=${encodeURIComponent(toEmail)}&business=${encodeURIComponent(businessName)}&businessId=${encodeURIComponent(businessId)}&role=${encodeURIComponent(role)}&invitation=${invitationId}`;
    }

    // Email configuration
    const emailUser = process.env.EMAIL_USER || 'hesainosama@gmail.com';
    const mailOptions = {
      from: `"${businessName}" <${emailUser || 'noreply@madas.com'}>`,
      to: toEmail,
      subject: `🎉 You've been invited to join ${businessName} on MADAS`,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            background: linear-gradient(135deg, #232946 0%, #3B4371 100%);
            color: white;
            width: 60px;
            height: 60px;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        h1 {
            color: #232946;
            margin: 0;
            font-size: 24px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #232946 0%, #3B4371 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .info-box {
            background-color: #f8f9fa;
            border-left: 4px solid #232946;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .badge {
            display: inline-block;
            background-color: #232946;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">M</div>
            <h1>Welcome to ${businessName}!</h1>
        </div>

        <p>Hi <strong>${staffName}</strong>,</p>

        <p>
            Great news! <strong>${inviterName || 'Your Team'}</strong> has invited you to join <strong>${businessName}</strong>
            as a team member on the MADAS platform.
        </p>

        <div class="info-box">
            <p><strong>📧 Your Email:</strong> ${toEmail}</p>
            <p><strong>🎭 Your Role:</strong> <span class="badge">${role.toUpperCase()}</span></p>
            <p><strong>🏢 Business:</strong> ${businessName}</p>
        </div>

        <div style="text-align: center;">
            <a href="${finalSetupUrl}" class="cta-button">
                🚀 Get Started Now
            </a>
        </div>

        <div class="footer">
            <p>This invitation was sent by ${businessName} via MADAS</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p style="margin-top: 10px;">
                © ${new Date().getFullYear()} MADAS. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
      `,
      text: `
Welcome to ${businessName}!

Hi ${staffName},

${inviterName || 'Your Team'} has invited you to join ${businessName} as a ${role} on the MADAS platform.

Your Details:
- Email: ${toEmail}
- Role: ${role}
- Business: ${businessName}

Visit: ${finalSetupUrl}

This invitation was sent by ${businessName} via MADAS.
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);

    return res.status(200).json({
      success: true,
      message: `Invitation email sent successfully to ${toEmail}`,
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ Error in send-invitation API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * POST /api/create-client
 * Create a new client business with owner account (Super Admin only)
 */
app.post('/api/create-client', async (req, res) => {
  try {
    const {
      businessName,
      ownerEmail,
      ownerPassword,
      ownerName,
      brandEmail,
      plan,
      status
    } = req.body;

    console.log('🏢 Creating new client:', { businessName, ownerEmail, plan });

    // Validate required fields
    if (!businessName || !ownerEmail || !ownerPassword) {
      return res.status(400).json({
        success: false,
        message: 'Business name, owner email, and password are required'
      });
    }

    // Validate password length
    if (ownerPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const db = admin.firestore();

    // Step 1: Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: ownerEmail,
        password: ownerPassword,
        displayName: ownerName || businessName + ' Owner',
        emailVerified: false
      });
      console.log('✅ Firebase Auth user created:', userRecord.uid);
    } catch (authError) {
      console.error('❌ Error creating auth user:', authError);
      if (authError.code === 'auth/email-already-exists') {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists'
        });
      }
      throw authError;
    }

    // Step 2: Create the business document
    const businessData = {
      businessName: businessName,
      name: businessName,
      owner: {
        uid: userRecord.uid,
        email: ownerEmail,
        name: ownerName || ownerEmail.split('@')[0]
      },
      contact: {
        email: brandEmail || ownerEmail
      },
      plan: {
        type: plan || 'basic',
        status: status || 'trial'
      },
      status: status || 'trial',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'super_admin'
      }
    };

    const businessRef = await db.collection('businesses').add(businessData);
    console.log('✅ Business created:', businessRef.id);

    // Step 3: Create user profile in users collection
    const userProfileData = {
      uid: userRecord.uid,
      email: ownerEmail,
      name: ownerName || ownerEmail.split('@')[0],
      displayName: ownerName || ownerEmail.split('@')[0],
      businessId: businessRef.id,
      businessName: businessName,
      role: 'owner',
      type: 'business_user',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(userRecord.uid).set(userProfileData);
    console.log('✅ User profile created:', userRecord.uid);

    // Step 4: Create staff record in the business subcollection
    const staffData = {
      uid: userRecord.uid,
      email: ownerEmail,
      firstName: ownerName?.split(' ')[0] || ownerEmail.split('@')[0],
      lastName: ownerName?.split(' ').slice(1).join(' ') || '',
      role: 'owner',
      status: 'active',
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('businesses').doc(businessRef.id).collection('staff').doc(userRecord.uid).set(staffData);
    console.log('✅ Staff record created');

    // Send welcome email
    try {
      const transporter = createEmailTransporter();
      if (transporter) {
        const loginUrl = 'https://madas-store.web.app/login';
        await transporter.sendMail({
          from: '"XDIGIX" <hesainosama@gmail.com>',
          to: ownerEmail,
          subject: `🎉 Welcome to XDIGIX - Your ${businessName} Account is Ready!`,
          html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0a0b1a; color: #f9fafb; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #1a1b3e; border-radius: 16px; padding: 40px; }
        .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #0a0b1a; margin: 0 auto 20px; }
        h1 { text-align: center; color: #fff; margin-bottom: 10px; }
        .subtitle { text-align: center; color: #9ca3af; margin-bottom: 30px; }
        .info-box { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .info-row:last-child { border-bottom: none; }
        .label { color: #9ca3af; }
        .value { color: #fff; font-weight: 500; }
        .cta-button { display: block; text-align: center; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #0a0b1a; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin: 30px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">X</div>
        <h1>Welcome to XDIGIX!</h1>
        <p class="subtitle">Your business account is ready</p>
        
        <div class="info-box">
            <div class="info-row">
                <span class="label">Business</span>
                <span class="value">${businessName}</span>
            </div>
            <div class="info-row">
                <span class="label">Email</span>
                <span class="value">${ownerEmail}</span>
            </div>
            <div class="info-row">
                <span class="label">Plan</span>
                <span class="value">${(plan || 'basic').charAt(0).toUpperCase() + (plan || 'basic').slice(1)}</span>
            </div>
            <div class="info-row">
                <span class="label">Role</span>
                <span class="value">Owner</span>
            </div>
        </div>
        
        <a href="${loginUrl}" class="cta-button">Login to Your Dashboard</a>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} XDIGIX. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
          `,
          text: `Welcome to XDIGIX!\n\nYour business account "${businessName}" has been created.\n\nEmail: ${ownerEmail}\nPlan: ${plan || 'basic'}\n\nLogin at: ${loginUrl}`
        });
        console.log('✅ Welcome email sent');
      }
    } catch (emailError) {
      console.warn('⚠️ Failed to send welcome email:', emailError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: {
        businessId: businessRef.id,
        userId: userRecord.uid,
        email: ownerEmail,
        businessName: businessName
      }
    });

  } catch (error) {
    console.error('❌ Error creating client:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create client: ' + error.message
    });
  }
});

/**
 * POST /api/contact
 * Handle contact form submissions
 */
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    console.log('📧 Contact Form Received:', { name, email, subject });

    await new Promise(resolve => setTimeout(resolve, 500));

    res.json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.'
    });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: 'Please try again later.'
    });
  }
});

/**
 * POST /api/newsletter/subscribe
 * Newsletter subscription
 */
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('📬 Newsletter subscription:', email);

    await new Promise(resolve => setTimeout(resolve, 500));

    res.json({
      success: true,
      message: 'Successfully subscribed to newsletter!'
    });

  } catch (error) {
    console.error('❌ Newsletter subscription error:', error);
    res.status(500).json({
      error: 'Subscription failed',
      message: 'Please try again later.'
    });
  }
});

// ============================================================================
// RBAC ENDPOINTS
// ============================================================================

/**
 * GET /api/rbac/users
 * Get all users (requires authentication)
 */
app.get('/api/rbac/users', rbac.verifyAuth, rbac.getUsers);

/**
 * GET /api/rbac/users/:id
 * Get user by ID (requires authentication)
 */
app.get('/api/rbac/users/:id', rbac.verifyAuth, rbac.getUserById);

/**
 * POST /api/rbac/users
 * Create new user (requires authentication + permission)
 */
app.post('/api/rbac/users', rbac.verifyAuth, rbac.authorize('users.create'), rbac.createUser);

/**
 * PUT /api/rbac/users/:id
 * Update user (requires authentication + permission)
 */
app.put('/api/rbac/users/:id', rbac.verifyAuth, rbac.authorize('users.edit'), rbac.updateUser);

/**
 * DELETE /api/rbac/users/:id
 * Delete user (requires authentication + permission)
 */
app.delete('/api/rbac/users/:id', rbac.verifyAuth, rbac.authorize('users.delete'), rbac.deleteUser);

/**
 * GET /api/rbac/roles
 * Get all roles (requires authentication)
 */
app.get('/api/rbac/roles', rbac.verifyAuth, rbac.getRoles);

/**
 * POST /api/rbac/roles
 * Create new role (requires authentication + permission)
 */
app.post('/api/rbac/roles', rbac.verifyAuth, rbac.authorize('roles.create'), rbac.createRole);

/**
 * PUT /api/rbac/roles/:id/permissions
 * Update role permissions (requires authentication + permission)
 */
app.put('/api/rbac/roles/:id/permissions', rbac.verifyAuth, rbac.authorize('roles.edit'), rbac.updateRolePermissions);

/**
 * GET /api/rbac/permissions
 * Get all permissions (requires authentication)
 */
app.get('/api/rbac/permissions', rbac.verifyAuth, rbac.getPermissions);

/**
 * GET /api/rbac/roles/:id/permissions
 * Get permissions for a role (requires authentication)
 */
app.get('/api/rbac/roles/:id/permissions', rbac.verifyAuth, rbac.getRolePermissions);

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'production',
    timestamp: new Date().toISOString(),
    service: 'firebase-functions'
  });
});

// ============================================================================
// BOSTA SHIPPING API PROXY
// ============================================================================

const BOSTA_API_URL = 'https://app.bosta.co/api/v2';

/**
 * POST /api/bosta/deliveries
 * Create a delivery via Bosta API (proxied to avoid CORS)
 */
app.post('/api/bosta/deliveries', async (req, res) => {
  try {
    const { apiKey, deliveryData } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Bosta API key is required'
      });
    }

    if (!deliveryData) {
      return res.status(400).json({
        success: false,
        message: 'Delivery data is required'
      });
    }

    const cleanKey = apiKey.trim();
    console.log('[Bosta Proxy] Creating delivery...');
    console.log('[Bosta Proxy] API Key length:', cleanKey.length);
    console.log('[Bosta Proxy] Delivery data:', JSON.stringify(deliveryData, null, 2));

    const fetch = require('node-fetch');
    
    // Try with just the API key first (as shown in Bosta docs: Authorization: 123)
    let response = await fetch(`${BOSTA_API_URL}/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cleanKey
      },
      body: JSON.stringify(deliveryData)
    });

    let data = await response.json();
    console.log('[Bosta Proxy] First attempt response:', response.status, data);

    // If 401, try with Bearer prefix (Authorization: Bearer 123)
    if (response.status === 401) {
      console.log('[Bosta Proxy] Trying with Bearer prefix...');
      response = await fetch(`${BOSTA_API_URL}/deliveries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanKey}`
        },
        body: JSON.stringify(deliveryData)
      });
      data = await response.json();
      console.log('[Bosta Proxy] Bearer attempt response:', response.status, data);
    }

    if (!response.ok) {
      console.error('[Bosta Proxy] API Error:', data);
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Bosta API error',
        error: data
      });
    }

    console.log('[Bosta Proxy] Delivery created successfully');
    return res.json({
      success: true,
      message: 'Delivery created successfully',
      data: data.data || data
    });

  } catch (error) {
    console.error('[Bosta Proxy] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create delivery: ' + error.message
    });
  }
});

/**
 * GET /api/bosta/cities
 * Get Bosta cities list (proxied to avoid CORS)
 */
app.get('/api/bosta/cities', async (req, res) => {
  try {
    const { apiKey, countryId } = req.query;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Bosta API key is required'
      });
    }

    const fetch = require('node-fetch');
    const response = await fetch(`${BOSTA_API_URL}/cities?countryId=${countryId || '60e4482c7cb7d4bc4849c4d5'}`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey.trim()
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Bosta API error',
        error: data
      });
    }

    return res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('[Bosta Proxy] Error fetching cities:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cities: ' + error.message
    });
  }
});

/**
 * GET /api/bosta/deliveries/:trackingNumber
 * Track a delivery (proxied to avoid CORS)
 */
app.get('/api/bosta/deliveries/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { apiKey } = req.query;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Bosta API key is required'
      });
    }

    const fetch = require('node-fetch');
    const response = await fetch(`${BOSTA_API_URL}/deliveries/${trackingNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey.trim()
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data.message || 'Bosta API error',
        error: data
      });
    }

    return res.json({
      success: true,
      data: data.data || data
    });

  } catch (error) {
    console.error('[Bosta Proxy] Error tracking delivery:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to track delivery: ' + error.message
    });
  }
});

// ============================================================================
// BOSTA WEBHOOK ENDPOINT
// ============================================================================

/**
 * Bosta delivery status codes mapping
 */
const BOSTA_STATUS_MAP = {
  10: { status: 'pending', label: 'Delivery Created' },
  20: { status: 'processing', label: 'Received at Warehouse' },
  21: { status: 'processing', label: 'Picked Up' },
  22: { status: 'processing', label: 'In Transit' },
  24: { status: 'processing', label: 'Out for Delivery' },
  30: { status: 'processing', label: 'Waiting for Customer' },
  41: { status: 'processing', label: 'Returned to Warehouse' },
  45: { status: 'completed', label: 'Delivered' },
  46: { status: 'cancelled', label: 'Returned to Sender' },
  47: { status: 'cancelled', label: 'Cancelled' },
  48: { status: 'cancelled', label: 'Terminated' }
};

/**
 * POST /api/bosta/webhook
 * Receive delivery status updates from Bosta
 * 
 * Webhook URL to add in Bosta: https://api-erl4dkfzua-uc.a.run.app/api/bosta/webhook
 */
app.post('/api/bosta/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('[Bosta Webhook] Received webhook:', JSON.stringify(webhookData, null, 2));
    
    // Extract delivery info from webhook
    const {
      _id: bostaDeliveryId,
      trackingNumber,
      state,
      businessReference,
      receiver,
      dropOffAddress,
      cod,
      timeline
    } = webhookData;

    if (!businessReference) {
      console.log('[Bosta Webhook] No businessReference (order ID) in webhook');
      return res.status(200).json({ success: true, message: 'Webhook received (no order reference)' });
    }

    const db = admin.firestore();
    
    // Find the order by businessReference (which is the order ID)
    // We need to search across all businesses
    const businessesSnapshot = await db.collection('businesses').get();
    
    let orderFound = false;
    
    for (const businessDoc of businessesSnapshot.docs) {
      const ordersRef = db.collection('businesses').doc(businessDoc.id).collection('orders');
      const orderDoc = await ordersRef.doc(businessReference).get();
      
      if (orderDoc.exists) {
        orderFound = true;
        
        // Map Bosta status to our order status
        const statusInfo = BOSTA_STATUS_MAP[state?.value] || { status: 'processing', label: 'Unknown Status' };
        
        // Update order with delivery status
        await orderDoc.ref.update({
          bostaStatus: state?.code || 'unknown',
          bostaStatusValue: state?.value || 0,
          bostaStatusLabel: statusInfo.label,
          bostaTrackingNumber: trackingNumber,
          bostaDeliveryId: bostaDeliveryId,
          status: statusInfo.status,
          bostaLastUpdate: admin.firestore.FieldValue.serverTimestamp(),
          bostaTimeline: timeline || [],
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`[Bosta Webhook] Updated order ${businessReference} - Status: ${statusInfo.label}`);
        
        // If delivered, mark as completed
        if (state?.value === 45) {
          await orderDoc.ref.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`[Bosta Webhook] Order ${businessReference} marked as completed`);
        }
        
        break;
      }
    }

    if (!orderFound) {
      console.log(`[Bosta Webhook] Order ${businessReference} not found in any business`);
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({
      success: true,
      message: 'Webhook processed',
      orderId: businessReference,
      status: webhookData.state?.code
    });

  } catch (error) {
    console.error('[Bosta Webhook] Error processing webhook:', error);
    // Still return 200 to prevent Bosta from retrying
    return res.status(200).json({
      success: false,
      message: 'Webhook processing error: ' + error.message
    });
  }
});

/**
 * GET /api/bosta/webhook
 * Verification endpoint for Bosta webhook setup
 */
app.get('/api/bosta/webhook', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Bosta webhook endpoint is active',
    url: 'https://api-erl4dkfzua-uc.a.run.app/api/bosta/webhook'
  });
});

// ============================================================================
// EXPORT CLOUD FUNCTION
// ============================================================================

// Export Express app as Cloud Function
exports.api = functions.https.onRequest(app);

// Export website hosting function for custom domain support
const websiteHosting = require('./src/websiteHosting');


// Cloud Function to validate discount codes
exports.validateDiscountCode = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const { businessId, code, cartTotal } = req.body;
    
    if (!businessId || !code) {
      res.status(400).json({ valid: false, message: 'Missing required fields' });
      return;
    }
    
    const db = admin.firestore();
    const codeUpper = code.toUpperCase().trim();
    
    // Fetch discount code from Firestore
    const discountCodesRef = db.collection('businesses').doc(businessId).collection('discountCodes');
    const querySnapshot = await discountCodesRef.where('code', '==', codeUpper).limit(1).get();
    
    if (querySnapshot.empty) {
      res.status(200).json({ valid: false, message: 'Discount code not found' });
      return;
    }
    
    const discountDoc = querySnapshot.docs[0];
    const discount = discountDoc.data();
    
    // Check if discount is active
    if (discount.status !== 'active') {
      res.status(200).json({ valid: false, message: 'Discount code is not active' });
      return;
    }
    
    // Check expiry date
    if (discount.endDate) {
      const endDate = discount.endDate.toDate ? discount.endDate.toDate() : new Date(discount.endDate);
      if (endDate < new Date()) {
        res.status(200).json({ valid: false, message: 'Discount code has expired' });
        return;
      }
    }
    
    // Check start date
    if (discount.startDate) {
      const startDate = discount.startDate.toDate ? discount.startDate.toDate() : new Date(discount.startDate);
      if (startDate > new Date()) {
        res.status(200).json({ valid: false, message: 'Discount code is not yet valid' });
        return;
      }
    }
    
    // Check minimum order amount
    if (discount.minOrderAmount && cartTotal < discount.minOrderAmount) {
      res.status(200).json({ 
        valid: false, 
        message: `Minimum order amount of ${discount.minOrderAmount} required` 
      });
      return;
    }
    
    // Check maximum discount cap (for percentage discounts)
    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = (cartTotal * discount.value) / 100;
      if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
        discountAmount = discount.maxDiscountAmount;
      }
    } else if (discount.type === 'fixed') {
      discountAmount = discount.value;
      if (discountAmount > cartTotal) {
        discountAmount = cartTotal;
      }
    } else if (discount.type === 'freeShipping') {
      discountAmount = 0; // Will be handled separately
    }
    
    // Check usage limits
    if (discount.totalUsageLimit) {
      const usageCount = discount.usageCount || 0;
      if (usageCount >= discount.totalUsageLimit) {
        res.status(200).json({ valid: false, message: 'Discount code usage limit reached' });
        return;
      }
    }
    
    // Check per-customer usage limit
    if (discount.perCustomerLimit) {
      // This would require customer email/ID, which we'll handle in the order creation
      // For now, just validate the code itself
    }
    
    // Check combinability
    // This is handled at checkout level - if combinable is false, only one discount can be applied
    
    res.status(200).json({
      valid: true,
      discount: {
        id: discountDoc.id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        maxDiscountAmount: discount.maxDiscountAmount,
        minOrderAmount: discount.minOrderAmount
      },
      discountAmount: discountAmount
    });
    
  } catch (error) {
    console.error('Error validating discount code:', error);
    res.status(500).json({ valid: false, message: 'Error validating discount code', error: error.message });
  }
});

// Cloud Function to create orders from website checkout
exports.createWebsiteOrder = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const { businessId, siteId, orderData } = req.body;
    
    if (!businessId || !orderData) {
      res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Business ID and order data are required' 
      });
      return;
    }
    
    // Validate required order data fields
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      res.status(400).json({ 
        error: 'Invalid order data',
        message: 'Order must contain at least one item' 
      });
      return;
    }
    
    if (!orderData.customerName || !orderData.email || !orderData.phone) {
      res.status(400).json({ 
        error: 'Invalid order data',
        message: 'Customer name, email, and phone are required' 
      });
      return;
    }
    
    if (!orderData.addressDetails || !orderData.addressDetails.line || !orderData.addressDetails.country) {
      res.status(400).json({ 
        error: 'Invalid order data',
        message: 'Shipping address is required' 
      });
      return;
    }
    
    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    // Check if customer exists (by email or phone)
    let customerId = null;
    const customersRef = db.collection('businesses').doc(businessId).collection('customers');
    
    // Try to find existing customer
    if (orderData.email) {
      const emailQuery = await customersRef.where('email', '==', orderData.email).limit(1).get();
      if (!emailQuery.empty) {
        customerId = emailQuery.docs[0].id;
      }
    }
    
    if (!customerId && orderData.phone) {
      const phoneQuery = await customersRef.where('phone', '==', orderData.phone).limit(1).get();
      if (!phoneQuery.empty) {
        customerId = phoneQuery.docs[0].id;
      }
    }
    
    // Always create or update customer in Dashboard (auto-add from website orders)
    {
      const customerData = {
        name: orderData.customerName,
        firstName: orderData.firstName || orderData.customerName.split(' ')[0] || '',
        lastName: orderData.lastName || orderData.customerName.split(' ').slice(1).join(' ') || '',
        email: orderData.email,
        phone: orderData.phone,
        status: 'active',
        updatedAt: now
      };

      // Save address if customer opted in or is logged in
      if (orderData.saveCustomer || customerId) {
        customerData.addressDetails = orderData.addressDetails;
      }
      
      if (customerId) {
        // Update existing customer
        await customersRef.doc(customerId).update(customerData);
        await customersRef.doc(customerId).update({
          orderCount: admin.firestore.FieldValue.increment(1),
          totalSpent: admin.firestore.FieldValue.increment(orderData.total),
          lastOrder: now
        });
      } else {
        // Create new customer
        customerData.addressDetails = orderData.addressDetails;
        customerData.createdAt = now;
        customerData.orderCount = 1;
        customerData.totalSpent = orderData.total;
        customerData.lastOrder = now;
        customerData.source = 'website';
        const customerDoc = await customersRef.add(customerData);
        customerId = customerDoc.id;
      }
    }
    
    // Handle discount code if applied
    let discountCodeId = null;
    let finalShippingFees = orderData.shippingFees || 0;
    
    if (orderData.discount && orderData.discount.code) {
      const discountCodesRef = db.collection('businesses').doc(businessId).collection('discountCodes');
      const discountQuery = await discountCodesRef.where('code', '==', orderData.discount.code.toUpperCase()).limit(1).get();
      
      if (!discountQuery.empty) {
        const discountDoc = discountQuery.docs[0];
        discountCodeId = discountDoc.id;
        const discount = discountDoc.data();
        
        // Check per-customer usage limit
        if (discount.perCustomerLimit && customerId) {
          const customerOrdersRef = db.collection('businesses').doc(businessId).collection('orders');
          const customerDiscountQuery = await customerOrdersRef
            .where('customerId', '==', customerId)
            .where('discountCodeId', '==', discountCodeId)
            .get();
          
          if (customerDiscountQuery.size >= discount.perCustomerLimit) {
            // Discount already used max times by this customer
            // Continue without discount
          } else {
            // Apply discount and increment usage
            await discountDoc.ref.update({
              usageCount: admin.firestore.FieldValue.increment(1),
              updatedAt: now
            });
            
            // Handle free shipping
            if (discount.type === 'freeShipping') {
              finalShippingFees = 0;
            }
          }
        } else {
          // No per-customer limit, just increment total usage
          await discountDoc.ref.update({
            usageCount: admin.firestore.FieldValue.increment(1),
            updatedAt: now
          });
          
          // Handle free shipping
          if (discount.type === 'freeShipping') {
            finalShippingFees = 0;
          }
        }
      }
    }
    
    // Helper function to remove undefined values
    function removeUndefined(obj) {
      if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
      } else if (obj !== null && typeof obj === 'object') {
        const cleaned = {};
        for (const key in obj) {
          if (obj[key] !== undefined) {
            cleaned[key] = removeUndefined(obj[key]);
          }
        }
        return cleaned;
      }
      return obj;
    }
    
    // Create order
    const orderPayload = {
      customerName: orderData.customerName,
      customerContact: orderData.phone,
      customerEmail: orderData.email,
      status: orderData.status || 'pending',
      productCount: orderData.items.reduce((sum, item) => sum + (item.quantity || 1), 0),
      total: orderData.total,
      subtotal: orderData.subtotal || orderData.total,
      shippingFees: finalShippingFees,
      paymentStatus: orderData.paymentStatus || 'unpaid',
      paymentMethod: orderData.paymentMethod || null,
      channel: orderData.channel || 'website',
      date: (() => {
        try {
          if (orderData.date) {
            // Handle ISO string or timestamp
            const dateObj = typeof orderData.date === 'string' ? new Date(orderData.date) : new Date(orderData.date);
            if (isNaN(dateObj.getTime())) {
              // Invalid date, use current date
              return admin.firestore.FieldValue.serverTimestamp();
            }
            return admin.firestore.Timestamp.fromDate(dateObj);
          }
          return admin.firestore.FieldValue.serverTimestamp();
        } catch (error) {
          console.error('[createWebsiteOrder] Error parsing date:', error);
          return admin.firestore.FieldValue.serverTimestamp();
        }
      })(),
      shippingAddress: {
        line: orderData.addressDetails.line,
        apartment: orderData.addressDetails.apartment || '',
        floor: orderData.addressDetails.floor || '',
        building: orderData.addressDetails.building || '',
        country: orderData.addressDetails.country,
        governorate: orderData.addressDetails.governorate,
        neighborhood: orderData.addressDetails.neighborhood || '',
        district: orderData.addressDetails.district || ''
      },
      items: orderData.items.map(item => {
        const mappedItem = {
          productId: item.productId,
          name: item.name,
          quantity: item.quantity || 1,
          price: item.price
        };
        // Only add size and image if they exist
        if (item.size) mappedItem.size = item.size;
        if (item.image) mappedItem.image = item.image;
        return mappedItem;
      }),
      createdAt: now,
      updatedAt: now
    };
    
    // Add customer ID if available
    if (customerId) {
      orderPayload.customerId = customerId;
    }
    
    // Add discount information if applied
    if (orderData.discount && discountCodeId) {
      orderPayload.discountCodeId = discountCodeId;
      const discountObj = {
        code: orderData.discount.code,
        type: orderData.discount.type,
        value: orderData.discount.value
      };
      if (orderData.discount.amount) {
        discountObj.amount = orderData.discount.amount;
      }
      orderPayload.discount = discountObj;
      if (orderData.discount.amount) {
        orderPayload.discountAmount = orderData.discount.amount;
      }
    }
    
    // Add COD amount if payment is unpaid
    if (orderData.paymentStatus === 'unpaid') {
      orderPayload.codAmount = orderData.total;
    }
    
    // Clean undefined values from orderPayload
    const cleanedOrderPayload = removeUndefined(orderPayload);
    
    const ordersRef = db.collection('businesses').doc(businessId).collection('orders');
    const orderDoc = await ordersRef.add(cleanedOrderPayload);
    
    // Decrease product stock (handles overall and variant-level stock)
    for (const item of orderData.items) {
      if (item.productId) {
        try {
          const productRef = db.collection('businesses').doc(businessId).collection('products').doc(item.productId);
          const productDoc = await productRef.get();
          
          if (productDoc.exists) {
            const productData = productDoc.data();
            const qty = item.quantity || 1;
            const updates = {};

            // Decrease variant-level stock if item has a size
            if (item.size && productData.stock && typeof productData.stock === 'object') {
              const sizeKey = item.size;
              if (typeof productData.stock[sizeKey] === 'number') {
                updates[`stock.${sizeKey}`] = Math.max(0, productData.stock[sizeKey] - qty);
              }
              // Also check compound keys for sub-variants (e.g. "Blue|M")
              // The overall stock object uses size keys directly
            } else {
              // Simple numeric stock
              const currentStock = typeof productData.stock === 'number' ? productData.stock : 0;
              updates.stock = Math.max(0, currentStock - qty);
            }

            // Also decrease sub-variant stock if applicable
            if (item.size && item.size.includes('|') && productData.subVariants) {
              const [parentKey, subName] = item.size.split('|');
              if (productData.subVariants[parentKey]) {
                const subIndex = productData.subVariants[parentKey].findIndex(s => s.name === subName);
                if (subIndex >= 0) {
                  const currentSubStock = productData.subVariants[parentKey][subIndex].stock || 0;
                  updates[`subVariants.${parentKey}.${subIndex}.stock`] = Math.max(0, currentSubStock - qty);
                }
              }
            }

            if (Object.keys(updates).length > 0) {
              await productRef.update(updates);
            }
          }
        } catch (error) {
          console.error(`Failed to decrease stock for product ${item.productId}:`, error);
        }
      }
    }
    
    res.status(200).json({
      success: true,
      orderId: orderDoc.id,
      customerId: customerId
    });
    
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      error: 'Failed to create order', 
      message: error.message || 'An unexpected error occurred',
      details: error.message 
    });
  }
});

// Submit product review from live store
exports.submitProductReview = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { businessId, productId, productName, customerName, customerEmail, rating, title, comment } = req.body;

    if (!businessId || !productId || !productName || !customerName || !comment) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Business ID, product, customer name, and comment are required'
      });
      return;
    }

    const r = parseInt(rating, 10);
    if (isNaN(r) || r < 1 || r > 5) {
      res.status(400).json({
        error: 'Invalid rating',
        message: 'Rating must be between 1 and 5'
      });
      return;
    }

    const db = admin.firestore();
    const reviewsRef = db.collection('businesses').doc(businessId).collection('reviews');
    await reviewsRef.add({
      productId,
      productName: String(productName).trim().slice(0, 500),
      customerName: String(customerName).trim().slice(0, 200),
      customerEmail: customerEmail ? String(customerEmail).trim().slice(0, 200) : '',
      rating: r,
      title: title ? String(title).trim().slice(0, 200) : '',
      comment: String(comment).trim().slice(0, 2000),
      status: 'pending',
      helpfulCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ success: true, message: 'Thank you! Your review has been submitted and will appear after approval.' });
  } catch (error) {
    console.error('[submitProductReview] Error:', error);
    res.status(500).json({
      error: 'Failed to submit review',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Track abandoned carts from live store
exports.trackCart = functions.https.onRequest(
  { cors: true, maxInstances: 20 },
  async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const { businessId, sessionId, items, customerName, customerEmail, customerPhone, source, action } = req.body;
    if (!businessId || !sessionId) {
      res.status(400).json({ error: 'businessId and sessionId are required' });
      return;
    }

    const db = admin.firestore();
    const cartRef = db.collection('businesses').doc(businessId).collection('abandonedCarts').doc(sessionId);

    // Mark as recovered (checkout completed)
    if (action === 'recovered') {
      const snap = await cartRef.get();
      if (snap.exists) {
        await cartRef.update({
          status: 'recovered',
          recoveredAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      res.status(200).json({ success: true, action: 'recovered' });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      // Cart emptied — delete the record
      await cartRef.delete();
      res.status(200).json({ success: true, action: 'deleted' });
      return;
    }

    const totalValue = items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0);

    // Check if cart already exists (for createdAt preservation)
    const existingSnap = await cartRef.get();
    const dataToWrite = {
      items: items.map(i => ({
        productId: i.id || i.productId || '',
        name: i.name || '',
        quantity: i.quantity || 1,
        price: i.price || 0,
        size: i.size || null,
        color: i.color || null,
        image: i.image || null
      })),
      totalValue,
      customerName: customerName || 'Guest',
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      source: source || 'website',
      status: 'active',
      lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (!existingSnap.exists) {
      dataToWrite.createdAt = admin.firestore.FieldValue.serverTimestamp();
      dataToWrite.recoveryEmailSent = false;
      dataToWrite.recoveryAttempts = 0;
    }

    await cartRef.set(dataToWrite, { merge: true });

    res.status(200).json({ success: true, action: 'updated' });
  } catch (error) {
    console.error('[trackCart] Error:', error);
    res.status(500).json({ error: 'Failed to track cart' });
  }
});

// Register a new website customer (creates record in Dashboard customers)
exports.registerWebsiteCustomer = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
      const { businessId, name, email, phone, password } = req.body;

      if (!businessId || !name || !email || !password) {
        res.status(400).json({ error: 'Missing required fields', message: 'Name, email, and password are required' });
        return;
      }

      const db = admin.firestore();
      const customersRef = db.collection('businesses').doc(businessId).collection('customers');

      const crypto = require('crypto');
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      const now = admin.firestore.FieldValue.serverTimestamp();
      const nameParts = name.trim().split(' ');

      // Check if email already exists
      const existingQuery = await customersRef.where('email', '==', email.trim().toLowerCase()).limit(1).get();

      if (!existingQuery.empty) {
        const existingDoc = existingQuery.docs[0];
        const existingData = existingDoc.data();

        // If customer exists from order but has no password, let them register (claim account)
        if (!existingData.passwordHash) {
          await customersRef.doc(existingDoc.id).update({
            name: name.trim(),
            firstName: nameParts[0] || existingData.firstName || '',
            lastName: nameParts.slice(1).join(' ') || existingData.lastName || '',
            phone: phone ? phone.trim() : existingData.phone || '',
            passwordHash,
            updatedAt: now
          });

          const createdAt = existingData.createdAt ? (existingData.createdAt.toDate ? existingData.createdAt.toDate().toISOString() : existingData.createdAt) : new Date().toISOString();

          res.status(200).json({
            success: true,
            customer: {
              id: existingDoc.id,
              name: name.trim(),
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              email: existingData.email,
              phone: phone ? phone.trim() : existingData.phone || '',
              addressDetails: existingData.addressDetails || null,
              orderCount: existingData.orderCount || 0,
              totalSpent: existingData.totalSpent || 0,
              createdAt: createdAt
            }
          });
          return;
        }

        // Already has a password — true duplicate
        res.status(409).json({ error: 'Email already registered', message: 'An account with this email already exists. Please sign in.' });
        return;
      }

      const customerData = {
        name: name.trim(),
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : '',
        passwordHash,
        status: 'active',
        orderCount: 0,
        totalSpent: 0,
        source: 'website',
        createdAt: now,
        updatedAt: now
      };

      const doc = await customersRef.add(customerData);

      res.status(200).json({
        success: true,
        customer: {
          id: doc.id,
          name: customerData.name,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          email: customerData.email,
          phone: customerData.phone,
          addressDetails: null,
          orderCount: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('[registerWebsiteCustomer] Error:', error);
      res.status(500).json({ error: 'Registration failed', message: error.message });
    }
  }
);

// Login website customer (returns stored data including saved address)
exports.loginWebsiteCustomer = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
      const { businessId, email, password } = req.body;

      if (!businessId || !email || !password) {
        res.status(400).json({ error: 'Missing required fields', message: 'Email and password are required' });
        return;
      }

      const db = admin.firestore();
      const customersRef = db.collection('businesses').doc(businessId).collection('customers');

      const emailQuery = await customersRef.where('email', '==', email.trim().toLowerCase()).limit(1).get();
      if (emailQuery.empty) {
        res.status(401).json({ error: 'Invalid credentials', message: 'No account found with this email.' });
        return;
      }

      const customerDoc = emailQuery.docs[0];
      const data = customerDoc.data();

      // Verify password
      const crypto = require('crypto');
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      if (!data.passwordHash) {
        // Customer was created from an order but hasn't registered yet — set their password now
        await customersRef.doc(customerDoc.id).update({ passwordHash, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      } else if (data.passwordHash !== passwordHash) {
        res.status(401).json({ error: 'Invalid credentials', message: 'Incorrect password.' });
        return;
      }

      const createdAt = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null;

      res.status(200).json({
        success: true,
        customer: {
          id: customerDoc.id,
          name: data.name || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          addressDetails: data.addressDetails || null,
          orderCount: data.orderCount || 0,
          totalSpent: data.totalSpent || 0,
          createdAt: createdAt
        }
      });
    } catch (error) {
      console.error('[loginWebsiteCustomer] Error:', error);
      res.status(500).json({ error: 'Login failed', message: error.message });
    }
  }
);

exports.serveWebsite = websiteHosting.serveWebsite;

console.log('✅ MADAS Backend API loaded successfully');
