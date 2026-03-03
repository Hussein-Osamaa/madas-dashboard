# XDIGIX Dashboard (Tenant SaaS)

Main tenant app: orders, inventory, customers, finance, ecommerce (website builder), settings, RBAC. All data from backend API (MongoDB).

**Source to extract from:** `sys/apps/marketing/apps/dashboard/`.

**Stack:** React + Vite. Uses `@xdigix/design-system`, `@xdigix/fulfillment-ui` (if needed). API-only; no Firebase.

**Routes:** home, orders, scan-log, abandoned-carts, tracking, pos, customers, inventory/*, marketing/discounts, marketing/pricing, finance/*, settings/*, ecommerce/*, site/:siteId (public store), rbac/roles|users, login, setup-password, reset-password, no-access.
