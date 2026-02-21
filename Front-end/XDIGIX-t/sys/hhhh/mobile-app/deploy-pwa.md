# PWA Deployment Guide

## Quick Deployment Options

### 1. Vercel (Recommended - Free)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from mobile-app directory
cd mobile-app
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: madas-mobile
# - Directory: ./
# - Override settings? No
```

### 2. Netlify (Free)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd mobile-app
netlify deploy --prod --dir .
```

### 3. Firebase Hosting (Free)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and init
firebase login
firebase init hosting

# Deploy
firebase deploy
```

## Manual Deployment Steps

1. **Build the app** (optimize for production)
2. **Upload files** to web server
3. **Configure HTTPS** (required for PWA)
4. **Test on mobile devices**

## Mobile Testing URLs
After deployment, you'll get URLs like:
- Vercel: `https://madas-mobile.vercel.app`
- Netlify: `https://madas-mobile.netlify.app`
- Firebase: `https://madas-mobile.web.app`

## PWA Installation
1. Open URL on mobile device
2. Look for "Add to Home Screen" prompt
3. Or manually: Menu > Add to Home Screen
4. App will install like native app

