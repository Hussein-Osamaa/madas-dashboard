# Environment Variables

This document lists all the environment variables required for the MADAS SaaS platform.

## Required Environment Variables

### Firebase Configuration

#### Production
```bash
# Firebase Web App Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=madas-store.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=madas-store
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=madas-store.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=527071300010
NEXT_PUBLIC_FIREBASE_APP_ID=1:527071300010:web:70470e2204065b4590583d3
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-NQVR1F4N3Q

# Firebase Service Account (for server-side operations)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@madas-store.iam.gserviceaccount.com
FIREBASE_PROJECT_ID=madas-store
```

#### Staging
```bash
# Firebase Web App Configuration (Staging)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=madas-store-staging.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=madas-store-staging
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=madas-store-staging.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=527071300010
NEXT_PUBLIC_FIREBASE_APP_ID=1:527071300010:web:70470e2204065b4590583d3
```

### Stripe Configuration

#### Production
```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_STARTER_PRICE_ID=price_starter_monthly
STRIPE_PRO_PRICE_ID=price_pro_monthly
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly
```

#### Test/Staging
```bash
# Stripe Test API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Test Price IDs
STRIPE_STARTER_PRICE_ID=price_starter_monthly_test
STRIPE_PRO_PRICE_ID=price_pro_monthly_test
STRIPE_ENTERPRISE_PRICE_ID=price_enterprise_monthly_test
```

### Email Configuration

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=noreply@madas.com
FROM_NAME=MADAS

# Email Templates
WELCOME_EMAIL_TEMPLATE_ID=d-xxxxx
STAFF_INVITE_EMAIL_TEMPLATE_ID=d-xxxxx
TRIAL_EXPIRY_EMAIL_TEMPLATE_ID=d-xxxxx
BILLING_EMAIL_TEMPLATE_ID=d-xxxxx
```

### Domain Configuration

```bash
# DNS Provider API Keys
CLOUDFLARE_API_KEY=xxxxx
CLOUDFLARE_EMAIL=admin@madas.com
CLOUDFLARE_ZONE_ID=xxxxx

# Domain Verification
DOMAIN_VERIFICATION_TOKEN=xxxxx
```

### GitHub Actions Secrets

```bash
# Firebase Service Account (JSON)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"madas-store",...}

# Firebase Service Account (Staging)
FIREBASE_SERVICE_ACCOUNT_STAGING={"type":"service_account","project_id":"madas-store-staging",...}

# Slack Webhook
SLACK_WEBHOOK=https://hooks.slack.com/services/...

# Codecov Token
CODECOV_TOKEN=xxxxx

# Lighthouse CI Token
LHCI_GITHUB_APP_TOKEN=xxxxx
```

## Environment Setup

### 1. Local Development

Create a `.env.local` file in the root directory:

```bash
# Copy the production Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=madas-store.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=madas-store
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=madas-store.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=527071300010
NEXT_PUBLIC_FIREBASE_APP_ID=1:527071300010:web:70470e2204065b4590583d3

# Use test Stripe keys for development
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Use test email service
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=dev@madas.com
```

### 2. Staging Environment

Set these in your hosting platform (Vercel, Netlify, etc.):

```bash
# Staging Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=madas-store-staging.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=madas-store-staging
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=madas-store-staging.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=527071300010
NEXT_PUBLIC_FIREBASE_APP_ID=1:527071300010:web:70470e2204065b4590583d3

# Test Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Test email service
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=staging@madas.com
```

### 3. Production Environment

Set these in your hosting platform:

```bash
# Production Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=madas-store.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=madas-store
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=madas-store.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=527071300010
NEXT_PUBLIC_FIREBASE_APP_ID=1:527071300010:web:70470e2204065b4590583d3

# Live Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Production email service
SENDGRID_API_KEY=SG.xxxxx
FROM_EMAIL=noreply@madas.com
```

## Security Notes

1. **Never commit environment variables to version control**
2. **Use different API keys for different environments**
3. **Rotate API keys regularly**
4. **Use least privilege principle for service accounts**
5. **Monitor API key usage and set up alerts**

## Validation

To validate your environment setup, run:

```bash
# Check if all required variables are set
npm run validate-env

# Test Firebase connection
npm run test-firebase

# Test Stripe connection
npm run test-stripe

# Test email service
npm run test-email
```

## Troubleshooting

### Common Issues

1. **Firebase connection fails**
   - Check if the API key is correct
   - Verify the project ID matches
   - Ensure the service account has proper permissions

2. **Stripe webhooks not working**
   - Verify the webhook secret
   - Check if the webhook URL is accessible
   - Ensure the webhook events are configured correctly

3. **Email sending fails**
   - Check the SendGrid API key
   - Verify the sender email is verified
   - Check if the template IDs are correct

4. **Domain verification fails**
   - Verify the DNS records are correct
   - Check if the domain provider API keys are valid
   - Ensure the domain is not already in use

### Getting Help

If you encounter issues with environment setup:

1. Check the logs in your hosting platform
2. Verify all environment variables are set correctly
3. Test each service individually
4. Contact support if the issue persists
