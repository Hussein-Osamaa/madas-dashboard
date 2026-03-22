const DEFAULT_API_BASE = 'https://xdigix-os-production.up.railway.app/api';

/**
 * Backend API client for Warehouse Fulfillment Portal
 * Uses staff auth (POST /auth/staff/login)
 * Default: Railway production. Override with VITE_API_BACKEND_URL for local backend (e.g. http://localhost:4000/api).
 */
function getApiBase(): string {
  const env = import.meta.env.VITE_API_BACKEND_URL;
  if (typeof env === 'string' && env.trim()) {
    const raw = env.trim().replace(/\/$/, '');
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const origin = raw.replace(/\/api.*$/, '');
      return origin ? `${origin}/api` : raw;
    }
    const host = raw.replace(/^\/+|\/api.*$/g, '').replace(/\/+$/, '');
    if (!host) return raw;
    const base = `https://${host}`;
    return base.endsWith('/api') ? base : `${base}/api`;
  }
  return DEFAULT_API_BASE;
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

/** True if JWT is expired or will expire in the next 60s (avoid 401 on next request). */
function isAccessTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp == null) return false;
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
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
    if (res.ok && data.accessToken) {
      setTokens(data.accessToken, rt);
      return data.accessToken;
    }
    // Refresh rejected (expired/invalid) — clear session so user goes to login
    clearTokens();
  } catch {
    clearTokens();
  }
  return null;
}

async function getToken(): Promise<string | null> {
  const t = getAccessToken();
  if (t && !isAccessTokenExpired(t)) return t;
  const refreshed = await refreshAccessToken();
  if (refreshed) return refreshed;
  return t;
}

export async function fetchApi<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      const retry = await fetch(`${API_BASE}${path}`, { ...opts, headers: retryHeaders });
      const retryJson = await retry.json().catch(() => ({}));
      if (!retry.ok) throw new Error((retryJson as { error?: string }).error || `HTTP ${retry.status}`);
      return retryJson as T;
    }
    clearTokens();
  }
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

// ---------------------------------------------------------------------------
// Restock Session
// ---------------------------------------------------------------------------

export interface RestockSessionItem {
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  /** Size-level breakdown (e.g. { "40": 2, "42": 3 }) */
  sizes?: Record<string, number>;
}

