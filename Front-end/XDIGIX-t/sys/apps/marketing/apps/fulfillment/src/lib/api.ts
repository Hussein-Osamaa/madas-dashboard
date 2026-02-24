/**
 * Backend API client for Warehouse Fulfillment Portal
 * Uses staff auth (POST /auth/staff/login)
 * Set VITE_API_BACKEND_URL in production to the full backend URL including protocol, e.g.:
 *   https://xdigix-os-production.up.railway.app/api
 * When unset, uses same host + port 4000. If you set only a hostname (no protocol), we normalize to https://hostname/api.
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BACKEND_URL;
  if (typeof env === 'string' && env.trim()) {
    const raw = env.trim().replace(/\/$/, '');
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    const host = raw.replace(/^\/+|\/api.*$/g, '').replace(/\/+$/, '');
    if (!host) return raw;
    const base = `https://${host}`;
    return base.endsWith('/api') ? base : `${base}/api`;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'https:';
    return `${protocol}//${window.location.hostname}:4000/api`;
  }
  return 'http://localhost:4000/api';
}
const API_BASE = getApiBase();

const TOKEN_KEY = 'warehouse_access_token';
const REFRESH_KEY = 'warehouse_refresh_token';
const USER_CACHE_KEY = 'warehouse_user';

export function getAccessToken(): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
}

export function setTokens(access: string, refresh: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }
}

export function clearTokens() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
  }
}

export function getCachedUser(): StaffUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StaffUser;
    if (data && typeof data.uid === 'string' && typeof data.email === 'string') return data;
  } catch {
    localStorage.removeItem(USER_CACHE_KEY);
  }
  return null;
}

export function setCachedUser(user: StaffUser | null) {
  if (typeof localStorage === 'undefined') return;
  if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_CACHE_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const rt = typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
  if (!rt) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt, accountType: 'STAFF' }),
    });
    const data = await res.json();
    if (data.accessToken) {
      setTokens(data.accessToken, rt);
      return data.accessToken;
    }
  } catch {
    clearTokens();
  }
  return null;
}

async function getToken(): Promise<string | null> {
  const t = getAccessToken();
  if (t) return t;
  return refreshAccessToken();
}

export async function fetchApi<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
  return json as T;
}

export interface StaffUser {
  uid: string;
  userId: string;
  email: string;
  displayName?: string;
  accountType: string;
  role?: string;
  department?: string;
  allowedApps?: string[];
}

export interface LoginResponse {
  user: StaffUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function staffLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/staff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Login failed');
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function staffLogout() {
  try {
    const t = getAccessToken();
    if (t) await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
  } catch {}
  clearTokens();
}

export async function getMe(): Promise<{ user: StaffUser } | null> {
  try {
    return await fetchApi<{ user: StaffUser }>('/auth/me');
  } catch {
    return null;
  }
}

// Warehouse API
export async function inbound(clientId: string, productId: string, quantity: number, referenceId?: string) {
  return fetchApi<{ success: boolean }>('/warehouse/inbound', {
    method: 'POST',
    body: JSON.stringify({ clientId, productId, quantity, referenceId }),
  });
}

export async function damage(clientId: string, productId: string, quantity: number, referenceId?: string) {
  return fetchApi<{ success: boolean }>('/warehouse/damage', {
    method: 'POST',
    body: JSON.stringify({ clientId, productId, quantity, referenceId }),
  });
}

export async function missing(clientId: string, productId: string, quantity: number, referenceId?: string) {
  return fetchApi<{ success: boolean }>('/warehouse/missing', {
    method: 'POST',
    body: JSON.stringify({ clientId, productId, quantity, referenceId }),
  });
}

export async function listTransactions(clientId: string, productId?: string, page = 1, limit = 20) {
  const params = new URLSearchParams({ clientId, page: String(page), limit: String(limit) });
  if (productId) params.set('productId', productId);
  return fetchApi<{ items: unknown[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/warehouse/transactions?${params}`
  );
}

export interface FulfillmentClient {
  id: string;
  name: string;
}

export async function listFulfillmentClients(): Promise<{ clients: FulfillmentClient[] }> {
  return fetchApi<{ clients: FulfillmentClient[] }>('/warehouse/clients');
}

export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  description?: string;
  address?: string;
}

export async function listWarehouses(clientId: string): Promise<{ warehouses: Warehouse[] }> {
  return fetchApi<{ warehouses: Warehouse[] }>(`/warehouse/warehouses?clientId=${encodeURIComponent(clientId)}`);
}

export async function createWarehouse(
  clientId: string,
  payload: { name: string; code?: string; description?: string; address?: string }
): Promise<{ id: string }> {
  return fetchApi<{ id: string }>('/warehouse/warehouses', {
    method: 'POST',
    body: JSON.stringify({ clientId, ...payload }),
  });
}

export interface ProductWithStock {
  id: string;
  name?: string;
  availableStock?: number;
  [key: string]: unknown;
}

export async function listProducts(clientId: string): Promise<{ products: ProductWithStock[] }> {
  return fetchApi<{ products: ProductWithStock[] }>(`/warehouse/products?clientId=${encodeURIComponent(clientId)}`);
}

export interface CreateProductInput {
  name: string;
  sku?: string;
  barcode?: string;
  warehouse?: string;
  stock?: Record<string, number>;
  sizeBarcodes?: Record<string, string>;
}

export async function createProduct(clientId: string, input: CreateProductInput): Promise<{ id: string }> {
  return fetchApi<{ id: string }>('/warehouse/products', {
    method: 'POST',
    body: JSON.stringify({ clientId, ...input }),
  });
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  barcode?: string;
  warehouse?: string;
  stock?: Record<string, number>;
  sizeBarcodes?: Record<string, string>;
}

export async function updateProduct(clientId: string, productId: string, input: UpdateProductInput): Promise<void> {
  await fetchApi(`/warehouse/products/${productId}?clientId=${encodeURIComponent(clientId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...input, clientId }),
  });
}

// ---------------------------------------------------------------------------
// Fulfillment orders (no clientId – lists/updates across all fulfillment clients)
// ---------------------------------------------------------------------------

export interface FulfillmentOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  businessId: string;
  businessName: string;
  customer: { name: string; email: string; phone?: string };
  fulfillment: { status: string; type?: string; trackingNumber?: string; shippedAt?: string; deliveredAt?: string; scannedItems?: number[] };
  financials: { total: number; subtotal?: number; shipping?: number };
  metadata: { createdAt?: string; updatedAt?: string };
  items?: Array<{ productId: string; productName?: string; name?: string; quantity: number; price: number; size?: string; barcode?: string }>;
  shippingAddress?: { address?: string; city?: string; state?: string; country?: string; zipCode?: string };
  date?: string;
}

export async function listFulfillmentOrders(status?: 'all' | 'pending' | 'ready_for_pickup' | 'shipped'): Promise<{ orders: FulfillmentOrder[] }> {
  const q = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  return fetchApi<{ orders: FulfillmentOrder[] }>(`/warehouse/orders${q}`);
}

export async function updateOrderFulfillment(
  orderId: string,
  payload: { businessId: string; status: string; trackingNumber?: string; notes?: string }
): Promise<void> {
  await fetchApi(`/warehouse/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Get single order (for refreshing after scans) */
