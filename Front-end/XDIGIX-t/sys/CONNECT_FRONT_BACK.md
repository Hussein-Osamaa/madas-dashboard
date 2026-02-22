# Connect frontend to backend

Use these two settings so the frontend (Vercel) can call the backend (Vercel or Railway).

---

## 1. Frontend (Vercel) – tell it where the API is

In your **frontend** Vercel project:

1. Open **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `VITE_API_BACKEND_URL`
   - **Value:** your backend API base URL **with** `/api` at the end, for example:
     - `https://xdigix-os-backend.vercel.app/api`
     - or `https://your-app.up.railway.app/api` if backend is on Railway
3. Apply to **Production** (and Preview if you use it).
4. **Redeploy** the frontend so the new value is baked into the build.

All apps (dashboard, fulfillment, finance, admin) read this variable. Without it they fall back to same host + port 4000, which fails in production.

---

## 2. Backend (Vercel / Railway) – allow the frontend origin (CORS)

In your **backend** project (Vercel or Railway):

1. Open **Settings** → **Environment Variables** (or **Variables**).
2. Set **CORS_ORIGIN** to your frontend URL(s), for example:
   - `https://your-frontend.vercel.app`
   - For multiple origins you can use a comma-separated list if your backend supports it, or `*` for development (avoid `*` in production if you care about strict CORS).

If CORS is wrong, the browser will block API requests and you’ll see errors in the console (e.g. “blocked by CORS policy”).

---

## Quick checklist

| Where        | Variable               | Example value                                  |
|-------------|------------------------|------------------------------------------------|
| **Frontend** (Vercel) | `VITE_API_BACKEND_URL` | `https://xdigix-os-backend.vercel.app/api`     |
| **Backend** (Vercel)  | `CORS_ORIGIN`          | `https://your-frontend.vercel.app`             |

After changing env vars, redeploy the project that you changed.
