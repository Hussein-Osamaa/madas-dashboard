# XDIGIX – App URLs

Local development URLs. Backend port from `backend/.env` (`PORT=5001` by default).

**Primary apps:** Use **apps/** (ports 3000, 5180–5183). **sys/** is legacy.

---

## Backend (API)

| App  | URL                   | Notes                    |
|------|------------------------|--------------------------|
| **API** | http://localhost:5001 | Set `PORT` in `backend/.env` |

---

## Primary frontend apps (apps/)

| App            | Dev URL                       | Run (from XDIGIX root)        |
|----------------|--------------------------------|-------------------------------|
| **marketing**  | http://localhost:3000/         | `npm run dev:apps:marketing`  |
| **dashboard**  | http://localhost:5180/         | `npm run dev:apps:dashboard` or `npm run dev:dashboard` |
| **digix-admin**| http://localhost:5181/admin/   | `npm run dev:apps:digix-admin` or `npm run dev:admin` |
| **finance**    | http://localhost:5182/finance/ | `npm run dev:apps:finance`   |
| **fulfillment**| http://localhost:5183/         | `npm run dev:apps:fulfillment` |

- **API + digix-admin:** `npm run dev` → API on 5001, admin on http://localhost:5181/admin  
- **API + marketing:** `npm run dev:apps`  
- **First-time:** `npm run install:apps` (or `npm run install:all`)

---

## Legacy frontend (sys/)

Kept for reference; prefer **apps/** for daily use.

| App            | Dev URL                     | Location                          |
|----------------|-----------------------------|------------------------------------|
| digix-admin    | http://localhost:5176/admin/| sys/apps/marketing/apps/digix-admin |
| dashboard      | http://localhost:5174/      | sys/apps/marketing/apps/dashboard  |
| finance        | http://localhost:5175/finance/ | sys/apps/marketing/apps/finance |
| marketing      | http://localhost:3000/      | sys/apps/marketing                 |

Run from each app folder or use `npm run dev:admin:sys` / `npm run dev:dashboard:sys` from root.

---

## Preview (production build)

After `npm run build` in each app, `npm run preview` in that app (ports may vary).
