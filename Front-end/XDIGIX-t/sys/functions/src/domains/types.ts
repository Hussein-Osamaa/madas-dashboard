/**
 * Custom Domain System - TypeScript Types
 * 
 * Comprehensive type definitions for the multi-tenant custom domain system.
 * Mirrors Firestore document structures and API payloads.
 */

// ============================================
// Domain Status Lifecycle
// ============================================
export type DomainStatus = 
  | 'pending_dns'      // Domain submitted, awaiting DNS configuration
  | 'dns_configured'   // DNS records detected, awaiting verification
  | 'verified'         // TXT verification passed, ready for hosting
  | 'ssl_pending'      // Added to Firebase Hosting, SSL provisioning
  | 'active'           // Fully active with valid SSL
  | 'broken'           // Previously active but DNS/SSL issues detected
  | 'suspended';       // Manually suspended by admin

// ============================================
// Firestore Document Types
// ============================================

/**
 * Tenant (Business) Document
 * Collection: tenants (or businesses in existing schema)
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;                    // URL-safe identifier
  defaultSubdomain: string;        // e.g., "mystore" -> mystore.madas-sites.web.app
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  customDomainsAllowed: number;    // Based on plan
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  ownerId: string;                 // Firebase Auth UID
  settings: TenantSettings;
}

export interface TenantSettings {
  brandName?: string;
  logo?: string;
  primaryColor?: string;
  favicon?: string;
}

/**
 * Custom Domain Document
 * Collection: customDomains (global) or businesses/{tenantId}/domains (nested)
 */
export interface CustomDomain {
  id: string;                      // Firestore document ID
  domain: string;                  // e.g., "shop.xdigix.com" or "xdigix.com"
  rootDomain: string;              // e.g., "xdigix.com" (extracted from domain)
  isSubdomain: boolean;            // true if domain is a subdomain
  tenantId: string;                // Reference to tenant
  siteId: string;                  // Reference to published site
  status: DomainStatus;
  
  // Verification
  verificationToken: string;       // Unique token for TXT record
  verificationMethod: 'txt' | 'cname';
  verifiedAt?: FirebaseFirestore.Timestamp;
  
  // DNS Configuration (returned from Firebase Hosting API)
  dnsRecords: DNSRecords;
  
  // SSL/Hosting
  firebaseHostingId?: string;      // Firebase Hosting domain ID
  sslStatus: 'none' | 'pending' | 'active' | 'failed';
  sslCertExpiry?: FirebaseFirestore.Timestamp;
  
  // Health Monitoring
  lastCheckedAt?: FirebaseFirestore.Timestamp;
  lastCheckResult?: DNSCheckResult;
  failureCount: number;            // Consecutive failures
  
  // Metadata
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  createdBy: string;               // Firebase Auth UID
}

/**
 * DNS Records configuration
 */
export interface DNSRecords {
  // For root domains (apex)
  aRecords?: string[];             // A record IPs
  
  // For subdomains
  cnameTarget?: string;            // CNAME target
  
  // Verification
  txtRecord: {
    host: string;                  // e.g., "_firebase" or "@"
    value: string;                 // Verification token value
  };
  
  // Additional records (if needed)
  additionalRecords?: DNSRecord[];
}

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX';
  host: string;
  value: string;
  ttl?: number;
  priority?: number;               // For MX records
}

/**
 * DNS Check Result
 */
export interface DNSCheckResult {
  timestamp: FirebaseFirestore.Timestamp;
  success: boolean;
  
  // Individual check results
  aRecordValid?: boolean;
  cnameValid?: boolean;
  txtRecordValid?: boolean;
  
  // Resolved values (for debugging)
  resolvedARecords?: string[];
  resolvedCname?: string;
  resolvedTxtRecords?: string[];
  
  // Error details
  errors?: string[];
}

/**
 * Published Site Document
 * Collection: businesses/{tenantId}/published_sites
 */
export interface PublishedSite {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  
  // Custom domain reference
  customDomain?: string;           // Domain string if connected
  customDomainId?: string;         // Reference to CustomDomain doc
  
  // Site content
  sections: SiteSection[];
  metadata: SiteMetadata;
  
  // Publishing
  publishedAt: FirebaseFirestore.Timestamp;
  publishedBy: string;
  version: number;
  
  // URLs
  defaultUrl: string;              // Default subdomain URL
  customUrl?: string;              // Custom domain URL (if active)
}

export interface SiteSection {
  id: string;
  type: string;
  order: number;
  data: Record<string, unknown>;
  style?: Record<string, unknown>;
}

export interface SiteMetadata {
  title: string;
  description?: string;
  favicon?: string;
  ogImage?: string;
  scripts?: string[];
  styles?: string[];
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Add Domain Request
 */
export interface AddDomainRequest {
  domain: string;
  tenantId: string;
  siteId: string;
}

export interface AddDomainResponse {
  success: boolean;
  domainId?: string;
  domain?: string;
  status?: DomainStatus;
  dnsRecords?: DNSRecords;
  verificationToken?: string;
  error?: string;
}

/**
 * Verify Domain Request
 */
export interface VerifyDomainRequest {
  domainId: string;
  tenantId: string;
}

export interface VerifyDomainResponse {
  success: boolean;
  status?: DomainStatus;
  checkResult?: DNSCheckResult;
  error?: string;
}

/**
 * Get Domain Status Request
 */
export interface GetDomainStatusRequest {
  domainId: string;
  tenantId: string;
}

export interface GetDomainStatusResponse {
  success: boolean;
  domain?: CustomDomain;
  error?: string;
}

/**
 * Remove Domain Request
 */
export interface RemoveDomainRequest {
  domainId: string;
  tenantId: string;
}

export interface RemoveDomainResponse {
  success: boolean;
  error?: string;
}

/**
 * DNS Instructions for Frontend
 */
export interface DNSInstructions {
  domain: string;
  isSubdomain: boolean;
  
  // Step 1: Verification
  verification: {
    type: 'TXT';
    host: string;
    value: string;
    description: string;
  };
  
  // Step 2: Pointing
  pointing: {
    type: 'A' | 'CNAME';
    host: string;
    value: string | string[];      // Array for multiple A records
    description: string;
  };
  
  // Optional: WWW redirect
  wwwRedirect?: {
    type: 'CNAME';
    host: string;
    value: string;
    description: string;
  };
  
  // Provider-specific guides
  providerGuides: {
    [provider: string]: string;    // URL to guide
  };
}

// ============================================
// Firebase Hosting API Types
// ============================================

export interface FirebaseHostingDomain {
  domainName: string;
  status: string;
  domainRedirect?: {
    domainName: string;
    type: string;
  };
  provisioning?: {
    expectedIps: string[];
    certChallengeDns?: string;
    certChallengeDiscoveredTxt?: string[];
    certChallengeHttp?: string;
    certStatus: string;
    discoveredIps: string[];
  };
}

export interface FirebaseHostingResponse {
  domain: FirebaseHostingDomain;
}

// ============================================
// Event Types (for Cloud Function triggers)
// ============================================

export interface DomainStatusChangeEvent {
  domainId: string;
  tenantId: string;
  previousStatus: DomainStatus;
  newStatus: DomainStatus;
  timestamp: FirebaseFirestore.Timestamp;
}

export interface DomainVerificationEvent {
  domainId: string;
  tenantId: string;
  success: boolean;
  checkResult: DNSCheckResult;
  timestamp: FirebaseFirestore.Timestamp;
}

