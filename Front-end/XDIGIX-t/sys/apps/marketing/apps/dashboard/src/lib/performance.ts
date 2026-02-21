/**
 * Firebase Performance Monitoring Utilities
 * Helper functions for tracking performance metrics
 */

import { trace } from 'firebase/performance';
import { app, getPerformance } from './firebase';
import type { FirebasePerformance } from 'firebase/performance';

/**
 * Get Firebase Performance instance
 * Ensures Performance Monitoring is initialized
 */
function getPerf(): FirebasePerformance | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return getPerformance(app);
  } catch (error) {
    console.debug('[Performance] Firebase Performance not available:', error);
    return null;
  }
}

/**
 * Track page load performance
 * Creates an automatic trace for page loads
 * 
 * @param pageName - Name of the page (e.g., 'dashboard', 'orders')
 */
export async function trackPageLoad(pageName: string): Promise<void> {
  if (typeof window === 'undefined') {
    return; // Server-side rendering
  }

  try {
    const perf = getPerf();
    if (!perf) {
      return;
    }

    const pageTrace = trace(perf, `page_load_${pageName}`);
    pageTrace.start();
    
    // Stop trace after page is loaded (using Performance API for accurate timing)
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      if (loadTime > 0) {
        // Page already loaded
        pageTrace.stop();
      } else {
        // Wait for page load
        window.addEventListener('load', () => {
          pageTrace.stop();
        }, { once: true });
      }
    } else {
      // Fallback: stop after short delay
      setTimeout(() => {
        pageTrace.stop();
      }, 500);
    }
  } catch (error) {
    console.debug('[Performance] Failed to track page load:', error);
  }
}

/**
 * Track custom performance trace
 * 
 * @param traceName - Name of the trace
 * @param fn - Function to measure
 * @returns Result of the function
 */
export async function measurePerformance<T>(
  traceName: string,
  fn: () => Promise<T>
): Promise<T> {
  if (typeof window === 'undefined') {
    return fn(); // Server-side rendering
  }

  const perf = getPerf();
  if (!perf) {
    return fn();
  }

  const customTrace = trace(perf, traceName);
  customTrace.start();

  try {
    const result = await fn();
    customTrace.stop();
    return result;
  } catch (error) {
    customTrace.stop();
    throw error;
  }
}

/**
 * Track Firestore query performance
 * 
 * @param collectionName - Name of the collection
 * @param operation - Operation type (read, write, list)
 * @param fn - Function that performs the Firestore operation
 * @returns Result of the function
 */
export async function trackFirestoreOperation<T>(
  collectionName: string,
  operation: 'read' | 'write' | 'list',
  fn: () => Promise<T>
): Promise<T> {
  return measurePerformance(`firestore_${operation}_${collectionName}`, fn);
}

/**
 * Track network request performance
 * 
 * @param url - Request URL
 * @param fn - Function that performs the network request
 * @returns Result of the function
 */
export async function trackNetworkRequest<T>(
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  const urlKey = url.replace(/[^a-zA-Z0-9]/g, '_');
  return measurePerformance(`network_request_${urlKey}`, fn);
}

/**
 * Add custom attribute to current trace
 * 
 * @param name - Attribute name
 * @param value - Attribute value
 */
export function setPerformanceAttribute(name: string, value: string): void {
  const perf = getPerf();
  if (!perf) {
    return;
  }

  try {
    // Note: Attributes need to be set on an active trace
    // This is a placeholder - actual implementation depends on active trace context
    console.log(`[Performance] Attribute: ${name} = ${value}`);
  } catch (error) {
    console.error('[Performance] Failed to set attribute:', error);
  }
}

/**
 * Get Firebase Performance instance
 * @returns Performance instance or null if not supported
 */
export function getPerformanceInstance() {
  return getPerf();
}
