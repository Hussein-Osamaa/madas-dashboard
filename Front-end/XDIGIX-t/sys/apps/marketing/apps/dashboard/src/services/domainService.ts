/**
 * Domain Service - Frontend API Client
 * 
 * Handles all communication with domain-related Cloud Functions.
 * Provides typed interfaces for domain management operations.
 */

import { auth } from '../lib/firebase';

// ============================================
// Types
// ============================================

export type DomainStatus = 
  | 'pending_dns'
  | 'dns_configured'
  | 'verified'
  | 'ssl_pending'
  | 'active'
  | 'broken'
  | 'suspended';

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT';
  host: string;
  value: string | string[];
  ttl?: number;
}

export interface DNSRecords {
  aRecords?: string[];
  cnameTarget?: string;
  txtRecord: {
    host: string;
    value: string;
  };
}

export interface DNSInstructions {
  domain: string;
  isSubdomain: boolean;
  verification: {
    type: 'TXT';
    host: string;
    value: string;
    description: string;
  };
  pointing: {
    type: 'A' | 'CNAME';
    host: string;
    value: string | string[];
    description: string;
  };
  wwwRedirect?: {
    type: 'CNAME';
    host: string;
    value: string;
    description: string;
  };
  providerGuides: Record<string, string>;
}

export interface DNSCheckResult {
  success: boolean;
  aRecordValid?: boolean;
  cnameValid?: boolean;
  txtRecordValid?: boolean;
  resolvedARecords?: string[];
  resolvedCname?: string;
  resolvedTxtRecords?: string[];
  errors?: string[];
}

