import { Options } from 'k6/options';
import { sleep } from 'k6';
import { authenticate, getValidToken } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import {
  dashboardHomeScenario,
  ordersPageScenario,
  financeOverviewScenario,
  loadOrdersCollection,
  loadTransactionsCollection,
  loadProductsCollection,
  fullDashboardSessionScenario,
} from '../scenarios/dashboard-madas';
import { logTestInfo, checkEnvironment } from '../../k6.config';

/**
 * MADAS Dashboard Load Test
 * Specifically designed for the MADAS Dashboard React/Vite SPA
 * 
 * Tests:
 * - Dashboard home page loads
 * - Orders page loads
 * - Finance overview page loads
 * - Firestore collections (orders, transactions, products)
 * - Realistic user journey through multiple pages
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
    'read_operation_latency': ['p(95)<800', 'p(99)<1500'],
    'firestore_throttles': ['rate<0.01'],
  },
  tags: {
    test_type: 'dashboard_madas',
  },
};

export function setup() {
  logTestInfo(
    'MADAS DASHBOARD LOAD TEST (1K USERS)',
    'Tests the MADAS Dashboard React/Vite SPA with Firestore operations, ramping up over 10 minutes'
  );
  
  checkEnvironment();
  
  // Authenticate test user
  const email = __ENV.TEST_USER_EMAIL || '{{TEST_USER_EMAIL}}';
  const password = __ENV.TEST_USER_PASSWORD || '{{TEST_USER_PASSWORD}}';
  
  const token = authenticate(email, password);
  if (!token) {
    throw new Error('Failed to authenticate test user. Check TEST_USER_EMAIL and TEST_USER_PASSWORD.');
  }
  
  // Get test business IDs (called TENANT_IDS for compatibility, but they're business IDs)
  const businessIds = (__ENV.TENANT_IDS || '{{TENANT_ID_A}}').split(',').map(id => id.trim()).filter(Boolean);
  
  if (businessIds.length === 0 || businessIds[0].startsWith('{{')) {
    throw new Error('TENANT_IDS must be set with actual business IDs. Use comma-separated values like: business-id-1,business-id-2');
  }
  
  return { token, email, password, businessIds };
}

export default function (data: { token: string; email: string; password: string; businessIds: string[] }) {
  // Refresh token if needed
  const token = getValidToken(data.email, data.password) || data.token;
  
  // Get random business ID from test businesses
  const businessId = data.businessIds[Math.floor(Math.random() * data.businessIds.length)];
  setTenantContext(businessId);
  
  // Realistic user journey mix:
  // 40%: Full dashboard session (multiple pages + collections)
  // 30%: Dashboard home page only
  // 15%: Orders page
  // 10%: Finance overview
  // 5%: Direct Firestore collection loads
  const operation = Math.random();
  
  if (operation < 0.4) {
    // 40%: Full dashboard session (realistic user journey)
    fullDashboardSessionScenario(token, businessId);
  } else if (operation < 0.7) {
    // 30%: Dashboard home page
    dashboardHomeScenario(token, businessId);
  } else if (operation < 0.85) {
    // 15%: Orders page
    ordersPageScenario(token, businessId);
  } else if (operation < 0.95) {
    // 10%: Finance overview
    financeOverviewScenario(token, businessId);
  } else {
    // 5%: Direct Firestore collection loads (simulating React Query hooks)
    const collectionOp = Math.random();
    if (collectionOp < 0.33) {
      loadOrdersCollection(token, businessId);
    } else if (collectionOp < 0.67) {
      loadTransactionsCollection(token, businessId);
    } else {
      loadProductsCollection(token, businessId);
    }
  }
  
  // Small random delay to simulate real user behavior
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}


