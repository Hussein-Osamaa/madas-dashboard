/**
 * Firebase Compatibility Adapter
 * Mirrors Firebase API but calls our Node.js + MongoDB backend.
 * Enable with VITE_API_BACKEND_URL=http://localhost:4000/api
 */

const API_BASE = import.meta.env.VITE_API_BACKEND_URL || 'http://localhost:4000/api';

let accessToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('backend_access_token') : null;
let refreshToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('backend_refresh_token') : null;
const authListeners: Array<(user: BackendUser | null) => void> = [];

export interface BackendUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  emailVerified: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: Record<string, unknown> }>;
}

function persistTokens(acc: string, ref: string) {
  accessToken = acc;
  refreshToken = ref;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('backend_access_token', acc);
    localStorage.setItem('backend_refresh_token', ref);
  }
}

function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('backend_access_token');
    localStorage.removeItem('backend_refresh_token');
  }
}

async function getToken(): Promise<string | null> {
  if (accessToken) return accessToken;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const data = await res.json();
    if (data.accessToken) {
      accessToken = data.accessToken;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('backend_access_token', data.accessToken);
      }
      return data.accessToken;
    }
  } catch {
    clearTokens();
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
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json as T;
}

let currentUser: BackendUser | null = null;

async function initAuth() {
  if (!accessToken) {
    currentUser = null;
    authListeners.forEach((cb) => cb(null));
    return;
  }
  try {
    const data = await fetchApi<{ user: { uid: string; email: string; claims?: Record<string, unknown> } }>('/auth/me');
    if (data?.user) {
      const baseUser = {
        uid: data.user.uid,
        email: data.user.email || null,
        displayName: null,
        emailVerified: true,
        getIdToken: async () => (await getToken()) || '',
        getIdTokenResult: async () => {
          const token = await getToken();
          if (!token) return { claims: data.user.claims || {} };
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return { claims: payload };
          } catch {
            return { claims: data.user.claims || {} };
          }
        }
      };
      currentUser = baseUser;
      authListeners.forEach((cb) => cb(currentUser));
    } else {
      currentUser = null;
      authListeners.forEach((cb) => cb(null));
    }
  } catch {
    currentUser = null;
    clearTokens();
    authListeners.forEach((cb) => cb(null));
  }
}

initAuth();

/** Placeholder - backend ignores db, path comes from doc/collection args */
export const db = {};

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
    authListeners.forEach((cb) => cb(null));
  },
  onAuthStateChanged: (cb: (user: BackendUser | null) => void) => {
    authListeners.push(cb);
    cb(currentUser);
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
    user: { uid: string; email: string };
    accessToken: string;
    refreshToken: string;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password })
  });
  persistTokens(data.accessToken, data.refreshToken);
  const baseUser = {
    uid: data.user.uid,
    email: data.user.email || null,
    displayName: null,
    emailVerified: true,
    getIdToken: async () => (await getToken()) || '',
    getIdTokenResult: async () => {
      const token = await getToken();
      if (!token) return { claims: {} };
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return { claims: payload };
      } catch {
        return { claims: {} };
      }
    }
  };
  currentUser = baseUser;
  authListeners.forEach((cb) => cb(currentUser));
  return { user: currentUser };
}

export async function signOut(_auth: typeof auth) {
  await auth.signOut();
}

export function onAuthStateChanged(_auth: typeof auth, cb: (user: BackendUser | null) => void) {
  return auth.onAuthStateChanged(cb);
}

/** No-op for backend - tokens are always persisted in localStorage */
export async function setPersistence() {
  return Promise.resolve();
}

/** Placeholder for backend - not used when setPersistence is no-op */
export const browserLocalPersistence = {};

function buildPath(...segments: string[]): string {
  return segments.filter(Boolean).join('/');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function wrapDateFields(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string' && ISO_DATE.test(obj)) return { toDate: () => new Date(obj) };
  if (Array.isArray(obj)) return obj.map(wrapDateFields);
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = wrapDateFields(v);
    return out;
  }
  return obj;
}

export function doc(first: unknown, ...pathSegments: string[]) {
  if (
    first &&
    typeof first === 'object' &&
    'path' in first &&
    (first as { _type?: string })._type === 'collection' &&
    pathSegments.length === 0
  ) {
    const collPath = (first as { path: string }).path;
    const id = generateId();
    return { _type: 'doc', path: `${collPath}/${id}`, id };
  }
  const path = buildPath(...pathSegments);
  return { _type: 'doc', path, id: path.split('/').pop() || '' };
}

export function collection(_db: unknown, ...pathSegments: string[]) {
  return { _type: 'collection', path: buildPath(...pathSegments) };
}

export function serverTimestamp() {
  return new Date();
}

export const Timestamp = {
  fromDate: (d: Date) => d,
  now: () => new Date(),
  fromMillis: (ms: number) => new Date(ms)
};

export function query(
  collRef: { _type: string; path: string },
  ...constraints: Array<{ type: string; field?: string; op?: string; value?: unknown; direction?: string; limit?: number }>
) {
  const whereClauses = constraints.filter((c) => c.type === 'where');
  const orderByClause = constraints.find((c) => c.type === 'orderBy');
  const limitClause = constraints.find((c) => c.type === 'limit');
  return {
    _type: 'query',
    path: collRef.path,
    constraints: [
      ...whereClauses.map((w) => ({
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

export async function getDoc(ref: { _type?: string; path?: string }) {
  const path = ref.path || '';
  const raw = await fetchApi<{ id: string; data: Record<string, unknown> }>(`/firestore/documents/${path}`);
  return {
    exists: () => !!raw,
    id: raw?.id || '',
    data: () => wrapDateFields(raw?.data || {}) as Record<string, unknown>
  };
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
    data: () => wrapDateFields(d.data || {}) as Record<string, unknown>
  }));
  return { docs, size: docs.length, empty: docs.length === 0 };
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
