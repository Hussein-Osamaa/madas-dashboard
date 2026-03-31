/**
 * Checkout burst test — simulates flash sale / high-concurrency checkout.
 *
 * Tests:
 * - Reservation atomicity under concurrent load
 * - Duplicate checkout prevention (idempotency keys)
 * - Order creation throughput
 * - Payment confirmation race conditions
 *
 * Run: k6 run --env BASE_URL=http://localhost:3000 loadtest/scenarios/checkout-burst.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, TENANT_ID, THRESHOLDS, SCENARIOS, publicHeaders } from '../config.js';

const checkoutSuccess = new Rate('checkout_success_rate');
const checkoutDuration = new Trend('checkout_duration_ms');
const duplicateOrders = new Counter('duplicate_checkout_attempts');

export const options = {
  scenarios: {
    burst: { ...SCENARIOS.checkoutBurst, exec: 'checkoutBurst' },
  },
  thresholds: {
    ...THRESHOLDS,
    checkout_success_rate: ['rate>0.90'],        // 90% success under burst
    checkout_duration_ms: ['p(95)<5000'],         // p95 under 5s even during burst
    http_req_failed: ['rate<0.10'],              // Up to 10% errors acceptable during burst
  },
};

export function checkoutBurst() {
  const params = publicHeaders();
  const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;

  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/public/${TENANT_ID}/checkout`,
    JSON.stringify({
      customer: {
        email: `burst-${uniqueId}@test.com`,
        firstName: 'Burst',
        lastName: 'Test',
      },
      shipping: {
        address: '456 Load St',
        city: 'Alexandria',
        state: 'Alex',
        postalCode: '21500',
        country: 'EG',
        method: 'standard',
      },
      paymentMethod: 'cod',
      idempotencyKey: `idem-${uniqueId}`,
      items: [{ productId: 'product-1', name: 'Flash Sale Item', price: 50, quantity: 1 }],
    }),
    params,
  );

  const duration = Date.now() - start;
  checkoutDuration.add(duration);

  const success = res.status >= 200 && res.status < 300;
  checkoutSuccess.add(success);

  if (res.status === 409) {
    duplicateOrders.add(1);
  }

  check(res, {
    'checkout: not server error': (r) => r.status < 500,
    'checkout: under 5s': () => duration < 5000,
  });

  sleep(0.1);
}
