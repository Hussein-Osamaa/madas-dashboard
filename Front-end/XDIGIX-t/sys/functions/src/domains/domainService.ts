/**
 * Custom Domain Service - Main Implementation
 * 
 * Production-ready custom domain system for multi-tenant SaaS.
 * Handles domain registration, DNS verification, and Firebase Hosting integration.
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import * as dns from 'dns/promises';
import { GoogleAuth } from 'google-auth-library';
import {
  CustomDomain,
  DomainStatus,
  DNSRecords,
  DNSCheckResult,
  AddDomainRequest,
  AddDomainResponse,
  VerifyDomainRequest,
  VerifyDomainResponse,
  RemoveDomainRequest,
  RemoveDomainResponse,
  DNSInstructions,
  FirebaseHostingDomain,
} from './types';

// ============================================
// Configuration
// ============================================

const config = {
  // Firebase project settings
  projectId: process.env.GCLOUD_PROJECT || 'madas-store',
  hostingSiteId: process.env.FIREBASE_SITES_ID || 'madas-sites-c3c5e',
  
  // Platform branding
  platformName: process.env.PLATFORM_NAME || 'MADAS',
  platformDomain: process.env.PLATFORM_DOMAIN || 'madas-sites-c3c5e.web.app',
  
  // Firebase Hosting IPs (these are Google's standard IPs)
  firebaseHostingIPs: ['199.36.158.100'],
  
  // Verification settings
  verificationPrefix: 'madas-site-verification',
  txtRecordHost: '_firebase',
  
  // Health check settings
  maxFailureCount: 5,
  healthCheckIntervalMinutes: 60,
  
  // DNS provider guides
  providerGuides: {
    godaddy: 'https://www.godaddy.com/help/manage-dns-records-680',
    namecheap: 'https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/',
    cloudflare: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
    google: 'https://support.google.com/domains/answer/3290350',
    hostinger: 'https://support.hostinger.com/en/articles/4456025-how-to-add-dns-records',
  },
};

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Google Auth for Firebase Hosting API
const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/firebase.hosting'],
});

// ============================================
// Utility Functions
// ============================================

/**
 * Extract root domain from a domain string
 * e.g., "shop.xdigix.com" -> "xdigix.com"
 */
function extractRootDomain(domain: string): string {
  const parts = domain.toLowerCase().split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return domain.toLowerCase();
}

/**
 * Check if domain is a subdomain
 * e.g., "shop.xdigix.com" -> true, "xdigix.com" -> false
 */
function isSubdomain(domain: string): boolean {
  const parts = domain.toLowerCase().split('.');
  return parts.length > 2 && parts[0] !== 'www';
}

/**
 * Generate a unique verification token
 */
function generateVerificationToken(): string {
  const uuid = uuidv4().replace(/-/g, '');
  return `${config.verificationPrefix}=${uuid}`;
}

/**
 * Sanitize and validate domain input
 */
function sanitizeDomain(domain: string): string | null {
  // Remove protocol, trailing slashes, and whitespace
  let cleaned = domain
    .toLowerCase()
    .trim()
    .replace(/^(https?:\/\/)?/, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
  
  // Validate domain format
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!domainRegex.test(cleaned)) {
    return null;
  }
  
  return cleaned;
}

/**
 * Get Firebase Hosting API client
 */
async function getHostingApiClient() {
  const client = await googleAuth.getClient();
  return client;
}

// ============================================
// DNS Verification Functions
// ============================================

/**
 * Verify DNS TXT record contains our verification token
 */
async function verifyTxtRecord(domain: string, expectedToken: string): Promise<{
  valid: boolean;
  found: string[];
  error?: string;
}> {
  try {
    // Check both root domain and _firebase subdomain
    const hostsToCheck = [
      domain,
      `${config.txtRecordHost}.${domain}`,
      `_dnslink.${domain}`,
    ];
    
    const allRecords: string[] = [];
    
    for (const host of hostsToCheck) {
      try {
        const records = await dns.resolveTxt(host);
        // dns.resolveTxt returns string[][], flatten it
        const flatRecords = records.flat();
        allRecords.push(...flatRecords);
      } catch (err: unknown) {
        // ENOTFOUND or ENODATA is expected if record doesn't exist
        const error = err as { code?: string };
        if (error.code !== 'ENOTFOUND' && error.code !== 'ENODATA') {
          console.log(`DNS TXT lookup error for ${host}:`, error);
        }
      }
    }
    
    // Check if any TXT record contains our token
    const valid = allRecords.some(record => 
      record.includes(expectedToken) || 
      record.includes(config.verificationPrefix)
    );
    
    return { valid, found: allRecords };
  } catch (error: unknown) {
    const err = error as Error;
    return { valid: false, found: [], error: err.message };
  }
}

