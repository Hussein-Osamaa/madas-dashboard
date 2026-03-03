# Phase 1 – Extract & inventory (actual state)

App-by-app inventory of **routes**, **services**, and **Firebase usage**. Use with `EXTRACTION_MANIFEST.md` to tick off migration/design-system work.

---

## 1. Marketing / Landing (XDIGIX customers)

**Location:** `sys/apps/marketing/` (root SPA: `index.html` → `src/main.tsx` → `App.tsx`)

### Routes
- Single-page: no router; one view with sections.

### Structure (sections)
| Section    | Component   | Source              | Firebase? |
|-----------|-------------|---------------------|-----------|
| Nav       | Navbar      | `src/components/Navbar`   | No |
| Hero      | Hero        | `src/components/Hero`     | No |
| Features  | Features    | `src/components/Features` | No |
| How it works | HowItWorks | `src/components/HowItWorks` | No |
| Pricing   | Pricing     | `src/components/Pricing`   | No |
| Testimonials | Testimonials | `src/components/Testimonials` | No |
| CTA       | CTA         | `src/components/CTA`       | No |
| Footer    | Footer      | `src/components/Footer`    | No |

### SEO / meta
- **File:** `sys/apps/marketing/index.html`
- Title: "XDIGIX - All-in-One Business Management Platform"
- Meta: description, keywords present; OG/sitemap to add in unified build.

### Services
- None (static/landing only).

### Inventory status
- [ ] Copy & structure extracted for design system
- [ ] Navigation (nav + footer) aligned with unified UI
- [ ] SEO meta (title, description, OG, sitemap) in unified app

---

## 2. Dashboard (`sys/apps/marketing/apps/dashboard`)

### Routes (from `src/router.tsx`)

| Route | Page / element | Firebase? | Migrate to API |
|-------|-----------------|-----------|----------------|
| `/` | DashboardHomePage | Via hooks (stats, analysis, tasks) | [ ] |
| `/orders` | OrdersPage | API (ordersService) | [x] done |
| `/orders/scan-log` | ScanLogPage | Yes (onSnapshot, collection) | [ ] |
| `/orders/abandoned-carts` | AbandonedCartsPage | Yes (sites + carts) | [ ] |
| `/orders/tracking` | OrderTrackingPage | API | [x] done |
| `/pos` | POSPage | Likely API/Firebase | [ ] |
| `/customers` | CustomersPage | Via customersService | [ ] |
| `/inventory/products` | InventoryProductsPage | Via productsService | [ ] |
| `/inventory/products/:productId` | ProductDetailsPage | Via products | [ ] |
| `/inventory/collections` | CollectionsPage | Via collectionsService | [ ] |
| `/inventory/last-pieces` | InventoryLastPiecesPage | Via products | [ ] |
| `/inventory/low-stock` | LowStockPage | Via products | [ ] |
| `/inventory/reviews` | ReviewsPage | Via reviewsService | [ ] |
| `/marketing/discounts` | DiscountsPage | Yes (firebase/firestore) | [ ] |
| `/marketing/pricing` | PricingPage | Yes (firebase/firestore) | [ ] |
| `/finance/overview` | OverviewPage | Via finance hooks/services | [ ] |
| `/finance/deposits` | DepositsPage | Yes (collection, getDocs) | [ ] |
| `/finance/expenses` | ExpensesPage | Via expensesService | [ ] |
| `/finance/budgets` | BudgetsPage | Via budgetsService | [ ] |
| `/finance/reports` | ReportsPage | Via reportsService | [ ] |
| `/finance/capital` | CapitalPage | Yes (collection, getDocs) | [ ] |
| `/finance/cash-flow` | CashFlowPage | Yes (lib/firebase) | [ ] |
| `/finance/profit-settlement` | ProfitSettlementPage | Via profitSettlementService | [ ] |
| `/finance/analytics` | FinanceAnalyticsPage | Yes (collection, getDocs) | [ ] |
| `/settings` | MainSettingsPage | Yes (businesses, staff) | [ ] |
| `/settings/analytics` | AnalyticsPage | Yes (doc, getDoc/setDoc) | [ ] |
| `/settings/shipping` | ShippingPage | Yes (doc, getDoc/setDoc) | [ ] |
| `/settings/payments` | PaymentsPage | Yes (tenants/settings/payments) | [ ] |
| `/ecommerce/website-builder` | WebsiteBuilderPage | Yes (published_sites, customDomains) | [ ] |
| `/ecommerce/visit-store` | VisitStorePage | Yes (published_sites) | [ ] |
| `/ecommerce/custom-domains` | CustomDomainsPage | Yes (sites, customDomains) | [ ] |
| `/ecommerce/templates` | TemplatesPage | Yes (addDoc) | [ ] |
| `/ecommerce/website-settings` | WebsiteSettingsPage | Yes (published_sites, storage) | [ ] |
| `/ecommerce/navigation` | NavigationPage | Yes (doc, getDoc/updateDoc) | [ ] |
| `/ecommerce/code-editor` | CodeEditorPage | Yes (doc, getDoc/setDoc) | [ ] |
| `/ecommerce/builder` | BuilderPage | Yes (published_sites, customDomains) | [ ] |
| `/ecommerce/preview/:siteId` | StorePreviewPage | Yes (doc, getDoc) | [ ] |
| `/site/:siteId` | PublicWebsitePage | Yes (query, getDocs, getDoc) | [ ] |
| `/site/:siteId/products` | ProductsPage | Yes (collection, getDocs/getDoc) | [ ] |
| `/site/:siteId/last` | LastPiecesPage | Yes (getDocs) | [ ] |
| `/site/:siteId/about` | AboutPage | Yes (getDoc) | [ ] |
| `/site/:siteId/cart` | CartPage | — | [ ] |
| `/site/:siteId/favorites` | FavoritePage | — | [ ] |
| `/site/:siteId/profile` | ProfilePage | — | [ ] |
| `/site/:siteId/login` | PublicLoginPage | — | [ ] |
| `/site/:siteId/register` | RegisterPage | — | [ ] |
| `/s/:siteId` | PublicWebsitePage | Same as `/site/:siteId` | [ ] |
| `/rbac/roles` | RolesPage | Via RBACContext (Firebase auth/uid) | [ ] |
| `/rbac/users` | UsersPage | Via API / RBAC | [ ] |
| `/login` | LoginPage | Auth (API in use) | [x] done |
| `/setup-password` | SetupPasswordPage | Yes (firebase/auth + firestore) | [ ] |
| `/reset-password` | ResetPasswordPage | — | [ ] |
| `/no-access` | NoAccessPage | — | [x] done |

