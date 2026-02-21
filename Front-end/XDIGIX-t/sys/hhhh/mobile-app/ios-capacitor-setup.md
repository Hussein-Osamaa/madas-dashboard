# iOS Native App Setup for TestFlight

## Prerequisites
- macOS with Xcode 14+
- Apple Developer Account ($99/year)
- Node.js 16+

## Step 1: Install Capacitor
```bash
cd mobile-app
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init "MADAS Mobile" "com.madas.mobile"
```

## Step 2: Add iOS Platform
```bash
npx cap add ios
```

## Step 3: Build and Sync
```bash
# Build the web app
npm run build

# Sync with iOS project
npx cap sync ios
```

## Step 4: Configure iOS App
```bash
# Open in Xcode
npx cap open ios
```

### Xcode Configuration:
1. **Bundle Identifier**: `com.madas.mobile`
2. **Display Name**: `MADAS Mobile`
3. **Version**: `1.0.0`
4. **Build**: `1`

### Signing & Capabilities:
1. **Team**: Select your Apple Developer Team
2. **Bundle Identifier**: Must be unique
3. **Capabilities**: 
   - Push Notifications
   - Camera (for barcode scanning)
   - Location (if needed)

## Step 5: Build for Distribution
1. In Xcode: Product > Archive
2. Select "Distribute App"
3. Choose "App Store Connect"
4. Upload to App Store Connect

## Step 6: TestFlight Setup
1. Go to App Store Connect
2. Select your app
3. Go to TestFlight tab
4. Add internal testers
5. Add external testers (up to 10,000)

## Step 7: Testing
1. Invite testers via email
2. Testers install TestFlight app
3. Testers install your app from TestFlight
4. Provide feedback and crash reports

## App Store Submission (Optional)
1. Fill out app information
2. Add screenshots and metadata
3. Submit for review
4. Wait for Apple approval

## Development Workflow
```bash
# Make changes to web app
npm run build
npx cap sync ios

# Test on simulator
npx cap run ios

# Test on device
npx cap run ios --target="Your Device Name"

# Build for TestFlight
npx cap open ios
# Then Archive in Xcode
```

## Common Issues
- **Code signing**: Ensure proper team and certificates
- **Bundle ID**: Must match App Store Connect
- **Capabilities**: Add required permissions
- **Icons**: Include all required sizes
- **Splash screen**: Configure in Capacitor
