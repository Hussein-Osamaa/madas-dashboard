// User and Authentication Types
export interface User {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
}

// Business Types
export interface Business {
  businessId: string;
  businessName: string;
  businessType: 'retail' | 'restaurant' | 'service' | 'ecommerce';
  storeType: 'physical' | 'online' | 'both';
  owner: {
    userId: string;
    email: string;
    name: string;
  };
  subscription: {
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'cancelled' | 'expired' | 'trial' | 'past_due';
    startDate: string;
    endDate: string;
    trialEndsAt: string | null;
    stripePriceId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
  };
  settings: {
    currency: string;
    timezone: string;
    taxRate: number;
    logo: string | null;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  limits: {
    maxProducts: number;
    maxUsers: number;
    maxOrders: number;
  };
  usage: {
    currentProducts: number;
    currentUsers: number;
    currentMonthOrders: number;
  };
  platformMetrics: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    avgOrderValue: number;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    lastActivityAt: string;
  };
}

// Product Types
export interface Product {
  productId: string;
  businessId: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  pricing: {
    cost: number;
    price: number;
    compareAtPrice: number | null;
    currency: string;
  };
  inventory: {
    trackInventory: boolean;
    quantity: number;
    lowStockAlert: number;
    stockLocations: Array<{
      location: string;
      quantity: number;
    }>;
  };
  category: string;
  tags: string[];
  images: string[];
  variants: Array<{
    variantId: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
  }>;
  status: 'active' | 'draft' | 'archived';
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  };
}

// Order Types
export interface Order {
  orderId: string;
  orderNumber: string;
  businessId: string;
  customer: {
    customerId: string;
    name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    sku: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  financials: {
    subtotal: number;
    tax: number;
    discount: number;
    shipping: number;
    total: number;
  };
  payment: {
    method: 'card' | 'cash' | 'online' | 'bank_transfer';
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    transactionId: string | null;
    paidAt: string | null;
  };
  fulfillment: {
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    type: 'pickup' | 'delivery' | 'shipping';
    address: string;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
  source: 'pos' | 'online' | 'manual' | 'app';
  location: string;
  notes: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  };
}

// Customer Types
export interface Customer {
  customerId: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate: string;
  };
  loyalty: {
    points: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    memberSince: string;
  };
  preferences: {
    marketingEmails: boolean;
    marketingSms: boolean;
  };
  tags: string[];
  notes: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

// Admin Types
export interface Admin {
  adminId: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'support';
  permissions: {
    canViewAllBusinesses: boolean;
    canModifySubscriptions: boolean;
    canAccessFinancials: boolean;
    canManageAdmins: boolean;
    canViewSupport: boolean;
  };
  metadata: {
    createdAt: string;
    lastLogin: string;
  };
}

// Platform Stats Types
export interface PlatformStats {
  statId: string;
  date: string;
  metrics: {
    totalBusinesses: number;
    activeBusinesses: number;
    trialBusinesses: number;
    cancelledBusinesses: number;
    newSignups: number;
    churnedBusinesses: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    totalRevenue: number;
    newRevenue: number;
    churnedRevenue: number;
  };
  subscriptionBreakdown: {
    starter: number;
    professional: number;
    enterprise: number;
  };
  usage: {
    totalOrders: number;
    totalProducts: number;
    totalRevenue: number;
    apiCalls: number;
  };
  growth: {
    signupRate: number;
    conversionRate: number;
    churnRate: number;
    avgRevenuePerUser: number;
    lifetimeValue: number;
  };
}

// Support Ticket Types
export interface SupportTicket {
  ticketId: string;
  businessId: string;
  userId: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'feature_request' | 'other';
  assignedTo: string | null;
  messages: Array<{
    messageId: string;
    senderId: string;
    senderType: 'client' | 'admin';
    message: string;
    timestamp: string;
    attachments?: string[];
  }>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
  };
}

// Newsletter Types
export interface NewsletterSubscriber {
  email: string;
  name?: string;
  subscribedAt: string;
  source: 'footer' | 'popup' | 'landing_page';
  isActive: boolean;
}

// Contact Submission Types
export interface ContactSubmission {
  submissionId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  metadata: {
    submittedAt: string;
    respondedAt?: string;
    notes?: string;
  };
}

