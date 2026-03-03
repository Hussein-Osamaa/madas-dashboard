/**
 * Assign a unique requestId to each request for structured logging and tracing.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

const HEADER_REQUEST_ID = 'x-request-id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[HEADER_REQUEST_ID];
  const requestId = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader(HEADER_REQUEST_ID, requestId);
  next();
}
