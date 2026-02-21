# XDIGIX Apps

This directory contains all the XDIGIX applications:

- **dashboard** - Multi-tenant dashboard system
- **digix-admin** - Admin dashboard for XDIGIX
- **finance** - Finance management system

All apps are built and deployed together under the main marketing website domain.

## Structure

```
apps/
├── dashboard/     # Dashboard app at /dashboard
├── digix-admin/   # Admin app at /admin
└── finance/       # Finance app at /finance
```

## Building

From the root `sys` directory:

```bash
# Build all apps
npm run build

# Build individual apps
npm run build:dashboard
npm run build:finance
npm run build:admin
```

## Development

Each app can be run independently:

```bash
# Dashboard (port 5174)
cd apps/dashboard && npm run dev

# Finance (port 5175)
cd apps/finance && npm run dev

# Admin (port 5176)
cd apps/digix-admin && npm run dev
```



This directory contains all the XDIGIX applications:

- **dashboard** - Multi-tenant dashboard system
- **digix-admin** - Admin dashboard for XDIGIX
- **finance** - Finance management system

All apps are built and deployed together under the main marketing website domain.

## Structure

```
apps/
├── dashboard/     # Dashboard app at /dashboard
├── digix-admin/   # Admin app at /admin
└── finance/       # Finance app at /finance
```

## Building

From the root `sys` directory:

```bash
# Build all apps
npm run build

# Build individual apps
npm run build:dashboard
npm run build:finance
npm run build:admin
```

## Development

Each app can be run independently:

```bash
# Dashboard (port 5174)
cd apps/dashboard && npm run dev

# Finance (port 5175)
cd apps/finance && npm run dev

# Admin (port 5176)
cd apps/digix-admin && npm run dev
```

