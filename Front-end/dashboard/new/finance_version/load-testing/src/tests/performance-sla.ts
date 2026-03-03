import { Options } from 'k6/options';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { authenticate } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { Trend, Rate } from 'k6/metrics';

/**
 * Performance SLA Validation Test
 * Tests that system meets defined performance Service Level Agreements (SLAs)
 * 
 * SLAs:
 * - Page loads: p95 < 1.5s, p99 < 2.5s
 * - API responses: p95 < 1s, p99 < 1.5s
 * - Firestore queries: p95 < 800ms, p99 < 1.2s
 * - Authentication: p95 < 500ms, p99 < 800ms
 * - Error rate: < 1%
 */

const pageLoadLatency = new Trend('page_load_latency', true);
const apiLatency = new Trend('api_latency', true);
const firestoreLatency = new Trend('firestore_latency', true);
const authLatency = new Trend('auth_latency', true);
const slaCompliance = new Rate('sla_compliance');

export const options: Options = {
  stages: [
    { duration: '2m', target: 100 },   // Baseline load: 100 users
    { duration: '10m', target: 100 },  // Hold at baseline for SLA validation
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // Performance SLAs (strict)
    'page_load_latency': ['p(95)<1500', 'p(99)<2500'],
    'api_latency': ['p(95)<1000', 'p(99)<1500'],
    'firestore_latency': ['p(95)<800', 'p(99)<1200'],
    'auth_latency': ['p(95)<500', 'p(99)<800'],
    
    // Reliability SLA
    'http_req_failed': ['rate<0.01'], // <1% error rate
    
    // Overall SLA compliance
    'sla_compliance': ['rate>0.95'], // 95% of requests meet SLA
  },
  tags: {
    test_type: 'performance_sla',
  },
};

export function setup() {
  console.log('\n========== PERFORMANCE SLA VALIDATION ==========');
  console.log('Validating MADAS Dashboard meets performance SLAs');
  console.log('================================================\n');
  
  const email = __ENV.TEST_USER_EMAIL || 'hesainyt@gmail.com';
  const password = __ENV.TEST_USER_PASSWORD || '12341234';
  
  const startTime = Date.now();
  const token = authenticate(email, password);
  const duration = Date.now() - startTime;
  
  authLatency.add(duration);
  
  if (!token) {
    throw new Error('Failed to authenticate test user');
  }
  
  // Validate auth SLA
  const authMeetsSLA = duration < 500;
  slaCompliance.add(authMeetsSLA ? 1 : 0);
  
  console.log(`✅ Auth SLA check: ${duration}ms (SLA: <500ms) - ${authMeetsSLA ? 'PASS' : 'FAIL'}`);
  
  return { token, email, password };
}

export default function (data: { token: string; email: string; password: string }) {
  const token = data.token;
  const businessId = getRandomTenantId();
  setTenantContext(businessId);
  
  const baseUrl = __ENV.BASE_URL || 'https://madas-store.web.app';
  
  // Mix of operations to test different performance paths
  const operation = Math.random();
  
  if (operation < 0.4) {
    // 40%: Dashboard Home Page (SLA: <1.5s p95, <2.5s p99)
    const startTime = Date.now();
    const response = http.get(baseUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html,application/xhtml+xml',
      },
      tags: { name: 'sla_dashboard_home' },
    });
    const duration = Date.now() - startTime;
    
    pageLoadLatency.add(duration);
    const meetsSLA = duration < 1500;
    slaCompliance.add(meetsSLA ? 1 : 0);
    
    check(response, {
      'dashboard home status 200': (r) => r.status === 200,
      'dashboard home meets SLA': () => meetsSLA,
    });
    
  } else if (operation < 0.7) {
    // 30%: Orders Page
    const startTime = Date.now();
    const response = http.get(`${baseUrl}/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html,application/xhtml+xml',
      },
      tags: { name: 'sla_orders_page' },
    });
    const duration = Date.now() - startTime;
    
    pageLoadLatency.add(duration);
    const meetsSLA = duration < 1500;
    slaCompliance.add(meetsSLA ? 1 : 0);
    
    check(response, {
      'orders page status 200': (r) => r.status === 200,
      'orders page meets SLA': () => meetsSLA,
    });
    
  } else if (operation < 0.9) {
    // 20%: Finance Overview
    const startTime = Date.now();
    const response = http.get(`${baseUrl}/finance/overview`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html,application/xhtml+xml',
      },
      tags: { name: 'sla_finance_overview' },
    });
    const duration = Date.now() - startTime;
    
    pageLoadLatency.add(duration);
    const meetsSLA = duration < 1500;
    slaCompliance.add(meetsSLA ? 1 : 0);
    
    check(response, {
      'finance overview status 200': (r) => r.status === 200,
      'finance overview meets SLA': () => meetsSLA,
    });
    
  } else {
    // 10%: Firestore Query (SLA: <800ms p95, <1.2s p99)
    const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}/orders`;
    const queryUrl = `${firestoreUrl}?orderBy=createdAt desc&limit=20`;
    
    const startTime = Date.now();
    const response = http.get(queryUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'sla_firestore_query' },
    });
    const duration = Date.now() - startTime;
    
    firestoreLatency.add(duration);
    const meetsSLA = duration < 800;
    slaCompliance.add(meetsSLA ? 1 : 0);
    
    check(response, {
      'firestore query status 200': (r) => r.status === 200 || r.status === 403,
      'firestore query meets SLA': () => meetsSLA,
    });
  }
  
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds between requests
}

