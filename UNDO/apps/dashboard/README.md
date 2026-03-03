# MADAS Dashboard

A modern, responsive dashboard built with Next.js 14, TypeScript, and TailwindCSS for managing business operations.

## Features

- **Authentication**: Firebase Auth with role-based access control
- **Responsive Design**: Mobile-first design with dark mode support
- **Real-time Data**: Firestore integration for live updates
- **Task Management**: Interactive todo list with Firebase storage
- **Analytics**: Dashboard with key metrics and charts
- **Permission System**: Granular access control for different user roles
- **Modern UI**: Clean, professional interface with smooth animations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Icons**: Lucide React
- **Charts**: Chart.js with React Chart.js 2

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp env.local.example .env.local
   ```
   
   Fill in your Firebase configuration and other environment variables.

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3001](http://localhost:3001)

## Project Structure

```
apps/dashboard/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Dashboard home page
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   └── no-access/         # Access denied page
├── src/
│   ├── components/        # React components
│   │   ├── dashboard/     # Dashboard-specific components
│   │   ├── layout/        # Layout components
│   │   └── ui/            # Reusable UI components
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   └── lib/               # Utility functions
├── public/                # Static assets
└── package.json
```

## Key Components

### Authentication
- **AuthContext**: Manages user authentication state
- **Login/Signup**: Firebase Auth integration
- **Permission System**: Role-based access control

### Dashboard
- **StatsCards**: Key business metrics
- **TodoList**: Task management with Firestore
- **RecentActivity**: Real-time activity feed
- **TopProducts**: Best-selling products
- **SalesByCategory**: Category-wise sales data

### Layout
- **Header**: Navigation and user controls
- **Sidebar**: Main navigation with permissions
- **DashboardLayout**: Main layout wrapper

## Features

### User Management
- Staff registration with admin approval
- Role-based permissions (admin, staff)
- User profile management
- Access control for different sections

### Dashboard Analytics
- Total sales, orders, customers, products
- Recent activity tracking
- Top-selling products
- Sales by category
- Real-time data updates

### Task Management
- Personal todo list
- Firebase integration
- Real-time synchronization
- Mark as complete/delete tasks

### Responsive Design
- Mobile-first approach
- Dark mode support
- Smooth animations
- Professional UI/UX

## Environment Variables

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
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

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

## Firebase Setup

### Firestore Collections

1. **staff**: User accounts and permissions
2. **todos**: Personal task lists
3. **stats**: Dashboard statistics
4. **analysis**: Analytics data

### Security Rules

```javascript
// Example Firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Staff collection - users can only access their own data
    match /staff/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Todos collection - users can only access their own todos
    match /todos/{todoId} {
      allow read, write: if request.auth != null && 
        resource.data.uid == request.auth.uid;
    }
  }
}
```

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy
firebase deploy --only hosting:dashboard
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- TailwindCSS for styling
- ESLint for code quality
- Prettier for formatting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the MADAS platform and is proprietary software.

## Support

For support and questions, please contact the development team or create an issue in the repository.
