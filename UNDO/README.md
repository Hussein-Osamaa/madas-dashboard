# Madas SaaS Platform

A modern SaaS platform built with Next.js 14, Firebase, and Stripe for website building and management.

## 🏗️ Architecture

This is a **Turborepo monorepo** containing:

- **`/apps/marketing`** - Company website (landing + pricing) - Next.js 14
- **`/apps/dashboard`** - Authenticated user dashboard - Next.js 14  
- **`/apps/webbuilder`** - Drag & Drop editor + renderer - Next.js 14
- **`/apps/admin`** - Internal admin panel - Next.js 14
- **`/backend`** - Firebase Functions (Stripe, publish, business logic)
- **`/shared`** - Shared components, hooks, types, and utilities

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), TailwindCSS, shadcn/ui
- **Backend**: Firebase (Auth, Firestore, Storage, Hosting, Functions)
- **Payments**: Stripe (subscriptions monthly/yearly)
- **Monorepo**: Turborepo
- **Language**: TypeScript

## 📦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 8+
- Firebase CLI
- Stripe CLI (for webhook testing)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase and Stripe keys

# Start development servers
npm run dev
```

### Available Scripts

```bash
# Development
npm run dev              # Start all apps in development
npm run dev:marketing    # Start only marketing app
npm run dev:dashboard    # Start only dashboard app
npm run dev:webbuilder   # Start only webbuilder app
npm run dev:admin        # Start only admin app

# Building
npm run build            # Build all apps
npm run build:marketing  # Build only marketing app

# Linting & Testing
npm run lint             # Lint all apps
npm run type-check       # Type check all apps
npm run test             # Test all apps

# Deployment
npm run deploy           # Deploy all apps
npm run deploy:marketing # Deploy only marketing app
```

## 🔥 Firebase Setup

### Hosting Targets

Each app is deployed to its own Firebase hosting target:

- `marketing` → `your-project.web.app`
- `dashboard` → `dashboard.your-project.web.app`  
- `webbuilder` → `builder.your-project.web.app`
- `admin` → `admin.your-project.web.app`

### Environment Variables

Create `.env.local` files in each app directory:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🏛️ Project Structure

```
my-saas-builder/
├── apps/
│   ├── marketing/        # Landing page + pricing
│   ├── dashboard/        # User dashboard
│   ├── webbuilder/       # Drag & drop editor
│   └── admin/            # Admin panel
├── backend/              # Firebase Functions
├── shared/               # Shared code
│   ├── components/       # Shared UI components
│   ├── hooks/           # Shared React hooks
│   ├── lib/             # Shared utilities
│   └── types/           # TypeScript types
├── package.json         # Root package.json
├── turbo.json          # Turborepo config
└── README.md
```

## 🚀 Deployment

### Firebase Hosting

```bash
# Deploy all apps
npm run deploy

# Deploy specific app
npm run deploy:marketing
```

### Environment Setup

1. Set up Firebase project with multiple hosting targets
2. Configure Firestore security rules
3. Set up Stripe webhooks
4. Configure environment variables

## 📝 Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Write tests for new features
- Update documentation when adding new features
- Use conventional commits for better changelog generation

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

Private - All rights reserved
