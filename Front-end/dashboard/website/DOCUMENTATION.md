# MADAS Website Documentation

## 📋 Overview

The MADAS Website is a comprehensive SaaS platform built with Next.js 15, Firebase, and Tailwind CSS. It provides a complete business management solution with website building capabilities, user authentication, business isolation, and admin management.

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15.5.3 with React 19.1.0
- **Styling**: Tailwind CSS 4.0
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **Language**: TypeScript
- **Build Tool**: Turbopack

### Project Structure
```
website/
├── src/                          # Next.js source code
│   ├── app/                      # App Router pages
│   ├── components/               # Reusable React components
│   ├── lib/                      # Core services and utilities
│   └── modules/                  # Modular business logic
├── public/                       # Static assets and HTML pages
│   ├── pages/                    # Dashboard HTML pages
│   ├── E-comm/                   # E-commerce website builder
│   ├── js/                       # JavaScript modules
│   └── assets/                   # Images, CSS, sounds
├── package.json                  # Dependencies and scripts
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
└── tailwind.config.js           # Tailwind CSS configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore and Authentication enabled

### Installation
```bash
cd website
npm install
```

### Development
```bash
npm run dev
```
The application will be available at `http://localhost:3001`

### Production Build
```bash
npm run build
npm start
```

## 📱 Application Features

### 1. Landing Page (`/`)
- Modern hero section with call-to-action
- Feature highlights
- Pricing information
- Navigation to plans and signup

### 2. Plans Page (`/plans`)
- Three subscription tiers: Starter, Pro, Enterprise
- Feature comparison
- "Choose Plan" buttons leading to checkout

### 3. Checkout Flow (`/checkout`)
- Fake payment simulation
- Plan selection confirmation
- Redirect to business setup

### 4. Business Setup (`/business-setup`)
- Business information form
- Owner details collection
- Automatic user and business creation
- Integration with Firebase Authentication

### 5. Dashboard System
- Business-specific dashboards (`/pages/dashboard/{businessId}`)
- Multiple dashboard pages (products, orders, analytics, etc.)
- Business isolation and data security
- Staff management capabilities

### 6. E-commerce Builder (`/E-comm/`)
- Professional website builder
- Theme library
- Product management
- Publishing system

## 🔐 Authentication System

### User Types
1. **Business Owners**: Full access to their business dashboard
2. **Staff Members**: Limited access based on permissions
3. **Admin Users**: Global access to all businesses

### Authentication Flow
1. **Signup**: Creates user in Firebase Auth + Firestore documents
2. **Login**: Authenticates and loads business context
3. **Business Isolation**: All data filtered by `businessId`

### Firestore Schema
```javascript
// /users/{uid}
{
  uid: string,
  email: string,
  businessId: string,
  role: "owner" | "staff" | "admin",
  createdAt: timestamp,
  updatedAt: timestamp
}

// /businesses/{businessId}
{
  id: string,
  ownerUid: string,
  businessName: string,
  plan: "Starter" | "Pro" | "Enterprise",
  staff: string[], // Array of staff UIDs
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🏢 Business Isolation

### Key Features
- Each business has isolated data
- Users can only access their business data
- Staff members inherit business permissions
- Admin users can access all businesses

### Implementation
- All Firestore queries filtered by `businessId`
- Business context loaded on authentication
- Permission-based UI rendering
- Secure data access patterns

## 📊 Dashboard Pages

### Main Dashboard (`/pages/dashboard/{businessId}`)
- Business overview and statistics
- Quick access to all features
- Recent activity feed
- Staff management

### Products Management (`/pages/products.html`)
- Product catalog management
- Inventory tracking
- Low stock alerts
- Product reviews

### Orders Management (`/pages/orders.html`)
- Order processing
- Customer management
- Payment tracking
- Order analytics

### Analytics (`/pages/analytics.html`)
- Sales analytics
- Customer insights
- Performance metrics
- Revenue tracking

### Staff Management (`/pages/staff.html`)
- Team member management
- Permission assignment
- Staff invitation system
- Role-based access control

## 🛠️ Development

### Key Services

#### Authentication Service (`/src/lib/authService.ts`)
- Firebase Authentication integration
- User session management
- Business context loading
- Permission checking

#### Business Service (`/src/lib/businessService.ts`)
- Business data operations
- Firestore integration
- Data isolation
- Mock data fallbacks

#### Modular Services (`/src/modules/`)
- **Signup Service**: User and business creation
- **Login Service**: Authentication with fail-safe user creation
- **Business Service**: Business document management

### Firebase Configuration
```javascript
// firebaseConfig.js
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### Environment Setup
1. Create Firebase project
2. Enable Firestore and Authentication
3. Configure Firestore security rules
4. Update `firebaseConfig.js` with your project details

## 🔧 Configuration

### Next.js Configuration (`next.config.ts`)
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options */
};

export default nextConfig;
```

### TypeScript Configuration (`tsconfig.json`)
- Strict type checking enabled
- Path mapping for clean imports
- Next.js optimizations

### Tailwind CSS
- Custom color palette for MADAS branding
- Responsive design utilities
- Component-based styling

## 🚀 Deployment

### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init hosting

# Build and deploy
npm run build
firebase deploy
```

### Environment Variables
Create `.env.local` for local development:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

## 🧪 Testing

### Test Pages
- `/test-signup`: Test user signup and business creation
- `/business-setup`: Test complete business setup flow

### Manual Testing Checklist
- [ ] User signup creates proper Firestore documents
- [ ] Login redirects to correct business dashboard
- [ ] Business isolation works correctly
- [ ] Staff permissions function properly
- [ ] Dashboard pages load business-specific data

## 🐛 Troubleshooting

### Common Issues

#### Login Loop
- **Cause**: Missing user documents in Firestore
- **Solution**: Use the fail-safe login service that auto-creates missing documents

#### Permission Errors
- **Cause**: Firestore security rules blocking access
- **Solution**: Ensure rules allow authenticated users to access their business data

#### Business Context Missing
- **Cause**: User not properly linked to business
- **Solution**: Check `/users/{uid}` document has correct `businessId`

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'true');
```

## 📚 API Reference

### Authentication Methods
```typescript
// Sign up new user
await signupService.signUpWithEmailAndPassword(email, password, businessName, ownerName, plan);

// Sign in existing user
await loginService.signInWithEmailAndPassword(email, password);

// Sign out
await authService.signOut();
```

### Business Operations
```typescript
// Get business data
const data = await businessService.getBusinessData(collection, businessId);

// Create business
await businessService.createBusiness(businessId, businessData);

// Update business
await businessService.updateBusiness(businessId, updateData);
```

## 🔒 Security

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Business data isolation
    match /{collection}/{document} {
      allow read, write: if request.auth != null && 
        resource.data.businessId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.businessId;
    }
  }
}
```

### Best Practices
- Always validate user permissions
- Use business context for data filtering
- Implement proper error handling
- Regular security audits

## 📈 Performance

### Optimization Strategies
- Next.js automatic code splitting
- Firebase offline persistence
- Lazy loading of dashboard components
- Optimized Firestore queries

### Monitoring
- Firebase Analytics integration
- Performance monitoring
- Error tracking
- User behavior analytics

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement changes
3. Test thoroughly
4. Submit pull request
5. Code review and merge

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Component-based architecture

## 📞 Support

### Getting Help
- Check this documentation first
- Review Firebase console for errors
- Test with the provided test pages
- Check browser console for client-side errors

### Contact
For technical support or questions about the MADAS platform, please refer to the project maintainers.

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: MADAS Development Team
