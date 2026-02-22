/**
 * Vercel serverless catch-all: forwards all requests to the Express app.
 * CORS is set first so preflight and any error response always include headers.
 */

const path = require('path');

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://xdigix-os.vercel.app';

function setCorsHeaders(res, origin) {
  try {
    res.setHeader('Access-Control-Allow-Origin', origin || CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
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
  const origin = (req && req.headers && req.headers.origin) || CORS_ORIGIN;

  setCorsHeaders(res, origin);

  if (method === 'OPTIONS') {
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
    setCorsHeaders(res, origin);
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
