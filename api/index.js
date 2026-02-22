/**
 * Root-level Vercel serverless handler.
 * Static requires so @vercel/node can trace and bundle all dependencies.
 */
const { connectDb } = require('../Front-end/XDIGIX-t/sys/backend/dist/db');
const { createApp } = require('../Front-end/XDIGIX-t/sys/backend/dist/app');

const ALLOWED_ORIGINS = [
  'https://xdigix-os.vercel.app',
  'https://xdigix-os-xdigix.vercel.app',
];

function getAllowOrigin(req) {
  const reqOrigin = req && req.headers && req.headers.origin;

  const envOrigins = process.env.CORS_ORIGIN;
  if (typeof envOrigins === 'string' && envOrigins.trim()) {
    const list = envOrigins.split(',').map(s => s.trim()).filter(Boolean);
    if (typeof reqOrigin === 'string' && list.includes(reqOrigin)) return reqOrigin;
    return list[0];
  }

  if (typeof reqOrigin === 'string' && ALLOWED_ORIGINS.includes(reqOrigin)) return reqOrigin;
  return ALLOWED_ORIGINS[0];
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

let connectPromise = null;
let appFn = null;

module.exports = async function handler(req, res) {
  const method = (req && req.method) ? String(req.method).toUpperCase() : 'GET';
  const origin = getAllowOrigin(req);
  const headers = corsHeaders(origin);

  if (method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  Object.entries(headers).forEach(([k, v]) => {
    try { res.setHeader(k, v); } catch (_) {}
  });

  try {
    if (!connectPromise) connectPromise = connectDb();
    await connectPromise;

    if (!appFn) appFn = createApp();

    return new Promise((resolve, reject) => {
      appFn(req, res);
      res.once('finish', resolve);
      res.once('error', reject);
    });
  } catch (err) {
    console.error('[Vercel root handler]', err);
    if (!res.headersSent) {
      res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({
      error: 'FUNCTION_INVOCATION_FAILED',
      message: process.env.NODE_ENV === 'production' ? 'Server error' : String(err.message || err),
    }));
  }
};
