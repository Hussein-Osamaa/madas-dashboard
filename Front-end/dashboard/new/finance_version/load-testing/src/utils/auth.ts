import http from 'k6/http';
import { check } from 'k6';
import { firestoreThrottleRate, errorRate } from '../../k6.config';
import { env } from '../../k6.config';

/**
 * Firebase Auth Token Manager
 * Handles authentication, token refresh, and token caching per VU
 */

interface AuthToken {
  idToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

interface LoginResponse {
  idToken?: string;
  refreshToken?: string;
  expiresIn?: string; // e.g., "3600"
  error?: {
    message: string;
    code: number;
  };
}

// Per-VU token cache
const tokenCache: Map<string, AuthToken> = new Map();

/**
 * Authenticate with Firebase Auth REST API
 * Returns cached token if still valid, otherwise fetches new token
 * 
 * @param email - User email
 * @param password - User password
 * @param cacheKey - Optional cache key (defaults to email)
 * @returns Firebase ID token
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
    return cached.idToken;
  }
  
  const apiKey = __ENV.FIREBASE_API_KEY || env.firebaseApiKey;
  if (!apiKey) {
    console.error('[AUTH] FIREBASE_API_KEY not set');
    return null;
  }
  
  // Firebase Auth REST API endpoint
  const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  
  const payload = JSON.stringify({
    email,
    password,
    returnSecureToken: true,
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
    'auth has idToken': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return !!body.idToken || !!body.token;
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
      console.error(`[AUTH] Firebase error: ${body.error.message}`);
      return null;
    }
    
    const idToken = body.idToken || (body as any).token;
    const refreshToken = body.refreshToken || '';
    const expiresIn = body.expiresIn ? parseInt(body.expiresIn) : 3600; // Default 1 hour
    
    const token: AuthToken = {
      idToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    
    tokenCache.set(key, token);
    return idToken;
  } catch (e) {
    errorRate.add(1);
    console.error(`[AUTH] Failed to parse response: ${e}`);
    return null;
  }
}

/**
 * Refresh Firebase token using refresh token
 * 
 * @param refreshToken - Firebase refresh token
 * @param cacheKey - Cache key to update
 * @returns New ID token or null
 */
export function refreshToken(refreshToken: string, cacheKey: string): string | null {
  const apiKey = __ENV.FIREBASE_API_KEY || env.firebaseApiKey;
  if (!apiKey) {
    return null;
  }
  
  // Firebase token refresh endpoint
  const refreshUrl = `https://securetoken.googleapis.com/v1/token?key=${apiKey}`;
  
  const payload = JSON.stringify({
    refreshToken,
    grant_type: 'refresh_token',
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'auth_refresh' },
  };
  
  const response = http.post(refreshUrl, payload, params);
  
  if (response.status !== 200) {
    errorRate.add(1);
    return null;
  }
  
  try {
    const body: LoginResponse = JSON.parse(response.body as string);
    const idToken = body.idToken || (body as any).token;
    const expiresIn = body.expiresIn ? parseInt(body.expiresIn) : 3600;
    
    const token: AuthToken = {
      idToken,
      refreshToken: body.refreshToken || refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    
    tokenCache.set(cacheKey, token);
    return idToken;
  } catch {
    errorRate.add(1);
    return null;
  }
}

/**
 * Get or refresh token for a user
 * Attempts to use cached token, refreshes if expired, or re-authenticates if needed
 * 
 * @param email - User email
 * @param password - User password
 * @returns Valid ID token or null
 */
export function getValidToken(email: string, password: string): string | null {
  const key = email;
  const cached = tokenCache.get(key);
  
  if (cached) {
    // Token still valid
    if (cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      return cached.idToken;
    }
    
    // Try to refresh if we have refresh token
    if (cached.refreshToken) {
      const newToken = refreshToken(cached.refreshToken, key);
      if (newToken) {
        return newToken;
      }
    }
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
 * @param token - Firebase ID token
 * @returns Header object with Authorization
 */
export function authHeader(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
  };
}

