import { Options } from 'k6/options';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { authenticate, getValidToken } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';

/**
 * Traffic Generator for MADAS Dashboard
 * Generates continuous traffic on the system
 * 
 * Usage:
 *   k6 run src/tests/traffic-generator.ts
 * 
 * To adjust load:
 *   - Set TARGET_USERS env var (default: 50)
 *   - Set DURATION env var (default: 30m)
 *   - Set RAMP_DURATION env var (default: 5m)
 */

const targetUsers = parseInt(__ENV.TARGET_USERS || '50');
const duration = __ENV.DURATION || '30m';
const rampDuration = __ENV.RAMP_DURATION || '5m';

export const options: Options = {
  stages: [
    { duration: rampDuration, target: targetUsers }, // Ramp up
    { duration: duration, target: targetUsers },     // Hold steady
    { duration: rampDuration, target: 0 },           // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.05'], // Allow up to 5% errors during traffic generation
  },
  tags: {
    test_type: 'traffic_generator',
  },
};

export function setup() {
  console.log('\n========== TRAFFIC GENERATOR ==========');
  console.log(`Target Users: ${targetUsers}`);
  console.log(`Duration: ${duration}`);
  console.log(`Ramp Duration: ${rampDuration}`);
  console.log('Generating continuous traffic on MADAS Dashboard');
  console.log('========================================\n');
  
  const email = __ENV.TEST_USER_EMAIL || 'hesainyt@gmail.com';
  const password = __ENV.TEST_USER_PASSWORD || '12341234';
  
  const token = authenticate(email, password);
  
  if (!token) {
    throw new Error('Failed to authenticate test user');
  }
  
  return { token, email, password };
}

export default function (data: { token: string; email: string; password: string }) {
  const token = getValidToken(data.email, data.password) || data.token;
  const businessId = getRandomTenantId();
  setTenantContext(businessId);
  
  const baseUrl = __ENV.BASE_URL || 'https://madas-store.web.app';
  
  // Mix of operations to simulate real user behavior
  const operation = Math.random();
  
  if (operation < 0.3) {
    // 30%: Dashboard Home
    const response = http.get(baseUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html,application/xhtml+xml',
      },
      tags: { name: 'traffic_dashboard_home' },
    });
    
    check(response, {
      'dashboard home status': (r) => r.status === 200 || r.status === 302 || r.status === 304,
    });
    
  } else if (operation < 0.5) {
    // 20%: Orders Page
    const response = http.get(`${baseUrl}/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html,application/xhtml+xml',
      },
      tags: { name: 'traffic_orders_page' },
    });
    
    check(response, {
      'orders page status': (r) => r.status === 200 || r.status === 302 || r.status === 304,
    });
    
  } else if (operation < 0.7) {
    // 20%: Finance Overview
    const response = http.get(`${baseUrl}/finance/overview`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html,application/xhtml+xml',
      },
      tags: { name: 'traffic_finance_overview' },
    });
    
    check(response, {
      'finance overview status': (r) => r.status === 200 || r.status === 302 || r.status === 304,
    });
    
  } else if (operation < 0.9) {
    // 20%: Firestore Orders Query
    const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}/orders`;
    const queryUrl = `${firestoreUrl}?orderBy=createdAt desc&limit=20`;
    
    const response = http.get(queryUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'traffic_firestore_orders' },
    });
    
    check(response, {
      'firestore query status': (r) => r.status === 200 || r.status === 403,
    });
    
  } else {
    // 10%: Firestore Transactions Query
    const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}/transactions`;
    const queryUrl = `${firestoreUrl}?orderBy=createdAt desc&limit=20`;
    
    const response = http.get(queryUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'traffic_firestore_transactions' },
    });
    
    check(response, {
      'firestore transactions query status': (r) => r.status === 200 || r.status === 403,
    });
  }
  
  // Random sleep to simulate realistic user behavior (1-5 seconds)
  sleep(Math.random() * 4 + 1);
}

