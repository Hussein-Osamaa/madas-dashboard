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

Vercel is looking for a Node.js entrypoint (app.js, server.js) inside `dist-unified`, but this project is **static only** (HTML/JS/CSS from Vite). Do this:

### 1. Set Framework Preset (required)

1. **Vercel** → your project → **Settings** → **General**.
2. Find **Framework Preset**.
3. Click **Edit** and choose **Other** (or **None** if you see it). Do **not** leave it as "Node.js".
4. Save.

### 2. Override Build & Development Settings

1. **Settings** → **Build & Development Settings**.
2. Turn **Override** ON for:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist-unified`
   - **Install Command:** `npm install`
3. Save.

### 3. Redeploy

**Deployments** → **⋯** on latest → **Redeploy**.

The repo uses `"serve"` (not `"start"`) and has no `"main"` so Vercel won’t treat it as a Node server. If the error persists, the Framework Preset must be **Other** in the dashboard.
