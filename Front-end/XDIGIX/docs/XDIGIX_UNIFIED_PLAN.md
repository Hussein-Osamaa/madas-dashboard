# XDIGIX Unified Rebuild Plan

**Goal:** Rebuild everything with the same UI/UX, same functions, best performance, and best SEO. Extract data and features from existing apps, then unify into a consistent stack (MongoDB API, shared design system).

---

## Phase 1: Data & Feature Extraction (Inventory)

### 1.1 Marketing / Landing (Customers of XDIGIX)

**Location:** First priority – customer-facing landing/marketing site.

**Extract:**
- Marketing copy, value props, CTAs
- Navigation structure
- Any existing landing pages under `sys/` (marketing website, dist-unified)
- SEO: meta titles, descriptions, OG tags, sitemap

**Target:** Single marketing app (or integrated under main domain) with SSR/SSG for SEO.

---

### 1.2 System Apps Inventory

| App | Path | Port | Purpose |
|-----|------|------|---------|
| **dashboard** | `sys/apps/marketing/apps/dashboard` | 5174 | Tenant SaaS: orders, inventory, finance, ecommerce, settings, RBAC |
| **digix-admin** | `sys/apps/marketing/apps/digix-admin` | 5176 | Control center: clients, users, subscriptions, analytics, **fulfillment**, **pending-orders**, **ready-for-pickup**, **shipping**, roles |
| **finance** | `sys/apps/marketing/apps/finance` | 5175 | Finance: orders, expenses, transactions, payments, budgets, reports (uses Firebase in `financeService.ts`) |

**Dashboard – routes to extract:**
- Core: home, login, no-access, reset-password, setup-password
- Orders: orders, scan-log, abandoned-carts, tracking
- Inventory: products, product details, collections, last-pieces, low-stock, reviews
- Customers: customers
- Finance: overview, deposits, expenses, budgets, reports, capital, cash-flow, profit-settlement, analytics
- Settings: main, analytics, shipping, payments
- E-commerce: website-builder, visit-store, custom-domains, templates, website-settings, navigation, code-editor, builder, preview
- Public store: site/:siteId (website, products, last, about, cart, favorites, profile, login, register)
- RBAC: roles, users
- POS: pos
- Marketing: discounts, pricing

**digix-admin – routes to extract:**
- Overview, clients, client-users, staff, subscriptions, analytics
- Roles, roles-permissions, plan-permissions, client-staff-permissions
- **Fulfillment:** fulfillment, pending-orders, ready-for-pickup, shipping
- Login, setup-password, no-access

**Finance app – extract:**
- All finance views and services (currently Firebase; migrate to MongoDB API)

---

### 1.3 Fulfillment (Extract & Complete System)

**Current:** Logic lives inside digix-admin:
- `FulfillmentPage.tsx` – order list, filters, barcode scan (html5-qrcode), status updates, scan logs
- `PendingOrdersPage.tsx`
- `ReadyForPickupPage.tsx`
- `ShippingPage.tsx`

**Backend (already in XDIGIX):**
- `GET/POST/PATCH` orders, products, scan logs
- Orders: `clientId`, `shippingStatus`, `paymentStatus`, items, customer, address

**Extract from digix-admin:**
1. **Order list & filters** – by status, business, date, search
2. **Barcode/QR scanning** – camera, manual entry, scan type (order/return/damaged)
3. **Scan logs** – persist via `/api/scan-logs`
4. **Status workflow** – pending → processing → ready-for-pickup → shipped → delivered
5. **UI components** – tables, modals, scan modal, status badges

**Unified Fulfillment system (new):**
- **Package:** `sys/apps/fulfillment` (or `packages/fulfillment-ui`) – shared fulfillment UI + hooks
- **Data:** 100% from backend API (orders, products, scan-logs). No Firebase.
- **Reuse in:** digix-admin (control center) and, later, a dedicated Fulfillment app for warehouse/shipping staff
- **Future:** Combine with any external “Fullfilment” stack (e.g. `Fullfilment/` folder) – same API contract so both use the same backend

---

### 1.4 Future: Shipping Company System

