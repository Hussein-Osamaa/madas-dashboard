# XDIGIX Extraction Manifest

Structured list of what to extract from each app for the unified rebuild. Use this as a checklist.

**Phase 1 detailed inventory:** See **`docs/PHASE1_INVENTORY.md`** for app-by-app routes, services, and per-file Firebase usage. Tick items below as you migrate to API or move into the design system.

---

## 1. Marketing / Landing (Customers of XDIGIX)

**Source:** `sys/apps/marketing/` — `src/App.tsx` (Navbar, Hero, Features, HowItWorks, Pricing, Testimonials, CTA, Footer). **No Firebase.**

| Status | Item | Source | Notes |
|-------|------|--------|--------|
| [ ] | Copy & structure | `sys/apps/marketing/src/` | Hero, features, pricing, CTA |
| [ ] | Navigation | Navbar, Footer | Main nav, footer |
| [ ] | SEO meta | `sys/apps/marketing/index.html` | Title, description; add OG, sitemap |
| [ ] | Assets | Public folders | Logos, images |

---

## 2. Dashboard (`sys/apps/marketing/apps/dashboard`)

**Full route & Firebase list:** `docs/PHASE1_INVENTORY.md` § Dashboard.

### Routes (→ keep in unified app)

| Status | Route | Page | Data source (current → target) |
|--------|-------|------|--------------------------------|
| [ ] | `/` | DashboardHomePage | Firebase (hooks) → API |
| [x] | `/orders` | OrdersPage | API |
| [ ] | `/orders/scan-log` | ScanLogPage | Firebase → API |
| [ ] | `/orders/abandoned-carts` | AbandonedCartsPage | Firebase → API |
| [x] | `/orders/tracking` | OrderTrackingPage | API |
| [ ] | `/pos` | POSPage | API/Firebase → API |
| [ ] | `/customers` | CustomersPage | Firebase → API |
| [ ] | `/inventory/*` | Products, Collections, LastPieces, LowStock, Reviews | Firebase → API |
| [ ] | `/marketing/discounts` | DiscountsPage | Firebase → API |
| [ ] | `/marketing/pricing` | PricingPage | Firebase → API |
| [ ] | `/finance/*` | Overview, Deposits, Expenses, Budgets, Reports, Capital, CashFlow, ProfitSettlement, Analytics | Firebase → API |
| [ ] | `/settings` | MainSettingsPage | Firebase → API |
| [ ] | `/settings/analytics` | AnalyticsPage | Firebase → API |
| [ ] | `/settings/shipping` | ShippingPage | Firebase → API |
| [ ] | `/settings/payments` | PaymentsPage | Firebase → API |
| [ ] | `/ecommerce/*` | Website builder, domains, templates, navigation, code-editor, builder, preview | Firebase → API |
| [ ] | `/site/:siteId` (public) | PublicWebsitePage, products, cart, etc. | Firebase → API |
| [ ] | `/rbac/roles`, `/rbac/users` | RolesPage, UsersPage | RBAC/Firebase auth → API |
| [x] | `/login`, `/no-access` | Auth pages | API |
| [ ] | `/setup-password`, `/reset-password` | Auth pages | Firebase → API |

### Services to migrate to API

| Status | Service |
|--------|---------|
| [ ] | `abandonedCartsService.ts` |
| [ ] | `customersService.ts` |
| [ ] | `scanLogsService.ts` |
| [ ] | `productsService.ts`, `ordersService.ts` (finish API) |
| [ ] | `finance/*` (expensesService, profitSettlementService, financeService, reportsService, budgetsService, accountsService) |
| [ ] | `domainService.ts` (Firebase functions → backend) |
| [ ] | `collectionsService.ts`, `reviewsService.ts`, `warehousesService.ts` |
| [ ] | Hooks: `useDashboardStats`, `useDashboardTasks`, `useDashboardAnalysis` |

### Key components (→ design system)

| Status | Component |
|--------|-----------|
| [ ] | Layout: AppShell, Header, Sidebar |
| [ ] | Tables, filters, modals, forms, buttons |

---

## 3. digix-admin (`sys/apps/marketing/apps/digix-admin`)

**Full route & Firebase list:** `docs/PHASE1_INVENTORY.md` § digix-admin.

### Routes (→ keep in unified admin)

