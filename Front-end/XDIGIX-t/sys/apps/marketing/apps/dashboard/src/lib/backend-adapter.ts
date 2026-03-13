/**
 * Firebase Compatibility Adapter
 * Mirrors Firebase API but calls our Node.js + MongoDB backend.
 * Set VITE_API_BACKEND_URL to the API root only, e.g. https://your-backend.up.railway.app/api
 * (We normalize so the base never includes paths like /auth/me, which would cause doubled URLs.)
 */

function getApiBase(): string {
  const env = import.meta.env.VITE_API_BACKEND_URL;
  if (typeof env !== 'string' || !env.trim()) return 'https://xdigix-os-production.up.railway.app/api';
  const raw = env.trim().replace(/\/$/, '');
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const origin = raw.replace(/\/api.*$/, '');
    return origin ? `${origin}/api` : raw;
  }
  const host = raw.replace(/^\/+|\/api.*$/g, '').replace(/\/+$/, '');
  return host ? `https://${host}/api` : raw;
}
const API_BASE = getApiBase();

// Bootstrap tokens from URL hash (support mode: admin passes token via #token=...&refreshToken=...&accountType=...)
function bootstrapFromHash() {
  if (typeof window === 'undefined' || !window.location.hash) return;
  const hash = window.location.hash.slice(1);
  const hp = new URLSearchParams(hash);
  const t = hp.get('token');
  const r = hp.get('refreshToken');
  const a = hp.get('accountType');
  if (t) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('backend_access_token', t);
      if (r) localStorage.setItem('backend_refresh_token', r);
      if (a) localStorage.setItem('backend_account_type', a);
    }
    // Clean the hash so the token isn't sitting in the URL / browser history
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
bootstrapFromHash();

let accessToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('backend_access_token') : null;
let refreshToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('backend_refresh_token') : null;
let accountType: string = (typeof localStorage !== 'undefined' && localStorage.getItem('backend_account_type')) || 'CLIENT';
const authListeners: Array<(user: BackendUser | null) => void> = [];

export interface BackendUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  emailVerified: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

function persistTokens(acc: string, ref: string, type?: string) {
  accessToken = acc;
  refreshToken = ref;
  if (type) accountType = type;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('backend_access_token', acc);
    localStorage.setItem('backend_refresh_token', ref);
    if (type) localStorage.setItem('backend_account_type', type);
  }
}

function clearTokens() {
  accessToken = null;
  refreshToken = null;
  accountType = 'CLIENT';
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('backend_access_token');
    localStorage.removeItem('backend_refresh_token');
    localStorage.removeItem('backend_account_type');
  }
}

/** True if JWT is expired or will expire in the next 60s (refresh before 401). */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp == null) return false;
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

async function getToken(): Promise<string | null> {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('backend_account_type')) {
    accountType = localStorage.getItem('backend_account_type') || 'CLIENT';
  }
  if (accessToken && !isTokenExpired(accessToken)) return accessToken;
  if (accessToken && isTokenExpired(accessToken)) accessToken = null;
  if (!refreshToken) {
    if (typeof localStorage !== 'undefined') {
      refreshToken = localStorage.getItem('backend_refresh_token');
    }
    if (!refreshToken) return null;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken, accountType: accountType || 'CLIENT' })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        clearTokens();
      }
      console.warn('[auth] Token refresh failed:', res.status, (data as { error?: string }).error);
      return null;
    }
    const data = await res.json();
    if (data.accessToken) {
      persistTokens(data.accessToken, data.refreshToken || refreshToken ?? '');
      return data.accessToken;
    }
  } catch (err) {
    console.warn('[auth] Token refresh network error, keeping tokens for retry:', err);
  }
  return null;
}

