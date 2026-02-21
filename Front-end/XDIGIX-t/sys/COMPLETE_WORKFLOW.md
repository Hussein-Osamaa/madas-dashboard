# 🎯 MADAS Complete System Workflow

## 📁 Final Project Structure

```
/sys/
│
├── marketing-website-standalone/     # ✅ PUBLIC MARKETING SITE
│   ├── index.html                   # Landing page
│   ├── pricing.html                 # Pricing
│   ├── signup.html                  # Registration (4 steps)
│   ├── login.html                   # Login
│   ├── about.html                   # About us
│   ├── contact.html                 # Contact form
│   ├── signup-success.html          # Success page
│   ├── signup-error.html            # Error page
│   ├── server-simple.js             # Standalone marketing server
│   ├── api/registration.js          # Marketing API routes
│   ├── email-templates/welcome.html # Email templates
│   ├── chat-widget.js               # Live chat widget
│   ├── firebase-config.js           # Firebase config
│   └── package.json                 # Dependencies
│
├── Dashboard/                        # ✅ MAIN DASHBOARD APPLICATION
│   ├── index.html                   # Main dashboard home
│   ├── no-access.html               # Access denied
│   │
│   ├── pages/                       # Core Pages
│   │   ├── orders.html              # Order management
│   │   ├── products.html            # Products
│   │   ├── collections.html         # Collections
│   │   ├── product-reviews.html     # Reviews
│   │   ├── low-stock.html           # Stock alerts
│   │   ├── Customer.html            # CRM
│   │   ├── Admin.html               # Staff management
│   │   ├── finance.html             # Finance
│   │   ├── expenses.html            # Expenses
│   │   ├── analytics.html           # Analytics
│   │   ├── reports.html             # Reports
│   │   ├── insights.html            # Insights
│   │   ├── profile.html             # Profile
│   │   ├── settings.html            # Settings
│   │   ├── notifications.html       # Notifications
│   │   │
│   │   ├── gamification/            # Gamification Features
│   │   │   ├── game-hub.html        # Game hub
│   │   │   ├── loyalty.html         # Loyalty program
│   │   │   ├── scratch-card.html    # Scratch cards
│   │   │   └── madas-pass.html      # MADAS Pass
│   │   │
│   │   ├── advanced/                # Advanced Features
│   │   │   ├── domains.html         # Custom domains
│   │   │   ├── shares.html          # Share management
│   │   │   ├── scan_log.html        # Scan logs
│   │   │   └── deposit-money-simple.html
│   │   │
│   │   └── customization/           # Customization
│   │       ├── discount-customize.html
│   │       ├── scratch-card-customize.html
│   │       └── madas-pass-customization.html
│   │
│   ├── multi-tenancy/               # ✅ MULTI-TENANCY SYSTEM
│   │   ├── README.md                # Multi-tenancy guide
│   │   ├── SETUP.md                 # Setup instructions
│   │   ├── INTERFACE.md             # Interface preview
│   │   ├── admin-interface.html     # Business management UI
│   │   ├── firebase-init-plans.js   # Initialize plans
│   │   └── client-tenant-isolation.js
│   │
│   ├── api/                         # Dashboard API
│   │   └── registration.js          # API endpoints
│   │
│   ├── middleware/                  # Middleware
│   │   └── tenantIsolation.js       # Tenant isolation
│   │
│   └── shared/                      # Shared code
│       └── lib/                     # Utilities
│
├── docs/                            # ✅ DOCUMENTATION
│   ├── PROJECT_STRUCTURE.md
│   ├── CLEANUP_SUMMARY.md
│   ├── NAVIGATION_FIX.md
│   └── TESTING_GUIDE.md
│
├── server.js                        # ⭐ MAIN SERVER (serves everything)
├── package.json                     # Root dependencies
├── README.md                        # Main README
└── .gitignore
```

---

## 🌐 Complete URL Structure

### **Public Marketing Website** (No Authentication Required)

| Page | URL | Description |
|------|-----|-------------|
| Landing | `http://YOUR_IP:3000/` | Homepage, features, testimonials |
| Pricing | `http://YOUR_IP:3000/pricing` | Plan comparison, pricing |
| Signup | `http://YOUR_IP:3000/signup` | 4-step registration form |
| Login | `http://YOUR_IP:3000/login` | User authentication |
| About | `http://YOUR_IP:3000/about` | Company information |
| Contact | `http://YOUR_IP:3000/contact` | Contact form |
| Success | `http://YOUR_IP:3000/signup-success` | Registration success |
| Error | `http://YOUR_IP:3000/signup-error` | Registration error |

### **Dashboard Application** (Authentication Required)

| Section | URL | Description |
|---------|-----|-------------|
| **Main** | | |
| Dashboard Home | `/dashboard` | Main dashboard, stats, to-dos |
| No Access | `/dashboard/no-access.html` | Access denied page |
| **Core Features** | | |
| Orders | `/dashboard/pages/orders.html` | Order management |
| Products | `/dashboard/pages/products.html` | Product inventory |
| Collections | `/dashboard/pages/collections.html` | Product collections |
| Reviews | `/dashboard/pages/product-reviews.html` | Customer reviews |
| Low Stock | `/dashboard/pages/low-stock.html` | Stock alerts |
| Customers | `/dashboard/pages/Customer.html` | Customer CRM |
| Staff | `/dashboard/pages/Admin.html` | Staff management |
| **Finance** | | |
| Overview | `/dashboard/pages/finance.html` | Finance dashboard |
| Expenses | `/dashboard/pages/expenses.html` | Expense tracking |
| Analytics | `/dashboard/pages/analytics.html` | Business analytics |
| Reports | `/dashboard/pages/reports.html` | Custom reports |
| Insights | `/dashboard/pages/insights.html` | AI insights |
| **Gamification** | | |
| Game Hub | `/dashboard/pages/gamification/game-hub.html` | Gamification center |
| Loyalty | `/dashboard/pages/gamification/loyalty.html` | Loyalty program |
| Scratch Cards | `/dashboard/pages/gamification/scratch-card.html` | Scratch cards |
| MADAS Pass | `/dashboard/pages/gamification/madas-pass.html` | Membership cards |
| **Advanced** | | |
| Domains | `/dashboard/pages/advanced/domains.html` | Custom domains |
| Shares | `/dashboard/pages/advanced/shares.html` | Share management |
| Scan Log | `/dashboard/pages/advanced/scan_log.html` | Scan history |
| Deposits | `/dashboard/pages/advanced/deposit-money-simple.html` | Money deposits |
| **Multi-Tenancy** | | |
| Admin Interface | `/dashboard/multi-tenancy/admin-interface.html` | Business account mgmt |
| **User** | | |
| Profile | `/dashboard/pages/profile.html` | User profile |
| Settings | `/dashboard/pages/settings.html` | Settings |
| Notifications | `/dashboard/pages/notifications.html` | Notifications |

