# XDIGIX Mobile Dashboard

A React Native (Expo) mobile companion app for the XDIGIX client dashboard. Provides quick access to key business operations on the go.

## Features

- **Home** — Dashboard overview with KPIs, quick actions, and recent orders
- **Orders** — Browse, search, filter orders by status; advance order status with one tap
- **Inventory** — Product list with stock levels, low stock alerts, size breakdown, search & filter
- **Analytics** — Revenue, profit, expenses; order status breakdown; inventory value; low stock alerts
- **Finance** — Quick add expenses & deposits; overview of sales/profit/expenses; transaction history

## Setup

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

## Connection

The app connects to the same backend API as the web dashboard:
- **API**: `https://xdigix-os-production.up.railway.app/api`
- **Auth**: JWT-based (same login credentials as web dashboard)
- **Data**: Firestore-compatible API (orders, products, expenses, deposits)

Authentication tokens are stored securely using `expo-secure-store`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 52) |
| Navigation | React Navigation 7 (Bottom Tabs + Native Stack) |
| State | TanStack React Query v5 |
| Auth | JWT tokens via expo-secure-store |
| Icons | @expo/vector-icons (Ionicons) |
| Language | TypeScript |

## Project Structure

```
mobile-dashboard/
├── App.tsx                    # Root component with providers
├── src/
│   ├── lib/api.ts            # Backend API adapter (auth, firestore, storage)
│   ├── contexts/
│   │   ├── AuthContext.tsx    # Authentication state
│   │   └── BusinessContext.tsx # Business state & currency
│   ├── types/index.ts        # Shared TypeScript types
│   ├── hooks/
│   │   ├── useOrders.ts      # Orders queries & mutations
│   │   ├── useProducts.ts    # Products queries & stock helpers
│   │   ├── useFinance.ts     # Finance overview, expenses, deposits
│   │   └── useDashboardStats.ts
│   ├── theme/index.ts        # Colors, spacing, typography
│   ├── components/           # Reusable UI components
│   │   ├── KpiCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── QuickAction.tsx
│   │   ├── SearchBar.tsx
│   │   └── EmptyState.tsx
│   ├── navigation/index.tsx  # Tab + Stack navigation
│   └── screens/
│       ├── LoginScreen.tsx
│       ├── HomeScreen.tsx
│       ├── OrdersScreen.tsx
│       ├── InventoryScreen.tsx
│       ├── AnalyticsScreen.tsx
│       └── FinanceScreen.tsx
```
