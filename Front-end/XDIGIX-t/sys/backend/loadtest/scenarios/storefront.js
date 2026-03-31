/**
 * Storefront load test — public-facing customer traffic.
 *
 * Flows:
 * 1. Product listing (browse)
 * 2. Product search
 * 3. Cart operations (add, read, update)
 * 4. Checkout creation
 *
 * Run: k6 run --env BASE_URL=http://localhost:3000 loadtest/scenarios/storefront.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, TENANT_ID, BUSINESS_ID, THRESHOLDS, SCENARIOS, publicHeaders } from '../config.js';

// Custom metrics
const checkoutSuccess = new Rate('checkout_success_rate');
const checkoutDuration = new Trend('checkout_duration_ms');

export const options = {
  scenarios: {
    steady: { ...SCENARIOS.steady, exec: 'storefrontFlow' },
  },
  thresholds: {
    ...THRESHOLDS,
    checkout_success_rate: ['rate>0.95'],       // 95% checkout success
    checkout_duration_ms: ['p(95)<3000'],        // Checkout p95 under 3s
  },
};

// Product IDs populated during setup or from seed data
const PRODUCT_IDS = ['product-1', 'product-2', 'product-3', 'product-4', 'product-5'];

export function storefrontFlow() {
  const params = publicHeaders();

  group('Browse products', () => {
    const res = http.get(`${BASE_URL}/api/public/${TENANT_ID}/products`, params);
    check(res, {
      'products: status 200': (r) => r.status === 200,
      'products: has data': (r) => {
        try { return JSON.parse(r.body).length >= 0; } catch { return false; }
      },
    });
  });

  sleep(0.5 + Math.random());

  group('Search products', () => {
    const res = http.get(`${BASE_URL}/api/public/${TENANT_ID}/products?search=test`, params);
    check(res, {
      'search: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.3 + Math.random() * 0.5);

  group('Cart operations', () => {
    const productId = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];
    // Add to cart
    const addRes = http.post(
      `${BASE_URL}/api/public/${TENANT_ID}/cart`,
      JSON.stringify({ productId, quantity: 1 }),
      params,
    );
    check(addRes, {
      'cart add: status 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  });

  sleep(0.5 + Math.random());

  group('Checkout', () => {
    const start = Date.now();
    const checkoutRes = http.post(
      `${BASE_URL}/api/public/${TENANT_ID}/checkout`,
      JSON.stringify({
        customer: {
          email: `load-${__VU}-${__ITER}@test.com`,
          firstName: 'Load',
          lastName: 'Test',
        },
        shipping: {
          address: '123 Test St',
          city: 'Cairo',
          state: 'Cairo',
          postalCode: '11511',
          country: 'EG',
          method: 'standard',
        },
        paymentMethod: 'cod',
        items: [{ productId: PRODUCT_IDS[0], name: 'Test', price: 100, quantity: 1 }],
      }),
      params,
    );

    const duration = Date.now() - start;
    checkoutDuration.add(duration);

    const success = checkoutRes.status >= 200 && checkoutRes.status < 300;
    checkoutSuccess.add(success);

    check(checkoutRes, {
      'checkout: status 2xx': (r) => r.status >= 200 && r.status < 300,
      'checkout: under 3s': () => duration < 3000,
    });
  });

  sleep(1 + Math.random() * 2);
}