| Status | Route | Page | Data source (current → target) |
|--------|-------|------|--------------------------------|
| [ ] | `/` | SuperAdminOverviewPage | Firebase → API |
| [x] | `/clients` | ClientsPage | **API (done)** |
| [x] | `/client-users` | ClientUsersPage | **API (done)** |
| [ ] | `/staff` | CompanyStaffPage | Firebase → API |
| [ ] | `/subscriptions` | SubscriptionsPage | Firebase → API |
| [ ] | `/analytics` | AnalyticsPage | Firebase → API |
| [ ] | `/roles`, `/roles-permissions`, `/plan-permissions`, `/client-staff-permissions` | Roles pages | Firebase / RBAC → API |
| [ ] | `/fulfillment` | FulfillmentPage | **→ Extract to fulfillment module + API** |
| [ ] | `/pending-orders` | PendingOrdersPage | **→ Fulfillment module + API** |
| [ ] | `/ready-for-pickup` | ReadyForPickupPage | **→ Fulfillment module + API** |
| [ ] | `/shipping` | ShippingPage | **→ Fulfillment module + API** |
| [x] | `/login`, `/no-access` | Auth | API |
| [ ] | `/setup-password` | Auth | Firebase → API |

### Fulfillment extraction (for shared module)

| Status | From | Extract |
|--------|------|--------|
| [ ] | FulfillmentPage | Order list, filters, status workflow, scan modal (camera + manual), scan logs |
| [ ] | PendingOrdersPage | Pending-only view, same order/scan API |
| [ ] | ReadyForPickupPage | Ready-for-pickup view, same API |
| [ ] | ShippingPage | Shipping view, tracking, same API |

**Backend:** Use only `/api/orders`, `/api/scan-logs`, `/api/products` (MongoDB).

---

## 4. Finance app (`sys/apps/marketing/apps/finance`)

**Full route & Firebase list:** `docs/PHASE1_INVENTORY.md` § Finance app.

| Status | Item | Source | Target |
|--------|------|--------|--------|
| [ ] | Routes & views | finance app (overview, transactions, payments, expenses, accounts, budgets, reports, taxes, capital, settings, audit) | Same UI; data from API |
| [ ] | Auth | LoginPage, PermissionsProvider, TenantProvider, lib/firebase.ts | Backend JWT (same as dashboard/digix-admin) |
| [ ] | financeService.ts | Firebase (orders, expenses, transactions, payments) | MongoDB API |
| [ ] | expensesService, accountsService, reportsService, budgetsService | Firebase | MongoDB API |
| [ ] | Shared with dashboard | Dashboard already has finance/* pages | Unify: one set of finance pages, one API |

---

## 5. Backend API (existing – extend if needed)

| Status | Area | Endpoints | Notes |
|--------|------|-----------|--------|
| [x] | Auth | login, me, register, forgot-password, reset-password, ensure-workspace | Done |
| [x] | Clients | CRUD, with-owner | Done |
| [x] | Users | list, get, update | Done |
| [x] | Products | CRUD, by clientId | Done |
| [x] | Orders | CRUD, by clientId, status | Done |
| [x] | Scan logs | CRUD | Done |
| [ ] | Payments / Returns | As needed for finance | Check and add if missing |
| [ ] | Finance | Reports, expenses, transactions, budgets, accounts | Add if not present |
| [ ] | Abandoned carts, customers, sites, staff/invites | For dashboard & digix-admin | Add when migrating |

---

## 6. Fulfillment module (new)

| Status | Deliverable | Description |
|--------|--------------|-------------|
| [ ] | `packages/fulfillment` or `apps/fulfillment` | Shared UI + hooks |
| [ ] | Order list & filters | Reusable component; API: GET /api/orders |
| [ ] | Status workflow | pending → processing → ready → shipped → delivered |
| [ ] | Scan modal | Camera (html5-qrcode) + manual barcode; POST /api/scan-logs |
| [ ] | Scan logs list | GET /api/scan-logs |
| [ ] | Integration in digix-admin | Replace current fulfillment pages with module |
| [ ] | Future: Fullfilment stack | Same API; reuse or embed this module |

---

## 7. Future: Shipping company system

| Item | Notes |
|------|--------|
| Access | `systemAccess.shipping` on Client (already in model) |
| App | New app or area in digix-admin |
| Data | Same backend (orders, scan-logs); maybe new collections for shipping-specific data |
| UI | Same design system |

**How to use:** Tick `[ ]` → `[x]` in this manifest as you migrate each route/service to API or move it into the design system. For per-file Firebase details, use `docs/PHASE1_INVENTORY.md`. Use this manifest next to `XDIGIX_UNIFIED_PLAN.md` to track extraction and rebuild progress.
