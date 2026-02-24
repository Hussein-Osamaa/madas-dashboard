/**
 * Socket.io client for live audit updates (scan_update, audit_closed).
 * Reconnects on disconnect so workers stay in sync.
 * Disabled when backend is on Vercel (serverless does not support WebSockets) or via VITE_AUDIT_SOCKET_ENABLED=false.
 */
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

function getSocketBase(): string {
  const env = import.meta.env.VITE_API_BACKEND_URL;
  if (typeof env === 'string' && env.trim()) return env.replace(/\/api\/?$/, '').replace(/\/$/, '') || 'http://localhost:4000';
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'https:';
    return `${protocol}//${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
}
const SOCKET_BASE = getSocketBase();

/** Socket.IO is not supported on Vercel serverless; avoid connection attempts and 400 errors. */
export function isAuditSocketDisabled(): boolean {
  const explicit = import.meta.env.VITE_AUDIT_SOCKET_ENABLED;
  if (typeof explicit === 'string' && (explicit === 'false' || explicit === '0')) return true;
  try {
    const url = new URL(SOCKET_BASE);
    if (url.hostname.endsWith('.vercel.app') || url.hostname === 'vercel.app') return true;
  } catch {
    // ignore
  }
  return false;
}

export interface ScanUpdatePayload {
  totalScans: number;
  workerScanCounts: Record<string, number>;
  lastScanned: { productId: string; barcode: string; workerId: string; scannedAt: string; productName?: string; productSku?: string } | null;
  recentScans: Array<{ productId: string; barcode: string; workerId: string; scannedAt: string; productName?: string; productSku?: string }>;
}

export interface AuditClosedPayload {
  sessionId: string;
  reason?: string;
  adjustments?: unknown[];
}

let socket: Socket | null = null;
let subscribedRoom: string | null = null;

export function connectAuditSocket(
  sessionId: string | null,
  callbacks: {
    onScanUpdate?: (data: ScanUpdatePayload) => void;
    onAuditClosed?: (data: AuditClosedPayload) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
  }
): () => void {
  if (!sessionId) {
    if (socket && subscribedRoom) {
      socket.emit('unsubscribe', subscribedRoom);
      subscribedRoom = null;
    }
    return () => {};
  }

  if (isAuditSocketDisabled()) {
    return () => {};
  }

  const token = getAccessToken();
  if (!token) {
    return () => {};
  }

  if (!socket || !socket.connected) {
    socket = io(SOCKET_BASE, {
      path: '/socket.io',
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      callbacks.onConnect?.();
      if (subscribedRoom) {
        socket?.emit('subscribe', subscribedRoom);
      }
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

  const room = `audit:${sessionId}`;
  if (subscribedRoom && subscribedRoom !== room) {
    socket.emit('unsubscribe', subscribedRoom);
  }
  subscribedRoom = room;
  socket.emit('subscribe', room);

  const onScanUpdate = (data: ScanUpdatePayload) => callbacks.onScanUpdate?.(data);
  const onAuditClosed = (data: AuditClosedPayload) => callbacks.onAuditClosed?.(data);

  socket.on('scan_update', onScanUpdate);
  socket.on('audit_closed', onAuditClosed);

  return () => {
    socket?.off('scan_update', onScanUpdate);
    socket?.off('audit_closed', onAuditClosed);
  };
}

export function disconnectAuditSocket(): void {
  if (socket && subscribedRoom) {
    socket.emit('unsubscribe', subscribedRoom);
    subscribedRoom = null;
  }
}
