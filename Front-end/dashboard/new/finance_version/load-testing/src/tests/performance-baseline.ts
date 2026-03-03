import { Options } from 'k6/options';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { authenticate } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { Trend } from 'k6/metrics';

/**
 * Performance Baseline Test
 * Establishes baseline performance metrics for the system
 * Run this first to understand normal performance characteristics
 * 
 * Results from this test become the baseline for comparison
 */

const dashboardHomeLatency = new Trend('baseline_dashboard_home', true);
const ordersPageLatency = new Trend('baseline_orders_page', true);
const financeOverviewLatency = new Trend('baseline_finance_overview', true);
const firestoreQueryLatency = new Trend('baseline_firestore_query', true);

export const options: Options = {
  stages: [
    { duration: '1m', target: 10 },   // Low load: 10 users
    { duration: '5m', target: 10 },   // Hold at low load
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Baseline thresholds (relaxed - just measure, don't fail)
    'http_req_duration': ['p(95)<5000', 'p(99)<10000'],
    'http_req_failed': ['rate<0.05'],
  },
  tags: {
    test_type: 'performance_baseline',
  },
};

export function setup() {
  console.log('\n========== PERFORMANCE BASELINE TEST ==========');
  console.log('Establishing baseline performance metrics');
  console.log('This test measures normal system performance');
  console.log('===============================================\n');
  
  const email = __ENV.TEST_USER_EMAIL || 'hesainyt@gmail.com';
  const password = __ENV.TEST_USER_PASSWORD || '12341234';
  
  const token = authenticate(email, password);
  if (!token) {
    throw new Error('Failed to authenticate test user');
  }
  
  return { token, email, password };
}

export default function (data: { token: string; email: string; password: string }) {
  const token = data.token;
  const businessId = getRandomTenantId();
  setTenantContext(businessId);
  
  const baseUrl = __ENV.BASE_URL || 'https://madas-store.web.app';
  
  // Test 1: Dashboard Home
  const homeStart = Date.now();
  const homeResponse = http.get(baseUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/html,application/xhtml+xml',
    },
    tags: { name: 'baseline_dashboard_home' },
  });
  dashboardHomeLatency.add(Date.now() - homeStart);
  
  check(homeResponse, {
    'dashboard home baseline': (r) => r.status === 200,
  });
  
  sleep(1);
  
  // Test 2: Orders Page
  const ordersStart = Date.now();
  const ordersResponse = http.get(`${baseUrl}/orders`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/html,application/xhtml+xml',
    },
    tags: { name: 'baseline_orders_page' },
  });
  ordersPageLatency.add(Date.now() - ordersStart);
  
  check(ordersResponse, {
    'orders page baseline': (r) => ordersResponse.status === 200,
  });
  
  sleep(1);
  
  // Test 3: Finance Overview
  const financeStart = Date.now();
  const financeResponse = http.get(`${baseUrl}/finance/overview`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/html,application/xhtml+xml',
    },
    tags: { name: 'baseline_finance_overview' },
  });
  financeOverviewLatency.add(Date.now() - financeStart);
  
  check(financeResponse, {
    'finance overview baseline': (r) => financeResponse.status === 200,
  });
  
  sleep(1);
  
  // Test 4: Firestore Query
  const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}/orders`;
  const queryUrl = `${firestoreUrl}?orderBy=createdAt desc&limit=20`;
  
  const firestoreStart = Date.now();
  const firestoreResponse = http.get(queryUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'baseline_firestore_query' },
  });
  firestoreQueryLatency.add(Date.now() - firestoreStart);
  
  check(firestoreResponse, {
    'firestore query baseline': (r) => r.status === 200 || r.status === 403,
  });
  
  sleep(2);
}

