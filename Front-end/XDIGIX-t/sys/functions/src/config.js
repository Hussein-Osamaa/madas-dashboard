/**
 * Centralized Configuration for MADAS/XDIGIX Platform
 * All configurable values should be defined here
 */

// Platform branding - Change these to customize your platform
const PLATFORM_NAME = process.env.PLATFORM_NAME || 'XDIGIX';
const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || 'madas-store.web.app';

// Firebase project configuration
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'madas-store';

// Hosting sites configuration
const DASHBOARD_SITE_ID = process.env.DASHBOARD_SITE_ID || 'madas-store';
const SITES_SITE_ID = process.env.SITES_SITE_ID || 'madas-sites-c3c5e';

// Generate domain URLs
const getDashboardUrl = () => {
  if (PLATFORM_DOMAIN && PLATFORM_DOMAIN !== 'xdigix.com') {
    return `https://${PLATFORM_DOMAIN}`;
  }
  return `https://${DASHBOARD_SITE_ID}.web.app`;
};

const getSitesUrl = () => {
  if (PLATFORM_DOMAIN && PLATFORM_DOMAIN !== 'xdigix.com') {
    return `https://sites.${PLATFORM_DOMAIN}`;
  }
  return `https://${SITES_SITE_ID}.web.app`;
};

// All allowed domains for CORS and routing
const getAllowedDomains = () => {
  const domains = [
    // Firebase default domains
    `https://${DASHBOARD_SITE_ID}.web.app`,
    `https://${DASHBOARD_SITE_ID}.firebaseapp.com`,
    `https://${SITES_SITE_ID}.web.app`,
    `https://${SITES_SITE_ID}.firebaseapp.com`,
    // External websites
    'https://addict-123.web.app',
    'https://addict-123.firebaseapp.com',
    // XDIGIX custom domain
    'https://xdigix.com',
    'https://www.xdigix.com',
    // Customer custom domains
    'https://addict-eg.com',
    'https://www.addict-eg.com',
    // Local development
    'http://localhost:5000',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:8000',
    'http://localhost:8080',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
  ];
  
  // Add custom platform domain if configured
  if (PLATFORM_DOMAIN) {
    domains.push(`https://${PLATFORM_DOMAIN}`);
    domains.push(`https://www.${PLATFORM_DOMAIN}`);
    domains.push(`https://sites.${PLATFORM_DOMAIN}`);
    domains.push(`https://dashboard.${PLATFORM_DOMAIN}`);
  }
  
  return domains;
};

// Check if a hostname is a default/known domain
const isDefaultDomain = (hostname) => {
  const defaultPatterns = [
    `${DASHBOARD_SITE_ID}.web.app`,
    `${SITES_SITE_ID}.web.app`,
    `${DASHBOARD_SITE_ID}.firebaseapp.com`,
    `${SITES_SITE_ID}.firebaseapp.com`,
  ];
  
  // Add platform domain patterns
  if (PLATFORM_DOMAIN) {
    defaultPatterns.push(PLATFORM_DOMAIN);
    defaultPatterns.push(`www.${PLATFORM_DOMAIN}`);
    defaultPatterns.push(`sites.${PLATFORM_DOMAIN}`);
    defaultPatterns.push(`dashboard.${PLATFORM_DOMAIN}`);
  }
  
  return defaultPatterns.some(pattern => hostname.includes(pattern));
};

module.exports = {
  PLATFORM_NAME,
  PLATFORM_DOMAIN,
  FIREBASE_PROJECT_ID,
  DASHBOARD_SITE_ID,
  SITES_SITE_ID,
  getDashboardUrl,
  getSitesUrl,
  getAllowedDomains,
  isDefaultDomain,
};

