/**
 * Socket.io client for live warehouse updates (products, orders, transactions, warehouses).
 * Staff see changes from other staff instantly. Disabled when backend is on Vercel or VITE_AUDIT_SOCKET_ENABLED=false.
 */
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';
import { isAuditSocketDisabled } from './auditSocket';

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

export type WarehouseUpdatePayload = { type: 'products' | 'orders' | 'transactions' | 'warehouses' | 'reports'; clientId?: string };

let socket: Socket | null = null;
let clientRoom: string | null = null;
const listeners = new Set<(payload: WarehouseUpdatePayload) => void>();

function ensureSocket(): Socket | null {
  if (isAuditSocketDisabled()) return null;
  const token = getAccessToken();
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
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 8000,
  });
  socket.on('connect', () => {
    socket?.emit('subscribe', 'warehouse:staff');
    if (clientRoom) socket?.emit('subscribe', clientRoom);
  });
  socket.on('warehouse:updated', (payload: WarehouseUpdatePayload) => {
    listeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.warn('warehouseSocket listener error', e);
      }
    });
  });
  socket.on('disconnect', () => {});
  socket.on('connect_error', () => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    clientRoom = null;
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

export function isWarehouseSocketDisabled(): boolean {
  return isAuditSocketDisabled();
}
