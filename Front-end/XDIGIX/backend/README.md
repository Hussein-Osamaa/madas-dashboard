# XDIGIX REST API

Scalable Node.js + Express.js + MongoDB backend for fulfillment service: inventory, orders, returns, barcode scanning, payments, and client/staff management.

**Important:** Frontend must NEVER directly access the database. All operations go through API routes.

---

## 📁 Folder Structure

```
backend/
├── src/
│   ├── config/           # Database & environment
│   │   ├── database.js
│   │   └── env.js
│   ├── controllers/      # Request handlers
│   │   ├── authController.js
│   │   ├── clientController.js
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   ├── scanLogController.js
│   │   ├── returnController.js
│   │   ├── paymentController.js
│   │   └── userController.js
│   ├── middleware/       # Auth, roles, validation, errors, rate limit
│   │   ├── auth.js
│   │   ├── roles.js
│   │   ├── clientAccess.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── validate.js
│   ├── models/           # Mongoose schemas
│   │   ├── User.js
│   │   ├── Client.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── ScanLog.js
│   │   ├── Return.js
│   │   └── Payment.js
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic (inventory)
│   │   └── inventoryService.js
│   ├── validators/       # express-validator rules
│   ├── app.js
│   └── index.js
├── scripts/
│   └── seed-admin.js     # Create initial admin
├── postman/
│   └── XDIGIX-API.postman_collection.json
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Installation

### 1. Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` and set:

- `MONGODB_URI` – MongoDB connection string
- `JWT_SECRET` – Strong secret for JWT (change in production)
- `CORS_ORIGIN` – Comma-separated frontend URLs (e.g. `http://localhost:3000`)

### 4. Connect MongoDB Atlas

1. Create an account at [MongoDB Atlas](https://cloud.mongodb.com).
2. Create a cluster.
3. Go to **Database Access** → Add Database User (username + password).
4. Go to **Network Access** → Add IP Address (e.g. `0.0.0.0/0` for development).
5. Go to **Database** → Connect → **Drivers**.
6. Copy the connection string, e.g.:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/xdigix?retryWrites=true&w=majority
   ```
7. Replace `<username>` and `<password>` with your credentials.
8. Put the final string in `MONGODB_URI` in `.env`.

### 5. Seed Admin User

```bash
node scripts/seed-admin.js
```

Or set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before running.

### 6. Start Server

```bash
npm run dev
```

API runs at `http://localhost:5000`.

---

## 🔐 Authentication

- **Login:** `POST /api/auth/login` with `email` and `password`.
- **Token:** Use `Authorization: Bearer <token>` in all protected requests.
- **Roles:** `admin`, `staff`, `client`.
- **Admin:** Full access, can manage users.
- **Staff:** Can manage clients, products, orders, returns, payments.
- **Client:** Only their own `clientId` data.

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **Auth** |
| POST | `/api/auth/login` | - | Login (rate limited) |
| POST | `/api/auth/register` | Admin | Create user |
| GET | `/api/auth/me` | ✓ | Current user |
| **Clients** |
| GET | `/api/clients` | ✓ | List clients |
| GET | `/api/clients/:id` | ✓ | Get client |
| POST | `/api/clients` | Staff+ | Create client |
| PATCH | `/api/clients/:id` | ✓ | Update client |
| DELETE | `/api/clients/:id` | Admin | Delete client |
| **Products** |
| GET | `/api/products` | ✓ | List products |
| GET | `/api/products/:id` | ✓ | Get product |
| GET | `/api/products/barcode/:barcode` | ✓ | Get by barcode |
| POST | `/api/products` | Staff+ | Create product |
| PATCH | `/api/products/:id` | Staff+ | Update product |
| DELETE | `/api/products/:id` | Staff+ | Delete product |
| POST | `/api/products/audit` | Staff+ | Audit scan (adjust stock) |
| **Orders** |
| GET | `/api/orders` | ✓ | List orders |
| GET | `/api/orders/:id` | ✓ | Get order |
| POST | `/api/orders` | Staff+ | Create order (decreases stock) |
| PATCH | `/api/orders/:id` | Staff+ | Update order |
| DELETE | `/api/orders/:id` | Staff+ | Delete order |
| **Scan Logs** |
| GET | `/api/scan-logs` | ✓ | List scan logs |
| GET | `/api/scan-logs/:id` | ✓ | Get scan log |
| **Returns** |
| GET | `/api/returns` | ✓ | List returns |
| GET | `/api/returns/:id` | ✓ | Get return |
| POST | `/api/returns` | Staff+ | Create return |
| POST | `/api/returns/:id/approve` | Staff+ | Approve (restocks) |
| POST | `/api/returns/:id/reject` | Staff+ | Reject |
| **Payments** |
| GET | `/api/payments` | ✓ | List payments |
| GET | `/api/payments/:id` | ✓ | Get payment |
| POST | `/api/payments` | Staff+ | Create payment |
| DELETE | `/api/payments/:id` | Staff+ | Delete payment |
| **Users** |
| GET | `/api/users` | Admin | List users |
| GET | `/api/users/:id` | Admin | Get user |
| PATCH | `/api/users/:id` | Admin | Update user |

---

## 📦 Example .env

```env
NODE_ENV=development
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/xdigix?retryWrites=true&w=majority

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Rate limiting
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=5

# CORS (comma-separated)
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Seed admin (optional)
ADMIN_EMAIL=admin@xdigix.com
ADMIN_PASSWORD=admin123
```

---

## 📮 Postman

1. Import `postman/XDIGIX-API.postman_collection.json` into Postman.
2. Set `baseUrl` to `http://localhost:5000`.
3. Use **Login** request to get a token.
4. Add `Authorization: Bearer {{token}}` to protected requests (or use collection variables).

---

## 🔒 Security

- **Client isolation:** Clients see only their own data.
- **Admin routes:** User CRUD restricted to admin.
- **Rate limiting:** Global + stricter login limit.
- **Password hashing:** bcrypt.
- **NoSQL injection:** `express-mongo-sanitize`.
- **Headers:** `helmet`.

---

## 📊 Inventory Logic

| Event | Effect |
|-------|--------|
| Order created | Stock decreases (product/variant) |
| Return approved | Stock increases (restock items only) |
| Audit scan | Stock set to scanned quantity |
