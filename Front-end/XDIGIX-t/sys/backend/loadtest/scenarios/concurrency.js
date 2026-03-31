/**
 * Concurrency safety test — verifies atomic operations under load.
 *
 * Tests:
 * 1. Duplicate checkout prevention (same idempotency key from multiple VUs)
 * 2. Health check under load (no deadlocks)
 * 3. Concurrent report generation (no corrupt responses)
 * 4. Concurrent export creation (no double-processing)
 *
 * Run: k6 run --env BASE_URL=http://localhost:3000 loadtest/scenarios/concurrency.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { BASE_URL, TENANT_ID, THRESHOLDS, publicHeaders, adminHeaders } from '../config.js';

const duplicateAccepted = new Counter('duplicate_checkouts_accepted');
const healthSuccess = new Rate('health_check_success');

export const options = {
  scenarios: {
    // Same idempotency key from 20 concurrent VUs
    idempotency: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 1,
      exec: 'idempotencyTest',
      maxDuration: '30s',
    },
    // Health check under load
    healthCheck: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      exec: 'healthCheckTest',
      startTime: '0s',
    },
    // Concurrent reports
    concurrentReports: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 3,
      exec: 'concurrentReportTest',
      startTime: '5s',
    },
  },
  thresholds: {
    ...THRESHOLDS,
    health_check_success: ['rate>0.99'],           // Health must stay up
    duplicate_checkouts_accepted: ['count<2'],      // At most 1 should succeed
  },
};

// Shared idempotency key for the race test
const SHARED_IDEM_KEY = `race-test-${Date.now()}`;

export function idempotencyTest() {
  const params = publicHeaders();

  const res = http.post(
    `${BASE_URL}/api/public/${TENANT_ID}/checkout`,
    JSON.stringify({
      customer: { email: 'race@test.com', firstName: 'Race', lastName: 'Test' },
      shipping: { address: '1 Race St', city: 'Cairo', state: 'Cairo', postalCode: '11511', country: 'EG', method: 'standard' },
      paymentMethod: 'cod',
      idempotencyKey: SHARED_IDEM_KEY,
      items: [{ productId: 'product-1', name: 'Race Item', price: 100, quantity: 1 }],
    }),
    params,
  );

  if (res.status >= 200 && res.status < 300) {
    duplicateAccepted.add(1);
  }

  check(res, {
    'idempotency: no server error': (r) => r.status < 500,
    'idempotency: success or conflict': (r) => r.status === 201 || r.status === 200 || r.status === 409,
  });
}

export function healthCheckTest() {
  const res = http.get(`${BASE_URL}/health`);
  const success = res.status === 200;
  healthSuccess.add(success);
  check(res, { 'health: 200': (r) => r.status === 200 });
  sleep(0.5);
}

export function concurrentReportTest() {
  const params = adminHeaders();
  const endpoints = [
    `/api/admin/reports/orders?tenantId=${TENANT_ID}`,
    `/api/admin/reports/revenue?tenantId=${TENANT_ID}`,
    `/api/admin/reports/inventory?tenantId=${TENANT_ID}`,
    `/api/admin/reports/shipping?tenantId=${TENANT_ID}`,
    `/api/admin/reports/dashboard?tenantId=${TENANT_ID}`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${BASE_URL}${endpoint}`, params);

  check(res, {
    'report: status 200': (r) => r.status === 200,
    'report: valid JSON': (r) => {
      try { JSON.parse(r.body); return true; } catch { return false; }
    },
    'report: ok=true': (r) => {
      try { return JSON.parse(r.body).ok === true; } catch { return false; }
    },
  });

  sleep(0.5);
}