async function fetchApi<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>)
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  let json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    if (token) {
      accessToken = null;
      const newToken = await getToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
        json = await res.json().catch(() => ({}));
      } else {
        clearTokens();
        currentUser = null;
        notifyAuthListeners(null);
        throw new Error('Session expired. Please sign in again.');
      }
    } else {
      clearTokens();
      currentUser = null;
      notifyAuthListeners(null);
      throw new Error('Session expired. Please sign in again.');
    }
  }
  if (res.status === 429) {
    const retryAfter = Math.min(parseInt(res.headers.get('Retry-After') || '2', 10), 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    json = await res.json().catch(() => ({}));
  }
  // After link-user / subscribe-fulfillment, existing token may lack tenant – refresh once and retry
  if (res.status === 403 && (json as { code?: string })?.code === 'auth/no-tenant' && token) {
    accessToken = null;
    const newToken = await getToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
      json = await res.json().catch(() => ({}));
    }
  }
  if (!res.ok) throw new Error((json as { error?: string })?.error || `HTTP ${res.status}`);
  return json as T;
}

function notifyAuthListeners(user: BackendUser | null) {
  authListeners.forEach((cb) => cb(user));
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

let currentUser: BackendUser | null = null;
let authInitResolved = false;

async function initAuth() {
  try {
    const token = await getToken();
    if (!token) {
      currentUser = null;
      return;
    }
    const data = await fetchApi<{ user: { uid: string; email: string; type?: string } }>('/auth/me');
    if (data?.user) {
      currentUser = {
        uid: data.user.uid,
        email: data.user.email || null,
        displayName: null,
        emailVerified: true,
        getIdToken: async () => (await getToken()) || ''
      };
    } else {
      currentUser = null;
    }
  } catch (err) {
    console.warn('[auth] initAuth failed:', err);
    const hasRefresh = typeof localStorage !== 'undefined' && !!localStorage.getItem('backend_refresh_token');
    if (!hasRefresh) {
      currentUser = null;
      clearTokens();
    } else {
      currentUser = null;
    }
  }
}

const initAuthPromise = initAuth().then(() => {
  authInitResolved = true;
  notifyAuthListeners(currentUser);
}).catch(() => {
  authInitResolved = true;
  notifyAuthListeners(null);
});

export const auth = {
  get currentUser() {
    return currentUser;
  },
  signOut: async () => {
    try {
      const token = await getToken();
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {}
    clearTokens();
    currentUser = null;
    notifyAuthListeners(null);
  },
  onAuthStateChanged: (cb: (user: BackendUser | null) => void) => {
    authListeners.push(cb);
    if (authInitResolved) {
      cb(currentUser);
    } else {
      initAuthPromise.then(() => cb(currentUser));
    }
    return () => {
      const i = authListeners.indexOf(cb);
      if (i >= 0) authListeners.splice(i, 1);
    };
  }
};

export async function signInWithEmailAndPassword(
  _auth: typeof auth,
  email: string,
  password: string
): Promise<{ user: BackendUser }> {
  const data = await fetchApi<{
    user: { uid: string; email: string; displayName?: string };
    accessToken: string;
    refreshToken: string;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password })
  });
  persistTokens(data.accessToken, data.refreshToken);
  currentUser = {
    uid: data.user.uid,
    email: data.user.email || null,
    displayName: data.user.displayName || null,
    emailVerified: true,
    getIdToken: async () => (await getToken()) || ''
  };
  notifyAuthListeners(currentUser);
  return { user: currentUser };
}

export async function createUserWithEmailAndPassword(
  _auth: typeof auth,
  email: string,
  password: string
): Promise<{ user: BackendUser }> {
  const data = await fetchApi<{
    user: { uid: string; email: string; displayName?: string };
    accessToken: string;
    refreshToken: string;
  }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password })
  });
  persistTokens(data.accessToken, data.refreshToken);
  currentUser = {
    uid: data.user.uid,
    email: data.user.email || null,
    displayName: data.user.displayName || null,
    emailVerified: false,
    getIdToken: async () => (await getToken()) || ''
  };
  notifyAuthListeners(currentUser);
  return { user: currentUser };
}

export async function signOut(_auth: typeof auth) {
  await auth.signOut();
}

export function onAuthStateChanged(_auth: typeof auth, cb: (user: BackendUser | null) => void) {
  return auth.onAuthStateChanged(cb);
}

export async function sendPasswordResetEmail(_auth: typeof auth, email: string) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to send reset email');
}

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------

function buildPath(...segments: string[]): string {
  return segments.filter(Boolean).join('/');
}

export function doc(_db: unknown, ...pathSegments: string[]) {
  return { _type: 'doc', path: buildPath(...pathSegments) };
}

