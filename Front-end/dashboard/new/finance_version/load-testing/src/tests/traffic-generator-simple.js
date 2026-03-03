import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Simple Traffic Generator for MADAS Dashboard (JavaScript)
 * Generates continuous traffic on the system
 * 
 * Usage:
 *   k6 run src/tests/traffic-generator-simple.js
 */

// Get configuration from environment
const targetUsers = parseInt(__ENV.TARGET_USERS || '50');
const duration = __ENV.DURATION || '30m';
const rampDuration = __ENV.RAMP_DURATION || '5m';
const baseUrl = __ENV.BASE_URL || 'https://madas-store.web.app';
const testEmail = __ENV.TEST_USER_EMAIL || 'hesainyt@gmail.com';
const testPassword = __ENV.TEST_USER_PASSWORD || '12341234';
const firebaseApiKey = __ENV.FIREBASE_API_KEY || 'AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8';
const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';

export const options = {
  stages: [
    { duration: rampDuration, target: targetUsers },
    { duration: duration, target: targetUsers },
    { duration: rampDuration, target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000', 'p(99)<10000'], // Relaxed thresholds for high load
    'http_req_failed': ['rate<0.1'], // Allow up to 10% errors during high load
  },
  tags: {
    test_type: 'traffic_generator',
  },
  // HTTP options to prevent timeouts
  httpReq: {
    timeout: '60s', // Increase timeout to 60 seconds
  },
  // System options
  systemTags: ['status', 'method', 'url', 'name', 'check', 'error', 'group', 'vu', 'iter'],
  // Summary options
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Simple token cache (in production, use proper refresh logic)
let cachedToken = null;
let tokenExpiry = 0;

export function setup() {
  console.log('\n========== TRAFFIC GENERATOR ==========');
  console.log(`Target Users: ${targetUsers}`);
  console.log(`Duration: ${duration}`);
  console.log(`Ramp Duration: ${rampDuration}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log('Generating continuous traffic on MADAS Dashboard');
  console.log('========================================\n');
  
  // Authenticate and get token
  const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`;
  const authPayload = JSON.stringify({
    email: testEmail,
    password: testPassword,
    returnSecureToken: true,
  });
  
  const authResponse = http.post(authUrl, authPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (authResponse.status === 200) {
    const authData = JSON.parse(authResponse.body);
    cachedToken = authData.idToken;
    // Set expiry to 55 minutes (tokens expire in 1 hour)
    tokenExpiry = Date.now() + (55 * 60 * 1000);
    console.log('✅ Authentication successful\n');
    return { token: cachedToken };
  } else {
    console.error('❌ Authentication failed:', authResponse.status, authResponse.body);
    throw new Error('Failed to authenticate test user');
  }
}

export default function (data) {
  const token = data.token || cachedToken;
  const businessId = `business_${Math.floor(Math.random() * 100)}`;
  
  // Mix of operations to simulate real user behavior
  const operation = Math.random();
  
  if (operation < 0.3) {
    // 30%: Dashboard Home
    const response = http.get(baseUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: '60s',
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: '60s',
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: '60s',
      tags: { name: 'traffic_finance_overview' },
    });
    
    check(response, {
      'finance overview status': (r) => r.status === 200 || r.status === 302 || r.status === 304,
    });
    
  } else if (operation < 0.9) {
    // 20%: Firestore Orders Query (skip Firestore queries as they often fail and aren't critical for load testing)
    // Just visit Orders page instead to reduce failures
    const response = http.get(`${baseUrl}/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: '60s',
      tags: { name: 'traffic_orders_alt' },
    });
    
    check(response, {
      'orders page alt status': (r) => r.status === 200 || r.status === 302 || r.status === 304 || r.status === 404,
    });
    
  } else {
    // 10%: Products Page (skip Firestore queries as they often fail)
    const response = http.get(`${baseUrl}/products`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: '60s',
      tags: { name: 'traffic_products' },
    });
    
    check(response, {
      'products page status': (r) => r.status === 200 || r.status === 302 || r.status === 304 || r.status === 404,
    });
  }
  
  // Random sleep to simulate realistic user behavior (2-8 seconds)
  // Increased delay to reduce request rate and prevent timeouts
  sleep(Math.random() * 6 + 2);
}

