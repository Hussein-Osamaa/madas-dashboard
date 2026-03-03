# Admin Panel App

The internal admin panel for managing the Madas platform - featuring user management, website oversight, subscription monitoring, and system configuration.

## 🚀 Features

- **Dashboard** - Overview with analytics and system status
- **User Management** - Manage user accounts and permissions
- **Website Management** - Oversee websites and content
- **Subscription Management** - Monitor billing and subscriptions
- **System Settings** - Configure platform settings
- **Analytics** - Platform performance metrics
- **Security** - Security monitoring and controls

## 🛠️ Tech Stack

- **Next.js 14** - App Router with TypeScript
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI components
- **Recharts** - Data visualization
- **React Table** - Advanced table functionality
- **React Hot Toast** - Notifications
- **Shared Package** - Common components and utilities

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- npm 8+
- Admin access to the platform

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.local.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3001
NEXT_PUBLIC_BUILDER_URL=http://localhost:3002
NEXT_PUBLIC_ADMIN_URL=http://localhost:3003

# Admin Configuration
ADMIN_EMAIL=admin@madas.com
ADMIN_PASSWORD=your_admin_password

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/          # Admin layout components
│   │   ├── AdminLayout.tsx
│   │   ├── AdminSidebar.tsx
│   │   └── AdminHeader.tsx
│   ├── pages/           # Page components
│   │   ├── Dashboard.tsx
│   │   ├── UsersPage.tsx
│   │   ├── WebsitesPage.tsx
│   │   ├── SubscriptionsPage.tsx
│   │   └── SettingsPage.tsx
│   └── ui/              # Reusable UI components
│       ├── StatsCard.tsx
│       ├── RecentActivity.tsx
│       ├── QuickActions.tsx
│       └── SystemStatus.tsx
└── app/                 # Next.js App Router
    ├── globals.css      # Global styles
    ├── layout.tsx       # Root layout
    ├── page.tsx         # Dashboard page
    ├── users/           # User management
    ├── websites/        # Website management
    ├── subscriptions/   # Subscription management
    └── settings/        # Settings page
```

## 🎨 Pages

### Dashboard (`/`)
- **Overview Stats** - Users, websites, subscriptions, revenue
- **Recent Activity** - Latest platform events
- **Quick Actions** - Common administrative tasks
- **System Status** - Component health monitoring

### Users (`/users`)
- **User List** - All registered users with filters
- **User Details** - Individual user information
- **Role Management** - Admin/user role assignment
- **Account Actions** - Suspend, activate, delete users

### Websites (`/websites`)
- **Website List** - All created websites
- **Website Details** - Individual website information
- **Status Management** - Published/draft/archived status
- **Analytics** - Website performance metrics

### Subscriptions (`/subscriptions`)
- **Subscription List** - All active subscriptions
- **Billing Management** - Payment status and history
- **Plan Management** - Free/Pro/Business plans
- **Revenue Analytics** - Financial metrics

### Settings (`/settings`)
- **General Settings** - Site configuration
- **Email Settings** - SMTP and notification config
- **Security Settings** - Access controls and permissions
- **Storage Settings** - File upload limits and types
- **Appearance Settings** - Theme and branding
- **System Settings** - Maintenance mode and system info

## 🔧 Components

### Layout Components
- **AdminLayout** - Main layout with sidebar and header
- **AdminSidebar** - Navigation sidebar with menu items
- **AdminHeader** - Top header with search and user menu

### UI Components
- **StatsCard** - Metric display cards
- **RecentActivity** - Activity feed component
- **QuickActions** - Action buttons for common tasks
- **SystemStatus** - System health monitoring

### Page Components
- **Dashboard** - Main dashboard with overview
- **UsersPage** - User management interface
- **WebsitesPage** - Website management interface
- **SubscriptionsPage** - Subscription management interface
- **SettingsPage** - Settings configuration interface

## 🎯 Features

### User Management
- View all registered users
- Filter by role, status, subscription
- Edit user information
- Suspend/activate accounts
- Send emails to users
- Export user data

### Website Management
- View all created websites
- Filter by status, owner, template
- View website details
- Monitor website performance
- Manage website status
- Export website data

### Subscription Management
- Monitor all subscriptions
- Track revenue and billing
- Manage subscription status
- View payment history
- Handle billing issues
- Export subscription data

### System Administration
- Configure platform settings
- Monitor system health
- Manage security settings
- Handle maintenance mode
- View system logs
- Backup and restore

## 🔒 Security

### Access Control
- Admin-only access
- Role-based permissions
- Session management
- Audit logging

### Data Protection
- Encrypted data transmission
- Secure API endpoints
- Input validation
- XSS protection

## 📊 Analytics

### Metrics Tracked
- User registration and activity
- Website creation and usage
- Subscription conversions
- Revenue and billing
- System performance
- Error rates

### Reporting
- Daily/weekly/monthly reports
- Export capabilities
- Custom date ranges
- Automated reports

## 🚀 Deployment

### Firebase Hosting

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting:admin
```

### Environment Setup

1. Set up Firebase project with hosting
2. Configure admin access controls
3. Set up environment variables in Firebase
4. Deploy the app

## 🎨 Customization

### Adding New Pages

1. Create page component in `src/components/pages/`
2. Add route in `app/` directory
3. Add navigation item in `AdminSidebar.tsx`
4. Update routing and permissions

### Adding New Components

1. Create component in `src/components/ui/`
2. Export from appropriate index file
3. Use in pages as needed
4. Follow existing patterns

### Styling

- Modify `app/globals.css` for global styles
- Update `tailwind.config.js` for theme customization
- Use existing admin CSS classes
- Follow design system patterns

## 📱 Responsive Design

- Mobile-first approach
- Responsive sidebar navigation
- Mobile-friendly tables
- Touch-optimized interactions

## 🤝 Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Test admin functionality thoroughly
4. Update documentation when adding new features
5. Ensure security best practices

## 📄 License

Private - All rights reserved