### Services (dashboard)

| Service | Path | Firebase? | Migrate to API |
|---------|------|-----------|----------------|
| productsService | services/productsService.ts | Partial (API used) | [ ] |
| ordersService | services/ordersService.ts | Partial (API used) | [ ] |
| abandonedCartsService | services/abandonedCartsService.ts | Yes | [ ] |
| scanLogsService | services/scanLogsService.ts | Yes | [ ] |
| customersService | services/customersService.ts | Yes | [ ] |
| domainService | services/domainService.ts | Yes (Functions + Auth) | [ ] |
| reviewsService | services/reviewsService.ts | Yes | [ ] |
| collectionsService | services/collectionsService.ts | Yes | [ ] |
| warehousesService | services/warehousesService.ts | Yes | [ ] |
| bostaService | services/bostaService.ts | — | [ ] |
| finance/expensesService | services/finance/expensesService.ts | Yes | [ ] |
| finance/profitSettlementService | services/finance/profitSettlementService.ts | Yes | [ ] |
| finance/financeService | services/finance/financeService.ts | Yes | [ ] |
| finance/reportsService | services/finance/reportsService.ts | Yes | [ ] |
| finance/budgetsService | services/finance/budgetsService.ts | Yes | [ ] |
| finance/accountsService | services/finance/accountsService.ts | Yes | [ ] |

### Hooks (Firebase-dependent)
- `useDashboardStats` – db, doc, getDoc
- `useDashboardAnalysis` – db, doc, getDoc
- `useDashboardTasks` – Firestore (tasks collection)
- `useFinanceOverview` – collection, getDocs, query, where, orderBy, Timestamp
- `useShippingIntegrations` – doc, getDoc, db
- `useSiteSections` – doc, getDoc, db, collection, getDocs
- `useWebsiteSettings` – doc, getDoc, db, collection, getDocs
- `usePixelScripts` – doc, getDoc, db

### Other Firebase usage (dashboard)
- `lib/analytics.ts` – Firebase Analytics (getAnalytics, logEvent, setUserId, setUserProperties)
- `lib/performance.ts` – Firebase Performance (trace, getPerformance)
- `contexts/RBACContext.tsx` – useAuth() firebaseUser, userService.getByFirebaseUid / getByEmail
- `contexts/AuthContext.tsx` – likely Firebase Auth (to confirm for JWT switch)
- `contexts/BusinessContext.tsx` – businessId / tenant (Firebase or API)
- Components: ProductModal, ImageUploader (storage, ref, uploadBytes, getDownloadURL); ContextualEditor (db, collection, getDocs); PixelManager (doc, getDoc, setDoc)

---

## 3. digix-admin (`sys/apps/marketing/apps/digix-admin`)

### Routes (from `src/router.tsx`)

