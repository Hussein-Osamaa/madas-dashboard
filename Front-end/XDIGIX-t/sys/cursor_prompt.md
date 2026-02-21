## FIREBASE DATABASE STRUCTURE (FIRESTORE)

### Collections & Subcollections:
```
/admins/{adminId}                                    # Platform administrators
/platform-stats/{statId}                             # Platform-wide statistics
/platform-events/{eventId}                           # Activity logs for admin dashboard
/users/{userId}                                      # End users (business owners)
/businesses/{businessId}                             # Client businesses
/businesses/{businessId}/products/{productId}
/businesses/{businessId}/orders/{orderId}
/businesses/{businessId}/customers/{customerId}
/businesses/{businessId}/staff/{staffId}
/businesses/{businessId}/transactions/{transactionId}
/businesses/{businessId}/expenses/{expenseId}
/subscriptions/{subscriptionId}                      # Subscription records
/support-tickets/{ticketId}                          # Support tickets
/newsletter-subscribers/{email}                       # Marketing newsletter
/contact-submissions/{submissionId}                   # Contact form submissions
```

### Key Schemas (JavaScript Objects):

#### Admin Document (Platform Owner):
```javascript
const adminSchema = {
  adminId: 'string',
  email: 'string',
  name: 'string',
  role: 'super_admin', // 'super_admin' | 'admin' | 'support'
  permissions: {
    canViewAllBusinesses: true,
    canModifySubscriptions: true,
    canAccessFinancials: true,
    canManageAdmins: true,
    canViewSupport: true
  },
  metadata: {
    createdAt: '2025-01-01T00:00:00Z',
    lastLogin: '2025-01-01T00:00:00Z'
  }
};
```

#### Platform Stats Document (For Admin Dashboard):
```javascript
const platformStatsSchema = {
  statId: 'string',
  date: '2025-01-01', // YYYY-MM-DD
  metrics: {
    totalBusinesses: 847,
    activeBusinesses: 792,
    trialBusinesses: 55,
    cancelledBusinesses: 124,
    newSignups: 45,
    churnedBusinesses: 12
  },
  revenue: {
    mrr: 42850, // Monthly Recurring Revenue
    arr: 514200, // Annual Recurring Revenue
    totalRevenue: 514200,
    newRevenue: 3000,
    churnedRevenue: 500
  },
  subscriptionBreakdown: {
    starter: 400,
    professional: 350,
    enterprise: 42
  },
  usage: {
    totalOrders: 125000,
    totalProducts: 45000,
    totalRevenue: 5000000, // Revenue processed through platform
    apiCalls: 250000
  },
  growth: {
    signupRate: 5.2,
    conversionRate: 22.5, // trial to paid
    churnRate: 3.2,
    avgRevenuePerUser: 54,
    lifetimeValue: 1500
  }
};
```

#### Platform Event Document (Activity Log):
```javascript
const platformEventSchema = {
  eventId: 'string',
  type: 'signup', // 'signup' | 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'payment_succeeded' | 'payment_failed' | 'business_created' | 'support_ticket' | 'user_login'
  businessId: 'optional-business-id',
  userId: 'optional-user-id',
  data: {}, // Event-specific data
  timestamp: '2025-01-01T12:00:00Z',
  severity: 'info' // 'info' | 'warning' | 'error' | 'success'
};
```

#### Business Document:
```javascript
const businessSchema = {
  businessId: 'string',
  businessName: 'Johns Coffee Shop',
  businessType: 'retail', // 'retail' | 'restaurant' | 'service' | 'ecommerce'
  storeType: 'physical', // 'physical' | 'online' | 'both'
  owner: {
    userId: 'user-id',
    email: 'owner@example.com',
    name: 'John Doe'
  },
  subscription: {
    plan: 'professional', // 'starter' | 'professional' | 'enterprise'
    status: 'active', // 'active' | 'cancelled' | 'expired' | 'trial' | 'past_due'
    startDate: '2025-01-01T00:00:00Z',
    endDate: '2025-02-01T00:00:00Z',
    trialEndsAt: null,
    stripePriceId: 'price_xxx',
    stripeSubscriptionId: 'sub_xxx',
    stripeCustomerId: 'cus_xxx'
  },
  settings: {
    currency: 'USD',
    timezone: 'America/New_York',
    taxRate: 8.5,
    logo: null,
    address: '123 Main St',
    phone: '+1234567890',
    email: 'contact@business.com',
    website: 'https://business.com'
  },
  limits: {
    maxProducts: 1000,
    maxUsers: 5,
    maxOrders: -1 // -1 means unlimited
  },
  usage: {
    currentProducts: 245,
    currentUsers: 3,
    currentMonthOrders: 1247
  },
  platformMetrics: {
    totalRevenue: 45678,
    totalOrders: 3456,
    totalCustomers: 567,
    avgOrderValue: 35.50
  },
  metadata: {
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    isActive: true,
    lastActivityAt: '2025-01-01T12:00:00Z'
  }
};
```

#### Product Document:
```javascript
const productSchema = {
  productId: 'string',
  businessId: 'parent-business-id',
  name: 'Espresso Coffee',
  description: 'Rich and bold espresso',
  sku: 'ESP-001',
  barcode: '1234567890123',
  pricing: {
    cost: 2.50,
    price: 5.00,
    compareAtPrice: 6.00, // original price for sale display
    currency: 'USD'
  },
  inventory: {
    trackInventory: true,
    quantity: 100,
    lowStockAlert: 10,
    stockLocations: [
      { location: 'Main Store', quantity: 60 },
      { location: 'Warehouse', quantity: 40 }
    ]
  },
  category: 'Beverages',
  tags: ['coffee', 'hot drinks', 'bestseller'],
  images: [
    'https://storage.url/product1.jpg',
    'https://storage.url/product2.jpg'
  ],
  variants: [
    {
      variantId: 'var-001',
      name: 'Small',
      sku: 'ESP-001-S',
      price: 5.00,
      quantity: 50
    },
    {
      variantId: 'var-002',
      name: 'Large',
      sku: 'ESP-001-L',
      price: 7.00,
      quantity: 50
    }
  ],
  status: 'active', // 'active' | 'draft' | 'archived'
  metadata: {
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: 'user-id'
  }
};
```

#### Order Document:
```javascript
const orderSchema = {
  orderId: 'string',
  orderNumber: 'ORD-2025-0001',
  businessId: 'parent-business-id',
  customer: {
    customerId: 'customer-id',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567890'
  },
  items: [
    {
      productId: 'product-id',
      productName: 'Espresso Coffee',
      variantId: 'var-001',
      variantName: 'Small',
      sku: 'ESP-001-S',
      quantity: 2,
      price: 5.00,
      subtotal: 10.00
    }
  ],
  financials: {
    subtotal: 10.00,
    tax: 0.85,
    discount: 0.00,
    shipping: 0.00,
    total: 10.85
  },
  payment: {
    method: 'card', // 'card' | 'cash' | 'online' | 'bank_transfer'
    status: 'paid', // 'pending' | 'paid' | 'failed' | 'refunded'
    transactionId: 'txn-123',
    paidAt: '2025-01-01T12:00:00Z'
  },
  fulfillment: {
    status: 'pending', // 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
    type: 'pickup', // 'pickup' | 'delivery' | 'shipping'
    address: '123 Customer St, City, State',
    trackingNumber: null,
    shippedAt: null,
    deliveredAt: null
  },
  source: 'pos', // 'pos' | 'online' | 'manual' | 'app'
  location: 'Main Store',
  notes: 'Customer requested extra hot',
  metadata: {
    createdAt: '2025-01-01T12:00:00Z',
    updatedAt: '2025-01-01T12:00:00Z',
    createdBy: 'user-id'
  }
};
```

#### Customer Document:
```javascript
const customerSchema = {
  customerId: 'string',
  businessId: 'parent-business-id',
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+1234567890',
  address: {
    street: '456 Customer Ave',
    city: 'City',
    state: 'State',
    zipCode: '12345',
    country: 'USA'
  },
  stats: {
    totalOrders: 15,
    totalSpent: 150.00,
    averageOrderValue: 10.00,
    lastOrderDate: '2025-01-01T00:00:00Z'
  },
  loyalty: {
    points: 150,
    tier: 'gold', // 'bronze' | 'silver' | 'gold' | 'platinum'
    memberSince: '2024-01-01T00:00:00Z'
  },
  preferences: {
    marketingEmails: true,
    marketingSms: false
  },
  tags: ['regular', 'vip'],
  notes: 'Prefers oat milk',
  metadata: {
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
};
```

#### Support Ticket:
```javascript
const supportTicketSchema = {
  ticketId: 'string',
  businessId: 'business-id',
  userId: 'user-id',
  subject: 'Payment issue',
  description: 'Cannot process credit cards',
  priority: 'high', // 'low' | 'medium' | 'high' | 'urgent'
  status: 'open', // 'open' | 'in_progress' | 'resolved' | 'closed'
  category: 'technical', // 'technical' | 'billing' | 'feature_request' | 'other'
  assignedTo: null, // Admin ID
  messages: [
    {
      messageId: 'msg-1',
      senderId: 'user-id',
      senderType: 'client', // 'client' | 'admin'
      message: 'I cannot process payments',
      timestamp: '2025-01-01T12:00:00Z',
      attachments: []
    }
  ],
  metadata: {
    createdAt: '2025-01-01T12:00:00Z',
    updatedAt: '2025-01-01T12:00:00Z',
    resolvedAt: null
  }
};
```

#### Newsletter Subscriber:
```javascript
const newsletterSubscriberSchema = {
  email: 'user@example.com',
  name: 'John Doe',
  subscribedAt: '2025-01-01T00:00:00Z',
  source: 'footer', // 'footer' | 'popup' | 'landing_page'
  isActive: true
};
```

#### Contact Submission:
```javascript
const contactSubmissionSchema = {
  submissionId: 'string',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  company: 'Acme Inc',
  message: 'Interested in your platform',
  status: 'new', // 'new' | 'contacted' | 'converted' | 'closed'
  metadata: {
    submittedAt: '2025-01-01T12:00:00Z',
    respondedAt: null,
    notes: ''
  }
};
```## CORE FEATURES TO BUILD

---

## 📱 APPLICATION 1: MARKETING WEBSITE (Public)
**Domain**: www.yoursaas.com

### Purpose:
Convert visitors into paying customers by showcasing your platform's value.

### 1. LANDING PAGE (HOME)

**Hero Section:**
- Compelling headline: "Everything Your Business Needs, All in One Place"
- Subheadline explaining the value proposition
- Animated product screenshot/demo
- Primary CTA: "Start Free Trial"
- Secondary CTA: "Watch Demo"
- Trust indicators: "Join 500+ businesses" with logos

**Features Section:**
- 6-8 key features with icons and descriptions:
  - 📊 Real-time Dashboard
  - 🛒 Point of Sale
  - 📦 Inventory Management
  - 💰 Financial Reports
  - 👥 Team Management
  - 🌐 Website Builder
  - 📱 Mobile Apps
  - 🔗 Integrations

**How It Works:**
- 3-step process with illustrations:
  1. Sign up in 2 minutes
  2. Set up your business
  3. Start selling immediately

**Pricing Section:**
- Three pricing tiers (Starter, Professional, Enterprise)
- Feature comparison table
- 14-day free trial badge
- Annual/Monthly toggle
- "Most Popular" badge on Professional

**Testimonials:**
- 3-6 customer stories with photos
- Company names and logos
- Specific results ("Increased sales by 40%")
- Video testimonials (optional)

**Stats Section:**
- Number of businesses using platform
- Total revenue processed
- Orders completed
- Customer satisfaction rate

**FAQ Section:**
- 8-10 common questions
- Expandable accordion design
- Topics: pricing, features, security, support, migration