---

## 🔄 Complete User Workflows

### **Workflow 1: New User Registration**

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Discovery                                          │
└─────────────────────────────────────────────────────────────┘
User visits: http://YOUR_IP:3000/
↓
Sees: Hero section, features, testimonials, pricing
↓
Clicks: "Get Started Free" or "Start Free Trial"
↓

┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Registration (4-Step Form)                         │
└─────────────────────────────────────────────────────────────┘
Redirected to: http://YOUR_IP:3000/signup
↓
STEP 1 - Business Information:
  - Business Name: "My Company"
  - Industry: "Retail"
  - Business Email: "business@example.com"
  - Phone: "+1234567890"
  - Company Size: "11-50"
  - Click "Next"
↓
STEP 2 - Plan Selection:
  - View 3 plans: Basic ($29), Professional ($79), Enterprise ($199)
  - Select: "Professional"
  - Click "Next"
↓
STEP 3 - Account Setup:
  - Name: "John Doe"
  - Email: "john@example.com"
  - Password: "SecurePass123!"
  - Confirm Password: "SecurePass123!"
  - ☑ Agree to Terms & Privacy
  - Click "Next"
↓
STEP 4 - Payment/Trial:
  - Click "Start 14-Day Free Trial"
↓
[API POST /api/register]
{
  businessName, industry, businessEmail, phone, companySize,
  plan, userName, userEmail, password
}
↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Success                                            │
└─────────────────────────────────────────────────────────────┘
Redirected to: http://YOUR_IP:3000/signup-success
↓
Shows: Confetti animation, trial info, next steps
↓
Clicks: "Go to Dashboard"
↓

┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Dashboard Access                                   │
└─────────────────────────────────────────────────────────────┘
Redirected to: http://YOUR_IP:3000/dashboard
↓
localStorage set:
  - madasUser: { userId, email, name, role }
  - madasBusiness: { businessId, businessName, plan, trialEnds }
↓
Dashboard loads with:
  ✅ User welcome message
  ✅ Business stats
  ✅ To-do list
  ✅ Recent activity
  ✅ Full navigation menu
↓
User can now:
  ✅ Manage orders
  ✅ Add products
  ✅ View customers
  ✅ Manage staff
  ✅ View analytics
  ✅ Access all features
```

---

### **Workflow 2: Existing User Login**

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Navigate to Login                                  │
└─────────────────────────────────────────────────────────────┘
User at: http://YOUR_IP:3000/ (any marketing page)
↓
Clicks: "Login" in navigation
↓
Redirected to: http://YOUR_IP:3000/login
↓

┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Authentication                                     │
└─────────────────────────────────────────────────────────────┘
Enters:
  - Email: "john@example.com"
  - Password: "SecurePass123!"
  - ☑ Remember me (optional)
↓
Clicks: "Sign In"
↓
[API POST /api/login]
{ email, password, rememberMe }
↓
Shows:
  - Loading spinner
  - "Signing you in..." message
↓
Success:
  - "Welcome back!" message
  - Checkmark icon
↓

┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Dashboard Access                                   │
└─────────────────────────────────────────────────────────────┘
Auto-redirect (2 seconds) to: http://YOUR_IP:3000/dashboard
↓
localStorage populated with user/business data
↓
Dashboard loads with personalized content
↓
User continues working...
```

---

### **Workflow 3: Dashboard Navigation**

```
┌─────────────────────────────────────────────────────────────┐
│  User is at: /dashboard                                     │
└─────────────────────────────────────────────────────────────┘

MAIN MENU NAVIGATION:
├─→ Dashboard (/)
│   → Shows: Stats, to-dos, recent activity
│
├─→ Orders
│   → URL: /dashboard/pages/orders.html
│   → View, search, create, edit orders
│
├─→ Inventory (Dropdown) ▼
│   ├─→ Products: /dashboard/pages/products.html
│   ├─→ Collections: /dashboard/pages/collections.html
│   ├─→ Reviews: /dashboard/pages/product-reviews.html
│   └─→ Low Stock: /dashboard/pages/low-stock.html
│
├─→ Customers
│   → URL: /dashboard/pages/Customer.html
│   → Customer profiles, purchase history
│
├─→ Staff
│   → URL: /dashboard/pages/Admin.html
│   → Manage staff, roles, permissions
│
├─→ Finance (Dropdown) ▼
│   ├─→ Overview: /dashboard/pages/finance.html
│   ├─→ Expenses: /dashboard/pages/expenses.html
│   ├─→ Analytics: /dashboard/pages/analytics.html
│   ├─→ Reports: /dashboard/pages/reports.html
│   └─→ Insights: /dashboard/pages/insights.html
│
├─→ Gamification (Navigate to)
│   ├─→ Game Hub: /dashboard/pages/gamification/game-hub.html
│   ├─→ Loyalty: /dashboard/pages/gamification/loyalty.html
│   ├─→ Scratch Cards: /dashboard/pages/gamification/scratch-card.html
│   └─→ MADAS Pass: /dashboard/pages/gamification/madas-pass.html
│
└─→ User Actions
    ├─→ Profile: /dashboard/pages/profile.html
    ├─→ Settings: /dashboard/pages/settings.html
    └─→ Logout → Redirects to /login
```

---

