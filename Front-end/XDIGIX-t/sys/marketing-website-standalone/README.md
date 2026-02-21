# 🌐 MADAS Marketing Website

Modern, responsive marketing website for SaaS business registration with multi-step signup flow.

## 📂 Contents

```
marketing-website-standalone/
├── index.html           - Landing page
├── pricing-new.html     - Pricing tiers
├── signup-new.html      - Multi-step registration
├── about-new.html       - About us
├── contact-new.html     - Contact form
├── api/
│   └── registration.js  - Backend API
├── server.js            - Express server
├── package.json         - Dependencies
└── README.md            - This file
```

## 🚀 Quick Start

### Option 1: Open Files Directly
```bash
open index.html
```

### Option 2: Simple HTTP Server
```bash
python3 -m http.server 8000
# Visit: http://localhost:8000/index.html
```

### Option 3: Full Backend (Recommended)
```bash
# Install dependencies
npm install

# Start server
npm start

# Visit: http://localhost:3000
```

## 📄 Pages

### 1. Landing Page (index.html)
- Hero section with compelling headline
- Value propositions (4 benefits)
- Features overview (8 features)
- Customer testimonials (3)
- Multiple CTAs
- Footer with links

### 2. Pricing (pricing-new.html)
- 3 pricing tiers:
  - Basic: $29/month
  - Professional: $79/month (Most Popular)
  - Enterprise: $199/month
- Monthly/Annual toggle
- FAQ accordion

### 3. Signup (signup-new.html)
- Multi-step wizard (4 steps)
- Progress indicator
- Step 1: Business information
- Step 2: Plan selection
- Step 3: Account setup
- Step 4: Free trial
- Form validation
- Password strength indicator

### 4. About (about-new.html)
- Company mission
- Core values (4)
- Stats section
- CTA

### 5. Contact (contact-new.html)
- Contact information
- Contact form
- Success alerts

## 🔧 Backend API

### POST /api/register
Register new business account

**Request:**
```json
{
  "businessName": "Acme Corp",
  "industry": "retail",
  "businessEmail": "admin@acme.com",
  "phone": "+1234567890",
  "companySize": "11-50",
  "plan": "professional",
  "userName": "John Doe",
  "userEmail": "john@acme.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": { "userId": "...", "email": "...", "name": "..." },
  "business": { "businessId": "...", "businessName": "...", "plan": "...", "trialEnds": "..." },
  "token": "firebase_custom_token"
}
```

### POST /api/contact
Handle contact form submissions

**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "subject": "sales",
  "message": "I'm interested in..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

## 🎨 Design Features

