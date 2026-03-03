import http from 'k6/http';
import { check, sleep } from 'k6';
import { authHeader } from '../utils/auth';
import { getTenantHeaders, getTenantUrl, setTenantContext, getRandomTenantId } from '../utils/tenant';
import { recordDashboardLoad, recordApiRequest } from '../utils/metrics';
import { readDocument, listDocuments } from '../utils/firestore';

/**
 * Dashboard Load Scenario
 * Simulates loading a tenant dashboard with multiple collections
 * Tests parallel reads, pagination, and dashboard aggregation
 */

export function dashboardLoadScenario(token: string): void {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  const startTime = Date.now();
  
  // TODO: Replace with actual dashboard endpoint
  // This should load aggregated data from multiple collections
  const dashboardUrl = getTenantUrl('/api/dashboard', false);
  
  const headers = {
    ...authHeader(token),
    ...getTenantHeaders(),
  };
  
  const response = http.get(dashboardUrl, {
    headers,
    tags: { name: 'dashboard_load' },
  });
  
  const duration = Date.now() - startTime;
  recordDashboardLoad(duration);
  recordApiRequest(duration);
  
  check(response, {
    'dashboard status 200': (r) => r.status === 200,
    'dashboard response time < 2s': (r) => r.timings.duration < 2000,
    'dashboard has data': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return !!body.data || !!body.stats;
      } catch {
        return false;
      }
    },
  });
  
  sleep(1);
}

/**
 * Multi-Collection Load Scenario
 * Loads data from multiple collections in parallel (simulating dashboard widgets)
 */
export function multiCollectionLoadScenario(token: string): void {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  // Simulate loading multiple dashboard sections in parallel
  const collections = ['projects', 'orders', 'users', 'reports'];
  
  for (const collection of collections) {
    const startTime = Date.now();
    
    // Option 1: Via API endpoint
    const apiUrl = getTenantUrl(`/api/${collection}`, false);
    const headers = {
      ...authHeader(token),
      ...getTenantHeaders(),
    };
    
    const response = http.get(apiUrl, {
      headers,
      tags: { name: `dashboard_${collection}` },
    });
    
    const duration = Date.now() - startTime;
    recordApiRequest(duration, { collection });
    
    check(response, {
      [`${collection} status 200`]: (r) => r.status === 200,
    });
  }
  
  sleep(1);
}

/**
 * Paginated List Scenario
 * Tests pagination with large datasets
 */
export function paginatedListScenario(token: string, collection: string): void {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  let pageToken: string | undefined;
  let page = 0;
  const maxPages = 3; // Limit pages for load testing
  
  while (page < maxPages) {
    const startTime = Date.now();
    
    // Via API
    let apiUrl = getTenantUrl(`/api/${collection}`, false);
    const params: Record<string, string> = {
      pageSize: '20',
    };
    
    if (pageToken) {
      params.pageToken = pageToken;
    }
    
    const queryString = new URLSearchParams(params).toString();
    apiUrl += apiUrl.includes('?') ? `&${queryString}` : `?${queryString}`;
    
    const headers = {
      ...authHeader(token),
      ...getTenantHeaders(),
    };
    
    const response = http.get(apiUrl, {
      headers,
      tags: { name: `list_${collection}_page_${page}` },
    });
    
    const duration = Date.now() - startTime;
    recordApiRequest(duration, { collection, page: page.toString() });
    
    check(response, {
      [`${collection} page ${page} status 200`]: (r) => r.status === 200,
    });
    
    try {
      const body = JSON.parse(response.body as string);
      pageToken = body.nextPageToken;
      
      if (!pageToken || !body.items || body.items.length === 0) {
        break; // No more pages
      }
    } catch {
      break; // Invalid response
    }
    
    page++;
    sleep(0.5);
  }
}


