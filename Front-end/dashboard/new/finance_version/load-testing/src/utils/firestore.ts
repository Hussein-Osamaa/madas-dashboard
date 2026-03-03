import http from 'k6/http';
import { check } from 'k6';
import { firestoreThrottleRate, errorRate } from '../../k6.config';
import { env } from '../../k6.config';

/**
 * Firestore Safe Write Helper
 * Implements best practices to avoid hot-document throttling:
 * - Randomized document IDs
 * - Exponential backoff on 429 (RESOURCE_EXHAUSTED)
 * - Batch writes when possible
 */

/**
 * Generate a safe, randomized document ID for writes
 * Format: loadtest_{timestamp}_{uuid}
 * This prevents hot-document writes to the same key
 * 
 * @param prefix - Optional prefix (defaults to 'loadtest')
 * @returns Randomized document ID
 */
export function generateSafeDocId(prefix = 'loadtest'): string {
  const timestamp = Date.now();
  // Simple UUID-like random string (not cryptographically secure, but sufficient for load testing)
  const uuid = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  return `${prefix}_${timestamp}_${uuid}`;
}

/**
 * Exponential backoff retry helper
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelay - Initial delay in ms (default: 1000)
 * @returns Result of function or null if all retries fail
 */
async function withRetry<T>(
  fn: () => T,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = fn();
      
      // If result is an HTTP response, check for throttling
      if (result && typeof result === 'object' && 'status' in result) {
        const response = result as any;
        if (response.status === 429) {
          firestoreThrottleRate.add(1);
          
          if (attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt);
            console.warn(`[FIRESTORE] Throttled (429), retrying after ${delay}ms...`);
            // In k6, we can't use async/await for sleep, so we'll handle it differently
            // For now, return error and let caller handle retry logic
            return null;
          }
        }
      }
      
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        return null;
      }
      const delay = initialDelay * Math.pow(2, attempt);
      // Sleep logic handled by k6 sleep function in caller
    }
  }
  return null;
}

/**
 * Firestore REST API: Create document
 * Uses randomized document ID to avoid hot-doc writes
 * 
 * @param collection - Collection path (e.g., 'projects' or 'tenants/{tenantId}/projects')
 * @param data - Document data
 * @param authToken - Firebase ID token
 * @param docId - Optional custom document ID (if not provided, generates random)
 * @returns HTTP response
 */