**Final CTA:**
- Strong call-to-action
- "Ready to grow your business?"
- Large "Start Free Trial" button

**Footer:**
- Links: Product, Company, Resources, Legal
- Social media icons
- Newsletter signup
- Contact information

**Key Components:**
- `Hero.tsx` - Hero section with CTA
- `Features.tsx` - Feature grid
- `HowItWorks.tsx` - Step-by-step guide
- `Pricing.tsx` - Pricing cards
- `Testimonials.tsx` - Customer reviews
- `Stats.tsx` - Platform statistics
- `FAQ.tsx` - Accordion FAQ
- `FinalCTA.tsx` - Bottom CTA section
- `Footer.tsx` - Site footer
- `Navbar.tsx` - Sticky navigation

---

### 2. FEATURES PAGE
Detailed breakdown of all features with:
- Screenshots and demos
- Use cases for different business types
- Benefit-focused copy
- Integration showcase

**Key Components:**
- `FeatureDetail.tsx` - Individual feature showcases
- `UseCaseCard.tsx` - Business type examples
- `IntegrationGrid.tsx` - Partner integrations

---

### 3. PRICING PAGE
Comprehensive pricing information:
- Detailed feature comparison table
- FAQ about billing
- Custom quote form for Enterprise
- ROI calculator (optional)
- Money-back guarantee

**Key Components:**
- `PricingTable.tsx` - Full comparison table
- `PricingFAQ.tsx` - Billing questions
- `ROICalculator.tsx` - Show potential savings

---

### 4. ABOUT US PAGE
Build trust with:
- Company story
- Team members
- Mission and values
- Milestones and achievements

---

### 5. CONTACT PAGE
Multiple contact options:
- Contact form with validation
- Email address
- Phone number
- Office address with map
- Support hours
- Social media links

**Key Components:**
- `ContactForm.tsx` - Form with validation
- `ContactInfo.tsx` - Contact details
- `Map.tsx` - Office location

---

### 6. DOCUMENTATION/HELP CENTER
Knowledge base for users:
- Getting started guide
- Video tutorials
- Feature documentation
- API documentation (for Enterprise)
- FAQ
- Troubleshooting

**Key Components:**
- `DocSidebar.tsx` - Documentation navigation
- `DocContent.tsx` - Article content
- `DocSearch.tsx` - Search functionality

---

### 7. BLOG (Optional but Recommended)
Content marketing:
- Business tips
- Industry news
- Product updates
- Customer success stories
- SEO-optimized articles

**Key Components:**
- `BlogList.tsx` - Article grid
- `BlogPost.tsx` - Single article view
- `BlogSidebar.tsx` - Categories and recent posts

---

### 8. LOGIN/SIGNUP PAGES (For Clients)
Gateway to the platform:
- **Signup Form:**
  - Full name
  - Email
  - Password
  - Company name
  - Agree to terms
  - Google signup option
  - Redirects to onboarding wizard

- **Login Form:**
  - Email
  - Password
  - Remember me
  - Forgot password link
  - Google login option
  - Redirects to client dashboard

**Key Components:**
- `SignupForm.tsx` - Registration form
- `LoginForm.tsx` - Login form
- `SocialAuth.tsx` - Google OAuth buttons

---

### Marketing Website Design Principles:

**Visual Design:**
- Modern, clean, professional
- Use animations (Framer Motion)
- High-quality images and illustrations
- Consistent color scheme
- Mobile-first responsive design

**Performance:**
- Fast loading (< 2 seconds)
- Optimized images
- Lazy loading
- SEO optimized
- Google Analytics integrated

**Conversion Optimization:**
- Clear CTAs throughout
- Trust signals (testimonials, logos, stats)
- Multiple conversion points
- Exit-intent popup (optional)
- Chat widget for support

---

## 🎛️ APPLICATION 2: ADMIN DASHBOARD (Your Internal Tool)
**Domain**: admin.yoursaas.com

### Purpose:
Monitor platform health, manage clients, track revenue, and provide support.

### 1. ADMIN AUTHENTICATION

**Admin Login:**
- Separate from client login
- Email + Password
- Two-factor authentication (2FA) required
- IP whitelist (optional)
- Session timeout

**Admin Roles:**
- **Super Admin**: Full access to everything
- **Admin**: Can view and manage clients, no admin management
- **Support**: Can view tickets and client info only

**Key Components:**
- `AdminLogin.tsx` - Admin login form
- `TwoFactorAuth.tsx` - 2FA verification

---

### 2. ADMIN DASHBOARD (OVERVIEW)

**Top Metrics Cards:**
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Total     │ │   Active    │ │     MRR     │ │     ARR     │
│  Clients    │ │   Clients   │ │             │ │             │
│    847      │ │    792      │ │  $42,850    │ │  $514,200   │
│   ↑ 12%    │ │   ↑ 8%     │ │   ↑ 15%    │ │   ↑ 15%    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  New Trials │ │   Churn     │ │  Support    │ │   System    │
│ This Month  │ │    Rate     │ │  Tickets    │ │   Uptime    │
│     124     │ │    3.2%     │ │     18      │ │   99.97%    │
│   ↑ 23%    │ │   ↓ 0.5%   │ │   ↓ 4      │ │   ✓ Good    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

**Revenue Chart:**
- Line chart showing MRR over time (last 12 months)
- Compare current vs previous period
- Revenue by plan type (stacked bar chart)
- Forecast projection

**Subscription Breakdown:**
- Pie chart: Starter vs Professional vs Enterprise
- Conversion funnel: Visitors → Trials → Paid
- Churn reasons breakdown

**Recent Activity Feed:**
- Real-time updates of platform events
- New signups
- Subscription changes
- Payment events
- Support tickets
- System alerts

**Quick Actions:**
- View all clients
- Review support tickets
- Check failed payments
- Generate reports
- Send platform announcement

**Key Components:**
- `AdminDashboard.tsx` - Main dashboard
- `MetricCard.tsx` - Stat display cards
- `RevenueChart.tsx` - Revenue visualization
- `ActivityFeed.tsx` - Live activity stream
- `SubscriptionPieChart.tsx` - Plan distribution

---

### 3. CLIENTS MANAGEMENT

**Clients List View:**
```
┌──────────────────────────────────────────────────────────────┐
│  Search: [________]  Filter: [All ▼]  Export: [CSV] [Excel]  │
├──────────────────────────────────────────────────────────────┤
│ Business Name    │ Owner      │ Plan    │ Status  │ Actions │
├──────────────────────────────────────────────────────────────┤
│ Joe's Coffee     │ Joe Smith  │ Pro     │ Active  │ [View]  │
│ Fashion Boutique │ Jane Doe   │ Starter │ Trial   │ [View]  │
│ Tech Store       │ Bob Wilson │ Enter.  │ Active  │ [View]  │
└──────────────────────────────────────────────────────────────┘
```

**Filters:**
- All / Active / Trial / Cancelled / Past Due
- By plan type
- By signup date
- By revenue
- By activity level

**Client Detail View:**
When clicking on a client:

**Business Information:**
- Business name, type, store type
- Owner info (name, email, phone)
- Signup date
- Last activity
- Website URL

**Subscription Details:**
- Current plan
- Status
- Billing cycle
- Next billing date
- Payment method
- Subscription history
- Upgrade/downgrade options

**Usage Metrics:**
- Products: 245 / 1000
- Orders this month: 1,247
- Staff members: 3 / 5
- Revenue processed: $34,567
- Last 30 days activity graph

**Financial Summary:**
- Total paid to date
- Average monthly payment
- Lifetime value
- Payment history table

**Platform Activity:**
- Login history
- Feature usage
- API calls (if Enterprise)
- Error logs

**Admin Actions:**
- 📧 Email client
- 💬 View support tickets
- 🔄 Manage subscription (upgrade/downgrade/cancel)
- ⚠️ Suspend account
- 🗑️ Delete account (with confirmation)
- 📝 Add internal notes
- 🎁 Apply discount/coupon
- 🔑 Impersonate (login as client for support)

**Key Components:**
- `ClientsList.tsx` - Main clients table
- `ClientFilters.tsx` - Filter controls
- `ClientDetail.tsx` - Detailed client view
- `SubscriptionManager.tsx` - Subscription controls
- `UsageMetrics.tsx` - Usage visualization
- `ClientActions.tsx` - Admin action buttons

---

### 4. SUBSCRIPTIONS MANAGEMENT

**Subscriptions Overview:**
- All active subscriptions
- Upcoming renewals
- Failed payments (needs attention)
- Cancelled subscriptions
- Trial ending soon

**Subscription Filters:**
- By status
- By plan
- By payment method
- By renewal date

**Subscription Detail View:**
- Client information
- Plan details
- Billing history
- Payment method
- Next billing date
- Proration details
- Cancel/refund options

**Actions:**
- Change plan
- Update billing date
- Apply discount
- Pause subscription
- Cancel subscription
- Issue refund
- Retry failed payment

**Key Components:**
- `SubscriptionsList.tsx` - All subscriptions
- `SubscriptionDetail.tsx` - Single subscription view
- `BillingHistory.tsx` - Payment history table
- `SubscriptionActions.tsx` - Admin controls

---

### 5. REVENUE & ANALYTICS

**Financial Dashboard:**

**Revenue Metrics:**
- Total Revenue (all time)
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Average Revenue Per User (ARPU)
- Revenue growth rate
- Revenue by plan type
- Revenue by payment method

**Revenue Charts:**
- Monthly revenue trend (line chart)
- Revenue by plan (stacked area chart)
- New vs existing customer revenue
- Revenue forecast
- Churn impact on revenue

**Payment Analytics:**
- Successful payments
- Failed payments (with retry status)
- Refunds issued
- Average payment amount
- Payment method distribution

**Financial Reports:**
- Exportable reports (PDF, Excel)
- Custom date ranges
- Comparison periods
- Scheduled email reports

**Key Components:**
- `RevenueAnalytics.tsx` - Financial dashboard
- `RevenueChart.tsx` - Revenue visualizations
- `PaymentAnalytics.tsx` - Payment data
- `FinancialReports.tsx` - Report generator

---

### 6. PLATFORM ANALYTICS

**User Metrics:**
- Total users
- Active users (DAU, WAU, MAU)
- New signups per day/week/month
- Signup sources (direct, referral, ads)
- Geographic distribution
- User growth rate

**Engagement Metrics:**
- Feature usage statistics
- Most/least used features
- Average session duration
- Login frequency
- Mobile vs desktop usage

**Conversion Metrics:**
- Visitor to trial conversion
- Trial to paid conversion
- Upgrade rate (starter → pro → enterprise)
- Conversion funnel visualization
- Drop-off points

**Platform Usage:**
- Total orders processed
- Total revenue handled by platform
- Total products managed
- Total customers in system
- API calls (for Enterprise clients)
- Storage usage

**Growth Analysis:**
- Month-over-month growth
- Cohort analysis
- Retention rates
- Customer lifetime value (LTV)
- Customer acquisition cost (CAC)
- LTV/CAC ratio

**Key Components:**
- `PlatformAnalytics.tsx` - Analytics dashboard
- `UserMetrics.tsx` - User statistics
- `EngagementCharts.tsx` - Usage visualizations
- `ConversionFunnel.tsx` - Conversion tracking
- `CohortAnalysis.tsx` - Retention analysis

---

### 7. SUPPORT TICKETS MANAGEMENT