export function collection(_db: unknown, ...pathSegments: string[]) {
  return { _type: 'collection', path: buildPath(...pathSegments) };
}

export function serverTimestamp() {
  return new Date();
}

export const Timestamp = {
  fromDate: (d: Date) => d,
  fromMillis: (ms: number) => new Date(ms),
  now: () => new Date()
};

export function query(
  collRef: { _type: string; path: string },
  ...constraints: Array<{ type: string; field?: string; op?: string; value?: unknown; direction?: string; limit?: number }>
) {
  const whereClauses = constraints.filter((c: { type?: string }) => c.type === 'where');
  const orderByClause = constraints.find((c: { type?: string }) => c.type === 'orderBy');
  const limitClause = constraints.find((c: { type?: string }) => c.type === 'limit');
  return {
    _type: 'query',
    path: collRef.path,
    constraints: [
      ...whereClauses.map((w: { field?: string; op?: string; value?: unknown }) => ({
        type: 'where',
        field: w.field,
        op: w.op || '==',
        value: w.value
      })),
      orderByClause ? { type: 'orderBy', field: orderByClause.field, direction: orderByClause.direction || 'asc' } : null,
      limitClause ? { type: 'limit', limit: limitClause.limit } : null
    ].filter(Boolean)
  };
}

export function where(field: string, op: string, value: unknown) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction?: 'asc' | 'desc') {
  return { type: 'orderBy', field, direction: direction || 'asc' };
}

export function limit(n: number) {
  return { type: 'limit', limit: n };
}

const NOT_FOUND_DOC = {
  exists: () => false,
  id: '',
  data: () => ({} as Record<string, unknown>)
};

