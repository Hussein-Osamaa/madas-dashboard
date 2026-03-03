# 📊 User Data Storage Locations

## 🗂️ Where User Data is Stored

Your MADAS system stores user data in **3 main locations**:

---

## 1. **Firebase Authentication** (Primary)

### Location: Firebase Console → Authentication
**URL**: https://console.firebase.google.com/project/madas-store/authentication/users

### What's Stored:
```javascript
{
  uid: "abc123xyz...",
  email: "nextgencoders404@gmail.com",
  displayName: "John Doe",
  emailVerified: false,
  createdAt: "2025-10-01",
  lastSignInTime: "2025-10-01 11:34:00"
}
```

### How to Access:
1. Go to: https://console.firebase.google.com
2. Select project: "madas-store"
3. Click "Authentication" in left menu
4. Click "Users" tab
5. See all registered users

---

## 2. **Firebase Firestore** (Business Data)

### Location: Firebase Console → Firestore Database
**URL**: https://console.firebase.google.com/project/madas-store/firestore

### Collections:

#### A. **businesses** Collection
```javascript
Path: /businesses/{businessId}

Document Example:
{
  id: "business_abc123",
  ownerUid: "user-uid-456",
  ownerName: "John Doe",
  businessName: "Company Name",
  businessEmail: "contact@company.com",
  plan: "professional",
  staff: ["uid-1", "uid-2", "uid-3"],
  status: "active",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### B. **users** Collection
```javascript
Path: /users/{uid}

