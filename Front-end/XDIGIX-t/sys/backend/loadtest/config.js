/**
 * Load test configuration — shared across all k6 scenarios.
 *
 * Usage: k6 run --env BASE_URL=http://localhost:3000 loadtest/scenarios/storefront.js
 *
 * Environment variables:
 *   BASE_URL     — target server (default: http://localhost:3000)
 *   TENANT_ID    — test tenant ID (default: loadtest-tenant)
 *   BUSINESS_ID  — test business ID (default: loadtest-business)
 *   AUTH_TOKEN   — JWT token for authenticated endpoints (optional)
 *   ADMIN_TOKEN  — admin JWT token (optional)
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const TENANT_ID = __ENV.TENANT_ID || 'loadtest-tenant';
export const BUSINESS_ID = __ENV.BUSINESS_ID || 'loadtest-business';
export const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
export const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';

/**
 * Performance thresholds — targets (not achieved results).
 *
 * These are the pass/fail criteria for load tests.
 * Adjust based on your infrastructure capacity.
 */
export const THRESHOLDS = {
  // Response time targets
  http_req_duration: [
    'p(95)<500',   // 95th percentile under 500ms
    'p(99)<2000',  // 99th percentile under 2s
    'avg<200',     // Average under 200ms
  ],
  // Error rate targets
  http_req_failed: [
    'rate<0.01',   // Less than 1% error rate
  ],
  // Throughput: no minimum enforced (depends on hardware)
  // Custom metrics defined per scenario
};

/**
 * Scenario profiles — reusable across test scripts.
 */
export const SCENARIOS = {
  // Steady-state: normal traffic pattern
  steady: {
    executor: 'constant-vus',
    vus: 20,
    duration: '2m',
  },

  // Ramp-up: gradual increase to find breaking point
  ramp: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 50 },
      { duration: '30s', target: 100 },
      { duration: '1m', target: 100 },
      { duration: '30s', target: 0 },
    ],
  },

  // Spike: sudden burst of traffic
  spike: {
    executor: 'ramping-vus',
    startVUs: 5,
    stages: [
      { duration: '10s', target: 5 },
      { duration: '5s', target: 150 },
      { duration: '30s', target: 150 },
      { duration: '10s', target: 5 },
    ],
  },

  // Checkout burst: simulates flash sale
  checkoutBurst: {
    executor: 'constant-arrival-rate',
    rate: 50,          // 50 requests per second
    timeUnit: '1s',
    duration: '1m',
    preAllocatedVUs: 100,
    maxVUs: 200,
  },
};

/**
 * Common HTTP params.
 */
export function authHeaders() {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
    },
  };
}

export function adminHeaders() {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
    },
  };
}

export function publicHeaders() {
  return {
    headers: { 'Content-Type': 'application/json' },
  };
}
