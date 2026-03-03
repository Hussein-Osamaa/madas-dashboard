import { env } from '../../k6.config';

/**
 * Tenant Context Helper
 * Manages tenant-scoped headers, query parameters, and isolation
 */

interface TenantContext {
  tenantId: string;
  role?: 'super_admin' | 'tenant_admin' | 'staff' | 'client_staff';
}

// Per-VU tenant context
let currentTenant: TenantContext | null = null;

/**
 * Set the current tenant context for this VU
 * 
 * @param tenantId - Tenant ID
 * @param role - Optional role
 */
export function setTenantContext(tenantId: string, role?: TenantContext['role']): void {
  currentTenant = { tenantId, role };
}

/**
 * Get the current tenant context
 * 
 * @returns Current tenant context or null
 */
export function getTenantContext(): TenantContext | null {
  return currentTenant;
}

/**
 * Get tenant-scoped headers for API requests
 * Includes tenant ID in header (common pattern for multi-tenant APIs)
 * 
 * @param additionalHeaders - Optional additional headers
 * @returns Headers object with tenant context
 */
export function getTenantHeaders(
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
  
  if (currentTenant) {
    // MADAS Dashboard uses businessId in Firestore path, not headers
    // Headers mainly for REST API if needed, but Firestore queries use path structure
    // For REST API compatibility, we still include it in headers
    headers['X-Business-ID'] = currentTenant.tenantId;
    headers['X-Tenant-ID'] = currentTenant.tenantId; // Alias for compatibility
  }
  
  return headers;
}

/**
 * Get tenant-scoped query parameters
 * Useful for Firestore queries or REST API filtering
 * 
 * @param baseParams - Base query parameters
 * @returns Query parameters with tenant filter
 */
export function getTenantQueryParams(
  baseParams?: Record<string, string>
): Record<string, string> {
  const params: Record<string, string> = {
    ...baseParams,
  };
  
  if (currentTenant) {
    // Add business/tenant filter to query
    params['businessId'] = currentTenant.tenantId;
    params['tenantId'] = currentTenant.tenantId; // Alias for compatibility
  }
  
  return params;
}

/**
 * Build tenant-scoped URL
 * Adds tenant context to URL path or query
 * 
 * @param basePath - Base API path (e.g., '/api/projects')
 * @param usePathParam - If true, adds tenantId to path, otherwise to query
 * @returns Full URL with tenant context
 */
export function getTenantUrl(basePath: string, usePathParam = false): string {
  if (!currentTenant) {
    return `${env.baseUrl}${basePath}`;
  }
  
  if (usePathParam) {
    // MADAS Dashboard uses client-side routing, but for REST API compatibility:
    // Pattern: /api/businesses/{businessId}/orders
    return `${env.baseUrl}/api/businesses/${currentTenant.tenantId}${basePath}`;
  } else {
    // Pattern: /api/orders?businessId={businessId}
    const separator = basePath.includes('?') ? '&' : '?';
    return `${env.baseUrl}${basePath}${separator}businessId=${currentTenant.tenantId}`;
  }
}

/**
 * Parse tenant IDs from environment variable
 * 
 * @returns Array of tenant IDs
 */
export function getTestTenantIds(): string[] {
  const tenantIdsEnv = __ENV.TENANT_IDS || '';
  if (!tenantIdsEnv) {
    console.warn('[TENANT] TENANT_IDS not set, using placeholder');
    return ['{{TENANT_ID_A}}', '{{TENANT_ID_B}}'];
  }
  
  return tenantIdsEnv.split(',').map(id => id.trim()).filter(Boolean);
}

/**
 * Get a random tenant ID from test tenants
 * Useful for distributing load across tenants
 * 
 * @returns Random tenant ID
 */
export function getRandomTenantId(): string {
  const tenants = getTestTenantIds();
  if (tenants.length === 0) {
    return '{{TENANT_ID_A}}';
  }
  
  return tenants[Math.floor(Math.random() * tenants.length)];
}

/**
 * Clear tenant context (useful for isolation tests)
 */
export function clearTenantContext(): void {
  currentTenant = null;
}

