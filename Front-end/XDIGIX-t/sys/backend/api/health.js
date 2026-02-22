/**
 * Simple health + CORS test. Always sends valid CORS headers (required by browser).
 */
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

module.exports = function handler(req, res) {
  const origin = getAllowOrigin(req);
  const method = (req && req.method) ? String(req.method).toUpperCase() : 'GET';
  res.writeHead(method === 'OPTIONS' ? 204 : 200, {
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
  });
  res.end(method === 'OPTIONS' ? undefined : JSON.stringify({ ok: true, t: new Date().toISOString() }));
};
