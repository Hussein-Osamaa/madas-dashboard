/**
 * Socket.io client for live restock session updates.
 * Multiple warehouse staff can join the same session and scan simultaneously.
 * Follows the same pattern as auditSocket.ts.
 */
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

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
const SOCKET_BASE = getSocketBase();

export function isRestockSocketDisabled(): boolean {
  const explicit = import.meta.env.VITE_WAREHOUSE_SOCKET_ENABLED;
  if (typeof explicit === 'string' && (explicit === 'true' || explicit === '1')) return false;
  if (typeof explicit === 'string' && (explicit === 'false' || explicit === '0')) return true;
  try {
    const url = new URL(SOCKET_BASE);
    if (url.hostname.endsWith('.vercel.app') || url.hostname === 'vercel.app') return true;
  } catch {
    // ignore
  }
  return false;
}

export interface RestockScanUpdatePayload {
  totalScans: number;
  workerScanCounts: Record<string, number>;
  lastScanned: {
    productId: string;
    barcode: string;
    workerId: string;
    scannedAt: string;
    productName?: string;
    size?: string;
  } | null;
  recentScans: Array<{
    productId: string;
    barcode: string;
    workerId: string;
    scannedAt: string;
    productName?: string;
    size?: string;
    count?: number;
  }>;
  /** Full entries map for merging (sent periodically or on request) */
  entries?: Array<{
    productId: string;
    productName: string;
    size: string;
    barcode: string;
    count: number;
  }>;
}

export interface RestockClosedPayload {
  sessionId: string;
  reason?: string;
}

let socket: Socket | null = null;
let subscribedRoom: string | null = null;

export function connectRestockSocket(
  sessionId: string | null,
  callbacks: {
    onScanUpdate?: (data: RestockScanUpdatePayload) => void;
    onRestockClosed?: (data: RestockClosedPayload) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
  },
): () => void {
  if (!sessionId) {
    if (socket && subscribedRoom) {
      socket.emit('unsubscribe', subscribedRoom);
      subscribedRoom = null;
    }
    return () => {};
  }

  if (isRestockSocketDisabled()) {
    return () => {};
  }

  const token = getAccessToken();
  if (!token) return () => {};

  if (!socket || !socket.connected) {
    socket = io(SOCKET_BASE, {
      path: '/socket.io',
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 8000,
    });

    socket.on('connect', () => {
      callbacks.onConnect?.();
      if (subscribedRoom) socket?.emit('subscribe', subscribedRoom);
    });

    socket.on('disconnect', () => {
      callbacks.onDisconnect?.();
    });

    socket.on('connect_error', () => {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }
      subscribedRoom = null;
      callbacks.onDisconnect?.();
    });
  }

  const room = `restock:${sessionId}`;
  if (subscribedRoom && subscribedRoom !== room) {
    socket.emit('unsubscribe', subscribedRoom);
  }
  subscribedRoom = room;
  socket.emit('subscribe', room);

  const onScanUpdate = (data: RestockScanUpdatePayload) => callbacks.onScanUpdate?.(data);
  const onClosed = (data: RestockClosedPayload) => callbacks.onRestockClosed?.(data);

  socket.on('restock:scan_update', onScanUpdate);
  socket.on('restock:closed', onClosed);

  return () => {
    socket?.off('restock:scan_update', onScanUpdate);
    socket?.off('restock:closed', onClosed);
  };
}

export function disconnectRestockSocket(): void {
  if (socket && subscribedRoom) {
    socket.emit('unsubscribe', subscribedRoom);
    subscribedRoom = null;
  }
}
