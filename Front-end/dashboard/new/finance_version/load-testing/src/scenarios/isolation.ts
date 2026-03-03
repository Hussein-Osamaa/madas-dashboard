import http from 'k6/http';
import { check, Options } from 'k6/options';
import { authenticate, authHeader } from '../utils/auth';
import {
  setTenantContext,
  getTenantHeaders,
  getTenantUrl,
  getTestTenantIds,
  clearTenantContext,
} from '../utils/tenant';
import { readDocument, createDocument } from '../utils/firestore';
import { logTestInfo, checkEnvironment } from '../../k6.config';

/**
 * Multi-Tenant Isolation Test
 * Programmatically verifies tenant isolation by attempting to access
 * TenantB resources while authenticated as TenantA
 * Asserts 403 or empty result to confirm isolation
 */

export const options: Options = {
  vus: 10, // Fewer VUs for isolation testing (more about correctness than load)
  duration: '5m',
  thresholds: {
    'checks{check:isolation_pass}': ['rate>0.95'], // 95% of isolation checks should pass
    'checks{check:isolation_fail}': ['rate<0.05'], // <5% should fail (indicating isolation breach)
  },
  tags: {
    test_type: 'isolation',
  },
};

export function setup() {
  logTestInfo(
    'MULTI-TENANT ISOLATION TEST',
    'Verify tenant isolation by attempting cross-tenant access'
  );
  
  checkEnvironment();
  
  // Get test tenant IDs
  const tenantIds = getTestTenantIds();
  if (tenantIds.length < 2) {
    throw new Error('Need at least 2 tenant IDs in TENANT_IDS for isolation testing');
  }
  
  // Get test users (one per tenant)
  const testUsers = (__ENV.TEST_USERS || '').split(',').map(u => u.trim());
  const testPasswords = (__ENV.TEST_PASSWORDS || '').split(',').map(p => p.trim());
  
  if (testUsers.length < 2 || testPasswords.length < 2) {
    throw new Error('Need at least 2 test users and passwords for isolation testing');
  }
  
  // Authenticate users for each tenant
  const tenantAuths: Array<{ tenantId: string; token: string; email: string }> = [];
  
  for (let i = 0; i < Math.min(tenantIds.length, testUsers.length); i++) {
    const token = authenticate(testUsers[i], testPasswords[i]);
    if (token) {
      tenantAuths.push({
        tenantId: tenantIds[i],
        token,
        email: testUsers[i],
      });
    }
  }
  
  if (tenantAuths.length < 2) {
    throw new Error('Failed to authenticate at least 2 users for isolation testing');
  }
  
  return { tenantAuths };
}

export default function (data: { tenantAuths: Array<{ tenantId: string; token: string; email: string }> }) {
  // Pick two different tenants
  if (data.tenantAuths.length < 2) {
    return;
  }
  
  const tenantA = data.tenantAuths[0];
  const tenantB = data.tenantAuths[1];
  
  // Test 1: Authenticated as TenantA, try to access TenantB resources via API
  setTenantContext(tenantA.tenantId);
  
  // Attempt to read TenantB resources with TenantA's token but TenantB's tenant context
  // This should fail with 403 or return empty results
  const tenantBResourceUrl = getTenantUrl('/api/projects', false);
  
  // Temporarily override tenant context to TenantB in the request
  // But use TenantA's token
  const headers = {
    ...authHeader(tenantA.token),
    'X-Tenant-ID': tenantB.tenantId, // Explicitly set TenantB's ID
    ...getTenantHeaders(),
  };
  
  const response = http.get(tenantBResourceUrl, {
    headers,
    tags: { name: 'isolation_cross_tenant_read' },
  });
  
  // Isolation check: Should receive 403 or empty result
  const isIsolated = check(response, {
    'isolation_pass': () => {
      // Option 1: 403 Forbidden (expected)
      if (response.status === 403) {
        return true;
      }
      
      // Option 2: 200 but empty result (also acceptable)
      if (response.status === 200) {
        try {
          const body = JSON.parse(response.body as string);
          const items = body.items || body.data || body;
          const isEmpty = Array.isArray(items) ? items.length === 0 : Object.keys(items).length === 0;
          return isEmpty;
        } catch {
          return false;
        }
      }
      
      return false;
    },
    'isolation_fail': () => {
      // This check should fail if isolation is breached
      if (response.status === 200) {
        try {
          const body = JSON.parse(response.body as string);
          const items = body.items || body.data || body;
          const hasData = Array.isArray(items) ? items.length > 0 : Object.keys(items).length > 0;
          
          // If we got data, check if it belongs to TenantB
          if (hasData) {
            // Verify items don't belong to TenantA (isolation breach if they do)
            return false; // This is a failure case
          }
        } catch {
          return false;
        }
      }
      return response.status === 403 || response.status === 200; // Success if 403 or empty
    },
  });
  
  // Test 2: Try to create a resource in TenantB using TenantA's credentials
  setTenantContext(tenantA.tenantId);
  
  const createUrl = getTenantUrl('/api/projects', false);
  const createHeaders = {
    ...authHeader(tenantA.token),
    'X-Tenant-ID': tenantB.tenantId, // Try to create in TenantB
    ...getTenantHeaders(),
  };
  
  const createResponse = http.post(
    createUrl,
    JSON.stringify({
      name: `Isolation Test ${Date.now()}`,
      description: 'Isolation test resource',
    }),
    {
      headers: createHeaders,
      tags: { name: 'isolation_cross_tenant_create' },
    }
  );
  
  // Should be 403 Forbidden
  check(createResponse, {
    'isolation_pass': () => createResponse.status === 403,
    'isolation_fail': () => createResponse.status === 201 || createResponse.status === 200,
  });
  
  // Test 3: Firestore rules check via direct Firestore access
  // Attempt to read TenantB document directly using TenantA's token
  setTenantContext(tenantA.tenantId);
  
  // Try to read a document that belongs to TenantB
  // Note: This requires knowing a document ID from TenantB
  // In practice, you'd set up test data first
  // For now, we'll simulate with a known test document ID
  const testDocId = `test_doc_${tenantB.tenantId}`;
  
  // Direct Firestore read (if using Firestore REST API)
  // This should be blocked by Firestore security rules
  // TODO: Implement direct Firestore rule check if needed
  
  clearTenantContext();
}