- **Colors:** Indigo Blue (#6366F1) & Pink (#EC4899)
- **Font:** Inter (Google Fonts)
- **Responsive:** Mobile, Tablet, Desktop
- **Animations:** Fade-in, hover effects, smooth transitions
- **Components:** Cards, modals, forms, buttons

## 🔒 Security

- Email validation
- Password strength checking
- Form validation
- Firebase Auth integration
- Input sanitization

## 📱 Responsive Design

- Desktop: 1024px+
- Tablet: 768px-1023px
- Mobile: <768px
- Hamburger menu on mobile
- Touch-friendly buttons

## 🚀 Deployment

### Vercel/Netlify (Recommended)
```bash
# Build and deploy
vercel --prod
# or
netlify deploy --prod
```

### Custom Server
```bash
# Run with PM2
pm2 start server.js --name madas-website
pm2 save
```

## 📊 Features

✅ Modern, professional design
✅ Multi-step signup wizard
✅ 3 pricing tiers
✅ Form validation
✅ Password strength meter
✅ Loading states
✅ Success messages
✅ Mobile responsive
✅ SEO friendly
✅ Fast loading
✅ Accessible

## 🔧 Configuration

### Firebase Setup
1. Create Firebase project
2. Enable Authentication
3. Enable Firestore
4. Download `serviceAccountKey.json`
5. Place in project root

### Environment Variables
Create `.env` file:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
PORT=3000
```

## 📖 Documentation

- Full documentation: `../WEBSITE_GUIDE.md`
- System architecture: `../MULTI_TENANCY_GUIDE.md`
- Quick reference: `../QUICK_REFERENCE.md`

## 💡 Tips

- Test all pages before deployment
- Configure Firebase before using signup
- Add email service for notifications
- Enable analytics tracking
- Set up monitoring

## 🎯 User Flow

```
Visitor → Landing Page → Pricing Page → Signup Page
         ↓
    Choose Plan → Fill Form → Submit
         ↓
    Account Created → Redirect to Dashboard
```

## 🔄 Updates

To update pages:
1. Edit HTML files directly
2. Test locally
3. Commit changes
4. Redeploy

## 📞 Support

- Check documentation in parent directory
- Review code comments
- Test with browser DevTools
- Check Firebase Console for issues

## 🎉 Ready to Launch!

Everything is set up and ready to accept customers!

**Start server and visit http://localhost:3000 to see it in action! 🚀**


Modern, responsive marketing website for SaaS business registration with multi-step signup flow.

## 📂 Contents

```
marketing-website-standalone/
├── index.html           - Landing page
├── pricing-new.html     - Pricing tiers
├── signup-new.html      - Multi-step registration
├── about-new.html       - About us
├── contact-new.html     - Contact form
├── api/
│   └── registration.js  - Backend API
├── server.js            - Express server
├── package.json         - Dependencies
└── README.md            - This file
```

## 🚀 Quick Start

### Option 1: Open Files Directly
```bash
open index.html
```

### Option 2: Simple HTTP Server
```bash
python3 -m http.server 8000
# Visit: http://localhost:8000/index.html
```

### Option 3: Full Backend (Recommended)
```bash
# Install dependencies
npm install

# Start server
npm start

# Visit: http://localhost:3000
```

## 📄 Pages

### 1. Landing Page (index.html)
- Hero section with compelling headline
- Value propositions (4 benefits)
- Features overview (8 features)
- Customer testimonials (3)
- Multiple CTAs
- Footer with links

### 2. Pricing (pricing-new.html)
- 3 pricing tiers:
  - Basic: $29/month
  - Professional: $79/month (Most Popular)
  - Enterprise: $199/month
- Monthly/Annual toggle
- FAQ accordion

### 3. Signup (signup-new.html)
- Multi-step wizard (4 steps)
- Progress indicator
- Step 1: Business information
- Step 2: Plan selection
- Step 3: Account setup
- Step 4: Free trial
- Form validation
- Password strength indicator

### 4. About (about-new.html)
- Company mission
- Core values (4)
- Stats section
- CTA

### 5. Contact (contact-new.html)
- Contact information
- Contact form
- Success alerts

## 🔧 Backend API

### POST /api/register
Register new business account

**Request:**
```json
{
  "businessName": "Acme Corp",
  "industry": "retail",
  "businessEmail": "admin@acme.com",
  "phone": "+1234567890",
  "companySize": "11-50",
  "plan": "professional",
  "userName": "John Doe",
  "userEmail": "john@acme.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": { "userId": "...", "email": "...", "name": "..." },
  "business": { "businessId": "...", "businessName": "...", "plan": "...", "trialEnds": "..." },
  "token": "firebase_custom_token"
}
```

### POST /api/contact
Handle contact form submissions

**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "subject": "sales",
  "message": "I'm interested in..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

## 🎨 Design Features

- **Colors:** Indigo Blue (#6366F1) & Pink (#EC4899)
- **Font:** Inter (Google Fonts)
- **Responsive:** Mobile, Tablet, Desktop
- **Animations:** Fade-in, hover effects, smooth transitions
- **Components:** Cards, modals, forms, buttons

## 🔒 Security

- Email validation
- Password strength checking
- Form validation
- Firebase Auth integration
- Input sanitization

## 📱 Responsive Design

- Desktop: 1024px+
- Tablet: 768px-1023px
- Mobile: <768px
- Hamburger menu on mobile
- Touch-friendly buttons

## 🚀 Deployment

### Vercel/Netlify (Recommended)
```bash
# Build and deploy
vercel --prod
# or
netlify deploy --prod
```

### Custom Server
```bash
# Run with PM2
pm2 start server.js --name madas-website
pm2 save
```

## 📊 Features

✅ Modern, professional design
✅ Multi-step signup wizard
✅ 3 pricing tiers
✅ Form validation
✅ Password strength meter
✅ Loading states
✅ Success messages
✅ Mobile responsive
✅ SEO friendly
✅ Fast loading
✅ Accessible

## 🔧 Configuration

### Firebase Setup
1. Create Firebase project
2. Enable Authentication
3. Enable Firestore
4. Download `serviceAccountKey.json`
5. Place in project root

### Environment Variables
Create `.env` file:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
PORT=3000
```

## 📖 Documentation

- Full documentation: `../WEBSITE_GUIDE.md`
- System architecture: `../MULTI_TENANCY_GUIDE.md`
- Quick reference: `../QUICK_REFERENCE.md`

## 💡 Tips

- Test all pages before deployment
- Configure Firebase before using signup
- Add email service for notifications
- Enable analytics tracking
- Set up monitoring

## 🎯 User Flow

```
Visitor → Landing Page → Pricing Page → Signup Page
         ↓
    Choose Plan → Fill Form → Submit
         ↓
    Account Created → Redirect to Dashboard
```

## 🔄 Updates

To update pages:
1. Edit HTML files directly
2. Test locally
3. Commit changes
4. Redeploy

## 📞 Support

- Check documentation in parent directory
- Review code comments
- Test with browser DevTools
- Check Firebase Console for issues

## 🎉 Ready to Launch!

Everything is set up and ready to accept customers!

**Start server and visit http://localhost:3000 to see it in action! 🚀**



