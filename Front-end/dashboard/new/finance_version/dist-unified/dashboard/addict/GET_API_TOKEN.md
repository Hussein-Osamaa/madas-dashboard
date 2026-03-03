# How to Get Your API Token

## Step-by-Step Instructions

### Step 1: Open XDIGIX Dashboard
1. Go to: `https://madas-store.web.app` (or your dashboard URL)
2. **Log in** to your account

### Step 2: Navigate to External Website Settings
1. In the sidebar, click **"E-commerce"**
2. Click **"External Website"**

### Step 3: Find Your API Token
1. Scroll down to the **"Outbound API (External reads from XDIGIX)"** section
2. Look for the **"API Token"** field
3. You'll see one of two things:
   - **If token exists**: Click the **"Copy"** button next to it
   - **If no token**: Click the **"Generate"** button to create one, then copy it

### Step 4: Add Token to Website
1. Open `index.html` in a text editor
2. Find **line 208** (look for `apiToken: 'YOUR_API_TOKEN_HERE'`)
3. Replace `YOUR_API_TOKEN_HERE` with your actual token
4. **Save** the file

### Example:
**Before:**
```javascript
apiToken: 'YOUR_API_TOKEN_HERE',
```

**After:**
```javascript
apiToken: 'abc123xyz789secret_token_here',
```

## Visual Guide

```
XDIGIX Dashboard
├── E-commerce (click this)
    └── External Website (click this)
        └── Outbound API section
            └── API Token field
                └── [Copy] or [Generate] button
```

## Quick Check

After adding your token, the configuration should look like:

```javascript
const XDIGIX_CONFIG = {
    tenantId: '91FMZUAsbY3QggZ3oPko',
    apiToken: 'your-actual-token-here',  // ✅ Should have your real token
    baseUrl: 'https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko',
    webhookUrl: 'https://us-central1-madas-store.cloudfunctions.net/api/external/91FMZUAsbY3QggZ3oPko/webhook',
    webhookSecret: 'SgJv6LpreG3bhF-aQSqISIhCQkEEwKQY_G2GdAM9Htc'
};
```

## Still Can't Find It?

1. Make sure you're logged into the correct XDIGIX account
2. Check that "External Website" page is enabled for your account
3. If you don't see the page, you may need admin permissions
4. Try refreshing the dashboard page

---

**Once you add the token, refresh your website and products should load! 🎉**

