# How to Set Up Addict Website with XDIGIX

## Step-by-Step Setup Guide

### Step 1: Get Your XDIGIX API Credentials

1. **Log in to XDIGIX Dashboard**
   - Go to your XDIGIX dashboard
   - URL: `https://madas-store.web.app` (or your dashboard URL)

2. **Navigate to External Website Settings**
   - Click on **E-commerce** in the sidebar
   - Click on **External Website**

3. **Enable the Integration**
   - Toggle **"Enable integration"** to ON
   - Fill in:
     - **External Website Name**: `Addict Website`
     - **External Website Base URL**: `https://your-domain.com` (or your website URL)

4. **Get Your API Token**
   - In the **"Outbound API"** section:
     - Click **"Generate"** to create a new API token (or copy existing one)
     - Copy the token (it will look like: `abc123xyz...`)

5. **Get Your Webhook Secret**
   - In the **"Inbound Webhook"** section:
     - Click **"Generate"** to create a new webhook secret (or copy existing one)
     - Copy the secret (it will look like: `secret123...`)

6. **Enable Event Types**
   - Make sure these events are enabled (checked):
     - ✅ `order.created`
     - ✅ `order.updated`
   - You can enable others if needed

7. **Click "Save"** to save your configuration

---

### Step 2: Configure the Addict Website

1. **Open the website files**
   - Navigate to: `sys/apps/dashboard/public/addict/`
   - Open `index.html` in a code editor

2. **Find the Configuration Section**
   - Look for this code (around line 200):
   ```javascript
   const XDIGIX_CONFIG = {
       tenantId: '91FMZUAsbY3QggZ3oPko',
       apiToken: 'YOUR_API_TOKEN_HERE',
       baseUrl: 'https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko',
       webhookUrl: 'https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko/webhook',
       webhookSecret: 'YOUR_WEBHOOK_SECRET_HERE'
   };
   ```

3. **Replace the Placeholders**
   - Replace `YOUR_API_TOKEN_HERE` with the API token you copied
   - Replace `YOUR_WEBHOOK_SECRET_HERE` with the webhook secret you copied
   
   Example:
   ```javascript
   const XDIGIX_CONFIG = {
       tenantId: '91FMZUAsbY3QggZ3oPko',
       apiToken: 'abc123xyz789secret',
       baseUrl: 'https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko',
       webhookUrl: 'https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko/webhook',
       webhookSecret: 'my_webhook_secret_123'
   };
   ```

4. **Save the file**

---

### Step 3: Test Locally

1. **Open the website**
   - Double-click `index.html` to open in your browser
   - OR use a local server:
     ```bash
     # If you have Python installed:
     cd sys/apps/dashboard/public/addict
     python -m http.server 8000
     # Then open: http://localhost:8000
     
     # If you have Node.js installed:
     npx serve .
     ```

2. **Check if products load**
   - You should see products from your XDIGIX store
   - If you see "Loading products..." forever, check:
     - Browser console (F12) for errors
     - API token is correct
     - Products exist in your XDIGIX store

3. **Test the cart**
   - Click "Add to Cart" on a product
   - Click the cart icon (top right)
   - Verify items appear in cart

4. **Test checkout**
   - Add items to cart
   - Click "Checkout"
   - Check XDIGIX dashboard → External Website → Event History
   - You should see a new `order.created` event

---

### Step 4: Deploy the Website

#### Option A: Firebase Hosting (Recommended)

1. **Install Firebase CLI** (if not installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in the addict folder**:
   ```bash
   cd sys/apps/dashboard/public/addict
   firebase init hosting
   ```
   - Select your Firebase project
   - Set public directory to: `.` (current directory)
   - Configure as single-page app: `No`
   - Don't overwrite index.html: `No`

4. **Deploy**:
   ```bash
   firebase deploy --only hosting
   ```

5. **Your website will be live at**:
   - `https://your-project-id.web.app`
   - Or your custom domain if configured

#### Option B: Netlify

1. **Go to** [netlify.com](https://netlify.com) and sign up/login

2. **Drag and drop** the `addict` folder to Netlify dashboard

3. **Your website will be live** at a Netlify URL

#### Option C: Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   cd sys/apps/dashboard/public/addict
   vercel
   ```

3. **Follow the prompts** and your site will be live

#### Option D: Any Web Server

1. **Upload** all files in the `addict` folder to your web server
2. **Make sure** `index.html` is in the root directory
3. **Access** via your domain name

---

### Step 5: Verify Integration

1. **Check Products Load**
   - Visit your deployed website
   - Products from XDIGIX should display

2. **Test Order Creation**
   - Add products to cart
   - Complete checkout
   - Go to XDIGIX Dashboard → External Website
   - Check "Webhook Event History"
   - You should see the `order.created` event

3. **Check Orders in MADAS**
   - Go to XDIGIX Dashboard → Orders
   - The order should appear there

---

## Troubleshooting

### Products Not Loading

**Problem**: Website shows "Loading products..." forever

**Solutions**:
1. Open browser console (F12) → Check for errors
2. Verify API token is correct in `index.html`
3. Check that products exist in XDIGIX → Inventory → Products
4. Verify tenant ID is correct: `91FMZUAsbY3QggZ3oPko`
5. Check network tab in browser console for API request status

### Webhook Not Working

**Problem**: Orders not appearing in MADAS

**Solutions**:
1. Check webhook secret is correct
2. Verify webhook is enabled in MADAS dashboard
3. Check "Event History" in External Website page
4. Look for error messages in event history
5. Verify `order.created` event is enabled

### CORS Errors

**Problem**: Browser console shows CORS errors

**Solutions**:
1. This shouldn't happen (CORS is configured on MADAS side)
2. If it does, contact MADAS support
3. Make sure you're using HTTPS (not HTTP)

### Images Not Showing

**Problem**: Product images don't display

**Solutions**:
1. Products need `imageUrl` field in XDIGIX
2. Or `images` array with image URLs
3. Images must be publicly accessible URLs
4. Check product data in XDIGIX dashboard

---

## Quick Reference

### File Locations
- Website files: `sys/apps/dashboard/public/addict/`
- Configuration: `index.html` (line ~200)
- Styles: `styles.css`
- Logic: `app.js`

### Important URLs
- XDIGIX Dashboard: `https://madas-store.web.app`
- External Website Settings: Dashboard → E-commerce → External Website
- API Base URL: `https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko`

### Credentials Needed
- ✅ API Token (from dashboard)
- ✅ Webhook Secret (from dashboard)
- ✅ Tenant ID: `91FMZUAsbY3QggZ3oPko` (already configured)

---

## Need Help?

1. Check browser console (F12) for errors
2. Review the integration guide: `XDIGIX-Integration-Guide-*.md`
3. Check event history in XDIGIX dashboard
4. Contact XDIGIX support

---

**You're all set! Your Addict website is now connected to XDIGIX! 🎉**

