/**
 * Vercel serverless catch-all: forwards all requests to the Express app.
 * CORS: always set valid headers (browser requires valid Access-Control-Allow-Origin).
 */

const path = require('path');

const DEFAULT_ORIGIN = 'https://xdigix-os.vercel.app';

function getAllowOrigin(req) {
  const env = process.env.CORS_ORIGIN;
  if (typeof env === 'string' && env.trim()) return env.trim();
  const o = req && req.headers && req.headers.origin;
  if (typeof o === 'string' && o.trim()) return o.trim();
  return DEFAULT_ORIGIN;
}

function corsHeaders(origin) {
  const allowOrigin = (typeof origin === 'string' && origin.trim()) ? origin.trim() : DEFAULT_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function setCorsHeaders(res, origin) {
  const h = corsHeaders(origin);
  try {
    res.setHeader('Access-Control-Allow-Origin', h['Access-Control-Allow-Origin']);
    res.setHeader('Access-Control-Allow-Methods', h['Access-Control-Allow-Methods']);
    res.setHeader('Access-Control-Allow-Headers', h['Access-Control-Allow-Headers']);
    res.setHeader('Access-Control-Max-Age', h['Access-Control-Max-Age']);
  } catch (e) {}
}

const distPath = path.resolve(__dirname, '..', 'dist');

function loadApp() {
  const { createApp } = require(path.join(distPath, 'app'));
  return createApp;
}

function loadConnectDb() {
  const { connectDb } = require(path.join(distPath, 'db'));
  return connectDb;
}

let connectPromise = null;
let createAppFn = null;

function ensureDb() {
  if (!connectPromise) {
    const connectDb = loadConnectDb();
    connectPromise = connectDb();
  }
  return connectPromise;
}

module.exports = async function handler(req, res) {
  const method = (req && req.method) ? String(req.method).toUpperCase() : 'GET';
  const origin = getAllowOrigin(req);
  const headers = corsHeaders(origin);

  if (method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  setCorsHeaders(res, origin);

  try {
    await ensureDb();
    if (!createAppFn) createAppFn = loadApp();
    const app = createAppFn();
    return new Promise((resolve, reject) => {
      app(req, res);
      res.once('finish', resolve);
      res.once('error', reject);
    });
  } catch (err) {
    console.error('[Vercel handler]', err);
    const body = JSON.stringify({
      error: 'FUNCTION_INVOCATION_FAILED',
      message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
    });
    if (!res.headersSent) {
      res.writeHead(500, { ...corsHeaders(origin), 'Content-Type': 'application/json' });
    }
    res.end(body);
  }
};
