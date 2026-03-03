import http from 'k6/http';
import { check } from 'k6';
import { coldStartRate, errorRate } from '../../k6.config';
import { env } from '../../k6.config';

/**
 * Cloud Functions Helper
 * Measures invocation duration and detects cold starts
 */

interface FunctionResponse {
  status: number;
  body: string;
  duration: number; // Response time in ms
  coldStart?: boolean;
}

// Track first invocation per function to detect cold starts
const functionInvocations: Map<string, boolean> = new Map();

/**
 * Invoke Cloud Function via HTTP
 * Detects cold starts (first invocation or long delays indicate cold start)
 * 
 * @param functionName - Function name (e.g., 'generateReport')
 * @param data - Request payload
 * @param authToken - Firebase ID token
 * @param method - HTTP method (default: POST)
 * @returns Function response with cold start indicator
 */
export function invokeFunction(
  functionName: string,
  data: Record<string, any>,
  authToken: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST'
): FunctionResponse {
  const startTime = Date.now();
  
  // TODO: Replace with actual Cloud Functions URL pattern
  // Pattern options:
  // 1. Direct: https://{region}-{project}.cloudfunctions.net/{functionName}
  // 2. Via API Gateway: {baseUrl}/api/functions/{functionName}
  // 3. Via Next.js API route: {baseUrl}/api/functions/{functionName}
  const functionUrl = `${env.baseUrl}/api/functions/${functionName}`;
  
  const isFirstInvocation = !functionInvocations.has(functionName);
  const lastInvocationTime = functionInvocations.get(`${functionName}_time`) || 0;
  const timeSinceLastInvocation = Date.now() - lastInvocationTime;
  
  // Consider cold start if:
  // 1. First invocation ever, or
  // 2. More than 15 minutes since last invocation (Cloud Functions timeout ~15 min)
  const likelyColdStart = isFirstInvocation || timeSinceLastInvocation > 15 * 60 * 1000;
  
  const params: any = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    tags: { name: `function_${functionName}` },
  };
  
  let response;
  if (method === 'GET') {
    const queryString = new URLSearchParams(data as any).toString();
    response = http.get(`${functionUrl}?${queryString}`, params);
  } else {
    const payload = JSON.stringify(data);
    response = http.request(method, functionUrl, payload, params);
  }
  
  const duration = Date.now() - startTime;
  
  // Cold start detection: response time > 1 second often indicates cold start
  // Adjust threshold based on your function's normal warm execution time
  const detectedColdStart = likelyColdStart || duration > 1000;
  
  if (detectedColdStart) {
    coldStartRate.add(1);
  }
  
  // Update invocation tracking
  functionInvocations.set(functionName, true);
  functionInvocations.set(`${functionName}_time`, Date.now());
  
  const success = check(response, {
    [`function ${functionName} status`]: (r) => r.status === 200 || r.status === 201,
  });
  
  if (!success) {
    errorRate.add(1);
  }
  
  return {
    status: response.status,
    body: response.body as string,
    duration,
    coldStart: detectedColdStart,
  };
}

/**
 * Estimate Cloud Function cold start rate
 * Returns percentage of invocations that appear to be cold starts
 * 
 * Note: This is a rough estimate based on response times and invocation patterns
 * 
 * @returns Cold start rate (0-1)
 */
export function getColdStartRate(): number {
  // This would be calculated from metrics, but in k6 we track via custom metric
  // The actual rate is tracked by the coldStartRate metric
  return 0; // Placeholder - actual rate available in k6 summary
}

/**
 * Batch invoke multiple functions
 * Useful for testing concurrent function invocations
 * 
 * @param functionNames - Array of function names
 * @param data - Request payload (shared or per-function)
 * @param authToken - Firebase ID token
 * @returns Array of function responses
 */
export function batchInvokeFunctions(
  functionNames: string[],
  data: Record<string, any> | Record<string, any>[],
  authToken: string
): FunctionResponse[] {
  const responses: FunctionResponse[] = [];
  
  for (let i = 0; i < functionNames.length; i++) {
    const functionData = Array.isArray(data) ? data[i] : data;
    const response = invokeFunction(functionNames[i], functionData, authToken);
    responses.push(response);
  }
  
  return responses;
}


