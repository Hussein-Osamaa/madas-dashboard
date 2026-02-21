/**
 * Custom Domain Service - Production Implementation
 * 
 * Fully automated custom domain system for multi-tenant SaaS.
 * Handles domain registration, DNS verification, and Firebase Hosting integration.
 */

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');
const dns = require('dns/promises');
const { GoogleAuth } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================
// Configuration
// ============================================

const config = {
  // Firebase project settings
  projectId: process.env.GCLOUD_PROJECT || 'madas-store',
  hostingSiteId: process.env.FIREBASE_SITES_ID || 'madas-sites-c3c5e',
  
  // Platform branding - Using xdigix.com as platform domain
  platformName: process.env.PLATFORM_NAME || 'XDIGIX',
  // Default to the Firebase Hosting "sites" domain for this project unless overridden
  platformDomain: process.env.PLATFORM_DOMAIN || 'madas-sites-c3c5e.web.app',
  
  // Firebase Hosting IPs (Google's standard IPs for Firebase Hosting)
  firebaseHostingIPs: ['199.36.158.100'],
  
  // Verification settings
  verificationPrefix: 'madas-site-verification',
  
  // Health check settings
  maxFailureCount: 5,
  
  // DNS provider guides
  providerGuides: {
    godaddy: 'https://www.godaddy.com/help/manage-dns-records-680',
    namecheap: 'https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/',
    cloudflare: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
    google: 'https://support.google.com/domains/answer/3290350',
    hostinger: 'https://support.hostinger.com/en/articles/4456025-how-to-add-dns-records',
  },
};

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
function extractRootDomain(domain) {
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
function isSubdomain(domain) {
  const parts = domain.toLowerCase().split('.');
  return parts.length > 2 && parts[0] !== 'www';
}

/**
 * Generate a unique verification token
 */
function generateVerificationToken() {
  const uuid = uuidv4().replace(/-/g, '');
  return `${config.verificationPrefix}=${uuid}`;
}

/**
 * Sanitize and validate domain input
 */
function sanitizeDomain(domain) {
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

// ============================================
// DNS Verification Functions
// ============================================

/**
 * Verify DNS TXT record contains our verification token
 */
async function verifyTxtRecord(domain, expectedToken) {
  try {
    const hostsToCheck = [
      domain,
      `_firebase.${domain}`,
      `_dnslink.${domain}`,
    ];
    
    const allRecords = [];
    
    for (const host of hostsToCheck) {
      try {
        const records = await dns.resolveTxt(host);
        const flatRecords = records.flat();
        allRecords.push(...flatRecords);
      } catch (err) {
        if (err.code !== 'ENOTFOUND' && err.code !== 'ENODATA') {
          console.log(`DNS TXT lookup error for ${host}:`, err.message);
        }
      }
    }
    
    const valid = allRecords.some(record => 
      record.includes(expectedToken) || 
      record.includes(config.verificationPrefix) ||
      record.includes('hosting-site=')
    );
    
    return { valid, found: allRecords };
  } catch (error) {
    return { valid: false, found: [], error: error.message };
  }
}

/**
 * Verify A records point to Firebase Hosting
 */
async function verifyARecords(domain) {
  try {
    const records = await dns.resolve4(domain);
    const valid = records.some(ip => config.firebaseHostingIPs.includes(ip));
    return { valid, found: records };
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return { valid: false, found: [], error: 'No A records found' };
    }
    return { valid: false, found: [], error: error.message };
  }
}

/**
 * Verify CNAME record points to Firebase Hosting
 */
async function verifyCnameRecord(domain) {
  try {
    const records = await dns.resolveCname(domain);
    const cname = records[0] || null;
    
    const valid = cname !== null && (
      cname.includes(config.hostingSiteId) ||
      cname.includes('firebaseapp.com') ||
      cname.includes('web.app')
    );
    
    return { valid, found: cname };
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return { valid: false, found: null, error: 'No CNAME record found' };
    }
    return { valid: false, found: null, error: error.message };
  }
}

/**
 * Perform full DNS verification for a domain
 */