**Ticket List View:**
```
┌────────────────────────────────────────────────────────────────┐
│ Filter: [All ▼] Priority: [All ▼] Status: [Open ▼]            │
├────────────────────────────────────────────────────────────────┤
│ #ID  │ Business      │ Subject           │ Priority │ Status  │
├────────────────────────────────────────────────────────────────┤
│ 1234 │ Joe's Coffee  │ Payment issue     │ High     │ Open    │
│ 1233 │ Tech Store    │ Feature request   │ Medium   │ Progress│
│ 1232 │ Boutique      │ How to export data│ Low      │ Resolved│
└────────────────────────────────────────────────────────────────┘
```

**Ticket Detail View:**
- Ticket information (ID, date, priority, status)
- Client details (with link to client page)
- Conversation thread
- Attachments
- Internal notes (not visible to client)
- Assign to team member
- Change status/priority
- Mark as resolved

**Ticket Actions:**
- Reply to ticket
- Add internal note
- Change priority
- Assign to team member
- Escalate
- Merge tickets
- Close ticket

**Ticket Statistics:**
- Open tickets count
- Average response time
- Average resolution time
- Tickets by priority
- Tickets by category
- Customer satisfaction rating

**Auto-responses:**
- Acknowledge ticket received
- Status change notifications
- Resolution confirmation

**Key Components:**
- `TicketList.tsx` - Support ticket table
- `TicketDetail.tsx` - Ticket conversation view
- `TicketReply.tsx` - Reply form
- `TicketAssignment.tsx` - Team assignment
- `TicketStats.tsx` - Support metrics

---

### 8. MARKETING & LEADS

**Newsletter Subscribers:**
- Total subscribers
- List growth rate
- Subscriber sources
- Email campaign management
- Export subscriber list

**Contact Form Submissions:**
- All contact requests
- Status tracking (new, contacted, converted)
- Response management
- Conversion tracking

**Lead Management:**
- Sales pipeline
- Lead scoring
- Follow-up reminders
- Conversion rate

**Email Campaigns:**
- Send newsletters
- Product announcements
- Feature updates
- Promotional emails
- Campaign analytics (open rate, click rate)

**Key Components:**
- `NewsletterList.tsx` - Subscriber management
- `ContactSubmissions.tsx` - Contact form leads
- `EmailCampaign.tsx` - Campaign creator
- `CampaignAnalytics.tsx` - Email metrics

---

### 9. PLATFORM SETTINGS

**General Settings:**
- Platform name and branding
- Contact information
- Timezone and localization
- Default currency
- Terms of service
- Privacy policy

**Pricing Configuration:**
- Edit plan pricing
- Add/remove features per plan
- Plan limits configuration
- Promotional pricing
- Coupon codes management

**Payment Settings:**
- Stripe configuration
- Payment methods accepted
- Invoice settings
- Tax configuration
- Refund policies

**Email Settings:**
- SMTP configuration
- Email templates
  - Welcome email
  - Trial ending
  - Payment received
  - Payment failed
  - Subscription cancelled
  - Password reset
  - Support ticket updates
- Email branding

**Integrations:**
- Stripe API keys
- SendGrid API
- Google Analytics
- Tracking scripts
- Webhooks configuration

**Admin Management:**
- Add/remove admins
- Role assignment
- Permission management
- Admin activity logs

**System Maintenance:**
- Scheduled maintenance mode
- Platform announcements
- Feature flags (enable/disable features)
- Database backups
- Error logs

**Key Components:**
- `PlatformSettings.tsx` - Settings layout
- `PricingConfig.tsx` - Plan configuration
- `EmailTemplates.tsx` - Email management
- `IntegrationSettings.tsx` - API configurations
- `AdminManagement.tsx` - Admin users
- `SystemMaintenance.tsx` - System controls

---

### 10. REPORTS & EXPORTS

**Available Reports:**
- Financial report (revenue, payments, refunds)
- Client report (signups, activity, churn)
- Subscription report (plans, changes, cancellations)
- Support report (tickets, response times, satisfaction)
- Usage report (features, API calls, storage)
- Growth report (metrics over time)

**Report Features:**
- Custom date ranges
- Multiple export formats (PDF, Excel, CSV)
- Schedule automated reports (daily, weekly, monthly)
- Email delivery
- Chart and graph visualizations

**Key Components:**
- `ReportGenerator.tsx` - Report builder
- `ReportScheduler.tsx` - Automated reports
- `ReportExport.tsx` - Export functionality

---

### 11. ACTIVITY LOGS

**Platform Events Tracking:**
- User signups
- Subscription changes
- Payment events (success/failure)
- Login attempts
- Admin actions
- System errors
- API calls
- Feature usage

**Log Filters:**
- By event type
- By date range
- By business
- By severity
- Search functionality

**Event Details:**
- Timestamp
- Event type
- User/Business involved
- IP address
- User agent
- Event data
- Outcome

**Key Components:**
- `ActivityLogs.tsx` - Event log viewer
- `LogFilters.tsx` - Filter controls
- `LogDetail.tsx` - Event details modal

---

### 12. NOTIFICATIONS & ALERTS

**Alert System:**
- Failed payments
- Subscription cancellations
- High-priority support tickets
- System errors
- Security alerts
- Unusual activity
- Trial ending reminders

**Notification Settings:**
- Email notifications
- In-app notifications
- Slack integration (optional)
- Notification preferences per admin

**Key Components:**
- `NotificationCenter.tsx` - Alert inbox
- `NotificationSettings.tsx` - Preferences

---

## 🖥️ APPLICATION 3: CLIENT APP (Main Product)
This is the business management system that your clients use daily.

### 1. AUTHENTICATION SYSTEM
- Email/password signup and login
- Google OAuth login
- Password reset functionality
- Protected routes based on authentication
- Multi-tenancy: Users can belong to multiple businesses

**Key Components:**
- `LoginForm.tsx` - Login interface
- `SignupForm.tsx` - Registration with business creation
- `ForgotPassword.tsx` - Password reset
- `ProtectedRoute.tsx` - Route guard component

### 2. BUSINESS ONBOARDING WIZARD
Multi-step wizard after signup:
- Step 1: Business details (name, type, address)
- Step 2: Plan selection (with 14-day free trial)
- Step 3: Initial setup (currency, timezone, tax rate)
- Step 4: Quick tour

**Key Components:**
- `OnboardingWizard.tsx` - Main wizard container
- `BusinessDetailsStep.tsx`
- `PlanSelectionStep.tsx`
- `InitialSetupStep.tsx`

### 3. MAIN DASHBOARD
Overview page showing:
- Today's sales, orders, revenue
- Sales graph (last 7/30 days)
- Low stock alerts
- Recent orders
- Quick actions (Add Product, Process Order, etc.)
- Real-time updates using Firestore listeners

**Key Components:**
- `Dashboard.tsx` - Main container
- `SalesOverview.tsx` - Sales cards and stats
- `SalesChart.tsx` - Line/bar chart
- `LowStockAlert.tsx` - Inventory alerts widget
- `RecentOrders.tsx` - Order list widget

### 4. PRODUCT MANAGEMENT
Full CRUD operations for products:
- Product list with search, filter, sort
- Add/edit product modal
- Bulk import from CSV
- Product categories
- Inventory tracking
- Variant support
- Image upload

**Key Components:**
- `ProductList.tsx` - Main product table
- `ProductForm.tsx` - Add/edit form
- `ProductCard.tsx` - Product display card
- `BulkImport.tsx` - CSV import interface
- `InventoryAdjustment.tsx` - Stock adjustment modal

**Key Functions:**
- `createProduct()` - Add new product
- `updateProduct()` - Edit product
- `deleteProduct()` - Remove product
- `updateStock()` - Adjust inventory
- `getProducts()` - Fetch with filters
- `searchProducts()` - Search by name/SKU

### 5. POINT OF SALE (POS) INTERFACE
Clean, touch-friendly POS for in-store sales:
- Product grid or search
- Shopping cart
- Customer selection
- Payment processing
- Receipt printing
- Offline mode support

**Key Components:**
- `POSInterface.tsx` - Main POS screen
- `ProductGrid.tsx` - Product selection
- `POSCart.tsx` - Cart display
- `PaymentModal.tsx` - Payment processing
- `ReceiptPrint.tsx` - Receipt template

**Features:**
- Barcode scanning support
- Quick product search
- Multiple payment methods
- Split payments
- Discounts and tax calculation
- Print or email receipt

### 6. ORDER MANAGEMENT
View and manage all orders:
- Order list with filters (status, date, payment)
- Order detail view
- Status updates (pending → processing → shipped → delivered)
- Order editing and refunds
- Bulk actions

**Key Components:**
- `OrderList.tsx` - Order table
- `OrderDetail.tsx` - Single order view
- `OrderStatusBadge.tsx` - Status display
- `OrderTimeline.tsx` - Order history timeline
- `RefundModal.tsx` - Process refunds

### 7. CUSTOMER MANAGEMENT (CRM)
Customer database and engagement:
- Customer list
- Customer profiles with purchase history
- Total spent, order count
- Loyalty points
- Tags and notes
- Email/SMS marketing

**Key Components:**
- `CustomerList.tsx`
- `CustomerProfile.tsx`
- `CustomerForm.tsx`
- `PurchaseHistory.tsx`
- `LoyaltyCard.tsx`

### 8. INVENTORY MANAGEMENT
Track and manage stock:
- Stock levels
- Low stock alerts
- Stock adjustments
- Stock take/audit
- Multi-location inventory
- Stock movement history

**Key Components:**
- `InventoryList.tsx`
- `StockAdjustment.tsx`
- `StockTake.tsx`
- `StockHistory.tsx`
- `LowStockAlerts.tsx`

### 9. STAFF MANAGEMENT
Manage team members:
- Staff list
- Invite new staff
- Role and permission assignment
- Schedule management
- Time tracking
- Performance metrics

**Key Components:**
- `StaffList.tsx`
- `StaffForm.tsx`
- `StaffInvite.tsx`
- `PermissionsEditor.tsx`
- `ScheduleCalendar.tsx`

### 10. FINANCIAL MANAGEMENT
Track income and expenses:
- Daily sales summary
- Expense tracking
- Profit & loss report
- Payment method breakdown
- Transaction history
- Tax reporting

**Key Components:**
- `FinanceDashboard.tsx`
- `ExpenseForm.tsx`
- `ProfitLossReport.tsx`
- `TransactionList.tsx`
- `SalesByPaymentMethod.tsx`

### 11. REPORTS & ANALYTICS
Business insights:
- Sales reports (daily, weekly, monthly, yearly)
- Product performance
- Customer analytics
- Staff performance
- Financial summaries
- Export to PDF/Excel

**Key Components:**
- `ReportsPage.tsx`
- `SalesReport.tsx`
- `ProductPerformance.tsx`
- `CustomerAnalytics.tsx`
- `ReportExport.tsx`

### 12. WEBSITE BUILDER (ONLINE STORE)
Drag-and-drop website builder:
- Template selection
- Page editor
- Product catalog integration
- Custom domain support
- SEO settings
- Mobile responsive preview

**Key Components:**
- `WebsiteBuilder.tsx`
- `TemplateSelector.tsx`
- `PageEditor.tsx`
- `ComponentLibrary.tsx`
- `StyleEditor.tsx`
- `PublishModal.tsx`

### 13. SETTINGS
Business configuration:
- Business profile
- Store settings
- Tax configuration
- Payment methods
- Notifications
- Integrations
- Subscription management

**Key Components:**
- `SettingsLayout.tsx`
- `BusinessProfile.tsx`
- `StoreSettings.tsx`
- `TaxSettings.tsx`
- `NotificationSettings.tsx`
- `IntegrationSettings.tsx`
- `SubscriptionManagement.tsx`# CURSOR AI PROMPT - MULTI-TENANT BUSINESS MANAGEMENT SAAS

## PROJECT OVERVIEW
You are building a subscription-based SaaS platform that provides comprehensive business management tools for small to medium businesses. This is a multi-tenant system where multiple businesses subscribe and manage their operations independently.

