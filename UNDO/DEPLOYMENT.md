# Deployment Guide

This guide covers deploying the Madas platform to Firebase Hosting with multiple environments and automated CI/CD.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Firebase CLI
- Git
- GitHub account (for CI/CD)

### Initial Setup

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Set up hosting targets**
   ```bash
   ./scripts/setup-hosting.sh
   ```

4. **Deploy to development**
   ```bash
   ./scripts/deploy.sh development marketing
   ```

## 🌍 Environments

### Production
- **Project**: `madas-platform`
- **URLs**:
  - Marketing: https://madas.com
  - Dashboard: https://dashboard.madas.com
  - Webbuilder: https://builder.madas.com
  - Admin: https://admin.madas.com

### Staging
- **Project**: `madas-platform-staging`
- **URLs**:
  - Marketing: https://staging.madas.com
  - Dashboard: https://staging-dashboard.madas.com
  - Webbuilder: https://staging-builder.madas.com
  - Admin: https://staging-admin.madas.com

### Development
- **Project**: `madas-platform-dev`
- **URLs**:
  - Marketing: https://dev.madas.com
  - Dashboard: https://dev-dashboard.madas.com
  - Webbuilder: https://dev-builder.madas.com
  - Admin: https://dev-admin.madas.com

## 📦 Manual Deployment

### Deploy Single App

```bash
# Deploy marketing app to production
./scripts/deploy.sh production marketing

# Deploy dashboard app to staging
./scripts/deploy.sh staging dashboard

# Deploy webbuilder app to development
./scripts/deploy.sh development webbuilder

# Deploy admin app to production
./scripts/deploy.sh production admin
```

### Deploy All Apps

```bash
# Deploy all apps to production
./scripts/deploy.sh production all

# Deploy all apps to staging
./scripts/deploy.sh staging all

# Deploy all apps to development
./scripts/deploy.sh development all
```

### Deploy Functions Only

```bash
# Deploy functions to production
./scripts/deploy.sh production functions

# Deploy functions to staging
./scripts/deploy.sh staging functions

# Deploy functions to development
./scripts/deploy.sh development functions
```

## 🤖 Automated Deployment

### GitHub Actions

The platform uses GitHub Actions for automated deployment:

- **Production**: Deploys on push to `main` branch
- **Staging**: Deploys on push to `develop` branch
- **Development**: Deploys on push to `develop` or `feature/*` branches

### Required Secrets

Set these secrets in your GitHub repository:

#### Firebase Secrets
- `FIREBASE_TOKEN` - Firebase CI token
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_PRIVATE_KEY_ID` - Firebase private key ID
- `FIREBASE_PRIVATE_KEY` - Firebase private key
- `FIREBASE_CLIENT_EMAIL` - Firebase client email
- `FIREBASE_CLIENT_ID` - Firebase client ID

#### Firebase Client Secrets
- `FIREBASE_API_KEY` - Firebase API key
- `FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `FIREBASE_APP_ID` - Firebase app ID

#### Stripe Secrets
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

#### Email Secrets
- `SMTP_HOST` - SMTP host
- `SMTP_PORT` - SMTP port
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `FROM_EMAIL` - From email address

### Getting Firebase CI Token

```bash
firebase login:ci
```

Copy the token and add it to your GitHub secrets as `FIREBASE_TOKEN`.

## 🔧 Configuration

### Environment Variables

Each app has its own environment configuration:

#### Marketing App
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
NEXT_PUBLIC_APP_URL=https://madas.com
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.madas.com
NEXT_PUBLIC_BUILDER_URL=https://builder.madas.com
NEXT_PUBLIC_ADMIN_URL=https://admin.madas.com
```

#### Dashboard App
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
NEXT_PUBLIC_APP_URL=https://madas.com
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.madas.com
NEXT_PUBLIC_BUILDER_URL=https://builder.madas.com
NEXT_PUBLIC_ADMIN_URL=https://admin.madas.com
```

#### Webbuilder App
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
NEXT_PUBLIC_APP_URL=https://madas.com
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.madas.com
NEXT_PUBLIC_BUILDER_URL=https://builder.madas.com
NEXT_PUBLIC_ADMIN_URL=https://admin.madas.com
```

#### Admin App
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
NEXT_PUBLIC_APP_URL=https://madas.com
NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.madas.com
NEXT_PUBLIC_BUILDER_URL=https://builder.madas.com
NEXT_PUBLIC_ADMIN_URL=https://admin.madas.com
```

### Firebase Configuration

#### firebase.json
The main Firebase configuration file defines:
- Hosting targets for each app
- Functions configuration
- Firestore rules and indexes
- Storage rules
- Emulator configuration

#### .firebaserc
Defines:
- Project aliases
- Hosting target mappings
- Environment-specific configurations

## 🌐 Custom Domains

### Setting Up Custom Domains

1. **Add domains in Firebase Console**
   - Go to Firebase Console > Hosting
   - Click "Add custom domain"
   - Follow the verification process

2. **Configure DNS**
   - Add the required DNS records
   - Wait for SSL certificate provisioning

3. **Update environment variables**
   - Update `NEXT_PUBLIC_*_URL` variables
   - Redeploy applications

### Domain Configuration

#### Production Domains
- `madas.com` → Marketing app
- `dashboard.madas.com` → Dashboard app
- `builder.madas.com` → Webbuilder app
- `admin.madas.com` → Admin app

#### Staging Domains
- `staging.madas.com` → Marketing app
- `staging-dashboard.madas.com` → Dashboard app
- `staging-builder.madas.com` → Webbuilder app
- `staging-admin.madas.com` → Admin app

#### Development Domains
- `dev.madas.com` → Marketing app
- `dev-dashboard.madas.com` → Dashboard app
- `dev-builder.madas.com` → Webbuilder app
- `dev-admin.madas.com` → Admin app

## 🔒 Security

### SSL Certificates
- Automatically provisioned by Firebase
- Auto-renewal enabled
- HSTS headers configured

### Security Headers
All apps include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### CORS Configuration
- Configured for cross-origin requests
- Environment-specific origins
- Credentials support enabled

## 📊 Monitoring

### Firebase Analytics
- Automatic page view tracking
- Custom event tracking
- User behavior analytics

### Error Monitoring
- Firebase Crashlytics integration
- Real-time error reporting
- Performance monitoring

### Logging
- Structured logging with Winston
- Cloud Logging integration
- Error tracking and alerting

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run build
```

#### Deployment Failures
```bash
# Check Firebase CLI version
firebase --version

# Update Firebase CLI
npm install -g firebase-tools@latest

# Check project configuration
firebase projects:list
firebase use --add
```

#### Environment Variable Issues
```bash
# Check environment variables
echo $NEXT_PUBLIC_FIREBASE_API_KEY

# Verify Firebase configuration
firebase projects:list
```

### Debug Commands

```bash
# Test local build
npm run build

# Test local deployment
firebase emulators:start

# Check hosting configuration
firebase hosting:channel:list

# View deployment logs
firebase functions:log
```

## 📚 Additional Resources

- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

## 🆘 Support

For deployment issues:
1. Check the logs in GitHub Actions
2. Verify environment variables
3. Test local builds
4. Contact the development team
