# 🚀 MADAS Multi-Tenant SaaS - Quick Start Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Setup & Testing](#setup--testing)
3. [Client Signup Flow](#client-signup-flow)
4. [Staff Management Flow](#staff-management-flow)
5. [Data Isolation Verification](#data-isolation-verification)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

Your MADAS system has **3 main components**:

### 1. **Public Website** (`simple-website/`)
- Clients choose plans and sign up
- Login page for existing clients
- Contact and support pages

### 2. **System Admin Dashboard** (`Sys-dashboard.html`)
- View ALL clients (system-wide)
- Monitor subscriptions
- Manage plans
- View business emails
- Export client data

### 3. **Client Business Dashboard** (`Dashboard/`)
- Each client gets isolated workspace
- Plan-based feature access
- Staff management
- Business data (orders, inventory, customers)

---

## 🔧 Setup & Testing

### Step 1: Start the Server

You already have the Python server running:
```bash
cd System/simple-website
python3 -m http.server 8080
```

Access at: `http://localhost:8080`

### Step 2: Create Test Users

Visit: `http://localhost:8080/Dashboard/create-users.html`

This will create test accounts in Firebase:
- `nextgencoders404@gmail.com` / `12341234` (Admin - Approved)
- `admin@madas.com` / `admin123` (Admin - Approved)
- `manager@madas.com` / `manager123` (Manager - Approved)
- `staff@madas.com` / `staff123` (Staff - Approved)
- `pending@madas.com` / `pending123` (Pending - Denied)

### Step 3: Test the Complete Flow

#### 3a. Test Client Signup
```
1. Go to: http://localhost:8080
2. Click "Login"
3. Click "Sign Up" tab
4. Fill form:
   - First Name: Test
   - Last Name: User
   - Email: testuser@example.com
   - Password: test1234
   - Phone: 1234567890
   - Company: Test Company
   - Business Email: contact@testcompany.com
   - Plan: Professional
5. Check "I agree to terms"
6. Click "Sign Up"
7. Wait for success message
8. Should redirect to Dashboard/index.html
9. Dashboard shows "Test Company" and "Professional Plan"
```

#### 3b. Test Client Login
```
1. Go to: http://localhost:8080/login.html
2. Enter:
   - Email: nextgencoders404@gmail.com
   - Password: 12341234
3. Click "Sign In"
4. Should redirect to Dashboard/index.html
5. Dashboard loads with user's data
```

#### 3c. Test Staff Management
```
1. Login as owner (nextgencoders404@gmail.com)
2. Go to Dashboard/Staff/Admin.html
3. Click "Add Staff"
4. Fill form:
   - Email: newstaff@company.com
   - Role: Staff
   - Check permissions: Orders (view, create), Inventory (view)
5. Click "Save Staff Member"
6. System creates staff invitation
7. Copy invitation link from console
8. Open link in incognito window
9. Staff sets password
10. Staff can now login with limited access
```

---

## 🔄 Client Signup Flow (Detailed)

### What Happens During Signup:

```javascript
Client fills signup form
    ↓
System validates:
  ✓ Email format
  ✓ Password strength
  ✓ Company name
  ✓ Plan selection
    ↓
Firebase Authentication:
  ✓ Create user account
  ✓ Set displayName
    ↓
Create Business Document:
  businessId: "business_[uid]"
  ownerUid: [user uid]
  businessName: [company name]
  businessEmail: [business email]
  plan: [selected plan]
  staff: [[owner uid]]
    ↓
Create User Document:
  uid: [user uid]
  email: [user email]
  businessId: "business_[uid]" ← CRITICAL
  role: "owner"
  plan: [selected plan]
    ↓
Create Staff Document:
  uid: [user uid]
  email: [user email]
  businessId: "business_[uid]" ← CRITICAL
  role: "owner"
  approved: true
  permissions: [full access based on plan]
    ↓
Success!
  ✓ Client account created
  ✓ Business workspace created
  ✓ Owner has full access
  ✓ Ready to add staff
    ↓
Redirect to Dashboard/index.html
```

---

## 👥 Staff Management Flow (Detailed)

### Adding Staff Member:

```javascript
Owner clicks "Add Staff"
    ↓
Fills form:
  - Email: staff@example.com
  - Role: Staff
  - Permissions: [custom checkboxes]
    ↓
System creates staff invitation:
  {
    email: "staff@example.com",
    businessId: [owner's businessId],
    role: "staff",
    permissions: { ... },
    token: [random 32-char string],
    status: "pending",
    approved: false,
    invitedBy: [owner uid],
    expiresAt: [7 days from now]
  }
    ↓
Generate invitation link:
  https://yourdomain.com/Dashboard/staff-invite.html?token=[token]
    ↓
Send email to staff@example.com (in production)
  OR
Display link in console (for testing)
    ↓
Staff clicks link
    ↓
Redirected to password creation page
    ↓
Staff fills form:
  - Full Name: Staff Member
  - Password: ********
  - Confirm Password: ********
    ↓
System:
  1. Verifies token is valid
  2. Checks expiry
  3. Creates Firebase Auth account
  4. Updates staff document:
     - status: "active"
     - approved: true
     - uid: [new user uid]
  5. Creates user document:
     - businessId: [from invitation]
     - role: [from invitation]
     - permissions: [from invitation]
    ↓
Success!
  ✓ Staff account created
  ✓ Linked to owner's business
  ✓ Can login with limited access
    ↓
Redirect to Dashboard/index.html
```

---

## 🔐 Data Isolation Verification

### How to Verify Isolation is Working:

#### Test 1: Create Multiple Businesses
```
1. Create Business A:
   - Email: business-a@example.com
   - Company: Company A
   - Plan: Professional

2. Login as Business A
3. Create orders, products, customers
4. Note the businessId in console

5. Logout

6. Create Business B:
   - Email: business-b@example.com
   - Company: Company B
   - Plan: Enterprise

7. Login as Business B
8. Create orders, products, customers

9. Verify:
   ✓ Business B CANNOT see Business A's data
   ✓ Each business has different businessId
   ✓ Dashboard only shows their own data
```

#### Test 2: Staff Access Verification
```
1. Login as Business A owner
2. Add staff member with limited permissions
3. Logout
4. Login as staff member
5. Try to:
   ✓ View allowed pages (should work)
   ✓ Access restricted pages (should be blocked)
   ✓ See other businesses' data (should be impossible)
```

#### Test 3: Firebase Console Verification
```
1. Open Firebase Console
2. Go to Firestore Database
3. Check collections:
   
businesses/
  └── business_[uid-1]/
      - ownerUid: uid-1
      - businessName: "Company A"
      
  └── business_[uid-2]/
      - ownerUid: uid-2
      - businessName: "Company B"

users/
  └── uid-1
      - businessId: "business_uid-1" ← Links to Business A
      
  └── uid-2
      - businessId: "business_uid-2" ← Links to Business B

staff/
  └── staff-1
      - businessId: "business_uid-1" ← Business A staff
      
  └── staff-2
      - businessId: "business_uid-2" ← Business B staff

orders/
  └── order-1
      - businessId: "business_uid-1" ← Business A order
      
  └── order-2
      - businessId: "business_uid-2" ← Business B order
```

---

## 🐛 Troubleshooting

### Issue 1: "Invalid credentials" error
**Solution**: The user account doesn't exist in Firebase
```
1. Go to: http://localhost:8080/Dashboard/create-users.html
2. Click "Create Test Users"
3. Wait for completion
4. Try logging in again
```

### Issue 2: "Access denied" error
**Solution**: User not in staff collection or not approved
```
1. Check Firebase Firestore
2. Go to "staff" collection
3. Find user by email
4. Verify:
   - approved: true
   - status: "active"
   - businessId: [valid business ID]
   - permissions.home: ["view"]
```

### Issue 3: No data showing in dashboard
**Solution**: businessId not set correctly
```
1. Open browser console
2. Run: localStorage.getItem('currentUser')
3. Check if businessId is present
4. Run: window.businessService.getCurrentBusinessId()
5. Should return valid business ID
```

### Issue 4: Staff can see other business data
**Solution**: Firestore security rules not deployed
```
1. Go to Firebase Console
2. Navigate to Firestore Database → Rules
3. Deploy the security rules from firestore.rules
4. Test again
```

### Issue 5: Runtime.lastError connection error
**Solution**: Chrome extension conflict
```
1. Open Chrome DevTools
2. Go to Application → Service Workers
3. Unregister all service workers
4. Refresh page
5. Or test in Incognito mode
```

---

## 📊 Testing Checklist

### Authentication
- [ ] Client can sign up
- [ ] Client can login
- [ ] Staff can login after invitation
- [ ] Unauthorized users blocked
- [ ] Password reset works

### Data Isolation
- [ ] Each business has unique businessId
- [ ] Orders filtered by businessId
- [ ] Products filtered by businessId
- [ ] Customers filtered by businessId
- [ ] Staff filtered by businessId
- [ ] No cross-business data access

### Staff Management
- [ ] Owner can add staff
- [ ] Staff receives invitation
- [ ] Staff can set password
- [ ] Staff has correct permissions
- [ ] Staff can be edited
- [ ] Staff can be removed
- [ ] Permissions enforced

### Plan Features
- [ ] Starter shows basic features
- [ ] Professional shows advanced features
- [ ] Enterprise shows all features
- [ ] Plan upgrade works
- [ ] Custom plans work

### System Admin
- [ ] Can view all clients
- [ ] Statistics accurate
- [ ] Business emails displayed
- [ ] Export works
- [ ] Custom plans creation works

---

## 🎯 Success Criteria

Your system is working correctly when:

1. ✅ Multiple clients can sign up independently
2. ✅ Each client gets isolated dashboard
3. ✅ Clients cannot see each other's data
4. ✅ Owners can invite staff
5. ✅ Staff have limited access based on permissions
6. ✅ Plan features work correctly
7. ✅ System admin can view all clients
8. ✅ All authentication flows work
9. ✅ Logout redirects correctly
10. ✅ Security rules enforce isolation

---

## 📞 Need Help?

### Current Test Credentials:
- **Admin**: `nextgencoders404@gmail.com` / `12341234`
- **Admin**: `admin@madas.com` / `admin123`
- **Manager**: `manager@madas.com` / `manager123`
- **Staff**: `staff@madas.com` / `staff123`

### Quick Links:
- **Main Website**: `http://localhost:8080`
- **Login Page**: `http://localhost:8080/login.html`
- **Dashboard**: `http://localhost:8080/Dashboard/index.html`
- **System Admin**: `http://localhost:8080/Sys-dashboard.html`
- **Create Users**: `http://localhost:8080/Dashboard/create-users.html`
- **Firebase Test**: `http://localhost:8080/Dashboard/firebase-test.html`

---

**Status**: ✅ **SYSTEM FULLY OPERATIONAL**

Your multi-tenant SaaS platform is complete and ready for testing!