### **Workflow 4: Multi-Tenancy Management** (Super Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  Super Admin Access                                         │
└─────────────────────────────────────────────────────────────┘
Email: hesainosama@gmail.com (whitelisted)
↓
Login → Dashboard
↓
Navigate to: /dashboard/multi-tenancy/admin-interface.html
↓

BUSINESS MANAGEMENT:
├─→ View All Businesses
│   → Table showing: Name, Plan, Status, Created Date
│
├─→ Add New Business
│   → Modal form:
│     - Business name
│     - Plan selection (Basic/Professional/Enterprise)
│     - Contact email
│     - Enable/disable features
│   → Submit → Creates business in Firebase
│
├─→ Edit Business
│   → Update plan type
│   → Enable/disable features
│   → Change status (active/suspended)
│
├─→ Manage Staff (Per Business)
│   → Select business from dropdown
│   → View staff list for that business
│   → Add staff member:
│     - Email, name
│     - Role: owner/admin/manager/staff
│     - Permissions (checkboxes)
│   → Edit/remove staff
│
└─→ Audit Logs
    → View all admin actions
    → Filter by date, business, action type
```

---

## 🔐 Authentication Flow

### **Authentication Methods:**

1. **Marketing Website Authentication**
   - POST `/api/login` or `/api/register`
   - Stores in `localStorage`:
     ```javascript
     localStorage.setItem('madasUser', JSON.stringify({
       userId, email, name, role
     }));
     localStorage.setItem('madasBusiness', JSON.stringify({
       businessId, businessName, plan, trialEnds
     }));
     ```

2. **Dashboard Dual Authentication Check**
   ```javascript
   // Dashboard/index.html checks:
   function checkAuthentication() {
     // 1. Check localStorage (marketing website auth)
     const madasUser = localStorage.getItem('madasUser');
     if (madasUser) return true;
     
     // 2. Check Firebase Auth (direct dashboard access)
     onAuthStateChanged(auth, (user) => {
       if (user) return true;
     });
     
     // 3. No auth found
     window.location.href = '/login';
   }
   ```

### **Authorization Levels:**

| Role | Access | Features |
|------|--------|----------|
| **Super Admin** | All businesses | Create/edit/delete businesses, manage all staff |
| **Business Owner** | Own business only | Full access, manage staff, all features |
| **Business Admin** | Own business only | Manage staff, full features, no business settings |
| **Manager** | Own business only | Limited staff mgmt, partial features |
| **Staff** | Own business only | View-only or limited edit |

---

## 🔄 Data Flow

### **Registration Flow:**

```
USER SUBMITS FORM
↓
[Frontend] signup.html validates data
↓
[API] POST /api/register
  ├─→ Validate input
  ├─→ Check duplicate email
  ├─→ Hash password (in real implementation)
  ├─→ Create business record in Firestore:
  │   /businesses/{businessId}
  │     - businessName, plan, contact, owner, status
  │
  ├─→ Create user record:
  │   /users/{userId}
  │     - userId, name, email, currentBusinessId
  │
  ├─→ Create staff record:
  │   /businesses/{businessId}/staff/{staffId}
  │     - role: 'owner', permissions: { canManageAll: true }
  │
  ├─→ Create subscription:
  │   /subscriptions/{subscriptionId}
  │     - businessId, plan, status: 'trial', expiresAt
  │
  └─→ Send welcome email (template: email-templates/welcome.html)
↓
[Response] Returns:
{
  success: true,
  user: { userId, email, name, role },
  business: { businessId, businessName, plan, trialEnds },
  token: "jwt_token_here"
}
↓
[Frontend] Stores in localStorage
↓
[Frontend] Redirects to /signup-success
↓
User clicks "Go to Dashboard"
↓
[Frontend] Redirects to /dashboard
↓
Dashboard loads with user data
```

---

### **Login Flow:**

```
USER ENTERS CREDENTIALS
↓
[Frontend] login.html validates input
↓
[API] POST /api/login
  ├─→ Validate email/password
  ├─→ Check user exists
  ├─→ Verify password (hash comparison)
  ├─→ Load user data from Firestore
  ├─→ Load business data
  └─→ Generate session token
↓
[Response] Returns:
{
  success: true,
  user: { ... },
  business: { ... },
  token: "..."
}
↓
[Frontend] Stores in localStorage
↓
Shows success message (2 seconds)
↓
[Frontend] Redirects to /dashboard
↓
Dashboard loads
```

---

### **Dashboard Page Access Flow:**

```
USER CLICKS MENU ITEM
↓
Browser navigates to: /dashboard/pages/orders.html
↓
[Page loads] orders.html checks authentication:
  onAuthStateChanged(auth, (user) => {
    if (!user && !localStorage.getItem('madasUser')) {
      window.location.href = '/login';
    }
  });
↓
If authenticated:
  ├─→ Load page content
  ├─→ Fetch data from Firebase (filtered by businessId)
  ├─→ Render UI
  └─→ Enable interactions
↓
If not authenticated:
  └─→ Redirect to /login
```

---

## 🚀 How to Run the System

### **Development Mode:**

```bash
# Navigate to project root
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"

# Install dependencies (if not already done)
npm install

