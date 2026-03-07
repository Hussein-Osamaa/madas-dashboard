import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://xdigix-os-production.up.railway.app/api';

let accessToken: string | null = null;
let refreshToken: string | null = null;

async function loadTokens() {
  accessToken = await SecureStore.getItemAsync('access_token');
  refreshToken = await SecureStore.getItemAsync('refresh_token');
}

async function persistTokens(acc: string, ref: string) {
  accessToken = acc;
  refreshToken = ref;
  await SecureStore.setItemAsync('access_token', acc);
  await SecureStore.setItemAsync('refresh_token', ref);
}

async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
}

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
  if (!accessToken && !refreshToken) {
    await loadTokens();
  }
  if (accessToken && !isTokenExpired(accessToken)) return accessToken;
  if (accessToken && isTokenExpired(accessToken)) accessToken = null;
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (data.accessToken) {
      await persistTokens(data.accessToken, refreshToken ?? '');
      return data.accessToken;
    }
  } catch {
    await clearTokens();
  }
  return null;
}

export async function fetchApi<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  let json = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    accessToken = null;
    const newToken = await getToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
      json = await res.json().catch(() => ({}));
    } else {
      await clearTokens();
      throw new Error('Session expired');
    }
  }

  if (!res.ok) throw new Error((json as { error?: string })?.error || `HTTP ${res.status}`);
  return json as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(email: string, password: string) {
  const data = await fetchApi<{
    user: { uid: string; email: string; displayName?: string };
    accessToken: string;
    refreshToken: string;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  await persistTokens(data.accessToken, data.refreshToken);
  return data.user;
}

export async function getMe() {
  const token = await getToken();
  if (!token) return null;
  try {
    const data = await fetchApi<{ user: { uid: string; email: string; type?: string } }>('/auth/me');
    return data?.user || null;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    const token = await getToken();
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {}
  await clearTokens();
}

export function isLoggedIn(): boolean {
  return !!accessToken || !!refreshToken;
}

export async function checkAuth(): Promise<boolean> {
  await loadTokens();
  return !!accessToken || !!refreshToken;
}

// ---------------------------------------------------------------------------
// Firestore-compatible helpers
// ---------------------------------------------------------------------------

export async function firestoreGet<T>(path: string): Promise<T | null> {
  try {
    const data = await fetchApi<{ id: string; data: T }>(`/firestore/documents/${path}`);
    if (!data?.id) return null;
    return data.data;
  } catch {
    return null;
  }
}

export async function firestoreQuery<T>(
  path: string,
  constraints: Array<Record<string, unknown>> = []
): Promise<Array<{ id: string; data: T }>> {
  const data = await fetchApi<{ docs: Array<{ id: string; data: T }> }>('/firestore/query', {
    method: 'POST',
    body: JSON.stringify({ path, constraints }),
  });
  return data?.docs || [];
}

export async function firestoreAdd(path: string, data: Record<string, unknown>): Promise<string> {
  const result = await fetchApi<{ id: string }>(`/firestore/add/${path.replace(/^\//, '')}`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
  return result.id;
}

export async function firestoreUpdate(path: string, data: Record<string, unknown>): Promise<void> {
  await fetchApi(`/firestore/documents/${path}`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  });
}

export async function firestoreDelete(path: string): Promise<void> {
  await fetchApi(`/firestore/documents/${path}`, { method: 'DELETE' });
}
