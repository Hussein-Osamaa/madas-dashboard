/**
 * Firebase Performance Monitoring REST API Helper
 * 
 * This module provides utilities to send performance data to Firebase Performance Monitoring
 * via REST API. Note that Firebase Performance Monitoring is primarily client-side, but
 * we can send custom traces and aggregated metrics.
 */

interface FirebasePerfConfig {
  projectId: string;
  appId: string;
  apiKey?: string;
}

/**
 * Initialize Firebase Performance Monitoring
 * 
 * @param config - Firebase Performance Monitoring configuration
 */
export function initFirebasePerformance(config: FirebasePerfConfig): void {
  const projectId = config.projectId || __ENV.FIREBASE_PROJECT_ID || 'madas-store';
  const appId = config.appId || '1:527071300010:web:7470e2204065b4590583d3';
  
  console.log(`[FIREBASE_PERF] Initialized for project: ${projectId}, app: ${appId}`);
}

/**
 * Send custom trace to Firebase Performance Monitoring
 * 
 * Note: This requires Firebase Admin SDK or service account credentials
 * For k6 load testing, we primarily aggregate metrics locally
 * 
 * @param traceName - Name of the trace
 * @param durationMs - Duration in milliseconds
 * @param attributes - Optional attributes
 */
export function sendTraceToFirebasePerf(
  traceName: string,
  durationMs: number,
  attributes?: Record<string, string>
): void {
  const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';
  
  // Firebase Performance Monitoring REST API endpoint structure:
  // POST https://firebase.googleapis.com/v1/projects/{projectId}/apps/{appId}/traces
  
  // This would require:
  // 1. Firebase Admin SDK credentials
  // 2. Proper authentication (OAuth2)
  // 3. Correct API format
  
  // For load testing, we log this for now
  // In production, implement actual REST API call
  
  console.log(`[FIREBASE_PERF] Trace: ${traceName}, Duration: ${durationMs}ms`);
}

/**
 * Format k6 metrics for Firebase Performance Monitoring
 * Converts k6 trend metrics to Firebase Performance Monitoring format
 * 
 * @param metricName - k6 metric name
 * @param values - Metric values
 * @returns Formatted data for Firebase Performance Monitoring
 */
export function formatK6MetricsForFirebasePerf(
  metricName: string,
  values: number[]
): any {
  if (values.length === 0) {
    return null;
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  
  return {
    metric_name: metricName,
    count: values.length,
    average: sum / values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}

/**
 * Get Firebase Performance Monitoring console URL
 * 
 * @param projectId - Firebase project ID
 * @returns URL to Firebase Performance Monitoring console
 */
export function getFirebasePerfConsoleUrl(projectId?: string): string {
  const pid = projectId || __ENV.FIREBASE_PROJECT_ID || 'madas-store';
  return `https://console.firebase.google.com/project/${pid}/performance`;
}

