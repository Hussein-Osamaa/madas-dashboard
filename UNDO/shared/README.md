# @shared/shared

Shared components, hooks, types, and utilities for the Madas SaaS platform.

## 📦 What's Included

### 🔧 **Lib Utilities**
- **Firebase Configuration** - Pre-configured Firebase client
- **Stripe Integration** - Stripe client and subscription plans
- **Utility Functions** - Common utilities (formatting, debounce, etc.)
- **Constants** - App-wide constants and configuration

### 🎨 **Components**
- **UI Components** - Reusable UI components (Button, Input, Card, etc.)
- **Form Components** - Form-specific components
- **Layout Components** - Layout and navigation components
- **Feedback Components** - Loading, error, and success states

### 🪝 **Hooks**
- **useAuth** - Firebase authentication hook
- **useLocalStorage** - Local storage management
- **useDebounce** - Debounced values
- **useAsync** - Async operation handling

### 📝 **Types**
- **Auth Types** - Authentication and user types
- **Website Types** - Website and content types
- **Subscription Types** - Billing and subscription types
- **API Types** - API request/response types
- **Common Types** - Shared utility types

## 🚀 Usage

### Installation
```bash
# Install dependencies
npm install
```

### Building
```bash
# Build the package
npm run build

# Watch mode for development
npm run dev
```

### Importing
```typescript
// Import everything
import { Button, useAuth, User, formatCurrency } from '@shared/shared';

// Import specific modules
import { Button } from '@shared/shared/components';
import { useAuth } from '@shared/shared/hooks';
import { User } from '@shared/shared/types';
import { formatCurrency } from '@shared/shared/lib';
```

## 🔧 Configuration

### Environment Variables
The shared package expects these environment variables:

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

## 📁 Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components
│   ├── forms/          # Form components
│   ├── layout/         # Layout components
│   └── feedback/       # Feedback components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
│   ├── firebase.ts     # Firebase configuration
│   ├── stripe.ts       # Stripe configuration
│   ├── utils.ts        # Utility functions
│   └── constants.ts    # App constants
└── types/              # TypeScript type definitions
    ├── auth.ts         # Authentication types
    ├── user.ts         # User types
    ├── website.ts      # Website types
    ├── subscription.ts # Subscription types
    ├── api.ts          # API types
    └── common.ts       # Common types
```

## 🎯 Examples

### Using the Auth Hook
```typescript
import { useAuth } from '@shared/shared';

function LoginForm() {
  const { user, login, loading, error } = useAuth();

  const handleSubmit = async (credentials) => {
    try {
      await login(credentials);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form content */}
    </form>
  );
}
```

### Using UI Components
```typescript
import { Button, Input, Card } from '@shared/shared';

function MyComponent() {
  return (
    <Card>
      <Input label="Email" type="email" />
      <Button variant="primary" loading={false}>
        Submit
      </Button>
    </Card>
  );
}
```

### Using Utility Functions
```typescript
import { formatCurrency, debounce } from '@shared/shared';

const price = formatCurrency(29.99); // "$29.99"
const debouncedSearch = debounce(searchFunction, 300);
```

## 🔄 Development

### Adding New Components
1. Create the component in the appropriate directory
2. Export it from the index file
3. Add TypeScript types if needed
4. Update this README

### Adding New Hooks
1. Create the hook in `src/hooks/`
2. Export it from `src/hooks/index.ts`
3. Add proper TypeScript types
4. Document usage examples

### Adding New Types
1. Create the type file in `src/types/`
2. Export it from `src/types/index.ts`
3. Use consistent naming conventions
4. Add JSDoc comments for complex types

## 📋 Scripts

- `npm run build` - Build the package
- `npm run dev` - Watch mode for development
- `npm run clean` - Clean build artifacts
- `npm run type-check` - Type check without building
- `npm run lint` - Lint the code

## 🤝 Contributing

1. Follow the existing code style
2. Add TypeScript types for all new code
3. Update documentation when adding new features
4. Test your changes thoroughly
5. Update this README if needed