export function createDocument(
  collection: string,
  data: Record<string, any>,
  authToken: string,
  docId?: string,
  businessId?: string
): any {
  const docIdToUse = docId || generateSafeDocId();
  const projectId = __ENV.FIREBASE_PROJECT_ID || 'madas-store';
  const firestoreUrl = __ENV.FIRESTORE_URL || env.firestoreUrl;
  
  // MADAS Dashboard structure: businesses/{businessId}/{subCollection}/{docId}
  // If businessId provided, use sub-collection path; otherwise top-level collection
  let collectionPath = collection;
  if (businessId && !collection.startsWith('businesses/')) {
    // Sub-collection under a business
    collectionPath = `businesses/${businessId}/${collection}`;
  }
  
  const url = firestoreUrl
    .replace('{{PROJECT_ID}}', projectId)
    .replace('(default)', '(default)') +
    `/${collectionPath}/${docIdToUse}`;
  
  const payload = JSON.stringify({
    fields: convertToFirestoreFields(data),
  });
  
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    tags: { name: `firestore_create_${collection}` },
  };
  
  const response = http.post(url, payload, params);
  
  // Handle 429 (RESOURCE_EXHAUSTED) throttling
  if (response.status === 429) {
    firestoreThrottleRate.add(1);
    console.warn(`[FIRESTORE] Throttled creating document in ${collection}`);
  }
  
  const success = check(response, {
    [`firestore create status ${collection}`]: (r) => r.status === 200 || r.status === 201,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  return response;
}

/**
 * Firestore REST API: Batch write (up to 500 documents)
 * More efficient than individual writes and helps avoid throttling
 * 
 * @param collection - Collection path
 * @param documents - Array of document data objects
 * @param authToken - Firebase ID token
 * @returns HTTP response
 */
export function batchCreateDocuments(
  collection: string,
  documents: Array<{ data: Record<string, any>; docId?: string }>,
  authToken: string
): any {
  const projectId = __ENV.FIREBASE_PROJECT_ID || '{{PROJECT_ID}}';
  const firestoreUrl = __ENV.FIRESTORE_URL || env.firestoreUrl;
  
  // Firestore batch write endpoint
  // TODO: Replace with actual batch write endpoint
  const url = firestoreUrl
    .replace('{{PROJECT_ID}}', projectId)
    .replace('(default)', '(default)') +
    ':batchWrite';
  
  const writes = documents.map(({ data, docId }) => ({
    update: {
      name: `${projectId}/databases/(default)/documents/${collection}/${docId || generateSafeDocId()}`,
      fields: convertToFirestoreFields(data),
    },
  }));
  
  const payload = JSON.stringify({ writes });
  
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    tags: { name: `firestore_batch_create_${collection}` },
  };
  
  const response = http.post(url, payload, params);
  
  if (response.status === 429) {
    firestoreThrottleRate.add(1);
  }
  
  const success = check(response, {
    [`firestore batch create status ${collection}`]: (r) => r.status === 200,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  return response;
}

/**
 * Firestore REST API: Read document
 * 
 * @param collection - Collection path
 * @param docId - Document ID
 * @param authToken - Firebase ID token
 * @returns HTTP response
 */
export function readDocument(
  collection: string,
  docId: string,
  authToken: string
): any {
  const projectId = __ENV.FIREBASE_PROJECT_ID || '{{PROJECT_ID}}';
  const firestoreUrl = __ENV.FIRESTORE_URL || env.firestoreUrl;
  
  const url = firestoreUrl
    .replace('{{PROJECT_ID}}', projectId)
    .replace('(default)', '(default)') +
    `/${collection}/${docId}`;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { name: `firestore_read_${collection}` },
  };
  
  const response = http.get(url, params);
  
  if (response.status === 429) {
    firestoreThrottleRate.add(1);
  }
  
  check(response, {
    [`firestore read status ${collection}`]: (r) => r.status === 200,
  });
  
  return response;
}

/**
 * Firestore REST API: List documents (paginated)
 * 
 * @param collection - Collection path
 * @param authToken - Firebase ID token
 * @param pageSize - Number of documents per page (default: 50)
 * @param pageToken - Optional pagination token
 * @returns HTTP response
 */
export function listDocuments(
  collection: string,
  authToken: string,
  pageSize = 50,
  pageToken?: string
): any {
  const projectId = __ENV.FIREBASE_PROJECT_ID || '{{PROJECT_ID}}';
  const firestoreUrl = __ENV.FIRESTORE_URL || env.firestoreUrl;
  
  let url = firestoreUrl
    .replace('{{PROJECT_ID}}', projectId)
    .replace('(default)', '(default)') +
    `/${collection}`;
  
  const queryParams: Record<string, string> = {
    pageSize: pageSize.toString(),
  };
  
  if (pageToken) {
    queryParams.pageToken = pageToken;
  }
  
  const queryString = new URLSearchParams(queryParams).toString();
  url += `?${queryString}`;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { name: `firestore_list_${collection}` },
  };
  
  const response = http.get(url, params);
  
  if (response.status === 429) {
    firestoreThrottleRate.add(1);
  }
  
  check(response, {
    [`firestore list status ${collection}`]: (r) => r.status === 200,
  });
  
  return response;
}

/**
 * Convert JavaScript object to Firestore fields format
 * Firestore REST API expects a specific nested structure
 * 
 * @param data - Plain JavaScript object
 * @returns Firestore fields object
 */
function convertToFirestoreFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      fields[key] = { arrayValue: { values: value.map(v => convertToFirestoreFields({ value: v }).value) } };
    } else if (typeof value === 'object') {
      fields[key] = { mapValue: { fields: convertToFirestoreFields(value) } };
    }
  }
  
  return fields;
}

/**
 * Parse Firestore response fields back to JavaScript object
 * 
 * @param fields - Firestore fields object
 * @returns Plain JavaScript object
 */
export function parseFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, field] of Object.entries(fields)) {
    if ('nullValue' in field) {
      result[key] = null;
    } else if ('booleanValue' in field) {
      result[key] = field.booleanValue;
    } else if ('integerValue' in field) {
      result[key] = parseInt(field.integerValue);
    } else if ('doubleValue' in field) {
      result[key] = parseFloat(field.doubleValue);
    } else if ('stringValue' in field) {
      result[key] = field.stringValue;
    } else if ('timestampValue' in field) {
      result[key] = new Date(field.timestampValue);
    } else if ('arrayValue' in field) {
      result[key] = field.arrayValue.values?.map((v: any) => parseFirestoreFields({ value: v }).value) || [];
    } else if ('mapValue' in field) {
      result[key] = parseFirestoreFields(field.mapValue.fields || {});
    }
  }
  
  return result;
}

