/**
 * XDIGIX backend API client. Base URL: VITE_API_URL (e.g. http://localhost:5001)
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const TOKEN_KEY = 'xdigix_token';

export type ApiUser = {
  _id: string;
  email: string;
  name?: string;
  role: 'admin' | 'staff' | 'client';
  /** For client role: populated as { _id, brandName?, owner?, systemAccess?, subscriptionPlan? }. Otherwise may be string id. */
  clientId?: string | {
    _id: string;
    brandName?: string;
    owner?: { name?: string; email?: string };
    systemAccess?: { dashboard?: boolean; finance?: boolean; fulfillment?: boolean; shipping?: boolean };
    subscriptionPlan?: string;
  } | null;
  active?: boolean;
};

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...options.headers };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { message?: string }).message || res.statusText || 'Request failed');
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

export async function login(email: string, password: string): Promise<{ token: string; user: ApiUser }> {
  const data = await apiRequest<{ token: string; user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function getMe(): Promise<{ success: boolean; user: ApiUser }> {
  return apiRequest<{ success: boolean; user: ApiUser }>('/api/auth/me');
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string; resetUrl?: string }> {
  return apiRequest<{ success: boolean; message: string; resetUrl?: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasStoredToken(): boolean {
  return !!getToken();
}

/** Build path with optional query params (for multi-tenant: pass clientId for admin/staff scoping). */
export function buildListPath(path: string, params?: { clientId?: string; [key: string]: string | undefined }): string {
  if (!params || Object.keys(params).length === 0) return path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') search.set(k, v); });
  const q = search.toString();
  return q ? `${path}${path.includes('?') ? '&' : '?'}${q}` : path;
}

export async function apiGetList<T>(path: string, params?: { clientId?: string; [key: string]: string | undefined }): Promise<T[]> {
  const url = buildListPath(path, params);
  const res = await apiRequest<{ success: boolean; data: T[] }>(url);
  return res.data || [];
}

/** Use for endpoints that return { data, total } (e.g. scan-logs). */
export async function apiGetListWithTotal<T>(
  path: string,
  params?: { clientId?: string; [key: string]: string | undefined }
): Promise<{ data: T[]; total: number }> {
  const url = buildListPath(path, params);
  const res = await apiRequest<{ success: boolean; data: T[]; total?: number }>(url);
  return { data: res.data || [], total: res.total ?? (res.data?.length ?? 0) };
}

export async function apiGetOne<T>(path: string): Promise<T> {
  const res = await apiRequest<{ success: boolean; data: T }>(path);
  return res.data as T;
}