Document Example:
{
  uid: "user-uid-456",
  firstName: "John",
  lastName: "Doe",
  email: "john@company.com",
  businessEmail: "contact@company.com",
  phone: "1234567890",
  company: "Company Name",
  businessId: "business_abc123", // Links to business
  role: "owner",
  plan: "professional",
  newsletter: true,
  status: "active",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### C. **staff** Collection
```javascript
Path: /staff/{staffId}

Document Example:
{
  uid: "user-uid-456",
  email: "john@company.com",
  name: "John Doe",
  businessId: "business_abc123", // CRITICAL for isolation
  role: "owner",
  approved: true,
  status: "active",
  permissions: {
    home: ["view"],
    orders: ["view", "search", "create", "edit", "delete"],
    inventory: ["view", "edit", "create", "delete"],
    customers: ["view", "edit", "create", "delete"],
    employees: ["view", "edit", "create", "delete"],
    finance: ["view", "reports", "export"],
    analytics: ["view", "export"],
    settings: ["view", "edit"]
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### How to Access Firestore Data:
1. Go to: https://console.firebase.google.com
2. Select project: "madas-store"
3. Click "Firestore Database" in left menu
4. Browse collections:
   - `businesses` - All business accounts
   - `users` - All user profiles
   - `staff` - All staff members
   - `orders` - All orders (filtered by businessId)
   - `inventory` - All products (filtered by businessId)
   - `customers` - All customers (filtered by businessId)

---

## 3. **Browser Local Storage** (Fallback & Session)

### Location: Browser Developer Tools → Application → Local Storage

### Keys Stored:

#### A. **nextgen_clients** (Fallback signup data)
```javascript
Key: nextgen_clients
Value: [
  {
    id: "unique-id-123",
    firstName: "John",
    lastName: "Doe",
    email: "john@company.com",
    businessEmail: "contact@company.com",
    phone: "1234567890",
    company: "Company Name",
    plan: "professional",
    password: "hashed-password",
    newsletter: true,
    terms: true,
    createdAt: "2025-10-01T11:34:00Z"
  }
]
```

#### B. **currentUser** (Active session)
```javascript
Key: currentUser
Value: {
  userId: "user-uid-456",
  email: "john@company.com",
  displayName: "John Doe",
  loginTime: "2025-10-01T11:34:00Z",
  isAuthenticated: true
}
```

#### C. **currentBusinessId** (Current business context)
```javascript
Key: currentBusinessId
Value: "business_abc123"
```

#### D. **madasUser** (Staff data cache)
```javascript
Key: madasUser
Value: {
  email: "john@company.com",
  name: "John Doe",
  businessId: "business_abc123",
  role: "owner",
  approved: true,
  permissions: { ... }
}
```

### How to Access Local Storage:
1. Open browser Developer Tools (F12 or Cmd+Option+I)
2. Go to "Application" tab
3. Expand "Local Storage" in left sidebar
4. Click your domain (http://127.0.0.1:5501)
5. See all stored data

---

## 🔍 How to View Your Current User Data

### Method 1: Browser Console
```javascript
// Open browser console (F12 or Cmd+Option+J)

// View current session
console.log(localStorage.getItem('currentUser'));

// View business ID
console.log(localStorage.getItem('currentBusinessId'));

// View staff data
console.log(localStorage.getItem('madasUser'));

// View all clients (fallback)
console.log(localStorage.getItem('nextgen_clients'));
```

### Method 2: Firebase Console
```
1. Go to: https://console.firebase.google.com
2. Select: madas-store
3. Click: Firestore Database
4. Browse collections:
   - businesses → Your business data
   - users → Your user profile
   - staff → Your staff record
```

### Method 3: System Admin Dashboard
```
1. Visit: http://localhost:8080/Sys-dashboard.html
2. View all registered clients
3. See statistics and business emails
4. Export data as CSV
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────┐
│  SIGNUP/LOGIN                           │
│  (login.html)                           │
└─────────────────┬───────────────────────┘
                  ↓
    ┌─────────────────────────────┐
    │  FIREBASE AUTHENTICATION    │
    │  ✓ Email/Password           │
    │  ✓ Social Login             │
    └─────────────┬───────────────┘
                  ↓
    ┌─────────────────────────────┐
    │  FIREBASE FIRESTORE         │
    │  Creates 3 documents:       │
    │  ├── businesses/{id}        │
    │  ├── users/{uid}            │
    │  └── staff/{staffId}        │
    └─────────────┬───────────────┘
                  ↓
    ┌─────────────────────────────┐
    │  BROWSER LOCAL STORAGE      │
    │  Stores session:            │
    │  ├── currentUser            │
    │  ├── currentBusinessId      │
    │  └── madasUser              │
    └─────────────┬───────────────┘
                  ↓
    ┌─────────────────────────────┐
    │  DASHBOARD LOADS            │
    │  (Dashboard/index.html)     │
    │  Uses businessId to filter  │
    │  and display ONLY user's    │
    │  business data              │
    └─────────────────────────────┘
```

---

## 🔧 How to Access User Data Programmatically

### In Browser Console:

```javascript
// Get current user from Firebase
firebase.auth().currentUser
// Returns: { uid, email, displayName, ... }

// Get current user session
JSON.parse(localStorage.getItem('currentUser'))
// Returns: { userId, email, displayName, loginTime, isAuthenticated }

// Get business ID
localStorage.getItem('currentBusinessId')
// Returns: "business_abc123"

// Get all clients (fallback data)
JSON.parse(localStorage.getItem('nextgen_clients') || '[]')
// Returns: Array of all clients

// Using Business Service
await window.businessService.getCurrentBusinessId()
// Returns: Current business ID

await window.businessService.getBusinessInfo()
// Returns: Complete business information

await window.businessService.getBusinessData('orders')
// Returns: All orders for current business

await window.businessService.getBusinessStaff()
// Returns: All staff members for current business
```

---

## 📍 Specific Data Locations

### Your Test Account Data:
**Email**: `nextgencoders404@gmail.com`

**Firebase Authentication**:
- Location: Firebase Console → Authentication → Users
- Find: nextgencoders404@gmail.com
- Shows: UID, last login, creation date

**Firestore - businesses**:
- Location: Firebase Console → Firestore → businesses
- Document ID: `business_[your-uid]`
- Contains: Business name, plan, staff list

**Firestore - users**:
- Location: Firebase Console → Firestore → users
- Document ID: `[your-uid]`
- Contains: Profile data, businessId, plan

**Firestore - staff**:
- Location: Firebase Console → Firestore → staff
- Filter: email == "nextgencoders404@gmail.com"
- Contains: Permissions, role, businessId

**Local Storage**:
- Open DevTools → Application → Local Storage
- Keys: currentUser, currentBusinessId, madasUser
- Contains: Session data

---

## 🔎 Quick Commands to Check Your Data

### Open Browser Console and Run:

```javascript
// 1. Check if you're logged in
console.log('Logged in:', !!firebase.auth().currentUser);

// 2. Get your user ID
console.log('User ID:', firebase.auth().currentUser?.uid);

// 3. Get your email
console.log('Email:', firebase.auth().currentUser?.email);

// 4. Get your business ID
console.log('Business ID:', localStorage.getItem('currentBusinessId'));

// 5. Get your session data
console.log('Session:', JSON.parse(localStorage.getItem('currentUser')));

// 6. Get your staff data
console.log('Staff Data:', JSON.parse(localStorage.getItem('madasUser')));

// 7. Check all local data
for (let key in localStorage) {
  console.log(key, ':', localStorage[key]);
}
```

---

## 📋 Summary

### Primary Storage: **Firebase**
- ✅ Authentication: User accounts
- ✅ Firestore: Business data, user profiles, staff records
- ✅ Persistent, secure, accessible from anywhere

### Secondary Storage: **Local Storage**
- ✅ Session data for quick access
- ✅ Fallback for offline mode
- ✅ Cached user information

### System Admin View: **Sys-dashboard.html**
- ✅ Aggregated view of all clients
- ✅ Statistics across all businesses
- ✅ Export functionality

---

## 🎯 Current User in Your Screenshot

Looking at your screenshot showing "Guest User", this means:

**Current Status**: Not logged in (Guest Access)
- User: Guest User
- Email: guest@madas.com
- Business: MADAS Dashboard
- Plan: Guest Access

### To Login and See Your Data:
1. Click the logout button (top right)
2. Login with: `nextgencoders404@gmail.com` / `12341234`
3. Dashboard will load YOUR business data
4. Display YOUR company name and plan
5. Show YOUR orders, products, customers

---

## 📞 Quick Access

**Firebase Console**: https://console.firebase.google.com/project/madas-store
- Authentication → Users
- Firestore Database → Collections
- Storage → Files (if using file uploads)

**Local Testing**:
- Open DevTools → Application → Local Storage
- Console commands above
- Check `currentUser` and `madasUser` keys

**System Admin Dashboard**:
- Visit: http://localhost:8080/Sys-dashboard.html
- See all clients and their data

---

**Your data is safely stored in Firebase and accessible through the dashboard!** 🔒