# Start the complete system
npm start
# OR
node server.js
```

### **Access URLs:**

**From your Mac:**
```
http://localhost:3000
```

**From other devices (same WiFi):**
```
http://192.168.x.x:3000
(Replace with your actual IP - shown in server startup message)
```

---

## 📋 Complete Testing Checklist

### **✅ Marketing Website Tests**

- [ ] Landing page loads (`/`)
- [ ] Pricing page loads (`/pricing`)
- [ ] About page loads (`/about`)
- [ ] Contact page loads (`/contact`)
- [ ] Contact form submits successfully
- [ ] Newsletter subscription works
- [ ] All navigation links work
- [ ] Mobile menu works
- [ ] Footer links work

### **✅ Registration Tests**

- [ ] Signup page loads (`/signup`)
- [ ] Step 1: Business info form validates
- [ ] Step 2: Plan selection works, cards display
- [ ] Step 3: Account setup validates password
- [ ] Step 4: Free trial button works
- [ ] Form submission succeeds
- [ ] Success page shows (`/signup-success`)
- [ ] Confetti animation plays
- [ ] "Go to Dashboard" redirects to `/dashboard`
- [ ] User data stored in localStorage

### **✅ Login Tests**

- [ ] Login page loads (`/login`)
- [ ] Email validation works
- [ ] Password validation works
- [ ] "Remember me" checkbox works
- [ ] Login submission succeeds
- [ ] Loading spinner appears
- [ ] Success message shows
- [ ] Redirects to `/dashboard` after 2 seconds
- [ ] User data stored in localStorage

### **✅ Dashboard Tests**

- [ ] Dashboard loads (`/dashboard`)
- [ ] Welcome message shows user name
- [ ] Stats cards display (Sales, Orders, Customers, Products)
- [ ] To-do list functional
- [ ] Recent activity shows
- [ ] All navigation links work:
  - [ ] Orders
  - [ ] Products
  - [ ] Collections
  - [ ] Reviews
  - [ ] Low Stock
  - [ ] Customers
  - [ ] Staff/Admin
  - [ ] Finance dropdown (all 5 sub-pages)
  - [ ] Profile
  - [ ] Settings
  - [ ] Notifications
- [ ] Inventory dropdown opens/closes
- [ ] Finance dropdown opens/closes
- [ ] Mobile menu works
- [ ] Logout button works

### **✅ Multi-Tenancy Tests**

- [ ] Admin interface loads (`/dashboard/multi-tenancy/admin-interface.html`)
- [ ] Business list displays
- [ ] "Add Business" modal opens
- [ ] Can create new business
- [ ] Can edit business
- [ ] Can suspend/activate business
- [ ] Staff management works
- [ ] Plan configuration saves
- [ ] Feature toggles work

### **✅ Authorization Tests**

- [ ] Unauthenticated user → redirects to `/login`
- [ ] No localStorage → redirects to `/login`
- [ ] Invalid token → redirects to `/login`
- [ ] Unauthorized user → shows `/dashboard/no-access.html`
- [ ] Logout → clears localStorage → redirects to `/login`

---

## 🎯 Server Configuration

### **Main Server** (`server.js` in root)

**Serves:**
- ✅ Marketing website from `marketing-website-standalone/`
- ✅ Dashboard from `Dashboard/`
- ✅ All API endpoints
- ✅ Static assets

**Port:** 3000 (configurable via `PORT` env variable)

**Host:** `0.0.0.0` (accessible on network)

### **Standalone Marketing Server** (`marketing-website-standalone/server-simple.js`)

**For independent marketing website deployment:**
```bash
cd marketing-website-standalone
node server-simple.js
```

---

## 📊 API Endpoints Reference

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|--------------|----------|-------------|
| POST | `/api/register` | `{ businessName, industry, businessEmail, phone, companySize, plan, userName, userEmail, password }` | `{ success, user, business, token }` | New user registration |
| POST | `/api/login` | `{ email, password, rememberMe }` | `{ success, user, business, token }` | User login |
| POST | `/api/contact` | `{ name, email, subject, message }` | `{ success, message }` | Contact form |
| POST | `/api/newsletter/subscribe` | `{ email }` | `{ success, message }` | Newsletter signup |
| GET | `/health` | - | `{ status, mode, timestamp, services }` | Health check |

---

## 🔒 Security Considerations

### **Current Implementation (Mock):**
- ⚠️  Passwords not hashed
- ⚠️  No email verification
- ⚠️  No CSRF protection
- ⚠️  No rate limiting
- ⚠️  Mock JWT tokens

### **Production Requirements:**
- ✅ Implement bcrypt for password hashing
- ✅ Add email verification
- ✅ Implement CSRF tokens
- ✅ Add rate limiting
- ✅ Use real JWT tokens
- ✅ Enable HTTPS
- ✅ Add security headers
- ✅ Implement session management
- ✅ Add 2FA support

---

## 📱 Mobile Access

### **Testing on Mobile Device:**

1. **Find your Mac's IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   
2. **Ensure devices on same WiFi**

3. **Access from phone/tablet:**
   ```
   http://192.168.x.x:3000
   ```

4. **Test responsive design:**
   - Navigation mobile menu
   - Forms on small screens
   - Dashboard on tablet/phone
   - Touch interactions

---

## 🐛 Troubleshooting

### **Issue: 404 Errors**

**Symptoms:** Pages return 404

**Solutions:**
1. Check server is running: `lsof -i :3000`
2. Verify file exists in correct location
3. Check path is absolute (`/dashboard/pages/...`)
4. Restart server

### **Issue: Can't Access Dashboard**

**Symptoms:** Redirected to login immediately

**Solutions:**
1. Check localStorage:
   ```javascript
   console.log(localStorage.getItem('madasUser'));
   ```
2. Try logging in again
3. Clear browser cache
4. Check browser console for errors

### **Issue: Navigation Not Working**

**Symptoms:** Clicking links does nothing or 404

**Solutions:**
1. Verify paths are absolute
2. Check file exists in Dashboard folder
3. Clear browser cache
4. Check server static file serving

### **Issue: Live Server Conflicts**

**Symptoms:** CSP errors, wrong port

**Solution:** Stop Live Server completely, use only Node.js server

---

## ✅ Final Status

### **Completed:**
- ✅ Project restructured into 2 main folders
- ✅ Marketing website fully functional
- ✅ Dashboard organized with subfolders
- ✅ Multi-tenancy system separated
- ✅ All documentation organized
- ✅ Single unified server created
- ✅ All paths updated to absolute
- ✅ Duplicate files removed

### **Ready for:**
- ✅ Development
- ✅ Testing
- ✅ Deployment preparation

---

## 🎯 Quick Start Guide

```bash
# 1. Navigate to project
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"

# 2. Install dependencies
npm install

# 3. Start server
npm start

# 4. Open browser
# Visit: http://localhost:3000

