import http from 'k6/http';
import { check, sleep } from 'k6';
import { authHeader } from '../utils/auth';
import {
  getTenantHeaders,
  getTenantUrl,
  setTenantContext,
  getRandomTenantId,
} from '../utils/tenant';
import {
  createDocument,
  readDocument,
  batchCreateDocuments,
} from '../utils/firestore';
import {
  recordRead,
  recordWrite,
  recordDocumentOperation,
  recordApiRequest,
} from '../utils/metrics';

/**
 * CRUD Operations Scenario
 * Tests create, read, update, delete operations with randomized IDs to avoid hot-doc writes
 */

/**
 * Create Resource Scenario
 * Creates a new resource via API endpoint
 */
export function createResourceScenario(
  token: string,
  collection: string,
  templateData: Record<string, any>
): string | null {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  const startTime = Date.now();
  
  // TODO: Replace with actual create endpoint
  const createUrl = getTenantUrl(`/api/${collection}`, false);
  
  // Merge template with randomized data to avoid conflicts
  const data = {
    ...templateData,
    name: `${templateData.name || 'Item'}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    createdAt: new Date().toISOString(),
  };
  
  const headers = {
    ...authHeader(token),
    ...getTenantHeaders(),
  };
  
  const response = http.post(
    createUrl,
    JSON.stringify(data),
    {
      headers,
      tags: { name: `create_${collection}` },
    }
  );
  
  const duration = Date.now() - startTime;
  recordWrite(duration, { collection, operation: 'create' });
  recordApiRequest(duration);
  recordDocumentOperation('create', collection);
  
  const success = check(response, {
    [`create ${collection} status 201`]: (r) => r.status === 201 || r.status === 200,
    [`create ${collection} has id`]: (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return !!(body.id || body.data?.id);
      } catch {
        return false;
      }
    },
  });
  
  if (success) {
    try {
      const body = JSON.parse(response.body as string);
      return body.id || body.data?.id;
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Read Resource Scenario
 * Reads a resource by ID
 */
export function readResourceScenario(
  token: string,
  collection: string,
  resourceId: string
): void {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  const startTime = Date.now();
  
  // TODO: Replace with actual read endpoint
  const readUrl = getTenantUrl(`/api/${collection}/${resourceId}`, false);
  
  const headers = {
    ...authHeader(token),
    ...getTenantHeaders(),
  };
  
  const response = http.get(readUrl, {
    headers,
    tags: { name: `read_${collection}` },
  });
  
  const duration = Date.now() - startTime;
  recordRead(duration, { collection, operation: 'read' });
  recordApiRequest(duration);
  
  check(response, {
    [`read ${collection} status 200`]: (r) => r.status === 200,
  });
}

/**
 * Update Resource Scenario
 * Updates an existing resource
 */
export function updateResourceScenario(
  token: string,
  collection: string,
  resourceId: string,
  updateData: Record<string, any>
): void {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  const startTime = Date.now();
  
  // TODO: Replace with actual update endpoint
  const updateUrl = getTenantUrl(`/api/${collection}/${resourceId}`, false);
  
  const data = {
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  
  const headers = {
    ...authHeader(token),
    ...getTenantHeaders(),
  };
  
  const response = http.put(
    updateUrl,
    JSON.stringify(data),
    {
      headers,
      tags: { name: `update_${collection}` },
    }
  );
  
  const duration = Date.now() - startTime;
  recordWrite(duration, { collection, operation: 'update' });
  recordApiRequest(duration);
  recordDocumentOperation('update', collection);
  
  check(response, {
    [`update ${collection} status 200`]: (r) => r.status === 200,
  });
}

/**
 * Delete Resource Scenario
 * Deletes a resource by ID
 */
export function deleteResourceScenario(
  token: string,
  collection: string,
  resourceId: string
): void {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  const startTime = Date.now();
  
  // TODO: Replace with actual delete endpoint
  const deleteUrl = getTenantUrl(`/api/${collection}/${resourceId}`, false);
  
  const headers = {
    ...authHeader(token),
    ...getTenantHeaders(),
  };
  
  const response = http.del(deleteUrl, null, {
    headers,
    tags: { name: `delete_${collection}` },
  });
  
  const duration = Date.now() - startTime;
  recordWrite(duration, { collection, operation: 'delete' });
  recordApiRequest(duration);
  recordDocumentOperation('delete', collection);
  
  check(response, {
    [`delete ${collection} status 200`]: (r) => r.status === 200 || r.status === 204,
  });
}

/**
 * Batch Create Scenario
 * Creates multiple resources in a batch operation
 */
export function batchCreateScenario(
  token: string,
  collection: string,
  count: number,
  templateData: Record<string, any>
): void {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  const startTime = Date.now();
  
  // Generate batch data with randomized IDs
  const documents = Array.from({ length: count }, (_, i) => ({
    data: {
      ...templateData,
      name: `${templateData.name || 'Item'}_batch_${Date.now()}_${i}`,
      createdAt: new Date().toISOString(),
    },
  }));
  
  // TODO: Use Firestore batch write or API batch endpoint
  // For now, use Firestore batch helper
  const batchUrl = getTenantUrl(`/api/${collection}/batch`, false);
  
  const headers = {
    ...authHeader(token),
    ...getTenantHeaders(),
  };
  
  const response = http.post(
    batchUrl,
    JSON.stringify({ documents }),
    {
      headers,
      tags: { name: `batch_create_${collection}` },
    }
  );
  
  const duration = Date.now() - startTime;
  recordWrite(duration, { collection, operation: 'batch_create', count: count.toString() });
  recordApiRequest(duration);
  
  check(response, {
    [`batch create ${collection} status 200`]: (r) => r.status === 200,
  });
}

/**
 * File Upload Simulation Scenario
 * Simulates file upload to Cloud Storage
 */
export function fileUploadScenario(
  token: string,
  fileSize: number = 1024 * 1024 // 1MB default
): void {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  const startTime = Date.now();
  
  // Generate dummy file content
  const dummyContent = 'A'.repeat(fileSize);
  
  // TODO: Replace with actual file upload endpoint
  const uploadUrl = getTenantUrl('/api/upload', false);
  
  const headers = {
    ...authHeader(token),
    ...getTenantHeaders(),
    'Content-Type': 'multipart/form-data',
  };
  
  // k6 doesn't natively support multipart/form-data
  // You may need to use a different approach or library
  // For now, simulate with POST
  const boundary = `----WebKitFormBoundary${Date.now()}`;
  const formData = `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="loadtest_${Date.now()}.txt"\r\n` +
    `Content-Type: text/plain\r\n\r\n` +
    `${dummyContent}\r\n` +
    `--${boundary}--\r\n`;
  
  headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
  
  const response = http.post(uploadUrl, formData, {
    headers,
    tags: { name: 'file_upload' },
  });
  
  const duration = Date.now() - startTime;
  recordApiRequest(duration, { operation: 'upload' });
  
  check(response, {
    'file upload status 200': (r) => r.status === 200 || r.status === 201,
  });
}


