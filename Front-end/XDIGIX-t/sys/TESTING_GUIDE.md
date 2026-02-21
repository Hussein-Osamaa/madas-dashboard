# MADAS Testing Guide

## 🚀 Quick Start

### **Start the Server:**
```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys/marketing-website-standalone"
node server-simple.js
```

Server will run on: `http://localhost:3000`

---

## ✅ Complete Test Scenarios

### **Test 1: New User Complete Journey** 

#### **Step 1: Landing Page**
1. Open browser: `http://localhost:3000/`
2. **Verify:**
   - ✅ Hero section displays
   - ✅ Features section shows
   - ✅ Testimonials visible
   - ✅ "Get Started Free" button works
   - ✅ "Login" link in nav works

#### **Step 2: Registration Flow**
1. Click "Get Started Free" or "Start Free Trial"
2. **Verify redirected to:** `http://localhost:3000/signup`
3. **Fill Step 1 - Business Information:**
   - Business Name: "Test Company"
   - Industry: "Retail"
   - Email: "test@example.com"
   - Phone: "1234567890"
   - Company Size: "11-50"
   - Click "Next"
4. **Verify Step 2 appears - Plan Selection:**
   - ✅ 3 plans displayed (Basic, Professional, Enterprise)
   - ✅ Professional is pre-selected if came from pricing
   - Select "Professional" plan
   - Click "Next"
5. **Fill Step 3 - Account Setup:**
   - Name: "John Doe"
   - Email: "john@example.com"
   - Password: "Test123456!"
   - Confirm Password: "Test123456!"
   - ✅ Password strength indicator shows
   - Check "I agree to Terms & Privacy Policy"
   - Click "Next"
6. **Step 4 - Free Trial:**
   - Click "Start 14-Day Free Trial"
7. **Verify Success:**
   - ✅ Redirected to `/signup-success`
   - ✅ Confetti animation plays
   - ✅ Success message shows
   - ✅ "Go to Dashboard" button appears
8. Click "Go to Dashboard"
9. **Verify:**
   - ✅ Redirected to `/dashboard`
   - ✅ Dashboard loads completely
   - ✅ Welcome message shows user name
   - ✅ All navigation items visible

**Expected Console Output:**
```
📝 Registration Data Received:
Business: Test Company retail 11-50
Contact: test@example.com 1234567890
Plan: professional
User: John Doe john@example.com
✅ Registration completed successfully
📊 Business ID: business_1234567890
👤 User ID: user_1234567890
🎯 Plan: professional
📅 Trial ends: [date]
```

---

### **Test 2: Existing User Login**

#### **Step 1: Navigate to Login**
1. Open: `http://localhost:3000/`
2. Click "Login" in navigation
3. **Verify redirected to:** `http://localhost:3000/login`

#### **Step 2: Login Form**
1. Enter Email: "john@example.com"
2. Enter Password: "Test123456!"
3. Check "Remember me" (optional)
4. Click "Sign In"
5. **Verify:**
   - ✅ Loading spinner appears
   - ✅ "Signing you in..." message
   - ✅ Success message with checkmark
   - ✅ "Welcome back!" message

#### **Step 3: Dashboard Access**
1. **Verify after 2 seconds:**
   - ✅ Redirected to `/dashboard`
   - ✅ Dashboard loads
   - ✅ User data populated from localStorage

**Expected Console Output:**
```
🔐 Login attempt: { email: 'john@example.com', rememberMe: true }
✅ Login successful for: john@example.com
```

**Check localStorage:**
```javascript
// Open DevTools Console (F12)
console.log(localStorage.getItem('madasUser'));
console.log(localStorage.getItem('madasBusiness'));
```

Should show user and business data.

---

### **Test 3: Unauthorized Dashboard Access**

#### **Scenario: No Authentication**
1. Open DevTools Console (F12)
2. Clear localStorage:
   ```javascript
   localStorage.clear();
   ```
3. Try to access: `http://localhost:3000/dashboard`
4. **Verify:**
   - ✅ Immediately redirected to `/login`
   - ✅ No errors in console
   - ✅ Clean redirect (not 404)

#### **Scenario: Invalid Session**
1. Set invalid data in localStorage:
   ```javascript
   localStorage.setItem('madasUser', 'invalid');
   ```
2. Try to access: `http://localhost:3000/dashboard`
3. **Verify:**
   - ✅ Redirected to `/login`
   - ✅ localStorage cleared

---

### **Test 4: Logout Functionality**

