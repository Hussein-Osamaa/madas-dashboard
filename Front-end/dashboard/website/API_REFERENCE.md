# MADAS Website - API Reference

## 🔐 Authentication Services

### SignupService

#### `signUpWithEmailAndPassword(email, password, businessName, ownerName, plan)`
Creates a new user and business account.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password
- `businessName` (string): Name of the business
- `ownerName` (string): Owner's full name
- `plan` (string): Subscription plan ("Starter", "Pro", "Enterprise")

**Returns:**
```typescript
{
  user: User,           // Firebase Auth user
  businessId: string,   // Generated business ID
  userData: object,     // User document data
  businessData: object  // Business document data
}
```

**Example:**
```javascript
import { signupService } from '@/modules/auth/signup';

const result = await signupService.signUpWithEmailAndPassword(
  'owner@business.com',
  'password123',
  'My Business',
  'John Doe',
  'Pro'
);
```

#### `signUpStaff(email, password, businessId, role, staffName)`
Creates a staff member account linked to an existing business.

**Parameters:**
- `email` (string): Staff member's email
- `password` (string): Staff member's password
- `businessId` (string): Business ID to link to
- `role` (string): Staff role ("staff", "manager")
- `staffName` (string): Staff member's name

**Returns:**
```typescript
{
  user: User,           // Firebase Auth user
  businessId: string,   // Business ID
  userData: object      // User document data
}
```

### LoginService

#### `signInWithEmailAndPassword(email, password)`
Authenticates a user and loads their business context.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password

**Returns:**
```typescript
{
  user: User,           // Firebase Auth user
  userData: object,     // User document data
  businessId: string    // Business ID
}
```

**Example:**
```javascript
import { loginService } from '@/modules/auth/login';

const result = await loginService.signInWithEmailAndPassword(
  'user@business.com',
  'password123'
);
```

#### `getOrCreateUserDocument(uid, email)`
Gets user document or creates it if missing (fail-safe).

**Parameters:**
- `uid` (string): User's Firebase UID
- `email` (string): User's email address

