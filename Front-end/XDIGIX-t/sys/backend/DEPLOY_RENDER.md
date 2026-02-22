# Deploy backend on Render

This guide deploys the XDIGIX/MADAS Node.js backend as a **Web Service** on [Render](https://render.com).

---

## 1. Prepare the repo

- Backend code lives in **`sys/backend`** (or `Front-end/XDIGIX-t/sys/backend` if your repo root is higher).
- Render will run from that folder: **Root Directory** = path to `backend` (see step 3).

---

## 2. Create a Web Service on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect your Git provider and select the repository that contains `sys/backend`.
3. Configure:
   - **Name:** e.g. `xdigix-backend`
   - **Region:** choose one
   - **Root Directory:** set to the folder that contains `package.json` for the backend:
     - If repo root is `sys`: use **`backend`**
     - If repo root is the repo that contains `Front-end/XDIGIX-t/sys`: use **`Front-end/XDIGIX-t/sys/backend`**
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Click **Advanced** and add environment variables (see below).
5. Click **Create Web Service**.

Render will build and start the app. It assigns a URL like `https://xdigix-backend.onrender.com`. The server listens on `PORT` (set by Render).

---

## 3. Environment variables

Add these in **Environment** (or in the “Advanced” step when creating the service). Use **Secret** for sensitive values.

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | Set to `production` (Render often sets this automatically.) |
| `MONGODB_URI` | **Yes** | MongoDB connection string (e.g. Atlas URI). |
| `JWT_ACCESS_SECRET` | **Yes** | Strong random string for access tokens. |
| `JWT_REFRESH_SECRET` | **Yes** | Strong random string for refresh tokens. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **Yes** (if you use Firebase auth) | Full JSON of your Firebase service account key. Paste the entire JSON as one line or escaped string. |
| `CORS_ORIGIN` | Recommended | Allowed frontend origin(s), e.g. `https://your-app.vercel.app` or `*` for any. |
| `S3_*` | Optional | Only if you use S3: `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_PUBLIC_URL`, etc. |

### Firebase on Render (no file upload)

The backend supports **Firebase credentials via env var** (no JSON file needed):

1. In [Firebase Console](https://console.firebase.google.com) → Project Settings → Service accounts → **Generate new private key**.
2. Open the downloaded JSON file.
3. In Render → **Environment** → Add variable:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value:** paste the **entire** JSON content (as one line is fine).

The app will use this instead of `GOOGLE_APPLICATION_CREDENTIALS` file path.

---

## 4. After deploy

- **URL:** `https://<your-service-name>.onrender.com`
- **Health check:** `GET https://<your-service-name>.onrender.com/health` → `{"ok":true,...}`
- **API base:** `https://<your-service-name>.onrender.com/api`

Set your frontend (e.g. Vercel) env var:

- `VITE_API_BACKEND_URL=https://<your-service-name>.onrender.com/api`

Redeploy the frontend after changing this.

---

## 5. Optional: render.yaml (Blueprint)

The repo includes `render.yaml` in the backend folder. If you set **Root Directory** to that backend folder, Render can use it for build/start and health check. You still must add environment variables in the Render dashboard.

---

## Troubleshooting

| Issue | Fix |
|------|-----|
| Build fails: `tsc` not found | Build command must be `npm install && npm run build` so dependencies and TypeScript are installed. |
| Crash on start: Firebase | Set `FIREBASE_SERVICE_ACCOUNT_JSON` to the full JSON string (or ensure the path in `GOOGLE_APPLICATION_CREDENTIALS` is valid; on Render, using the JSON env var is preferred). |
| 503 / timeout | Free tier spins down after inactivity. First request may be slow; subsequent requests are fast. |
| CORS errors from frontend | Set `CORS_ORIGIN` to your Vercel (or frontend) URL, e.g. `https://your-app.vercel.app`. |
