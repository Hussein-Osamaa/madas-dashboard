import { Options } from 'k6/options';
import { authenticate } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { dashboardLoadScenario } from './dashboard';
import { createResourceScenario } from './crud';
import { logTestInfo } from '../../k6.config';

/**
 * Stress Test Scenario
 * Gradually increase load until failure or throttling detected
 * Identifies system breaking points and capacity limits
 */

export const options: Options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 500 },   // Increase to 500
    { duration: '2m', target: 1000 },  // Increase to 1k
    { duration: '2m', target: 2000 },  // Increase to 2k
    { duration: '2m', target: 3000 },  // Increase to 3k
    { duration: '5m', target: 3000 },  // Hold at 3k
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.2'], // Higher tolerance as we push limits
    'errors': ['rate<0.2'],
    'firestore_throttles': ['rate<0.05'], // Track throttling
  },
  tags: {
    test_type: 'stress',
  },
};

export function setup() {
  logTestInfo(
    'STRESS TEST',
    'Gradually increase load until failure or throttling detected'
  );
  
  const email = __ENV.TEST_USER_EMAIL || '{{TEST_USER_EMAIL}}';
  const password = __ENV.TEST_USER_PASSWORD || '{{TEST_USER_PASSWORD}}';
  
  const token = authenticate(email, password);
  if (!token) {
    throw new Error('Failed to authenticate test user');
  }
  
  return { token };
}

export default function (data: { token: string }) {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  // Mix of read and write operations to stress both paths
  const operation = Math.random();
  
  if (operation < 0.8) {
    // 80% reads (dashboard)
    dashboardLoadScenario(data.token);
  } else {
    // 20% writes
    createResourceScenario(data.token, 'projects', {
      name: 'Stress Test Project',
      description: 'Load test project',
    });
  }
}


