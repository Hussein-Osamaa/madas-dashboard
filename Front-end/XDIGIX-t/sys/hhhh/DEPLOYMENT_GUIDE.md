# MADAS Dashboard - Deployment Guide 🚀

## 📋 Table of Contents
1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Options](#deployment-options)
4. [Firebase Hosting Deployment (Recommended)](#firebase-hosting-deployment-recommended)
5. [Alternative Deployments](#alternative-deployments)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Overview

**Application Type**: Multi-tenant SaaS Dashboard
**Tech Stack**: HTML5, JavaScript (ES6+), Tailwind CSS, Firebase
**Backend**: Node.js/Express (separate deployment)
**Database**: Firebase Firestore
**Authentication**: Firebase Auth
**Current Status**: Production Ready (with pre-deployment fixes needed)

---

## Pre-Deployment Checklist

### ⚠️ CRITICAL SECURITY FIXES (MUST DO FIRST)

#### 1. Remove Exposed Credentials
```bash
# Navigate to parent directory
cd /Users/mac/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/dashboard/new/sys/

# Remove .env from tracking (if in git)
git rm --cached .env

# Add .env to .gitignore
echo ".env" >> .gitignore
echo "node_modules/" >> .gitignore
echo "*/node_modules/" >> .gitignore
```

**Then**, regenerate your email app password:
1. Go to Google Account Settings
2. Security → 2-Step Verification → App passwords
3. Generate new app password
4. Store in environment variables (NOT in code)

#### 2. Clean Up Debug Code

**Option A: Manual Cleanup** (Recommended for production)
```bash
# Remove console.log statements across all JS files
find ./js -name "*.js" -type f -exec sed -i '' '/console\.log/d' {} \;
find ./pages -name "*.js" -type f -exec sed -i '' '/console\.log/d' {} \;
```

**Option B: Conditional Logging** (Keep for staging)
Create `js/logger.js`:
```javascript
const IS_PRODUCTION = window.location.hostname !== 'localhost';

export const logger = {
    log: (...args) => {
        if (!IS_PRODUCTION) {
            console.log(...args);
        }
    },
    error: (...args) => {
        if (!IS_PRODUCTION) {
            console.error(...args);
        }
        // Send to error tracking service in production
    },
    warn: (...args) => {
        if (!IS_PRODUCTION) {
            console.warn(...args);
        }
    }
};
```

Then replace `console.log` with `logger.log` throughout.

#### 3. Remove Unnecessary Files

```bash
# Remove node_modules from subdirectories (not needed for web deployment)
rm -rf mobile-app/node_modules
rm -rf multi-tenancy/node_modules

# Remove any backup or temporary files
find . -name "*.bak" -delete
find . -name ".DS_Store" -delete
find . -name "Thumbs.db" -delete
```

---

## Deployment Options

### 🥇 Recommended: Firebase Hosting

**Pros**:
- ✅ Same Firebase project (seamless integration)
- ✅ Free tier: 10 GB storage, 360 MB/day bandwidth
- ✅ Automatic SSL/TLS
- ✅ Global CDN
- ✅ Custom domain support
- ✅ Instant rollbacks
- ✅ Preview channels for staging

**Cons**:
- ⚠️ Requires Firebase CLI installation

---

### 🥈 Alternative: Vercel

**Pros**:
- ✅ Zero-config deployment
- ✅ Automatic HTTPS
- ✅ Serverless functions support
- ✅ Preview deployments from Git

**Cons**:
- ⚠️ Separate from Firebase (requires CORS setup)

---

### 🥉 Alternative: Netlify

**Pros**:
- ✅ Easy drag-and-drop deployment
- ✅ Form handling built-in
- ✅ Split testing

**Cons**:
- ⚠️ May need additional configuration for SPA routing

---

## Firebase Hosting Deployment (Recommended)

### Step 1: Install Firebase CLI

```bash
# Install globally
npm install -g firebase-tools

# Verify installation
firebase --version
```

### Step 2: Login to Firebase

```bash
firebase login
```

This will open your browser to authenticate with your Google account.

### Step 3: Initialize Firebase (Already Done)

The `firebase.json` and `.firebaserc` files are already configured for you!

**Config Summary**:
- **Project**: `madas-store`
- **Public directory**: `.` (current directory)
- **Ignores**: node_modules, mobile-app, multi-tenancy, markdown files
- **Rewrites**: All routes to index.html (SPA routing)
- **Caching**:
  - Images: 1 year
  - JS/CSS: 1 day
  - HTML: 1 hour

### Step 4: Test Locally (Optional but Recommended)

```bash
# Navigate to Dashboard directory
cd /Users/mac/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/dashboard/new/sys/Dashboard/

# Start Firebase emulator
firebase serve

# Open in browser
# http://localhost:5000
```

Test:
- ✅ Login/logout works
- ✅ Multi-tenancy works (switch businesses)
- ✅ Permissions are enforced
- ✅ All pages load correctly
- ✅ Navigation works
- ✅ Firebase operations succeed

### Step 5: Deploy to Firebase Hosting

```bash
# Deploy (from Dashboard directory)
firebase deploy --only hosting

# Output will show:
# ✔  Deploy complete!
# Project Console: https://console.firebase.google.com/project/madas-store/overview
# Hosting URL: https://madas-store.web.app
```

**Your dashboard will be live at**:
- Default: `https://madas-store.web.app`
- Alternative: `https://madas-store.firebaseapp.com`

### Step 6: Custom Domain (Optional)

```bash
# Add custom domain through Firebase Console
# OR via CLI:
firebase hosting:channel:deploy your-channel-name
```

**Steps in Firebase Console**:
1. Go to: https://console.firebase.google.com/project/madas-store/hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., `dashboard.madas.com`)
4. Follow DNS verification steps
5. Wait for SSL certificate (15 minutes - 24 hours)

---

## Alternative Deployments

### Option 2: Vercel Deployment

#### Step 1: Create `vercel.json`

```json
{
  "version": 2,
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### Step 2: Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

### Option 3: Netlify Deployment

#### Step 1: Create `netlify.toml`

```toml
[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

#### Step 2: Deploy

**Option A: Drag and Drop**
1. Go to https://app.netlify.com/drop
2. Drag the Dashboard folder
3. Done!

**Option B: CLI**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir .
```

---

### Option 4: GitHub Pages (Free)

#### Step 1: Create `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./Dashboard
```

#### Step 2: Enable GitHub Pages

1. Repository Settings → Pages
2. Source: gh-pages branch
3. Save

**URL**: `https://yourusername.github.io/repository-name/`

---

## Post-Deployment

### 1. Verify Firebase Security Rules

**Firestore Rules** (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Check if user is owner
    function isOwner(businessId) {
      return get(/databases/$(database)/documents/businesses/$(businessId)).data.owner.userId == request.auth.uid;
    }

    // Helper: Check if user has permission
    function hasPermission(businessId, permission) {
      let staffDoc = get(/databases/$(database)/documents/businesses/$(businessId)/staff/$(request.auth.uid));
      return permission in staffDoc.data.permissions;
    }

    // Businesses collection
    match /businesses/{businessId} {
      allow read: if request.auth != null &&
        (isOwner(businessId) || exists(/databases/$(database)/documents/businesses/$(businessId)/staff/$(request.auth.uid)));

      allow write: if request.auth != null && isOwner(businessId);

      // Staff sub-collection
      match /staff/{staffId} {
        allow read: if request.auth != null &&
          (isOwner(businessId) || hasPermission(businessId, 'staff_view'));

        allow create: if request.auth != null &&
          (isOwner(businessId) || hasPermission(businessId, 'staff_create'));

        allow update: if request.auth != null &&
          (isOwner(businessId) || hasPermission(businessId, 'staff_update'));

        allow delete: if request.auth != null &&
          (isOwner(businessId) || hasPermission(businessId, 'staff_delete'));
      }

      // Products sub-collection
      match /products/{productId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null &&
          (isOwner(businessId) || hasPermission(businessId, 'product_create'));
      }

      // Add similar rules for other collections...
    }
  }
}
```

**Deploy rules**:
```bash
firebase deploy --only firestore:rules
```

### 2. Set Up Environment Variables

If you need backend environment variables, configure them in your hosting platform:

**Firebase Functions**:
```bash
firebase functions:config:set email.user="your@email.com" email.password="your-app-password"
```

**Vercel**:
```bash
vercel env add EMAIL_USER production
vercel env add EMAIL_PASSWORD production
```

**Netlify**:
Site Settings → Build & deploy → Environment → Add variable

### 3. Test Production Environment

**Checklist**:
- [ ] Can access dashboard at production URL
- [ ] Login/logout works
- [ ] Firebase authentication works
- [ ] Firestore operations work
- [ ] Multi-tenancy works (test with 2+ businesses)
- [ ] Permissions are enforced correctly
- [ ] All pages load without errors
- [ ] Images/assets load correctly
- [ ] Mobile responsive design works
- [ ] Dark mode works
- [ ] No console errors in browser
- [ ] SSL certificate is active (🔒 in browser)

### 4. Set Up Monitoring

**Google Analytics** (Add to `index.html` before `</head>`):
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Firebase Performance Monitoring**:
```html
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-performance.js"></script>
<script>
  const perf = firebase.performance();
</script>
```

**Error Tracking** (Sentry.io):
```html
<script src="https://js.sentry-cdn.com/YOUR-KEY.min.js" crossorigin="anonymous"></script>
<script>
  Sentry.init({
    dsn: 'YOUR_DSN',
    environment: 'production'
  });
</script>
```

### 5. Configure Backup Strategy

**Firestore Backup** (Google Cloud Console):
1. Go to Firestore → Import/Export
2. Set up scheduled exports to Cloud Storage
3. Schedule: Daily at 2 AM UTC

**Alternative**: Firebase CLI backup script
```bash
# Create backup script: backup.sh
#!/bin/bash
gcloud firestore export gs://madas-store-backups/$(date +%Y%m%d)
```

---

## Troubleshooting

### Issue: "Permission Denied" on Deployment

**Solution**:
```bash
# Re-authenticate
firebase login --reauth

# Verify project
firebase projects:list

# Ensure you're using correct project
firebase use madas-store
```

### Issue: 404 Errors on Page Refresh

**Cause**: SPA routing not configured
**Solution**: Check `firebase.json` has:
```json
"rewrites": [
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```

### Issue: Firebase "Quota Exceeded"

**Free Tier Limits**:
- Storage: 10 GB
- Transfer: 360 MB/day
- Builds: 100/day

**Solution**: Upgrade to Blaze (pay-as-you-go) plan

### Issue: Slow Page Load

**Solutions**:
1. **Enable Compression** (already in `firebase.json`)
2. **Optimize Images**: Use WebP format
3. **Lazy Load**: Defer non-critical JS
4. **CDN Caching**: Verify headers are set correctly

### Issue: Firebase Authentication Fails

**Check**:
1. Authorized domains in Firebase Console
   - Go to Authentication → Settings → Authorized domains
   - Add your production domain

2. CORS settings
   - Ensure Firebase API allows requests from your domain

### Issue: Environment Variables Not Working

**Firebase**:
```bash
# Check current config
firebase functions:config:get

# Set missing variables
firebase functions:config:set var.name="value"
```

**Vercel/Netlify**:
- Check environment variables in dashboard
- Redeploy after adding variables

---

## Quick Reference Commands

### Firebase Hosting

```bash
# Login
firebase login

# Test locally
firebase serve

# Deploy
firebase deploy --only hosting

# View logs
firebase hosting:channel:list

# Rollback (if needed)
firebase hosting:channel:delete CHANNEL_ID

# Check deploy history
firebase hosting:releases:list
```

### Status Check

```bash
# Check if deployed
curl -I https://madas-store.web.app

# Check SSL
curl -vI https://madas-store.web.app 2>&1 | grep "SSL certificate"

# Test specific page
curl https://madas-store.web.app/login.html
```

---

## Deployment URLs

After successful deployment:

| Platform | Default URL | Custom Domain |
|----------|-------------|---------------|
| **Firebase** | `https://madas-store.web.app` | Configure in Console |
| **Vercel** | `https://your-project.vercel.app` | Add in Settings |
| **Netlify** | `https://your-site.netlify.app` | Add in Domain Settings |
| **GitHub Pages** | `https://username.github.io/repo` | Configure CNAME |

---

## Next Steps After Deployment

1. **Share dashboard URL** with team
2. **Create user documentation** for staff
3. **Set up backup schedule** (daily recommended)
4. **Monitor performance** (Firebase Performance, Google Analytics)
5. **Plan for scaling** (upgrade Firebase plan if needed)
6. **Set up staging environment** (Firebase hosting channels)
7. **Implement CI/CD** (auto-deploy on git push)
8. **Create rollback procedure** documentation

---

## Support Resources

- **Firebase Documentation**: https://firebase.google.com/docs/hosting
- **Firebase Console**: https://console.firebase.google.com/project/madas-store
- **Vercel Docs**: https://vercel.com/docs
- **Netlify Docs**: https://docs.netlify.com

---

## 🎉 Congratulations!

Your MADAS Dashboard is now deployed and accessible to users worldwide!

**Deployed URL**: `https://madas-store.web.app` (or your custom domain)

**Reminder**: Keep your Firebase API keys secure with proper Firestore security rules, and monitor usage to stay within free tier limits.

---

**Last Updated**: October 26, 2025
**Version**: 1.0 - Initial Production Release
**Status**: ✅ Production Ready
