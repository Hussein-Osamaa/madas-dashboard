# 🔒 TENANT ISOLATION MIDDLEWARE - COMPLETE GUIDE

## Overview
Complete middleware system for automatic data isolation between businesses in your multi-tenant SaaS platform.

---

## 📦 WHAT'S INCLUDED

### **Backend Middleware (Node.js/Express)**
✅ `middleware/tenantIsolation.js` - Complete backend isolation
- Extracts businessId from user session
- Automatically scopes all database queries
- Prevents cross-business data access
- Permission checking
- Feature gates
- Usage limit enforcement
- Audit logging

### **Frontend Hooks (React/Next.js)**
✅ `client-tenant-isolation.js` - Complete frontend isolation  
- React Context for tenant state
- Custom hooks for scoped operations
- Automatic query scoping
- Feature gates (UI components)
- Permission gates (UI components)
- Business selector component

### **Example API Routes**
✅ `api-examples/products.js` - Real-world implementation
- Complete CRUD with tenant isolation
- Bulk operations
- Usage limit checking
- Permission verification

---

## 🚀 QUICK START

### **Step 1: Install Dependencies**

```bash
npm install firebase-admin express
```

### **Step 2: Backend Setup**

```javascript
// server.js
const express = require('express');
const admin = require('firebase-admin');
const productsRoutes = require('./api-examples/products');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json')
});

const app = express();
app.use(express.json());

// Use product routes (tenant isolation is applied automatically)
app.use('/api/products', productsRoutes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### **Step 3: Frontend Setup**

```javascript
// app/layout.jsx
import { TenantProvider } from '@/lib/client-tenant-isolation';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
```

---

## 💻 BACKEND USAGE

### **Basic Route with Tenant Isolation**

```javascript
const express = require('express');
const router = express.Router();
const { tenantIsolation, requirePermission } = require('../middleware/tenantIsolation');

// Apply tenant isolation
router.use(tenantIsolation);

// This route is automatically scoped to the user's business
router.get('/orders', requirePermission('canViewOrders'), async (req, res) => {
  const { businessId } = req.tenant; // Automatically extracted!
  
  // All queries are now scoped to this businessId
  const orders = await req.tenant.scopedCollection('orders').get();
  
  res.json({ orders });
});
```

### **Scoped Query Example**

```javascript
const { scopedQuery } = require('../middleware/tenantIsolation');

router.get('/orders/recent', tenantIsolation, async (req, res) => {
  const { businessId } = req.tenant;
  
  // Build query - businessId is automatically applied
  const recentOrders = await scopedQuery(businessId, 'orders')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  
  // recentOrders will ONLY contain orders from this business
  res.json({ orders: recentOrders });
});
```

### **Create Operation with Auto-Scoping**

```javascript
const { addBusinessDocument } = require('../middleware/tenantIsolation');

router.post('/customers', tenantIsolation, async (req, res) => {
  const { businessId, userId } = req.tenant;
  const customerData = req.body;
  
  // businessId is automatically added to the document
  const newCustomer = await addBusinessDocument(
    businessId,
    'customers',
    customerData,
    userId
  );
  
  // newCustomer.businessId === businessId (guaranteed!)
  res.json({ customer: newCustomer });
});
```

### **Update with Cross-Business Protection**

```javascript
const { updateBusinessDocument } = require('../middleware/tenantIsolation');

router.put('/customers/:id', tenantIsolation, async (req, res) => {
  const { businessId, userId } = req.tenant;
  const { id } = req.params;
  const updates = req.body;
  
  try {
    // Automatically verifies customer belongs to this business
    const updated = await updateBusinessDocument(
      businessId,
      'customers',
      id,
      updates,
      userId
    );
    
    res.json({ customer: updated });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      // Trying to update customer from different business!
      return res.status(403).json({ error: 'Access denied' });
    }
    throw error;
  }
});
```

### **Permission & Feature Checking**

```javascript
const { requirePermission, requireFeature } = require('../middleware/tenantIsolation');

