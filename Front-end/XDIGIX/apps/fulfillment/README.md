# XDIGIX Fulfillment App

Standalone fulfillment app for warehouse/shipping staff. Order list, filters, barcode scan, status workflow, scan logs. Uses same backend API as digix-admin fulfillment; shares `@xdigix/fulfillment-ui`.

**Source:** Extracted from digix-admin (FulfillmentPage, PendingOrdersPage, ReadyForPickupPage, ShippingPage). Can be combined with external Fullfilment stack via same API.

**Stack:** React + Vite. Uses `@xdigix/design-system`, `@xdigix/fulfillment-ui`. API-only.

**Routes:** login, orders (fulfillment), pending-orders, ready-for-pickup, shipping, scan-log.