async function performDnsVerification(domain, verificationToken, isSubdomainCheck) {
  const timestamp = admin.firestore.Timestamp.now();
  const errors = [];
  
  // Verify TXT record
  const txtResult = await verifyTxtRecord(domain, verificationToken);
  
  let aRecordValid = false;
  let cnameValid = false;
  let resolvedARecords = [];
  let resolvedCname = null;
  
  if (isSubdomainCheck) {
    const cnameResult = await verifyCnameRecord(domain);
    cnameValid = cnameResult.valid;
    resolvedCname = cnameResult.found || null;
    if (!cnameValid && cnameResult.error) {
      errors.push(`CNAME: ${cnameResult.error}`);
    }
  } else {
    const aResult = await verifyARecords(domain);
    aRecordValid = aResult.valid;
    resolvedARecords = aResult.found || [];
    if (!aRecordValid && aResult.error) {
      errors.push(`A Record: ${aResult.error}`);
    }
  }
  
  const pointingValid = isSubdomainCheck ? cnameValid : aRecordValid;
  const success = txtResult.valid || pointingValid; // TXT or pointing must be valid
  
  if (!txtResult.valid && !pointingValid) {
    errors.push('DNS records not configured correctly');
  }
  
  // Build result object without undefined values (Firestore doesn't accept undefined)
  const result = {
    timestamp,
    success,
    aRecordValid,
    cnameValid,
    txtRecordValid: txtResult.valid,
    resolvedARecords: resolvedARecords || [],
    resolvedTxtRecords: txtResult.found || [],
  };
  
  // Only add optional fields if they have values
  if (resolvedCname) {
    result.resolvedCname = resolvedCname;
  }
  if (errors.length > 0) {
    result.errors = errors;
  }
  
  return result;
}

// ============================================
// Firebase Hosting API Functions
// ============================================

/**
 * Add domain to Firebase Hosting via API
 * Uses PUT https://firebasehosting.googleapis.com/v1beta1/projects/{project}/sites/{site}/domains/{domain}
 */
