/**
 * Zammit Integration API Service
 * Communicates with the backend Zammit routes (/api/zammit/*).
 */

// ── Types ───────────────────────────────────────────────────────

export interface ZammitConfig {
  configured: boolean;
  zammitEmail?: string;
  enabled?: boolean;
  syncIntervalMinutes?: number;
  lastSyncAt?: string | null;
  lastSyncStatus?: string;
  lastSyncError?: string;
  lastSyncOrderCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZammitSyncStatus {
  configured: boolean;
  enabled?: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: string;
  lastSyncError?: string;
  lastSyncOrderCount?: number;
}

export interface ZammitSyncLogEntry {
  timestamp: string;
  status: 'success' | 'error';
  orderCount: number;
  error?: string;
  durationMs?: number;
}

export interface ZammitSyncResult {
  success: boolean;
  newOrdersCount: number;
  skippedCount: number;
  errors: string[];
  durationMs: number;
}

export interface ZammitTestResult {
  success: boolean;
  error?: string;
}

// ── API Base ────────────────────────────────────────────────────

function getApiBase(): string {
  const env = import.meta.env.VITE_API_BACKEND_URL;
  if (typeof env === 'string' && env.trim()) {
    const raw = env.trim().replace(/\/$/, '');
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const origin = raw.replace(/\/api.*$/, '');
      return origin ? `${origin}/api` : raw;
    }
    return `https://${raw}/api`;
  }
  return 'https://xdigix-os-production.up.railway.app/api';
}

const API_BASE = getApiBase();

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('backend_access_token')
      : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiRequest<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...getAuthHeaders(), ...(opts.headers as Record<string, string>) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { error?: string }).error || `HTTP ${res.status}`
    );
  }
  return json as T;
}

// ── Config Endpoints ────────────────────────────────────────────

export async function getZammitConfig(): Promise<ZammitConfig> {
  return apiRequest<ZammitConfig>('/zammit/config');
}

export async function saveZammitConfig(data: {
  zammitEmail: string;
  zammitPassword: string;
  syncIntervalMinutes?: number;
  enabled?: boolean;
}): Promise<{ success: boolean; message: string }> {
  return apiRequest('/zammit/config', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteZammitConfig(): Promise<{ success: boolean }> {
  return apiRequest('/zammit/config', { method: 'DELETE' });
}

export async function toggleZammitEnabled(
  enabled: boolean
): Promise<{ success: boolean; enabled: boolean }> {
  return apiRequest('/zammit/config/toggle', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

// ── Test & Sync Endpoints ───────────────────────────────────────

export async function testZammitConnection(
  email: string,
  password: string
): Promise<ZammitTestResult> {
  return apiRequest('/zammit/config/test', {
    method: 'POST',
    body: JSON.stringify({ zammitEmail: email, zammitPassword: password }),
  });
}

export async function triggerZammitSync(): Promise<ZammitSyncResult> {
  return apiRequest('/zammit/sync/trigger', { method: 'POST' });
}

export async function resetZammitSync(): Promise<{ success: boolean; message: string }> {
  return apiRequest('/zammit/sync/reset', { method: 'POST' });
}

export async function getZammitSyncStatus(): Promise<ZammitSyncStatus> {
  return apiRequest('/zammit/sync/status');
}

export async function getZammitSyncLogs(): Promise<{
  logs: ZammitSyncLogEntry[];
}> {
  return apiRequest('/zammit/sync/logs');
}
