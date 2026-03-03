# Fulfilment – Warehouse Inventory, Audit & Reporting

Multi-tenant SaaS e-commerce fulfilment: **inventory as a ledger** (no manual stock editing), weekly audits, and automated weekly/monthly/yearly reports with notifications.

## Stack

- **Backend:** Node.js (Express), MongoDB (Mongoose)
- **Frontend:** React (Vite), React Router
- **Notifications:** Dashboard + Email (Nodemailer) + WhatsApp (Meta Cloud API)

## Concepts

- **Stock is never edited manually.** All changes go through `StockTransaction` (INBOUND, SOLD, DAMAGED, MISSING, ADJUSTMENT, AUDIT, RESERVED, SHIPPING, RETURNED).
- **Warehouse stock** is always calculated from transactions.
- **Client dashboard** shows a *virtual warehouse* (calculated view); clients cannot edit stock.
- **Weekly audit:** scan barcodes → finish session → system creates MISSING/ADJUSTMENT from expected vs physical, then generates weekly report and notifies.

## Order lifecycle (transactions)

1. Order created → create **RESERVED** transaction (quantity reserved).
2. Picked → item stays RESERVED (reduces available).
3. Handed to carrier → create **SHIPPING** transaction.
4. Delivered → create **SOLD** transaction.
5. Returned → create **RETURNED** (stock increases).
6. Lost in transit → **MISSING**.
7. Damaged in transit → **DAMAGED**.

**Available stock** = INBOUND + RETURNED + ADJUSTMENT − SOLD − DAMAGED − MISSING − RESERVED − SHIPPING.

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
# Set MONGODB_URI (e.g. mongodb://localhost:27017/fulfilment)
npm install
npm run dev
```

API: `http://localhost:4000`

### Cron (monthly/yearly reports)

```bash
cd backend
node src/jobs/cron.js
```

- **Monthly:** 1st of each month at 00:05.
- **Yearly:** 1 January at 00:10.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173` (proxies `/api` and `/reports` to backend).

### First use

1. Open app → “Enter as Warehouse (Admin)”.
2. Create clients and products (via API or add simple admin CRUD pages).
3. Create **INBOUND** transactions to set initial stock (no manual quantity field).
4. Run **Weekly Audit Scan** (Admin → Weekly Audit Scan): select client, scan barcodes, finish → weekly report is generated and client is notified.
5. As client, open “Enter as client” and select a client → view Virtual Warehouse and Reports.

## Full system features

**Admin (Warehouse):**
- **Dashboard** — Clients, products, orders, transactions counts; recent transactions; manual report trigger (client + period).
- **Clients** — List, add, edit (name, email, phone).
- **Products** — List (filter by client), add, edit (name, SKU, barcode).
- **Transactions** — List (filter by client/type), create any transaction type (INBOUND, SOLD, etc.).
- **Orders** — Create order (client + line items) → Confirm (creates RESERVED) → Ship (SHIPPING) → Deliver (SOLD). Or Return, Lost, Damaged, Cancel.
- **Weekly Audit** — Start session, scan barcodes, finish → MISSING/ADJUSTMENT + weekly report.

**Client:**
- **Virtual Warehouse** — View available, reserved, shipping, damaged, missing per product (read-only).
- **Reports** — List and download weekly/monthly/yearly PDFs.
- **Notifications** — View and mark read.

## API overview

| Area | Endpoints |
|------|-----------|
| Clients | `GET/POST /api/clients`, `GET/PATCH /api/clients/:id` |
| Products | `GET/POST /api/products`, `GET/PATCH /api/products/:id`, `GET /api/products/by-barcode/:barcode` |
| Transactions | `GET/POST /api/transactions`, `GET /api/transactions/types` |
| Stock (virtual) | `GET /api/stock/virtual/:clientId`, `GET /api/stock/product/:productId` |
| Orders | `GET/POST /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/confirm`, `ship`, `deliver`, `return`, `cancel`, `lost`, `damaged` |
| Audit | `POST /api/audit/sessions`, `GET /api/audit/sessions`, `POST /api/audit/sessions/:id/scan`, `POST /api/audit/sessions/:id/finish` |
| Reports | `GET /api/reports`, `GET /api/reports/:id`, `GET /api/reports/:id/download`, `POST /api/reports/trigger/:clientId` (body: `{ periodType }`) |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/:id/read` |

## Environment (backend)

See `backend/.env.example`. Key variables:

- `MONGODB_URI`
- `SMTP_*` for email
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` for WhatsApp
- `APP_URL` for report links in notifications

## Rules (enforced in code)

- Warehouse is the single source of truth; no manual stock editing.
- Audit differences create **MISSING** (expected > scanned) or **ADJUSTMENT** (scanned > expected), plus **AUDIT** for logging.
- Weekly audit does not close the month; monthly cron closes the previous month and generates the monthly report.
- Closing balance of previous month is the opening balance of the next (calculated when generating the monthly report).
