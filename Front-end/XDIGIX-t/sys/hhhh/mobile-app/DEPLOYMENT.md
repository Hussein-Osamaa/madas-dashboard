# MADAS Mobile App Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: PWA Hosting (Recommended for Testing)

#### 1. Build the App
```bash
cd mobile-app
npm run build:prod
```

#### 2. Deploy to Vercel (Free & Fast)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### 3. Deploy to Netlify (Free)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir dist
```

#### 4. Deploy to Firebase Hosting (Free)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and init
firebase login
firebase init hosting

# Deploy
firebase deploy
```

### Option 2: Native iOS App for TestFlight

#### Prerequisites
- macOS with Xcode 14+
- Apple Developer Account ($99/year)
- Node.js 16+

#### Step 1: Install Capacitor
```bash
cd mobile-app
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

#### Step 2: Initialize Capacitor
```bash
npx cap init "MADAS Mobile" "com.madas.mobile"
npx cap add ios
```

#### Step 3: Build and Sync
```bash
npm run build:prod
npx cap sync ios
```

#### Step 4: Open in Xcode
```bash
npx cap open ios
```

#### Step 5: Configure in Xcode
1. **Bundle Identifier**: `com.madas.mobile`
2. **Display Name**: `MADAS Mobile`
3. **Version**: `1.0.0`
4. **Build**: `1`
5. **Team**: Select your Apple Developer Team
6. **Signing**: Configure code signing

#### Step 6: Archive and Upload
1. In Xcode: Product > Archive
2. Select "Distribute App"
3. Choose "App Store Connect"
4. Upload to App Store Connect

#### Step 7: TestFlight Setup
1. Go to App Store Connect
2. Select your app
3. Go to TestFlight tab
4. Add internal testers
5. Add external testers (up to 10,000)

## 📱 Testing Your Deployment

### PWA Testing
1. **Get deployment URL** from your hosting platform
2. **Open on mobile device** (same network or internet)
3. **Test PWA installation**:
   - Look for "Add to Home Screen" prompt
   - Or manually: Menu > Add to Home Screen
4. **Test offline functionality**
5. **Test push notifications**

### TestFlight Testing
1. **Invite testers** via email from App Store Connect
2. **Testers install TestFlight** app from App Store
3. **Testers install your app** from TestFlight
4. **Collect feedback** and crash reports

## 🔧 Configuration

### Environment Variables
Create `.env` file:
```env
NODE_ENV=production
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
```

### PWA Manifest
Update `manifest.json`:
```json
{
  "name": "MADAS Mobile",
  "short_name": "MADAS",
  "theme_color": "#27491F",
  "background_color": "#27491F",
  "start_url": "/",
  "display": "standalone"
}
```

### Capacitor Config
Update `capacitor.config.js`:
```javascript
{
  appId: 'com.madas.mobile',
  appName: 'MADAS Mobile',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
}
```

## 🚀 Deployment Commands

### Quick Commands
```bash
# Build for production
npm run build:prod

# Deploy to Vercel
npm run deploy:vercel

# Deploy to Netlify
npm run deploy:netlify

# Deploy to Firebase
npm run deploy:firebase

# Setup iOS project
npm run ios:init

# Sync iOS project
npm run ios:sync

# Open iOS in Xcode
npm run ios:open
```

### Manual Deployment
```bash
# Build
npm run build:prod

# Upload dist/ folder to your web server
# Ensure HTTPS is enabled
# Test on mobile devices
```

## 📊 Performance Optimization

### Before Deployment
1. **Minify assets** (already done in build script)
2. **Enable compression** on server
3. **Set cache headers** for static assets
4. **Optimize images** (compress, resize)
5. **Enable HTTPS** (required for PWA)

### After Deployment
1. **Test loading speed** with PageSpeed Insights
2. **Check PWA score** with Lighthouse
3. **Test on multiple devices**
4. **Monitor crash reports** (if using TestFlight)

## 🔍 Troubleshooting

### Common Issues

#### PWA Not Installing
- Ensure HTTPS is enabled
- Check manifest.json syntax
- Verify service worker is working
- Test on different browsers

#### TestFlight Upload Fails
- Check bundle identifier is unique
- Verify code signing certificates
- Ensure all required icons are present
- Check app size limits

#### Build Fails
- Check Node.js version (16+)
- Clear node_modules and reinstall
- Check file permissions
- Verify all dependencies are installed

### Debug Mode
Add `?debug=true` to URL for debug information:
```
https://your-app.com?debug=true
```

## 📈 Monitoring

### Analytics
- **Google Analytics**: Track user behavior
- **Firebase Analytics**: App usage metrics
- **Crashlytics**: Crash reporting (iOS)

### Performance
- **Core Web Vitals**: Monitor loading performance
- **Lighthouse**: PWA and performance audits
- **TestFlight**: iOS app crash reports

## 🎯 Next Steps

### After PWA Deployment
1. **Share URL** with testers
2. **Collect feedback** on mobile experience
3. **Monitor usage** and performance
4. **Iterate** based on feedback

### After TestFlight Deployment
1. **Invite beta testers**
2. **Collect crash reports** and feedback
3. **Fix critical issues**
4. **Prepare for App Store** submission

### App Store Submission (Optional)
1. **Fill out app information**
2. **Add screenshots** and metadata
3. **Submit for review**
4. **Wait for Apple approval** (1-7 days)

## 📞 Support

For deployment issues:
- Check console logs in browser dev tools
- Review server logs
- Test on multiple devices
- Check network connectivity

For TestFlight issues:
- Check App Store Connect status
- Verify certificates and provisioning
- Review Xcode build logs
- Check Apple Developer forums

