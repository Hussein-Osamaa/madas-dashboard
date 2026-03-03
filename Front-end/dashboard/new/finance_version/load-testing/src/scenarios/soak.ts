import { Options } from 'k6/options';
import { authenticate } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { dashboardLoadScenario } from './dashboard';
import { createResourceScenario, readResourceScenario } from './crud';
import { logTestInfo } from '../../k6.config';

/**
 * Soak Test Scenario
 * Steady moderate load for 1-4 hours to detect memory leaks, gradual degradation
 * Validates system stability under sustained load
 */

// Default to 1 hour, can be overridden via DURATION env var
const testDuration = __ENV.DURATION || '1h';

export const options: Options = {
  stages: [
    { duration: '5m', target: 200 },   // Ramp up to 200 users
    { duration: testDuration, target: 200 }, // Hold at 200 users for duration
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1500', 'p(99)<2500'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.01'],
    // Monitor for gradual degradation
    'http_req_duration{type:soak}': ['p(95)<1500', 'p(99)<2500'],
  },
  tags: {
    test_type: 'soak',
  },
};

export function setup() {
  logTestInfo(
    'SOAK TEST',
    `Steady moderate load for ${testDuration} to detect memory leaks and gradual degradation`
  );
  
  const email = __ENV.TEST_USER_EMAIL || '{{TEST_USER_EMAIL}}';
  const password = __ENV.TEST_USER_PASSWORD || '{{TEST_USER_PASSWORD}}';
  
  const token = authenticate(email, password);
  if (!token) {
    throw new Error('Failed to authenticate test user');
  }
  
  // Track created resources for cleanup if needed
  const createdResources: Array<{ collection: string; id: string }> = [];
  
  return { token, createdResources };
}

export default function (data: { token: string; createdResources: Array<{ collection: string; id: string }> }) {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  // Realistic user journey mix for sustained load
  const operation = Math.random();
  
  if (operation < 0.7) {
    // 70% dashboard loads
    dashboardLoadScenario(data.token);
  } else if (operation < 0.9) {
    // 20% creates
    const resourceId = createResourceScenario(data.token, 'projects', {
      name: 'Soak Test Project',
      description: 'Soak test project',
    });
    if (resourceId) {
      data.createdResources.push({ collection: 'projects', id: resourceId });
    }
  } else {
    // 10% reads (if we have created resources)
    if (data.createdResources.length > 0) {
      const resource = data.createdResources[Math.floor(Math.random() * data.createdResources.length)];
      readResourceScenario(data.token, resource.collection, resource.id);
    } else {
      dashboardLoadScenario(data.token);
    }
  }
}