**IMPORTANT**: This project has TWO separate applications:
1. **Marketing Website** - Public site where clients discover and subscribe to your platform
2. **Platform Admin Dashboard** - Your internal dashboard to monitor all clients, subscriptions, revenue, and system health
3. **Client App** - The actual business management system that clients use

## TECH STACK
- **Frontend**: React 18+ with JavaScript (No TypeScript) + Next.js 14
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Firebase (Firestore, Auth, Storage, Cloud Functions)
- **State Management**: Zustand or React Context
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Payments**: Stripe for subscriptions
- **Date**: date-fns
- **Icons**: Lucide React
- **Animations**: Framer Motion (for marketing site)
- **Email**: SendGrid or Resend for transactional emails

## WHY NEXT.JS IS BETTER FOR THIS PROJECT

### Advantages:
✅ **SEO Built-in** - Marketing website gets automatic SEO optimization
✅ **Server Components** - Better performance, smaller bundles
✅ **API Routes** - Handle webhooks and server logic easily
✅ **Image Optimization** - Automatic image optimization
✅ **File-based Routing** - No manual router configuration
✅ **Static Generation** - Marketing pages load instantly
✅ **Middleware** - Easy authentication checks
✅ **Production Ready** - Vercel optimized deployment
✅ **Better DX** - Hot reload, fast refresh, great dev experience

### Perfect for SaaS:
- Marketing site: Static generation for speed
- Admin dashboard: Server-side rendering for security
- Client app: Client-side + API routes for backend logic
- All in one framework, deploy to Vercel with zero config

## WHY NO TYPESCRIPT

### Using JavaScript Instead:
✅ **Faster Development** - No type definitions needed
✅ **Simpler Code** - Less boilerplate
✅ **Easier Debugging** - Console.log just works
✅ **Better for MVP** - Ship faster, iterate faster
✅ **Still Safe** - JSDoc comments + good naming = clear code
✅ **No Build Issues** - No type errors blocking development

### Good Practices Without TypeScript:
```javascript
// Use JSDoc for documentation
/**
 * Create a new product
 * @param {string} businessId - The business ID
 * @param {Object} productData - Product information
 * @param {string} productData.name - Product name
 * @param {number} productData.price - Product price
 * @returns {Promise<Object>} Created product
 */
async function createProduct(businessId, productData) {
  // Implementation
}

// Use PropTypes for React components (optional)
import PropTypes from 'prop-types';

function ProductCard({ name, price, image }) {
  return (
    <div>
      <img src={image} alt={name} />
      <h3>{name}</h3>
      <p>${price}</p>
    </div>
  );
}

ProductCard.propTypes = {
  name: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  image: PropTypes.string.isRequired,
};
```

## PROJECT STRUCTURE (Next.js 14 App Router)
```
/
├── marketing-website/         # PUBLIC MARKETING SITE
│   ├── app/
│   │   ├── (marketing)/      # Marketing routes group
│   │   │   ├── page.js       # Home page (/)
│   │   │   ├── features/
│   │   │   │   └── page.js   # Features page
│   │   │   ├── pricing/
│   │   │   │   └── page.js   # Pricing page
│   │   │   ├── about/
│   │   │   │   └── page.js   # About page
│   │   │   ├── contact/
│   │   │   │   └── page.js   # Contact page
│   │   │   ├── blog/
│   │   │   │   ├── page.js   # Blog list
│   │   │   │   └── [slug]/
│   │   │   │       └── page.js # Blog post
│   │   │   └── layout.js     # Marketing layout
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.js   # Client login
│   │   │   ├── signup/
│   │   │   │   └── page.js   # Client signup
│   │   │   └── layout.js     # Auth layout
│   │   ├── api/              # API routes
│   │   │   ├── contact/
│   │   │   │   └── route.js  # Contact form handler
│   │   │   ├── newsletter/
│   │   │   │   └── route.js  # Newsletter signup
│   │   │   └── webhooks/
│   │   │       └── stripe/
│   │   │           └── route.js # Stripe webhooks
│   │   ├── layout.js         # Root layout
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── marketing/        # Marketing components
│   │   │   ├── Hero.jsx
│   │   │   ├── Features.jsx
│   │   │   ├── Pricing.jsx
│   │   │   ├── Testimonials.jsx
│   │   │   ├── FAQ.jsx
│   │   │   └── Footer.jsx
│   │   └── forms/
│   │       ├── ContactForm.jsx
│   │       └── NewsletterForm.jsx
│   ├── lib/
│   │   ├── firebase.js       # Firebase config
│   │   └── utils.js          # Utility functions
│   ├── public/               # Static assets
│   ├── next.config.js
│   └── package.json
│
├── admin-dashboard/           # YOUR ADMIN DASHBOARD
│   ├── app/
│   │   ├── (dashboard)/      # Dashboard routes
│   │   │   ├── page.js       # Overview
│   │   │   ├── clients/
│   │   │   │   ├── page.js   # Client list
│   │   │   │   └── [id]/
│   │   │   │       └── page.js # Client detail
│   │   │   ├── subscriptions/
│   │   │   │   └── page.js
│   │   │   ├── revenue/
│   │   │   │   └── page.js
│   │   │   ├── analytics/
│   │   │   │   └── page.js
│   │   │   ├── support/
│   │   │   │   ├── page.js
│   │   │   │   └── [id]/
│   │   │   │       └── page.js
│   │   │   ├── settings/
│   │   │   │   └── page.js
│   │   │   └── layout.js     # Dashboard layout
│   │   ├── login/
│   │   │   └── page.js       # Admin login
│   │   ├── api/
│   │   │   └── admin/        # Admin API routes
│   │   ├── middleware.js     # Auth middleware
│   │   ├── layout.js
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── admin/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── StatsCard.jsx
│   │   │   ├── RevenueChart.jsx
│   │   │   └── ClientsList.jsx
│   │   └── auth/
│   │       └── AdminGuard.jsx
│   ├── lib/
│   │   ├── firebase.js
│   │   ├── services/
│   │   │   └── admin.js
│   │   └── hooks/
│   ├── next.config.js
│   └── package.json
│
├── client-app/                # CLIENT BUSINESS MANAGEMENT SYSTEM
│   ├── app/
│   │   ├── (app)/            # Main app routes
│   │   │   ├── dashboard/
│   │   │   │   └── page.js
│   │   │   ├── products/
│   │   │   │   ├── page.js
│   │   │   │   ├── new/
│   │   │   │   │   └── page.js
│   │   │   │   └── [id]/
│   │   │   │       └── page.js
│   │   │   ├── pos/
│   │   │   │   └── page.js
│   │   │   ├── orders/
│   │   │   │   ├── page.js
│   │   │   │   └── [id]/
│   │   │   │       └── page.js
│   │   │   ├── customers/
│   │   │   │   ├── page.js
│   │   │   │   └── [id]/
│   │   │   │       └── page.js
│   │   │   ├── staff/
│   │   │   │   └── page.js
│   │   │   ├── finance/
│   │   │   │   └── page.js
│   │   │   ├── reports/
│   │   │   │   └── page.js
│   │   │   ├── website-builder/
│   │   │   │   └── page.js
│   │   │   ├── settings/
│   │   │   │   └── page.js
│   │   │   └── layout.js     # App layout
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.js
│   │   │   ├── signup/
│   │   │   │   └── page.js
│   │   │   └── layout.js
│   │   ├── (onboarding)/
│   │   │   └── setup/
│   │   │       └── page.js   # Business setup wizard
│   │   ├── api/
│   │   │   ├── products/
│   │   │   │   └── route.js
│   │   │   ├── orders/
│   │   │   │   └── route.js
│   │   │   └── subscription/
│   │   │       └── route.js
│   │   ├── middleware.js     # Auth + subscription check
│   │   ├── layout.js
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   └── BusinessSelector.jsx
│   │   ├── dashboard/
│   │   │   ├── SalesOverview.jsx
│   │   │   ├── SalesChart.jsx
│   │   │   └── RecentOrders.jsx
│   │   ├── products/
│   │   │   ├── ProductList.jsx
│   │   │   ├── ProductForm.jsx
│   │   │   └── ProductCard.jsx
│   │   ├── pos/
│   │   │   ├── POSInterface.jsx
│   │   │   ├── ProductGrid.jsx
│   │   │   └── POSCart.jsx
│   │   ├── orders/
│   │   │   ├── OrderList.jsx
│   │   │   └── OrderDetail.jsx
│   │   └── auth/
│   │       └── ProtectedRoute.jsx
│   ├── lib/
│   │   ├── firebase.js
│   │   ├── services/
│   │   │   ├── products.js
│   │   │   ├── orders.js
│   │   │   ├── customers.js
│   │   │   └── business.js
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useBusiness.js
│   │   │   └── useProducts.js
│   │   └── store/
│   │       ├── authStore.js
│   │       ├── businessStore.js
│   │       └── cartStore.js
│   ├── next.config.js
│   └── package.json
│
└── shared/                    # SHARED CODE (optional)
    ├── components/            # Shared components
    ├── utils/                 # Shared utilities
    └── constants.js           # Shared constants
```

## FIREBASE DATABASE STRUCTURE (FIRESTORE)

### Collections & Subcollections:
```
/admins/{adminId}                                    # Platform administrators
/platform-stats/{statId}                             # Platform-wide statistics
/platform-events/{eventId}                           # Activity logs for admin dashboard
/users/{userId}                                      # End users (business owners)
/businesses/{businessId}                             # Client businesses
/businesses/{businessId}/products/{productId}
/businesses/{businessId}/orders/{orderId}
/businesses/{businessId}/customers/{customerId}
/businesses/{businessId}/staff/{staffId}
/businesses/{businessId}/transactions/{transactionId}
/businesses/{businessId}/expenses/{expenseId}
/subscriptions/{subscriptionId}                      # Subscription records
/support-tickets/{ticketId}                          # Support tickets
/newsletter-subscribers/{email}                       # Marketing newsletter
/contact-submissions/{submissionId}                   # Contact form submissions
```

### Key Schemas:

#### Admin Document (Platform Owner):
```typescript
interface Admin {
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
```

#### Platform Stats Document (For Admin Dashboard):
```typescript
interface PlatformStats {
  statId: string;
  date: string; // YYYY-MM-DD
  metrics: {
    totalBusinesses: number;
    activeBusinesses: number;
    trialBusinesses: number;
    cancelledBusinesses: number;
    newSignups: number;
    churnedBusinesses: number;
  };
  revenue: {
    mrr: number; // Monthly Recurring Revenue
    arr: number; // Annual Recurring Revenue
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
    totalRevenue: number; // Revenue processed through platform
    apiCalls: number;
  };
  growth: {
    signupRate: number;
    conversionRate: number; // trial to paid
    churnRate: number;
    avgRevenuePerUser: number;
    lifetimeValue: number;
  };
}
```

#### Platform Event Document (Activity Log):
```typescript
interface PlatformEvent {
  eventId: string;
  type: 'signup' | 'subscription_created' | 'subscription_updated' | 
        'subscription_cancelled' | 'payment_succeeded' | 'payment_failed' |
        'business_created' | 'support_ticket' | 'user_login';
  businessId?: string;
  userId?: string;
  data: any; // Event-specific data
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}
```

#### Business Document:
```typescript
interface Business {
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
    totalRevenue: number; // Total processed through their business
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
```

#### Support Ticket:
```typescript
interface SupportTicket {
  ticketId: string;
  businessId: string;
  userId: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'feature_request' | 'other';
  assignedTo: string | null; // Admin ID
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
```

#### Newsletter Subscriber:
```typescript
interface NewsletterSubscriber {
  email: string;
  name?: string;
  subscribedAt: string;
  source: 'footer' | 'popup' | 'landing_page';
  isActive: boolean;
}
```

