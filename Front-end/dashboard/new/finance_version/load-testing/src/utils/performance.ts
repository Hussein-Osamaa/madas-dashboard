/**
 * Performance Monitoring - Firebase Performance removed.
 * Functions now execute directly without tracing.
 */

export async function trackPageLoad(_pageName: string): Promise<void> {
  // no-op: Firebase Performance removed
}

export async function measurePerformance<T>(
  _traceName: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

export async function trackFirestoreOperation<T>(
  _collectionName: string,
  _operation: 'read' | 'write' | 'list',
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

export async function trackNetworkRequest<T>(
  _url: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

export function setPerformanceAttribute(_name: string, _value: string): void {
  // no-op: Firebase Performance removed
}

export function getPerformanceInstance() {
  return null;
}
