# Firebase Compatibility Backend

Node.js + MongoDB backend that replaces Firebase while keeping frontend behavior unchanged.

## Quick Start

```bash
cd sys/backend
npm install
cp .env.example .env   # configure MongoDB, JWT secrets, etc.
npm run dev
```

Server runs on port 4000 by default.

## Deploy (production)

- **Railway (recommended)** — Full API + WebSockets (Socket.IO). See [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md). Set frontend `VITE_API_BACKEND_URL` to `https://<your-app>.up.railway.app/api`.
- **Vercel (alternative)** — Serverless only; no Socket.IO. See [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md).

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login (email, password) → user + tokens |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/logout` | POST | Logout (requires JWT) |
| `/api/auth/me` | GET | Current user (requires JWT) |
| `/api/firestore/documents/:path*` | GET | Get document |
| `/api/firestore/documents/:path*` | POST | Set document |
| `/api/firestore/documents/:path*` | PATCH | Update document |
| `/api/firestore/documents/:path*` | DELETE | Delete document |
| `/api/firestore/query` | POST | Query collection |
| `/api/storage/upload` | POST | Upload file (multipart) |
| `/api/domains/add` | POST | Add domain |
| `/api/domains/verify` | POST | Verify domain DNS |
| `/api/domains/remove` | POST | Remove domain |
| `/api/domains/list` | GET | List domains |
| `/api/domains/status` | GET | Get domain status |

## Cloud Functions Compatibility

For base URL replacement, these paths are also available:

- `POST /api/addDomain` → same as `/api/domains/add`
- `POST /api/verifyDomain` → same as `/api/domains/verify`
- `POST /api/removeDomain` → same as `/api/domains/remove`
- `GET /api/getDomainStatus` → same as `/api/domains/status`
- `GET /api/listDomains` → same as `/api/domains/list`

## Environment Variables

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/madas
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_URL=http://localhost:4000/storage
```

## Frontend Changes

1. **`lib/firebase.ts`** – Replace Firebase SDK with a thin adapter that calls `http://localhost:4000/api` (see `ARCHITECTURE.md`).
2. **`contexts/AuthContext.tsx`** – Use compatibility auth (onAuthStateChanged → adapter).
3. **`services/domainService.ts`** – Set `API_BASE_URL` to `http://localhost:4000/api`.

## Realtime (Socket.IO)

Connect with JWT:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:4000', {
  auth: { token: accessToken }
});
socket.on('order_created', (data) => { ... });
```

## Migration

See `src/migration/README.md`. Run `npm run migrate` (dry run) and `DRY_RUN=false npm run migrate` to execute.
