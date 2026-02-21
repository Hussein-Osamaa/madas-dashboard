# XDIGIX Unified Deployment Guide

This guide explains how to deploy all XDIGIX apps under a single domain (xdigix.com).

## Project Structure

The project consists of 4 main apps:

1. **Marketing** (`apps/marketing`) - Main website at root `/`
2. **Dashboard** (`apps/dashboard`) - Multi-tenant dashboard at `/dashboard`
3. **Finance** (`apps/finance`) - Finance system at `/finance`
4. **Digix Admin** (`apps/digix-admin`) - Admin dashboard at `/admin`

## Base Paths Configuration

Each app is configured with a base path in their `vite.config.ts`:

- Marketing: `base: '/'`
- Dashboard: `base: '/dashboard/'`
- Finance: `base: '/finance/'`
- Digix Admin: `base: '/admin/'`

## Building All Apps

### Option 1: Unified Build (Recommended for Single Domain)

This approach builds all apps and combines them into a single `dist-unified` directory:

```bash
# From the sys directory
npm run build

# Or directly
node scripts/build-all.js
```

This will:
1. Build each app individually
2. Copy marketing app to `dist-unified/`
3. Copy dashboard app to `dist-unified/dashboard/`
4. Copy finance app to `dist-unified/finance/`
5. Copy digix-admin app to `dist-unified/admin/`

### Option 2: Build Individual Apps

```bash
npm run build:marketing
npm run build:dashboard
npm run build:finance
npm run build:admin
```

## Firebase Hosting Configuration

### Option 1: Unified Hosting (Single Site)

Use `firebase.json.unified` for a single hosting configuration:

```bash
# Copy the unified config
cp firebase.json.unified firebase.json

# Build all apps
npm run build

# Deploy
firebase deploy --only hosting
```

This approach uses a single hosting site that serves all apps from `dist-unified`.

### Option 2: Multiple Hosting Targets (Multiple Sites)

The current `firebase.json` uses multiple hosting targets. Each target is a separate Firebase Hosting site:

```bash
# Deploy all targets
firebase deploy --only hosting

# Or deploy specific targets
firebase deploy --only hosting:marketing
firebase deploy --only hosting:dashboard
firebase deploy --only hosting:finance
firebase deploy --only hosting:digix-admin
```

**Note**: For multiple targets on a single custom domain, you'll need to configure path-based routing in Firebase Console for your custom domain (xdigix.com).

## Custom Domain Setup

To deploy to xdigix.com:

1. **Add Custom Domain in Firebase Console**:
   - Go to Firebase Console > Hosting
   - Add custom domain: `xdigix.com`
   - Follow DNS configuration instructions

2. **For Unified Build**:
   - The single hosting site will automatically serve all paths
   - Marketing: `https://xdigix.com/`
   - Dashboard: `https://xdigix.com/dashboard`
   - Finance: `https://xdigix.com/finance`
   - Admin: `https://xdigix.com/admin`

3. **For Multiple Targets**:
   - Configure path-based routing in Firebase Console
   - Map each path to the corresponding hosting site

## Development

### Running Apps Locally

Each app can be run independently:

```bash
# Marketing (port 3000)
cd apps/marketing && npm run dev

# Dashboard (port 5174)
cd apps/dashboard && npm run dev

# Finance (port 5175)
cd apps/finance && npm run dev

# Digix Admin (port 5176)
cd apps/digix-admin && npm run dev
```

### Testing Unified Build Locally

After building, you can test the unified build:

```bash
# Build all apps
npm run build

# Serve the unified dist (requires a simple HTTP server)
cd dist-unified
python3 -m http.server 8080
# Or use any static file server
```

Then visit:
- `http://localhost:8080/` - Marketing
- `http://localhost:8080/dashboard` - Dashboard
- `http://localhost:8080/finance` - Finance
- `http://localhost:8080/admin` - Admin

## Important Notes

1. **Base Paths**: All internal routing and asset references will automatically use the base path configured in `vite.config.ts`.

2. **React Router**: The routers are configured to work with their respective base paths. No changes needed to router configurations.

3. **Asset Paths**: Vite automatically handles asset paths based on the `base` configuration.

4. **Site Routes**: The `/site/**` and `/s/**` routes are handled by the `servewebsite` Cloud Function for multi-tenant site hosting.

## Troubleshooting

### Assets Not Loading

If assets (JS/CSS) are not loading correctly:
1. Check that the `base` path in `vite.config.ts` matches the deployment path
2. Rebuild the app after changing base paths
3. Clear browser cache

### 404 Errors on Routes

If you get 404 errors on client-side routes:
1. Ensure Firebase hosting rewrites are configured correctly
2. Check that the `index.html` exists in the correct path
3. Verify the base path configuration

### Multiple Targets Not Working

If using multiple targets:
1. Ensure each target is deployed separately
2. Configure path-based routing in Firebase Console
3. Check that `.firebaserc` has all targets configured
