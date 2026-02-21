import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../services/auth.service';
import { verifyToken } from '../services/central-auth.service';

let ioInstance: Server | null = null;

export function getIo(): Server | null {
  return ioInstance;
}

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
      (socket as Socket & { userId?: string; tenantId?: string; businessId?: string }).userId = central.userId;
      (socket as Socket & { userId?: string; tenantId?: string; businessId?: string }).tenantId = central.tenantId || undefined;
      (socket as Socket & { userId?: string; tenantId?: string; businessId?: string }).businessId = central.businessId || undefined;
      next();
      return;
    }
    const payload = verifyAccessToken(str);
    if (!payload) {
      next(new Error('Invalid or expired token'));
      return;
    }
    (socket as Socket & { userId?: string; tenantId?: string; businessId?: string }).userId = payload.uid;
    (socket as Socket & { userId?: string; tenantId?: string; businessId?: string }).tenantId = payload.tenantId || undefined;
    (socket as Socket & { userId?: string; tenantId?: string; businessId?: string }).businessId = payload.businessId || undefined;
    next();
  });

  io.on('connection', (socket) => {
    const s = socket as Socket & { userId?: string; tenantId?: string; businessId?: string };
    const tenantId = s.tenantId;
    const businessId = s.businessId;

    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
    }
    if (businessId) {
      socket.join(`business:${businessId}`);
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

export function emitRealtime(
  io: Server,
  event: string,
  room: string | string[],
  data: Record<string, unknown>
): void {
  io.to(room).emit(event, data);
}