# 5. Test the flow:
# → Sign up → Login → Dashboard → Navigate → Logout
```

**Your system is now fully structured and ready to use!** 🚀


## 📁 Final Project Structure

```
/sys/
│
├── marketing-website-standalone/     # ✅ PUBLIC MARKETING SITE
│   ├── index.html                   # Landing page
│   ├── pricing.html                 # Pricing
│   ├── signup.html                  # Registration (4 steps)
│   ├── login.html                   # Login
│   ├── about.html                   # About us
│   ├── contact.html                 # Contact form
│   ├── signup-success.html          # Success page
│   ├── signup-error.html            # Error page
│   ├── server-simple.js             # Standalone marketing server
│   ├── api/registration.js          # Marketing API routes
│   ├── email-templates/welcome.html # Email templates
│   ├── chat-widget.js               # Live chat widget
│   ├── firebase-config.js           # Firebase config
│   └── package.json                 # Dependencies
│
├── Dashboard/                        # ✅ MAIN DASHBOARD APPLICATION
│   ├── index.html                   # Main dashboard home
│   ├── no-access.html               # Access denied
│   │
│   ├── pages/                       # Core Pages
│   │   ├── orders.html              # Order management
│   │   ├── products.html            # Products
│   │   ├── collections.html         # Collections
│   │   ├── product-reviews.html     # Reviews
│   │   ├── low-stock.html           # Stock alerts
│   │   ├── Customer.html            # CRM
│   │   ├── Admin.html               # Staff management
│   │   ├── finance.html             # Finance
│   │   ├── expenses.html            # Expenses
│   │   ├── analytics.html           # Analytics
│   │   ├── reports.html             # Reports
│   │   ├── insights.html            # Insights
│   │   ├── profile.html             # Profile
│   │   ├── settings.html            # Settings
│   │   ├── notifications.html       # Notifications
│   │   │
│   │   ├── gamification/            # Gamification Features
│   │   │   ├── game-hub.html        # Game hub
│   │   │   ├── loyalty.html         # Loyalty program
│   │   │   ├── scratch-card.html    # Scratch cards
│   │   │   └── madas-pass.html      # MADAS Pass
│   │   │
│   │   ├── advanced/                # Advanced Features
│   │   │   ├── domains.html         # Custom domains
│   │   │   ├── shares.html          # Share management
│   │   │   ├── scan_log.html        # Scan logs
│   │   │   └── deposit-money-simple.html
│   │   │
│   │   └── customization/           # Customization
│   │       ├── discount-customize.html
│   │       ├── scratch-card-customize.html
│   │       └── madas-pass-customization.html
│   │
│   ├── multi-tenancy/               # ✅ MULTI-TENANCY SYSTEM
│   │   ├── README.md                # Multi-tenancy guide
│   │   ├── SETUP.md                 # Setup instructions
│   │   ├── INTERFACE.md             # Interface preview
│   │   ├── admin-interface.html     # Business management UI
│   │   ├── firebase-init-plans.js   # Initialize plans
│   │   └── client-tenant-isolation.js
│   │
│   ├── api/                         # Dashboard API
│   │   └── registration.js          # API endpoints
│   │
│   ├── middleware/                  # Middleware
│   │   └── tenantIsolation.js       # Tenant isolation
│   │
│   └── shared/                      # Shared code
│       └── lib/                     # Utilities
│
├── docs/                            # ✅ DOCUMENTATION
│   ├── PROJECT_STRUCTURE.md
│   ├── CLEANUP_SUMMARY.md
│   ├── NAVIGATION_FIX.md
│   └── TESTING_GUIDE.md
│
├── server.js                        # ⭐ MAIN SERVER (serves everything)
├── package.json                     # Root dependencies
├── README.md                        # Main README
└── .gitignore
```

---

## 🌐 Complete URL Structure

### **Public Marketing Website** (No Authentication Required)

| Page | URL | Description |
|------|-----|-------------|
| Landing | `http://YOUR_IP:3000/` | Homepage, features, testimonials |
| Pricing | `http://YOUR_IP:3000/pricing` | Plan comparison, pricing |
| Signup | `http://YOUR_IP:3000/signup` | 4-step registration form |
| Login | `http://YOUR_IP:3000/login` | User authentication |
| About | `http://YOUR_IP:3000/about` | Company information |
| Contact | `http://YOUR_IP:3000/contact` | Contact form |
| Success | `http://YOUR_IP:3000/signup-success` | Registration success |
| Error | `http://YOUR_IP:3000/signup-error` | Registration error |

### **Dashboard Application** (Authentication Required)

| Section | URL | Description |
|---------|-----|-------------|
| **Main** | | |
| Dashboard Home | `/dashboard` | Main dashboard, stats, to-dos |
| No Access | `/dashboard/no-access.html` | Access denied page |
| **Core Features** | | |
| Orders | `/dashboard/pages/orders.html` | Order management |
| Products | `/dashboard/pages/products.html` | Product inventory |
| Collections | `/dashboard/pages/collections.html` | Product collections |
| Reviews | `/dashboard/pages/product-reviews.html` | Customer reviews |
| Low Stock | `/dashboard/pages/low-stock.html` | Stock alerts |
| Customers | `/dashboard/pages/Customer.html` | Customer CRM |
| Staff | `/dashboard/pages/Admin.html` | Staff management |
| **Finance** | | |
| Overview | `/dashboard/pages/finance.html` | Finance dashboard |
| Expenses | `/dashboard/pages/expenses.html` | Expense tracking |
| Analytics | `/dashboard/pages/analytics.html` | Business analytics |
| Reports | `/dashboard/pages/reports.html` | Custom reports |
| Insights | `/dashboard/pages/insights.html` | AI insights |
| **Gamification** | | |
| Game Hub | `/dashboard/pages/gamification/game-hub.html` | Gamification center |
| Loyalty | `/dashboard/pages/gamification/loyalty.html` | Loyalty program |
| Scratch Cards | `/dashboard/pages/gamification/scratch-card.html` | Scratch cards |
| MADAS Pass | `/dashboard/pages/gamification/madas-pass.html` | Membership cards |
| **Advanced** | | |
| Domains | `/dashboard/pages/advanced/domains.html` | Custom domains |
| Shares | `/dashboard/pages/advanced/shares.html` | Share management |
| Scan Log | `/dashboard/pages/advanced/scan_log.html` | Scan history |
| Deposits | `/dashboard/pages/advanced/deposit-money-simple.html` | Money deposits |
| **Multi-Tenancy** | | |
| Admin Interface | `/dashboard/multi-tenancy/admin-interface.html` | Business account mgmt |
| **User** | | |
| Profile | `/dashboard/pages/profile.html` | User profile |
| Settings | `/dashboard/pages/settings.html` | Settings |
| Notifications | `/dashboard/pages/notifications.html` | Notifications |

