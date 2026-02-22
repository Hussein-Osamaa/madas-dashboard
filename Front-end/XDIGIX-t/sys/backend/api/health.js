/**
 * Simple health + CORS test. If this returns CORS headers but [[...path]] does not,
 * the issue is with the catch-all. If this also has no CORS, the issue is project-level.
 */
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://xdigix-os.vercel.app';

module.exports = function handler(req, res) {
  const origin = (req && req.headers && req.headers.origin) || CORS_ORIGIN;
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  });
  if ((req && req.method || '').toUpperCase() === 'OPTIONS') {
    res.end();
    return;
  }
  res.end(JSON.stringify({ ok: true, t: new Date().toISOString() }));
};
