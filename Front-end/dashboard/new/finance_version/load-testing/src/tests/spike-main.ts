import { Options } from 'k6/options';
import { authenticate, getValidToken } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { dashboardLoadScenario } from '../scenarios/dashboard';
import { logTestInfo, checkEnvironment } from '../../k6.config';

/**
 * Aggressive Spike Test
 * 10k concurrent users hitting the dashboard within 30s
 * Tests system's ability to handle sudden traffic spikes
 * 
 * WARNING: This test can generate significant load and costs
 * Only run against staging environment with proper monitoring
 */

export const options: Options = {
  stages: [
    { duration: '30s', target: 10000 }, // Instant spike to 10k users
    { duration: '2m', target: 10000 },  // Hold at 10k users for 2 minutes
    { duration: '1m', target: 5000 },   // Drop to 5k
    { duration: '1m', target: 0 },      // Ramp down to 0
  ],
  thresholds: {
    // Relaxed thresholds for spike test (focus is on capacity, not performance)
    'http_req_duration': ['p(95)<5000', 'p(99)<10000'],
    'http_req_failed': ['rate<0.15'], // Higher tolerance during spike
    'errors': ['rate<0.15'],
    'firestore_throttles': ['rate<0.1'], // May see throttling during spike
  },
  tags: {
    test_type: 'spike_10k',
  },
};

export function setup() {
  logTestInfo(
    'SPIKE TEST (10K USERS)',
    '10k concurrent users hitting dashboard within 30s - aggressive spike test'
  );
  
  checkEnvironment();
  
  // Additional safety check for spike test
  const env = __ENV.ENV || 'staging';
  if (env === 'prod') {
    const allowProd = __ENV.ALLOW_PROD_TESTS === 'true';
    if (!allowProd) {
      throw new Error(
        'ERROR: 10k spike test is not allowed in production by default. ' +
        'Set ALLOW_PROD_TESTS=true if you really need to run this in prod.'
      );
    }
  }
  
  // Authenticate test user
  const email = __ENV.TEST_USER_EMAIL || '{{TEST_USER_EMAIL}}';
  const password = __ENV.TEST_USER_PASSWORD || '{{TEST_USER_PASSWORD}}';
  
  const token = authenticate(email, password);
  if (!token) {
    throw new Error('Failed to authenticate test user. Check TEST_USER_EMAIL and TEST_USER_PASSWORD.');
  }
  
  return { token, email, password };
}

export default function (data: { token: string; email: string; password: string }) {
  // Refresh token if needed (less frequent checks during spike to reduce overhead)
  let token = data.token;
  if (Math.random() < 0.1) { // 10% chance to check token
    token = getValidToken(data.email, data.password) || data.token;
  }
  
  // Set random tenant context
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  // During spike, focus on simple dashboard loads (most common operation)
  dashboardLoadScenario(token);
  
  // Minimal delay during spike to maximize concurrent requests
  // In real spike scenarios, users don't wait
}


