# Website Hosting Setup Guide

## Overview
Your websites are now hosted on your React application domain. When you publish a website, it becomes accessible at:
- `https://your-domain.com/site/{siteId}`
- Or via custom domain (if configured)

## How It Works

### 1. Publishing a Website
When you publish a website:
- The website is saved to Firebase with status "published"
- A public URL is generated: `{your-domain}/site/{siteId}`
- The website becomes immediately accessible

### 2. Accessing Published Websites
- **Default URL**: `https://your-domain.com/site/{siteId}`
- **Custom Domain**: If you configure a custom domain, it will work once DNS is set up

### 3. Custom Domain Setup

#### Step 1: Add Custom Domain in Publish Modal
1. Go to Website Builder
2. Click "Publish"
3. Select "Published" status
4. Enter your custom domain (e.g., `mystore.com` or `store.madas.store`)
5. Click "Publish Now"

#### Step 2: Configure DNS
For your custom domain to work, you need to point it to your hosting:

**Option A: CNAME Record (Recommended)**
```
Type: CNAME
Name: @ (or subdomain like www, store)
Value: your-firebase-hosting-domain.firebaseapp.com
```

**Option B: A Record**
```
Type: A
Name: @
Value: [Your hosting IP address]
```

#### Step 3: Verify Domain
After DNS propagation (usually 24-48 hours), your custom domain will work.

## Firebase Hosting Setup (Optional)

If you want to use Firebase Hosting for better performance:

1. **Install Firebase CLI** (if not already installed):
```bash
npm install -g firebase-tools
```

2. **Login to Firebase**:
```bash
firebase login
```

3. **Initialize Hosting** (if not already done):
```bash
firebase init hosting
```

4. **Deploy**:
```bash
firebase deploy --only hosting
```

5. **Add Custom Domain in Firebase Console**:
   - Go to Firebase Console > Hosting
   - Click "Add custom domain"
   - Follow the DNS setup instructions

## Current Setup

Your websites are currently hosted via:
- **Route**: `/site/:siteId` or `/s/:siteId`
- **Component**: `PublicWebsitePage.tsx`
- **Access**: Public (no authentication required)

## Testing

1. **Publish a website** from the Website Builder
2. **Copy the generated URL** from the Visit Store page
3. **Open in a new tab** - the website should load
4. **Share the URL** - anyone can access it

## Troubleshooting

### Website Not Loading
- Check if website status is "published"
- Verify the siteId in the URL is correct
- Check browser console for errors

### Custom Domain Not Working
- Verify DNS settings are correct
- Wait for DNS propagation (up to 48 hours)
- Check domain in Firebase Console (if using Firebase Hosting)

### 404 Error
- Ensure the website is published (status = "published")
- Check that the siteId exists in Firebase
- Verify the route is correct: `/site/{siteId}`

## Next Steps

For production, consider:
1. Setting up Firebase Hosting for better performance
2. Configuring CDN for faster global access
3. Setting up SSL certificates for custom domains
4. Implementing caching strategies
5. Adding analytics tracking

