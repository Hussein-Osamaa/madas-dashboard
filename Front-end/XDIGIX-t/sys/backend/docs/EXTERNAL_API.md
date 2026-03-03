# External API (Multi-Tenant)

Production-ready external API for orders and webhooks. No secrets in frontend; all credentials from environment or database.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/external/:tenantId/orders` | Bearer token | Create order; validates body, saves, updates inventory. |
| POST | `/api/external/:tenantId/webhook` | HMAC signature + optional timestamp | Receive webhook; verify signature, return 200 quickly. |

## Security

- **Secrets**: Stored in MongoDB (`ExternalTenantConfig`) or optional env override `EXTERNAL_CREDENTIALS_JSON`. Never in frontend.
- **Auth (orders)**: `Authorization: Bearer <apiToken>`. Token resolved to tenant; path `:tenantId` must match token’s tenant. Constant-time comparison.
- **Webhook**: Header `x-webhook-signature: sha256=<hmac>` (HMAC-SHA256 of raw body with tenant’s `webhookSecret`). Optional `x-webhook-timestamp` (unix seconds) for replay protection; rejected if outside configured window.
- **Rate limiting**: Per-tenant; configurable via `EXTERNAL_API_RATE_LIMIT_PER_TENANT` and window.
- **HTTPS**: Required in production for external routes (configurable).
- **Validation**: Request bodies validated with Zod; invalid payloads rejected with 400.
- **Logging**: Structured logs with `requestId`, `tenantId`, timestamp.

## Orders

**Request**

```http
POST /api/external/:tenantId/orders
Authorization: Bearer <apiToken>
Content-Type: application/json

{
  "items": [
    { "productId": "prod-1", "quantity": 2, "size": "M" }
  ],
  "source": "my-store",
  "customerEmail": "customer@example.com",
  "metadata": {}
}
```

**Response**

- `201`: `{ "success": true, "orderId": "..." }`
- `400`: Validation error (Zod details).
- `401`: Missing or invalid token.
- `403`: Tenant mismatch or HTTPS required.
- `429`: Rate limited.

## Webhook

**Request**

- Body: any JSON (e.g. `{ "event": "order.created", "timestamp": "2025-03-02T12:00:00Z", "data": {} }`).
- Headers:
  - `x-webhook-signature`: `sha256=<hmac_hex>` (HMAC-SHA256 of **raw body** with tenant’s `webhookSecret`).
  - `x-webhook-timestamp`: Unix seconds (optional; for replay protection).

**Response**

- `200`: `{ "received": true }` (return quickly; process async if needed).
- `401`: Missing or invalid signature.
- `403`: Webhook not enabled for tenant.
- `429`: Rate limited.

## Environment

See `.env.example`. Key variables:

- `EXTERNAL_CREDENTIALS_JSON`: Optional JSON map `{ "<tenantId>": { "apiToken", "webhookSecret", "enabled?", "apiEnabled?", "webhookEnabled?" } }`.
- `EXTERNAL_API_RATE_LIMIT_PER_TENANT`, `EXTERNAL_API_RATE_LIMIT_WINDOW_MS`.
- `EXTERNAL_WEBHOOK_TIMESTAMP_TOLERANCE_SEC` (default 300).
- `EXTERNAL_API_REQUIRE_HTTPS` (default true in production).

## Folder structure

```
src/
  config.ts                          # externalApi config
  types/external-api.types.ts        # Request augmentation, payload types
  schemas/
    external-tenant-config.schema.ts # MongoDB model for credentials
    external-order.schema.ts         # Zod schemas
  services/
    external-credentials.service.ts  # Resolve credentials (env + DB)
  middleware/
    request-id.middleware.ts
    https.middleware.ts
    external-auth.middleware.ts      # Bearer → tenant
    external-tenant-validate.middleware.ts  # :tenantId → tenant (webhook)
    external-rate-limit.middleware.ts
    external-webhook.middleware.ts   # HMAC + replay
    raw-body-webhook.middleware.ts   # Capture raw body for webhook path
  utils/
    logger.ts
    secure-compare.ts               # Constant-time compare
    webhook-signature.ts            # HMAC verify
  routes/
    external.routes.ts               # POST orders, POST webhook
```

## Frontend

Do **not** put `apiToken` or `webhookSecret` in frontend config or code. The dashboard can show a generated token for the user to copy once; the backend stores it. External sites should pass the token only in server-to-server calls (e.g. backend of the external site calls this API with the token in `Authorization`).
