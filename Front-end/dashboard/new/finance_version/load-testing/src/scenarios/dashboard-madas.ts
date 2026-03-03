import http from 'k6/http';
import { check, sleep } from 'k6';
import { authHeader } from '../utils/auth';
import { setTenantContext, getRandomTenantId, getTenantHeaders } from '../utils/tenant';
import { recordDashboardLoad, recordApiRequest } from '../utils/metrics';
import { env } from '../../k6.config';

/**
 * MADAS Dashboard Specific Scenarios
 * Tests actual dashboard pages and Firestore collections used by the app
 */

/**
 * Load Dashboard Home Page
 * Simulates loading the main dashboard with stats and tasks
 */
export function dashboardHomeScenario(token: string, businessId: string): void {
  setTenantContext(businessId);
  
  const startTime = Date.now();
  
  // Load the dashboard home page (client-side React app)
  const dashboardUrl = `${env.baseUrl}/`;
  
  const headers = {
    ...authHeader(token),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  
  const response = http.get(dashboardUrl, {
    headers,
    tags: { name: 'dashboard_home' },
  });
  
  const duration = Date.now() - startTime;
  recordDashboardLoad(duration);
  recordApiRequest(duration);
  
  check(response, {
    'dashboard home status 200': (r) => r.status === 200,
    'dashboard home has HTML': (r) => r.body && r.body.includes('<!DOCTYPE html>'),
    'dashboard response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  sleep(1);
}

/**
 * Load Orders Page
 * Tests the orders page which loads orders sub-collection
 */
export function ordersPageScenario(token: string, businessId: string): void {
  setTenantContext(businessId);
  
  const startTime = Date.now();
  
  const ordersUrl = `${env.baseUrl}/orders`;
  
  const headers = {
    ...authHeader(token),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  
  const response = http.get(ordersUrl, {
    headers,
    tags: { name: 'orders_page' },
  });
  
  const duration = Date.now() - startTime;
  recordDashboardLoad(duration, { page: 'orders' });
  recordApiRequest(duration);
  
  check(response, {
    'orders page status 200': (r) => r.status === 200,
  });
  
  sleep(1);
}

/**
 * Load Finance Overview Page
 * Tests finance dashboard with transactions and payments
 */
export function financeOverviewScenario(token: string, businessId: string): void {
  setTenantContext(businessId);
  
  const startTime = Date.now();
  
  const financeUrl = `${env.baseUrl}/finance/overview`;
  
  const headers = {
    ...authHeader(token),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  
  const response = http.get(financeUrl, {
    headers,
    tags: { name: 'finance_overview' },
  });
  
  const duration = Date.now() - startTime;
  recordDashboardLoad(duration, { page: 'finance_overview' });
  recordApiRequest(duration);
  
  check(response, {
    'finance overview status 200': (r) => r.status === 200,
  });
  
  sleep(1);
}

/**
 * Firestore: Load Orders Collection
 * Direct Firestore REST API call to load orders for a business
 */
export function loadOrdersCollection(token: string, businessId: string): void {
  const startTime = Date.now();
  
  const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}/orders`;
  
  // Add query parameters for date range (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const queryParams = new URLSearchParams({
    'orderBy': 'createdAt desc',
    'limit': '50',
  });
  
  const url = `${firestoreUrl}?${queryParams.toString()}`;
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const response = http.get(url, {
    headers,
    tags: { name: 'firestore_orders' },
  });
  
  const duration = Date.now() - startTime;
  recordApiRequest(duration, { collection: 'orders' });
  
  check(response, {
    'firestore orders status 200': (r) => r.status === 200,
  });
}

/**
 * Firestore: Load Transactions Collection
 * Direct Firestore REST API call to load transactions for a business
 */
export function loadTransactionsCollection(token: string, businessId: string): void {
  const startTime = Date.now();
  
  const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}/transactions`;
  
  const queryParams = new URLSearchParams({
    'orderBy': 'createdAt desc',
    'limit': '50',
  });
  
  const url = `${firestoreUrl}?${queryParams.toString()}`;
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const response = http.get(url, {
    headers,
    tags: { name: 'firestore_transactions' },
  });
  
  const duration = Date.now() - startTime;
  recordApiRequest(duration, { collection: 'transactions' });
  
  check(response, {
    'firestore transactions status 200': (r) => r.status === 200,
  });
}

/**
 * Firestore: Load Products Collection
 * Direct Firestore REST API call to load products for a business
 */
export function loadProductsCollection(token: string, businessId: string): void {
  const startTime = Date.now();
  
  const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${businessId}/products`;
  
  const queryParams = new URLSearchParams({
    'orderBy': 'name asc',
    'limit': '100',
  });
  
  const url = `${firestoreUrl}?${queryParams.toString()}`;
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const response = http.get(url, {
    headers,
    tags: { name: 'firestore_products' },
  });
  
  const duration = Date.now() - startTime;
  recordApiRequest(duration, { collection: 'products' });
  
  check(response, {
    'firestore products status 200': (r) => r.status === 200,
  });
}

/**
 * Comprehensive Dashboard Load
 * Simulates a full user session loading multiple pages and collections
 */
export function fullDashboardSessionScenario(token: string, businessId: string): void {
  setTenantContext(businessId);
  
  // 1. Load dashboard home
  dashboardHomeScenario(token, businessId);
  sleep(0.5);
  
  // 2. Load orders page
  ordersPageScenario(token, businessId);
  sleep(0.5);
  
  // 3. Load finance overview
  financeOverviewScenario(token, businessId);
  sleep(0.5);
  
  // 4. Load Firestore collections (simulating React Query hooks)
  loadOrdersCollection(token, businessId);
  sleep(0.3);
  
  loadTransactionsCollection(token, businessId);
  sleep(0.3);
  
  loadProductsCollection(token, businessId);
}