export interface CustomDomain {
  id: string;
  domain: string;
  rootDomain: string;
  isSubdomain: boolean;
  tenantId: string;
  siteId: string;
  status: DomainStatus;
  verificationToken: string;
  dnsRecords: DNSRecords;
  sslStatus: 'none' | 'pending' | 'active' | 'failed';
  firebaseHostingId?: string;
  lastCheckedAt?: Date;
  lastCheckResult?: DNSCheckResult;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddDomainResponse {
  success: boolean;
  domainId?: string;
  domain?: string;
  status?: DomainStatus;
  dnsRecords?: DNSRecords;
  verificationToken?: string;
  instructions?: DNSInstructions;
  error?: string;
}

export interface VerifyDomainResponse {
  success: boolean;
  status?: DomainStatus;
  checkResult?: DNSCheckResult;
  error?: string;
}

export interface GetDomainStatusResponse {
  success: boolean;
  domain?: CustomDomain;
  instructions?: DNSInstructions;
  error?: string;
}

export interface ListDomainsResponse {
  success: boolean;
  domains?: CustomDomain[];
  error?: string;
}

// ============================================
// Configuration
// ============================================

const _apiBaseEnv = import.meta.env.VITE_API_BACKEND_URL;
const API_BASE_URL = (typeof _apiBaseEnv === 'string' && _apiBaseEnv)
  ? _apiBaseEnv.replace(/\/$/, '')
  : 'https://us-central1-madas-store.cloudfunctions.net';

// ============================================
// Helper Functions
// ============================================

/**
 * Get authentication token for API calls
 */
async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * Make authenticated API call
 */
async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'POST',
  data?: Record<string, unknown>
): Promise<T> {
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}/${endpoint}`;
  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }
  
  return result;
}

// ============================================
// Domain Service API
// ============================================

/**
 * Add a new custom domain
 */
export async function addDomain(
  domain: string,
  tenantId: string,
  siteId: string
): Promise<AddDomainResponse> {
  try {
    return await apiCall<AddDomainResponse>('addDomain', 'POST', {
      domain,
      tenantId,
      siteId,
    });
  } catch (error) {
    console.error('[domainService] addDomain error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add domain',
    };
  }
}

/**
 * Verify domain DNS configuration
 */
export async function verifyDomain(
  domainId: string,
  tenantId: string
): Promise<VerifyDomainResponse> {
  try {
    return await apiCall<VerifyDomainResponse>('verifyDomain', 'POST', {
      domainId,
      tenantId,
    });
  } catch (error) {
    console.error('[domainService] verifyDomain error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify domain',
    };
  }
}

/**
 * Remove a custom domain
 */
export async function removeDomain(
  domainId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await apiCall('removeDomain', 'POST', {
      domainId,
      tenantId,
    });
  } catch (error) {
    console.error('[domainService] removeDomain error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove domain',
    };
  }
}

/**
 * Get domain status and details
 */
export async function getDomainStatus(
  domainId: string,
  tenantId: string
): Promise<GetDomainStatusResponse> {
  try {
    return await apiCall<GetDomainStatusResponse>(
      `getDomainStatus?domainId=${domainId}&tenantId=${tenantId}`,
      'GET'
    );
  } catch (error) {
    console.error('[domainService] getDomainStatus error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get domain status',
    };
  }
}

/**
 * List all domains for a tenant
 */
export async function listDomains(
  tenantId: string
): Promise<ListDomainsResponse> {
  try {
    return await apiCall<ListDomainsResponse>(
      `listDomains?tenantId=${tenantId}`,
      'GET'
    );
  } catch (error) {
    console.error('[domainService] listDomains error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list domains',
    };
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: DomainStatus): string {
  const labels: Record<DomainStatus, string> = {
    pending_dns: 'Awaiting DNS Configuration',
    dns_configured: 'DNS Configured, Verifying...',
    verified: 'Verified, Setting Up SSL...',
    ssl_pending: 'SSL Certificate Pending',
    active: 'Active',
    broken: 'Configuration Issue',
    suspended: 'Suspended',
  };
  return labels[status] || status;
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: DomainStatus): string {
  const colors: Record<DomainStatus, string> = {
    pending_dns: 'yellow',
    dns_configured: 'blue',
    verified: 'blue',
    ssl_pending: 'blue',
    active: 'green',
    broken: 'red',
    suspended: 'gray',
  };
  return colors[status] || 'gray';
}

/**
 * Get status badge styles
 */
export function getStatusBadgeClass(status: DomainStatus): string {
  const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
  const colorClasses: Record<DomainStatus, string> = {
    pending_dns: 'bg-yellow-100 text-yellow-800',
    dns_configured: 'bg-blue-100 text-blue-800',
    verified: 'bg-blue-100 text-blue-800',
    ssl_pending: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    broken: 'bg-red-100 text-red-800',
    suspended: 'bg-gray-100 text-gray-800',
  };
  return `${baseClass} ${colorClasses[status] || 'bg-gray-100 text-gray-800'}`;
}

/**
 * Check if domain needs user action
 */
export function needsUserAction(status: DomainStatus): boolean {
  return ['pending_dns', 'broken'].includes(status);
}

/**
 * Check if domain is in progress
 */
export function isInProgress(status: DomainStatus): boolean {
  return ['dns_configured', 'verified', 'ssl_pending'].includes(status);
}

/**
 * Format domain for display
 */
export function formatDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '');
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  return domainRegex.test(domain.trim().toLowerCase());
}

/**
 * Get estimated time for status
 */
export function getEstimatedTime(status: DomainStatus): string | null {
  const times: Partial<Record<DomainStatus, string>> = {
    pending_dns: 'Up to 48 hours for DNS propagation',
    dns_configured: 'A few minutes',
    verified: 'A few minutes',
    ssl_pending: '5-10 minutes for SSL certificate',
  };
  return times[status] || null;
}

/**
 * Generate copy-friendly DNS record string
 */
export function formatDnsRecordForCopy(
  type: string,
  host: string,
  value: string | string[]
): string {
  if (Array.isArray(value)) {
    return value.map(v => `${type}\t${host}\t${v}`).join('\n');
  }
  return `${type}\t${host}\t${value}`;
}

// ============================================
// DNS Provider Helpers
// ============================================

export interface DNSProvider {
  id: string;
  name: string;
  logo?: string;
  guideUrl: string;
  instructions: string[];
}

export const DNS_PROVIDERS: DNSProvider[] = [
  {
    id: 'godaddy',
    name: 'GoDaddy',
    guideUrl: 'https://www.godaddy.com/help/manage-dns-records-680',
    instructions: [
      'Log in to your GoDaddy account',
      'Go to My Products → Domains',
      'Click DNS next to your domain',
      'Click Add to add new records',
    ],
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    guideUrl: 'https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/',
    instructions: [
      'Log in to your Namecheap account',
      'Go to Domain List → Manage',
      'Click Advanced DNS',
      'Add the required records',
    ],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    guideUrl: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
    instructions: [
      'Log in to Cloudflare dashboard',
      'Select your domain',
      'Go to DNS → Records',
      'Click Add record',
      'Important: Set proxy status to DNS only (gray cloud)',
    ],
  },
  {
    id: 'google',
    name: 'Google Domains',
    guideUrl: 'https://support.google.com/domains/answer/3290350',
    instructions: [
      'Go to Google Domains',
      'Click on your domain',
      'Go to DNS → Custom records',
      'Add the required records',
    ],
  },
  {
    id: 'hostinger',
    name: 'Hostinger',
    guideUrl: 'https://support.hostinger.com/en/articles/4456025-how-to-add-dns-records',
    instructions: [
      'Log in to Hostinger',
      'Go to Domains → DNS/Nameservers',
      'Click Manage DNS records',
      'Add the required records',
    ],
  },
  {
    id: 'other',
    name: 'Other Provider',
    guideUrl: '',
    instructions: [
      'Log in to your domain registrar',
      'Find DNS management or DNS settings',
      'Add the required records',
      'Save changes and wait for propagation',
    ],
  },
];

/**
 * Get provider by ID
 */
export function getProviderById(id: string): DNSProvider | undefined {
  return DNS_PROVIDERS.find(p => p.id === id);
}
