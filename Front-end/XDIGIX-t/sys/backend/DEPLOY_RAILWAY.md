# Deploy backend on Railway

## Fix: "Error creating build plan with Railpack"

Railway builds from the **repo root** by default. Your backend lives in **`backend/`**, so Railpack doesn't see a single Node app and fails. Do this:

### 1. Set Root Directory

1. In Railway: open your **backend service** → **Settings** (or **Configure**).
2. Find **Root Directory** / **Source** / **Monorepo** (wording may vary).
3. Set it to: **`backend`**  
   (If your repo root is not the `sys` folder, use the path to the backend from repo root, e.g. **`sys/backend`**.)
4. Save. Trigger a new deploy.

All build and start commands will run from that folder, so Railpack will see `package.json` and `railpack.json` and can create a valid build plan.

### 2. Build and start (optional override)

If the service already has custom commands, set:

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`

Otherwise the **`backend/railpack.json`** file defines these for Railpack.

### 3. Environment variables

In the service → **Variables**, add (as secrets where needed):

- `NODE_ENV` = `production`
- `MONGODB_URI` = your MongoDB connection string
- `JWT_ACCESS_SECRET` = strong random string
- `JWT_REFRESH_SECRET` = strong random string
- `FIREBASE_SERVICE_ACCOUNT_JSON` = full Firebase service account JSON (paste the whole JSON)
- `CORS_ORIGIN` = your frontend URL (e.g. `https://your-app.vercel.app`)

### 4. After deploy

- Service URL: `https://<your-service>.up.railway.app`
- API base: `https://<your-service>.up.railway.app/api`
- Health: `GET https://<your-service>.up.railway.app/health`

Set your frontend env: `VITE_API_BACKEND_URL=https://<your-service>.up.railway.app/api`