| Route | Page | Firebase? | Migrate to API |
|-------|------|-----------|----------------|
| `/` | SuperAdminOverviewPage | Yes (tenants, businesses, users) | [ ] |
| `/clients` | ClientsPage | No (API) | [x] done |
| `/client-users` | ClientUsersPage | No (API) | [x] done |
| `/staff` | CompanyStaffPage | Yes (users, superAdminInvites) | [ ] |
| `/subscriptions` | SubscriptionsPage | Yes (tenants) | [ ] |
| `/analytics` | AnalyticsPage | Yes (tenants, users) | [ ] |
| `/roles` | RolesPage | Via RBACContext (no direct Firestore in page) | [ ] |
| `/roles-permissions` | RolesPermissionsPage | Via RBACContext | [ ] |
| `/plan-permissions` | PlanPermissionsPage | Yes (plans) | [ ] |
| `/client-staff-permissions` | ClientStaffPermissionsPage | — | [ ] |
| `/fulfillment` | FulfillmentPage | Yes (businesses, orders) | [ ] → extract module |
| `/pending-orders` | PendingOrdersPage | Yes (businesses, orders) | [ ] → extract module |
| `/ready-for-pickup` | ReadyForPickupPage | Yes (businesses, orders) | [ ] → extract module |
| `/shipping` | ShippingPage | Yes (businesses, orders, getDoc, increment) | [ ] → extract module |
| `/login` | LoginPage | API | [x] done |
| `/setup-password` | SetupPasswordPage | Yes (firebase/auth + firestore) | [ ] |
| `/no-access` | NoAccessPage | — | [x] done |

### Pages not in router (legacy / unused?)
- TenantsPage (Firebase: tenants CRUD)
- SuperAdminUsersPage (Firebase: users type super_admin)

### Services
- No standalone service files; Firestore used directly in pages.

### Fulfillment (for shared module)
- FulfillmentPage, PendingOrdersPage, ReadyForPickupPage, ShippingPage: all use `lib/firebase` (stub throws). Data: businesses → orders, updateDoc, addDoc (scan logs). Backend: use `/api/orders`, `/api/scan-logs`, `/api/products` only.

---

## 4. Finance app (`sys/apps/marketing/apps/finance`)

### Routes (from `src/router.tsx`)

| Route | Page | Firebase? | Migrate to API |
|-------|------|-----------|----------------|
| `/login` | LoginPage | Yes (signInWithEmailAndPassword, auth) | [ ] |
| `/` | → redirect to `/overview` | — | — |
| `/overview` | OverviewPage | Via finance services | [ ] |
| `/transactions` | TransactionsPage | Via finance services | [ ] |
| `/payments` | PaymentsPage | Via finance services | [ ] |
| `/expenses` | ExpensesPage | Via expensesService | [ ] |
| `/accounts` | AccountsPage | Via accountsService | [ ] |
| `/budgets` | BudgetsPage | Via budgetsService | [ ] |
| `/reports` | ReportsPage | Via reportsService | [ ] |
| `/taxes` | TaxesPage | — | [ ] |
| `/capital` | CapitalPage | — | [ ] |
| `/settings` | SettingsPage | — | [ ] |
| `/audit` | AuditPage | — | [ ] |

### Services (finance app)
- expensesService.ts – Firestore (collection, doc, getDocs, setDoc, where, orderBy, Timestamp)
- accountsService.ts – Firestore
- reportsService.ts – Firestore (collection, getDocs, orderBy, query, Timestamp, where)
- budgetsService.ts – Firestore (collection, doc, setDoc, getDocs, orderBy, query, Timestamp, where)
- financeService.ts – Firestore (collection, doc, getDocs, query, Timestamp, where, orderBy, limit, setDoc)

### Context / auth
- PermissionsProvider.tsx – doc, getDoc, getDocs, query, collection, where, db, auth; onAuthStateChanged
- TenantProvider.tsx – doc, getDoc, db, auth; onAuthStateChanged
- lib/firebase.ts – full Firebase init (app, auth, firestore)

### Inventory status
- [ ] All finance routes backed by MongoDB API
- [ ] Auth switched to backend JWT (same as dashboard/digix-admin)
- [ ] Unify with dashboard finance pages + one API

---

## 5. Backend API (XDIGIX backend)

- Auth: login, me, register, forgot-password, reset-password, ensure-workspace – **Done**
- Clients: CRUD, with-owner – **Done**
- Users: list, get, update – **Done**
- Products: CRUD, by clientId – **Done**
- Orders: CRUD, by clientId, status – **Done**
- Scan logs: CRUD – **Done**
- Payments / Returns: as needed for finance – **Check**
- Finance: reports, expenses, transactions, budgets, accounts – **Add if missing**
- Abandoned carts, customers, collections, reviews, warehouses – **Add when migrating dashboard**
- Sites / published_sites / customDomains – **Add when migrating ecommerce**
- Staff / invites (digix-admin) – **Add when migrating CompanyStaffPage**

---

## 6. Summary checklist

- **Marketing:** No Firebase; extract copy/structure/SEO into design system.
- **Dashboard:** 40+ routes; 16 services; many pages/hooks/components use Firebase; migrate to API and move to design system.
- **digix-admin:** Clients + Client Users on API; 10+ pages still Firestore (overview, staff, subscriptions, analytics, roles/plans, fulfillment 4 pages, setup-password); fulfillment → extract to shared module.
- **Finance:** Full Firebase (auth + firestore); 6 services + 2 context providers; migrate to same backend auth + finance API.

Use this file together with `EXTRACTION_MANIFEST.md`: tick items in the manifest as you migrate or move into the design system.
