# Admin Dashboard

A comprehensive admin dashboard for managing users, businesses, and permissions in the MADAS platform.

## Features

### 🔐 Admin Authentication
- Role-based access control (admin only)
- Firebase Authentication integration
- Secure login with email/password

### 👥 Users Management
- View all registered users
- Search users by email
- Display user details (email, role, plan, signup date)
- Business association tracking

### 🏢 Businesses Management
- View all registered businesses
- Search businesses by name
- Display business details (name, owner, plan, industry, contact info)
- Status tracking (active, inactive, pending)

### 🛡️ Permissions Control
- Granular permission management
- Real-time permission updates
- Permission categories:
  - Dashboard access
  - Orders management
  - Inventory control
  - Customer management
  - Staff management
  - Financial reports
  - Analytics access
  - Settings configuration

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Firebase** - Authentication & Firestore
- **Lucide React** - Icons

## Getting Started

### Prerequisites
- Node.js 18+ 
- Firebase project with Firestore enabled
- Admin user account in Firestore `staff` collection

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Access the admin dashboard:
```
http://localhost:3002
```

## Firestore Structure

### Staff Collection (`/staff/{uid}`)
```typescript
{
  email: string;
  role: 'admin' | 'owner' | 'user';
  approved: boolean;
  permissions: {
    home: string[];
    orders: string[];
    inventory: string[];
    customers: string[];
    employees: string[];
    finance: string[];
    analytics: string[];
    settings: string[];
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Businesses Collection (`/businesses/{businessId}`)
```typescript
{
  businessName: string;
  ownerUid: string;
  ownerName: string;
  industry: string;
  email: string;
  phone: string;
  plan: 'Starter' | 'Pro' | 'Enterprise';
  status: 'active' | 'inactive' | 'pending';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Security

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Staff collection - admin only
    match /staff/{uid} {
      allow read, write: if request.auth != null 
        && get(/databases/$(database)/documents/staff/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Businesses collection - admin only
    match /businesses/{businessId} {
      allow read, write: if request.auth != null 
        && get(/databases/$(database)/documents/staff/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Admin Setup

To create an admin user:

1. Add a document to the `staff` collection with your user UID
2. Set the following fields:
   - `email`: Your email address
   - `role`: "admin"
   - `approved`: true
   - `permissions`: Full permissions object

## Development

### Project Structure
```
admin/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── (admin)/        # Protected admin routes
│   │   ├── login/          # Login page
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   ├── AuthGuard.tsx   # Authentication guard
│   │   └── Sidebar.tsx     # Navigation sidebar
│   └── lib/                # Utilities and services
│       ├── firebase.ts     # Firebase configuration
│       ├── authService.ts  # Authentication service
│       └── adminService.ts # Admin data operations
├── public/                 # Static assets
└── package.json
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

The admin dashboard can be deployed to:
- Vercel (recommended for Next.js)
- Netlify
- Firebase Hosting
- Any Node.js hosting platform

Make sure to set up the Firebase configuration and Firestore security rules in production.