/**
 * Verify A records point to Firebase Hosting
 */
async function verifyARecords(domain: string): Promise<{
  valid: boolean;
  found: string[];
  error?: string;
}> {
  try {
    const records = await dns.resolve4(domain);
    
    // Check if at least one record matches Firebase Hosting IPs
    const valid = records.some(ip => config.firebaseHostingIPs.includes(ip));
    
    return { valid, found: records };
  } catch (error: unknown) {
    const err = error as { code?: string; message: string };
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return { valid: false, found: [], error: 'No A records found' };
    }
    return { valid: false, found: [], error: err.message };
  }
}

/**
 * Verify CNAME record points to Firebase Hosting
 */
async function verifyCnameRecord(domain: string): Promise<{
  valid: boolean;
  found: string | null;
  error?: string;
}> {
  try {
    const records = await dns.resolveCname(domain);
    const cname = records[0] || null;
    
    // Valid if points to our hosting domain
    const valid = cname !== null && (
      cname.includes(config.hostingSiteId) ||
      cname.includes('firebaseapp.com') ||
      cname.includes('web.app')
    );
    
    return { valid, found: cname };
  } catch (error: unknown) {
    const err = error as { code?: string; message: string };
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      return { valid: false, found: null, error: 'No CNAME record found' };
    }
    return { valid: false, found: null, error: err.message };
  }
}

/**
 * Perform full DNS verification for a domain
 */
