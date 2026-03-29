import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Analytics Traffic Generator for MADAS Dashboard
 * This script generates load test traffic to simulate user activity
 *
 * Usage:
 *   k6 run src/tests/analytics-traffic.js
 */

// Get configuration from environment
const targetUsers = parseInt(__ENV.TARGET_USERS || '50');
const duration = __ENV.DURATION || '30m';
const rampDuration = __ENV.RAMP_DURATION || '5m';
const baseUrl = __ENV.BASE_URL || 'https://madas-store.vercel.app';
const testEmail = __ENV.TEST_USER_EMAIL || 'test@example.com';
const testPassword = __ENV.TEST_USER_PASSWORD || 'testpassword';
const apiUrl = __ENV.API_URL || `${baseUrl}/api`;
const measurementId = __ENV.MEASUREMENT_ID || '';

export const options = {
  stages: [
    { duration: rampDuration, target: targetUsers },
    { duration: duration, target: targetUsers },
    { duration: rampDuration, target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.1'], // Allow up to 10% errors for analytics events
  },
  tags: {
    test_type: 'analytics_traffic',
  },
};

let cachedToken = null;
let tokenExpiry = 0;

export function setup() {
  console.log('\n========== ANALYTICS TRAFFIC GENERATOR ==========');
  console.log(`Target Users: ${targetUsers}`);
  console.log(`Duration: ${duration}`);
  console.log(`Measurement ID: ${measurementId}`);
  console.log(`API URL: ${apiUrl}`);
  console.log('Sending load test traffic to MADAS backend API');
  console.log('================================================\n');

  // Authenticate and get token via backend API
  const authEndpoint = `${apiUrl}/auth/login`;
  const authPayload = JSON.stringify({
    email: testEmail,
    password: testPassword,
  });

  const authResponse = http.post(authEndpoint, authPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (authResponse.status === 200) {
    const authData = JSON.parse(authResponse.body);
    cachedToken = authData.token || authData.accessToken;
    tokenExpiry = Date.now() + (55 * 60 * 1000);
    console.log('Authentication successful\n');
    return { token: cachedToken };
  } else {
    console.error('Authentication failed:', authResponse.status, authResponse.body);
    throw new Error('Failed to authenticate test user');
  }
}

/**
 * Send analytics event via Measurement Protocol (Google Analytics 4)
 * Note: This is a simplified version - actual GA4 requires more complex payload
 */
function sendAnalyticsEvent(eventName, params = {}) {
  // Google Analytics 4 Measurement Protocol API endpoint
  const apiSecret = __ENV.GA4_API_SECRET || ''; // Would need API secret from GA4
  
  if (!apiSecret) {
    // Fallback: Try to send via Firebase Analytics REST API
    // Firebase Analytics doesn't have a direct REST API, so we'll use
    // Firebase App Check or send events via the web app itself
    
    // For now, we'll just log that we would send the event
    console.log(`[ANALYTICS] Would send event: ${eventName}`, params);
    return true;
  }
  
  const endpoint = `https://www.google-analytics.com/mp/collect?api_secret=${apiSecret}&measurement_id=${measurementId}`;
  
  const payload = {
    client_id: `k6-${__VU}-${__ITER}`,
    events: [{
      name: eventName,
      params: {
        ...params,
        timestamp_micros: Date.now() * 1000,
      }
    }]
  };
  
  const response = http.post(endpoint, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'analytics_event' },
  });
  
  return response.status === 204 || response.status === 200;
}

/**
 * Visit page and trigger analytics by loading actual page
 * This makes a real HTTP request that will be tracked by Analytics
 */
function visitPage(url, pageName, token) {
  const response = http.get(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/html,application/xhtml+xml,application/xml',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    tags: { name: `analytics_${pageName}` },
  });
  
  check(response, {
    [`${pageName} page loaded`]: (r) => r.status === 200 || r.status === 304,
  });
  
  // Try to extract and execute analytics JavaScript if present
  // (This is a simplified version - full implementation would parse HTML)
  
  return response.status === 200 || response.status === 304;
}

export default function (data) {
  const token = data.token || cachedToken;
  const userId = `user_${__VU}_${__ITER}`;
  
  // Mix of operations to simulate real user behavior
  const operation = Math.random();
  
  if (operation < 0.3) {
    // 30%: Dashboard Home
    visitPage(baseUrl, 'dashboard_home', token);
    sendAnalyticsEvent('page_view', {
      page_title: 'Dashboard Home',
      page_location: baseUrl,
      page_path: '/',
    });
    
  } else if (operation < 0.5) {
    // 20%: Orders Page
    visitPage(`${baseUrl}/orders`, 'orders', token);
    sendAnalyticsEvent('page_view', {
      page_title: 'Orders',
      page_location: `${baseUrl}/orders`,
      page_path: '/orders',
    });
    
  } else if (operation < 0.7) {
    // 20%: Finance Overview
    visitPage(`${baseUrl}/finance/overview`, 'finance_overview', token);
    sendAnalyticsEvent('page_view', {
      page_title: 'Finance Overview',
      page_location: `${baseUrl}/finance/overview`,
      page_path: '/finance/overview',
    });
    
  } else if (operation < 0.85) {
    // 15%: Products Page
    visitPage(`${baseUrl}/products`, 'products', token);
    sendAnalyticsEvent('page_view', {
      page_title: 'Products',
      page_location: `${baseUrl}/products`,
      page_path: '/products',
    });
    
  } else {
    // 15%: Settings Page
    visitPage(`${baseUrl}/settings`, 'settings', token);
    sendAnalyticsEvent('page_view', {
      page_title: 'Settings',
      page_location: `${baseUrl}/settings`,
      page_path: '/settings',
    });
  }
  
  // Send custom events occasionally
  if (Math.random() < 0.2) {
    sendAnalyticsEvent('user_engagement', {
      engagement_time_msec: Math.floor(Math.random() * 5000) + 1000,
    });
  }
  
  // Random sleep to simulate realistic user behavior (1-5 seconds)
  sleep(Math.random() * 4 + 1);
}

