/**
 * Vercel serverless catch-all: forwards all requests to the Express app.
 * Deploy backend as a separate Vercel project with Root Directory = sys/backend (or backend).
 * Set env vars in Vercel: MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN, etc.
 *
 * Limitations on Vercel: no Socket.io (realtime), no long-running cron in-process.
 * Use Vercel Cron to hit a protected /api/cron endpoint if you need scheduled jobs.
 */

const path = require('path');

// Resolve dist relative to this file (api/ is sibling of dist/)
const distPath = path.resolve(__dirname, '..', 'dist');

function loadApp() {
  const { createApp } = require(path.join(distPath, 'app'));
  return createApp;
}

function loadConnectDb() {
  const { connectDb } = require(path.join(distPath, 'db'));
  return connectDb;
}

/** CORS origin: env CORS_ORIGIN, or request Origin, or * (so preflight/errors always have a header) */
function getCorsOrigin(req) {
  const env = process.env.CORS_ORIGIN;
  if (env) return env;
  const origin = req && req.headers && req.headers.origin;
  if (origin) return origin;
  return '*';
}

function setCorsHeaders(req, res) {
  const origin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
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
  // Always set CORS so preflight and error responses pass the browser check
  setCorsHeaders(req, res);

  // Handle preflight so it succeeds even if DB/app fail later
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

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
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'FUNCTION_INVOCATION_FAILED',
        message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
      })
    );
  }
};
