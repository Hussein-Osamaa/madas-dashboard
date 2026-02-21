/**
 * Domain System - Module Exports
 * 
 * Exports all domain-related Cloud Functions and utilities.
 */

// Export all Cloud Functions from domain service
export {
  addDomain,
  verifyDomain,
  removeDomain,
  getDomainStatus,
  listDomains,
  domainHealthCheck,
} from './domainService';

// Export the website serving function
export { serveWebsite } from './routingService';

// Export types
export * from './types';

