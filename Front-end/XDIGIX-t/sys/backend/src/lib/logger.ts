/**
 * Structured JSON logger.
 *
 * Replaces console.log/error with structured output that includes:
 * level, message, module, requestId, tenantId, actor, timestamp.
 *
 * In production: JSON to stdout (consumed by log aggregators).
 * In development: human-readable format.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  module?: string;
  requestId?: string;
  tenantId?: string;
  actor?: string;
  correlationId?: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info'] ?? 1;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function formatLog(level: LogLevel, message: string, context: LogContext): string {
  const entry = {
    level,
    msg: message,
    ts: new Date().toISOString(),
    ...context,
  };
  // Remove undefined values
  for (const key of Object.keys(entry)) {
    if ((entry as Record<string, unknown>)[key] === undefined) {
      delete (entry as Record<string, unknown>)[key];
    }
  }
  if (IS_PRODUCTION) {
    return JSON.stringify(entry);
  }
  // Dev: human-readable
  const { module: mod, requestId, tenantId, ...rest } = context;
  const prefix = [
    mod ? `[${mod}]` : '',
    requestId ? `req:${requestId.slice(0, 8)}` : '',
    tenantId ? `t:${tenantId.slice(0, 8)}` : '',
  ].filter(Boolean).join(' ');
  const extra = Object.keys(rest).length > 0 ? ' ' + JSON.stringify(rest) : '';
  return `${level.toUpperCase().padEnd(5)} ${prefix} ${message}${extra}`;
}

function log(level: LogLevel, message: string, context: LogContext = {}): void {
  if (LOG_LEVELS[level] < MIN_LEVEL) return;
  const formatted = formatLog(level, message, context);
  if (level === 'error') {
    process.stderr.write(formatted + '\n');
  } else {
    process.stdout.write(formatted + '\n');
  }
}

/** Create a logger scoped to a module. */
export function createLogger(module: string) {
  return {
    debug: (msg: string, ctx: LogContext = {}) => log('debug', msg, { ...ctx, module }),
    info: (msg: string, ctx: LogContext = {}) => log('info', msg, { ...ctx, module }),
    warn: (msg: string, ctx: LogContext = {}) => log('warn', msg, { ...ctx, module }),
    error: (msg: string, ctx: LogContext = {}) => log('error', msg, { ...ctx, module }),
  };
}

/** Global logger (no module prefix). */
export const logger = {
  debug: (msg: string, ctx?: LogContext) => log('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => log('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => log('error', msg, ctx),
};