export async function finishRestockSession(
  clientId: string,
  items: RestockSessionItem[],
  sessionNote?: string
): Promise<{ success: boolean; reportId: string; totalItems: number }> {
  return fetchApi<{ success: boolean; reportId: string; totalItems: number }>('/warehouse/restock-session', {
    method: 'POST',
    body: JSON.stringify({ clientId, items, sessionNote }),
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
  return fetchApi<{ products: ProductWithStock[] }>(`/warehouse/products?clientId=${encodeURIComponent(clientId)}&lean=1`);
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

/** Chunk size for bulk-stock requests. Keeps each payload small and lets the
 *  server handle any number of products without a single gigantic request. */
const BULK_STOCK_CHUNK = 200;

export async function bulkUpdateStock(
  clientId: string,
  updates: Array<{ productId: string; stock: Record<string, number> }>,
  onProgress?: (done: number, total: number) => void
): Promise<{ succeeded: number; failed: number; total: number }> {
  let succeeded = 0;
  let failed    = 0;
  const total   = updates.length;

  for (let i = 0; i < updates.length; i += BULK_STOCK_CHUNK) {
    const chunk = updates.slice(i, i + BULK_STOCK_CHUNK);
    const res = await fetchApi('/warehouse/products/bulk-stock', {
      method: 'POST',
      body: JSON.stringify({ clientId, updates: chunk }),
    }) as { succeeded: number; failed: number; total: number };
    succeeded += res.succeeded ?? 0;
    failed    += res.failed    ?? 0;
    onProgress?.(Math.min(i + BULK_STOCK_CHUNK, total), total);
  }

  return { succeeded, failed, total };
}

export async function deleteProduct(clientId: string, productId: string): Promise<void> {
  const url = `/warehouse/products/${productId}?clientId=${encodeURIComponent(clientId)}`;
  await fetchApi(url, { method: 'DELETE' });
}

export type ProductActivityAction = 'created' | 'updated' | 'deleted';

export interface ProductActivityLogEntry {
  id: string;
  clientId: string;
  productId: string;
  productName?: string;
  action: ProductActivityAction;
  performedByUserId: string;
  performedByEmail: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export async function listProductActivityLog(params: {
  clientId?: string;
  page?: number;
  limit?: number;
}): Promise<{ entries: ProductActivityLogEntry[]; total: number }> {
  const sp = new URLSearchParams();
  if (params.clientId) sp.set('clientId', params.clientId);
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  const q = sp.toString();
  return fetchApi<{ entries: ProductActivityLogEntry[]; total: number }>(
    `/warehouse/product-activity-log${q ? `?${q}` : ''}`
  );
}

// ---------------------------------------------------------------------------
// Warehouse dashboard (movement-based metrics, chart, top SKUs, worker log)
// ---------------------------------------------------------------------------

export interface DashboardDailyRow {
  date: string;
  STOCK_IN: number;
  PICKED: number;
  SHIPPED: number;
  RETURNED: number;
  DAMAGED: number;
  MANUAL_ADJUSTMENT: number;
}

export interface DashboardTopSku {
  sku: string;
  totalMovement: number;
  in: number;
  out: number;
}

export interface DashboardWorkerEntry {
  id: string;
  sku: string;
  type: string;
  quantity: number;
  worker_id: string;
  reference_id?: string;
  created_at: string;
}

export interface AuditAlertSummary {
  id: string;
  sku: string;
  physicalCount: number;
  systemStock: number;
  difference: number;
  threshold: number;
  shiftName?: string;
  createdAt: string;
}

export interface DashboardData {
  totalStockValue: number | null;
  availableUnits: number;
  unitsPickedToday: number;
  unitsShippedToday: number;
  returnsThisWeek: number;
  damagedThisWeek: number;
  shrinkagePercentage: number;
  dailyMovementChart: DashboardDailyRow[];
  topMovingSkus: DashboardTopSku[];
  workerActivityLog: DashboardWorkerEntry[];
  auditAlerts?: AuditAlertSummary[];
}

export async function getDashboard(clientId: string): Promise<DashboardData> {
  return fetchApi<DashboardData>(`/warehouse/dashboard?clientId=${encodeURIComponent(clientId)}`);
}

export interface MovementLogEntry {
  id: string;
  sku: string;
  type: string;
  quantity: number;
  reference_id?: string;
  worker_id?: string;
  note?: string;
  created_at: string;
}

export async function listMovements(params: {
  clientId: string;
  sku?: string;
  type?: string;
  reference_id?: string;
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  items: MovementLogEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const sp = new URLSearchParams();
  sp.set('clientId', params.clientId);
  if (params.sku) sp.set('sku', params.sku);
  if (params.type) sp.set('type', params.type);
  if (params.reference_id) sp.set('reference_id', params.reference_id);
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.sortOrder) sp.set('sortOrder', params.sortOrder);
  return fetchApi(`/warehouse/movements?${sp.toString()}`);
}

/** Audit comparison: physical count vs system stock; threshold alerts. */
export async function recordAuditCount(params: {
  clientId: string;
  sku: string;
  physicalCount: number;
  shiftId?: string;
  shiftName?: string;
  note?: string;
}): Promise<{
  comparisonId: string;
  sku: string;
  physicalCount: number;
  systemStock: number;
  difference: number;
  threshold: number;
  alertTriggered: boolean;
  alertId?: string;
}> {
  return fetchApi('/warehouse/audit/record-count', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function recordAuditCountBulk(params: {
  clientId: string;
  counts: Array<{ sku: string; physicalCount: number }>;
  shiftId?: string;
  shiftName?: string;
  note?: string;
}): Promise<{ comparisons: Array<{ comparisonId: string; sku: string; physicalCount: number; systemStock: number; difference: number; threshold: number; alertTriggered: boolean; alertId?: string }> }> {
  return fetchApi('/warehouse/audit/record-count-bulk', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function listAuditComparisons(params: {
  clientId: string;
  sku?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: Array<{
    id: string;
    sku: string;
    physicalCount: number;
    systemStock: number;
    difference: number;
    shiftId?: string;
    shiftName?: string;
    performedBy?: string;
    thresholdUsed: number;
    alertTriggered: boolean;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const sp = new URLSearchParams();
  sp.set('clientId', params.clientId);
  if (params.sku) sp.set('sku', params.sku);
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  return fetchApi(`/warehouse/audit/comparisons?${sp.toString()}`);
}

export async function listAuditAlerts(params: {
  clientId: string;
  acknowledged?: boolean;
  page?: number;
  limit?: number;
}): Promise<{
  items: Array<{
    id: string;
    comparisonId: string;
    sku: string;
    physicalCount: number;
    systemStock: number;
    difference: number;
    threshold: number;
    shiftId?: string;
    shiftName?: string;
    performedBy?: string;
    acknowledged: boolean;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  pages: number;
}> {
  const sp = new URLSearchParams();
  sp.set('clientId', params.clientId);
  if (params.acknowledged !== undefined) sp.set('acknowledged', String(params.acknowledged));
  if (params.page != null) sp.set('page', String(params.page));
  if (params.limit != null) sp.set('limit', String(params.limit));
  return fetchApi(`/warehouse/audit/alerts?${sp.toString()}`);
}

export async function acknowledgeAuditAlert(alertId: string): Promise<{ success: boolean }> {
  return fetchApi(`/warehouse/audit/alerts/${encodeURIComponent(alertId)}/acknowledge`, { method: 'PATCH' });
}

export async function getAuditThreshold(clientId: string): Promise<{ threshold: number }> {
  return fetchApi(`/warehouse/audit/threshold?clientId=${encodeURIComponent(clientId)}`);
}

/** Download Excel export for date range (4 sheets). Triggers browser download. */
export async function downloadInventoryExport(
  clientId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const token = await getToken();
  const params = new URLSearchParams({
    clientId,
    startDate,
    endDate,
  });
  const url = `${API_BASE}/warehouse/export?${params}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Export failed: ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] ?? `inventory-export-${startDate}-${endDate}.xlsx`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
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
  lastScanned: { productId: string; barcode: string; workerId: string; scannedAt: string; productName?: string; productSku?: string; size?: string } | null;
  recentScans: Array<{ productId: string; barcode: string; workerId: string; scannedAt: string; productName?: string; productSku?: string; size?: string }>;
}

export type AuditSessionRestore = AuditSessionSummary & { joinCode: string };

export async function getAuditSession(sessionId: string): Promise<AuditSessionSummary> {
  return fetchApi<AuditSessionSummary>(`/audit/session/${sessionId}`);
}

/** Restore active audit session after page refresh/reopen. Returns session + joinCode if user is in the session. */
export async function auditRestore(sessionId: string): Promise<AuditSessionRestore> {
  return fetchApi<AuditSessionRestore>(`/audit/restore/${sessionId}`);
}

export async function auditScan(sessionId: string, barcode: string): Promise<{ success: true; product: { id: string; name?: string; sku?: string; size?: string } }> {
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

export interface ProductSizeMovementStatus {
  size: string;
  sizeBarcode?: string;
  movementQuantity: number;
  status: 'In Stock' | 'Out of Stock';
}

export interface FullProductReportItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  mainBarcode?: string;
  movementQuantity: number;
  sizes: ProductSizeMovementStatus[];
}

export async function auditFinish(sessionId: string): Promise<{
  success: boolean;
  adjustments: AuditAdjustment[];
  fullProductReport?: FullProductReportItem[];
}> {
  return fetchApi<{
    success: boolean;
    adjustments: AuditAdjustment[];
    fullProductReport?: FullProductReportItem[];
  }>('/audit/finish', {
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
