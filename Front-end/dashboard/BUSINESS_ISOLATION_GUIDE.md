# Business Isolation System - Implementation Guide

## Overview

This document outlines the complete business isolation system implemented for the MADAS SaaS platform. Every business now has its own isolated data, staff, and dashboard access.

## 🏗️ Architecture

### 1. Business Isolation Structure

```
/businesses/{businessId}/
├── Business Information
├── Owner Details
├── Staff Members
└── Business Settings

/users/{uid}/
├── businessId (links to business)
├── role (owner/staff/admin)
└── permissions

/staff/{staffId}/
├── businessId (isolates staff to business)
├── email, name, role
├── permissions
└── status (active/pending/inactive)
```

### 2. Dashboard Routing

- **Main Dashboard**: `/main-dashboard.html` (redirects to business dashboard)
- **Business Dashboard**: `/pages/dashboard/{businessId}`
- **Staff Management**: `/pages/staff.html`

## 🔧 Implementation Details

### 1. Business Service (`/js/business-service.js`)

The `BusinessService` class handles all business-specific operations:

```javascript
// Initialize business service
const businessService = new BusinessService();
await businessService.initialize();

// Get current business ID
const businessId = businessService.getCurrentBusinessId();

// Get business-specific data
const orders = await businessService.getBusinessData('orders');
const staff = await businessService.getBusinessStaff();

// Create business-specific documents
await businessService.createBusinessDocument('orders', orderData);
```

### 2. Staff Management

#### Invite Staff
```javascript
await businessService.inviteStaff(email, role, permissions);
```

#### Manage Permissions
```javascript
await businessService.updateStaffPermissions(staffId, permissions);
```

#### Remove Staff
```javascript
await businessService.removeStaff(staffId);
```

### 3. Data Isolation

All business data is automatically filtered by `businessId`:

```javascript
// Orders are automatically filtered by businessId
const orders = await businessService.getBusinessData('orders');

// Create orders with businessId
await businessService.createBusinessDocument('orders', {
  customerName: 'John Doe',
  amount: 100,
  // businessId is automatically added
});
```

## 🔐 Security Rules

### Firestore Security Rules (`firestore-business-isolation.rules`)

The security rules ensure complete business isolation:

1. **Business Access**: Only owners and staff can access their business data
2. **Admin Override**: Admins can access all businesses
3. **Permission-Based**: Actions are controlled by user permissions
4. **Data Isolation**: Users cannot access other businesses' data

### Key Security Features:

- ✅ **Business Isolation**: Users can only access their own business data
- ✅ **Role-Based Access**: Different permissions for owners, staff, and admins
- ✅ **Permission Control**: Granular permissions for each feature
- ✅ **Admin Override**: Admins can access all businesses for management

## 📊 Firestore Schema

