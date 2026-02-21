# 🏢 MULTI-TENANCY SYSTEM IMPLEMENTATION GUIDE

## Overview
This guide provides a complete multi-tenancy system for your MADAS platform with business account management, data isolation, and role-based access control.

---

## 📋 TABLE OF CONTENTS

1. [Database Schema (Firebase)](#database-schema)
2. [Admin Interface](#admin-interface)
3. [Authentication & Authorization](#authentication)
4. [Data Isolation Middleware](#data-isolation)
5. [API Endpoints](#api-endpoints)
6. [Security Implementation](#security)
7. [Code Examples](#code-examples)

---

## 1. DATABASE SCHEMA (FIREBASE) {#database-schema}

### Firestore Collections Structure

```
/businesses/{businessId}
/businesses/{businessId}/staff/{staffId}
/businesses/{businessId}/products/{productId}
/businesses/{businessId}/orders/{orderId}
/businesses/{businessId}/customers/{customerId}
/businesses/{businessId}/transactions/{transactionId}
/businesses/{businessId}/expenses/{expenseId}
/businesses/{businessId}/inventory/{inventoryId}
/businesses/{businessId}/reports/{reportId}
/businesses/{businessId}/settings/{settingId}

/users/{userId}                    # Platform users
/plans/{planId}                    # Subscription plans
/features/{featureId}              # Available features
/business-features/{businessId}    # Features enabled per business
/audit-logs/{logId}                # Admin action logs
/invitations/{invitationId}        # Staff invitations
```

### Business Document Schema

```javascript
// /businesses/{businessId}
const businessSchema = {
  businessId: 'business_123',
  businessName: 'Acme Corp',
  slug: 'acme-corp', // Unique URL slug
  
  // Plan & Subscription
  plan: {
    type: 'professional', // 'basic' | 'professional' | 'enterprise'
    status: 'active', // 'active' | 'trial' | 'suspended' | 'cancelled'
    startDate: '2025-01-01T00:00:00Z',
    expiresAt: '2025-12-31T23:59:59Z',
    autoRenew: true,
    billingCycle: 'monthly', // 'monthly' | 'yearly'
  },
  
  // Contact Information
  contact: {
    email: 'admin@acme.com',
    phone: '+1234567890',
    website: 'https://acme.com'
  },
  
  // Business Owner
  owner: {
    userId: 'user_123',
    name: 'John Doe',
    email: 'john@acme.com'
  },
  
  // Limits based on plan
  limits: {
    maxStaff: 10,
    maxProducts: 1000,
    maxOrders: -1, // -1 = unlimited
    maxStorage: 5, // GB
    maxApiCalls: 10000, // per month
    maxLocations: 3
  },
  
  // Current usage
  usage: {
    staffCount: 5,
    productsCount: 245,
    ordersThisMonth: 1247,
    storageUsed: 2.3, // GB
    apiCallsThisMonth: 3456,
    locationsCount: 1
  },
  
  // Enabled features
  features: {
    pos: true,
    inventory: true,
    analytics: true,
    websiteBuilder: false,
    multiLocation: false,
    advancedReports: true,
    apiAccess: false,
    gamification: true,
    loyalty: true,
    customDomain: false
  },
  
  // Business settings
  settings: {
    currency: 'USD',
    timezone: 'America/New_York',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    logo: 'https://storage.url/logo.png',
    primaryColor: '#3B82F6',
    taxRate: 8.5
  },
  
  // Status
  status: 'active', // 'active' | 'suspended' | 'deleted'
  suspensionReason: null,
  
  // Metadata
  metadata: {
    createdAt: '2025-01-01T00:00:00Z',
    createdBy: 'admin_user_id',
    updatedAt: '2025-01-15T10:00:00Z',
    lastActivityAt: '2025-01-20T14:30:00Z',
    isVerified: true
  }
};
```

### Staff Document Schema

```javascript
// /businesses/{businessId}/staff/{staffId}
const staffSchema = {
  staffId: 'staff_123',
  userId: 'user_456', // Links to /users/{userId}
  businessId: 'business_123',
  
  // Personal info
  name: 'Jane Smith',
  email: 'jane@acme.com',
  phone: '+1234567890',
  avatar: 'https://storage.url/avatar.jpg',
  
  // Role & Permissions
  role: 'manager', // 'owner' | 'admin' | 'manager' | 'staff' | 'cashier'
  permissions: {
    // Product management
    canViewProducts: true,
    canCreateProducts: true,
    canEditProducts: true,
    canDeleteProducts: false,
    
    // Order management
    canViewOrders: true,
    canCreateOrders: true,
    canEditOrders: true,
    canCancelOrders: false,
    canRefundOrders: false,
    
    // Customer management
    canViewCustomers: true,
    canEditCustomers: true,
    canDeleteCustomers: false,
    
    // Financial
    canViewReports: true,
    canViewFinances: false,
    canManageExpenses: false,
    
    // Staff management
    canViewStaff: true,
    canManageStaff: false,
    
    // POS access
    canAccessPOS: true,
    
    // Settings
    canEditSettings: false,
    canManageBilling: false
  },
  
  // Employment details
  employment: {
    status: 'active', // 'active' | 'inactive' | 'suspended'
    hireDate: '2024-06-01T00:00:00Z',
    terminationDate: null,
    position: 'Store Manager',
    location: 'Main Store'
  },
  
  // Metadata
  metadata: {
    invitedAt: '2024-05-25T00:00:00Z',
    invitedBy: 'user_123',
    joinedAt: '2024-06-01T00:00:00Z',
    lastLogin: '2025-01-20T09:00:00Z',
    createdAt: '2024-05-25T00:00:00Z'
  }
};
```

### User Document Schema

```javascript
// /users/{userId}
const userSchema = {
  userId: 'user_123',
  
  // Personal information
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  avatar: 'https://storage.url/avatar.jpg',
  
  // Authentication
  emailVerified: true,
  phoneVerified: false,
  authProvider: 'email', // 'email' | 'google' | 'facebook'
  
  // Multi-tenancy
  businesses: [
    {
      businessId: 'business_123',
      businessName: 'Acme Corp',
      role: 'owner',
      joinedAt: '2025-01-01T00:00:00Z'
    },
    {
      businessId: 'business_456',
      businessName: 'Other Business',
      role: 'staff',
      joinedAt: '2024-12-01T00:00:00Z'
    }
  ],
  
  // Current active business
  currentBusinessId: 'business_123',
  
  // Platform role (for super admins)
  platformRole: null, // null | 'super_admin' | 'support'
  
  // Preferences
  preferences: {
    language: 'en',
    timezone: 'America/New_York',
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  },
  
  // Metadata
  metadata: {
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    lastLogin: '2025-01-20T09:00:00Z',
    lastSeen: '2025-01-20T14:30:00Z'
  }
};
```

### Plan Schema

```javascript
// /plans/{planId}
const planSchema = {
  planId: 'plan_professional',
  name: 'Professional',
  displayName: 'Professional Plan',
  description: 'Perfect for growing businesses',
  
  // Pricing
  pricing: {
    monthly: 79,
    yearly: 790, // Save 17%
    currency: 'USD',
    trialDays: 14
  },
  
  // Feature access
  features: [
    'pos',
    'inventory',
    'analytics',
    'advanced_reports',
    'gamification',
    'loyalty',
    'product_reviews',
    'collections'
  ],
  
  // Limits
  limits: {
    maxStaff: 10,
    maxProducts: 1000,
    maxOrders: -1,
    maxStorage: 5,
    maxApiCalls: 10000,
    maxLocations: 3
  },
  
  // Display
  isPopular: true,
  order: 2,
  isActive: true,
  
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
};
```

### Feature Schema

```javascript
// /features/{featureId}
const featureSchema = {
  featureId: 'gamification',
  name: 'Gamification Hub',
  description: 'Engage customers with games and rewards',
  category: 'engagement', // 'core' | 'engagement' | 'analytics' | 'advanced'
  
  // Which plans include this feature
  availableInPlans: ['professional', 'enterprise'],
  
  // Can be enabled/disabled per business
  isConfigurable: true,
  
  // Display
  icon: '🎮',
  order: 14,
  isActive: true,
  
  metadata: {
    createdAt: '2024-01-01T00:00:00Z'
  }
};
```

### Audit Log Schema

```javascript
// /audit-logs/{logId}
const auditLogSchema = {
  logId: 'log_123',
  
  // Who performed the action
  actor: {
    userId: 'user_123',
    name: 'John Doe',
    email: 'john@acme.com',
    role: 'super_admin'
  },
  
  // What was done
  action: 'business.suspend', // 'business.create' | 'business.suspend' | 'staff.add' | etc.
  actionType: 'business_management', // 'business_management' | 'staff_management' | 'plan_management'
  
  // Target of the action
  target: {
    type: 'business',
    id: 'business_123',
    name: 'Acme Corp'
  },
  
  // Details of what changed
  changes: {
    before: { status: 'active' },
    after: { status: 'suspended', suspensionReason: 'Payment failed' }
  },
  
  // Context
  context: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    location: 'New York, USA'
  },
  
  // Result
  status: 'success', // 'success' | 'failed'
  errorMessage: null,
  
  timestamp: '2025-01-20T14:30:00Z'
};
```

### Invitation Schema

```javascript
// /invitations/{invitationId}
const invitationSchema = {
  invitationId: 'invite_123',
  businessId: 'business_123',
  businessName: 'Acme Corp',
  
  // Invitee information
  email: 'newstaff@example.com',
  name: 'New Staff Member',
  role: 'staff',
  permissions: {
    // Same structure as staff permissions
  },
  
  // Invitation details
  token: 'unique_secure_token_here',
  status: 'pending', // 'pending' | 'accepted' | 'expired' | 'revoked'
  expiresAt: '2025-02-01T00:00:00Z',
  
  // Who sent it
  invitedBy: {
    userId: 'user_123',
    name: 'John Doe',
    email: 'john@acme.com'
  },
  
  // Metadata
  sentAt: '2025-01-20T00:00:00Z',
  acceptedAt: null,
  revokedAt: null
};
```

---

## 2. ADMIN INTERFACE {#admin-interface}

### Enhanced Admin Page HTML

Create `/pages/admin-multi-tenant.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Tenant Admin - MADAS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <style>
        :root {
            --primary-color: #3B82F6;
            --success-color: #10B981;
            --warning-color: #F59E0B;
            --danger-color: #EF4444;
        }
        
        .tab-active {
            border-bottom: 3px solid var(--primary-color);
            color: var(--primary-color);
        }
        
        .plan-card {
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .plan-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.15);
        }
        
        .feature-badge {
            @apply px-3 py-1 rounded-full text-sm font-medium;
        }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="flex justify-between items-center">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900">Multi-Tenant Admin Panel</h1>
                    <p class="text-sm text-gray-500">Manage businesses, staff, and plans</p>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-sm text-gray-600">Super Admin</span>
                    <button class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Tabs Navigation -->
    <div class="bg-white border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav class="flex space-x-8">
                <button class="tab-button tab-active px-4 py-4 font-medium" data-tab="businesses">
                    <span class="material-icons text-sm align-middle">business</span>
                    Businesses
                </button>
                <button class="tab-button px-4 py-4 font-medium text-gray-500 hover:text-gray-700" data-tab="staff">
                    <span class="material-icons text-sm align-middle">people</span>
                    Staff Management
                </button>
                <button class="tab-button px-4 py-4 font-medium text-gray-500 hover:text-gray-700" data-tab="plans">
                    <span class="material-icons text-sm align-middle">layers</span>
                    Plans & Features
                </button>
                <button class="tab-button px-4 py-4 font-medium text-gray-500 hover:text-gray-700" data-tab="audit">
                    <span class="material-icons text-sm align-middle">history</span>
                    Audit Logs
                </button>
            </nav>
        </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <!-- Tab 1: Businesses -->
        <div id="tab-businesses" class="tab-content">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Total Businesses</p>
                            <p class="text-3xl font-bold text-gray-900">127</p>
                        </div>
                        <span class="material-icons text-blue-500 text-4xl">business</span>
                    </div>
                    <p class="text-green-500 text-sm mt-2">↑ 12% from last month</p>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Active</p>
                            <p class="text-3xl font-bold text-green-600">112</p>
                        </div>
                        <span class="material-icons text-green-500 text-4xl">check_circle</span>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Trial</p>
                            <p class="text-3xl font-bold text-orange-600">10</p>
                        </div>
                        <span class="material-icons text-orange-500 text-4xl">schedule</span>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Suspended</p>
                            <p class="text-3xl font-bold text-red-600">5</p>
                        </div>
                        <span class="material-icons text-red-500 text-4xl">block</span>
                    </div>
                </div>
            </div>

            <!-- Action Bar -->
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div class="flex-1">
                        <div class="relative">
                            <span class="material-icons absolute left-3 top-3 text-gray-400">search</span>
                            <input type="text" placeholder="Search businesses..." 
                                   class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <select class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">All Plans</option>
                            <option value="basic">Basic</option>
                            <option value="professional">Professional</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                        <select class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="trial">Trial</option>
                            <option value="suspended">Suspended</option>
                        </select>
                        <button class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2">
                            <span class="material-icons">add</span>
                            Add Business
                        </button>
                    </div>
                </div>
            </div>

            <!-- Businesses Table -->
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <!-- Sample Row -->
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0 h-10 w-10">
                                        <div class="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                            AC
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <div class="text-sm font-medium text-gray-900">Acme Corporation</div>
                                        <div class="text-sm text-gray-500">admin@acme.com</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Professional
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Active
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                5 / 10
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                Jan 15, 2025
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                Dec 31, 2025
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button class="text-blue-600 hover:text-blue-900 mr-3" title="Edit">
                                    <span class="material-icons text-sm">edit</span>
                                </button>
                                <button class="text-gray-600 hover:text-gray-900 mr-3" title="Manage Features">
                                    <span class="material-icons text-sm">tune</span>
                                </button>
                                <button class="text-orange-600 hover:text-orange-900 mr-3" title="Suspend">
                                    <span class="material-icons text-sm">pause_circle</span>
                                </button>
                                <button class="text-red-600 hover:text-red-900" title="Delete">
                                    <span class="material-icons text-sm">delete</span>
                                </button>
                            </td>
                        </tr>
                        <!-- More rows... -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Tab 2: Staff Management -->
        <div id="tab-staff" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow p-6 mb-6">
                <h3 class="text-lg font-medium mb-4">Select Business to Manage Staff</h3>
                <select id="business-selector" class="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="">Select a business...</option>
                    <option value="business_1">Acme Corporation</option>
                    <option value="business_2">Tech Solutions Inc</option>
                    <!-- Dynamic list -->
                </select>
            </div>

            <div id="staff-content" class="hidden">
                <!-- Staff management interface appears here when business is selected -->
            </div>
        </div>

        <!-- Tab 3: Plans & Features -->
        <div id="tab-plans" class="tab-content hidden">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <!-- Basic Plan Card -->
                <div class="plan-card bg-white rounded-lg shadow-lg overflow-hidden">
                    <div class="p-6 bg-gradient-to-br from-gray-50 to-gray-100">
                        <h3 class="text-2xl font-bold text-gray-900">Basic</h3>
                        <p class="text-gray-600 mt-2">Perfect for startups</p>
                        <div class="mt-4">
                            <span class="text-4xl font-bold text-gray-900">$29</span>
                            <span class="text-gray-600">/month</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <h4 class="font-semibold mb-4">Features:</h4>
                        <ul class="space-y-3">
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Up to 5 staff members
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                500 products
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Basic POS
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Inventory Management
                            </li>
                        </ul>
                        <button class="w-full mt-6 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
                            Edit Plan
                        </button>
                    </div>
                </div>

                <!-- Professional Plan Card -->
                <div class="plan-card bg-white rounded-lg shadow-lg overflow-hidden border-2 border-blue-500">
                    <div class="bg-blue-500 text-white text-center py-1 text-sm font-semibold">
                        MOST POPULAR
                    </div>
                    <div class="p-6 bg-gradient-to-br from-blue-50 to-blue-100">
                        <h3 class="text-2xl font-bold text-gray-900">Professional</h3>
                        <p class="text-gray-600 mt-2">For growing businesses</p>
                        <div class="mt-4">
                            <span class="text-4xl font-bold text-gray-900">$79</span>
                            <span class="text-gray-600">/month</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <h4 class="font-semibold mb-4">Everything in Basic, plus:</h4>
                        <ul class="space-y-3">
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Up to 10 staff members
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                1000 products
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Advanced Analytics
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Loyalty Program
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Gamification Hub
                            </li>
                        </ul>
                        <button class="w-full mt-6 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                            Edit Plan
                        </button>
                    </div>
                </div>

                <!-- Enterprise Plan Card -->
                <div class="plan-card bg-white rounded-lg shadow-lg overflow-hidden">
                    <div class="p-6 bg-gradient-to-br from-purple-50 to-purple-100">
                        <h3 class="text-2xl font-bold text-gray-900">Enterprise</h3>
                        <p class="text-gray-600 mt-2">For large operations</p>
                        <div class="mt-4">
                            <span class="text-4xl font-bold text-gray-900">$199</span>
                            <span class="text-gray-600">/month</span>
                        </div>
                    </div>
                    <div class="p-6">
                        <h4 class="font-semibold mb-4">Everything in Pro, plus:</h4>
                        <ul class="space-y-3">
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Unlimited staff
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Unlimited products
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Multi-location
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                API Access
                            </li>
                            <li class="flex items-center text-sm">
                                <span class="material-icons text-green-500 text-sm mr-2">check_circle</span>
                                Custom Domain
                            </li>
                        </ul>
                        <button class="w-full mt-6 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600">
                            Edit Plan
                        </button>
                    </div>
                </div>
            </div>

            <!-- Features Configuration -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-bold mb-6">Feature Configuration</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Feature Item -->
                    <div class="border rounded-lg p-4">
                        <div class="flex items-start justify-between">
                            <div>
                                <h4 class="font-semibold">🎮 Gamification Hub</h4>
                                <p class="text-sm text-gray-600 mt-1">Engage customers with games</p>
                                <div class="mt-2 flex gap-2">
                                    <span class="feature-badge bg-purple-100 text-purple-700">Pro</span>
                                    <span class="feature-badge bg-purple-100 text-purple-700">Enterprise</span>
                                </div>
                            </div>
                            <button class="text-gray-400 hover:text-gray-600">
                                <span class="material-icons">edit</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- More feature items... -->
                </div>
            </div>
        </div>

        <!-- Tab 4: Audit Logs -->
        <div id="tab-audit" class="tab-content hidden">
            <div class="bg-white rounded-lg shadow">
                <div class="p-6 border-b">
                    <h3 class="text-lg font-medium">Audit Logs</h3>
                </div>
                <div class="p-6">
                    <table class="min-w-full">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left py-3 px-4">Timestamp</th>
                                <th class="text-left py-3 px-4">Admin</th>
                                <th class="text-left py-3 px-4">Action</th>
                                <th class="text-left py-3 px-4">Target</th>
                                <th class="text-left py-3 px-4">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="border-b hover:bg-gray-50">
                                <td class="py-3 px-4 text-sm">2025-01-20 14:30</td>
                                <td class="py-3 px-4 text-sm">John Admin</td>
                                <td class="py-3 px-4">
                                    <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Business Suspended</span>
                                </td>
                                <td class="py-3 px-4 text-sm">Acme Corp</td>
                                <td class="py-3 px-4 text-sm text-gray-600">Reason: Payment failed</td>
                            </tr>
                            <!-- More log entries... -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    </main>

    <script>
        // Tab Switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Update button styles
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('tab-active', 'text-gray-900');
                    btn.classList.add('text-gray-500');
                });
                button.classList.add('tab-active', 'text-gray-900');
                button.classList.remove('text-gray-500');
                
                // Show/hide content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.add('hidden');
                });
                document.getElementById(`tab-${tabName}`).classList.remove('hidden');
            });
        });
        
        // Initialize Firebase and load data here
        // See implementation guide below
    </script>
</body>
</html>
```

---

## 3. AUTHENTICATION & AUTHORIZATION {#authentication}

### Firebase Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper Functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isSuperAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.platformRole == 'super_admin';
    }
    
    function hasBusinessAccess(businessId) {
      return isAuthenticated() && (
        isSuperAdmin() ||
        exists(/databases/$(database)/documents/businesses/$(businessId)/staff/$(request.auth.uid))
      );
    }
    
    function isBusinessOwner(businessId) {
      return isAuthenticated() && (
        isSuperAdmin() ||
        get(/databases/$(database)/documents/businesses/$(businessId)).data.owner.userId == request.auth.uid
      );
    }
    
    function hasPermission(businessId, permission) {
      let staff = get(/databases/$(database)/documents/businesses/$(businessId)/staff/$(request.auth.uid));
      return staff.data.permissions[permission] == true;
    }
    
    // Users Collection
    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isSuperAdmin());
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Businesses Collection
    match /businesses/{businessId} {
      allow read: if hasBusinessAccess(businessId);
      allow create: if isSuperAdmin();
      allow update: if isBusinessOwner(businessId) || isSuperAdmin();
      allow delete: if isSuperAdmin();
      
      // Staff Subcollection
      match /staff/{staffId} {
        allow read: if hasBusinessAccess(businessId);
        allow write: if isBusinessOwner(businessId) || isSuperAdmin();
      }
      
      // Products Subcollection
      match /products/{productId} {
        allow read: if hasBusinessAccess(businessId);
        allow create: if hasBusinessAccess(businessId) && hasPermission(businessId, 'canCreateProducts');
        allow update: if hasBusinessAccess(businessId) && hasPermission(businessId, 'canEditProducts');
        allow delete: if hasBusinessAccess(businessId) && hasPermission(businessId, 'canDeleteProducts');
      }
      
      // Orders Subcollection
      match /orders/{orderId} {
        allow read: if hasBusinessAccess(businessId);
        allow create: if hasBusinessAccess(businessId) && hasPermission(businessId, 'canCreateOrders');
        allow update: if hasBusinessAccess(businessId) && hasPermission(businessId, 'canEditOrders');
        allow delete: if hasBusinessAccess(businessId) && hasPermission(businessId, 'canCancelOrders');
      }
      
      // Customers Subcollection
      match /customers/{customerId} {
        allow read: if hasBusinessAccess(businessId);
        allow write: if hasBusinessAccess(businessId) && hasPermission(businessId, 'canEditCustomers');
      }
      
      // ... Similar rules for other subcollections
    }
    
    // Plans Collection (read-only for regular users)
    match /plans/{planId} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
    
    // Features Collection (read-only for regular users)
    match /features/{featureId} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
    
    // Audit Logs (super admin only)
    match /audit-logs/{logId} {
      allow read: if isSuperAdmin();
      allow create: if isSuperAdmin();
      allow update, delete: if false;
    }
    
    // Invitations
    match /invitations/{invitationId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isBusinessOwner(resource.data.businessId) || isSuperAdmin();
    }
  }
}
```

---

## 4. DATA ISOLATION MIDDLEWARE {#data-isolation}

### JavaScript/Node.js Middleware

```javascript
// middleware/tenantIsolation.js
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Middleware to ensure data isolation per business
 */
async function tenantIsolation(req, res, next) {
  try {
    // Get user from Firebase Auth token
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;
    
    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Check if super admin
    if (userData.platformRole === 'super_admin') {
      req.user = {
        userId,
        ...userData,
        isSuperAdmin: true,
        businessId: req.body.businessId || req.query.businessId || null
      };
      return next();
    }
    
    // Get current business ID (from request or user's current business)
    const businessId = req.body.businessId || req.query.businessId || userData.currentBusinessId;
    
    if (!businessId) {
      return res.status(400).json({ error: 'No business context provided' });
    }
    
    // Verify user has access to this business
    const staffDoc = await db
      .collection('businesses')
      .doc(businessId)
      .collection('staff')
      .doc(userId)
      .get();
    
    if (!staffDoc.exists) {
      return res.status(403).json({ error: 'Access denied to this business' });
    }
    
    const staffData = staffDoc.data();
    
    // Check if business is active
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const businessData = businessDoc.data();
    if (businessData.status !== 'active') {
      return res.status(403).json({ error: 'Business account is not active' });
    }
    
    // Add tenant context to request
    req.user = {
      userId,
      businessId,
      role: staffData.role,
      permissions: staffData.permissions,
      business: businessData
    };
    
    next();
  } catch (error) {
    console.error('Tenant isolation error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to check specific permissions
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (req.user.isSuperAdmin) {
      return next();
    }
    
    if (!req.user.permissions[permission]) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission 
      });
    }
    
    next();
  };
}

/**
 * Middleware to check plan features
 */
function requireFeature(feature) {
  return (req, res, next) => {
    if (req.user.isSuperAdmin) {
      return next();
    }
    
    if (!req.user.business.features[feature]) {
      return res.status(403).json({ 
        error: 'Feature not available in your plan',
        feature,
        upgrade: 'Please upgrade your plan to access this feature'
      });
    }
    
    next();
  };
}

module.exports = {
  tenantIsolation,
  requirePermission,
  requireFeature
};
```

---

## 5. API ENDPOINTS {#api-endpoints}

### Business Management Endpoints

```javascript
// routes/admin/businesses.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();
const { tenantIsolation } = require('../../middleware/tenantIsolation');
const { createAuditLog } = require('../../utils/auditLog');

// Middleware to ensure super admin access
function requireSuperAdmin(req, res, next) {
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
}

// Apply tenant isolation to all routes
router.use(tenantIsolation);

/**
 * GET /api/admin/businesses
 * List all businesses
 */
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const { plan, status, search, limit = 50, page = 1 } = req.query;
    
    let query = db.collection('businesses');
    
    // Apply filters
    if (plan) {
      query = query.where('plan.type', '==', plan);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Get total count
    const snapshot = await query.get();
    const total = snapshot.size;
    
    // Apply pagination
    const offset = (page - 1) * limit;
    const businesses = snapshot.docs
      .slice(offset, offset + limit)
      .map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Apply search filter (client-side)
    let filteredBusinesses = businesses;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredBusinesses = businesses.filter(b => 
        b.businessName.toLowerCase().includes(searchLower) ||
        b.contact.email.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({
      businesses: filteredBusinesses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

/**
 * POST /api/admin/businesses
 * Create a new business
 */
router.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const {
      businessName,
      email,
      phone,
      plan,
      ownerId,
      trialDays = 14
    } = req.body;
    
    // Validate input
    if (!businessName || !email || !plan || !ownerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get plan details
    const planDoc = await db.collection('plans').doc(`plan_${plan}`).get();
    if (!planDoc.exists) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    const planData = planDoc.data();
    
    // Get owner details
    const ownerDoc = await db.collection('users').doc(ownerId).get();
    if (!ownerDoc.exists) {
      return res.status(400).json({ error: 'Owner user not found' });
    }
    const ownerData = ownerDoc.data();
    
    // Create business
    const businessRef = db.collection('businesses').doc();
    const businessId = businessRef.id;
    
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    
    const businessData = {
      businessId,
      businessName,
      slug: businessName.toLowerCase().replace(/\s+/g, '-'),
      plan: {
        type: plan,
        status: 'trial',
        startDate: now,
        expiresAt,
        autoRenew: false,
        billingCycle: 'monthly'
      },
      contact: {
        email,
        phone: phone || '',
        website: ''
      },
      owner: {
        userId: ownerId,
        name: ownerData.name,
        email: ownerData.email
      },
      limits: planData.limits,
      usage: {
        staffCount: 1,
        productsCount: 0,
        ordersThisMonth: 0,
        storageUsed: 0,
        apiCallsThisMonth: 0,
        locationsCount: 0
      },
      features: {},
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        logo: null,
        primaryColor: '#3B82F6',
        taxRate: 0
      },
      status: 'active',
      suspensionReason: null,
      metadata: {
        createdAt: now,
        createdBy: req.user.userId,
        updatedAt: now,
        lastActivityAt: now,
        isVerified: false
      }
    };
    
    // Set features based on plan
    planData.features.forEach(feature => {
      businessData.features[feature] = true;
    });
    
    await businessRef.set(businessData);
    
    // Add owner as staff
    await businessRef.collection('staff').doc(ownerId).set({
      staffId: ownerId,
      userId: ownerId,
      businessId,
      name: ownerData.name,
      email: ownerData.email,
      phone: ownerData.phone || '',
      avatar: ownerData.avatar || null,
      role: 'owner',
      permissions: {
        canViewProducts: true,
        canCreateProducts: true,
        canEditProducts: true,
        canDeleteProducts: true,
        canViewOrders: true,
        canCreateOrders: true,
        canEditOrders: true,
        canCancelOrders: true,
        canRefundOrders: true,
        canViewCustomers: true,
        canEditCustomers: true,
        canDeleteCustomers: true,
        canViewReports: true,
        canViewFinances: true,
        canManageExpenses: true,
        canViewStaff: true,
        canManageStaff: true,
        canAccessPOS: true,
        canEditSettings: true,
        canManageBilling: true
      },
      employment: {
        status: 'active',
        hireDate: now,
        terminationDate: null,
        position: 'Owner',
        location: 'Main Office'
      },
      metadata: {
        invitedAt: now,
        invitedBy: req.user.userId,
        joinedAt: now,
        lastLogin: null,
        createdAt: now
      }
    });
    
    // Update user's businesses array
    await db.collection('users').doc(ownerId).update({
      businesses: admin.firestore.FieldValue.arrayUnion({
        businessId,
        businessName,
        role: 'owner',
        joinedAt: now
      }),
      currentBusinessId: businessId
    });
    
    // Create audit log
    await createAuditLog({
      actor: {
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        role: 'super_admin'
      },
      action: 'business.create',
      actionType: 'business_management',
      target: {
        type: 'business',
        id: businessId,
        name: businessName
      },
      changes: {
        before: null,
        after: { status: 'active', plan }
      },
      context: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      },
      status: 'success',
      errorMessage: null,
      timestamp: now
    });
    
    res.status(201).json({
      message: 'Business created successfully',
      business: { id: businessId, ...businessData }
    });
  } catch (error) {
    console.error('Error creating business:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
});

/**
 * PUT /api/admin/businesses/:businessId
 * Update a business
 */
router.put('/:businessId', requireSuperAdmin, async (req, res) => {
  try {
    const { businessId } = req.params;
    const updates = req.body;
    
    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const oldData = businessDoc.data();
    
    // Update business
    await businessRef.update({
      ...updates,
      'metadata.updatedAt': new Date().toISOString()
    });
    
    // Create audit log
    await createAuditLog({
      actor: {
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        role: 'super_admin'
      },
      action: 'business.update',
      actionType: 'business_management',
      target: {
        type: 'business',
        id: businessId,
        name: oldData.businessName
      },
      changes: {
        before: oldData,
        after: { ...oldData, ...updates }
      },
      context: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      },
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    res.json({ message: 'Business updated successfully' });
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

/**
 * POST /api/admin/businesses/:businessId/suspend
 * Suspend a business
 */
router.post('/:businessId/suspend', requireSuperAdmin, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { reason } = req.body;
    
    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const businessData = businessDoc.data();
    
    await businessRef.update({
      status: 'suspended',
      suspensionReason: reason || 'No reason provided',
      'metadata.updatedAt': new Date().toISOString()
    });
    
    // Create audit log
    await createAuditLog({
      actor: {
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        role: 'super_admin'
      },
      action: 'business.suspend',
      actionType: 'business_management',
      target: {
        type: 'business',
        id: businessId,
        name: businessData.businessName
      },
      changes: {
        before: { status: businessData.status },
        after: { status: 'suspended', suspensionReason: reason }
      },
      context: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      },
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    res.json({ message: 'Business suspended successfully' });
  } catch (error) {
    console.error('Error suspending business:', error);
    res.status(500).json({ error: 'Failed to suspend business' });
  }
});

/**
 * DELETE /api/admin/businesses/:businessId
 * Delete a business (soft delete)
 */
router.delete('/:businessId', requireSuperAdmin, async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const businessRef = db.collection('businesses').doc(businessId);
    const businessDoc = await businessRef.get();
    
    if (!businessDoc.exists) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const businessData = businessDoc.data();
    
    // Soft delete
    await businessRef.update({
      status: 'deleted',
      'metadata.updatedAt': new Date().toISOString(),
      'metadata.deletedAt': new Date().toISOString(),
      'metadata.deletedBy': req.user.userId
    });
    
    // Create audit log
    await createAuditLog({
      actor: {
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        role: 'super_admin'
      },
      action: 'business.delete',
      actionType: 'business_management',
      target: {
        type: 'business',
        id: businessId,
        name: businessData.businessName
      },
      changes: {
        before: { status: businessData.status },
        after: { status: 'deleted' }
      },
      context: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      },
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    res.json({ message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Error deleting business:', error);
    res.status(500).json({ error: 'Failed to delete business' });
  }
});

module.exports = router;
```

---

## 6. SECURITY IMPLEMENTATION {#security}

### Rate Limiting per Business

```javascript
// middleware/rateLimiting.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

/**
 * Rate limiting per business
 */
function businessRateLimit(maxRequests = 1000, windowMs = 60000) {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rate_limit:'
    }),
    max: async (req) => {
      // Super admins get unlimited requests
      if (req.user?.isSuperAdmin) {
        return 0; // 0 = unlimited
      }
      
      // Get business plan limits
      if (req.user?.business?.limits?.maxApiCalls) {
        return req.user.business.limits.maxApiCalls / 30 / 24; // Convert monthly to hourly
      }
      
      return maxRequests;
    },
    windowMs,
    keyGenerator: (req) => {
      // Rate limit per business
      return `business:${req.user?.businessId || 'anonymous'}`;
    },
    message: {
      error: 'Too many requests. Please upgrade your plan for higher limits.'
    }
  });
}

module.exports = { businessRateLimit };
```

### Audit Logging Utility

```javascript
// utils/auditLog.js
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Create an audit log entry
 */
async function createAuditLog(logData) {
  try {
    const logRef = db.collection('audit-logs').doc();
    await logRef.set({
      logId: logRef.id,
      ...logData
    });
    return logRef.id;
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
}

/**
 * Get audit logs with filters
 */
async function getAuditLogs(filters = {}, limit = 100) {
  try {
    let query = db.collection('audit-logs')
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    if (filters.actionType) {
      query = query.where('actionType', '==', filters.actionType);
    }
    
    if (filters.targetId) {
      query = query.where('target.id', '==', filters.targetId);
    }
    
    if (filters.actorId) {
      query = query.where('actor.userId', '==', filters.actorId);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}

module.exports = {
  createAuditLog,
  getAuditLogs
};
```

---

## 7. CODE EXAMPLES {#code-examples}

### Frontend: Business Selector Component

```javascript
// components/BusinessSelector.jsx
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

export function BusinessSelector() {
  const { user, updateCurrentBusiness } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, [user]);

  async function loadBusinesses() {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get businesses user has access to
      const businessIds = user.businesses.map(b => b.businessId);
      
      const businessPromises = businessIds.map(async (id) => {
        const businessDoc = await db.collection('businesses').doc(id).get();
        return { id, ...businessDoc.data() };
      });
      
      const businessesData = await Promise.all(businessPromises);
      setBusinesses(businessesData);
      
      // Set current business
      const current = businessesData.find(b => b.id === user.currentBusinessId);
      setCurrentBusiness(current);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleBusinessChange(businessId) {
    try {
      await updateCurrentBusiness(businessId);
      const selected = businesses.find(b => b.id === businessId);
      setCurrentBusiness(selected);
      
      // Reload page to refresh data for new business
      window.location.reload();
    } catch (error) {
      console.error('Error changing business:', error);
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (businesses.length === 1) {
    // Only one business, show name only
    return (
      <div className="px-4 py-2 bg-gray-100 rounded-lg">
        <p className="text-sm font-medium">{currentBusiness?.businessName}</p>
      </div>
    );
  }

  return (
    <select
      value={currentBusiness?.id || ''}
      onChange={(e) => handleBusinessChange(e.target.value)}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {businesses.map((business) => (
        <option key={business.id} value={business.id}>
          {business.businessName}
        </option>
      ))}
    </select>
  );
}
```

### Frontend: Feature Gate Component

```javascript
// components/FeatureGate.jsx
import { useAuth } from '@/hooks/useAuth';

export function FeatureGate({ feature, children, fallback = null }) {
  const { currentBusiness } = useAuth();

  if (!currentBusiness?.features?.[feature]) {
    return fallback || (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Feature Not Available
        </h3>
        <p className="text-yellow-700 mb-4">
          This feature is not included in your current plan.
        </p>
        <button className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600">
          Upgrade Plan
        </button>
      </div>
    );
  }

  return children;
}

// Usage:
// <FeatureGate feature="gamification">
//   <GamificationHub />
// </FeatureGate>
```

### Backend: Data Isolation Helper

```javascript
// utils/dataIsolation.js
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Get collection reference scoped to business
 */
function getBusinessCollection(businessId, collectionName) {
  return db.collection('businesses').doc(businessId).collection(collectionName);
}

/**
 * Get all documents from a business collection
 */
async function getBusinessDocuments(businessId, collectionName, filters = {}) {
  let query = getBusinessCollection(businessId, collectionName);
  
  // Apply filters
  Object.entries(filters).forEach(([field, value]) => {
    query = query.where(field, '==', value);
  });
  
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Create document in business collection
 */
async function createBusinessDocument(businessId, collectionName, data) {
  const ref = getBusinessCollection(businessId, collectionName).doc();
  
  await ref.set({
    ...data,
    businessId, // Ensure businessId is set
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  return ref.id;
}

/**
 * Update document in business collection
 */
async function updateBusinessDocument(businessId, collectionName, docId, updates) {
  await getBusinessCollection(businessId, collectionName)
    .doc(docId)
    .update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
}

/**
 * Delete document from business collection
 */
async function deleteBusinessDocument(businessId, collectionName, docId) {
  await getBusinessCollection(businessId, collectionName).doc(docId).delete();
}

module.exports = {
  getBusinessCollection,
  getBusinessDocuments,
  createBusinessDocument,
  updateBusinessDocument,
  deleteBusinessDocument
};
```

---

## 🚀 IMPLEMENTATION CHECKLIST

### Phase 1: Database Setup
- [ ] Create Firebase collections structure
- [ ] Set up security rules
- [ ] Create initial plan documents
- [ ] Create initial feature documents
- [ ] Test security rules

### Phase 2: Admin Interface
- [ ] Create enhanced admin page HTML
- [ ] Implement tab switching
- [ ] Build business management UI
- [ ] Build staff management UI
- [ ] Build plans configuration UI
- [ ] Build audit logs viewer

### Phase 3: Backend APIs
- [ ] Implement business CRUD endpoints
- [ ] Implement staff management endpoints
- [ ] Implement plan management endpoints
- [ ] Add audit logging to all admin actions
- [ ] Implement rate limiting

### Phase 4: Authentication & Middleware
- [ ] Create tenant isolation middleware
- [ ] Create permission checking middleware
- [ ] Create feature gate middleware
- [ ] Test all middleware functions

### Phase 5: Frontend Components
- [ ] Build business selector component
- [ ] Build feature gate component
- [ ] Update all pages to use business context
- [ ] Add permission checks to UI elements

### Phase 6: Testing
- [ ] Test data isolation between businesses
- [ ] Test permission system
- [ ] Test feature gates
- [ ] Test audit logging
- [ ] Security audit
- [ ] Performance testing

### Phase 7: Deployment
- [ ] Deploy Firebase security rules
- [ ] Deploy backend APIs
- [ ] Deploy frontend
- [ ] Configure monitoring
- [ ] Set up alerts

---

## 📞 SUPPORT

For questions or issues with implementation, refer to:
- Firebase Documentation: https://firebase.google.com/docs
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Express.js Middleware: https://expressjs.com/en/guide/using-middleware.html

---

**End of Multi-Tenancy Implementation Guide**

