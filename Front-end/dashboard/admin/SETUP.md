# Admin Dashboard Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd admin
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The admin dashboard will be available at: **http://localhost:3002**

### 3. Create Admin User

You need to create an admin user in Firestore to access the dashboard.

#### Option A: Using Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `madas-store`
3. Go to **Authentication** → **Users** → **Add User**
4. Create a user with email/password
5. Go to **Firestore Database**
6. Create a document in the `staff` collection with the user's UID
7. Set the following fields:
   ```json
   {
     "email": "your-email@example.com",
     "role": "admin",
     "approved": true,
     "permissions": {
       "home": ["view"],
       "orders": ["view", "search", "create", "edit"],
       "inventory": ["view", "edit"],
       "customers": ["view", "edit"],
       "employees": ["view", "edit"],
       "finance": ["view", "reports"],
       "analytics": ["view", "export"],
       "settings": ["view", "edit"]
     },
     "createdAt": "2024-01-01T00:00:00Z",
     "updatedAt": "2024-01-01T00:00:00Z"
   }
   ```

#### Option B: Using Script (Advanced)
1. Download your Firebase service account key
2. Place it as `service-account-key.json` in the admin folder
3. Run: `node scripts/create-admin.js`

### 4. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

## Admin Dashboard Features

### 🔐 Authentication
- **Login Page**: `/login`
- **Role-based Access**: Only users with `role: "admin"` can access
- **Auto-redirect**: Redirects to login if not authenticated

### 👥 Users Management (`/users`)
- View all registered users
- Search by email
- Display user details (email, role, plan, signup date)
- Business association tracking

### 🏢 Businesses Management (`/businesses`)
- View all registered businesses
- Search by business name
- Display business details (name, owner, plan, industry, contact info)
- Status tracking (active, inactive, pending)

### 🛡️ Permissions Control (`/permissions`)
- Select user from list
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

## Security Features

### Firestore Rules
- Admin-only access to staff and businesses collections
- Users can only access their own data
- Secure permission checking

### Authentication Guard
- Automatic redirect to login for unauthenticated users
- Role verification for admin access
- Session management

## Troubleshooting

### "Access denied" Error
- Make sure your user has `role: "admin"` in the staff collection
- Verify `approved: true` in your staff document
- Check that the email matches your Firebase Auth email

### "Failed to load users" Error
- Verify Firestore rules are deployed
- Check that the staff collection exists
- Ensure you have proper permissions

### Login Issues
- Verify Firebase configuration in `src/lib/firebase.ts`
- Check that Authentication is enabled in Firebase Console
- Ensure email/password authentication is enabled

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
├── scripts/                # Setup scripts
├── firestore.rules         # Security rules
└── package.json
```

### Available Scripts
- `npm run dev` - Start development server (port 3002)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Production Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables if needed
3. Deploy automatically on push

### Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Build: `npm run build`
5. Deploy: `firebase deploy`

### Environment Variables
No environment variables are required as Firebase config is included in the code.

## Support

For issues or questions:
1. Check the console for error messages
2. Verify Firebase configuration
3. Check Firestore rules
4. Ensure admin user is properly set up

