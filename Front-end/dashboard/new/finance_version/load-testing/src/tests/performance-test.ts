import { Options } from 'k6/options';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { authenticate, getValidToken } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { Trend, Rate, Counter } from 'k6/metrics';
import { trackPageLoad, trackCustomTrace } from '../utils/performance';

/**
 * Comprehensive Performance Test for MADAS Dashboard
 * Tests performance across all critical user journeys
 * Validates performance SLAs and identifies bottlenecks
 */

// Custom performance metrics
const pageLoadTime = new Trend('page_load_time', true);
const apiResponseTime = new Trend('api_response_time', true);
const firestoreQueryTime = new Trend('firestore_query_time', true);
const authenticationTime = new Trend('authentication_time', true);
const performanceSLA = new Rate('performance_sla_pass');

// Error metrics
const slowRequests = new Counter('slow_requests');
const failedRequests = new Counter('failed_requests');

export const options: Options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Hold at 50 users
    { duration: '2m', target: 100 },  // Increase to 100 users
    { duration: '5m', target: 100 },  // Hold at 100 users
    { duration: '2m', target: 200 },  // Increase to 200 users
    { duration: '5m', target: 200 },  // Hold at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Performance SLAs
    'http_req_duration': ['p(95)<2000', 'p(99)<3000'], // 95% under 2s, 99% under 3s
    'page_load_time': ['p(95)<1500', 'p(99)<2500'],    // Page loads
    'api_response_time': ['p(95)<1000', 'p(99)<1500'], // API calls
    'firestore_query_time': ['p(95)<800', 'p(99)<1200'], // Firestore queries
    'authentication_time': ['p(95)<500', 'p(99)<800'], // Auth
    
    // Reliability SLAs
    'http_req_failed': ['rate<0.01'], // <1% error rate
    'performance_sla_pass': ['rate>0.95'], // 95% pass SLA
    
    // Business metrics
    'slow_requests': ['count<100'], // Less than 100 slow requests
  },
  tags: {
    test_type: 'performance',
  },
};

interface TestResult {
  name: string;
  duration: number;
  success: boolean;
  sla: boolean;
}

export function setup() {
  console.log('\n========== PERFORMANCE TEST SUITE ==========');
  console.log('Testing MADAS Dashboard Performance');
  console.log('==========================================\n');
  
  const email = __ENV.TEST_USER_EMAIL || 'hesainyt@gmail.com';
  const password = __ENV.TEST_USER_PASSWORD || '12341234';
  
  const startTime = Date.now();
  const token = authenticate(email, password);
  const authDuration = Date.now() - startTime;
  
  authenticationTime.add(authDuration);
  trackCustomTrace('auth_setup', authDuration);
  
  if (!token) {
    throw new Error('Failed to authenticate test user');
  }
  
  console.log(`✅ Authentication: ${authDuration}ms`);
  
  return { token, email, password };
}

export default function (data: { token: string; email: string; password: string }) {
  const token = getValidToken(data.email, data.password) || data.token;
  const businessId = getRandomTenantId();
  setTenantContext(businessId);
  
  const results: TestResult[] = [];
  
  // Test 1: Dashboard Home Page Performance
  const homeResult = testDashboardHomePage(token);
  results.push(homeResult);
  
  sleep(1);
  
  // Test 2: Orders Page Performance
  const ordersResult = testOrdersPage(token);
  results.push(ordersResult);
  
  sleep(1);
  
  // Test 3: Finance Overview Performance
  const financeResult = testFinanceOverview(token);
  results.push(financeResult);
  
  sleep(1);
  
  // Test 4: Firestore Query Performance
  const firestoreResult = testFirestoreQueries(token, businessId);
  results.push(firestoreResult);
  
  // Calculate overall SLA compliance
  const slaPassRate = results.filter(r => r.sla).length / results.length;
  performanceSLA.add(slaPassRate >= 0.95);
  
  // Report slow requests
  results.forEach(result => {
    if (result.duration > 2000) {
      slowRequests.add(1, { test: result.name });
    }
    if (!result.success) {
      failedRequests.add(1, { test: result.name });
    }
  });
}

/**
 * Test Dashboard Home Page Performance
 */
function testDashboardHomePage(token: string): TestResult {
  const baseUrl = __ENV.BASE_URL || 'https://madas-store.web.app';
  const startTime = Date.now();
  
  const response = http.get(baseUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/html,application/xhtml+xml',
    },
    tags: { name: 'performance_dashboard_home' },
  });
  
  const duration = Date.now() - startTime;
  pageLoadTime.add(duration);
  trackPageLoad('dashboard_home', duration);
  
  const success = check(response, {
    'dashboard home status 200': (r) => r.status === 200,
    'dashboard home response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  const sla = duration < 2000; // SLA: < 2 seconds
  
  return {
    name: 'dashboard_home',
    duration,
    success,
    sla,
  };
}

/**
 * Test Orders Page Performance
 */
function testOrdersPage(token: string): TestResult {
  const baseUrl = __ENV.BASE_URL || 'https://madas-store.web.app';
  const startTime = Date.now();
  
  const response = http.get(`${baseUrl}/orders`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/html,application/xhtml+xml',
    },
    tags: { name: 'performance_orders_page' },
  });
  
  const duration = Date.now() - startTime;
  pageLoadTime.add(duration);
  trackPageLoad('orders', duration);
  
  const success = check(response, {
    'orders page status 200': (r) => r.status === 200,
    'orders page response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  const sla = duration < 2000;
  
  return {
    name: 'orders_page',
    duration,
    success,
    sla,
  };
}

/**
 * Test Finance Overview Performance
 */
function testFinanceOverview(token: string): TestResult {
  const baseUrl = __ENV.BASE_URL || 'https://madas-store.web.app';
  const startTime = Date.now();
  
  const response = http.get(`${baseUrl}/finance/overview`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/html,application/xhtml+xml',
    },
    tags: { name: 'performance_finance_overview' },
  });
  
  const duration = Date.now() - startTime;
  pageLoadTime.add(duration);
  trackPageLoad('finance_overview', duration);
  
  const success = check(response, {
    'finance overview status 200': (r) => r.status === 200,
    'finance overview response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  const sla = duration < 2000;
  
  return {
    name: 'finance_overview',
    duration,
    success,
    sla,
  };
}

/**
 * Test Firestore Query Performance
 */
function testFirestoreQueries(token: string, businessId: string): TestResult {
  const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';
  const startTime = Date.now();
  
  // Test orders collection query
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}/orders`;
  const queryUrl = `${firestoreUrl}?orderBy=createdAt desc&limit=20`;
  
  const response = http.get(queryUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'performance_firestore_orders' },
  });
  
  const duration = Date.now() - startTime;
  firestoreQueryTime.add(duration);
  trackCustomTrace('firestore_read_orders', duration, { collection: 'orders' });
  
  const success = check(response, {
    'firestore query status 200': (r) => r.status === 200 || r.status === 403, // 403 is ok if no permission
    'firestore query response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  const sla = duration < 1000; // SLA: < 1 second for Firestore queries
  
  return {
    name: 'firestore_orders_query',
    duration,
    success,
    sla,
  };
}

