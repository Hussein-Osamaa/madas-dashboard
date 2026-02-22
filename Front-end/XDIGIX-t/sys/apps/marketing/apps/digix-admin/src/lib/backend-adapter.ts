/**
 * Firebase Compatibility Adapter
 * Enable with VITE_API_BACKEND_URL=http://localhost:4000/api
 */
const _envApi = import.meta.env.VITE_API_BACKEND_URL;
const API_BASE = (typeof _envApi === 'string' && _envApi.trim()) ? _envApi.replace(/\/$/, '') : 'http://localhost:4000/api';

let accessToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('backend_access_token') : null;
let refreshToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('backend_refresh_token') : null;
let accountType: 'CLIENT' | 'ADMIN' | 'STAFF' = 'CLIENT';
const authListeners: Array<(user: BackendUser | null) => void> = [];

export interface BackendUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  emailVerified: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

function persistTokens(acc: string, ref: string, type: 'CLIENT' | 'ADMIN' | 'STAFF' = 'CLIENT') {
  accessToken = acc;
  refreshToken = ref;
  accountType = type;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('backend_access_token', acc);
    localStorage.setItem('backend_refresh_token', ref);
    localStorage.setItem('backend_account_type', type);
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

async function getToken(): Promise<string | null> {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('backend_account_type')) {
    accountType = localStorage.getItem('backend_account_type') as 'CLIENT' | 'ADMIN' | 'STAFF' || 'CLIENT';
  }
  if (accessToken) return accessToken;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken, accountType: accountType || 'CLIENT' })
    });
    const data = await res.json();
    if (data.accessToken) {
      persistTokens(data.accessToken, refreshToken ?? '', accountType);
      return data.accessToken;
    }
  } catch {
    clearTokens();
  }
  return null;
}

async function fetchApi<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  let json = await res.json().catch(() => ({}));
  if (res.status === 429) {
    const retryAfter = Math.min(parseInt(res.headers.get('Retry-After') || '2', 10), 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    json = await res.json().catch(() => ({}));
  }
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json as T;
}

let currentUser: BackendUser | null = null;

async function initAuth() {
  if (!accessToken) { currentUser = null; authListeners.forEach((cb) => cb(null)); return; }
  try {
    const data = await fetchApi<{ user: { uid: string; email: string } }>('/auth/me');
    if (data?.user) {
      currentUser = { uid: data.user.uid, email: data.user.email || null, displayName: null, emailVerified: true, getIdToken: async () => (await getToken()) || '' };
      authListeners.forEach((cb) => cb(currentUser));
    } else { currentUser = null; authListeners.forEach((cb) => cb(null)); }
  } catch {
    currentUser = null;
    clearTokens();
    authListeners.forEach((cb) => cb(null));
  }
}
initAuth();

export const auth = {
  get currentUser() { return currentUser; },
  signOut: async () => {
    try { const token = await getToken(); if (token) await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); } catch {}
    clearTokens();
    currentUser = null;
    authListeners.forEach((cb) => cb(null));
  },
  onAuthStateChanged: (cb: (user: BackendUser | null) => void) => {
    authListeners.push(cb);
    cb(currentUser);
    return () => { const i = authListeners.indexOf(cb); if (i >= 0) authListeners.splice(i, 1); };
  }
};

