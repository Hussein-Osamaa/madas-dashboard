# XDIGIX

Apps and API for the XDIGIX fulfillment and financial stack.

## Primary apps (use these)

**apps/** are the main runnable apps. **sys/** is legacy; use it only for reference or migration.

- **apps/** – `marketing`, `dashboard`, `digix-admin`, `finance`, `fulfillment` (Vite + React + TS + Tailwind)
- **packages/** – `design-system`, `fulfillment-ui`, `shared` (when added)

**Run the apps (from XDIGIX root):** Run each command on its own (do not paste lines starting with `#`).
- `npm run install:apps` — install deps for all five apps in `apps/`
- `npm run dev` — **API + digix-admin** (admin at http://localhost:5181/admin)
- `npm run dev:admin` — apps/digix-admin only → http://localhost:5181/admin
- `npm run dev:dashboard` — apps/dashboard → http://localhost:5180
- `npm run dev:apps:marketing` — marketing → http://localhost:3000
- `npm run dev:apps:digix-admin` — digix-admin → http://localhost:5181/admin
- `npm run dev:apps:dashboard` — dashboard → http://localhost:5180
- `npm run dev:apps:finance` — finance → http://localhost:5182/finance
- `npm run dev:apps:fulfillment` — fulfillment → http://localhost:5183
- `npm run dev:apps` — API + marketing

See **`docs/APP_URLS.md`** for all URLs; **`docs/FOLDER_STRUCTURE.md`** and **`docs/EXTRACTION_MANIFEST.md`** for structure and migration.

## Apps

| App | Description | Port |
|-----|-------------|------|
| **backend** | Node.js + Express + MongoDB REST API (auth, clients, products, orders, returns, payments, scan logs, users) | 5001 |
| **financial-dashboard** | React dashboard: KPIs, revenue/expense/inventory/customer views, reports, settings, user management | 3000 |
| **Fullfilment** | Fulfillment frontend + backend (separate stack) | - |

## Quick start (run to test)

From the **XDIGIX** root directory:

```bash
npm run install:all
```

(or: `npm install`, then `cd backend && npm install`, then `npm run install:apps`)

Ensure **backend/.env** exists (copy from `backend/.env.example`) and set at least:
- `MONGODB_URI` (e.g. `mongodb://localhost:27017/xdigix_db` or Atlas)
- `JWT_SECRET`
- `PORT=5001`

**apps/digix-admin** uses `VITE_API_URL=http://localhost:5001` (see `apps/digix-admin/.env` or `.env.example`).

**Start API + digix-admin (new app):**

```bash
npm run dev
```

- **API:** http://localhost:5001  
- **digix-admin:** http://localhost:5181/admin

**If "Port 5001 is already in use":**

```bash
kill -9 $(lsof -ti :5001)
```

Then run `npm run dev` again. Or use two terminals: `npm run dev:api` and `npm run dev:admin`.

(Optional) Seed a super admin and default data:

```bash
cd backend
npm run init:db
node scripts/add-super-admin.js   # use your email when prompted
```

### 1. Backend API only

```bash
cd backend
npm install
cp .env.example .env   # set MONGODB_URI, JWT_SECRET, PORT=5001
npm run dev
```

API: http://localhost:5001

### 2. Financial dashboard

```bash
cd financial-dashboard
npm install
# .env: REACT_APP_API_URL=http://localhost:5001
npm start
```

Dashboard: http://localhost:3000 — log in with the admin user from the seed script.

### 3. Fullfilment (optional)

Separate frontend/backend in `Fullfilment/`. See that folder for its own setup.

## Features (financial-dashboard)

- **Auth**: Login via backend API (JWT), roles: Admin, Manager (staff), Viewer (client).
- **Dashboard**: KPIs, revenue/expense/cash flow charts, date range filter, export.
- **Revenue / Expenses / Inventory / Customers**: Pages backed by API (orders → sales, products → inventory, payments → expenses).
- **Reports**: Reports page (placeholder or export).
- **Settings**: User management for admins (list users, add user with role). Business settings placeholder.

## UI & stack

- **financial-dashboard**: React, Tailwind CSS, React Router, react-hot-toast, Chart.js, Lucide icons. Original UI/UX and component styles preserved; data and auth use the XDIGIX backend API.
