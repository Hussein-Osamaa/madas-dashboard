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
  clientId?: string | null;
  active?: boolean;
  /** Staff permissions for digix-admin (admin has all) */
  permissions?: string[];
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

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasStoredToken(): boolean {
  return !!getToken();
}

export async function apiGetList<T>(path: string): Promise<T[]> {
  const res = await apiRequest<{ success: boolean; data: T[] }>(path);
  return res.data || [];
}

export async function apiGetOne<T>(path: string): Promise<T> {
  const res = await apiRequest<{ success: boolean; data: T }>(path);
  return res.data as T;
}

export type ApiClient = {
  _id: string;
  brandName: string;
  owner?: { name?: string; email?: string; phone?: string };
  contact?: { email?: string; phone?: string; address?: string };
  subscriptionPlan?: string;
  active?: boolean;
  systemAccess?: { dashboard?: boolean; finance?: boolean; fulfillment?: boolean; shipping?: boolean };
  createdAt?: string;
  updatedAt?: string;
};

export type CreateClientWithOwnerBody = {
  brandName: string;
  owner: { name?: string; email: string; phone?: string };
  password?: string;
  subscriptionPlan?: 'starter' | 'standard' | 'premium' | 'enterprise';
  systemAccess?: { dashboard?: boolean; finance?: boolean; fulfillment?: boolean; shipping?: boolean };
};

export async function createClientWithOwner(body: CreateClientWithOwnerBody): Promise<ApiClient> {
  const res = await apiRequest<{ success: boolean; data: ApiClient }>('/api/clients/with-owner', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}

export async function updateClient(id: string, body: Partial<ApiClient>): Promise<ApiClient> {
  const res = await apiRequest<{ success: boolean; data: ApiClient }>(`/api/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return res.data;
}

export type ApiUserManage = ApiUser & { permissions?: string[] };

export async function apiGetUsers(): Promise<ApiUserManage[]> {
  const res = await apiRequest<{ success: boolean; data: ApiUserManage[] }>('/api/users');
  return res.data || [];
}

export async function apiUpdateUser(id: string, body: { name?: string; phone?: string; role?: string; active?: boolean; permissions?: string[] }): Promise<ApiUserManage> {
  const res = await apiRequest<{ success: boolean; data: ApiUserManage }>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return res.data;
}