// Require specific permission
router.post('/products',
  tenantIsolation,
  requirePermission('canCreateProducts'), // Must have this permission
  async (req, res) => {
    // User has permission, proceed
  }
);

// Require plan feature
router.get('/gamification',
  tenantIsolation,
  requireFeature('gamification'), // Business must have this feature enabled
  async (req, res) => {
    // Business has gamification feature, proceed
  }
);

// Combine multiple checks
router.post('/advanced-reports',
  tenantIsolation,
  requireFeature('advanced_reports'),
  requirePermission('canViewReports'),
  async (req, res) => {
    // Must have both feature AND permission
  }
);
```

### **Usage Limit Checking**

```javascript
const { checkUsageLimit } = require('../middleware/tenantIsolation');

router.post('/products',
  tenantIsolation,
  checkUsageLimit('productsCount', 'maxProducts'), // Check before creating
  async (req, res) => {
    // User hasn't exceeded product limit, proceed
  }
);

router.post('/staff',
  tenantIsolation,
  checkUsageLimit('staffCount', 'maxStaff'),
  async (req, res) => {
    // Can add more staff
  }
);
```

### **Super Admin Bypass**

```javascript
router.get('/all-businesses', tenantIsolation, async (req, res) => {
  // Super admin can access this
  if (!req.tenant.isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  
  const admin = require('firebase-admin');
  const db = admin.firestore();
  
  // Super admin can query across all businesses
  const snapshot = await db.collection('businesses').get();
  const businesses = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  res.json({ businesses });
});
```

---

## 🎨 FRONTEND USAGE

### **Wrap Your App with TenantProvider**

```javascript
// app/layout.jsx
import { TenantProvider } from '@/lib/client-tenant-isolation';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
```

### **Use Business Context in Components**

```javascript
'use client';

import { useTenant, BusinessSelector } from '@/lib/client-tenant-isolation';

export function Header() {
  const { user, currentBusiness, isSuperAdmin } = useTenant();
  
  return (
    <header>
      <h1>{currentBusiness?.businessName}</h1>
      <BusinessSelector />
      {isSuperAdmin && (
        <span className="badge">Super Admin</span>
      )}
    </header>
  );
}
```

### **Scoped Collection Operations**

```javascript
'use client';

import { useState, useEffect } from 'react';
import { useScopedCollection, useTenant } from '@/lib/client-tenant-isolation';

export function ProductList() {
  const { businessId } = useTenant();
  const products = useScopedCollection('products');
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProducts();
  }, [businessId]);
  
  async function loadProducts() {
    try {
      setLoading(true);
      // getAll() automatically filters by businessId
      const data = await products.getAll({ status: 'active' });
      setProductList(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function addProduct(productData) {
    // create() automatically adds businessId
    const newProduct = await products.create(productData);
    setProductList([...productList, newProduct]);
  }
  
  async function updateProduct(productId, updates) {
    // update() verifies product belongs to this business
    const updated = await products.update(productId, updates);
    setProductList(productList.map(p => p.id === productId ? updated : p));
  }
  
  async function deleteProduct(productId) {
    // remove() verifies product belongs to this business
    await products.remove(productId);
    setProductList(productList.filter(p => p.id !== productId));
  }
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Products for {businessId}</h2>
      {productList.map(product => (
        <div key={product.id}>
          <span>{product.name}</span>
          <button onClick={() => updateProduct(product.id, { name: 'New Name' })}>
            Edit
          </button>
          <button onClick={() => deleteProduct(product.id)}>
            Delete
          </button>
        </div>
      ))}
      <button onClick={() => addProduct({ name: 'New Product', price: 10 })}>
        Add Product
      </button>
    </div>
  );
}
```

### **Feature Gates (UI)**

```javascript
import { FeatureGate } from '@/lib/client-tenant-isolation';

export function GamificationPage() {
  return (
    <div>
      <h1>Marketing</h1>
      
      {/* Only show if business has gamification feature */}
      <FeatureGate feature="gamification">
        <GamificationHub />
      </FeatureGate>
      
      {/* Custom fallback */}
      <FeatureGate 
        feature="api_access"
        fallback={
          <div className="text-center p-6">
            <p>API Access requires Enterprise plan</p>
            <button>Upgrade Now</button>
          </div>
        }
      >
        <APISettings />
      </FeatureGate>
    </div>
  );
}
```

### **Permission Gates (UI)**

```javascript
import { PermissionGate } from '@/lib/client-tenant-isolation';

export function ProductsPage() {
  return (
    <div>
      <h1>Products</h1>
      
      {/* Everyone can view */}
      <ProductList />
      
      {/* Only users with permission can create */}
      <PermissionGate permission="canCreateProducts">
        <button>Add Product</button>
      </PermissionGate>
      
      {/* Only users with permission can delete */}
      <PermissionGate permission="canDeleteProducts">
        <button className="text-red-600">Delete All</button>
      </PermissionGate>
    </div>
  );
}
```

### **HOC: Protect Entire Pages**

```javascript
import { withTenantIsolation } from '@/lib/client-tenant-isolation';

function DashboardPage() {
  return <div>Dashboard content</div>;
}

// Wrap component to ensure authentication and business access
export default withTenantIsolation(DashboardPage);
```

### **Real-Time Updates with Business Scoping**

```javascript
'use client';

import { useEffect, useState } from 'react';
import { useScopedCollection } from '@/lib/client-tenant-isolation';

export function LiveOrders() {
  const orders = useScopedCollection('orders');
  const [orderList, setOrderList] = useState([]);
  
  useEffect(() => {
    // Real-time subscription automatically scoped to business
    const unsubscribe = orders.subscribe(
      { status: 'pending' }, // Filter
      (data) => {
        setOrderList(data); // Only orders from this business!
      }
    );
    
    return () => unsubscribe();
  }, []);
  
  return (
    <div>
      {orderList.map(order => (
        <div key={order.id}>Order #{order.orderNumber}</div>
      ))}
    </div>
  );
}
```

---

## 🔐 SECURITY FEATURES

### **1. Automatic Business ID Injection**

All operations automatically include businessId:

```javascript
// ❌ WITHOUT MIDDLEWARE - UNSAFE!
await db.collection('products').add({
  name: 'Product',
  price: 10
  // Missing businessId - could be accessed by anyone!
});

// ✅ WITH MIDDLEWARE - SAFE!
await addBusinessDocument(businessId, 'products', {
  name: 'Product',
  price: 10
  // businessId automatically added ✓
});
```

### **2. Cross-Business Access Prevention**

```javascript
// User from Business A tries to access Business B's product
const product = await getBusinessDocument(
  'business_A', // Current user's business
  'products',
  'product_from_business_B' // Product from different business
);

// Result: Error thrown!
// "Unauthorized: Document belongs to different business"
```

### **3. Super Admin Bypass**

```javascript
// Regular user
req.tenant.isSuperAdmin === false
// Can only access their own business data

// Super admin
req.tenant.isSuperAdmin === true
// Can access ALL business data
// Still respects explicit businessId in requests
```

### **4. Permission Enforcement**

```javascript
// User without permission
router.delete('/product/:id',
  tenantIsolation,
  requirePermission('canDeleteProducts'),
  handler
);

// Response: 403 Forbidden
// "Permission required: canDeleteProducts"
```

### **5. Feature Gates**

```javascript
// Business on Basic plan tries to access Pro feature
router.get('/gamification',
  tenantIsolation,
  requireFeature('gamification'),
  handler
);

// Response: 403 Feature Not Available
// "The 'gamification' feature is not available in your plan"
// { upgradeRequired: true }
```

### **6. Usage Limits**

```javascript
// Business has created 500 products (limit: 500)
router.post('/products',
  tenantIsolation,
  checkUsageLimit('productsCount', 'maxProducts'),
  handler
);

// Response: 403 Usage Limit Exceeded
// "You have reached your products limit"
// { current: 500, limit: 500, upgradeRequired: true }
```

---

## 📊 REQUEST FLOW

### **Flow Diagram**

```
1. Client sends request with Auth token
          ↓
2. tenantIsolation middleware extracts userId from token
          ↓
3. Middleware gets user's document from Firestore
          ↓
4. Extracts businessId from user.currentBusinessId
          ↓
5. Verifies user has access to this business
   (checks businesses/{businessId}/staff/{userId})
          ↓
6. Checks if business status is 'active'
          ↓
7. Loads user's permissions from staff document
          ↓
8. Attaches tenant context to req.tenant:
   {
     userId: 'user_123',
     businessId: 'business_456',
     isSuperAdmin: false,
     permissions: { canViewProducts: true, ... },
     scopedCollection: (name) => {...}
   }
          ↓
9. Request proceeds to next middleware/handler
          ↓
10. All database queries use req.tenant.businessId
          ↓
11. Response contains only data from user's business
```

---

## 🛡️ SECURITY LAYERS

### **Layer 1: Authentication**
```
Check: Is user logged in?
Tool: Firebase Auth token verification
Result: req.tenant.userId
```

### **Layer 2: Business Access**
```
Check: Does user have access to this business?
Tool: Check staff document exists
Result: Access granted/denied
```

### **Layer 3: Business Status**
```
Check: Is business active?
Tool: Check business.status field
Result: Allow/block based on status
```

### **Layer 4: Permissions**
```
Check: Does user have required permission?
Tool: Check staff.permissions field
Result: Permission granted/denied
```

### **Layer 5: Feature Access**
```
Check: Does business have feature enabled?
Tool: Check business.features field
Result: Feature available/unavailable
```

### **Layer 6: Usage Limits**
```
Check: Has business exceeded limits?
Tool: Compare usage vs limits
Result: Allow/block operation
```

### **Layer 7: Data Verification**
```
Check: Does document belong to this business?
Tool: Verify document.businessId matches
Result: Allow/reject operation
```

---

## 💡 USAGE EXAMPLES

### **Example 1: Products API (Complete)**

See `api-examples/products.js` for full implementation with:
- ✅ List products (scoped to business)
- ✅ Get single product (with verification)
- ✅ Create product (with limit check)
- ✅ Update product (with ownership verification)
- ✅ Delete product (with permission check)
- ✅ Bulk import (with batch operations)

### **Example 2: Orders API**

```javascript
const router = express.Router();
const { 
  tenantIsolation, 
  requirePermission, 
  scopedQuery 
} = require('../middleware/tenantIsolation');

router.use(tenantIsolation);

// List orders - automatically scoped
router.get('/', requirePermission('canViewOrders'), async (req, res) => {
  const { businessId } = req.tenant;
  
  const orders = await scopedQuery(businessId, 'orders')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .get();
  
  res.json({ orders });
});

// Create order - auto-scoped
router.post('/', requirePermission('canCreateOrders'), async (req, res) => {
  const { businessId, userId } = req.tenant;
  const orderData = req.body;
  
  const newOrder = await addBusinessDocument(
    businessId,
    'orders',
    orderData,
    userId
  );
  
  res.json({ order: newOrder });
});
```

### **Example 3: React Component with Tenant Isolation**

```javascript
'use client';

import { useTenant, useScopedCollection, FeatureGate, PermissionGate } from '@/lib/client-tenant-isolation';

export default function ProductsPage() {
  const { businessId, currentBusiness } = useTenant();
  const products = useScopedCollection('products');
  const [productList, setProductList] = useState([]);
  
  useEffect(() => {
    loadProducts();
  }, [businessId]);
  
  async function loadProducts() {
    // Automatically scoped to current business
    const data = await products.getAll();
    setProductList(data);
  }
  
  async function handleAddProduct() {
    const newProduct = await products.create({
      name: 'New Product',
      price: 10,
      status: 'active'
    });
    setProductList([...productList, newProduct]);
  }
  
  return (
    <div>
      <h1>Products - {currentBusiness?.businessName}</h1>
      
      {/* List products */}
      {productList.map(product => (
        <div key={product.id}>
          {product.name} - ${product.price}
          
          {/* Only show edit if user has permission */}
          <PermissionGate permission="canEditProducts">
            <button>Edit</button>
          </PermissionGate>
          
          {/* Only show delete if user has permission */}
          <PermissionGate permission="canDeleteProducts">
            <button className="text-red-600">Delete</button>
          </PermissionGate>
        </div>
      ))}
      
      {/* Only show add button if user has permission */}
      <PermissionGate permission="canCreateProducts">
        <button onClick={handleAddProduct}>
          Add Product
        </button>
      </PermissionGate>
    </div>
  );
}
```

### **Example 4: Feature-Gated Page**

```javascript
'use client';

import { FeatureGate } from '@/lib/client-tenant-isolation';

export default function GamificationPage() {
  return (
    <FeatureGate feature="gamification">
      {/* Only renders if business has gamification feature */}
      <div>
        <h1>Gamification Hub</h1>
        <DiscountWheel />
        <ScratchCards />
        <LoyaltyProgram />
      </div>
    </FeatureGate>
  );
}
```

---

## 🧪 TESTING

### **Test 1: Data Isolation**

```javascript
// Test that Business A cannot access Business B's data

// Setup
const businessA = 'business_123';
const businessB = 'business_456';

// Create product in Business A
const productA = await addBusinessDocument(businessA, 'products', {
  name: 'Product A',
  price: 10
});

// Try to access from Business B context
try {
  const product = await getBusinessDocument(businessB, 'products', productA.id);
  // Should fail!
  console.error('SECURITY BREACH: Cross-business access succeeded!');
} catch (error) {
  console.log('✅ Security working: Cross-business access blocked');
}
```

### **Test 2: Permission Enforcement**

```javascript
// Test that users without permission cannot perform actions

// User has canViewProducts but NOT canDeleteProducts
const req = {
  tenant: {
    businessId: 'business_123',
    permissions: {
      canViewProducts: true,
      canDeleteProducts: false
    }
  }
};

// This should succeed
await viewProducts(req, res);

// This should fail with 403
await deleteProduct(req, res); // 403 Forbidden
```

### **Test 3: Feature Gates**

```javascript
// Test that businesses without features cannot access them

// Business on Basic plan (no gamification)
const business = {
  plan: { type: 'basic' },
  features: {
    pos: true,
    inventory: true,
    gamification: false
  }
};

// This should fail
try {
  await accessGamification(businessId);
} catch (error) {
  console.log('✅ Feature gate working:', error.message);
  // "The 'gamification' feature is not available in your plan"
}
```

---

## ⚙️ CONFIGURATION

### **Environment Variables**

```env
# .env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT=./serviceAccountKey.json
NODE_ENV=production
ENABLE_AUDIT_LOGGING=true
RATE_LIMIT_WINDOW=3600000
RATE_LIMIT_MAX_REQUESTS=1000
```

### **Middleware Options**

```javascript
// You can customize the middleware behavior

const tenantIsolationOptions = {
  enableAuditLogging: true,
  enableRateLimiting: true,
  strictMode: true, // Throw errors instead of returning null
  allowSuperAdminBypass: true
};

function configuredTenantIsolation(options) {
  return async (req, res, next) => {
    // Custom implementation with options
  };
}
```

---

## 🐛 TROUBLESHOOTING

### **Issue: "No business context available"**

**Cause:** User doesn't have currentBusinessId set

**Solution:**
```javascript
// Set currentBusinessId when user logs in
await updateDoc(doc(db, 'users', userId), {
  currentBusinessId: 'business_123'
});
```

### **Issue: "User does not have access to this business"**

**Cause:** User is not in the staff collection for this business

**Solution:**
```javascript
// Add user to business staff
await db
  .collection('businesses')
  .doc(businessId)
  .collection('staff')
  .doc(userId)
  .set({
    userId,
    name: 'User Name',
    role: 'staff',
    permissions: { /*...*/ },
    employment: { status: 'active' }
  });
```

### **Issue: "Unauthorized: Document belongs to different business"**

**Cause:** Trying to access document from another business

**Solution:** This is expected behavior! The middleware is working correctly to prevent cross-business access.

### **Issue: "Feature not available in your plan"**

**Cause:** Business doesn't have feature enabled

**Solution:**
```javascript
// Enable feature for business (super admin only)
await db.collection('businesses').doc(businessId).update({
  'features.gamification': true
});
```

---

## 📋 IMPLEMENTATION CHECKLIST

### **Backend Setup:**
- [ ] Install dependencies (firebase-admin, express)
- [ ] Copy `middleware/tenantIsolation.js` to your project
- [ ] Initialize Firebase Admin in server.js
- [ ] Apply middleware to API routes
- [ ] Test with sample requests

### **Frontend Setup:**
- [ ] Copy `client-tenant-isolation.js` to your project
- [ ] Wrap app with `<TenantProvider>`
- [ ] Use `useTenant()` hook in components
- [ ] Add `<BusinessSelector />` to header
- [ ] Use `useScopedCollection()` for data operations

### **Testing:**
- [ ] Test data isolation between businesses
- [ ] Test permission checks
- [ ] Test feature gates
- [ ] Test usage limits
- [ ] Test super admin bypass
- [ ] Test error handling

### **Security:**
- [ ] Deploy Firebase security rules
- [ ] Enable audit logging
- [ ] Set up rate limiting
- [ ] Review permissions regularly
- [ ] Monitor access logs

---

## 🎯 BEST PRACTICES

### **DO:**
✅ Always use middleware on protected routes
✅ Use scoped helpers for all operations
✅ Check permissions before sensitive operations
✅ Validate businessId exists before queries
✅ Log access for audit trail
✅ Test cross-business access prevention
✅ Use TypeScript for type safety (or JSDoc)

### **DON'T:**
❌ Directly query collections without scoping
❌ Trust businessId from client requests
❌ Skip permission checks
❌ Expose all data to super admin UI
❌ Forget to update usage counts
❌ Allow businessId to be modified by users

---

## 📊 MONITORING

### **Metrics to Track:**

```javascript
// Access logs collection
{
  userId: 'user_123',
  businessId: 'business_456',
  method: 'GET',
  path: '/api/products',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  timestamp: '2025-01-20T14:30:00Z'
}

// Monitor these:
- Requests per business per hour
- Failed authorization attempts
- Cross-business access attempts
- Permission denial rate
- Feature access patterns
- Usage limit hits
```

---

## 🚀 ADVANCED FEATURES

### **Custom Query Builder**

```javascript
const { scopedQuery } = require('../middleware/tenantIsolation');

// Build complex queries with automatic scoping
const expensiveProducts = await scopedQuery(businessId, 'products')
  .where('price', '>', 100)
  .where('status', '==', 'active')
  .orderBy('price', 'desc')
  .limit(20)
  .get();

// All products are guaranteed to be from the current business
```

### **Batch Operations**

```javascript
const { createScopedBatch } = require('../middleware/tenantIsolation');

// Batch operations with automatic business scoping
const batch = createScopedBatch(businessId);

batch.set('products', 'product_1', { name: 'Product 1', price: 10 });
batch.set('products', 'product_2', { name: 'Product 2', price: 20 });
batch.update('products', 'product_3', { price: 15 });
batch.delete('products', 'product_4');

// All operations are scoped to businessId
await batch.commit();
```

### **Real-Time Subscriptions**

```javascript
// Backend (Node.js)
const { scopedQuery } = require('../middleware/tenantIsolation');

const unsubscribe = scopedQuery(businessId, 'orders')
  .where('status', '==', 'pending')
  .onSnapshot((orders) => {
    // Send to client via WebSocket
    io.to(businessId).emit('orders', orders);
  });

// Frontend (React)
const orders = useScopedCollection('orders');

useEffect(() => {
  const unsubscribe = orders.subscribe(
    { status: 'pending' },
    (data) => setOrders(data)
  );
  
  return () => unsubscribe();
}, [businessId]);
```

---

## 📱 MOBILE APP INTEGRATION

Same middleware works for mobile apps:

```javascript
// React Native
import { TenantProvider, useScopedCollection } from './client-tenant-isolation';

export function App() {
  return (
    <TenantProvider>
      <NavigationContainer>
        <Stack.Navigator>
          {/* Your screens */}
        </Stack.Navigator>
      </NavigationContainer>
    </TenantProvider>
  );
}

// Use in screens
function ProductsScreen() {
  const products = useScopedCollection('products');
  const [data, setData] = useState([]);
  
  useEffect(() => {
    products.getAll().then(setData);
  }, []);
  
  return (
    <View>
      {data.map(product => (
        <Text key={product.id}>{product.name}</Text>
      ))}
    </View>
  );
}
```

---

## 🎓 LEARNING PATH

### **Beginner:**
1. Read this guide
2. Copy middleware files to your project
3. Test with simple GET requests
4. Add to one API route
5. Test in Postman

### **Intermediate:**
1. Apply to all API routes
2. Add permission checks
3. Add feature gates
4. Test cross-business access
5. Deploy to staging

### **Advanced:**
1. Implement audit logging UI
2. Add custom middleware options
3. Optimize query performance
4. Add caching layer
5. Deploy to production

---

## 📚 REFERENCE

### **req.tenant Object**

```javascript
{
  userId: 'user_123',              // Current user ID
  businessId: 'business_456',      // Current business ID
  isSuperAdmin: false,             // Is user super admin?
  permissions: {                   // User's permissions
    canViewProducts: true,
    canCreateProducts: true,
    // ...18 more permissions
  },
  scopedCollection: (name) => {   // Helper function
    // Returns scoped collection reference
  },
  getBusinessDoc: async () => {    // Helper function
    // Returns current business document
  }
}
```

### **All Middleware Functions**

| Function | Purpose |
|----------|---------|
| `tenantIsolation` | Main middleware - extracts and verifies business context |
| `requirePermission(perm)` | Checks user has specific permission |
| `requireFeature(feature)` | Checks business has feature enabled |
| `checkUsageLimit(usage, limit)` | Checks business hasn't exceeded limit |
| `scopedQuery(bid, col)` | Create query builder with auto-scoping |
| `addBusinessDocument` | Create document with auto businessId |
| `updateBusinessDocument` | Update with verification |
| `deleteBusinessDocument` | Delete with verification |
| `getBusinessDocument` | Get with verification |
| `createScopedBatch` | Batch operations with scoping |

---

## 🎉 SUCCESS CRITERIA

Your tenant isolation is working correctly when:

✅ Users can only see their own business data
✅ Cross-business access attempts fail with 403
✅ Permissions are enforced on all operations
✅ Feature gates prevent unauthorized feature access
✅ Usage limits are respected
✅ Super admin can access all businesses
✅ businessId is automatically added to all documents
✅ All queries include businessId filter
✅ Audit logs track all access
✅ No data leaks between businesses

---

## 🔗 RELATED FILES

- `middleware/tenantIsolation.js` - Backend middleware
- `client-tenant-isolation.js` - Frontend hooks  
- `api-examples/products.js` - Example API routes
- `MULTI_TENANCY_GUIDE.md` - Full system guide
- `ADMIN_SETUP_GUIDE.md` - Admin interface guide

---

**Your data is now completely isolated between businesses! 🔒**