export async function getOrder(businessId: string, orderId: string): Promise<{ order: FulfillmentOrder }> {
  return fetchApi<{ order: FulfillmentOrder }>(`/warehouse/orders/${orderId}?businessId=${encodeURIComponent(businessId)}`);
}

/** Scan barcode for an order; deducts stock and marks item scanned. Returns matched, itemIndex, scannedCount, allScanned. */
export async function scanOrderBarcode(
  orderId: string,
  businessId: string,
  barcode: string
): Promise<{ matched: boolean; itemIndex?: number; scannedCount: number; allScanned: boolean; message?: string }> {
  return fetchApi(`/warehouse/orders/${orderId}/scan`, {
    method: 'POST',
    body: JSON.stringify({ businessId, barcode }),
  });
}

// ---------------------------------------------------------------------------
// Weekly Audit Scan
// ---------------------------------------------------------------------------

export async function auditStart(clientId: string): Promise<{ sessionId: string; joinCode: string }> {
  return fetchApi<{ sessionId: string; joinCode: string }>('/audit/start', {
    method: 'POST',
    body: JSON.stringify({ clientId }),
  });
}

export async function auditJoin(joinCode: string): Promise<{ sessionId: string; clientId: string; createdBy: string; joinCode: string }> {
  return fetchApi<{ sessionId: string; clientId: string; createdBy: string; joinCode: string }>('/audit/join', {
    method: 'POST',
    body: JSON.stringify({ joinCode: String(joinCode).trim() }),
  });
}