---

## 🔄 Complete User Workflows

### **Workflow 1: New User Registration**

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Discovery                                          │
└─────────────────────────────────────────────────────────────┘
User visits: http://YOUR_IP:3000/
↓
Sees: Hero section, features, testimonials, pricing
↓
Clicks: "Get Started Free" or "Start Free Trial"
↓

┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Registration (4-Step Form)                         │
└─────────────────────────────────────────────────────────────┘
Redirected to: http://YOUR_IP:3000/signup
↓
STEP 1 - Business Information:
  - Business Name: "My Company"
  - Industry: "Retail"
  - Business Email: "business@example.com"
  - Phone: "+1234567890"
  - Company Size: "11-50"
  - Click "Next"
↓
STEP 2 - Plan Selection:
  - View 3 plans: Basic ($29), Professional ($79), Enterprise ($199)
  - Select: "Professional"
  - Click "Next"
↓
STEP 3 - Account Setup:
  - Name: "John Doe"
  - Email: "john@example.com"
  - Password: "SecurePass123!"
  - Confirm Password: "SecurePass123!"
  - ☑ Agree to Terms & Privacy
  - Click "Next"
↓
STEP 4 - Payment/Trial:
  - Click "Start 14-Day Free Trial"
↓
[API POST /api/register]
{
  businessName, industry, businessEmail, phone, companySize,
  plan, userName, userEmail, password
}
↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Success                                            │
└─────────────────────────────────────────────────────────────┘
Redirected to: http://YOUR_IP:3000/signup-success
↓
Shows: Confetti animation, trial info, next steps
↓
Clicks: "Go to Dashboard"
↓

┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Dashboard Access                                   │
└─────────────────────────────────────────────────────────────┘
Redirected to: http://YOUR_IP:3000/dashboard
↓
localStorage set:
  - madasUser: { userId, email, name, role }
  - madasBusiness: { businessId, businessName, plan, trialEnds }
↓
Dashboard loads with:
  ✅ User welcome message
  ✅ Business stats
  ✅ To-do list
  ✅ Recent activity
  ✅ Full navigation menu
↓
User can now:
  ✅ Manage orders
  ✅ Add products
  ✅ View customers
  ✅ Manage staff
  ✅ View analytics
  ✅ Access all features
```

---

### **Workflow 2: Existing User Login**

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Navigate to Login                                  │
└─────────────────────────────────────────────────────────────┘
User at: http://YOUR_IP:3000/ (any marketing page)
↓
Clicks: "Login" in navigation
↓
Redirected to: http://YOUR_IP:3000/login
↓

┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Authentication                                     │
└─────────────────────────────────────────────────────────────┘
Enters:
  - Email: "john@example.com"
  - Password: "SecurePass123!"
  - ☑ Remember me (optional)
↓
Clicks: "Sign In"
↓
[API POST /api/login]
{ email, password, rememberMe }
↓
Shows:
  - Loading spinner
  - "Signing you in..." message
↓
Success:
  - "Welcome back!" message
  - Checkmark icon
↓

┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Dashboard Access                                   │
└─────────────────────────────────────────────────────────────┘
Auto-redirect (2 seconds) to: http://YOUR_IP:3000/dashboard
↓
localStorage populated with user/business data
↓
Dashboard loads with personalized content
↓
User continues working...
```

---

### **Workflow 3: Dashboard Navigation**

```
┌─────────────────────────────────────────────────────────────┐
│  User is at: /dashboard                                     │
└─────────────────────────────────────────────────────────────┘

MAIN MENU NAVIGATION:
├─→ Dashboard (/)
│   → Shows: Stats, to-dos, recent activity
│
├─→ Orders
│   → URL: /dashboard/pages/orders.html
│   → View, search, create, edit orders
│
├─→ Inventory (Dropdown) ▼
│   ├─→ Products: /dashboard/pages/products.html
│   ├─→ Collections: /dashboard/pages/collections.html
│   ├─→ Reviews: /dashboard/pages/product-reviews.html
│   └─→ Low Stock: /dashboard/pages/low-stock.html
│
├─→ Customers
│   → URL: /dashboard/pages/Customer.html
│   → Customer profiles, purchase history
│
├─→ Staff
│   → URL: /dashboard/pages/Admin.html
│   → Manage staff, roles, permissions
│
├─→ Finance (Dropdown) ▼
│   ├─→ Overview: /dashboard/pages/finance.html
│   ├─→ Expenses: /dashboard/pages/expenses.html
│   ├─→ Analytics: /dashboard/pages/analytics.html
│   ├─→ Reports: /dashboard/pages/reports.html
│   └─→ Insights: /dashboard/pages/insights.html
│
├─→ Gamification (Navigate to)
│   ├─→ Game Hub: /dashboard/pages/gamification/game-hub.html
│   ├─→ Loyalty: /dashboard/pages/gamification/loyalty.html
│   ├─→ Scratch Cards: /dashboard/pages/gamification/scratch-card.html
│   └─→ MADAS Pass: /dashboard/pages/gamification/madas-pass.html
│
└─→ User Actions
    ├─→ Profile: /dashboard/pages/profile.html
    ├─→ Settings: /dashboard/pages/settings.html
    └─→ Logout → Redirects to /login
```

---

### **Workflow 4: Multi-Tenancy Management** (Super Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  Super Admin Access                                         │
└─────────────────────────────────────────────────────────────┘
Email: hesainosama@gmail.com (whitelisted)
↓
Login → Dashboard
↓
Navigate to: /dashboard/multi-tenancy/admin-interface.html
↓

