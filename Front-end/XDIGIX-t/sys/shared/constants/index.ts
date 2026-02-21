// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    price: 29,
    annualPrice: 290,
    features: [
      '1 user',
      '100 products',
      '500 orders/month',
      'Basic reporting',
      'Email support'
    ],
    limits: {
      maxProducts: 100,
      maxUsers: 1,
      maxOrders: 500
    }
  },
  professional: {
    name: 'Professional',
    price: 79,
    annualPrice: 790,
    features: [
      '5 users',
      '1,000 products',
      'Unlimited orders',
      'Advanced analytics',
      'Website builder',
      'Priority support'
    ],
    limits: {
      maxProducts: 1000,
      maxUsers: 5,
      maxOrders: -1 // unlimited
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    annualPrice: 1990,
    features: [
      'Unlimited users',
      'Unlimited products',
      'Unlimited orders',
      'API access',
      'Custom integrations',
      'Multi-location',
      'Dedicated support'
    ],
    limits: {
      maxProducts: -1, // unlimited
      maxUsers: -1, // unlimited
      maxOrders: -1 // unlimited
    }
  }
} as const;

// Business Types
export const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Store' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'service', label: 'Service Business' },
  { value: 'ecommerce', label: 'E-commerce' }
] as const;

// Store Types
export const STORE_TYPES = [
  { value: 'physical', label: 'Physical Store' },
  { value: 'online', label: 'Online Store' },
  { value: 'both', label: 'Both Physical & Online' }
] as const;

// Order Status
export const ORDER_STATUS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  card: 'Credit Card',
  cash: 'Cash',
  online: 'Online Payment',
  bank_transfer: 'Bank Transfer'
} as const;

// Product Status
export const PRODUCT_STATUS = {
  active: 'Active',
  draft: 'Draft',
  archived: 'Archived'
} as const;

// User Roles
export const USER_ROLES = {
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
  staff: 'Staff'
} as const;

// Admin Roles
export const ADMIN_ROLES = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  support: 'Support'
} as const;

// Support Ticket Priority
export const TICKET_PRIORITY = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
} as const;

// Support Ticket Status
export const TICKET_STATUS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed'
} as const;

// Support Ticket Category
export const TICKET_CATEGORY = {
  technical: 'Technical',
  billing: 'Billing',
  feature_request: 'Feature Request',
  other: 'Other'
} as const;

// Currencies
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
] as const;

// Timezones
export const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
] as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Marketing Website
  contact: '/api/contact',
  newsletter: '/api/newsletter',
  
  // Admin Dashboard
  admin: {
    stats: '/api/admin/stats',
    clients: '/api/admin/clients',
    subscriptions: '/api/admin/subscriptions',
    support: '/api/admin/support'
  },
  
  // Client App
  client: {
    products: '/api/products',
    orders: '/api/orders',
    customers: '/api/customers',
    staff: '/api/staff',
    finance: '/api/finance',
    reports: '/api/reports'
  }
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  websiteBuilder: 'website_builder',
  advancedAnalytics: 'advanced_analytics',
  apiAccess: 'api_access',
  multiLocation: 'multi_location',
  customIntegrations: 'custom_integrations'
} as const;

// Plan Features
export const PLAN_FEATURES = {
  starter: [
    'basic_dashboard',
    'product_management',
    'order_management',
    'customer_management',
    'basic_reports',
    'email_support'
  ],
  professional: [
    'basic_dashboard',
    'product_management',
    'order_management',
    'customer_management',
    'basic_reports',
    'email_support',
    'advanced_analytics',
    'website_builder',
    'priority_support',
    'staff_management'
  ],
  enterprise: [
    'basic_dashboard',
    'product_management',
    'order_management',
    'customer_management',
    'basic_reports',
    'email_support',
    'advanced_analytics',
    'website_builder',
    'priority_support',
    'staff_management',
    'api_access',
    'multi_location',
    'custom_integrations',
    'dedicated_support'
  ]
} as const;