### 1. Businesses Collection
```javascript
/businesses/{businessId} = {
  businessName: string,
  ownerUid: string,
  ownerName: string,
  industry: string,
  email: string,
  phone: string,
  plan: 'Starter' | 'Pro' | 'Enterprise',
  status: 'active' | 'inactive' | 'pending',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. Users Collection
```javascript
/users/{uid} = {
  businessId: string,  // Links user to business
  role: 'owner' | 'staff' | 'admin',
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3. Staff Collection
```javascript
/staff/{staffId} = {
  email: string,
  name: string,
  businessId: string,  // Isolates staff to business
  role: 'owner' | 'staff' | 'manager',
  status: 'active' | 'pending' | 'inactive',
  permissions: {
    orders: ['view', 'create', 'edit'],
    inventory: ['view', 'edit'],
    customers: ['view', 'edit'],
    analytics: ['view'],
    settings: ['view']
  },
  invitedBy: string,
  invitedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 4. Business-Specific Collections

All business data collections include `businessId` for isolation:

```javascript
/orders/{orderId} = {
  businessId: string,  // Required for isolation
  customerName: string,
  amount: number,
  status: string,
  createdAt: timestamp,
  updatedAt: timestamp
}

/inventory/{itemId} = {
  businessId: string,  // Required for isolation
  name: string,
  quantity: number,
  price: number,
  createdAt: timestamp,
  updatedAt: timestamp
}

// Similar structure for: customers, employees, analytics, finance, settings, sites
```

## 🚀 Usage Guide

### 1. Creating a New Business

#### Via Admin Dashboard:
1. Go to `/admin/businesses`
2. Click "Add Business"
3. Fill out business details
4. System automatically creates:
   - Firebase Auth user
   - Business record
   - User record with businessId
   - Staff record with permissions

#### Via Website Signup:
1. Complete business setup form
2. System creates business and user records
3. User is redirected to business dashboard

### 2. Accessing Business Dashboard

#### For Business Owners/Staff:
1. Login with business credentials
2. System redirects to `/pages/dashboard/{businessId}`
3. Access is limited to their business data only

#### For Admins:
1. Login with admin credentials
2. Access admin dashboard at `/admin`
3. Can manage all businesses and users

### 3. Managing Staff

#### Invite Staff:
1. Go to Staff Management page
2. Click "Invite Staff"
3. Enter email and select role
4. Set permissions
5. Send invitation

#### Manage Permissions:
1. View staff list
2. Click edit on staff member
3. Update permissions
4. Save changes

## 🔄 Data Flow

### 1. User Authentication Flow
```
User Login → Check Staff Record → Get BusinessId → Redirect to Business Dashboard
```

### 2. Data Access Flow
```
User Request → Check BusinessId → Filter Data by BusinessId → Return Results
```

### 3. Staff Invitation Flow
```
Owner Invites Staff → Create Staff Record → Send Email → Staff Accepts → Access Granted
```

## 🛠️ Development Notes

### 1. Business Service Integration

To use business isolation in your code:

```javascript
// Always use BusinessService for data operations
const businessService = new BusinessService();
await businessService.initialize();

// Get business-specific data
const data = await businessService.getBusinessData('collectionName');

// Create business-specific documents
await businessService.createBusinessDocument('collectionName', data);

// Update business-specific documents
await businessService.updateBusinessDocument('collectionName', docId, updates);
```

### 2. Permission Checking

```javascript
// Check if user has permission
if (businessService.hasPermission('orders', 'create')) {
  // Allow order creation
}

// Check user role
const userData = JSON.parse(localStorage.getItem('madasUser'));
if (userData.role === 'owner') {
  // Owner has full access
}
```

### 3. Demo Mode Support

The system includes demo mode support using localStorage:

```javascript
// Demo data is stored in localStorage
localStorage.setItem('demoUser', JSON.stringify({
  uid: 'demo-uid',
  businessId: 'demo-business-id',
  role: 'owner'
}));
```

## 📋 Testing Checklist

### 1. Business Isolation
- [ ] Users can only see their own business data
- [ ] Staff cannot access other businesses
- [ ] Admins can access all businesses
- [ ] Data is properly filtered by businessId

### 2. Staff Management
- [ ] Owners can invite staff
- [ ] Staff permissions work correctly
- [ ] Staff can be removed/deactivated
- [ ] Permission changes take effect immediately

### 3. Dashboard Access
- [ ] Users are redirected to correct business dashboard
- [ ] Dashboard shows business-specific data
- [ ] Navigation works correctly
- [ ] Logout redirects properly

### 4. Security
- [ ] Firestore rules prevent cross-business access
- [ ] Permission checks work correctly
- [ ] Admin override functions properly
- [ ] Unauthorized access is blocked

## 🚨 Important Notes

1. **Always use BusinessService** for data operations to ensure isolation
2. **Include businessId** in all business-specific documents
3. **Check permissions** before allowing actions
4. **Test thoroughly** with multiple businesses
5. **Monitor Firestore rules** for proper access control

## 🔧 Troubleshooting

### Common Issues:

1. **User not redirected to business dashboard**
   - Check if user has businessId in their record
   - Verify staff record exists and is active

2. **Data not loading**
   - Ensure businessId is included in queries
   - Check Firestore security rules

3. **Permission denied errors**
   - Verify user permissions in staff record
   - Check if user belongs to correct business

4. **Staff invitation not working**
   - Check if email is already registered
   - Verify businessId is correct in invitation

This business isolation system ensures complete data separation between businesses while maintaining a scalable and secure architecture.