#### **From Dashboard:**
1. Login successfully
2. Navigate to: `http://localhost:3000/dashboard`
3. Click logout button (top right)
4. **Verify:**
   - ✅ Redirected to `/login` (not `Login.html` or 404)
   - ✅ localStorage cleared
   - ✅ Can't access dashboard without re-login

**Check localStorage after logout:**
```javascript
console.log(localStorage.getItem('madasUser')); // Should be null
console.log(localStorage.getItem('madasBusiness')); // Should be null
```

#### **From Sub-Pages:**
1. Login and go to `/pages/orders.html`
2. Click logout
3. **Verify:** Redirected to `/login`

Repeat for:
- `/pages/products.html`
- `/pages/Customer.html`
- `/pages/analytics.html`

---

### **Test 5: No Access Page**

#### **Setup:**
1. Need Firebase setup with user permissions
2. Or temporarily modify `index.html` to simulate

#### **Test Flow:**
1. Login as user without permissions
2. **Verify redirected to:** `/no-access.html`
3. **Verify page shows:**
   - ✅ "Access Denied" message
   - ✅ Explanation text
   - ✅ "Back to Login" button
4. Click "Back to Login"
5. **Verify:** Redirected to `/login` (not `Login.html`)

---

### **Test 6: Dashboard Navigation**

#### **Prerequisites:**
- Logged in successfully
- At: `http://localhost:3000/dashboard`

#### **Test All Navigation Links:**

**Main Menu:**
1. Click "Orders" → Should load `/pages/orders.html`
2. Click "Inventory" dropdown:
   - Products → `/pages/products.html`
   - Collections → `/pages/collections.html`
   - Reviews → `/pages/product-reviews.html`
   - Low Stock → `/pages/low-stock.html`
3. Click "Customers" → `/pages/Customer.html`
4. Click "Staff" → `/pages/Admin.html`
5. Click "Web Builder" → `/E-comm/theme-library.html`
6. Click "Finance" dropdown:
   - Overview → `/pages/finance.html`
   - Expenses → `/pages/expenses.html`
   - Analytics → `/pages/analytics.html`
   - Reports → `/pages/reports.html`
   - Insights → `/pages/insights.html`

**Verify for Each:**
- ✅ Page loads without 404
- ✅ Assets load (CSS, JS, images)
- ✅ Navigation remains functional
- ✅ Logout button works → redirects to `/login`

---

### **Test 7: Marketing Website Pages**

#### **Test All Public Pages:**

1. **Landing:** `http://localhost:3000/`
   - ✅ All sections load
   - ✅ Navigation works
   - ✅ CTA buttons work

2. **Pricing:** `http://localhost:3000/pricing`
   - ✅ 3 plan tiers displayed
   - ✅ Monthly/Annual toggle works
   - ✅ "Choose Plan" buttons work
   - ✅ FAQ section appears

3. **About:** `http://localhost:3000/about`
   - ✅ Company info displays
   - ✅ Mission and values shown

4. **Contact:** `http://localhost:3000/contact`
   - ✅ Contact form displays
   - ✅ Form submission works
   - ✅ Success message appears

---

### **Test 8: API Endpoints**

#### **Test Registration API:**
```bash
# Using curl
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Company",
    "industry": "retail",
    "businessEmail": "test@example.com",
    "phone": "1234567890",
    "companySize": "11-50",
    "plan": "professional",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "password": "Test123456!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "userId": "user_1234567890",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "business": {
    "businessId": "business_1234567890",
    "businessName": "Test Company",
    "plan": "professional",
    "trialEnds": "2025-11-28T..."
  }
}
```

#### **Test Login API:**
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Test123456!",
    "rememberMe": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": { ... },
  "business": { ... },
  "token": "token_1234567890"
}
```

#### **Test Health Check:**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "mode": "simplified",
  "timestamp": "2025-10-14T..."
}
```

---

## 🐛 Troubleshooting

### **Issue: 404 Not Found**
**Symptoms:** Pages return 404 errors

**Solutions:**
1. Check server is running: `lsof -i :3000`
2. Restart server:
   ```bash
   lsof -ti:3000 | xargs kill -9
   cd marketing-website-standalone
   node server-simple.js
   ```
3. Check file paths in server configuration

### **Issue: Redirects to Login.html**
**Symptoms:** 404 error on login redirect

**Solution:** This means a file wasn't updated. Search for:
```bash
grep -r "Login.html" /path/to/project
```
Replace any remaining instances with `/login`

### **Issue: Assets Not Loading**
**Symptoms:** Dashboard shows broken images/styles

**Solutions:**
1. Check server static file serving:
   ```javascript
   app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
   ```
