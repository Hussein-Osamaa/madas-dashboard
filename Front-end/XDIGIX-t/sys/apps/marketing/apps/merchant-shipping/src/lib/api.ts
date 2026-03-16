const BASE = import.meta.env.VITE_API_URL ?? '';

function token() { return localStorage.getItem('ship_token') ?? ''; }

export const api = {
  get: (path: string) =>
    fetch(`${BASE}/api${path}`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),

  post: (path: string, body: unknown) =>
    fetch(`${BASE}/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    }).then(r => r.json()),

  patch: (path: string, body: unknown) =>
    fetch(`${BASE}/api${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    }).then(r => r.json()),
};

export function setToken(t: string) { localStorage.setItem('ship_token', t); }
export function clearToken()        { localStorage.removeItem('ship_token'); }
export function getMerchantId()     { return localStorage.getItem('ship_merchant_id') ?? ''; }
export function setMerchantId(id: string) { localStorage.setItem('ship_merchant_id', id); }
