# Backend API Deployment - Fix CORS & localhost Issues

## 🔴 Problem Summary

Your dashboard is deployed to `https://madas-store.web.app`, but it's trying to call:
```
http://localhost:3000/api/login  ❌ Only works locally!
```

**Errors**:
- CORS policy blocked
- Failed to fetch (localhost not accessible from internet)
- Invalid JSON response (receiving HTML instead)

---

## ✅ Solution: Deploy Backend to Production

You have **3 options** to fix this:

---

## Option 1: Firebase Functions (Recommended - Same Project)

### Step 1: Initialize Firebase Functions

```bash
cd /Users/mac/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/dashboard/new/sys

# Initialize functions
firebase init functions

# Select:
# - Use existing project (madas-store)
# - JavaScript
# - ESLint: No
# - Install dependencies: Yes
```

### Step 2: Move Your Express App to Functions

Create `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

admin.initializeApp();

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'https://madas-store.web.app',
    'https://madas-store.firebaseapp.com',
    'http://localhost:5000',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Email configuration (from environment)
const emailConfig = {
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.password
  }
};

// Your existing API routes
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Your login logic here
    // Use Firebase Admin SDK for authentication

    res.json({ success: true, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/send-invitation', async (req, res) => {
  try {
    const { toEmail, staffName, businessName, inviterName, setupUrl } = req.body;

    const transporter = nodemailer.createTransport(emailConfig);

    const mailOptions = {
      from: emailConfig.auth.user,
      to: toEmail,
      subject: `You've been invited to join ${businessName}`,
      html: `
        <h2>Welcome to ${businessName}!</h2>
        <p>${inviterName} has invited you to join their team.</p>
        <p><a href="${setupUrl}">Click here to set up your account</a></p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Invitation sent' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export Express app as Cloud Function
exports.api = functions.https.onRequest(app);
```

### Step 3: Set Environment Variables

```bash
# Set email credentials
firebase functions:config:set email.user="hesainosama@gmail.com"
firebase functions:config:set email.password="YOUR_NEW_APP_PASSWORD"

# View config
firebase functions:config:get
```

### Step 4: Deploy Functions

```bash
firebase deploy --only functions
```

**Your API will be at**: `https://us-central1-madas-store.cloudfunctions.net/api`

### Step 5: Update Frontend API URLs

Update `login.html` around line 505:

```javascript
// BEFORE (localhost)
const apiEndpoints = [
  'http://localhost:3000/api/login',
  '/api/login'
];

// AFTER (production)
const apiEndpoints = [
  'https://us-central1-madas-store.cloudfunctions.net/api/api/login',
  '/api/login'
];
```

**Better Approach** - Use environment detection:

```javascript
const isProduction = window.location.hostname !== 'localhost';
const API_BASE = isProduction
  ? 'https://us-central1-madas-store.cloudfunctions.net/api'
  : 'http://localhost:3000';

const apiEndpoints = [
  `${API_BASE}/api/login`,
  '/api/login'
];
```

---

## Option 2: Railway.app (Separate Backend Hosting)

### Step 1: Sign Up for Railway

1. Go to https://railway.app
2. Sign up with GitHub
3. Create new project

### Step 2: Deploy Your Backend

```bash
cd /Users/mac/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/dashboard/new/sys

# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Link to project
railway link

# Deploy
railway up
```

### Step 3: Set Environment Variables

In Railway dashboard:
- Go to your project
- Click "Variables"
- Add:
  - `EMAIL_USER`: hesainosama@gmail.com
  - `EMAIL_PASSWORD`: your-app-password
  - `PORT`: 3000

### Step 4: Get Your Production URL

Railway will give you a URL like: `https://your-app.up.railway.app`

### Step 5: Update CORS in server.js

```javascript
// server.js
const cors = require('cors');

app.use(cors({
  origin: [
    'https://madas-store.web.app',
    'https://madas-store.firebaseapp.com',
    'http://localhost:5000'
  ],
  credentials: true
}));
```

### Step 6: Update Frontend API URLs

```javascript
const API_BASE = 'https://your-app.up.railway.app';

const apiEndpoints = [
  `${API_BASE}/api/login`,
  '/api/login'
];
```

---

## Option 3: Render.com (Free Tier Available)

### Step 1: Create Account

1. Go to https://render.com
2. Sign up with GitHub
3. Connect your repository

### Step 2: Create Web Service

1. Click "New +"
2. Select "Web Service"
3. Connect your Git repo
4. Configure:
   - **Name**: madas-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free

