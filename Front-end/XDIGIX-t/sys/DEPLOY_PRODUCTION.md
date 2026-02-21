# Production deployment guide

Deploy **sys/apps** (frontend) and **sys/backend** (API) together.

---

## Overview

| Part | What it is | Where to deploy |
|------|------------|-----------------|
| **Frontend** | Vite/React apps (marketing, dashboard, finance, admin, warehouse) | **Firebase Hosting** or **Vercel** (single site from `dist-unified/`) |
| **Backend** | Node.js + Express API (MongoDB, Firebase Admin) | **Railway / Render / Fly.io / Cloud Run** (or any Node/Docker host) |
| **Database** | MongoDB | **MongoDB Atlas** (or existing cluster) |
| **Firebase** | Firestore, Functions (e.g. `servewebsite`) | **Firebase** (same project as hosting) |

The frontend is built once with `VITE_API_BACKEND_URL` set to your **production backend URL**. The backend runs as a long-lived Node server and is **not** deployed with Firebase.

---

## 1. Prerequisites

- **Node.js 18+**
- **Firebase CLI**: `npm i -g firebase-tools` and `firebase login`
- **MongoDB Atlas** (or other MongoDB) for the backend
- **Firebase project** (e.g. `madas-store`) with Hosting and Functions set up
- **Backend host** account (Railway / Render / Fly.io, etc.)

---

## 2. Deploy the backend

The backend must be reachable over HTTPS. Example: `https://api.yourdomain.com` or `https://your-app.up.railway.app`.

### Option A: Railway

