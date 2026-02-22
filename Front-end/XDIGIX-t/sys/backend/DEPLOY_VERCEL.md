# Deploy backend on Vercel (serverless)

The backend runs as **serverless functions** on Vercel: one catch-all handles all HTTP requests and forwards them to the Express app. This is suitable for REST API only.

## 1. Create a separate Vercel project for the backend

Use a **second** Vercel project (do not mix with the frontend project):

1. In Vercel: **Add New** → **Project**; import the same repo.
2. **Root Directory**: set to **`sys/backend`** (or **`backend`** if your repo root is already `sys`).
3. **Framework Preset**: Other (no framework).
4. **Build Command**: `npm run build` (already set in `vercel.json`).
5. **Output Directory**: leave empty (we use serverless, not static).
6. Save and deploy.

## 2. Environment variables

In the backend project → **Settings** → **Environment Variables**, add:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (e.g. Atlas) |
| `JWT_ACCESS_SECRET` | Strong random string |
| `JWT_REFRESH_SECRET` | Strong random string |
| `CORS_ORIGIN` | Frontend origin (e.g. `https://your-app.vercel.app`) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full Firebase service account JSON (if using Firebase) |

Optional: `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `S3_*`, etc. (see `src/config.ts`).

## 3. After deploy

- Backend base URL: `https://<your-backend-project>.vercel.app`
- API base: `https://<your-backend-project>.vercel.app/api`
- Health: `https://<your-backend-project>.vercel.app/api/health` or `https://<your-backend-project>.vercel.app/health` (depending on rewrite)

Set the **frontend** env in its Vercel project:

- `VITE_API_BACKEND_URL` = `https://<your-backend-project>.vercel.app/api`

Redeploy the frontend after changing this.

## Limitations on Vercel

- **No Socket.io** – Realtime (e.g. audit scan live updates) does not run on serverless. Use Railway/Render for a long-lived server if you need WebSockets.
- **No in-process cron** – `startReportCrons()` does not run. To run scheduled jobs:
  - Add a protected route (e.g. `POST /api/cron/reports`) that runs the report logic and secure it with a secret or Vercel Cron secret.
  - In **Vercel** → **Settings** → **Cron Jobs**, add a schedule that calls that URL (with the secret in headers).
- **File uploads** – The serverless filesystem is ephemeral. Use S3 (or Vercel Blob) for persistent uploads; the app already supports S3 via env vars.
- **Cold starts** – First request after idle can be slower; MongoDB is re-used per invocation.

## 4. Optional: Cron on Vercel

To run the report cron via Vercel Cron:

1. Add an API route or a route in the backend that runs the report job (e.g. call the same logic as `reportCron`), protected by a header like `x-cron-secret`.
2. In `vercel.json` add:

```json
"crons": [
  { "path": "/api/cron/reports", "schedule": "0 9 * * *" }
]
```

3. In Vercel, set `CRON_SECRET` and check it in the handler.

## 5. Troubleshooting CORS (preflight / No 'Access-Control-Allow-Origin')

- **Test a simple route:** From your frontend origin, open DevTools → Network and request `GET https://<backend>.vercel.app/api/health`. If this returns CORS headers but `/api/auth/me` does not, the catch-all handler is likely failing before sending headers (e.g. DB or load error). If `/api/health` also has no CORS, then:
  - In Vercel → **Settings** → **Deployment Protection**: if "Vercel Authentication" or "Password Protection" is on, **OPTIONS** may be blocked; add your frontend origin to the allowlist or temporarily disable to test.
  - Ensure **Root Directory** is exactly the backend folder (e.g. `sys/backend` or `Front-end/XDIGIX-t/sys/backend` from repo root) so `api/` and `vercel.json` are in the deployment.
- Set **CORS_ORIGIN** in the backend project to your frontend URL (e.g. `https://xdigix-os.vercel.app`).

## 6. Troubleshooting 500 / FUNCTION_INVOCATION_FAILED

- **Check Vercel logs**: Project → **Deployments** → select deployment → **Functions** → click the function → **Logs**. The handler now catches errors and logs `[Vercel handler] <error>`; the stack trace will show the real cause.
- **MONGODB_URI**: Must be set in the backend project’s **Environment Variables**. If missing, the app tries localhost and the function can crash. Use your Atlas (or other) connection string.
- **Build**: Ensure **Root Directory** is `sys/backend` (or `backend`) so `npm run build` runs there and produces `dist/`. The serverless function loads from `dist/`.

## 7. Local / Railway / Render (full server)

- **Local**: `npm run dev` or `npm run build && npm start` (full server with Socket.io and cron).
- **Railway / Render**: Use the same code; run `node dist/index.js` so you get the full server (Socket.io + cron). Only use the Vercel layout when deploying to Vercel.