#### Contact Submission:
```typescript
interface ContactSubmission {
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
```

#### Product Document:
```typescript
interface Product {
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
```

#### Order Document:
```typescript
interface Order {
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
```

## USER ROLES & PERMISSIONS

### Role Types:
1. **owner** - Full access to everything
2. **manager** - Can manage products, orders, staff, view reports
3. **cashier** - Can use POS, process orders
4. **staff** - Limited access to specific features

### Permission System:
```typescript
interface Permissions {
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageStaff: boolean;
  canViewReports: boolean;
  canManageFinance: boolean;
  canAccessPOS: boolean;
}
```

## CORE FEATURES TO BUILD

### 1. AUTHENTICATION SYSTEM
- Email/password signup and login
- Google OAuth login
- Password reset functionality
- Protected routes based on authentication
- Multi-tenancy: Users can belong to multiple businesses

**Key Components:**
- `LoginForm.tsx` - Login interface
- `SignupForm.tsx` - Registration with business creation
- `ForgotPassword.tsx` - Password reset
- `ProtectedRoute.tsx` - Route guard component

### 2. BUSINESS ONBOARDING WIZARD
Multi-step wizard after signup:
- Step 1: Business details (name, type, address)
- Step 2: Plan selection (with 14-day free trial)
- Step 3: Initial setup (currency, timezone, tax rate)
- Step 4: Quick tour

**Key Components:**
- `OnboardingWizard.tsx` - Main wizard container
- `BusinessDetailsStep.tsx`
- `PlanSelectionStep.tsx`
- `InitialSetupStep.tsx`

### 3. MAIN DASHBOARD
Overview page showing:
- Today's sales, orders, revenue
- Sales graph (last 7/30 days)
- Low stock alerts
- Recent orders
- Quick actions (Add Product, Process Order, etc.)
- Real-time updates using Firestore listeners

**Key Components:**
- `Dashboard.tsx` - Main container
- `SalesOverview.tsx` - Sales cards and stats
- `SalesChart.tsx` - Line/bar chart
- `LowStockAlert.tsx` - Inventory alerts widget
- `RecentOrders.tsx` - Order list widget

### 4. PRODUCT MANAGEMENT
Full CRUD operations for products:
- Product list with search, filter, sort
- Add/edit product modal
- Bulk import from CSV
- Product categories
- Inventory tracking
- Variant support
- Image upload

**Key Components:**
- `ProductList.tsx` - Main product table
- `ProductForm.tsx` - Add/edit form
- `ProductCard.tsx` - Product display card
- `BulkImport.tsx` - CSV import interface
- `InventoryAdjustment.tsx` - Stock adjustment modal

**Key Functions:**
- `createProduct()` - Add new product
- `updateProduct()` - Edit product
- `deleteProduct()` - Remove product
- `updateStock()` - Adjust inventory
- `getProducts()` - Fetch with filters
- `searchProducts()` - Search by name/SKU

### 5. POINT OF SALE (POS) INTERFACE
Clean, touch-friendly POS for in-store sales:
- Product grid or search
- Shopping cart
- Customer selection
- Payment processing
- Receipt printing
- Offline mode support

**Key Components:**
- `POSInterface.tsx` - Main POS screen
- `ProductGrid.tsx` - Product selection
- `POSCart.tsx` - Cart display
- `PaymentModal.tsx` - Payment processing
- `ReceiptPrint.tsx` - Receipt template

**Features:**
- Barcode scanning support
- Quick product search
- Multiple payment methods
- Split payments
- Discounts and tax calculation
- Print or email receipt

### 6. ORDER MANAGEMENT
View and manage all orders:
- Order list with filters (status, date, payment)
- Order detail view
- Status updates (pending → processing → shipped → delivered)
- Order editing and refunds
- Bulk actions

**Key Components:**
- `OrderList.tsx` - Order table
- `OrderDetail.tsx` - Single order view
- `OrderStatusBadge.tsx` - Status display
- `OrderTimeline.tsx` - Order history timeline
- `RefundModal.tsx` - Process refunds

### 7. CUSTOMER MANAGEMENT (CRM)
Customer database and engagement:
- Customer list
- Customer profiles with purchase history
- Total spent, order count
- Loyalty points
- Tags and notes
- Email/SMS marketing

**Key Components:**
- `CustomerList.tsx`
- `CustomerProfile.tsx`
- `CustomerForm.tsx`
- `PurchaseHistory.tsx`
- `LoyaltyCard.tsx`

### 8. INVENTORY MANAGEMENT
Track and manage stock:
- Stock levels
- Low stock alerts
- Stock adjustments
- Stock take/audit
- Multi-location inventory
- Stock movement history

**Key Components:**
- `InventoryList.tsx`
- `StockAdjustment.tsx`
- `StockTake.tsx`
- `StockHistory.tsx`
- `LowStockAlerts.tsx`

### 9. STAFF MANAGEMENT
Manage team members:
- Staff list
- Invite new staff
- Role and permission assignment
- Schedule management
- Time tracking
- Performance metrics

**Key Components:**
- `StaffList.tsx`
- `StaffForm.tsx`
- `StaffInvite.tsx`
- `PermissionsEditor.tsx`
- `ScheduleCalendar.tsx`

### 10. FINANCIAL MANAGEMENT
Track income and expenses:
- Daily sales summary
- Expense tracking
- Profit & loss report
- Payment method breakdown
- Transaction history
- Tax reporting

**Key Components:**
- `FinanceDashboard.tsx`
- `ExpenseForm.tsx`
- `ProfitLossReport.tsx`
- `TransactionList.tsx`
- `SalesByPaymentMethod.tsx`

### 11. REPORTS & ANALYTICS
Business insights:
- Sales reports (daily, weekly, monthly, yearly)
- Product performance
- Customer analytics
- Staff performance
- Financial summaries
- Export to PDF/Excel

**Key Components:**
- `ReportsPage.tsx`
- `SalesReport.tsx`
- `ProductPerformance.tsx`
- `CustomerAnalytics.tsx`
- `ReportExport.tsx`

### 12. WEBSITE BUILDER (ONLINE STORE)
Drag-and-drop website builder:
- Template selection
- Page editor
- Product catalog integration
- Custom domain support
- SEO settings
- Mobile responsive preview

**Key Components:**
- `WebsiteBuilder.tsx`
- `TemplateSelector.tsx`
- `PageEditor.tsx`
- `ComponentLibrary.tsx`
- `StyleEditor.tsx`
- `PublishModal.tsx`

### 13. SETTINGS
Business configuration:
- Business profile
- Store settings
- Tax configuration
- Payment methods
- Notifications
- Integrations
- Subscription management

**Key Components:**
- `SettingsLayout.tsx`
- `BusinessProfile.tsx`
- `StoreSettings.tsx`
- `TaxSettings.tsx`
- `NotificationSettings.tsx`
- `IntegrationSettings.tsx`
- `SubscriptionManagement.tsx`

## DESIGN GUIDELINES

### UI/UX Principles:
1. **Clean and Modern**: Use Tailwind + shadcn/ui for consistent design
2. **Mobile-First**: Responsive on all devices
3. **Fast Loading**: Optimize images, lazy load components
4. **Accessibility**: Proper ARIA labels, keyboard navigation
5. **Real-time Updates**: Use Firestore listeners for live data
6. **Error Handling**: Clear error messages and loading states
7. **Empty States**: Helpful guidance when no data exists

### Color Scheme:
```css
Primary: Blue (#3B82F6)
Success: Green (#10B981)
Warning: Yellow (#F59E0B)
Danger: Red (#EF4444)
Background: White/Gray (#F9FAFB)
Text: Gray (#111827)
```

### Typography:
- Headings: Font weight 600-700
- Body: Font weight 400
- Small text: text-sm or text-xs
- Use consistent spacing (p-4, p-6, etc.)

## CODING STANDARDS

### TypeScript Best Practices:
1. Use strict mode
2. Define interfaces for all data structures
3. Avoid `any` type
4. Use proper null checks
5. Leverage type inference where appropriate

### React Best Practices:
1. Use functional components with hooks
2. Extract reusable logic into custom hooks
3. Keep components small and focused
4. Use React.memo for expensive components
5. Proper error boundaries
6. Loading and error states for all async operations

### Firebase Best Practices:
1. Use compound queries for filtering
2. Implement pagination for large lists
3. Use real-time listeners sparingly
4. Batch writes when possible
5. Proper security rules (included below)
6. Index complex queries
7. Handle offline scenarios

### State Management:
1. Use Zustand for global state (user, business, cart)
2. Use React Context for theme, layout
3. Use local state for component-specific data
4. Avoid prop drilling

## SECURITY RULES (FIRESTORE)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function hasBusinessAccess(businessId) {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/businesses/$(businessId)/staff/$(request.auth.uid));
    }
    
    function isBusinessOwner(businessId) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/businesses/$(businessId)).data.owner.userId == request.auth.uid;
    }
    
    match /users/{userId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    match /businesses/{businessId} {
      allow read: if hasBusinessAccess(businessId);
      allow write: if isBusinessOwner(businessId);
      
      match /products/{productId} {
        allow read: if hasBusinessAccess(businessId);
        allow write: if hasBusinessAccess(businessId);
      }
      
      match /orders/{orderId} {
        allow read: if hasBusinessAccess(businessId);
        allow write: if hasBusinessAccess(businessId);
      }
      
      match /customers/{customerId} {
        allow read: if hasBusinessAccess(businessId);
        allow write: if hasBusinessAccess(businessId);
      }
      
      match /staff/{staffId} {
        allow read: if hasBusinessAccess(businessId);
        allow write: if isBusinessOwner(businessId);
      }
      
      match /transactions/{transactionId} {
        allow read: if hasBusinessAccess(businessId);
        allow write: if hasBusinessAccess(businessId);
      }
      
      match /expenses/{expenseId} {
        allow read: if hasBusinessAccess(businessId);
        allow write: if hasBusinessAccess(businessId);
      }
    }
    
    match /subscriptions/{subscriptionId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow write: if false;
    }
  }
}
```

## ENVIRONMENT VARIABLES (.env)

```env
# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret

