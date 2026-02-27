# Deploy Frontend (Fulfillment, Dashboard, etc.) to Vercel

After you push to GitHub, Vercel must be configured so it builds and deploys from the **correct root** and uses the unified build output.

## 1. Connect the right repo

- In [Vercel Dashboard](https://vercel.com/dashboard) → **Add New** → **Project** (or use the existing frontend project).
- Import the **same repo** you push to (e.g. `Hussein-Osamaa/XDIGIX-OS` or `Hussein-Osamaa/madas-dashboard`).
- Use the **branch** you push to (usually `main`).

## 2. Set Root Directory

The build and `vercel.json` live inside `sys/`. Vercel must use that as the project root.

- **If your repo root is the Madas repo** (you have `Front-end/XDIGIX-t/` in the repo):
  - Set **Root Directory** to: `Front-end/XDIGIX-t/sys`
- **If your repo root is XDIGIX-t** (you have `sys/` at top level):
  - Set **Root Directory** to: `sys`

So when Vercel runs, its “project root” is the folder that contains `package.json`, `vercel.json`, and `scripts/build-all.js`.

## 3. Build settings (optional override)

The repo’s `sys/vercel.json` already has:

- **Build Command:** `npm run build`
- **Install Command:** `npm install`
- **Output:** The build script writes to `.vercel/output` (Build Output API v3), so do **not** set “Output Directory” in the Vercel UI; leave it empty so Vercel uses `.vercel/output`.

In Vercel project **Settings → General** you can leave “Framework Preset” as **Other** and “Build Command” / “Output Directory” empty so `vercel.json` is used.

## 4. Environment variables (fulfillment / warehouse)

For the **warehouse (fulfillment)** app to work in production, the build needs:

- **`VITE_API_BACKEND_URL`** = your backend API URL, e.g. `https://your-backend.up.railway.app/api`
- Optional: **`VITE_WAREHOUSE_SOCKET_ENABLED`** = `true` if you want to force live updates when backend is on Railway

Add these in Vercel: **Project → Settings → Environment Variables**, then **Redeploy**.

## 5. Deploy and redeploy

- **First deploy:** Save the project; Vercel will run a build from the root directory above.
- **After pushes:** New commits to the connected branch trigger a new deploy automatically.
- **Redeploy without code change:** **Deployments** → … on latest → **Redeploy** (useful after changing env vars).

## 6. If updates still don’t appear

1. **Confirm repo and branch**  
   In Vercel project **Settings → Git**, check “Production Branch” (e.g. `main`) and that it matches the repo you push to.

2. **Confirm Root Directory**  
   In **Settings → General**, “Root Directory” must be `Front-end/XDIGIX-t/sys` (or `sys` as above). If it’s wrong, the build may fail or deploy old code.

3. **Check the latest deployment**  
   **Deployments** → open the latest → **Building** / **Logs**. Ensure the build runs from the `sys` folder and finishes with “Build Output API v3 written to .vercel/output”.

4. **Redeploy after env changes**  
   Changing `VITE_*` variables requires a **new build**. Redeploy the latest deployment after saving env vars.