2. Verify file paths are correct
3. Check browser console for specific 404s

### **Issue: localStorage Not Working**
**Symptoms:** Dashboard redirects after successful login

**Solutions:**
1. Check browser localStorage is enabled
2. Try different browser
3. Check for browser extensions blocking storage
4. Open DevTools and manually check:
   ```javascript
   localStorage.setItem('test', 'value');
   console.log(localStorage.getItem('test'));
   ```

### **Issue: Infinite Redirect Loop**
**Symptoms:** Page keeps redirecting

**Solutions:**
1. Clear localStorage: `localStorage.clear()`
2. Clear cookies
3. Check authentication logic in `index.html`
4. Check for conflicting redirects

---

## 📊 Test Results Template

```markdown
## Test Session: [Date]

### Environment
- Browser: [Chrome/Firefox/Safari]
- Server: Running on localhost:3000
- Mode: server-simple.js (mock API)

### Test Results

| Test | Status | Notes |
|------|--------|-------|
| New User Registration | ✅ PASS | All steps completed |
| Existing User Login | ✅ PASS | Redirects correctly |
| Unauthorized Access | ✅ PASS | Redirects to /login |
| Logout | ✅ PASS | Clears localStorage |
| No Access Page | ⚠️ SKIP | Requires Firebase setup |
| Dashboard Navigation | ✅ PASS | All pages load |
| Marketing Pages | ✅ PASS | No issues |
| API Endpoints | ✅ PASS | Mock data works |

### Issues Found
1. [Issue description]
   - **Severity:** High/Medium/Low
   - **Steps to reproduce:** [...]
   - **Expected:** [...]
   - **Actual:** [...]

### Overall Status
✅ All critical tests passing
⚠️ Minor issues found
❌ Blocking issues

### Next Steps
- [ ] Fix identified issues
- [ ] Re-test affected areas
- [ ] Deploy to staging
```

---

## ✅ Sign-Off Checklist

Before considering cleanup complete:

- [x] Old files deleted (Login.html, Signup.html)
- [x] All redirects updated to /login
- [x] No 404 errors on navigation
- [ ] New user registration works end-to-end
- [ ] Existing user login works
- [ ] Logout redirects correctly
- [ ] Dashboard loads without errors
- [ ] All sub-pages accessible
- [ ] Marketing pages functional
- [ ] API endpoints responding

**Status:** Ready for User Testing 🚀


## 🚀 Quick Start

### **Start the Server:**
```bash
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys/marketing-website-standalone"
node server-simple.js
```

Server will run on: `http://localhost:3000`

---

## ✅ Complete Test Scenarios

### **Test 1: New User Complete Journey** 

#### **Step 1: Landing Page**
1. Open browser: `http://localhost:3000/`
2. **Verify:**
   - ✅ Hero section displays
   - ✅ Features section shows
   - ✅ Testimonials visible
   - ✅ "Get Started Free" button works
   - ✅ "Login" link in nav works

#### **Step 2: Registration Flow**
1. Click "Get Started Free" or "Start Free Trial"
2. **Verify redirected to:** `http://localhost:3000/signup`
3. **Fill Step 1 - Business Information:**
   - Business Name: "Test Company"
   - Industry: "Retail"
   - Email: "test@example.com"
   - Phone: "1234567890"
   - Company Size: "11-50"
   - Click "Next"
4. **Verify Step 2 appears - Plan Selection:**
   - ✅ 3 plans displayed (Basic, Professional, Enterprise)
   - ✅ Professional is pre-selected if came from pricing
   - Select "Professional" plan
   - Click "Next"
5. **Fill Step 3 - Account Setup:**
   - Name: "John Doe"
   - Email: "john@example.com"
   - Password: "Test123456!"
   - Confirm Password: "Test123456!"
   - ✅ Password strength indicator shows
   - Check "I agree to Terms & Privacy Policy"
   - Click "Next"
6. **Step 4 - Free Trial:**
   - Click "Start 14-Day Free Trial"
7. **Verify Success:**
   - ✅ Redirected to `/signup-success`
   - ✅ Confetti animation plays
   - ✅ Success message shows
   - ✅ "Go to Dashboard" button appears
8. Click "Go to Dashboard"
9. **Verify:**
   - ✅ Redirected to `/dashboard`
   - ✅ Dashboard loads completely
   - ✅ Welcome message shows user name
   - ✅ All navigation items visible

**Expected Console Output:**
```
📝 Registration Data Received:
Business: Test Company retail 11-50
Contact: test@example.com 1234567890
Plan: professional
User: John Doe john@example.com
✅ Registration completed successfully
📊 Business ID: business_1234567890
👤 User ID: user_1234567890
🎯 Plan: professional
📅 Trial ends: [date]
```

