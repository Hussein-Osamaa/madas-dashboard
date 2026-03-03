import { Options } from 'k6/options';
import { authenticate } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { dashboardLoadScenario, paginatedListScenario, multiCollectionLoadScenario } from './dashboard';
import { readResourceScenario } from './crud';
import { logTestInfo } from '../../k6.config';

/**
 * Read-Heavy Test Scenario
 * Simulates many concurrent reads across multiple collections
 * Tests Firestore read capacity and caching effectiveness
 */

export const options: Options = {
  stages: [
    { duration: '2m', target: 500 },   // Ramp up to 500 concurrent readers
    { duration: '10m', target: 500 },  // Hold at 500
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.01'],
    'read_operation_latency': ['p(95)<800', 'p(99)<1500'],
    'reads_per_second': ['count>100'], // Ensure we're generating read load
  },
  tags: {
    test_type: 'read_heavy',
  },
};

export function setup() {
  logTestInfo(
    'READ-HEAVY TEST',
    'Simulate many concurrent reads across multiple collections'
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
  
  // Mix of read operations
  const operation = Math.random();
  
  if (operation < 0.4) {
    // 40% dashboard loads
    dashboardLoadScenario(data.token);
  } else if (operation < 0.7) {
    // 30% paginated lists
    const collections = ['projects', 'orders', 'users', 'reports'];
    const collection = collections[Math.floor(Math.random() * collections.length)];
    paginatedListScenario(data.token, collection);
  } else if (operation < 0.9) {
    // 20% multi-collection loads
    multiCollectionLoadScenario(data.token);
  } else {
    // 10% single resource reads (if we have test data IDs)
    // In practice, you'd use actual resource IDs from your test data
    // For now, skip individual reads or generate test IDs
    dashboardLoadScenario(data.token);
  }
}


