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

export function setupRealtime(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
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

    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
    }
    if (businessId) {
      socket.join(`business:${businessId}`);
    }
    if (accountType === 'STAFF') {
      socket.join('warehouse:staff');
    }

    socket.on('subscribe', (channel: string) => {
      socket.join(channel);
    });

    socket.on('unsubscribe', (channel: string) => {
      socket.leave(channel);
    });

    socket.on('disconnect', () => {
      // cleanup if needed
    });
  });

  return io;
}

/** Payload for warehouse live updates. type = scope of change; clientId = which client; businessId = which business (for merchant dashboard). */
export type WarehouseUpdatePayload = {
  type: 'products' | 'orders' | 'transactions' | 'warehouses' | 'reports';
  clientId?: string;
  businessId?: string;
};

/** Emit so staff (fulfillment) and merchants (dashboard) see changes in realtime. */
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