export interface AuditSessionSummary {
  clientId: string;
  status: string;
  createdBy: string;
  participants?: string[];
  workerScanCounts: Record<string, number>;
  workers: Array<{ userId: string; name: string; scanCount: number }>;
  totalScans: number;
  lastScanned: { productId: string; barcode: string; workerId: string; scannedAt: string; productName?: string; productSku?: string } | null;
  recentScans: Array<{ productId: string; barcode: string; workerId: string; scannedAt: string; productName?: string; productSku?: string }>;
}

export type AuditSessionRestore = AuditSessionSummary & { joinCode: string };

export async function getAuditSession(sessionId: string): Promise<AuditSessionSummary> {
  return fetchApi<AuditSessionSummary>(`/audit/session/${sessionId}`);
}

/** Restore active audit session after page refresh/reopen. Returns session + joinCode if user is in the session. */
export async function auditRestore(sessionId: string): Promise<AuditSessionRestore> {
  return fetchApi<AuditSessionRestore>(`/audit/restore/${sessionId}`);
}

export async function auditScan(sessionId: string, barcode: string): Promise<{ success: true; product: { id: string; name?: string; sku?: string } }> {
  return fetchApi('/audit/scan', {
    method: 'POST',
    body: JSON.stringify({ auditSessionId: sessionId, sessionId, barcode }),
  });
}

export interface AuditAdjustment {
  productId: string;
  expected: number;
  actual: number;
  type: string;
}

export async function auditFinish(sessionId: string): Promise<{ success: boolean; adjustments: AuditAdjustment[] }> {
  return fetchApi<{ success: boolean; adjustments: AuditAdjustment[] }>('/audit/finish', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

export async function auditCancel(sessionId: string): Promise<void> {
  await fetchApi('/audit/cancel', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
}

// ---------------------------------------------------------------------------
// Inventory Reports
// ---------------------------------------------------------------------------

export interface InventoryReportItem {
  id: string;
  period: string;
  periodLabel?: string;
  periodStart: string;
  periodEnd: string;
  inbound: number;
  sold: number;
  damaged: number;
  missing: number;
  closingBalance: number;
  pdfUrl?: string;
  createdAt: string;
}

export async function listReports(clientId: string): Promise<{ reports: InventoryReportItem[] }> {
  return fetchApi<{ reports: InventoryReportItem[] }>(`/warehouse/reports?clientId=${encodeURIComponent(clientId)}`);
}

/** Download report PDF; triggers browser save. */
export async function downloadReport(clientId: string, reportId: string): Promise<void> {
  const token = await getToken();
  const url = `${API_BASE}/warehouse/reports/${reportId}/download?clientId=${encodeURIComponent(clientId)}`;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(res.status === 404 ? 'Report not found' : `Download failed: ${res.status}`);
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `report-${reportId}.pdf`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
