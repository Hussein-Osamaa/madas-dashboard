import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { AccountType } from '../services/central-auth.service';
import { verifyAccessToken } from '../services/auth.service';
import { verifyToken } from '../services/central-auth.service';

let ioInstance: Server | null = null;

export function getIo(): Server | null {
  return ioInstance;
}

type SocketData = { userId?: string; tenantId?: string; businessId?: string; accountType?: AccountType };

const SOCKET_ALLOWED_ORIGINS = [
  'https://xdigix-os.vercel.app',
  'https://xdigix-os-xdigix.vercel.app',
  'https://dist-xdigix.vercel.app',
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '*'),
];

function isAllowedSocketOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (SOCKET_ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+-xdigix\.vercel\.app$/.test(origin)) return true;
  if (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    /^http:\/\/(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(origin)
  ) return true;
  return false;
}

export function setupRealtime(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (isAllowedSocketOrigin(origin)) cb(null, true);
        else cb(new Error('Socket origin not allowed'));
      },
      credentials: true,
    },
    path: '/socket.io',
  });
  ioInstance = io;

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    const str = String(token);
    const central = verifyToken(str);
    if (central) {
      const s = socket as Socket & SocketData;
      s.userId = central.userId;
      s.tenantId = central.tenantId || undefined;
      s.businessId = central.businessId || undefined;
      s.accountType = central.accountType;
      next();
      return;
    }
    const payload = verifyAccessToken(str);
    if (!payload) {
      next(new Error('Invalid or expired token'));
      return;
    }
    const s = socket as Socket & SocketData;
    s.userId = payload.uid;
    s.tenantId = payload.tenantId || undefined;
    s.businessId = payload.businessId || undefined;
    s.accountType = undefined;
    next();
  });

  io.on('connection', (socket) => {
    const s = socket as Socket & SocketData;
    const tenantId = s.tenantId;
    const businessId = s.businessId;
    const accountType = s.accountType;

    if (tenantId) socket.join(`tenant:${tenantId}`);
    if (businessId) socket.join(`business:${businessId}`);
    if (accountType === 'STAFF') socket.join('warehouse:staff');

    socket.on('subscribe', (channel: string) => {
      // Only allow subscribing to channels scoped to the user's own tenant/business
      if (
        typeof channel === 'string' &&
        (
          (tenantId && channel === `tenant:${tenantId}`) ||
          (businessId && channel === `business:${businessId}`) ||
          (businessId && channel === `warehouse:client:${businessId}`) ||
          channel === 'warehouse:staff' ||
          // Allow audit and restock session rooms (staff can join via join code)
          channel.startsWith('audit:') ||
          channel.startsWith('restock:')
        )
      ) {
        socket.join(channel);
      }
    });

    socket.on('unsubscribe', (channel: string) => {
      socket.leave(channel);
    });

    socket.on('disconnect', () => {
      // Socket.IO automatically cleans up room memberships on disconnect
    });
  });

  return io;
}

/** Payload for warehouse live updates. */
export type WarehouseUpdatePayload = {
  type: 'products' | 'orders' | 'transactions' | 'warehouses' | 'reports' | 'audit_alert';
  clientId?: string;
  businessId?: string;
};

export function emitWarehouseUpdate(io: Server | null, payload: WarehouseUpdatePayload): void {
  if (!io) return;
  io.to('warehouse:staff').emit('warehouse:updated', payload);
  if (payload.clientId) {
    io.to(`warehouse:client:${payload.clientId}`).emit('warehouse:updated', payload);
    io.to(`business:${payload.clientId}`).emit('warehouse:updated', payload);
  }
  if (payload.businessId && payload.businessId !== payload.clientId) {
    io.to(`business:${payload.businessId}`).emit('warehouse:updated', payload);
  }
}

export function emitRealtime(
  io: Server,
  event: string,
  room: string | string[],
  data: Record<string, unknown>
): void {
  io.to(room).emit(event, data);
}