async function performDnsVerification(
  domain: string,
  verificationToken: string,
  isSubdomainCheck: boolean
): Promise<DNSCheckResult> {
  const timestamp = admin.firestore.Timestamp.now();
  const errors: string[] = [];
  
  // Verify TXT record
  const txtResult = await verifyTxtRecord(domain, verificationToken);
  
  let aRecordValid = false;
  let cnameValid = false;
  let resolvedARecords: string[] = [];
  let resolvedCname: string | undefined;
  
  if (isSubdomainCheck) {
    // Subdomains use CNAME
    const cnameResult = await verifyCnameRecord(domain);
    cnameValid = cnameResult.valid;
    resolvedCname = cnameResult.found || undefined;
    if (!cnameValid && cnameResult.error) {
      errors.push(`CNAME: ${cnameResult.error}`);
    }
  } else {
    // Root domains use A records
    const aResult = await verifyARecords(domain);
    aRecordValid = aResult.valid;
    resolvedARecords = aResult.found;
    if (!aRecordValid && aResult.error) {
      errors.push(`A Record: ${aResult.error}`);
    }
  }
  
  // Determine overall success
  const pointingValid = isSubdomainCheck ? cnameValid : aRecordValid;
  const success = txtResult.valid && pointingValid;
  
  if (!txtResult.valid) {
    errors.push('TXT verification record not found or invalid');
  }
  
  return {
    timestamp,
    success,
    aRecordValid,
    cnameValid,
    txtRecordValid: txtResult.valid,
    resolvedARecords,
    resolvedCname,
    resolvedTxtRecords: txtResult.found,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================
// Firebase Hosting API Functions
// ============================================

/**
 * Add domain to Firebase Hosting via API
 */
async function addDomainToFirebaseHosting(domain: string): Promise<{
  success: boolean;
  hostingDomain?: FirebaseHostingDomain;
  error?: string;
}> {
  try {
    const client = await getHostingApiClient();
    const accessToken = await client.getAccessToken();
    
    const url = `https://firebasehosting.googleapis.com/v1beta1/projects/${config.projectId}/sites/${config.hostingSiteId}/domains`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domainName: domain }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Check if domain already exists (not an error)
      if (response.status === 409) {
        console.log(`Domain ${domain} already exists in Firebase Hosting`);
        // Fetch existing domain info
        return await getDomainFromFirebaseHosting(domain);
      }
      
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Successfully added ${domain} to Firebase Hosting:`, data);
    
    return {
      success: true,
      hostingDomain: data as FirebaseHostingDomain,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`Error adding domain ${domain} to Firebase Hosting:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Get domain info from Firebase Hosting
 */
async function getDomainFromFirebaseHosting(domain: string): Promise<{
  success: boolean;
  hostingDomain?: FirebaseHostingDomain;
  error?: string;
}> {
  try {
    const client = await getHostingApiClient();
    const accessToken = await client.getAccessToken();
    
    const url = `https://firebasehosting.googleapis.com/v1beta1/projects/${config.projectId}/sites/${config.hostingSiteId}/domains/${domain}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Domain not found in Firebase Hosting' };
      }
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, hostingDomain: data as FirebaseHostingDomain };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

/**
 * Remove domain from Firebase Hosting
 */
async function removeDomainFromFirebaseHosting(domain: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = await getHostingApiClient();
    const accessToken = await client.getAccessToken();
    
    const url = `https://firebasehosting.googleapis.com/v1beta1/projects/${config.projectId}/sites/${config.hostingSiteId}/domains/${domain}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
      },
    });
    
    if (!response.ok && response.status !== 404) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    
    console.log(`Successfully removed ${domain} from Firebase Hosting`);
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`Error removing domain ${domain} from Firebase Hosting:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Extract DNS records from Firebase Hosting domain response
 */
function extractDnsRecordsFromHosting(
  domain: string,
  hostingDomain: FirebaseHostingDomain,
  verificationToken: string
): DNSRecords {
  const isDomainSubdomain = isSubdomain(domain);
  
  const dnsRecords: DNSRecords = {
    txtRecord: {
      host: domain.startsWith('www.') ? domain : `@`,
      value: verificationToken,
    },
  };
  
  // Get IPs from Firebase Hosting provisioning or use defaults
  if (hostingDomain.provisioning?.expectedIps?.length) {
    dnsRecords.aRecords = hostingDomain.provisioning.expectedIps;
  } else if (!isDomainSubdomain) {
    dnsRecords.aRecords = config.firebaseHostingIPs;
  }
  
  // For subdomains, use CNAME
  if (isDomainSubdomain) {
    dnsRecords.cnameTarget = `${config.hostingSiteId}.web.app`;
  }
  
  // Add Firebase's cert challenge TXT if available
  if (hostingDomain.provisioning?.certChallengeDns) {
    dnsRecords.txtRecord.value = hostingDomain.provisioning.certChallengeDns;
  }
  
  return dnsRecords;
}

// ============================================
// DNS Instructions Generator
// ============================================

/**
 * Generate human-readable DNS instructions for the frontend
 */
function generateDnsInstructions(
  domain: string,
  dnsRecords: DNSRecords,
  verificationToken: string
): DNSInstructions {
  const isDomainSubdomain = isSubdomain(domain);
  const rootDomain = extractRootDomain(domain);
  
  const instructions: DNSInstructions = {
    domain,
    isSubdomain: isDomainSubdomain,
    
    verification: {
      type: 'TXT',
      host: isDomainSubdomain ? domain : '@',
      value: verificationToken,
      description: `Add this TXT record to verify ownership of ${domain}`,
    },
    
    pointing: isDomainSubdomain
      ? {
          type: 'CNAME',
          host: domain.replace(`.${rootDomain}`, ''),
          value: dnsRecords.cnameTarget || `${config.hostingSiteId}.web.app`,
          description: `Point your subdomain to our servers`,
        }
      : {
          type: 'A',
          host: '@',
          value: dnsRecords.aRecords || config.firebaseHostingIPs,
          description: `Point your domain to our servers`,
        },
    
    providerGuides: config.providerGuides,
  };
  
  // Add WWW redirect for root domains
  if (!isDomainSubdomain) {
    instructions.wwwRedirect = {
      type: 'CNAME',
      host: 'www',
      value: domain,
      description: `Redirect www.${domain} to ${domain}`,
    };
  }
  
  return instructions;
}

// ============================================
// Main Cloud Functions
// ============================================

/**
 * Add a custom domain
 * HTTP endpoint for adding a new custom domain to a tenant's site
 */
export const addDomain = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      // Only allow POST
      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }
      
      const { domain, tenantId, siteId } = req.body as AddDomainRequest;
      
      // Validate inputs
      if (!domain || !tenantId || !siteId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: domain, tenantId, siteId',
        });
        return;
      }
      
      // Sanitize domain
      const cleanDomain = sanitizeDomain(domain);
      if (!cleanDomain) {
        res.status(400).json({
          success: false,
          error: 'Invalid domain format',
        });
        return;
      }
      
      console.log(`[addDomain] Processing: ${cleanDomain} for tenant ${tenantId}, site ${siteId}`);
      
      // Check if domain already exists
      const existingQuery = await db
        .collection('customDomains')
        .where('domain', '==', cleanDomain)
        .limit(1)
        .get();
      
      if (!existingQuery.empty) {
        const existing = existingQuery.docs[0].data() as CustomDomain;
        if (existing.tenantId !== tenantId) {
          res.status(409).json({
            success: false,
            error: 'This domain is already registered to another account',
          });
          return;
        }
        
        // Return existing domain info
        res.json({
          success: true,
          domainId: existingQuery.docs[0].id,
          domain: cleanDomain,
          status: existing.status,
          dnsRecords: existing.dnsRecords,
          verificationToken: existing.verificationToken,
        } as AddDomainResponse);
        return;
      }
      
      // Generate verification token
      const verificationToken = generateVerificationToken();
      
      // Add domain to Firebase Hosting
      const hostingResult = await addDomainToFirebaseHosting(cleanDomain);
      
      // Extract DNS records
      const dnsRecords = hostingResult.hostingDomain
        ? extractDnsRecordsFromHosting(cleanDomain, hostingResult.hostingDomain, verificationToken)
        : {
            aRecords: isSubdomain(cleanDomain) ? undefined : config.firebaseHostingIPs,
            cnameTarget: isSubdomain(cleanDomain) ? `${config.hostingSiteId}.web.app` : undefined,
            txtRecord: {
              host: isSubdomain(cleanDomain) ? cleanDomain : '@',
              value: verificationToken,
            },
          };
      
      // Create domain document
      const domainDoc: Omit<CustomDomain, 'id'> = {
        domain: cleanDomain,
        rootDomain: extractRootDomain(cleanDomain),
        isSubdomain: isSubdomain(cleanDomain),
        tenantId,
        siteId,
        status: hostingResult.success ? 'ssl_pending' : 'pending_dns',
        verificationToken,
        verificationMethod: 'txt',
        dnsRecords,
        sslStatus: hostingResult.success ? 'pending' : 'none',
        firebaseHostingId: hostingResult.hostingDomain?.domainName,
        failureCount: 0,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: tenantId, // Should be user ID from auth
      };
      
      // Save to Firestore
      const docRef = await db.collection('customDomains').add(domainDoc);
      
      // Also update the site document
      await db
        .collection('businesses')
        .doc(tenantId)
        .collection('published_sites')
        .doc(siteId)
        .update({
          customDomain: cleanDomain,
          customDomainId: docRef.id,
          dnsRecords,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      
      // Handle WWW subdomain automatically
      if (!isSubdomain(cleanDomain)) {
        const wwwDomain = `www.${cleanDomain}`;
        await addDomainToFirebaseHosting(wwwDomain);
      }
      
      console.log(`[addDomain] Successfully created domain ${cleanDomain} with ID ${docRef.id}`);
      
      res.json({
        success: true,
        domainId: docRef.id,
        domain: cleanDomain,
        status: domainDoc.status,
        dnsRecords,
        verificationToken,
        instructions: generateDnsInstructions(cleanDomain, dnsRecords, verificationToken),
      } as AddDomainResponse);
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[addDomain] Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    }
  }
);

/**
 * Verify a domain's DNS configuration
 * HTTP endpoint for triggering DNS verification
 */
export const verifyDomain = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }
      
      const { domainId, tenantId } = req.body as VerifyDomainRequest;
      
      if (!domainId || !tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: domainId, tenantId',
        });
        return;
      }
      
      console.log(`[verifyDomain] Verifying domain ${domainId} for tenant ${tenantId}`);
      
      // Get domain document
      const domainRef = db.collection('customDomains').doc(domainId);
      const domainSnap = await domainRef.get();
      
      if (!domainSnap.exists) {
        res.status(404).json({ success: false, error: 'Domain not found' });
        return;
      }
      
      const domainData = domainSnap.data() as CustomDomain;
      
      // Verify tenant ownership
      if (domainData.tenantId !== tenantId) {
        res.status(403).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      // Perform DNS verification
      const checkResult = await performDnsVerification(
        domainData.domain,
        domainData.verificationToken,
        domainData.isSubdomain
      );
      
      // Determine new status
      let newStatus: DomainStatus = domainData.status;
      
      if (checkResult.success) {
        // DNS is fully configured
        if (domainData.status === 'pending_dns' || domainData.status === 'dns_configured') {
          newStatus = 'verified';
          
          // Add to Firebase Hosting if not already
          if (!domainData.firebaseHostingId) {
            const hostingResult = await addDomainToFirebaseHosting(domainData.domain);
            if (hostingResult.success) {
              newStatus = 'ssl_pending';
            }
          } else {
            newStatus = 'ssl_pending';
          }
        }
      } else if (checkResult.txtRecordValid && !checkResult.aRecordValid && !checkResult.cnameValid) {
        // TXT record found but pointing records not configured
        newStatus = 'dns_configured';
      } else if (domainData.status === 'active') {
        // Was active but now DNS is broken
        newStatus = 'broken';
      }
      
      // Update domain document
      await domainRef.update({
        status: newStatus,
        lastCheckedAt: admin.firestore.Timestamp.now(),
        lastCheckResult: checkResult,
        failureCount: checkResult.success ? 0 : domainData.failureCount + 1,
        updatedAt: admin.firestore.Timestamp.now(),
        ...(checkResult.success && { verifiedAt: admin.firestore.Timestamp.now() }),
      });
      
      // If verified, check SSL status from Firebase Hosting
      if (newStatus === 'ssl_pending' || newStatus === 'verified') {
        const hostingStatus = await getDomainFromFirebaseHosting(domainData.domain);
        if (hostingStatus.success && hostingStatus.hostingDomain) {
          const certStatus = hostingStatus.hostingDomain.provisioning?.certStatus;
          if (certStatus === 'CERT_ACTIVE') {
            newStatus = 'active';
            await domainRef.update({
              status: 'active',
              sslStatus: 'active',
            });
          }
        }
      }
      
      console.log(`[verifyDomain] Domain ${domainData.domain} status: ${newStatus}`);
      
      res.json({
        success: true,
        status: newStatus,
        checkResult,
      } as VerifyDomainResponse);
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[verifyDomain] Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    }
  }
);

/**
 * Remove a custom domain
 * HTTP endpoint for removing a domain from a tenant's site
 */
export const removeDomain = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      if (req.method !== 'POST' && req.method !== 'DELETE') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }
      
      const { domainId, tenantId } = req.body as RemoveDomainRequest;
      
      if (!domainId || !tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: domainId, tenantId',
        });
        return;
      }
      
      console.log(`[removeDomain] Removing domain ${domainId} for tenant ${tenantId}`);
      
      // Get domain document
      const domainRef = db.collection('customDomains').doc(domainId);
      const domainSnap = await domainRef.get();
      
      if (!domainSnap.exists) {
        res.status(404).json({ success: false, error: 'Domain not found' });
        return;
      }
      
      const domainData = domainSnap.data() as CustomDomain;
      
      // Verify tenant ownership
      if (domainData.tenantId !== tenantId) {
        res.status(403).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      // Remove from Firebase Hosting
      await removeDomainFromFirebaseHosting(domainData.domain);
      
      // Remove WWW subdomain if it's a root domain
      if (!domainData.isSubdomain) {
        await removeDomainFromFirebaseHosting(`www.${domainData.domain}`);
      }
      
      // Update site document
      await db
        .collection('businesses')
        .doc(tenantId)
        .collection('published_sites')
        .doc(domainData.siteId)
        .update({
          customDomain: admin.firestore.FieldValue.delete(),
          customDomainId: admin.firestore.FieldValue.delete(),
          dnsRecords: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      
      // Delete domain document
      await domainRef.delete();
      
      console.log(`[removeDomain] Successfully removed domain ${domainData.domain}`);
      
      res.json({ success: true } as RemoveDomainResponse);
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[removeDomain] Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    }
  }
);

/**
 * Get domain status
 * HTTP endpoint for checking domain status
 */
export const getDomainStatus = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      const domainId = req.query.domainId as string || req.body?.domainId;
      const tenantId = req.query.tenantId as string || req.body?.tenantId;
      
      if (!domainId || !tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: domainId, tenantId',
        });
        return;
      }
      
      // Get domain document
      const domainRef = db.collection('customDomains').doc(domainId);
      const domainSnap = await domainRef.get();
      
      if (!domainSnap.exists) {
        res.status(404).json({ success: false, error: 'Domain not found' });
        return;
      }
      
      const domainData = { id: domainSnap.id, ...domainSnap.data() } as CustomDomain;
      
      // Verify tenant ownership
      if (domainData.tenantId !== tenantId) {
        res.status(403).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      // Get fresh status from Firebase Hosting if SSL pending
      if (domainData.status === 'ssl_pending') {
        const hostingStatus = await getDomainFromFirebaseHosting(domainData.domain);
        if (hostingStatus.success && hostingStatus.hostingDomain) {
          const certStatus = hostingStatus.hostingDomain.provisioning?.certStatus;
          if (certStatus === 'CERT_ACTIVE') {
            await domainRef.update({
              status: 'active',
              sslStatus: 'active',
              updatedAt: admin.firestore.Timestamp.now(),
            });
            domainData.status = 'active';
            domainData.sslStatus = 'active';
          }
        }
      }
      
      res.json({
        success: true,
        domain: domainData,
        instructions: generateDnsInstructions(
          domainData.domain,
          domainData.dnsRecords,
          domainData.verificationToken
        ),
      });
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[getDomainStatus] Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    }
  }
);

/**
 * Scheduled health check for all domains
 * Runs every hour to verify DNS and SSL status
 */
export const domainHealthCheck = functions.scheduler.onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    console.log('[domainHealthCheck] Starting scheduled domain health check');
    
    try {
      // Get all domains that need checking
      const domainsToCheck = await db
        .collection('customDomains')
        .where('status', 'in', ['ssl_pending', 'active', 'broken'])
        .get();
      
      console.log(`[domainHealthCheck] Checking ${domainsToCheck.size} domains`);
      
      const batch = db.batch();
      let updateCount = 0;
      
      for (const doc of domainsToCheck.docs) {
        const domainData = doc.data() as CustomDomain;
        
        // Check SSL status from Firebase Hosting
        const hostingStatus = await getDomainFromFirebaseHosting(domainData.domain);
        
        let newStatus: DomainStatus = domainData.status;
        let sslStatus = domainData.sslStatus;
        
        if (hostingStatus.success && hostingStatus.hostingDomain) {
          const certStatus = hostingStatus.hostingDomain.provisioning?.certStatus;
          
          if (certStatus === 'CERT_ACTIVE') {
            newStatus = 'active';
            sslStatus = 'active';
          } else if (certStatus === 'CERT_PENDING_VALIDATION') {
            newStatus = 'ssl_pending';
            sslStatus = 'pending';
          } else if (certStatus === 'CERT_FAILED') {
            sslStatus = 'failed';
          }
        }
        
        // Quick DNS check for active domains
        if (domainData.status === 'active') {
          const dnsCheck = await performDnsVerification(
            domainData.domain,
            domainData.verificationToken,
            domainData.isSubdomain
          );
          
          if (!dnsCheck.success) {
            const newFailureCount = domainData.failureCount + 1;
            if (newFailureCount >= config.maxFailureCount) {
              newStatus = 'broken';
            }
            
            batch.update(doc.ref, {
              failureCount: newFailureCount,
              lastCheckedAt: admin.firestore.Timestamp.now(),
              lastCheckResult: dnsCheck,
              ...(newStatus !== domainData.status && { status: newStatus }),
            });
            updateCount++;
            continue;
          }
        }
        
        // Update if status changed
        if (newStatus !== domainData.status || sslStatus !== domainData.sslStatus) {
          batch.update(doc.ref, {
            status: newStatus,
            sslStatus,
            failureCount: 0,
            lastCheckedAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
          });
          updateCount++;
        }
      }
      
      if (updateCount > 0) {
        await batch.commit();
        console.log(`[domainHealthCheck] Updated ${updateCount} domains`);
      }
      
      console.log('[domainHealthCheck] Completed');
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[domainHealthCheck] Error:', err);
      throw err; // Rethrow to trigger retry
    }
  }
);

/**
 * Get all domains for a tenant
 * HTTP endpoint for listing all domains
 */
export const listDomains = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string || req.body?.tenantId;
      
      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: tenantId',
        });
        return;
      }
      
      const domainsSnapshot = await db
        .collection('customDomains')
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const domains = domainsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      res.json({ success: true, domains });
      
    } catch (error: unknown) {
      const err = error as Error;
      console.error('[listDomains] Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    }
  }
);