BUSINESS MANAGEMENT:
├─→ View All Businesses
│   → Table showing: Name, Plan, Status, Created Date
│
├─→ Add New Business
│   → Modal form:
│     - Business name
│     - Plan selection (Basic/Professional/Enterprise)
│     - Contact email
│     - Enable/disable features
│   → Submit → Creates business in Firebase
│
├─→ Edit Business
│   → Update plan type
│   → Enable/disable features
│   → Change status (active/suspended)
│
├─→ Manage Staff (Per Business)
│   → Select business from dropdown
│   → View staff list for that business
│   → Add staff member:
│     - Email, name
│     - Role: owner/admin/manager/staff
│     - Permissions (checkboxes)
│   → Edit/remove staff
│
└─→ Audit Logs
    → View all admin actions
    → Filter by date, business, action type
```

---

## 🔐 Authentication Flow

### **Authentication Methods:**

1. **Marketing Website Authentication**
   - POST `/api/login` or `/api/register`
   - Stores in `localStorage`:
     ```javascript
     localStorage.setItem('madasUser', JSON.stringify({
       userId, email, name, role
     }));
     localStorage.setItem('madasBusiness', JSON.stringify({
       businessId, businessName, plan, trialEnds
     }));
     ```

2. **Dashboard Dual Authentication Check**
   ```javascript
   // Dashboard/index.html checks:
   function checkAuthentication() {
     // 1. Check localStorage (marketing website auth)
     const madasUser = localStorage.getItem('madasUser');
     if (madasUser) return true;
     
     // 2. Check Firebase Auth (direct dashboard access)
     onAuthStateChanged(auth, (user) => {
       if (user) return true;
     });
     
     // 3. No auth found
     window.location.href = '/login';
   }
   ```

### **Authorization Levels:**

| Role | Access | Features |
|------|--------|----------|
| **Super Admin** | All businesses | Create/edit/delete businesses, manage all staff |
| **Business Owner** | Own business only | Full access, manage staff, all features |
| **Business Admin** | Own business only | Manage staff, full features, no business settings |
| **Manager** | Own business only | Limited staff mgmt, partial features |
| **Staff** | Own business only | View-only or limited edit |

---

## 🔄 Data Flow

### **Registration Flow:**

```
USER SUBMITS FORM
↓
[Frontend] signup.html validates data
↓
[API] POST /api/register
  ├─→ Validate input
  ├─→ Check duplicate email
  ├─→ Hash password (in real implementation)
  ├─→ Create business record in Firestore:
  │   /businesses/{businessId}
  │     - businessName, plan, contact, owner, status
  │
  ├─→ Create user record:
  │   /users/{userId}
  │     - userId, name, email, currentBusinessId
  │
  ├─→ Create staff record:
  │   /businesses/{businessId}/staff/{staffId}
  │     - role: 'owner', permissions: { canManageAll: true }
  │
  ├─→ Create subscription:
  │   /subscriptions/{subscriptionId}
  │     - businessId, plan, status: 'trial', expiresAt
  │
  └─→ Send welcome email (template: email-templates/welcome.html)
↓
[Response] Returns:
{
  success: true,
  user: { userId, email, name, role },
  business: { businessId, businessName, plan, trialEnds },
  token: "jwt_token_here"
}
↓
[Frontend] Stores in localStorage
↓
[Frontend] Redirects to /signup-success
↓
User clicks "Go to Dashboard"
↓
[Frontend] Redirects to /dashboard
↓
Dashboard loads with user data
```

---

### **Login Flow:**

```
USER ENTERS CREDENTIALS
↓
[Frontend] login.html validates input
↓
[API] POST /api/login
  ├─→ Validate email/password
  ├─→ Check user exists
  ├─→ Verify password (hash comparison)
  ├─→ Load user data from Firestore
  ├─→ Load business data
  └─→ Generate session token
↓
[Response] Returns:
{
  success: true,
  user: { ... },
  business: { ... },
  token: "..."
}
↓
[Frontend] Stores in localStorage
↓
Shows success message (2 seconds)
↓
[Frontend] Redirects to /dashboard
↓
Dashboard loads
```

---

### **Dashboard Page Access Flow:**

```
USER CLICKS MENU ITEM
↓
Browser navigates to: /dashboard/pages/orders.html
↓
[Page loads] orders.html checks authentication:
  onAuthStateChanged(auth, (user) => {
    if (!user && !localStorage.getItem('madasUser')) {
      window.location.href = '/login';
    }
  });
↓
If authenticated:
  ├─→ Load page content
  ├─→ Fetch data from Firebase (filtered by businessId)
  ├─→ Render UI
  └─→ Enable interactions
↓
If not authenticated:
  └─→ Redirect to /login
```

---

## 🚀 How to Run the System

### **Development Mode:**

```bash
# Navigate to project root
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"

# Install dependencies (if not already done)
npm install

