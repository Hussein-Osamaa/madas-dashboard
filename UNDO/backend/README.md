# Backend Functions

Firebase Functions backend for the Madas platform - featuring Stripe integration, user management, website publishing, analytics, and comprehensive admin functionality.

## 🚀 Features

### **Payment & Subscriptions**
- **Stripe Integration** - Complete subscription management
- **Webhook Handling** - Real-time payment processing
- **Subscription Plans** - Free, Pro, Business tiers
- **Billing Management** - Automated invoicing and renewals

### **User Management**
- **Authentication** - Firebase Auth integration
- **User Profiles** - Complete user data management
- **Preferences** - User settings and customization
- **Analytics** - User behavior tracking

### **Website Management**
- **Website Creation** - Template-based website building
- **Publishing System** - Website deployment and hosting
- **Content Management** - Dynamic content updates
- **SEO Optimization** - Built-in SEO tools

### **Analytics & Reporting**
- **Real-time Analytics** - Website performance metrics
- **User Analytics** - User behavior insights
- **Platform Analytics** - System-wide metrics
- **Custom Reports** - Exportable analytics data

### **Admin Functions**
- **System Management** - Platform administration
- **User Administration** - User account management
- **Analytics Dashboard** - Platform insights
- **System Monitoring** - Health and performance tracking

## 🛠️ Tech Stack

- **Firebase Functions** - Serverless backend
- **Firebase Firestore** - NoSQL database
- **Firebase Storage** - File storage
- **Firebase Auth** - Authentication
- **Stripe** - Payment processing
- **TypeScript** - Type-safe development
- **Winston** - Logging
- **Nodemailer** - Email services
- **Handlebars** - Email templates

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- Firebase CLI
- Stripe account
- SMTP email service

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Build the project
npm run build

# Start local development
npm run serve
```

### Environment Variables

Create a `.env` file with:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@madas.com

# App URLs
DASHBOARD_URL=https://dashboard.madas.com
BUILDER_URL=https://builder.madas.com
ADMIN_URL=https://admin.madas.com
```

## 📁 Project Structure

```
src/
├── functions/           # Function modules
│   ├── auth.ts         # Authentication functions
│   ├── stripe.ts       # Stripe integration
│   ├── websites.ts     # Website management
│   ├── admin.ts        # Admin functions
│   ├── users.ts        # User management
│   └── analytics.ts    # Analytics functions
├── types/              # TypeScript type definitions
│   ├── auth.ts         # Authentication types
│   ├── stripe.ts       # Stripe types
│   ├── website.ts      # Website types
│   ├── user.ts         # User types
│   ├── admin.ts        # Admin types
│   ├── analytics.ts    # Analytics types
│   └── common.ts       # Common types
├── utils/              # Utility functions
│   ├── auth.ts         # Authentication utilities
│   ├── validation.ts   # Input validation
│   ├── logger.ts       # Logging utilities
│   ├── email.ts        # Email utilities
│   ├── storage.ts      # Storage utilities
│   ├── analytics.ts    # Analytics utilities
│   ├── helpers.ts      # Helper functions
│   └── errors.ts       # Error handling
└── index.ts            # Main entry point
```

## 🔧 Function Modules

### **Authentication Functions**
- `createUser` - Create user document on signup
- `updateUser` - Update user profile
- `deleteUser` - Delete user account
- `getUserProfile` - Get user profile data
- `updateUserPreferences` - Update user settings
- `getUserAnalytics` - Get user analytics
- `getUserSubscription` - Get subscription info

### **Stripe Functions**
- `createStripeCustomer` - Create Stripe customer
- `createCheckoutSession` - Create payment session
- `handleStripeWebhook` - Process Stripe webhooks
- `cancelSubscription` - Cancel subscription
- `updateSubscription` - Update subscription plan
- `getSubscriptionStatus` - Get subscription status

### **Website Functions**
- `createWebsite` - Create new website
- `updateWebsite` - Update website content
- `deleteWebsite` - Delete website
- `publishWebsite` - Publish website
- `unpublishWebsite` - Unpublish website
- `getWebsite` - Get website data
- `listUserWebsites` - List user's websites

### **Admin Functions**
- `getAdminStats` - Get platform statistics
- `getSystemLogs` - Get system logs
- `updateSystemSettings` - Update system settings
- `exportUserData` - Export user data
- `sendAdminNotification` - Send admin notifications

### **Analytics Functions**
- `trackWebsiteView` - Track page views
- `getWebsiteAnalytics` - Get website analytics
- `getPlatformAnalytics` - Get platform analytics
- `generateAnalyticsReport` - Generate reports

## 🔒 Security

### **Authentication & Authorization**
- Firebase Auth integration
- Role-based access control
- Admin-only functions
- User ownership verification

### **Data Protection**
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting

### **Webhook Security**
- Stripe webhook signature verification
- Event validation
- Error handling and logging

## 📊 Analytics

### **Metrics Tracked**
- Page views and unique visitors
- User behavior and actions
- Website performance
- System events and errors
- Payment and subscription events

### **Reporting Features**
- Real-time analytics
- Custom date ranges
- Export capabilities
- Automated reports

## 🚀 Deployment

### **Firebase Functions**

```bash
# Build the project
npm run build

# Deploy functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:createUser
```

### **Environment Setup**

1. Set up Firebase project
2. Configure Stripe webhooks
3. Set up SMTP email service
4. Configure environment variables
5. Deploy functions

### **Webhook Configuration**

Configure Stripe webhooks to point to:
```
https://your-region-your-project.cloudfunctions.net/handleStripeWebhook
```

Events to listen for:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## 📧 Email Templates

### **Available Templates**
- Welcome email
- Subscription confirmation
- Subscription cancellation
- Website published notification
- Password reset
- Security alerts

### **Customization**
- Handlebars templating
- Responsive design
- Brand customization
- Multi-language support

## 🔍 Monitoring & Logging

### **Logging Levels**
- `error` - Error events
- `warn` - Warning events
- `info` - Information events
- `debug` - Debug information

### **Log Categories**
- `auth` - Authentication events
- `payment` - Payment processing
- `website` - Website operations
- `system` - System events
- `security` - Security events

### **Monitoring**
- Function execution metrics
- Error rates and patterns
- Performance monitoring
- Custom alerts

## 🧪 Testing

### **Unit Tests**

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### **Integration Tests**

```bash
# Test Firebase Functions
npm run test:functions

# Test Stripe integration
npm run test:stripe
```

## 📈 Performance

### **Optimization**
- Function cold start reduction
- Database query optimization
- Caching strategies
- Batch operations

### **Scaling**
- Automatic scaling
- Load balancing
- Resource management
- Cost optimization

## 🔧 Configuration

### **Firebase Configuration**
- Project settings
- Authentication rules
- Firestore rules
- Storage rules
- Hosting configuration

### **Stripe Configuration**
- Webhook endpoints
- Product and price setup
- Customer portal
- Billing settings

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add comprehensive error handling
3. Include logging for all operations
4. Write unit tests for new functions
5. Update documentation

## 📄 License

Private - All rights reserved

## 🆘 Support

For support and questions:
- Check the logs for error details
- Review Firebase Functions documentation
- Consult Stripe API documentation
- Contact the development team