### Step 3: Add Environment Variables

In Render dashboard:
- EMAIL_USER
- EMAIL_PASSWORD
- PORT (leave as default)

### Step 4: Get Your URL

Render gives you: `https://madas-backend.onrender.com`

### Step 5: Update Frontend

```javascript
const API_BASE = 'https://madas-backend.onrender.com';
```

---

## 🚀 Recommended Quick Fix (Option 1)

**Use Firebase Functions** - It's the fastest and integrates seamlessly:

```bash
# 1. Navigate to sys directory
cd /Users/mac/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/dashboard/new/sys

# 2. Initialize functions
firebase init functions

# 3. Copy your server.js code to functions/index.js (modified for Cloud Functions)

# 4. Set environment variables
firebase functions:config:set email.user="hesainosama@gmail.com"
firebase functions:config:set email.password="NEW_APP_PASSWORD"

# 5. Deploy
firebase deploy --only functions

# 6. Update login.html API URLs to:
# https://us-central1-madas-store.cloudfunctions.net/api/api/login

# 7. Redeploy dashboard
cd Dashboard
firebase deploy --only hosting
```

**Total time**: 15-20 minutes

---

## 📝 Update Login.html API Detection

Create a configuration file to handle environment detection:

**Create `js/api-config.js`**:

```javascript
// API Configuration
const API_CONFIG = {
  production: {
    baseURL: 'https://us-central1-madas-store.cloudfunctions.net/api',
    endpoints: {
      login: '/api/login',
      sendInvitation: '/api/send-invitation'
    }
  },
  development: {
    baseURL: 'http://localhost:3000',
    endpoints: {
      login: '/api/login',
      sendInvitation: '/api/send-invitation'
    }
  }
};

// Detect environment
const isProduction = window.location.hostname !== 'localhost' &&
                     window.location.hostname !== '127.0.0.1';

const currentConfig = isProduction ? API_CONFIG.production : API_CONFIG.development;

// Export API helper
window.API = {
  getURL: (endpoint) => {
    return `${currentConfig.baseURL}${currentConfig.endpoints[endpoint] || endpoint}`;
  },

  async call(endpoint, options = {}) {
    const url = this.getURL(endpoint);
    console.log(`🔗 Calling API: ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ API call failed for ${endpoint}:`, error);
      throw error;
    }
  }
};
```

**Then update `login.html`**:

```html
<!-- Add before closing </head> -->
<script src="js/api-config.js"></script>
```

**And use it in your login form**:

```javascript
// Instead of hardcoded URLs
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const result = await window.API.call('login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (result.success) {
      console.log('✅ Login successful');
      // Handle success
    }
  } catch (error) {
    console.error('❌ Login failed:', error);
    // Handle error
  }
});
```

---

## 🔍 Testing Your Fix

### After deploying backend:

1. **Check Function is Live**:
   ```bash
   curl https://us-central1-madas-store.cloudfunctions.net/api/api/login \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test"}'
   ```

2. **Test CORS**:
   Open browser console on your deployed site:
   ```javascript
   fetch('https://us-central1-madas-store.cloudfunctions.net/api/api/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: 'test@test.com', password: 'test' })
   }).then(r => r.json()).then(console.log)
   ```

3. **Verify No CORS Errors**:
   - Should see response, not CORS error
   - Check Network tab in DevTools

---

## ✅ Checklist

After deploying backend:

- [ ] Backend deployed to Firebase Functions / Railway / Render
- [ ] Environment variables set (email credentials)
- [ ] CORS configured to allow your frontend domain
- [ ] API URLs updated in frontend code
- [ ] Frontend redeployed with new API URLs
- [ ] Tested login from production site
- [ ] No CORS errors in console
- [ ] API returns JSON (not HTML)

---

## 🎯 Summary

**The Issue**: Deployed frontend calling `localhost:3000` (doesn't exist in production)

**The Fix**: Deploy backend separately and update API URLs

**Best Option**: Firebase Functions (same project, easy CORS, free tier)

**Time Required**: 15-20 minutes

---

## 📞 Need Help?

If you encounter issues:

1. **Check Firebase Functions logs**:
   ```bash
   firebase functions:log
   ```

2. **Test function directly**:
   ```bash
   curl YOUR_FUNCTION_URL
   ```

3. **Verify CORS headers**:
   ```bash
   curl -I YOUR_FUNCTION_URL
   ```

---

**Next Steps**: Choose one of the 3 options above and deploy your backend!
