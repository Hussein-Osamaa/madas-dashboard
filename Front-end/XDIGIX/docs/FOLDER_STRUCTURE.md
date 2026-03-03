# XDIGIX Folder Structure (Unified Rebuild)

New folders for the unified rebuild. Legacy apps remain under `sys/` until migration is complete.

```
XDIGIX/
├── apps/                          # Unified applications
│   ├── marketing/                 # Landing page (customers of XDIGIX)
│   │   ├── src/
│   │   │   └── components/
│   │   ├── public/
│   │   └── README.md
│   ├── dashboard/                 # Tenant SaaS (orders, inventory, finance, ecommerce, settings)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   └── components/
│   │   ├── public/
│   │   └── README.md
│   ├── digix-admin/               # Control center (clients, users, fulfillment, roles)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   └── components/
│   │   ├── public/
│   │   └── README.md
│   ├── finance/                   # Finance app (overview, expenses, reports, etc.)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   └── components/
│   │   ├── public/
│   │   └── README.md
│   └── fulfillment/               # Standalone fulfillment app (warehouse/shipping staff)
│       ├── src/
│       │   ├── pages/
│       │   └── components/
│       ├── public/
│       └── README.md
│
├── packages/                      # Shared packages
│   ├── design-system/             # @xdigix/design-system
│   │   ├── src/
│   │   │   ├── components/        # Buttons, Card, Table, Modal, Form, Badge, AppShell, Sidebar
│   │   │   └── tokens/            # Colors, spacing, typography, radii
│   │   └── README.md
│   ├── fulfillment-ui/            # @xdigix/fulfillment-ui
│   │   ├── src/
│   │   │   ├── components/        # OrderTable, OrderFilters, ScanModal, StatusBadge, ScanLogList
│   │   │   └── hooks/             # useOrders, useScanLogs, useBarcodeScanner
│   │   └── README.md
│   └── shared/                    # @xdigix/shared
│       ├── src/
│       │   ├── types/             # Order, Product, Client, User, ScanLog, etc.
│       │   └── api/               # Base API client, auth
│       └── README.md
│
├── backend/                       # Existing Node/MongoDB API (unchanged location)
├── docs/                          # Plans, inventory, manifest
├── sys/                           # Legacy apps (dashboard, digix-admin, finance under sys/apps/marketing/apps/)
└── docs/FOLDER_STRUCTURE.md       # This file
```

## Usage

- **apps/** – Build each app here with the same UI/UX and API-only data. All five (marketing, dashboard, digix-admin, finance, fulfillment) are runnable Vite+React shells; run with `npm run dev:apps:<name>` or `npm run install:apps` then `npm run dev:apps:marketing` etc. Copy or migrate from `sys/apps/marketing/apps/` as you go.
- **packages/design-system** – Define tokens and components first; then use in all apps.
- **packages/fulfillment-ui** – Extract fulfillment UI from digix-admin; reuse in `apps/digix-admin` and `apps/fulfillment`.
- **packages/shared** – Types and API client used by apps and packages.
- **backend/** – Single API for all apps; add endpoints as you migrate (finance, abandoned carts, sites, etc.).

See `docs/EXTRACTION_MANIFEST.md` and `docs/PHASE1_INVENTORY.md` for what to migrate into these folders.
