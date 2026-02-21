# Warehouse Fulfillment API (Clean Architecture)

Transaction-ledger inventory. Stock is NEVER stored manually. All changes via `recordTransaction()`.

## Architecture

- **Controller → Service → Repository**
- **InventoryService** - ONLY place that changes stock
- **WarehouseStock** - Materialized cache (updated in MongoDB transaction)
- **StockTransaction** - Single source of truth

## Endpoints

### Warehouse (role: `warehouse_staff` | `internal_staff` | `super_admin`)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/warehouse/inbound | Inbound products |
| POST | /api/warehouse/damage | Mark damaged |
| POST | /api/warehouse/missing | Mark missing |
| GET | /api/warehouse/transactions | Paginated transactions |

### Audit (barcode scan)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/audit/start | Start session |
| POST | /api/audit/scan | Add scan |
| POST | /api/audit/finish | Compare vs expected, MISSING/ADJUSTMENT, weekly report |

### Client Read-Only

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/client/warehouse/products | Products with stock |
| GET | /api/client/warehouse/reports | Reports list |
| GET | /api/client/warehouse/reports/:id/download | PDF download |
| GET | /api/client/warehouse/transactions | Paginated transactions |

## Order Lifecycle

Order events (Firestore) → OrderInventoryService → recordTransaction:

- Created → RESERVED
- Handed to courier → SHIPPING
- Delivered → SOLD
- Returned → RETURNED
- Damaged → DAMAGED
- Lost → MISSING

## Cron

- Monthly: 1st 00:05 UTC
- Yearly: Jan 1 00:10 UTC