# Start the complete system
npm start
# OR
node server.js
```

### **Access URLs:**

**From your Mac:**
```
http://localhost:3000
```

**From other devices (same WiFi):**
```
http://192.168.x.x:3000
(Replace with your actual IP - shown in server startup message)
```

---

## 📋 Complete Testing Checklist

### **✅ Marketing Website Tests**

- [ ] Landing page loads (`/`)
- [ ] Pricing page loads (`/pricing`)
- [ ] About page loads (`/about`)
- [ ] Contact page loads (`/contact`)
- [ ] Contact form submits successfully
- [ ] Newsletter subscription works
- [ ] All navigation links work
- [ ] Mobile menu works
- [ ] Footer links work

### **✅ Registration Tests**

- [ ] Signup page loads (`/signup`)
- [ ] Step 1: Business info form validates
- [ ] Step 2: Plan selection works, cards display
- [ ] Step 3: Account setup validates password
- [ ] Step 4: Free trial button works
- [ ] Form submission succeeds
- [ ] Success page shows (`/signup-success`)
- [ ] Confetti animation plays
- [ ] "Go to Dashboard" redirects to `/dashboard`
- [ ] User data stored in localStorage

### **✅ Login Tests**

- [ ] Login page loads (`/login`)
- [ ] Email validation works
- [ ] Password validation works
- [ ] "Remember me" checkbox works
- [ ] Login submission succeeds
- [ ] Loading spinner appears
- [ ] Success message shows
- [ ] Redirects to `/dashboard` after 2 seconds
- [ ] User data stored in localStorage

### **✅ Dashboard Tests**

- [ ] Dashboard loads (`/dashboard`)
- [ ] Welcome message shows user name
- [ ] Stats cards display (Sales, Orders, Customers, Products)
- [ ] To-do list functional
- [ ] Recent activity shows
- [ ] All navigation links work:
  - [ ] Orders
  - [ ] Products
  - [ ] Collections
  - [ ] Reviews
  - [ ] Low Stock
  - [ ] Customers
  - [ ] Staff/Admin
  - [ ] Finance dropdown (all 5 sub-pages)
  - [ ] Profile
  - [ ] Settings
  - [ ] Notifications
- [ ] Inventory dropdown opens/closes
- [ ] Finance dropdown opens/closes
- [ ] Mobile menu works
- [ ] Logout button works

### **✅ Multi-Tenancy Tests**

- [ ] Admin interface loads (`/dashboard/multi-tenancy/admin-interface.html`)
- [ ] Business list displays
- [ ] "Add Business" modal opens
- [ ] Can create new business
- [ ] Can edit business
- [ ] Can suspend/activate business
- [ ] Staff management works
- [ ] Plan configuration saves
- [ ] Feature toggles work

### **✅ Authorization Tests**

- [ ] Unauthenticated user → redirects to `/login`
- [ ] No localStorage → redirects to `/login`
- [ ] Invalid token → redirects to `/login`
- [ ] Unauthorized user → shows `/dashboard/no-access.html`
- [ ] Logout → clears localStorage → redirects to `/login`

---

## 🎯 Server Configuration

### **Main Server** (`server.js` in root)

**Serves:**
- ✅ Marketing website from `marketing-website-standalone/`
- ✅ Dashboard from `Dashboard/`
- ✅ All API endpoints
- ✅ Static assets

**Port:** 3000 (configurable via `PORT` env variable)

**Host:** `0.0.0.0` (accessible on network)

### **Standalone Marketing Server** (`marketing-website-standalone/server-simple.js`)

**For independent marketing website deployment:**
```bash
cd marketing-website-standalone
node server-simple.js
```

---

## 📊 API Endpoints Reference

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|--------------|----------|-------------|
| POST | `/api/register` | `{ businessName, industry, businessEmail, phone, companySize, plan, userName, userEmail, password }` | `{ success, user, business, token }` | New user registration |
| POST | `/api/login` | `{ email, password, rememberMe }` | `{ success, user, business, token }` | User login |
| POST | `/api/contact` | `{ name, email, subject, message }` | `{ success, message }` | Contact form |
| POST | `/api/newsletter/subscribe` | `{ email }` | `{ success, message }` | Newsletter signup |
| GET | `/health` | - | `{ status, mode, timestamp, services }` | Health check |

---

## 🔒 Security Considerations

### **Current Implementation (Mock):**
- ⚠️  Passwords not hashed
- ⚠️  No email verification
- ⚠️  No CSRF protection
- ⚠️  No rate limiting
- ⚠️  Mock JWT tokens

### **Production Requirements:**
- ✅ Implement bcrypt for password hashing
- ✅ Add email verification
- ✅ Implement CSRF tokens
- ✅ Add rate limiting
- ✅ Use real JWT tokens
- ✅ Enable HTTPS
- ✅ Add security headers
- ✅ Implement session management
- ✅ Add 2FA support

---

## 📱 Mobile Access

### **Testing on Mobile Device:**

1. **Find your Mac's IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   
2. **Ensure devices on same WiFi**

3. **Access from phone/tablet:**
   ```
   http://192.168.x.x:3000
   ```

4. **Test responsive design:**
   - Navigation mobile menu
   - Forms on small screens
   - Dashboard on tablet/phone
   - Touch interactions

---

## 🐛 Troubleshooting

### **Issue: 404 Errors**

**Symptoms:** Pages return 404

**Solutions:**
1. Check server is running: `lsof -i :3000`
2. Verify file exists in correct location
3. Check path is absolute (`/dashboard/pages/...`)
4. Restart server

### **Issue: Can't Access Dashboard**

**Symptoms:** Redirected to login immediately

**Solutions:**
1. Check localStorage:
   ```javascript
   console.log(localStorage.getItem('madasUser'));
   ```
2. Try logging in again
3. Clear browser cache
4. Check browser console for errors

### **Issue: Navigation Not Working**

**Symptoms:** Clicking links does nothing or 404

**Solutions:**
1. Verify paths are absolute
2. Check file exists in Dashboard folder
3. Clear browser cache
4. Check server static file serving

### **Issue: Live Server Conflicts**

**Symptoms:** CSP errors, wrong port

**Solution:** Stop Live Server completely, use only Node.js server

---

## ✅ Final Status

### **Completed:**
- ✅ Project restructured into 2 main folders
- ✅ Marketing website fully functional
- ✅ Dashboard organized with subfolders
- ✅ Multi-tenancy system separated
- ✅ All documentation organized
- ✅ Single unified server created
- ✅ All paths updated to absolute
- ✅ Duplicate files removed

### **Ready for:**
- ✅ Development
- ✅ Testing
- ✅ Deployment preparation

---

## 🎯 Quick Start Guide

```bash
# 1. Navigate to project
cd "/Users/mac/university/Project's/Web/Front-End/Projects/Madas/Front-end/dashboard/sys"

# 2. Install dependencies
npm install

# 3. Start server
npm start

# 4. Open browser
# Visit: http://localhost:3000

# 5. Test the flow:
# → Sign up → Login → Dashboard → Navigate → Logout
```

**Your system is now fully structured and ready to use!** 🚀



