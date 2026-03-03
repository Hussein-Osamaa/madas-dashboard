import { Trend, Counter, Rate } from 'k6/metrics';
import { trackPerformanceTrace, trackPageLoad, trackNetworkRequest } from './performance';

/**
 * Custom Metrics for System Load Testing
 * Tracks performance indicators specific to multi-tenant SaaS operations
 * Integrates with Firebase Performance Monitoring
 */

// Latency metrics
export const readLatency = new Trend('read_operation_latency', true);
export const writeLatency = new Trend('write_operation_latency', true);
export const dashboardLatency = new Trend('dashboard_load_latency', true);
export const apiLatency = new Trend('api_request_latency', true);

// Throughput metrics
export const readsPerSecond = new Counter('reads_per_second');
export const writesPerSecond = new Counter('writes_per_second');
export const requestsPerSecond = new Counter('requests_per_second');

// Error metrics
export const firestoreErrors = new Rate('firestore_errors');
export const functionErrors = new Rate('function_errors');
export const authErrors = new Rate('auth_errors');

// Business metrics
export const tenantSwitches = new Counter('tenant_switches');
export const documentCreates = new Counter('document_creates');
export const documentUpdates = new Counter('document_updates');
export const documentDeletes = new Counter('document_deletes');

/**
 * Record a read operation
 * 
 * @param duration - Operation duration in ms
 * @param tags - Optional tags for filtering
 */
export function recordRead(duration: number, tags?: Record<string, string>): void {
  readLatency.add(duration, tags);
  readsPerSecond.add(1, tags);
}

/**
 * Record a write operation
 * 
 * @param duration - Operation duration in ms
 * @param tags - Optional tags for filtering
 */
export function recordWrite(duration: number, tags?: Record<string, string>): void {
  writeLatency.add(duration, tags);
  writesPerSecond.add(1, tags);
}

/**
 * Record dashboard load
 * 
 * @param duration - Load duration in ms
 * @param tags - Optional tags for filtering
 */
export function recordDashboardLoad(duration: number, tags?: Record<string, string>): void {
  dashboardLatency.add(duration, tags);
  // Also send to Firebase Performance Monitoring
  trackPageLoad(tags?.page || 'dashboard', duration);
}

/**
 * Record API request
 * 
 * @param duration - Request duration in ms
 * @param tags - Optional tags for filtering
 */
export function recordApiRequest(duration: number, tags?: Record<string, string>): void {
  apiLatency.add(duration, tags);
  requestsPerSecond.add(1, tags);
  // Also send to Firebase Performance Monitoring
  trackNetworkRequest(tags?.url || 'unknown', duration, tags?.method || 'GET');
}

/**
 * Record Firestore error
 * 
 * @param tags - Optional tags for filtering
 */
export function recordFirestoreError(tags?: Record<string, string>): void {
  firestoreErrors.add(1, tags);
}

/**
 * Record Function error
 * 
 * @param tags - Optional tags for filtering
 */
export function recordFunctionError(tags?: Record<string, string>): void {
  functionErrors.add(1, tags);
}

/**
 * Record auth error
 * 
 * @param tags - Optional tags for filtering
 */
export function recordAuthError(tags?: Record<string, string>): void {
  authErrors.add(1, tags);
}

/**
 * Record tenant switch
 * 
 * @param fromTenant - Previous tenant ID
 * @param toTenant - New tenant ID
 */
export function recordTenantSwitch(fromTenant: string, toTenant: string): void {
  tenantSwitches.add(1, { from: fromTenant, to: toTenant });
}

/**
 * Record document operation
 * 
 * @param operation - Operation type (create, update, delete)
 * @param collection - Collection name
 * @param tags - Optional tags for filtering
 */
export function recordDocumentOperation(
  operation: 'create' | 'update' | 'delete',
  collection: string,
  tags?: Record<string, string>
): void {
  switch (operation) {
    case 'create':
      documentCreates.add(1, { collection, ...tags });
      break;
    case 'update':
      documentUpdates.add(1, { collection, ...tags });
      break;
    case 'delete':
      documentDeletes.add(1, { collection, ...tags });
      break;
  }
}