# App
VITE_APP_URL=http://localhost:5173
VITE_API_URL=your_api_url
```

## DEPLOYMENT CHECKLIST

### Before Production:
- [ ] Set up Firebase project
- [ ] Configure authentication methods
- [ ] Deploy Firestore security rules
- [ ] Set up Stripe account and products
- [ ] Configure environment variables
- [ ] Set up custom domain
- [ ] Enable Firebase hosting or deploy to Vercel
- [ ] Set up error monitoring (Sentry)
- [ ] Configure analytics (Google Analytics)
- [ ] Test all user flows
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Create backup strategy

## DEVELOPMENT WORKFLOW

### Phase 1: Marketing Website (Week 1-2)
**Priority: Get traffic and signups**

1. ✅ Set up project structure
2. ✅ Design system (Tailwind + shadcn/ui)
3. ✅ Landing page (Hero, Features, Pricing, Testimonials, FAQ)
4. ✅ Features page
5. ✅ Pricing page
6. ✅ Contact page
7. ✅ About page
8. ✅ Documentation/Help Center
9. ✅ Client signup/login pages
10. ✅ SEO optimization
11. ✅ Deploy to production (Vercel/Netlify)

**Deliverables:**
- Beautiful, conversion-optimized marketing website
- Clear value proposition
- Strong CTAs throughout
- Mobile responsive
- Fast loading (< 2s)
- SEO ready

---

### Phase 2: Admin Dashboard Foundation (Week 3-4)
**Priority: Monitor your business**

1. ✅ Set up separate admin project
2. ✅ Admin authentication system
3. ✅ Admin dashboard overview
4. ✅ Client list and detail views
5. ✅ Subscription management
6. ✅ Basic revenue tracking
7. ✅ Activity logs
8. ✅ Deploy admin dashboard (separate subdomain)

**Deliverables:**
- Secure admin authentication
- Real-time platform metrics
- Client management interface
- Basic financial tracking

---

### Phase 3: Client App - Core MVP (Week 5-8)
**Priority: Deliver value to paying customers**

1. ✅ Client authentication (signup/login)
2. ✅ Business onboarding wizard
3. ✅ Main dashboard with widgets
4. ✅ Product management (CRUD)
5. ✅ Basic POS interface
6. ✅ Order management
7. ✅ Inventory tracking
8. ✅ Customer management
9. ✅ Basic reports
10. ✅ Settings page
11. ✅ Stripe subscription integration

**Deliverables:**
- Working business management system
- Core features operational
- Payment processing
- Multi-tenant architecture working

---

### Phase 4: Advanced Features (Week 9-12)
**Priority: Differentiate from competitors**

1. ✅ Staff management
2. ✅ Financial reports (P&L, etc.)
3. ✅ Advanced analytics
4. ✅ Email notifications
5. ✅ Mobile responsiveness polish
6. ✅ Performance optimization
7. ✅ Website builder (basic version)

**Deliverables:**
- Complete feature set
- Professional polish
- Fast and reliable
- Ready for marketing

---

### Phase 5: Admin Dashboard - Advanced (Week 13-14)
**Priority: Scale your business**

1. ✅ Advanced analytics
2. ✅ Support ticket system
3. ✅ Marketing tools (newsletter, campaigns)
4. ✅ Report generation
5. ✅ Platform settings
6. ✅ Alert system

**Deliverables:**
- Complete admin control panel
- Support infrastructure
- Marketing automation
- Business intelligence

---

### Phase 6: Polish & Launch (Week 15-16)
**Priority: Go to market**

1. ✅ Bug fixes and testing
2. ✅ Performance optimization
3. ✅ Security audit
4. ✅ Documentation
5. ✅ Beta testing with first customers
6. ✅ Marketing campaigns
7. ✅ Official launch 🎉

**Deliverables:**
- Production-ready platform
- All three apps deployed
- Marketing ready
- Support infrastructure

---

## DEPLOYMENT STRATEGY

### Three Separate Deployments:

**1. Marketing Website**
- Domain: `www.yoursaas.com`
- Host: Vercel or Netlify
- CDN: Built-in
- SSL: Automatic

**2. Admin Dashboard**
- Domain: `admin.yoursaas.com`
- Host: Vercel or Netlify (separate project)
- Authentication: Firebase Auth with admin role check
- IP whitelist (optional)
- SSL: Automatic

**3. Client App**
- Domain: `app.yoursaas.com`
- Host: Vercel or Netlify (separate project)
- Multi-tenant routing
- SSL: Automatic

### Firebase Setup:
- Single Firebase project for all apps
- Separate authentication contexts
- Shared Firestore database
- Firestore security rules enforce access control
- Cloud Functions for backend logic

### Environment Variables:
Each app has its own `.env`:

**Marketing Website:**
```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_APP_URL=https://app.yoursaas.com
VITE_ADMIN_URL=https://admin.yoursaas.com
VITE_STRIPE_PUBLISHABLE_KEY=xxx
VITE_GA_TRACKING_ID=xxx
```

**Admin Dashboard:**
```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_ADMIN_SECRET=xxx
VITE_STRIPE_PUBLISHABLE_KEY=xxx
```

**Client App:**
```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_STRIPE_PUBLISHABLE_KEY=xxx
VITE_MARKETING_URL=https://www.yoursaas.com
```

---

## STRIPE INTEGRATION

### Products to Create in Stripe:

**1. Starter Plan**
- Price: $29/month or $290/year (save 17%)
- Features: 1 user, 100 products, 500 orders/month

**2. Professional Plan**
- Price: $79/month or $790/year (save 17%)
- Features: 5 users, 1000 products, unlimited orders

**3. Enterprise Plan**
- Price: $199/month or $1990/year (save 17%)
- Features: Unlimited everything

### Stripe Webhooks to Handle:
```
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
customer.created
customer.updated
```

### Subscription Flow:
1. User selects plan on marketing site
2. Redirects to signup page with plan parameter
3. User creates account (14-day free trial starts)
4. At trial end, Stripe attempts first payment
5. If successful → subscription active
6. If failed → retry 3 times, then suspend account
7. Send emails at each step

---

## CLOUD FUNCTIONS (Backend Logic)

### Required Cloud Functions:

**1. onUserCreate** (Trigger: Auth)
```javascript
// When user signs up
- Create user document in Firestore
- Send welcome email
- Log signup event
```

**2. onBusinessCreate** (Trigger: Firestore)
```javascript
// When business is created
- Initialize business collections
- Add owner as staff
- Create trial subscription
- Update platform stats
- Log event
```

**3. handleStripeWebhook** (HTTP)
```javascript
// Handle all Stripe events
- Update subscription status
- Handle payment success/failure
- Send notification emails
- Log financial events
```

**4. calculatePlatformStats** (Scheduled: Daily)
```javascript
// Run every midnight
- Calculate MRR, ARR
- Count active/trial/cancelled businesses
- Calculate churn rate
- Update platform-stats collection
```

**5. sendTrialEndingReminders** (Scheduled: Daily)
```javascript
// Run every morning
- Find trials ending in 7, 3, 1 days
- Send reminder emails
- Log events
```

**6. handleFailedPayments** (Scheduled: Daily)
```javascript
// Retry failed payments
- Find past_due subscriptions
- Retry payment (up to 3 times)
- Suspend if all retries fail
- Send emails
```

**7. generateInvoice** (HTTP)
```javascript
// Generate PDF invoice
- Fetch subscription data
- Create PDF
- Email to customer
```

**8. exportBusinessData** (HTTP)
```javascript
// Export all business data
- Fetch all collections
- Create CSV/JSON
- Upload to Storage
- Send download link
```

---

## EMAIL TEMPLATES

### Automated Emails to Send:

**For Clients:**
1. Welcome email (on signup)
2. Trial ending soon (7, 3, 1 days before)
3. Trial ended (upgrade prompt)
4. Payment successful (with invoice)
5. Payment failed (with retry info)
6. Subscription cancelled (survey)
7. Password reset
8. Support ticket updates
9. Monthly summary report
10. Feature announcements

**For Platform Admin:**
1. New signup notification
2. Subscription cancelled
3. Payment failed alert
4. High-priority support ticket
5. System error alert
6. Daily/weekly revenue summary

---

## MONITORING & ANALYTICS

### Track These Metrics:

**Marketing Website:**
- Page views
- Unique visitors
- Signup conversions
- Traffic sources
- Bounce rate
- Time on site

**Client App:**
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Feature usage
- Session duration
- Error rate
- Page load times

**Admin Dashboard:**
- MRR and ARR
- Churn rate
- Customer Lifetime Value
- Customer Acquisition Cost
- Trial conversion rate
- Revenue per user

### Tools:
- Google Analytics (marketing site)
- Firebase Analytics (client app)
- Sentry (error tracking)
- LogRocket (session replay)
- Stripe Dashboard (financial)

---

## TESTING STRATEGY

### Unit Tests:
- Test utility functions
- Test custom hooks
- Test services (business logic)
- Use Vitest

### Integration Tests:
- Test Firebase operations
- Test form submissions
- Test authentication flow
- Use React Testing Library

### E2E Tests:
- Test complete user flows
- Marketing site → Signup → Onboarding → First Order
- Use Playwright or Cypress

### Test Coverage Goals:
- 80%+ for critical paths
- 60%+ overall
- 100% for payment/subscription logic

---

## MARKETING WEBSITE SPECIFIC GUIDELINES

### SEO Optimization:

**Meta Tags for Every Page:**
```html
<title>Your SaaS - All-in-One Business Management</title>
<meta name="description" content="Run your entire business from one dashboard. POS, inventory, orders, and more.">
<meta property="og:title" content="Your SaaS">
<meta property="og:description" content="...">
<meta property="og:image" content="/og-image.jpg">
<meta property="og:url" content="https://yoursaas.com">
<meta name="twitter:card" content="summary_large_image">
```

**Structured Data (JSON-LD):**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Your SaaS",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "29",
    "priceCurrency": "USD"
  }
}
```

**Performance:**
- Lazy load images
- Code splitting for routes
- Optimize images (WebP)
- Minimize bundle size
- Use CDN for assets
- Server-side rendering (optional)

**Content Strategy:**
- Clear value proposition
- Social proof (testimonials, logos)
- Trust signals (security badges, certifications)
- Strong CTAs (above the fold)
- Benefit-focused copy (not features)
- Video demos
- Live chat widget

---

## ADMIN DASHBOARD SPECIFIC GUIDELINES

### Security Best Practices:

**Authentication:**
- Separate admin user table in Firestore
- Strong password requirements (min 12 chars)
- Mandatory 2FA
- Session timeout (30 minutes)
- Login attempt limiting (5 attempts)
- IP whitelist (optional but recommended)

**Access Control:**
- Role-based permissions
- Audit logs for all admin actions
- Cannot modify own permissions
- Super admin approval for sensitive actions

**Data Privacy:**
- Admin cannot see customer payment details
- Cannot access business data without permission
- All actions logged
- GDPR compliant data access

**UI Features:**
- Dark mode (easier on eyes for long usage)
- Keyboard shortcuts
- Quick search (Cmd+K)
- Notification center
- Real-time updates
- Export capabilities

---

## CLIENT APP SPECIFIC GUIDELINES

### Multi-Tenancy Implementation:

**Business Context:**
```typescript
// Store current business in context
const BusinessContext = createContext<BusinessContextType>();

// Every API call includes businessId
const getProducts = async (businessId: string) => {
  const q = query(
    collection(db, 'businesses', businessId, 'products'),
    where('status', '==', 'active')
  );
  return await getDocs(q);
};

// UI always shows current business
<BusinessSelector /> // Dropdown if user has multiple businesses
```

**Business Switching:**
- User can belong to multiple businesses
- Dropdown in header to switch
- Persist selection in localStorage
- Reload data when switching

**Data Isolation:**
- Every query filtered by businessId
- Security rules enforce separation
- No cross-business data leaks
- Test thoroughly!

### Offline Support (POS):

**Critical for Physical Stores:**
```typescript
// Enable offline persistence
enableIndexedDbPersistence(db);

// POS works offline
const createOrderOffline = async (order) => {
  // Save to local queue
  await saveToLocalQueue(order);
  
  // Try to sync
  if (navigator.onLine) {
    await syncToFirebase();
  }
};

// Sync when back online
window.addEventListener('online', syncToFirebase);
```

**Offline Features:**
- View products (cached)
- Create orders (queued)
- Process cash payments
- Print receipts
- Sync when online
- Show connection status

### Real-time Updates:

**Use Firestore Listeners:**
```typescript
// Dashboard shows live sales
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(
      collection(db, 'businesses', businessId, 'orders'),
      where('metadata.createdAt', '>=', startOfToday())
    ),
    (snapshot) => {
      // Update state with new orders
      setOrders(snapshot.docs.map(doc => doc.data()));
    }
  );
  
  return () => unsubscribe();
}, [businessId]);
```

**What Should Update in Real-time:**
- Dashboard metrics (sales, orders)
- New orders notification
- Inventory changes
- Staff actions
- Customer activity

### Subscription Enforcement:

**Check Limits:**
```typescript
const canAddProduct = async (businessId: string) => {
  const business = await getBusiness(businessId);
  const currentProducts = business.usage.currentProducts;
  const maxProducts = business.limits.maxProducts;
  
  if (currentProducts >= maxProducts) {
    showUpgradeModal();
    return false;
  }
  return true;
};
```

