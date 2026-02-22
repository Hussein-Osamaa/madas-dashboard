# Deploy frontend only on Vercel

This project deploys **only the frontend** (static sites) on Vercel. No backend, no serverless functions.

## What gets deployed

- **Marketing** site at `/`
- **Dashboard** at `/dashboard`
- **Finance** at `/finance`
- **Admin** at `/admin`
- **Warehouse (fulfillment)** at `/warehouse`

All are built by `npm run build` into `.vercel/output` (Build Output API v3), then served as static files by Vercel.

---

## 1. Connect the repo

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import your Git repository (e.g. GitHub).
3. **Do not** deploy yet; set the options below first.

---

## 2. Project settings (important)

### Root Directory

Vercel must build from the folder that contains `package.json` and `scripts/build-all.js`.

1. **Settings** → **General** → **Root Directory** → **Edit**.
2. Set to: **`Front-end/XDIGIX-t/sys`**  
   (If your repo root is already `XDIGIX-t`, use **`sys`**.)
3. Save.

### Build & Development Settings

1. **Settings** → **Build & Development Settings**.
2. Turn **Override** ON and set:
   - **Framework Preset:** `Other`
   - **Build Command:** `npm run build`
   - **Output Directory:** leave **empty** (the build writes `.vercel/output` itself)
   - **Install Command:** `npm install`
3. Save.

If you see **Output Directory** pre-filled (e.g. `dist-unified`), clear it. The build script produces `.vercel/output`; Vercel will use that and won’t look for a Node entrypoint.

---

## 3. Deploy

- Push to the connected branch, or  
- **Deployments** → **Redeploy** on the latest deployment.

Build runs `npm run build` → builds all five apps → writes `.vercel/output` (static files + routes). Vercel serves that with no server.

---

## 4. Optional: API URL (production backend)

If the frontend calls your own API, set the production URL:

1. **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `VITE_API_BACKEND_URL`
   - **Value:** `https://your-backend-domain.com/api` (or your real API base URL)
3. Redeploy so the app uses this in production.

The backend runs elsewhere (e.g. Railway, Render, VPS). Vercel hosts only the frontend.

---

## Troubleshooting

| Issue | Fix |
|--------|-----|
| 404 on `/dashboard`, `/warehouse`, etc. | Root Directory must be `Front-end/XDIGIX-t/sys` (or `sys`). Redeploy. |
| “No entrypoint found in output directory: dist-unified” | Clear **Output Directory** in Build & Development Settings. Build creates `.vercel/output`; don’t set output to `dist-unified`. |
| Build fails at “Building Fulfillment app…” | Check the build log for the exact error (e.g. memory, Node version). Root must be `sys` so all apps are built. |
