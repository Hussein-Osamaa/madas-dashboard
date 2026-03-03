import http from 'k6/http';
import { check, sleep } from 'k6';
import { authenticate, getValidToken, authHeader } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { recordAuthError, recordApiRequest } from '../utils/metrics';

/**
 * Authentication Scenario
 * Tests login flow, token refresh, and authenticated requests
 */

export function authScenario(email: string, password: string): void {
  const startTime = Date.now();
  
  // Authenticate and get token
  const token = authenticate(email, password);
  
  if (!token) {
    recordAuthError();
    return;
  }
  
  // Set tenant context (random tenant for this test)
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  // Verify token works with authenticated request
  const testUrl = `${__ENV.BASE_URL || '{{BASE_URL}}'}/api/me`;
  const headers = {
    ...authHeader(token),
    'Content-Type': 'application/json',
  };
  
  const response = http.get(testUrl, {
    headers,
    tags: { name: 'auth_verify' },
  });
  
  const duration = Date.now() - startTime;
  recordApiRequest(duration);
  
  check(response, {
    'auth verification status 200': (r) => r.status === 200,
    'auth verification has user data': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return !!body.user || !!body.email;
      } catch {
        return false;
      }
    },
  });
  
  sleep(1);
}

/**
 * Token Refresh Scenario
 * Tests token refresh flow
 */
export function tokenRefreshScenario(email: string, password: string): void {
  // Get initial token
  const token = getValidToken(email, password);
  
  if (!token) {
    recordAuthError();
    return;
  }
  
  // TODO: Implement token refresh test
  // This would typically involve:
  // 1. Getting refresh token during login
  // 2. Calling refresh endpoint
  // 3. Verifying new token works
  
  sleep(1);
}