async function addDomainToFirebaseHosting(domain) {
  try {
    if (!domain || typeof domain !== 'string' || !domain.trim()) {
      throw new Error('Domain is empty or invalid');
    }
    
    const cleanDomain = domain.trim().toLowerCase();
    const client = await googleAuth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    const token = typeof accessTokenResponse === 'string' ? accessTokenResponse : accessTokenResponse?.token;
    if (!token) {
      throw new Error('Failed to obtain Google access token for Firebase Hosting API');
    }
    
    // Firebase Hosting API v1beta1 - Create domain using PUT
    // PUT projects/{project}/sites/{site}/domains/{domainName}
    const url = `https://firebasehosting.googleapis.com/v1beta1/projects/${config.projectId}/sites/${config.hostingSiteId}/domains/${cleanDomain}`;
    
    console.log(`[addDomainToFirebaseHosting] Adding ${cleanDomain} to ${config.hostingSiteId} in project ${config.projectId}`);
    console.log(`[addDomainToFirebaseHosting] URL: ${url}`);
    
    // Use PUT with empty body or minimal body
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site: `projects/${config.projectId}/sites/${config.hostingSiteId}`,
        domainName: cleanDomain
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Domain already exists on this site - not an error, get the status
      if (response.status === 409) {
        console.log(`[addDomainToFirebaseHosting] Domain ${domain} already exists on this site`);
        return await getDomainFromFirebaseHosting(domain);
      }
      
      console.error('[addDomainToFirebaseHosting] Hosting API error:', response.status, JSON.stringify(errorData));
      throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[addDomainToFirebaseHosting] Successfully added ${domain}:`, JSON.stringify(data));
    
    return { success: true, hostingDomain: data };
  } catch (error) {
    console.error(`[addDomainToFirebaseHosting] Error for ${domain}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get domain info from Firebase Hosting
 */
async function getDomainFromFirebaseHosting(domain) {
  try {
    const client = await googleAuth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    const token = typeof accessTokenResponse === 'string' ? accessTokenResponse : accessTokenResponse?.token;
    if (!token) {
      throw new Error('Failed to obtain Google access token for Firebase Hosting API');
    }
    
    const url = `https://firebasehosting.googleapis.com/v1beta1/projects/-/sites/${config.hostingSiteId}/domains/${domain}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Domain not found in Firebase Hosting' };
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, hostingDomain: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove domain from Firebase Hosting
 */
async function removeDomainFromFirebaseHosting(domain) {
  try {
    const client = await googleAuth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    const token = typeof accessTokenResponse === 'string' ? accessTokenResponse : accessTokenResponse?.token;
    if (!token) {
      throw new Error('Failed to obtain Google access token for Firebase Hosting API');
    }
    
    const url = `https://firebasehosting.googleapis.com/v1beta1/projects/-/sites/${config.hostingSiteId}/domains/${domain}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok && response.status !== 404) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
    }
    
    console.log(`[removeDomainFromFirebaseHosting] Removed ${domain}`);
    return { success: true };
  } catch (error) {
    console.error(`[removeDomainFromFirebaseHosting] Error for ${domain}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Extract DNS records from Firebase Hosting domain response
 * Note: Firestore doesn't accept undefined values, so we only include defined fields
 */
function extractDnsRecordsFromHosting(domain, hostingDomain, verificationToken) {
  const isDomainSubdomain = isSubdomain(domain);
  
  const dnsRecords = {
    txtRecord: {
      host: isDomainSubdomain ? domain : '@',
      value: verificationToken,
    },
  };
  
  // Get IPs from Firebase Hosting provisioning or use defaults (only for root domains)
  if (!isDomainSubdomain) {
    if (hostingDomain?.provisioning?.expectedIps?.length) {
      dnsRecords.aRecords = hostingDomain.provisioning.expectedIps;
    } else {
      dnsRecords.aRecords = config.firebaseHostingIPs;
    }
  }
  
  // For subdomains, use CNAME
  if (isDomainSubdomain) {
    dnsRecords.cnameTarget = config.platformDomain;
  }
  
  // Add Firebase's cert challenge TXT if available
  if (hostingDomain?.provisioning?.certChallengeDns) {
    dnsRecords.txtRecord.value = hostingDomain.provisioning.certChallengeDns;
  }
  
  return dnsRecords;
}

/**
 * Generate human-readable DNS instructions
 */
function generateDnsInstructions(domain, dnsRecords, verificationToken) {
  const isDomainSubdomain = isSubdomain(domain);
  const rootDomain = extractRootDomain(domain);
  
  const instructions = {
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
          value: dnsRecords.cnameTarget || config.platformDomain,
          description: 'Point your subdomain to our servers',
        }
      : {
          type: 'A',
          host: '@',
          value: dnsRecords.aRecords || config.firebaseHostingIPs,
          description: 'Point your domain to our servers',
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
// Cloud Functions
// ============================================

/**
 * Add a custom domain
 * HTTP endpoint for adding a new custom domain
 */
exports.addDomain = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }
      
      // Accept both tenantId and businessId for compatibility
      const { domain, tenantId, businessId, siteId } = req.body;
      const resolvedTenantId = tenantId || businessId;
      
      if (!domain || !resolvedTenantId || !siteId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: domain, tenantId/businessId, siteId',
        });
        return;
      }
      
      const cleanDomain = sanitizeDomain(domain);
      if (!cleanDomain) {
        res.status(400).json({ success: false, error: 'Invalid domain format' });
        return;
      }
      
      console.log(`[addDomain] Processing: ${cleanDomain} for tenant ${resolvedTenantId}, site ${siteId}`);
      
      // Check if domain already exists
      const existingQuery = await db
        .collection('customDomains')
        .where('domain', '==', cleanDomain)
        .limit(1)
        .get();
      
      if (!existingQuery.empty) {
        const existingDoc = existingQuery.docs[0];
        const existing = existingDoc.data();
        console.log(`[addDomain] Domain ${cleanDomain} already exists with ID ${existingDoc.id}`);
        
        if (existing.tenantId !== resolvedTenantId) {
          res.status(409).json({
            success: false,
            error: 'This domain is already registered to another account',
          });
          return;
        }
        
        // Ensure dnsRecords exists
        const dnsRecords = existing.dnsRecords || {
          txtRecord: {
            host: isSubdomain(cleanDomain) ? cleanDomain : '@',
            value: existing.verificationToken || generateVerificationToken(),
          },
          ...(isSubdomain(cleanDomain) 
            ? { cnameTarget: config.platformDomain }
            : { aRecords: config.firebaseHostingIPs }
          ),
        };

        // IMPORTANT:
        // If the domain already exists for this tenant, make sure it is linked to the requested siteId.
        // Previously we returned early without updating the site document, which makes the dashboard show "No Domain".
        try {
          const previousSiteId = existing.siteId;
          const domainStatus = existing.status || 'pending_dns';
          const sslStatus = existing.sslStatus || (domainStatus === 'active' ? 'active' : 'pending');
          const verificationTokenToUse = existing.verificationToken || dnsRecords.txtRecord?.value || generateVerificationToken();

          // Ensure the domain is attached to Firebase Hosting (otherwise the browser shows "Site Not Found")
          const hostingEnsure = await addDomainToFirebaseHosting(cleanDomain);
          if (!hostingEnsure.success) {
            console.warn(`[addDomain] Hosting attach failed for existing domain ${cleanDomain}: ${hostingEnsure.error}`);
          }

          // If this domain was linked to another site for the same tenant, detach it there first
          if (previousSiteId && previousSiteId !== siteId) {
            console.log(`[addDomain] Relinking domain ${cleanDomain} from site ${previousSiteId} to site ${siteId}`);
            await db
              .collection('businesses')
              .doc(resolvedTenantId)
              .collection('published_sites')
              .doc(previousSiteId)
              .update({
                customDomain: admin.firestore.FieldValue.delete(),
                customDomainId: admin.firestore.FieldValue.delete(),
                dnsRecords: admin.firestore.FieldValue.delete(),
                domainStatus: admin.firestore.FieldValue.delete(),
                domainVerificationToken: admin.firestore.FieldValue.delete(),
                sslStatus: admin.firestore.FieldValue.delete(),
                updatedAt: admin.firestore.Timestamp.now(),
              });
          }

          // Update the domain doc to point at the requested siteId (idempotent if same)
          await existingDoc.ref.update({
            siteId,
            tenantId: resolvedTenantId,
            dnsRecords,
            verificationToken: verificationTokenToUse,
            ...(hostingEnsure?.hostingDomain?.domainName && { firebaseHostingId: hostingEnsure.hostingDomain.domainName }),
            updatedAt: admin.firestore.Timestamp.now(),
          });

          // Update the requested site doc so the UI can show domain + DNS records
          await db
            .collection('businesses')
            .doc(resolvedTenantId)
            .collection('published_sites')
            .doc(siteId)
            .update({
              customDomain: cleanDomain,
              customDomainId: existingDoc.id,
              domainStatus,
              domainVerificationToken: verificationTokenToUse,
              dnsRecords,
              sslStatus,
              ...(hostingEnsure?.hostingDomain?.domainName && { firebaseSiteId: config.hostingSiteId }),
              updatedAt: admin.firestore.Timestamp.now(),
            });

          console.log(`[addDomain] Site ${siteId} linked to existing domain ${cleanDomain}`);
        } catch (linkError) {
          console.error('[addDomain] Failed to link existing domain to site:', linkError);
          // Don't fail the request; still return the domain info so the UI can show instructions.
        }
        
        // Return existing domain info
        const response = {
          success: true,
          domainId: existingDoc.id,
          domain: cleanDomain,
          status: existing.status || 'pending_dns',
          dnsRecords,
          verificationToken: existing.verificationToken,
          instructions: generateDnsInstructions(cleanDomain, dnsRecords, existing.verificationToken),
        };
        
        console.log(`[addDomain] Returning existing domain info:`, JSON.stringify(response));
        res.json(response);
        return;
      }
      
      // Generate verification token
      const verificationToken = generateVerificationToken();
      
      // Add domain to Firebase Hosting
      const hostingResult = await addDomainToFirebaseHosting(cleanDomain);
      
      // Extract DNS records - ensure no undefined values for Firestore
      let dnsRecords;
      if (hostingResult.hostingDomain) {
        dnsRecords = extractDnsRecordsFromHosting(cleanDomain, hostingResult.hostingDomain, verificationToken);
      } else {
        dnsRecords = {
          txtRecord: {
            host: isSubdomain(cleanDomain) ? cleanDomain : '@',
            value: verificationToken,
          },
        };
        // Only add the relevant record type (no undefined values)
        if (isSubdomain(cleanDomain)) {
          dnsRecords.cnameTarget = config.platformDomain;
        } else {
          dnsRecords.aRecords = config.firebaseHostingIPs;
        }
      }
      
      // Create domain document - ensure no undefined values for Firestore
      const domainDoc = {
        domain: cleanDomain,
        rootDomain: extractRootDomain(cleanDomain),
        isSubdomain: isSubdomain(cleanDomain),
        tenantId: resolvedTenantId,
        siteId,
        status: hostingResult.success ? 'ssl_pending' : 'pending_dns',
        verificationToken,
        verificationMethod: 'txt',
        dnsRecords,
        sslStatus: hostingResult.success ? 'pending' : 'none',
        failureCount: 0,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        createdBy: resolvedTenantId,
      };
      
      // Only add firebaseHostingId if it exists
      if (hostingResult.hostingDomain?.domainName) {
        domainDoc.firebaseHostingId = hostingResult.hostingDomain.domainName;
      }
      
      // Save to Firestore
      const docRef = await db.collection('customDomains').add(domainDoc);
      
      // Update the site document
      console.log(`[addDomain] Updating site ${siteId} with domain ${cleanDomain}`);
      await db
        .collection('businesses')
        .doc(resolvedTenantId)
        .collection('published_sites')
        .doc(siteId)
        .update({
          customDomain: cleanDomain,
          customDomainId: docRef.id,
          domainStatus: domainDoc.status,
          domainVerificationToken: verificationToken,
          dnsRecords,
          sslStatus: domainDoc.sslStatus,
          updatedAt: admin.firestore.Timestamp.now(),
        });
      console.log(`[addDomain] Site ${siteId} updated successfully`);
      
      // Handle WWW subdomain automatically for root domains
      if (!isSubdomain(cleanDomain)) {
        const wwwDomain = `www.${cleanDomain}`;
        await addDomainToFirebaseHosting(wwwDomain);
      }
      
      console.log(`[addDomain] Created domain ${cleanDomain} with ID ${docRef.id}`);
      
      res.json({
        success: true,
        domainId: docRef.id,
        domain: cleanDomain,
        status: domainDoc.status,
        dnsRecords,
        verificationToken,
        instructions: generateDnsInstructions(cleanDomain, dnsRecords, verificationToken),
      });
      
    } catch (error) {
      console.error('[addDomain] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Alias for backward compatibility
exports.connectDomain = exports.addDomain;
exports.connectDomainHttp = exports.addDomain;

/**
 * Verify a domain's DNS configuration
 */
exports.verifyDomain = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }
      
      // Accept both tenantId and businessId for compatibility
      const { domainId, tenantId, businessId, siteId } = req.body;
      const resolvedTenantId = tenantId || businessId;
      
      // If no domainId but has siteId, look up domain by site
      let actualDomainId = domainId;
      if (!actualDomainId && siteId && resolvedTenantId) {
        const siteDoc = await db
          .collection('businesses')
          .doc(resolvedTenantId)
          .collection('published_sites')
          .doc(siteId)
          .get();
        if (siteDoc.exists) {
          actualDomainId = siteDoc.data()?.customDomainId;
        }
      }
      
      if (!actualDomainId || !resolvedTenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: domainId, tenantId/businessId',
        });
        return;
      }
      
      console.log(`[verifyDomain] Verifying domain ${actualDomainId}`);
      
      const domainRef = db.collection('customDomains').doc(actualDomainId);
      const domainSnap = await domainRef.get();
      
      if (!domainSnap.exists) {
        res.status(404).json({ success: false, error: 'Domain not found' });
        return;
      }
      
      const domainData = domainSnap.data();
      
      if (domainData.tenantId !== resolvedTenantId) {
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
      let newStatus = domainData.status;
      
      if (checkResult.success) {
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
        newStatus = 'dns_configured';
      } else if (domainData.status === 'active') {
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
      
      // Check SSL status from Firebase Hosting
      if (newStatus === 'ssl_pending' || newStatus === 'verified') {
        const hostingStatus = await getDomainFromFirebaseHosting(domainData.domain);
        if (hostingStatus.success && hostingStatus.hostingDomain) {
          const certStatus = hostingStatus.hostingDomain.provisioning?.certStatus;
          if (certStatus === 'CERT_ACTIVE') {
            newStatus = 'active';
            await domainRef.update({ status: 'active', sslStatus: 'active' });
          }
        }
      }
      
      console.log(`[verifyDomain] Domain ${domainData.domain} status: ${newStatus}`);
      
      res.json({
        success: true,
        status: newStatus,
        checkResult,
      });
      
    } catch (error) {
      console.error('[verifyDomain] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Alias for backward compatibility
exports.verifyDomainHttp = exports.verifyDomain;

/**
 * Remove a custom domain
 */
exports.removeDomain = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      if (req.method !== 'POST' && req.method !== 'DELETE') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }
      
      // Accept both tenantId and businessId for compatibility
      const { domainId, tenantId, businessId, siteId } = req.body;
      const resolvedTenantId = tenantId || businessId;
      
      // If no domainId but has siteId, look up domain by site
      let actualDomainId = domainId;
      if (!actualDomainId && siteId && resolvedTenantId) {
        const siteDoc = await db
          .collection('businesses')
          .doc(resolvedTenantId)
          .collection('published_sites')
          .doc(siteId)
          .get();
        if (siteDoc.exists) {
          actualDomainId = siteDoc.data()?.customDomainId;
        }
      }
      
      if (!actualDomainId || !resolvedTenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: domainId, tenantId/businessId',
        });
        return;
      }
      
      console.log(`[removeDomain] Removing domain ${actualDomainId}`);
      
      const domainRef = db.collection('customDomains').doc(actualDomainId);
      const domainSnap = await domainRef.get();
      
      if (!domainSnap.exists) {
        res.status(404).json({ success: false, error: 'Domain not found' });
        return;
      }
      
      const domainData = domainSnap.data();
      
      if (domainData.tenantId !== resolvedTenantId) {
        res.status(403).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      // Remove from Firebase Hosting
      await removeDomainFromFirebaseHosting(domainData.domain);
      
      // Remove WWW subdomain if root domain
      if (!domainData.isSubdomain) {
        await removeDomainFromFirebaseHosting(`www.${domainData.domain}`);
      }
      
      // Update site document
      await db
        .collection('businesses')
        .doc(resolvedTenantId)
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
      
      console.log(`[removeDomain] Removed domain ${domainData.domain}`);
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('[removeDomain] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Get domain status
 */
exports.getDomainStatus = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      // Accept both tenantId and businessId for compatibility
      const domainId = req.query.domainId || req.body?.domainId;
      const tenantId = req.query.tenantId || req.body?.tenantId;
      const businessId = req.query.businessId || req.body?.businessId;
      const resolvedTenantId = tenantId || businessId;
      
      if (!domainId || !resolvedTenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: domainId, tenantId/businessId',
        });
        return;
      }
      
      const domainRef = db.collection('customDomains').doc(domainId);
      const domainSnap = await domainRef.get();
      
      if (!domainSnap.exists) {
        res.status(404).json({ success: false, error: 'Domain not found' });
        return;
      }
      
      const domainData = { id: domainSnap.id, ...domainSnap.data() };
      
      if (domainData.tenantId !== resolvedTenantId) {
        res.status(403).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      // Check fresh status from Firebase Hosting for pending domains
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
      
    } catch (error) {
      console.error('[getDomainStatus] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * List all domains for a tenant
 */
exports.listDomains = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      // Accept both tenantId and businessId for compatibility
      const tenantId = req.query.tenantId || req.body?.tenantId;
      const businessId = req.query.businessId || req.body?.businessId;
      const resolvedTenantId = tenantId || businessId;
      
      if (!resolvedTenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: tenantId/businessId',
        });
        return;
      }
      
      const domainsSnapshot = await db
        .collection('customDomains')
        .where('tenantId', '==', resolvedTenantId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const domains = domainsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      res.json({ success: true, domains });
      
    } catch (error) {
      console.error('[listDomains] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Scheduled health check for all domains
 */
exports.checkDomainHealth = functions.scheduler.onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    console.log('[checkDomainHealth] Starting scheduled check');
    
    try {
      const domainsToCheck = await db
        .collection('customDomains')
        .where('status', 'in', ['ssl_pending', 'active', 'broken'])
        .get();
      
      console.log(`[checkDomainHealth] Checking ${domainsToCheck.size} domains`);
      
      const batch = db.batch();
      let updateCount = 0;
      
      for (const doc of domainsToCheck.docs) {
        const domainData = doc.data();
        
        // Check SSL status from Firebase Hosting
        const hostingStatus = await getDomainFromFirebaseHosting(domainData.domain);
        
        let newStatus = domainData.status;
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
        console.log(`[checkDomainHealth] Updated ${updateCount} domains`);
      }
      
      console.log('[checkDomainHealth] Completed');
      
    } catch (error) {
      console.error('[checkDomainHealth] Error:', error);
      throw error;
    }
  }
);

/**
 * Force reconnect domain to the correct hosting site (admin debug endpoint)
 * This removes the domain from Firebase Hosting and re-adds it
 */
exports.forceReconnectDomain = functions.https.onRequest(
  { cors: true, maxInstances: 10 },
  async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
      }
      
      const { domain, adminKey } = req.body;
      
      // Simple admin key check (you should use a proper auth system)
      if (adminKey !== 'xdigix-admin-2026') {
        res.status(403).json({ success: false, error: 'Unauthorized' });
        return;
      }
      
      if (!domain) {
        res.status(400).json({ success: false, error: 'Missing domain' });
        return;
      }
      
      const cleanDomain = sanitizeDomain(domain);
      console.log(`[forceReconnectDomain] Force reconnecting: ${cleanDomain}`);
      
      // Step 1: Get access token
      const client = await googleAuth.getClient();
      const accessTokenResponse = await client.getAccessToken();
      const token = typeof accessTokenResponse === 'string' ? accessTokenResponse : accessTokenResponse?.token;
      if (!token) {
        throw new Error('Failed to obtain Google access token');
      }
      
      // Step 2: Try to remove from all known hosting sites
      const allSites = ['madas-sites-c3c5e', 'madas-store', 'addict-123', 'xdigix'];
      const removeResults = [];
      
      for (const siteId of allSites) {
        try {
          const deleteUrl = `https://firebasehosting.googleapis.com/v1beta1/projects/-/sites/${siteId}/domains/${cleanDomain}`;
          const deleteResp = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          removeResults.push({ siteId, status: deleteResp.status });
          console.log(`[forceReconnectDomain] Remove from ${siteId}: ${deleteResp.status}`);
        } catch (err) {
          removeResults.push({ siteId, error: err.message });
        }
      }
      
      // Wait a bit for Firebase to process removals
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Add to the correct site (madas-sites-c3c5e) using the existing function
      const addResult = await addDomainToFirebaseHosting(cleanDomain);
      console.log(`[forceReconnectDomain] Add to madas-sites-c3c5e:`, JSON.stringify(addResult));

      // Step 4: Also add www subdomain for root domains
      if (!isSubdomain(cleanDomain)) {
        const wwwDomain = `www.${cleanDomain}`;
        const wwwResult = await addDomainToFirebaseHosting(wwwDomain);
        console.log(`[forceReconnectDomain] Add www:`, JSON.stringify(wwwResult));
      }
      
      res.json({
        success: addResult.success,
        removeResults,
        addResult,
        message: addResult.success
          ? `Domain ${cleanDomain} is now connected to madas-sites-c3c5e`
          : `Failed to add domain: ${addResult.error || 'Unknown error'}`,
      });
      
    } catch (error) {
      console.error('[forceReconnectDomain] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Export utilities for other modules
module.exports.utils = {
  sanitizeDomain,
  isSubdomain,
  extractRootDomain,
  generateVerificationToken,
  generateDnsInstructions,
  performDnsVerification,
  addDomainToFirebaseHosting,
  getDomainFromFirebaseHosting,
  removeDomainFromFirebaseHosting,
};