**Returns:**
```typescript
{
  uid: string,
  email: string,
  businessId: string,
  role: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 🏢 Business Services

### BusinessService

#### `createBusiness(businessId, businessData)`
Creates a new business document in Firestore.

**Parameters:**
- `businessId` (string): Unique business identifier
- `businessData` (object): Business information

**Business Data Schema:**
```typescript
{
  id: string,
  ownerUid: string,
  businessName: string,
  plan: "Starter" | "Pro" | "Enterprise",
  staff: string[],        // Array of staff UIDs
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Example:**
```javascript
import { businessService } from '@/modules/business/createBusiness';

await businessService.createBusiness('business123', {
  id: 'business123',
  ownerUid: 'user123',
  businessName: 'My Business',
  plan: 'Pro',
  staff: []
});
```

#### `updateBusiness(businessId, updateData)`
Updates an existing business document.

**Parameters:**
- `businessId` (string): Business ID
- `updateData` (object): Fields to update

**Example:**
```javascript
await businessService.updateBusiness('business123', {
  businessName: 'Updated Business Name',
  plan: 'Enterprise'
});
```

#### `getBusiness(businessId)`
Retrieves a business document.

**Parameters:**
- `businessId` (string): Business ID

**Returns:**
```typescript
{
  id: string,
  ownerUid: string,
  businessName: string,
  plan: string,
  staff: string[],
  createdAt: Timestamp,
  updatedAt: Timestamp
} | null
```

## 🔧 Core Services

### AuthService (Legacy)

#### `signInAnonymously()`
Creates an anonymous user for demo purposes.

**Returns:**
```typescript
User  // Firebase Auth user
```

#### `getCurrentUser()`
Gets the currently authenticated user.

**Returns:**
```typescript
User | null  // Firebase Auth user or null
```

#### `getCurrentBusiness()`
Gets the current user's business context.

**Returns:**
```typescript
{
  id: string,
  businessName: string,
  ownerUid: string,
  plan: string,
  staff: string[]
} | null
```

#### `isAdmin()`
Checks if the current user is an admin.

**Returns:**
```typescript
Promise<boolean>
```

#### `signOut()`
Signs out the current user.

**Returns:**
```typescript
Promise<void>
```

### BusinessService (Legacy)

#### `createBusiness(businessData)`
Creates a business with the provided data.

**Parameters:**
- `businessData` (object): Business information

**Example:**
```javascript
const businessId = await BusinessService.createBusiness({
  ownerName: 'John Doe',
  businessName: 'My Business',
  industry: 'Retail',
  email: 'owner@business.com',
  phone: '+1234567890',
  plan: 'Pro',
  ownerUid: 'user123'
});
```

#### `getBusinessData(collection, businessId)`
Gets business-specific data from a collection.

**Parameters:**
- `collection` (string): Firestore collection name
- `businessId` (string): Business ID (optional, uses current business if not provided)

**Returns:**
```typescript
Promise<Array<object>>  // Array of documents
```

#### `addBusinessDocument(collection, data)`
Adds a document to a collection with business isolation.

**Parameters:**
- `collection` (string): Firestore collection name
- `data` (object): Document data

**Returns:**
```typescript
Promise<string>  // Document ID
```

#### `updateBusinessDocument(collection, docId, data)`
Updates a document in a collection.

**Parameters:**
- `collection` (string): Firestore collection name
- `docId` (string): Document ID
- `data` (object): Update data

#### `deleteBusinessDocument(collection, docId)`
Deletes a document from a collection.

**Parameters:**
- `collection` (string): Firestore collection name
- `docId` (string): Document ID

#### `getBusinessStats()`
Gets business statistics.

**Returns:**
```typescript
{
  totalSales: number,
  totalOrders: number,
  totalCustomers: number,
  totalProducts: number,
  totalStaff: number
}
```

## 🎯 Staff Services

### StaffService

#### `getStaffMembers()`
Gets all staff members for the current business.

**Returns:**
```typescript
Promise<Array<{
  id: string,
  email: string,
  role: string,
  approved: boolean,
  createdAt: Timestamp
}>>
```

#### `inviteStaff(email, role)`
Invites a new staff member to the business.

**Parameters:**
- `email` (string): Staff member's email
- `role` (string): Staff role

**Returns:**
```typescript
Promise<string>  // Staff document ID
```

#### `updateStaffRole(staffId, newRole)`
Updates a staff member's role.

**Parameters:**
- `staffId` (string): Staff document ID
- `newRole` (string): New role

#### `removeStaff(staffId)`
Removes a staff member from the business.

**Parameters:**
- `staffId` (string): Staff document ID

#### `hasPermission(feature, action)`
Checks if the current user has a specific permission.

**Parameters:**
- `feature` (string): Feature name (e.g., "orders", "inventory")
- `action` (string): Action name (e.g., "view", "edit", "create")

**Returns:**
```typescript
Promise<boolean>
```

## 📊 Data Models

### User Document
```typescript
{
  uid: string,
  email: string,
  businessId: string,
  role: "owner" | "staff" | "admin",
  ownerName?: string,      // For owners
  staffName?: string,      // For staff
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isFailSafe?: boolean     // Flag for auto-created documents
}
```

### Business Document
```typescript
{
  id: string,
  ownerUid: string,
  businessName: string,
  plan: "Starter" | "Pro" | "Enterprise",
  staff: string[],         // Array of staff UIDs
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isFailSafe?: boolean     // Flag for auto-created documents
}
```

### Staff Document
```typescript
{
  uid: string,
  email: string,
  businessId: string,
  role: "staff" | "manager" | "owner",
  approved: boolean,
  permissions: {
    [feature: string]: string[]  // Array of allowed actions
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 🔒 Security Rules

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Business documents
    match /businesses/{businessId} {
      allow read, write: if request.auth != null && 
        (resource.data.ownerUid == request.auth.uid || 
         request.auth.uid in resource.data.staff);
    }
    
    // Business data isolation
    match /{collection}/{document} {
      allow read, write: if request.auth != null && 
        resource.data.businessId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.businessId;
    }
  }
}
```

## 🚨 Error Handling

### Common Error Codes
- `auth/user-not-found`: User doesn't exist
- `auth/wrong-password`: Incorrect password
- `auth/too-many-requests`: Too many failed attempts
- `auth/email-already-in-use`: Email already registered
- `permission-denied`: Insufficient permissions
- `not-found`: Document doesn't exist

### Error Response Format
```typescript
{
  code: string,
  message: string,
  details?: any
}
```

## 📱 Usage Examples

### Complete Signup Flow
```javascript
import { signupService } from '@/modules/auth/signup';

try {
  const result = await signupService.signUpWithEmailAndPassword(
    'owner@business.com',
    'securePassword123',
    'My Awesome Business',
    'John Doe',
    'Pro'
  );
  
  console.log('Business created:', result.businessId);
  console.log('User created:', result.user.uid);
  
  // Redirect to dashboard
  window.location.href = `/pages/dashboard/${result.businessId}`;
} catch (error) {
  console.error('Signup failed:', error.message);
}
```

### Complete Login Flow
```javascript
import { loginService } from '@/modules/auth/login';

try {
  const result = await loginService.signInWithEmailAndPassword(
    'user@business.com',
    'password123'
  );
  
  console.log('Login successful');
  console.log('Business ID:', result.businessId);
  
  // Redirect to dashboard
  window.location.href = `/pages/dashboard/${result.businessId}`;
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### Business Data Operations
```javascript
import { businessService } from '@/modules/business/createBusiness';

// Get all products for current business
const products = await businessService.getBusinessData('products');

// Add new product
const productId = await businessService.addBusinessDocument('products', {
  name: 'New Product',
  price: 29.99,
  category: 'Electronics',
  stock: 100
});

// Update product
await businessService.updateBusinessDocument('products', productId, {
  price: 24.99,
  stock: 95
});
```

---

**Note**: This API reference covers the core services. For additional functionality, refer to the individual service files in the `/src/modules/` directory.