export async function signInWithEmailAndPassword(_auth: typeof auth, email: string, password: string): Promise<{ user: BackendUser }> {
  const data = await fetchApi<{ user: { uid: string; email: string }; accessToken: string; refreshToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
  persistTokens(data.accessToken, data.refreshToken, 'CLIENT');
  currentUser = { uid: data.user.uid, email: data.user.email || null, displayName: null, emailVerified: true, getIdToken: async () => (await getToken()) || '' };
  authListeners.forEach((cb) => cb(currentUser));
  return { user: currentUser! };
}

/** Admin login (MongoDB AdminUser) - for digix-admin super admin access */
export async function signInAdmin(email: string, password: string): Promise<{ user: BackendUser }> {
  const res = await fetch(`${API_BASE}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  if (!data.accessToken || !data.user) throw new Error('Invalid response');
  persistTokens(data.accessToken, data.refreshToken, 'ADMIN');
  currentUser = { uid: data.user.userId || data.user.uid, email: data.user.email || null, displayName: data.user.displayName || null, emailVerified: true, getIdToken: async () => (await getToken()) || '' };
  authListeners.forEach((cb) => cb(currentUser));
  return { user: currentUser! };
}

export async function createUserWithEmailAndPassword(_auth: typeof auth, email: string, password: string): Promise<{ user: BackendUser }> {
  const data = await fetchApi<{ user: { uid: string; email: string }; accessToken: string; refreshToken: string }>('/auth/signup', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
  persistTokens(data.accessToken, data.refreshToken, 'CLIENT');
  currentUser = { uid: data.user.uid, email: data.user.email || null, displayName: null, emailVerified: false, getIdToken: async () => (await getToken()) || '' };
  authListeners.forEach((cb) => cb(currentUser));
  return { user: currentUser };
}

export function signOut(_auth: typeof auth) { return auth.signOut(); }
export function onAuthStateChanged(_auth: typeof auth, cb: (user: BackendUser | null) => void) { return auth.onAuthStateChanged(cb); }
export async function sendPasswordResetEmail() { throw new Error('Password reset not available with backend API'); }

function buildPath(...s: string[]): string { return s.filter(Boolean).join('/'); }
export function doc(_db: unknown, ...path: string[]) { return { _type: 'doc', path: buildPath(...path) }; }
export function collection(_db: unknown, ...path: string[]) { return { _type: 'collection', path: buildPath(...path) }; }
export function serverTimestamp() { return new Date(); }
export const Timestamp = { fromDate: (d: Date) => d, now: () => new Date() };

export function query(coll: { path: string }, ...constraints: Array<{ type: string; field?: string; op?: string; value?: unknown; direction?: string; limit?: number }>) {
  return { _type: 'query', path: coll.path, constraints: constraints.filter(Boolean).map((c) => (c.type === 'where' ? { ...c, op: c.op || '==' } : c)) };
}
export function where(f: string, op: string, v: unknown) { return { type: 'where', field: f, op, value: v }; }
export function orderBy(f: string, d?: 'asc' | 'desc') { return { type: 'orderBy', field: f, direction: d || 'asc' }; }
export function limit(n: number) { return { type: 'limit', limit: n }; }

export async function getDoc(ref: { path?: string }) {
  const data = await fetchApi<{ id: string; data: Record<string, unknown> }>(`/firestore/documents/${ref.path || ''}`);
  return { exists: () => !!data, id: data?.id || '', data: () => (data?.data || {}) as Record<string, unknown> };
}

export async function getDocs(q: { path?: string; constraints?: unknown[] }) {
  const data = await fetchApi<{ docs: Array<{ id: string; data: Record<string, unknown> }> }>('/firestore/query', { method: 'POST', body: JSON.stringify({ path: q.path || '', constraints: q.constraints || [] }) });
  const docs = (data?.docs || []).map((d) => ({ id: d.id, data: () => d.data as Record<string, unknown> }));
  return { docs, size: docs.length };
}

export async function setDoc(ref: { path?: string }, data: Record<string, unknown>, opts?: { merge?: boolean }) {
  await fetchApi(`/firestore/documents/${ref.path || ''}`, { method: 'POST', body: JSON.stringify({ data, merge: opts?.merge ?? false }) });
}
export async function updateDoc(ref: { path?: string }, data: Record<string, unknown>) {
  await fetchApi(`/firestore/documents/${ref.path || ''}`, { method: 'PATCH', body: JSON.stringify({ data }) });
}
export async function addDoc(coll: { path?: string }, data: Record<string, unknown>) {
  const r = await fetchApi<{ id: string }>(`/firestore/add/${(coll.path || '').replace(/^\//, '')}`, { method: 'POST', body: JSON.stringify({ data }) });
  return { id: r.id };
}
export async function deleteDoc(ref: { path?: string }) {
  await fetchApi(`/firestore/documents/${ref.path || ''}`, { method: 'DELETE' });
}

export function onSnapshot(q: { path?: string; constraints?: unknown[] }, onNext: (s: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void, onErr?: (e: Error) => void) {
  let active = true;
  const poll = async () => {
    while (active) {
      try {
        const data = await fetchApi<{ docs: Array<{ id: string; data: Record<string, unknown> }> }>('/firestore/query', { method: 'POST', body: JSON.stringify({ path: q.path || '', constraints: q.constraints || [] }) });
        onNext({ docs: (data?.docs || []).map((d) => ({ id: d.id, data: () => d.data })) });
      } catch (e) { onErr?.(e as Error); }
      await new Promise((r) => setTimeout(r, 2000));
    }
  };
  poll();
  return () => { active = false; };
}

export function arrayUnion(...e: unknown[]) { return e; }
export function arrayRemove(...e: unknown[]) { return e; }
export function writeBatch() { return { set: () => {}, update: () => {}, delete: () => {}, commit: async () => {} }; }

export function ref(_s: unknown, path: string) { return { _path: path } as { _path: string; _url?: string }; }
export async function uploadBytes(storageRef: { _path?: string }, file: File | Blob) {
  const form = new FormData();
  form.append('file', file);
  form.append('path', (storageRef as { _path?: string })._path || 'uploads/file');
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/storage/upload`, { method: 'POST', headers, body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  (storageRef as { _url?: string })._url = data.url;
  return { ref: { _path: data.path, _url: data.url } };
}
export async function getDownloadURL(storageRef: { _path?: string; _url?: string }) {
  if (storageRef._url) return storageRef._url;
  return `${API_BASE.replace('/api', '')}/storage/files/${storageRef._path || 'unknown'}`;
}
