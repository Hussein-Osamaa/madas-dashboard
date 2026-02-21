/**
 * Authentication Utilities
 * JWT token generation and validation (using Firebase Custom Tokens)
 */

import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { userService } from './rbacService';
import { getUserPermissions } from './permissions';
import type { User, JWTPayload, UserType } from '../types/rbac';

// In a real implementation, you would use Firebase Admin SDK to generate custom tokens
// For now, we'll create a simple token-like structure stored in localStorage
// In production, these should be generated server-side using Firebase Admin SDK

/**
 * Generate a custom token payload for authentication
 * In production, this should be done server-side using Firebase Admin SDK
 */
export async function generateAuthToken(user: User): Promise<string> {
  // Get user permissions
  const permissions = await getUserPermissions(user.role_id);

  const payload: JWTPayload = {
    user_id: user.id,
    email: user.email,
    tenant_id: user.tenant_id,
    role_id: user.role_id,
    type: user.type,
    permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  };

  // In production, this token should be signed server-side
  // For now, we'll store it as a base64-encoded JSON string
  const token = btoa(JSON.stringify(payload));
  return token;
}

/**
 * Decode and validate auth token
 */
export function decodeAuthToken(token: string): JWTPayload | null {
  try {
    const payload = JSON.parse(atob(token)) as JWTPayload;
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('[decodeAuthToken] Error:', error);
    return null;
  }
}

/**
 * Store auth token in localStorage
 */
export function storeAuthToken(token: string): void {
  localStorage.setItem('rbac_token', token);
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('rbac_token');
}

/**
 * Remove auth token from localStorage
 */
export function removeAuthToken(): void {
  localStorage.removeItem('rbac_token');
}

/**
 * Get current authenticated user from token
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;

  const payload = decodeAuthToken(token);
  if (!payload) return null;

  const user = await userService.getById(payload.user_id);
  return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;

  const payload = decodeAuthToken(token);
  if (!payload) return false;

  const user = await userService.getById(payload.user_id);
  return user !== null && user.status === 'active';
}

/**
 * Login with email and password
 * In production, this should verify password on server-side
 */
export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  // Find user by email
  const user = await userService.getByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Check user status
  if (user.status !== 'active') {
    throw new Error('User account is not active');
  }

  // In production, verify password hash here
  // For now, we'll skip password verification (should be done server-side)
  
  // Generate token
  const token = await generateAuthToken(user);

  // Update last login
  await userService.updateLastLogin(user.id);

  // Store token
  storeAuthToken(token);

  return { user, token };
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  removeAuthToken();
  
  // Also sign out from Firebase Auth if using it
  try {
    const auth = getAuth();
    await auth.signOut();
  } catch (error) {
    console.error('[logout] Firebase sign out error:', error);
  }
}

/**
 * Refresh auth token (regenerate with updated permissions)
 */
export async function refreshAuthToken(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const token = await generateAuthToken(user);
  storeAuthToken(token);
  return token;
}


