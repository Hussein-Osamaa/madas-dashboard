/**
 * Socket.io client for live warehouse updates (products, orders, transactions, warehouses).
 * Staff see changes from other staff instantly.
 * Set VITE_WAREHOUSE_SOCKET_ENABLED=true to force-enable (e.g. when backend is on Railway).
 * Disabled when backend host is vercel.app or VITE_WAREHOUSE_SOCKET_ENABLED=false.
 */
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

function getSocketBase(): string {
  const env = import.meta.env.VITE_API_BACKEND_URL;
  if (typeof env === 'string' && env.trim()) {
    let base = env.trim().replace(/\/api\/?$/, '').replace(/\/$/, '') || '';
    if (!base) return 'http://localhost:4000';
    if (!base.startsWith('http://') && !base.startsWith('https://')) base = `https://${base}`;
    return base;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'https:';
    return `${protocol}//${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
}

function isBackendVercel(): boolean {
  try {
    const base = getSocketBase();
    const url = new URL(base);
    return url.hostname.endsWith('.vercel.app') || url.hostname === 'vercel.app';
  } catch {
    return false;
  }
}

/** Warehouse live updates. Force-enable with VITE_WAREHOUSE_SOCKET_ENABLED=true when backend is on Railway. */
export function isWarehouseSocketDisabled(): boolean {
  const explicit = import.meta.env.VITE_WAREHOUSE_SOCKET_ENABLED;
  if (typeof explicit === 'string' && (explicit === 'true' || explicit === '1')) return false;
  if (typeof explicit === 'string' && (explicit === 'false' || explicit === '0')) return true;
  return isBackendVercel();
}

export type WarehouseUpdatePayload = { type: 'products' | 'orders' | 'transactions' | 'warehouses' | 'reports'; clientId?: string; businessId?: string };

let socket: Socket | null = null;
let clientRoom: string | null = null;
const listeners = new Set<(payload: WarehouseUpdatePayload) => void>();
const connectionListeners = new Set<(connected: boolean) => void>();
const onConnectListeners = new Set<() => void>();

function notifyConnectionState(connected: boolean) {
  connectionListeners.forEach((cb) => {
    try {
      cb(connected);
    } catch (e) {
      console.warn('warehouseSocket connection listener error', e);
    }
  });
}

/** Subscribe to connection state (true = connected). Returns unsubscribe. */
export function subscribeWarehouseConnectionState(cb: (connected: boolean) => void): () => void {
  connectionListeners.add(cb);
  cb(!!socket?.connected);
  return () => connectionListeners.delete(cb);
}

/** Subscribe to socket connect (and reconnect). Call refetch so data is in sync. Returns unsubscribe. */
export function subscribeWarehouseOnConnect(cb: () => void): () => void {
  onConnectListeners.add(cb);
  if (socket?.connected) {
    try { cb(); } catch (e) { console.warn('warehouseSocket onConnect error', e); }
  }
  return () => onConnectListeners.delete(cb);
}

const isDev = typeof import.meta.env.DEV !== 'undefined' && import.meta.env.DEV;

function ensureSocket(): Socket | null {
  if (isWarehouseSocketDisabled()) {
    if (isDev) console.log('[warehouseSocket] Disabled (Vercel or VITE_WAREHOUSE_SOCKET_ENABLED=false). Set VITE_WAREHOUSE_SOCKET_ENABLED=true if backend is on Railway.');
    return null;
  }
  const token = getAccessToken();
  if (!token) {
    if (isDev) console.log('[warehouseSocket] No token, skip connect');
    return null;
  }
  if (socket?.connected) return socket;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  const base = getSocketBase();
  if (isDev) console.log('[warehouseSocket] Connecting to', base);
  socket = io(base, {
    path: '/socket.io',
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 10000,
    transports: ['websocket', 'polling'],
  });
  socket.on('connect', () => {
    socket?.emit('subscribe', 'warehouse:staff');
    if (clientRoom) socket?.emit('subscribe', clientRoom);
    notifyConnectionState(true);
    onConnectListeners.forEach((cb) => {
      try { cb(); } catch (e) { console.warn('warehouseSocket onConnect error', e); }
    });
    if (isDev) console.log('[warehouseSocket] Connected, subscribed to warehouse:staff', clientRoom ? `+ ${clientRoom}` : '');
  });
  socket.on('warehouse:updated', (payload: WarehouseUpdatePayload) => {
    if (isDev) console.log('[warehouseSocket] Event', payload);
    listeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.warn('warehouseSocket listener error', e);
      }
    });
  });
  socket.on('disconnect', (reason) => {
    notifyConnectionState(false);
    if (isDev) console.log('[warehouseSocket] Disconnected', reason);
  });
  socket.on('connect_error', (err) => {
    if (isDev) console.warn('[warehouseSocket] Connect error', err.message);
    // Let Socket.IO retry; don't clear socket so reconnection can succeed
  });
  return socket;
}

/** Subscribe to client-scoped updates (products, transactions, warehouses for this client). Call with null to unsubscribe. */
export function subscribeWarehouseClient(clientId: string | null): void {
  const s = socket;
  if (clientRoom && s?.connected) {
    s.emit('unsubscribe', clientRoom);
    clientRoom = null;
  }
  if (clientId) {
    clientRoom = `warehouse:client:${clientId}`;
    if (s?.connected) s.emit('subscribe', clientRoom);
  }
}

/** Connect and subscribe to warehouse:staff (and optionally a client). Returns unsubscribe. */
export function connectWarehouseSocket(
  clientId: string | null,
  onUpdate: (payload: WarehouseUpdatePayload) => void
): () => void {
  const s = ensureSocket();
  if (!s) return () => {};

  listeners.add(onUpdate);
  subscribeWarehouseClient(clientId);

  return () => {
    listeners.delete(onUpdate);
  };
}

/** Call when the selected client changes so the socket joins the right room. */
export function setWarehouseClient(clientId: string | null): void {
  if (!socket?.connected) {
    clientRoom = clientId ? `warehouse:client:${clientId}` : null;
    return;
  }
  if (clientRoom) {
    socket.emit('unsubscribe', clientRoom);
    clientRoom = null;
  }
  if (clientId) {
    clientRoom = `warehouse:client:${clientId}`;
    socket.emit('subscribe', clientRoom);
  }
}

