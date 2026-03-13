/**
 * Socket.IO client for the dashboard.
 * Connects with the client's JWT and auto-joins `business:{businessId}`.
 * Listens for `warehouse:updated` events so linked inventory stays in sync.
 */
import { io, Socket } from 'socket.io-client';

const DEFAULT_SOCKET_BASE = 'https://xdigix-os-production.up.railway.app';

function getSocketBase(): string {
  const env = import.meta.env.VITE_API_BACKEND_URL;
  if (typeof env === 'string' && env.trim()) {
    let base = env.trim().replace(/\/api\/?$/, '').replace(/\/$/, '') || '';
    if (!base) return DEFAULT_SOCKET_BASE;
    if (!base.startsWith('http://') && !base.startsWith('https://')) base = `https://${base}`;
    return base;
  }
  return DEFAULT_SOCKET_BASE;
}

function isSocketDisabled(): boolean {
  try {
    const base = getSocketBase();
    const url = new URL(base);
    return url.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

export type WarehouseUpdatePayload = {
  type: 'products' | 'orders' | 'transactions' | 'warehouses' | 'reports';
  clientId?: string;
  businessId?: string;
};

let socket: Socket | null = null;
const listeners = new Set<(payload: WarehouseUpdatePayload) => void>();

function getStoredToken(): string | null {
  return typeof localStorage !== 'undefined'
    ? localStorage.getItem('backend_access_token')
    : null;
}

function ensureSocket(): Socket | null {
  if (isSocketDisabled()) return null;
  const token = getStoredToken();
  if (!token) return null;
  if (socket?.connected) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const base = getSocketBase();
  socket = io(base, {
    path: '/socket.io',
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[dashboardSocket] Connected');
  });

  socket.on('warehouse:updated', (payload: WarehouseUpdatePayload) => {
    listeners.forEach((cb) => {
      try { cb(payload); } catch { /* listener error */ }
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('[dashboardSocket] Disconnected:', reason);
  });

  return socket;
}

/**
 * Subscribe to warehouse update events. Connects the socket if needed.
 * Returns an unsubscribe function.
 */
export function onWarehouseUpdate(cb: (payload: WarehouseUpdatePayload) => void): () => void {
  listeners.add(cb);
  ensureSocket();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && socket) {
      socket.disconnect();
      socket = null;
    }
  };
}

/** Disconnect the socket (e.g. on logout). */
export function disconnectDashboardSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
}