1. Create a project at [railway.app](https://railway.app).
2. **New → Deploy from GitHub** (or use **Dockerfile**).
3. Set **Root Directory** to `sys/backend` (or connect repo and set it).
4. Railway will use the `Dockerfile` in that directory, or you can use **Nixpacks** with:
   - Build: `npm ci && npm run build`
   - Start: `npm start`
5. Add **Variables** (see [Backend env vars](#backend-environment-variables)).
6. Add **MongoDB** from Railway or use an external **MongoDB Atlas** URI.
7. Deploy; note the public URL (e.g. `https://xxx.up.railway.app`).

### Option B: Render

1. [render.com](https://render.com) → **New → Web Service**.
2. Connect repo; set **Root Directory** to `sys/backend`.
3. **Environment**: Docker (uses `sys/backend/Dockerfile`) or Node:
   - Build: `npm ci && npm run build`
   - Start: `npm start`
4. Add **Environment Variables** (see below).
5. Deploy and copy the service URL.

### Option C: Fly.io

```bash
cd sys/backend
fly launch
# Set build to use Dockerfile; set env vars in fly.toml or fly secrets
fly deploy
```

### Option D: Docker (any host)

```bash
cd sys/backend
docker build -t madas-backend .
docker run -p 4000:4000 --env-file .env.production madas-backend
```

Use your production `.env` (never commit it). For Firebase Admin, pass `GOOGLE_APPLICATION_CREDENTIALS` or the JSON key via a secret/volume.

---

### Backend environment variables

Set these in your backend host (Railway/Render/Fly.io env or `.env.production`):

| Variable | Required | Example |
|----------|----------|---------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `4000` (or host default) |
| `MONGODB_URI` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/madas` |
| `JWT_ACCESS_SECRET` | Yes | Strong random string |
| `JWT_REFRESH_SECRET` | Yes | Strong random string |
| `CORS_ORIGIN` | Yes | `https://yourdomain.com` or `*` (narrow for prod) |
| `BASE_URL` | Yes | `https://api.yourdomain.com` (backend public URL) |
| `GOOGLE_APPLICATION_CREDENTIALS` | If using Firebase | Path to service account JSON, or set key via platform secret |

Optional: `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `RATE_LIMIT_*`, S3, SMTP, etc. See `sys/backend/.env.example`.

---

## 3. Build the frontend with production API URL

The frontend calls the backend using `VITE_API_BACKEND_URL`. This is **baked in at build time**, so you must set it before building.

From the **`sys`** directory:

```bash
cd sys

# Set your production backend API URL (no trailing slash; /api is used by the apps)
export VITE_API_BACKEND_URL=https://YOUR_BACKEND_URL/api

# Build all apps (marketing, dashboard, finance, admin, warehouse) into dist-unified/
npm run build
```

Replace `YOUR_BACKEND_URL` with your real backend URL (e.g. `https://madas-api.up.railway.app`).

- **Same machine**: You can run `VITE_API_BACKEND_URL=https://api.yourdomain.com/api npm run build`.
- **CI/CD**: Add `VITE_API_BACKEND_URL` as an environment variable in your pipeline and run `npm run build` from `sys`.

Result: `sys/dist-unified/` contains the marketing site plus `/dashboard`, `/finance`, `/admin`, `/warehouse` with the correct API base URL.

---

## 4. Deploy the frontend to Firebase

From the **`sys`** directory:

```bash
cd sys

# Deploy everything (Hosting + Firestore + Functions)
npm run deploy
```

Or deploy only hosting (if you didn’t change rules/functions):

```bash
npm run deploy:hosting
```

Firebase will use the **marketing** target and serve from `dist-unified/`. URLs will look like:

- `https://yourdomain.com/` — Marketing
- `https://yourdomain.com/dashboard` — Dashboard
- `https://yourdomain.com/finance` — Finance
- `https://yourdomain.com/admin` — Digix Admin
- `https://yourdomain.com/warehouse` — Fulfillment / Warehouse

Make sure your Firebase project and custom domain are configured in the Firebase Console.

---

## 4b. Deploy the frontend to Vercel

Use **Vercel** instead of Firebase Hosting: the repo already has `sys/vercel.json` with build and SPA rewrites.

1. **Connect the repo**
   - Go to [vercel.com](https://vercel.com) → **Add New → Project**.
   - Import your Git repository.

2. **Set Root Directory**
   - In **Project Settings → General**, set **Root Directory** to `sys` (so the build runs from the folder that has `package.json` and `vercel.json`).

3. **Environment variable**
   - In **Project Settings → Environment Variables**, add:
   - **Name:** `VITE_API_BACKEND_URL`  
   - **Value:** `https://YOUR_BACKEND_URL/api` (your production API URL, e.g. `https://madas-api.up.railway.app/api`).  
   - Apply to **Production** (and Preview if you want).

4. **Deploy**
   - **Deploy** (or push to the connected branch). Vercel will run `npm run build` and serve from `dist-unified/`.

Your app will be available at the Vercel URL (e.g. `https://your-project.vercel.app`):

- `https://your-project.vercel.app/` — Marketing  
- `https://your-project.vercel.app/dashboard` — Dashboard  
- `https://your-project.vercel.app/finance` — Finance  
- `https://your-project.vercel.app/admin` — Digix Admin  
- `https://your-project.vercel.app/warehouse` — Fulfillment  

**Backend CORS:** Set your backend’s `CORS_ORIGIN` to your Vercel domain (e.g. `https://your-project.vercel.app`) or `*` for testing.

---

## 5. One-time checklist

- [ ] Backend deployed and `BASE_URL` / `MONGODB_URI` / JWT secrets set.
- [ ] CORS allows your frontend origin (e.g. `https://yourdomain.com`).
- [ ] `VITE_API_BACKEND_URL` set to `https://YOUR_BACKEND_URL/api` when running `npm run build`.
- [ ] Firebase project and hosting target (e.g. `marketing`) point to the same domain.
- [ ] Firestore rules and indexes deployed if you use them (`npm run deploy` does this).

---

## 6. Quick reference commands

```bash
# From repo root (if your root package.json forwards to sys)
npm run deploy

# From sys/
cd sys
export VITE_API_BACKEND_URL=https://YOUR_BACKEND_URL/api
npm run build
npm run deploy
```

Optional:

- `npm run deploy:hosting` — hosting only  
- `npm run deploy:functions` — functions only  
- `npm run deploy:firestore` — Firestore rules + indexes only  

After deployment, do a hard refresh or test in an incognito window so the browser doesn’t use old cached JS.
