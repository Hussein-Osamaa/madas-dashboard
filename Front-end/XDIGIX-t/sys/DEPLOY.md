# Deploy – Whole System

Use **one command** so **every update** across the system is deployed (all pages, dashboard, functions, firestore).

**Production (frontend + backend):** See **[DEPLOY_PRODUCTION.md](./DEPLOY_PRODUCTION.md)** for deploying the Node.js backend (Railway/Render/Fly.io) and building the frontend with your production API URL before Firebase deploy.

---

## Deploy everything (recommended)

**From the project root (`finance_version/`):**

```bash
npm run deploy
```

**Or from the `sys/` folder:**

```bash
cd sys
npm run deploy
```

This will:

1. **Build** all front-end apps into `dist-unified/`:
   - Marketing landing (root)
   - Dashboard (`/dashboard` – Custom Domains, Visit Store, Website Builder, Orders, etc.)
   - Finance (`/finance`)
   - Admin (`/admin`)

2. **Deploy** to Firebase:
   - **Firestore** – rules + indexes
   - **Functions** – e.g. `serveWebsite`, domain verification, API
   - **Hosting** – marketing target (xdigix.com, /dashboard, /finance, /admin) and sites target

So any change you made in the repo (dashboard, marketing, finance, admin, functions, firestore) is built and then deployed. No part of the system is left out.

---

## Optional: deploy only one part

| Command | What gets deployed |
|--------|----------------------|
| `npm run deploy` | **Everything** (build + firestore + functions + all hosting) |
| `npm run deploy:hosting` | Build + hosting only (marketing + sites) |
| `npm run deploy:functions` | Functions only |
| `npm run deploy:firestore` | Firestore rules + indexes only |

Use these only when you intentionally want to skip the rest (e.g. functions-only fix). For normal updates, use **`npm run deploy`** so every update is deployed.

---

## Where to run commands

- **From project root** (`finance_version/`): use `npm run deploy` or `npm run deploy:functions` (they run the script that does `cd sys` then the real command).
- **From inside `sys/`** (when your prompt shows `sys %`): run Firebase directly, **do not** run `cd sys` again:
  ```bash
  firebase deploy --only functions:serveWebsite
  ```
  or
  ```bash
  firebase deploy --only functions
  ```
- **Deploy only the products/website function** (when you’re in `sys/`):
  ```bash
  firebase deploy --only functions:serveWebsite
  ```
  The first time, “generating the service identity” can take 1–2 minutes; let it finish instead of pressing Ctrl+C.

---

## After deploy

- Do a **hard refresh** (Ctrl+Shift+R / Cmd+Shift+R) or open in **incognito** so the browser doesn’t use old cached JS/CSS.
- If you use a CDN or custom domain, allow a few minutes for propagation.
