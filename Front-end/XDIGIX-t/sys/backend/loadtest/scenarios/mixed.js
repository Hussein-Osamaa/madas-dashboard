/**
 * Mixed traffic test — realistic blend of storefront + admin + background.
 *
 * Simulates production traffic patterns:
 * - 70% storefront (browse, search, cart, checkout)
 * - 20% admin (reports, tickets, plan usage)
 * - 10% exports + health checks
 *
 * Run: k6 run --env BASE_URL=http://localhost:3000 loadtest/scenarios/mixed.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, TENANT_ID, THRESHOLDS, publicHeaders, adminHeaders } from '../config.js';

export const options = {
  scenarios: {
    storefront: {
      executor: 'constant-vus',
      vus: 14,
      duration: '3m',
      exec: 'storefrontTraffic',
    },
    admin: {
      executor: 'constant-vus',
      vus: 4,
      duration: '3m',
      exec: 'adminTraffic',
    },
    background: {
      executor: 'constant-vus',
      vus: 2,
      duration: '3m',
      exec: 'backgroundTraffic',
    },
  },
  thresholds: {
    ...THRESHOLDS,
  },
};

export function storefrontTraffic() {
  const params = publicHeaders();

  http.get(`${BASE_URL}/api/public/${TENANT_ID}/products`, params);
  sleep(0.5 + Math.random());

  http.get(`${BASE_URL}/api/public/${TENANT_ID}/products?search=shirt`, params);
  sleep(0.3 + Math.random() * 0.5);

  // 30% of storefront VUs attempt checkout
  if (Math.random() < 0.3) {
    const res = http.post(
      `${BASE_URL}/api/public/${TENANT_ID}/checkout`,
      JSON.stringify({
        customer: { email: `mix-${__VU}-${__ITER}@test.com`, firstName: 'Mix', lastName: 'Test' },
        shipping: { address: '1 Mix St', city: 'Cairo', state: 'Cairo', postalCode: '11511', country: 'EG', method: 'standard' },
        paymentMethod: 'cod',
        items: [{ productId: 'product-1', name: 'T-Shirt', price: 200, quantity: 1 }],
      }),
      params,
    );
    check(res, { 'checkout: not 5xx': (r) => r.status < 500 });
  }

  sleep(1 + Math.random() * 2);
}

export function adminTraffic() {
  const params = adminHeaders();

  group('Admin reports', () => {
    http.get(`${BASE_URL}/api/admin/reports/dashboard?tenantId=${TENANT_ID}`, params);
    sleep(2 + Math.random());

    http.get(`${BASE_URL}/api/admin/reports/orders?tenantId=${TENANT_ID}`, params);
    sleep(1);

    http.get(`${BASE_URL}/api/support/tickets?tenantId=${TENANT_ID}&limit=10`, params);
    sleep(1);
  });

  sleep(2 + Math.random() * 3);
}

export function backgroundTraffic() {
  // Health check
  const res = http.get(`${BASE_URL}/health`);
  check(res, {
    'health: status 200': (r) => r.status === 200,
    'health: mongodb connected': (r) => {
      try { return JSON.parse(r.body).checks?.mongodb === 'connected'; } catch { return false; }
    },
  });

  sleep(5 + Math.random() * 5);
}
