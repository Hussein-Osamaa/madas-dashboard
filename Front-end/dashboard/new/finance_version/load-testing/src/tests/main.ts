import { Options } from 'k6/options';
import { sleep } from 'k6';
import { authenticate, getValidToken } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { dashboardLoadScenario, multiCollectionLoadScenario, paginatedListScenario } from '../scenarios/dashboard';
import { fullDashboardSessionScenario, dashboardHomeScenario } from '../scenarios/dashboard-madas';
import { createResourceScenario, readResourceScenario } from '../scenarios/crud';
import { logTestInfo, checkEnvironment } from '../../k6.config';

/**
 * Main Dashboard Load Test
 * Simulates 1k concurrent users performing dashboard reads + occasional writes
 * Ramps up over 10 minutes
 * 
 * This is the recommended starting point for System load testing
 */

export const options: Options = {
  stages: [
    { duration: '10m', target: 1000 }, // Ramp up to 1k users over 10 minutes
    { duration: '10m', target: 1000 }, // Hold at 1k users for 10 minutes
    { duration: '5m', target: 0 },     // Ramp down over 5 minutes
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1500', 'p(99)<2500'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.01'],
    'dashboard_load_latency': ['p(95)<1200', 'p(99)<2000'],
    'read_operation_latency': ['p(95)<1000', 'p(99)<1800'],
    'write_operation_latency': ['p(95)<2000', 'p(99)<3500'],
  },
  tags: {
    test_type: 'dashboard_1k',
  },
};

export function setup() {
  logTestInfo(
    'DASHBOARD LOAD TEST (1K USERS)',
    'Simulates 1k concurrent users performing dashboard reads + occasional writes, ramping over 10 minutes'
  );
  
  checkEnvironment();
  
  // Authenticate test user
  const email = __ENV.TEST_USER_EMAIL || '{{TEST_USER_EMAIL}}';
  const password = __ENV.TEST_USER_PASSWORD || '{{TEST_USER_PASSWORD}}';
  
  const token = authenticate(email, password);
  if (!token) {
    throw new Error('Failed to authenticate test user. Check TEST_USER_EMAIL and TEST_USER_PASSWORD.');
  }
  
  // Track created resources for potential reads/updates
  const createdResources: Array<{ collection: string; id: string }> = [];
  
  return { token, email, password, createdResources };
}

export default function (data: { token: string; email: string; password: string; createdResources: Array<{ collection: string; id: string }> }) {
  // Refresh token if needed
  const token = getValidToken(data.email, data.password) || data.token;
  
  // Set random tenant context
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  // Realistic user journey mix:
  // 80% reads (dashboard, lists, pagination)
  // 15% creates
  // 5% reads of created resources
  const operation = Math.random();
  
  if (operation < 0.4) {
    // 40%: MADAS Dashboard home page
    dashboardHomeScenario(token, tenantId);
  } else if (operation < 0.5) {
    // 10%: Generic dashboard loads (for compatibility)
    dashboardLoadScenario(token);
  } else if (operation < 0.7) {
    // 20%: Multi-collection loads (simulating dashboard widgets)
    multiCollectionLoadScenario(token);
  } else if (operation < 0.85) {
    // 15%: Paginated lists
    const collections = ['projects', 'orders', 'users', 'reports'];
    const collection = collections[Math.floor(Math.random() * collections.length)];
    paginatedListScenario(token, collection);
  } else if (operation < 0.95) {
    // 10%: Create resources (occasional writes)
    const resourceId = createResourceScenario(token, 'projects', {
      name: `Load Test Project ${Date.now()}`,
      description: 'Generated during load test',
      status: 'active',
      tenantId, // Ensure tenant ID is in the data
    });
    
    if (resourceId && data.createdResources.length < 100) {
      // Keep a pool of created resources for reads
      data.createdResources.push({ collection: 'projects', id: resourceId });
    }
  } else {
    // 5%: Read recently created resources
    if (data.createdResources.length > 0) {
      const resource = data.createdResources[Math.floor(Math.random() * data.createdResources.length)];
      readResourceScenario(token, resource.collection, resource.id);
    } else {
      // Fallback to dashboard if no resources yet
      dashboardLoadScenario(token);
    }
  }
  
  // Small random delay to simulate real user behavior
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

