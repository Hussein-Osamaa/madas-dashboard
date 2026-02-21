# Vercel setup (fix 404)

If you see **404: NOT_FOUND** after deploying, set the **Root Directory** so Vercel builds this app, not the repo root.

## Steps

1. Open your project on [Vercel](https://vercel.com) → **Settings** → **General**.
2. Under **Root Directory**, click **Edit**.
3. Set it to: **`Front-end/XDIGIX-t/sys`**
4. Save.
5. Go to **Deployments** → open the **⋯** on the latest deployment → **Redeploy**.

## Why

This repo has the app inside `Front-end/XDIGIX-t/sys`. That folder contains:

- `package.json` (and the `npm run build` script)
- `vercel.json` (build output: `dist-unified`, rewrites)
- `apps/` (marketing, dashboard, finance, admin, warehouse)

If Root Directory is empty or wrong, Vercel builds from the repo root, doesn’t find a valid build output, and serves 404.

## Optional: env var

In **Settings** → **Environment Variables**, add:

- **Name:** `VITE_API_BACKEND_URL`
- **Value:** `https://YOUR_BACKEND_URL/api` (your production API URL)

Then redeploy so the frontend talks to your API.

---

## "No entrypoint found in output directory"

If you see this error, Vercel is treating the build as a Node.js app. Fix:

1. **Settings** → **General** → **Framework Preset**: set to **Other** (not "Node.js").
2. **Build & Development Settings**:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist-unified`
   - **Install Command:** `npm install`
3. Redeploy.

The repo’s `package.json` no longer has `"main"`, so Vercel should serve `dist-unified` as static files (no Node entrypoint).