- **Reserve:** `systemAccess.shipping` and `features` on Client model (already in place)
- **Planned:** Separate app or module for shipping company workflows (pickups, tracking, delivery)
- **Integration:** Same MongoDB backend; possible shared orders/scan-logs with Fulfillment

---

## Phase 2: Unified Architecture

### 2.1 Single Design System

- **Tokens:** Colors, spacing, typography, radii (CSS variables or Tailwind theme)
- **Components:** Buttons, cards, tables, modals, forms, badges – shared across dashboard, digix-admin, finance, fulfillment
- **Location:** `sys/packages/design-system` or `sys/shared/ui`

### 2.2 Same UI/UX

- One sidebar/header pattern; role-based nav (tenant vs admin)
- Consistent tables (sort, filter, search, pagination)
- Same form patterns (validation, errors, loading)
- Same empty states and error boundaries

### 2.3 Performance

- **Code splitting** – route-based chunks per app
- **API:** Single backend (MongoDB); avoid over-fetching (list vs detail endpoints)
- **Images:** Lazy load, responsive srcset
- **Bundle:** Tree-shake; shared deps in a single chunk where useful

### 2.4 SEO

- **Marketing/landing:** SSR or SSG (e.g. Vite SSR, or static export), meta tags, JSON-LD, sitemap
- **Dashboard/admin:** SPA is fine; meaningful titles per route
- **Public store:** `site/:siteId` – per-site meta, OG tags, product schema

---

## Phase 3: Rebuild Order

1. **Marketing / landing** – New or refactor; same UI/UX; SEO-first.
2. **Shared design system** – Extract/reuse components and tokens from existing apps.
3. **Backend** – Already MongoDB; add any missing endpoints (fulfillment, finance).
4. **Dashboard** – Migrate remaining Firebase usage to API; apply design system; same routes & functions.
5. **digix-admin** – Same: API-only, design system; keep clients, users, subscriptions, analytics.
6. **Finance** – Replace Firebase in `financeService` with MongoDB API; same UI/UX.
7. **Fulfillment** – Extract from digix-admin into shared fulfillment module; API-only; plug into digix-admin and (later) standalone or Fullfilment stack.
8. **Shipping (future)** – New app or module; same design system and API.

---

## Phase 4: Fulfillment Module (Extract & Combine)

### 4.1 Extract from digix-admin

- **Pages:** FulfillmentPage, PendingOrdersPage, ReadyForPickupPage, ShippingPage
- **Features:** Order list, filters, status update, barcode scan, scan logs, business filter
- **Replace:** All Firestore calls with `apiRequest` to backend (`/api/orders`, `/api/scan-logs`)

### 4.2 Shared Fulfillment Package

- **Components:** OrderTable, OrderFilters, ScanModal, StatusBadge, ScanLogList
- **Hooks:** useOrders, useScanLogs, useBarcodeScanner
- **API:** ordersService, scanLogsService (calling backend)

### 4.3 Integration

- **digix-admin:** Import fulfillment routes and components from the package.
- **External Fullfilment:** If you have a separate `Fullfilment/` app, point it at the same backend and reuse this package or mirror the API contract.

### 4.4 Backend (existing)

- Orders: `clientId`, `shippingStatus`, items, customer, address
- ScanLog: `clientId`, order ref, barcode, scan type, timestamp
- No Firebase; all reads/writes via MongoDB API

---

## Summary

| Step | Action |
|------|--------|
| 1 | Extract and document all routes, features, and data flows from marketing, dashboard, digix-admin, finance |
| 2 | Define one design system and apply same UI/UX everywhere |
| 3 | Rebuild in order: marketing → design system → dashboard → digix-admin → finance → fulfillment module |
| 4 | Fulfillment: extract from digix-admin, move to API, create shared package; combine with external Fullfilment via same API |
| 5 | Plan shipping company system on top of same backend and design system |

All apps will use the **same backend (MongoDB API)**, **same UI/UX**, and **best performance & SEO** as above. Fulfillment becomes one reusable, API-driven system that can serve both digix-admin and a future Fullfilment/shipping stack.