**Feature Gates:**
```typescript
const canAccessWebsiteBuilder = (plan: string) => {
  return ['professional', 'enterprise'].includes(plan);
};

// In UI
{canAccessWebsiteBuilder(currentPlan) ? (
  <WebsiteBuilderButton />
) : (
  <UpgradePrompt feature="Website Builder" />
)}
```

**Upgrade Prompts:**
- Show when hitting limits
- Highlight benefits of next tier
- One-click upgrade
- Immediate access after payment

---

## CONVERSION OPTIMIZATION

### For Marketing Website:

**Above the Fold:**
- Clear headline (< 10 words)
- Subheadline explaining value
- Visual (screenshot/video)
- Primary CTA button
- Trust signals

**CTA Best Practices:**
- Action-oriented ("Start Free Trial")
- NOT generic ("Learn More", "Sign Up")
- Contrasting color
- Large and prominent
- Multiple CTAs throughout page

**Social Proof:**
- Customer testimonials
- Company logos
- User count ("Join 500+ businesses")
- Review badges (G2, Capterra)
- Case studies

**Pricing Page:**
- Annual/Monthly toggle
- Highlight "Most Popular" plan
- Show savings for annual
- Feature comparison table
- FAQ about pricing
- Money-back guarantee
- Trial badge on all plans

**Exit Intent Popup:**
```typescript
// Show when user tries to leave
useEffect(() => {
  const handleMouseLeave = (e) => {
    if (e.clientY < 50 && !hasSeenPopup) {
      showExitPopup();
    }
  };
  document.addEventListener('mouseleave', handleMouseLeave);
  return () => document.removeEventListener('mouseleave', handleMouseLeave);
}, []);
```

**Popup Offers:**
- 10% off first month
- Extended trial (21 days)
- Free setup call
- Ebook/guide download

### For Client App:

**Onboarding:**
- Interactive tour on first login
- Progress checklist
- Quick wins (add first product)
- Video tutorials
- In-app help tooltips

**Engagement:**
- Email tips (day 3, 7, 14)
- Feature discovery
- Success metrics dashboard
- Gamification (optional)

**Retention:**
- Monthly reports ("Your month in review")
- Celebrate milestones
- Proactive support
- Feature announcements
- Customer success check-ins

---

## STRIPE SUBSCRIPTION IMPLEMENTATION

### Signup Flow with Stripe:

**1. User Selects Plan:**
```typescript
// On pricing page
const handleSelectPlan = (plan: 'starter' | 'professional' | 'enterprise') => {
  navigate(`/signup?plan=${plan}`);
};
```

**2. Create Account (Trial):**
```typescript
// After signup, before trial ends (no payment required)
const startTrial = async (userId: string, plan: string) => {
  await setDoc(doc(db, 'subscriptions', subscriptionId), {
    userId,
    plan,
    status: 'trial',
    trialEndsAt: addDays(new Date(), 14),
    // No Stripe customer yet
  });
};
```

**3. Trial Ending (Collect Payment):**
```typescript
// Email at 7, 3, 1 days before trial ends
// When user adds payment method
const createStripeCustomer = async (userId: string, paymentMethod: string) => {
  const customer = await stripe.customers.create({
    email: user.email,
    payment_method: paymentMethod,
    invoice_settings: {
      default_payment_method: paymentMethod
    }
  });
  
  return customer.id;
};

const createSubscription = async (customerId: string, priceId: string) => {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_end: 'now', // End trial immediately
  });
  
  return subscription;
};
```

**4. Handle Webhooks:**
```typescript
// Cloud Function
export const handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  
  switch (event.type) {
    case 'customer.subscription.created':
      await updateSubscription(event.data.object, 'active');
      await sendEmail('subscription_activated');
      break;
      
    case 'invoice.payment_succeeded':
      await logPayment(event.data.object);
      await sendEmail('payment_received');
      break;
      
    case 'invoice.payment_failed':
      await updateSubscription(event.data.object, 'past_due');
      await sendEmail('payment_failed');
      break;
      
    case 'customer.subscription.deleted':
      await updateSubscription(event.data.object, 'cancelled');
      await sendEmail('subscription_cancelled');
      break;
  }
  
  res.json({ received: true });
});
```

**5. Upgrade/Downgrade:**
```typescript
const changeSubscription = async (subscriptionId: string, newPriceId: string) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: newPriceId,
    }],
    proration_behavior: 'always_invoice', // Charge/credit immediately
  });
};
```

**6. Cancellation:**
```typescript
const cancelSubscription = async (subscriptionId: string, immediately: boolean) => {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: !immediately,
  });
  
  if (immediately) {
    await stripe.subscriptions.cancel(subscriptionId);
  }
};
```

---

## ADMIN DASHBOARD - PLATFORM METRICS

### Key Metrics to Calculate and Display:

**SaaS Metrics:**
```typescript
// Monthly Recurring Revenue
const calculateMRR = async () => {
  const activeSubscriptions = await getActiveSubscriptions();
  const mrr = activeSubscriptions.reduce((sum, sub) => {
    // Normalize to monthly (annual = price / 12)
    const monthlyAmount = sub.interval === 'year' 
      ? sub.price / 12 
      : sub.price;
    return sum + monthlyAmount;
  }, 0);
  return mrr;
};

// Annual Recurring Revenue
const calculateARR = (mrr: number) => mrr * 12;

// Churn Rate
const calculateChurnRate = async (month: string) => {
  const startOfMonth = await getSubscriptionsAtDate(month, 'start');
  const cancelled = await getCancelledInMonth(month);
  return (cancelled.length / startOfMonth.length) * 100;
};

// Customer Lifetime Value
const calculateLTV = (avgMonthlyValue: number, avgLifespanMonths: number) => {
  return avgMonthlyValue * avgLifespanMonths;
};

// Customer Acquisition Cost
const calculateCAC = (marketingSpend: number, newCustomers: number) => {
  return marketingSpend / newCustomers;
};

// LTV/CAC Ratio (should be > 3)
const ltvCacRatio = ltv / cac;
```

**Growth Metrics:**
```typescript
// Month-over-Month Growth
const momGrowth = ((thisMonth - lastMonth) / lastMonth) * 100;

// Signup Conversion Rate
const signupRate = (signups / visitors) * 100;

// Trial to Paid Conversion
const conversionRate = (paidSubscriptions / trials) * 100;
```

**Engagement Metrics:**
```typescript
// Daily Active Users
const dau = await getActiveUsersToday();

// Monthly Active Users
const mau = await getActiveUsersThisMonth();

// Stickiness (DAU/MAU)
const stickiness = (dau / mau) * 100;
```

### Dashboard Charts to Build:

**1. Revenue Chart:**
- Line chart of MRR over time
- Compare with previous period
- Show trend line
- Annotations for major events

**2. Subscription Breakdown:**
- Pie chart: Plan distribution
- Bar chart: New vs churned
- Funnel: Visitor → Trial → Paid

**3. User Growth:**
- Stacked area chart
- Active vs trial vs cancelled
- Growth rate line

**4. Cohort Analysis:**
- Retention table by signup month
- Show % retained each month
- Color-coded (green = good, red = bad)

**5. Revenue by Plan:**
- Stacked bar chart
- Show contribution of each plan
- Highlight which plan drives revenue

---

## CLIENT SUCCESS & SUPPORT

### In-App Support Features:

**Help Widget:**
```typescript
<HelpWidget>
  <SearchDocs />
  <ContactSupport />
  <VideoTutorials />
  <Changelog />
</HelpWidget>
```

**Support Ticket System:**
- In-app ticket creation
- File attachments
- Conversation thread
- Email notifications
- Status tracking
- Priority levels

**Knowledge Base:**
- Searchable articles
- Categories
- Video tutorials
- Screenshots
- FAQ
- Troubleshooting guides

**Feature Requests:**
- Public roadmap (optional)
- Voting system
- Status updates
- Comments

### Proactive Support:

**Automated Outreach:**
```typescript
// Check for inactive users
const findInactiveUsers = async () => {
  const users = await query(
    collection(db, 'businesses'),
    where('metadata.lastActivityAt', '<', sevenDaysAgo)
  );
  
  // Send re-engagement email
  users.forEach(user => {
    sendEmail(user.owner.email, 're_engagement_template');
  });
};
```

**Health Scores:**
```typescript
const calculateHealthScore = (business: Business) => {
  let score = 100;
  
  // Reduce score for red flags
  if (business.usage.currentMonthOrders === 0) score -= 30;
  if (business.metadata.lastActivityAt < threeDaysAgo) score -= 20;
  if (business.usage.currentProducts < 5) score -= 20;
  if (business.staff.length === 1) score -= 10;
  
  return score;
};

// Reach out to low-score businesses
if (healthScore < 50) {
  assignToCustomerSuccess(business);
}
```

---

## FINAL CHECKLIST BEFORE LAUNCH

### Marketing Website:
- [ ] All pages designed and responsive
- [ ] SEO meta tags on all pages
- [ ] Google Analytics installed
- [ ] Contact form working
- [ ] Newsletter signup working
- [ ] Pricing correct
- [ ] CTAs tested
- [ ] Load time < 2 seconds
- [ ] Mobile friendly
- [ ] SSL certificate
- [ ] Custom domain configured

### Admin Dashboard:
- [ ] Admin authentication working
- [ ] 2FA enabled
- [ ] Dashboard metrics accurate
- [ ] Client list loading correctly
- [ ] Subscription management tested
- [ ] Revenue calculations verified
- [ ] Support ticket system working
- [ ] Email notifications sending
- [ ] Access controls tested
- [ ] Deployed to subdomain

### Client App:
- [ ] Signup/login working
- [ ] Onboarding wizard complete
- [ ] All core features working
- [ ] POS operational
- [ ] Order processing tested
- [ ] Inventory tracking accurate
- [ ] Reports generating correctly
- [ ] Multi-tenancy tested
- [ ] Offline mode working (POS)
- [ ] Mobile responsive
- [ ] Performance optimized

### Backend:
- [ ] Firebase project configured
- [ ] Security rules deployed
- [ ] Cloud Functions deployed
- [ ] Stripe integration working
- [ ] Webhooks configured
- [ ] Email service configured
- [ ] Backups automated
- [ ] Monitoring enabled

### Testing:
- [ ] Complete user flow tested
- [ ] Payment processing verified
- [ ] Subscription lifecycle tested
- [ ] Edge cases handled
- [ ] Error handling working
- [ ] Load testing passed
- [ ] Security audit completed

### Legal & Compliance:
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Cookie Policy
- [ ] GDPR compliance
- [ ] Data retention policy
- [ ] Refund policy

### Marketing:
- [ ] Social media accounts created
- [ ] Email campaigns ready
- [ ] Content calendar planned
- [ ] Launch announcement written
- [ ] Press kit prepared
- [ ] Beta tester feedback collected

---

## LAUNCH STRATEGY

### Soft Launch (Week 1):
- Launch to beta testers
- 50-100 early adopters
- Collect feedback
- Fix critical bugs
- Refine onboarding

### Public Launch (Week 2-3):
- Announce on social media
- Email existing list
- Product Hunt launch
- Tech blog outreach
- Paid ads (optional)

### Post-Launch (Ongoing):
- Monitor metrics daily
- Support tickets priority
- Weekly feature updates
- Monthly blog posts
- Quarterly reviews

---

## SUCCESS METRICS TO TRACK

**First 30 Days:**
- Target: 100 signups
- Target: 20% trial-to-paid conversion
- Target: < 5% churn
- Target: 90+ NPS score

**First 90 Days:**
- Target: 500 signups
- Target: $10k MRR
- Target: 50+ paying customers
- Target: < 10% churn