/** Fetch a single document by path (e.g. businesses/BUSINESS_ID). Used for support mode without Firebase. */
export async function getDocumentByPath(path: string): Promise<{ id: string; data: Record<string, unknown> } | null> {
  try {
    const data = await fetchApi<{ id: string; data: Record<string, unknown> }>(`/firestore/documents/${path}`);
    if (!data || (data.id === '' && (!data.data || Object.keys(data.data).length === 0))) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getDoc(ref: { _type?: string; path?: string }) {
  const path = ref.path || (ref as { _path?: string })._path || '';
  try {
    const data = await fetchApi<{ id: string; data: Record<string, unknown> }>(`/firestore/documents/${path}`);
    // Backend returns 200 with { id: '', data: {} } for optional missing docs (e.g. staff) – treat as not found
    if (data && (data.id === '' || !data.id) && (!data.data || Object.keys(data.data).length === 0)) {
      return NOT_FOUND_DOC;
    }
    return {
      exists: () => !!data,
      id: data?.id || '',
      data: () => (data?.data || {}) as Record<string, unknown>
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? '');
    if (/404|not found|not-found/i.test(msg)) return NOT_FOUND_DOC;
    throw err;
  }
}

export async function getDocs(q: { _type?: string; path?: string; constraints?: unknown[] }) {
  const path = q.path || '';
  const constraints = (q.constraints || []) as Array<Record<string, unknown>>;
  const data = await fetchApi<{ docs: Array<{ id: string; data: Record<string, unknown> }> }>('/firestore/query', {
    method: 'POST',
    body: JSON.stringify({ path, constraints })
  });
  const docs = (data?.docs || []).map((d) => ({
    id: d.id,
    data: () => d.data as Record<string, unknown>
  }));
  return { docs };
}

export async function setDoc(
  ref: { _type?: string; path?: string },
  data: Record<string, unknown>,
  opts?: { merge?: boolean }
) {
  const path = ref.path || '';
  await fetchApi(`/firestore/documents/${path}`, {
    method: 'POST',
    body: JSON.stringify({ data, merge: opts?.merge ?? false })
  });
}

export async function updateDoc(ref: { _type?: string; path?: string }, data: Record<string, unknown>) {
  const path = ref.path || '';
  await fetchApi(`/firestore/documents/${path}`, {
    method: 'PATCH',
    body: JSON.stringify({ data })
  });
}

export async function addDoc(
  collRef: { _type?: string; path?: string },
  data: Record<string, unknown>
): Promise<{ id: string }> {
  const path = collRef.path || '';
  const result = await fetchApi<{ id: string }>(`/firestore/add/${path.replace(/^\//, '')}`, {
    method: 'POST',
    body: JSON.stringify({ data })
  });
  return { id: result.id };
}

export async function deleteDoc(ref: { _type?: string; path?: string }) {
  const path = ref.path || '';
  await fetchApi(`/firestore/documents/${path}`, { method: 'DELETE' });
}

export function onSnapshot(
  q: { _type?: string; path?: string; constraints?: unknown[] },
  onNext: (snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void,
  onError?: (err: Error) => void
) {
  let active = true;
  const poll = async () => {
    while (active) {
      try {
        const path = q.path || '';
        const constraints = (q.constraints || []) as Array<Record<string, unknown>>;
        const data = await fetchApi<{ docs: Array<{ id: string; data: Record<string, unknown> }> }>('/firestore/query', {
          method: 'POST',
          body: JSON.stringify({ path, constraints })
        });
        const docs = (data?.docs || []).map((d) => ({
          id: d.id,
          data: () => d.data as Record<string, unknown>
        }));
        onNext({ docs });
      } catch (err) {
        onError?.(err as Error);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  };
  poll();
  return () => {
    active = false;
  };
}

export function arrayUnion(...elements: unknown[]) {
  return elements;
}

export function arrayRemove(...elements: unknown[]) {
  return elements;
}

export function writeBatch(_db: unknown) {
  return {
    set: () => {},
    update: () => {},
    delete: () => {},
    commit: async () => {}
  };
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export function ref(_storage: unknown, path: string) {
  return { _path: path } as { _path: string; _url?: string };
}

export async function uploadBytes(
  storageRef: { _path?: string; _url?: string },
  file: File | Blob
): Promise<{ ref: { _path: string; _url?: string } }> {
  const path = (storageRef as { _path?: string })._path || 'uploads/file';
  const form = new FormData();
  form.append('file', file);
  form.append('path', path);
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/storage/upload`, {
    method: 'POST',
    headers,
    body: form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  (storageRef as { _url?: string })._url = data.url;
  return { ref: { _path: data.path || path, _url: data.url } };
}

export async function getDownloadURL(storageRef: { _path?: string; _url?: string }): Promise<string> {
  if (storageRef._url) return storageRef._url;
  return `${API_BASE.replace('/api', '')}/storage/files/${storageRef._path || 'unknown'}`;
}

// ---------------------------------------------------------------------------
// Linked inventory (XDF – XDIGIX-FULFILLMENT)
// ---------------------------------------------------------------------------

export type LinkedInventoryProduct = {
  id: string;
  name?: string;
  sku?: string;
  barcode?: string;
  warehouse?: string;
  stock?: Record<string, number>;
  sizeBarcodes?: Record<string, string>;
  availableStock?: number;
  [key: string]: unknown;
};

export type LinkedInventoryResponse = {
  name: string;
  products: LinkedInventoryProduct[];
};

function getClientIdParam(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('business') || '';
}

export async function fetchLinkedInventory(): Promise<LinkedInventoryResponse> {
  const cid = getClientIdParam();
  const qs = cid ? `?clientId=${encodeURIComponent(cid)}` : '';
  return fetchApi<LinkedInventoryResponse>(`/client/warehouse/linked-inventory${qs}`);
}

export type FulfillmentStatusResponse = { subscribed: boolean };

export async function fetchFulfillmentStatus(): Promise<FulfillmentStatusResponse> {
  const cid = getClientIdParam();
  const qs = cid ? `?clientId=${encodeURIComponent(cid)}` : '';
  return fetchApi<FulfillmentStatusResponse>(`/client/warehouse/fulfillment-status${qs}`);
}

export type UpdateLinkedProductImagePricingPayload = {
  images?: string[];
  price?: number;
  sellingPrice?: number;
};

export async function updateLinkedProductImagePricing(
  productId: string,
  payload: UpdateLinkedProductImagePricingPayload
): Promise<void> {
  const cid = getClientIdParam();
  const qs = cid ? `?clientId=${encodeURIComponent(cid)}` : '';
  await fetchApi(`/client/warehouse/products/${encodeURIComponent(productId)}${qs}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}
