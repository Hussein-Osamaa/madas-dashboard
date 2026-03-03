# @xdigix/fulfillment-ui

Shared fulfillment UI and hooks. Order list, filters, status workflow, barcode scan modal, scan logs. API-only (calls backend `/api/orders`, `/api/scan-logs`, `/api/products`).

**Contents:**
- `src/components/` – OrderTable, OrderFilters, ScanModal, StatusBadge, ScanLogList
- `src/hooks/` – useOrders, useScanLogs, useBarcodeScanner

**Used by:** digix-admin (fulfillment routes) and apps/fulfillment (standalone app). Same API contract for future Fullfilment/shipping stack.
