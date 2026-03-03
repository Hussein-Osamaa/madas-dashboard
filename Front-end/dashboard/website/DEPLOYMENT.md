# MADAS Website - Deployment Guide

## 🚀 Deployment Overview

This guide covers deploying the MADAS Website to Firebase Hosting with proper configuration for production use.

## 📋 Prerequisites

### Required Tools
- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project created
- Git repository access

### Firebase Project Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable the following services:
   - **Authentication** (Email/Password)
   - **Firestore Database**
   - **Hosting**
   - **Functions** (optional, for future features)

## 🔧 Configuration

### 1. Firebase Configuration

Update `public/firebaseConfig.js` with your project details:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id" // Optional
};
```

### 2. Environment Variables

Create `.env.local` for local development:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 3. Firestore Security Rules

Deploy the security rules to your Firebase project:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Business documents
    match /businesses/{businessId} {
      allow read, write: if request.auth != null && 
        (resource.data.ownerUid == request.auth.uid || 
         request.auth.uid in resource.data.staff);
    }
    
    // Business data isolation
    match /{collection}/{document} {
      allow read, write: if request.auth != null && 
        resource.data.businessId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.businessId;
    }
  }
}
```

## 🏗️ Build Process

### 1. Install Dependencies
```bash
cd website
npm install
```

### 2. Build for Production
```bash
npm run build
```

This creates an optimized production build in the `.next` directory.

### 3. Test Production Build Locally
```bash
npm start
```

Visit `http://localhost:3000` to test the production build.

## 🔥 Firebase Hosting Deployment

### 1. Initialize Firebase Hosting
```bash
firebase login
firebase init hosting
```

Select your Firebase project and configure:
- **Public directory**: `out` (for static export) or `.next` (for server-side rendering)
- **Single-page app**: Yes
- **Automatic builds**: No (we'll handle this manually)

### 2. Configure Firebase Hosting

Create/update `firebase.json`:

```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### 3. Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

## 🌐 Custom Domain Setup

### 1. Add Custom Domain
```bash
firebase hosting:sites:create your-site-name
```

### 2. Configure Domain in Firebase Console
1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain name
4. Follow the DNS configuration instructions

### 3. SSL Certificate
Firebase automatically provisions SSL certificates for custom domains.

## 🔒 Security Configuration

### 1. Authentication Settings
In Firebase Console → Authentication → Settings:
- Enable Email/Password authentication
- Configure authorized domains
- Set up password requirements

### 2. Firestore Security Rules
Deploy the security rules:
```bash
firebase deploy --only firestore:rules
```

### 3. CORS Configuration
If using custom domains, ensure CORS is properly configured in Firebase.

## 📊 Monitoring & Analytics

### 1. Firebase Analytics
Enable Firebase Analytics in your project for user behavior tracking.

### 2. Performance Monitoring
Enable Firebase Performance Monitoring for app performance insights.

### 3. Error Reporting
Enable Firebase Crashlytics for error tracking and reporting.

## 🚀 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: website/package-lock.json
    
    - name: Install dependencies
      run: |
        cd website
        npm ci
    
    - name: Build
      run: |
        cd website
        npm run build
    
    - name: Deploy to Firebase
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        projectId: your-project-id
        channelId: live
```

### Environment Variables for CI/CD
Set these secrets in your GitHub repository:
- `FIREBASE_SERVICE_ACCOUNT`: Firebase service account JSON

## 🔧 Production Optimizations

### 1. Next.js Configuration
Update `next.config.ts` for production:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // For static export
  trailingSlash: true,
  images: {
    unoptimized: true  // For static export
  },
  // Enable compression
  compress: true,
  // Optimize bundle
  experimental: {
    optimizeCss: true
  }
};

export default nextConfig;
```

### 2. Performance Optimizations
- Enable gzip compression
- Optimize images
- Use CDN for static assets
- Implement caching strategies

### 3. SEO Configuration
- Add meta tags
- Configure sitemap
- Set up Google Analytics
- Implement structured data

## 🧪 Testing in Production

### 1. Smoke Tests
- Test user signup flow
- Test login functionality
- Test dashboard access
- Test business isolation

### 2. Performance Tests
- Page load times
- API response times
- Database query performance
- Memory usage

### 3. Security Tests
- Authentication flows
- Authorization checks
- Data isolation
- Input validation

## 🐛 Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### Firebase Hosting Issues
```bash
# Check Firebase CLI version
firebase --version

# Update Firebase CLI
npm install -g firebase-tools@latest

# Redeploy
firebase deploy --only hosting
```

#### Authentication Issues
- Verify Firebase project configuration
- Check authorized domains in Firebase Console
- Ensure security rules are deployed

#### Database Connection Issues
- Verify Firestore is enabled
- Check security rules
- Validate API keys

### Debug Mode
Enable debug logging in production:
```javascript
// Add to your app
if (process.env.NODE_ENV === 'production') {
  console.log = () => {}; // Disable console.log in production
}
```

## 📈 Monitoring Production

### 1. Firebase Console
- Monitor user authentication
- Check Firestore usage
- Review hosting metrics
- Analyze performance data

### 2. Custom Monitoring
- Set up error tracking
- Monitor API endpoints
- Track user behavior
- Performance metrics

### 3. Alerts
- Set up Firebase alerts
- Monitor error rates
- Track performance degradation
- User experience metrics

## 🔄 Rollback Strategy

### 1. Firebase Hosting Rollback
```bash
# List previous releases
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:releases:rollback
```

### 2. Database Rollback
- Use Firestore backup/restore
- Implement data migration scripts
- Maintain database versioning

### 3. Feature Flags
Implement feature flags for safe rollouts:
```javascript
const features = {
  newSignupFlow: process.env.NEXT_PUBLIC_NEW_SIGNUP === 'true'
};
```

## 📞 Support

### Production Support Checklist
- [ ] Monitoring setup
- [ ] Error tracking configured
- [ ] Backup strategy in place
- [ ] Rollback plan ready
- [ ] Support contact information
- [ ] Documentation updated

### Emergency Contacts
- Firebase Support: [Firebase Support](https://firebase.google.com/support)
- GitHub Issues: Create issue in repository
- Team Contact: [Your team contact information]

---

**Deployment Status**: ✅ Ready for Production  
**Last Updated**: December 2024  
**Version**: 1.0.0








