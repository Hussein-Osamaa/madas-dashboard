/**
 * Root-level Vercel serverless handler.
 * Static requires so @vercel/node can trace and bundle all dependencies.
 */
const { connectDb } = require('../Front-end/XDIGIX-t/sys/backend/dist/db');
const { createApp } = require('../Front-end/XDIGIX-t/sys/backend/dist/app');

const DEFAULT_ORIGIN = 'https://xdigix-os.vercel.app';

function getAllowOrigin(req) {
  const env = process.env.CORS_ORIGIN;
  if (typeof env === 'string' && env.trim()) return env.trim();
  const o = req && req.headers && req.headers.origin;
  if (typeof o === 'string' && o.trim()) return o.trim();
  return DEFAULT_ORIGIN;
}

function corsHeaders(origin) {
  const allow = (typeof origin === 'string' && origin.trim()) ? origin.trim() : DEFAULT_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