---

### **Test 2: Existing User Login**

#### **Step 1: Navigate to Login**
1. Open: `http://localhost:3000/`
2. Click "Login" in navigation
3. **Verify redirected to:** `http://localhost:3000/login`

#### **Step 2: Login Form**
1. Enter Email: "john@example.com"
2. Enter Password: "Test123456!"
3. Check "Remember me" (optional)
4. Click "Sign In"
5. **Verify:**
   - ✅ Loading spinner appears
   - ✅ "Signing you in..." message
   - ✅ Success message with checkmark
   - ✅ "Welcome back!" message

#### **Step 3: Dashboard Access**
1. **Verify after 2 seconds:**
   - ✅ Redirected to `/dashboard`
   - ✅ Dashboard loads
   - ✅ User data populated from localStorage

**Expected Console Output:**
```
🔐 Login attempt: { email: 'john@example.com', rememberMe: true }
✅ Login successful for: john@example.com
```

**Check localStorage:**
```javascript
// Open DevTools Console (F12)
console.log(localStorage.getItem('madasUser'));
console.log(localStorage.getItem('madasBusiness'));
```

Should show user and business data.

---

### **Test 3: Unauthorized Dashboard Access**

#### **Scenario: No Authentication**
1. Open DevTools Console (F12)
2. Clear localStorage:
   ```javascript
   localStorage.clear();
   ```
3. Try to access: `http://localhost:3000/dashboard`
4. **Verify:**
   - ✅ Immediately redirected to `/login`
   - ✅ No errors in console
   - ✅ Clean redirect (not 404)

#### **Scenario: Invalid Session**
1. Set invalid data in localStorage:
   ```javascript
   localStorage.setItem('madasUser', 'invalid');
   ```
2. Try to access: `http://localhost:3000/dashboard`
3. **Verify:**
   - ✅ Redirected to `/login`
   - ✅ localStorage cleared

---

### **Test 4: Logout Functionality**

#### **From Dashboard:**
1. Login successfully
2. Navigate to: `http://localhost:3000/dashboard`
3. Click logout button (top right)
4. **Verify:**
   - ✅ Redirected to `/login` (not `Login.html` or 404)
   - ✅ localStorage cleared
   - ✅ Can't access dashboard without re-login

**Check localStorage after logout:**
```javascript
console.log(localStorage.getItem('madasUser')); // Should be null
console.log(localStorage.getItem('madasBusiness')); // Should be null
```

#### **From Sub-Pages:**
1. Login and go to `/pages/orders.html`
2. Click logout
3. **Verify:** Redirected to `/login`

Repeat for:
- `/pages/products.html`
- `/pages/Customer.html`
- `/pages/analytics.html`

---

### **Test 5: No Access Page**

#### **Setup:**
1. Need Firebase setup with user permissions
2. Or temporarily modify `index.html` to simulate

#### **Test Flow:**
1. Login as user without permissions
2. **Verify redirected to:** `/no-access.html`
3. **Verify page shows:**
   - ✅ "Access Denied" message
   - ✅ Explanation text
   - ✅ "Back to Login" button
4. Click "Back to Login"
5. **Verify:** Redirected to `/login` (not `Login.html`)

---

### **Test 6: Dashboard Navigation**

#### **Prerequisites:**
- Logged in successfully
- At: `http://localhost:3000/dashboard`

#### **Test All Navigation Links:**

**Main Menu:**
1. Click "Orders" → Should load `/pages/orders.html`
2. Click "Inventory" dropdown:
   - Products → `/pages/products.html`
   - Collections → `/pages/collections.html`
   - Reviews → `/pages/product-reviews.html`
   - Low Stock → `/pages/low-stock.html`
3. Click "Customers" → `/pages/Customer.html`
4. Click "Staff" → `/pages/Admin.html`
5. Click "Web Builder" → `/E-comm/theme-library.html`
6. Click "Finance" dropdown:
   - Overview → `/pages/finance.html`
   - Expenses → `/pages/expenses.html`
   - Analytics → `/pages/analytics.html`
   - Reports → `/pages/reports.html`
   - Insights → `/pages/insights.html`

**Verify for Each:**
- ✅ Page loads without 404
- ✅ Assets load (CSS, JS, images)
- ✅ Navigation remains functional
- ✅ Logout button works → redirects to `/login`

---

### **Test 7: Marketing Website Pages**

#### **Test All Public Pages:**

