import { Options } from 'k6/options';
import { authenticate } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { dashboardLoadScenario } from './dashboard';
import { logTestInfo } from '../../k6.config';

/**
 * Spike Test Scenario
 * Instant surge to 10k concurrent users hitting the dashboard within 30s
 * Tests system's ability to handle sudden traffic spikes
 */

export const options: Options = {
  stages: [
    { duration: '30s', target: 10000 }, // Instant spike to 10k users
    { duration: '1m', target: 10000 },  // Hold at 10k users
    { duration: '30s', target: 0 },     // Instant drop
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000', 'p(99)<10000'], // Relaxed for spike
    'http_req_failed': ['rate<0.1'], // Allow higher error rate during spike
    'errors': ['rate<0.1'],
  },
  tags: {
    test_type: 'spike',
  },
};

export function setup() {
  logTestInfo(
    'SPIKE TEST',
    'Instant surge to 10k concurrent users hitting dashboard within 30s'
  );
  
  // Setup: authenticate test user
  const email = __ENV.TEST_USER_EMAIL || '{{TEST_USER_EMAIL}}';
  const password = __ENV.TEST_USER_PASSWORD || '{{TEST_USER_PASSWORD}}';
  
  const token = authenticate(email, password);
  if (!token) {
    throw new Error('Failed to authenticate test user');
  }
  
  return { token };
}

export default function (data: { token: string }) {
  // Set random tenant context
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  // Execute dashboard load scenario
  dashboardLoadScenario(data.token);
}