**First Year:**
- Target: 5000 signups
- Target: $50k MRR
- Target: 500+ paying customers
- Target: Profitability

---

## REMEMBER

**Focus on:**
1. **User Experience** - Make it intuitive
2. **Performance** - Keep it fast
3. **Reliability** - 99.9% uptime
4. **Support** - Be responsive
5. **Value** - Solve real problems

**Avoid:**
1. Feature bloat - Start lean
2. Premature optimization - Build first
3. Complex pricing - Keep it simple
4. Over-engineering - Ship fast
5. Ignoring feedback - Listen to users

---

**You now have everything you need to build a successful multi-tenant SaaS platform. Good luck! 🚀**

## KEY COMMANDS FOR CURSOR

When working on specific features, use these prompts:

### Authentication:
"Create a Firebase authentication service with email/password and Google OAuth. Include signup, login, logout, and password reset functions."

### Product Management:
"Build a complete product management system with CRUD operations, image upload to Firebase Storage, variant support, and real-time inventory tracking."

### POS Interface:
"Create a modern POS interface with product grid, shopping cart, payment processing, and receipt generation. Make it touch-friendly and support barcode scanning."

### Dashboard:
"Build a responsive dashboard with sales overview cards, line chart for sales trends, recent orders widget, and low stock alerts. Use Recharts for visualizations."

### Orders:
"Implement order management with list view, filters, order details, status updates, and order timeline. Include real-time updates using Firestore listeners."

## TESTING STRATEGY

### Unit Tests:
- Test utility functions
- Test custom hooks
- Test services (business logic)

### Integration Tests:
- Test Firebase operations
- Test form submissions
- Test authentication flow

### E2E Tests:
- Test complete user flows (signup → create business → add product → make sale)
- Use Playwright or Cypress

## PERFORMANCE OPTIMIZATION

1. **Code Splitting**: Lazy load routes and heavy components
2. **Image Optimization**: Compress and lazy load images
3. **Firebase Optimization**: Use pagination, limit queries
4. **Caching**: Cache frequently accessed data
5. **Bundle Size**: Analyze and reduce bundle size
6. **Lighthouse Score**: Aim for 90+ on all metrics

## ACCESSIBILITY

1. Use semantic HTML
2. Add ARIA labels where needed
3. Keyboard navigation support
4. Screen reader friendly
5. Color contrast compliance (WCAG AA)
6. Focus indicators
7. Alt text for images

## IMPORTANT NOTES

### Multi-Tenancy:
- Every query must filter by `businessId`
- Users can access multiple businesses (stored in user document)
- Always verify user has access to business before showing data

### Real-time Updates:
- Use Firestore `onSnapshot` for dashboard, orders, inventory
- Unsubscribe from listeners on component unmount
- Handle loading and error states

### Offline Support:
- Enable Firebase offline persistence
- POS should work offline (sync when back online)
- Show connection status indicator

### Security:
- Never trust client-side data
- Validate on both client and server (Cloud Functions)
- Use Firebase Security Rules
- Sanitize user inputs
- Implement rate limiting for sensitive operations

### Scalability:
- Use Cloud Functions for complex operations
- Implement proper indexing
- Use pagination for large datasets
- Optimize queries
- Consider caching strategies

## SUBSCRIPTION TIERS & LIMITS

### Starter ($29/month):
- 1 user
- 100 products
- 500 orders/month
- Basic reporting

### Professional ($79/month):
- 5 users
- 1,000 products
- Unlimited orders
- Advanced analytics
- Website builder
- Priority support

### Enterprise ($199/month):
- Unlimited users
- Unlimited products
- Unlimited orders
- API access
- Custom integrations
- Multi-location
- Dedicated support

### Enforce Limits:
- Check limits before creating products/orders
- Show upgrade prompts when limits reached
- Use Cloud Functions to enforce server-side

## FINAL REMINDERS

1. **User Experience First**: Make it intuitive for non-technical users
2. **Performance Matters**: Fast loading times are crucial
3. **Mobile Responsive**: Many users will access on tablets/phones
4. **Real-time is Key**: Business owners need instant updates
5. **Error Handling**: Always show helpful error messages
6. **Empty States**: Guide users when they have no data
7. **Loading States**: Show skeletons/spinners during data fetch
8. **Success Feedback**: Confirm actions with toasts/alerts
9. **Documentation**: Comment complex logic
10. **Consistency**: Use design system components throughout

---

## START BUILDING

### Step 1: Initialize Projects

**Marketing Website:**
```bash
npm create vite@latest marketing-website -- --template react-ts
cd marketing-website
npm install
npm install react-router-dom firebase zustand tailwindcss postcss autoprefixer
npm install framer-motion lucide-react date-fns
npm install react-hook-form zod @hookform/resolvers
npx tailwindcss init -p
npx shadcn-ui@latest init
```

**Admin Dashboard:**
```bash
npm create vite@latest admin-dashboard -- --template react-ts
cd admin-dashboard
npm install
npm install react-router-dom firebase zustand tailwindcss postcss autoprefixer
npm install recharts lucide-react date-fns
npm install react-hook-form zod @hookform/resolvers
npx tailwindcss init -p
npx shadcn-ui@latest init
```

**Client App:**
```bash
npm create vite@latest client-app -- --template react-ts
cd client-app
npm install
npm install react-router-dom firebase zustand tailwindcss postcss autoprefixer
npm install recharts lucide-react date-fns
npm install react-hook-form zod @hookform/resolvers
npx tailwindcss init -p
npx shadcn-ui@latest init
```

### Step 2: Configure Vite

**vite.config.ts** (for all three projects):
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-vendor': ['lucide-react', 'recharts'],
        },
      },
    },
  },
  server: {
    port: 3000, // Marketing: 3000, Admin: 3001, Client: 3002
    open: true,
  },
})
```

### Step 3: Configure Tailwind

**tailwind.config.js** (for all three projects):
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### Step 4: Project Structure

Each app should have this structure:

```
src/
├── assets/              # Images, fonts, etc.
├── components/
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components
│   └── features/       # Feature-specific components
├── pages/              # Page components (routes)
├── lib/
│   ├── firebase/       # Firebase config and services
│   ├── services/       # Business logic
│   ├── hooks/          # Custom hooks
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript types
├── store/              # Zustand stores
├── styles/             # Global styles
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── router.tsx          # React Router configuration
```

### Step 5: Basic Routing Setup

**router.tsx** example:
```typescript
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import HomePage from '@/pages/Home';
import LoginPage from '@/pages/auth/Login';
import SignupPage from '@/pages/auth/Signup';
import DashboardPage from '@/pages/Dashboard';
import ProductsPage from '@/pages/Products';
import OrdersPage from '@/pages/Orders';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      {
        path: 'dashboard',
        element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
      },
      {
        path: 'products',
        element: <ProtectedRoute><ProductsPage /></ProtectedRoute>,
      },
      {
        path: 'orders',
        element: <ProtectedRoute><OrdersPage /></ProtectedRoute>,
      },
    ],
  },
]);
```

**main.tsx:**
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
```

### Step 6: SEO for Marketing Site (Vite Plugin)

For the marketing website, install SEO plugin:

```bash
npm install vite-plugin-html
```

**vite.config.ts** (marketing site only):
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHtmlPlugin } from 'vite-plugin-html'

export default defineConfig({
  plugins: [
    react(),
    createHtmlPlugin({
      inject: {
        data: {
          title: 'Your SaaS - All-in-One Business Management',
          description: 'Run your entire business from one dashboard. POS, inventory, orders, and more.',
          ogImage: '/og-image.jpg',
        },
      },
    }),
  ],
})
```

**index.html:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><%- title %></title>
    <meta name="description" content="<%- description %>" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="<%- title %>" />
    <meta property="og:description" content="<%- description %>" />
    <meta property="og:image" content="<%- ogImage %>" />
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<%- title %>" />
    <meta name="twitter:description" content="<%- description %>" />
    <meta name="twitter:image" content="<%- ogImage %>" />
    
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 7: Development Commands

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

Run development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

### Step 8: Deployment

**For Vercel:**
1. Connect your GitHub repo
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy!

**For Netlify:**
1. Connect your GitHub repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy!

**Manual deployment:**
```bash
npm run build
# Upload the 'dist' folder to any static hosting
```

### React Router for Different Apps

**Marketing Website Routes:**
```typescript
/ → Home/Landing page
/features → Features page
/pricing → Pricing page
/about → About us
/contact → Contact form
/blog → Blog listing
/blog/:slug → Blog post
/docs → Documentation
/login → Client login
/signup → Client signup
```

**Admin Dashboard Routes:**
```typescript
/login → Admin login
/dashboard → Overview
/clients → Client list
/clients/:id → Client detail
/subscriptions → All subscriptions
/revenue → Revenue analytics
/analytics → Platform analytics
/support → Support tickets
/support/:id → Ticket detail
/marketing → Newsletter & campaigns
/settings → Platform settings
```

**Client App Routes:**
```typescript
/login → Login
/signup → Signup
/onboarding → Setup wizard
/dashboard → Main dashboard
/products → Product list
/products/new → Add product
/products/:id → Edit product
/pos → Point of sale
/orders → Order list
/orders/:id → Order detail
/customers → Customer list
/customers/:id → Customer profile
/staff → Staff management
/finance → Finance dashboard
/reports → Reports & analytics
/website-builder → Website editor
/settings → Business settings
```

---

## VITE-SPECIFIC OPTIMIZATIONS

### Code Splitting
```typescript
// Lazy load heavy components
const POSInterface = lazy(() => import('@/pages/POS'));
const WebsiteBuilder = lazy(() => import('@/pages/WebsiteBuilder'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <POSInterface />
</Suspense>
```

### Environment Variables
Create `.env` files:

**.env.development:**
```env
VITE_FIREBASE_API_KEY=dev_api_key
VITE_FIREBASE_PROJECT_ID=dev_project
```

**.env.production:**
```env
VITE_FIREBASE_API_KEY=prod_api_key
VITE_FIREBASE_PROJECT_ID=prod_project
```

Access in code:
```typescript
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
```

### Asset Optimization
```typescript
// Import images
import logo from '@/assets/logo.svg'

// Use in component
<img src={logo} alt="Logo" />

// Vite automatically optimizes images
```

### Pre-rendering for Marketing Site (Optional)
For better SEO on marketing site:

```bash
npm install vite-plugin-ssr
```

But for simplicity, stick with client-side rendering and use:
- Proper meta tags
- Semantic HTML
- Fast loading times
- Google Analytics

---

## NO SERVER-SIDE CODE NEEDED

Since you're using Firebase:
- ✅ Authentication → Firebase Auth
- ✅ Database → Firestore
- ✅ API calls → Cloud Functions
- ✅ File uploads → Firebase Storage
- ✅ Real-time → Firestore listeners

**Pure client-side React apps with Vite = Simple & Fast!**

---

## DEVELOPMENT WORKFLOW WITH VITE

1. **Start all three apps in separate terminals:**

```bash
# Terminal 1 - Marketing Website
cd marketing-website
npm run dev # Runs on localhost:3000

# Terminal 2 - Admin Dashboard  
cd admin-dashboard
npm run dev # Change port to 3001 in vite.config.ts

# Terminal 3 - Client App
cd client-app
npm run dev # Change port to 3002 in vite.config.ts
```

2. **Hot reload works instantly** - No page refresh needed!

3. **Build when ready:**
```bash
npm run build
```

4. **Deploy dist folder** to Vercel, Netlify, or any host

---

**Focus on getting the MVP working first** (Auth, Dashboard, Products, POS, Orders) before adding advanced features.

Good luck with Vite! 🚀 It's the fastest way to build React apps!