1. **Landing:** `http://localhost:3000/`
   - ✅ All sections load
   - ✅ Navigation works
   - ✅ CTA buttons work

2. **Pricing:** `http://localhost:3000/pricing`
   - ✅ 3 plan tiers displayed
   - ✅ Monthly/Annual toggle works
   - ✅ "Choose Plan" buttons work
   - ✅ FAQ section appears

3. **About:** `http://localhost:3000/about`
   - ✅ Company info displays
   - ✅ Mission and values shown

4. **Contact:** `http://localhost:3000/contact`
   - ✅ Contact form displays
   - ✅ Form submission works
   - ✅ Success message appears

---

### **Test 8: API Endpoints**

#### **Test Registration API:**
```bash
# Using curl
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Company",
    "industry": "retail",
    "businessEmail": "test@example.com",
    "phone": "1234567890",
    "companySize": "11-50",
    "plan": "professional",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "password": "Test123456!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "userId": "user_1234567890",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "business": {
    "businessId": "business_1234567890",
    "businessName": "Test Company",
    "plan": "professional",
    "trialEnds": "2025-11-28T..."
  }
}
```

#### **Test Login API:**
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Test123456!",
    "rememberMe": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": { ... },
  "business": { ... },
  "token": "token_1234567890"
}
```

#### **Test Health Check:**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "mode": "simplified",
  "timestamp": "2025-10-14T..."
}
```

---

## 🐛 Troubleshooting

### **Issue: 404 Not Found**
**Symptoms:** Pages return 404 errors

**Solutions:**
1. Check server is running: `lsof -i :3000`
2. Restart server:
   ```bash
   lsof -ti:3000 | xargs kill -9
   cd marketing-website-standalone
   node server-simple.js
   ```
3. Check file paths in server configuration

### **Issue: Redirects to Login.html**
**Symptoms:** 404 error on login redirect

**Solution:** This means a file wasn't updated. Search for:
```bash
grep -r "Login.html" /path/to/project
```
Replace any remaining instances with `/login`

### **Issue: Assets Not Loading**
**Symptoms:** Dashboard shows broken images/styles

**Solutions:**
1. Check server static file serving:
   ```javascript
   app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
   ```
2. Verify file paths are correct
3. Check browser console for specific 404s

### **Issue: localStorage Not Working**
**Symptoms:** Dashboard redirects after successful login

**Solutions:**
1. Check browser localStorage is enabled
2. Try different browser
3. Check for browser extensions blocking storage
4. Open DevTools and manually check:
   ```javascript
   localStorage.setItem('test', 'value');
   console.log(localStorage.getItem('test'));
   ```

### **Issue: Infinite Redirect Loop**
**Symptoms:** Page keeps redirecting

**Solutions:**
1. Clear localStorage: `localStorage.clear()`
2. Clear cookies
3. Check authentication logic in `index.html`
4. Check for conflicting redirects

---

## 📊 Test Results Template

```markdown
## Test Session: [Date]

### Environment
- Browser: [Chrome/Firefox/Safari]
- Server: Running on localhost:3000
- Mode: server-simple.js (mock API)

### Test Results

| Test | Status | Notes |
|------|--------|-------|
| New User Registration | ✅ PASS | All steps completed |
| Existing User Login | ✅ PASS | Redirects correctly |
| Unauthorized Access | ✅ PASS | Redirects to /login |
| Logout | ✅ PASS | Clears localStorage |
| No Access Page | ⚠️ SKIP | Requires Firebase setup |
| Dashboard Navigation | ✅ PASS | All pages load |
| Marketing Pages | ✅ PASS | No issues |
| API Endpoints | ✅ PASS | Mock data works |

### Issues Found
1. [Issue description]
   - **Severity:** High/Medium/Low
   - **Steps to reproduce:** [...]
   - **Expected:** [...]
   - **Actual:** [...]

### Overall Status
✅ All critical tests passing
⚠️ Minor issues found
❌ Blocking issues

### Next Steps
- [ ] Fix identified issues
- [ ] Re-test affected areas
- [ ] Deploy to staging
```

---

## ✅ Sign-Off Checklist

Before considering cleanup complete:

- [x] Old files deleted (Login.html, Signup.html)
- [x] All redirects updated to /login
- [x] No 404 errors on navigation
- [ ] New user registration works end-to-end
- [ ] Existing user login works
- [ ] Logout redirects correctly
- [ ] Dashboard loads without errors
- [ ] All sub-pages accessible
- [ ] Marketing pages functional
- [ ] API endpoints responding

**Status:** Ready for User Testing 🚀



