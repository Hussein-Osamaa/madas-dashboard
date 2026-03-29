import http from 'k6/http';
import { check } from 'k6';
import { apiThrottleRate, errorRate } from '../../k6.config';
import { env } from '../../k6.config';

/**
 * JWT Auth Token Manager
 * Handles authentication, token refresh, and token caching per VU
 */

interface AuthToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

interface LoginResponse {
  token?: string;
  accessToken?: string;
  expiresIn?: number; // seconds
  error?: string;
}

// Per-VU token cache
const tokenCache: Map<string, AuthToken> = new Map();

/**
 * Authenticate with backend JWT REST API
 * Returns cached token if still valid, otherwise fetches new token
 *
 * @param email - User email
 * @param password - User password
 * @param cacheKey - Optional cache key (defaults to email)
 * @returns JWT access token
 */
export function authenticate(
  email: string,
  password: string,
  cacheKey?: string
): string | null {
  const key = cacheKey || email;
  const cached = tokenCache.get(key);

  // Return cached token if still valid (with 5 min buffer)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.accessToken;
  }

  const apiUrl = __ENV.API_URL || env.apiUrl;
  if (!apiUrl) {
    console.error('[AUTH] API_URL not set');
    return null;
  }

  const authUrl = `${apiUrl}/auth/login`;

  const payload = JSON.stringify({
    email,
    password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'auth_login' },
  };

  const response = http.post(authUrl, payload, params);

  const success = check(response, {
    'auth status is 200': (r) => r.status === 200,
    'auth has token': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return !!body.token || !!body.accessToken;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
    console.error(`[AUTH] Login failed: ${response.status} - ${response.body}`);
    return null;
  }

  try {
    const body: LoginResponse = JSON.parse(response.body as string);

    if (body.error) {
      errorRate.add(1);
      console.error(`[AUTH] Error: ${body.error}`);
      return null;
    }

    const accessToken = body.token || body.accessToken || '';
    const expiresIn = body.expiresIn || 3600; // Default 1 hour

    const token: AuthToken = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    tokenCache.set(key, token);
    return accessToken;
  } catch (e) {
    errorRate.add(1);
    console.error(`[AUTH] Failed to parse response: ${e}`);
    return null;
  }
}

/**
 * Get valid token for a user
 * Attempts to use cached token, re-authenticates if expired
 *
 * @param email - User email
 * @param password - User password
 * @returns Valid JWT token or null
 */
export function getValidToken(email: string, password: string): string | null {
  const key = email;
  const cached = tokenCache.get(key);

  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.accessToken;
  }

  // Re-authenticate
  return authenticate(email, password, key);
}

/**
 * Clear token cache (useful for isolation tests)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Create authorization header with Bearer token
 *
 * @param token - JWT access token
 * @returns Header object with Authorization
 */
export function authHeader(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
  };
}
