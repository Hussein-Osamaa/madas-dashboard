import { Options } from 'k6/options';
import { sleep } from 'k6';
import { authenticate } from '../utils/auth';
import { setTenantContext, getRandomTenantId } from '../utils/tenant';
import { createResourceScenario, batchCreateScenario, updateResourceScenario } from './crud';
import { generateSafeDocId } from '../utils/firestore';
import { logTestInfo } from '../../k6.config';

/**
 * Write-Heavy Test Scenario
 * Simulates many concurrent writes using randomized doc IDs and batched writes
 * Tests Firestore write capacity and throttling behavior
 * Uses randomized document IDs to avoid hot-document throttling
 */

export const options: Options = {
  stages: [
    { duration: '2m', target: 200 },   // Ramp up to 200 concurrent writers
    { duration: '10m', target: 200 },  // Hold at 200 (writes are more expensive)
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<4000'],
    'http_req_failed': ['rate<0.05'],
    'errors': ['rate<0.05'],
    'write_operation_latency': ['p(95)<1500', 'p(99)<3000'],
    'firestore_throttles': ['rate<0.01'], // Track throttling
    'writes_per_second': ['count>50'], // Ensure we're generating write load
  },
  tags: {
    test_type: 'write_heavy',
  },
};

export function setup() {
  logTestInfo(
    'WRITE-HEAVY TEST',
    'Simulate many concurrent writes with randomized doc IDs and batch writes'
  );
  
  const email = __ENV.TEST_USER_EMAIL || '{{TEST_USER_EMAIL}}';
  const password = __ENV.TEST_USER_PASSWORD || '{{TEST_USER_PASSWORD}}';
  
  const token = authenticate(email, password);
  if (!token) {
    throw new Error('Failed to authenticate test user');
  }
  
  return { token };
}

export default function (data: { token: string }) {
  const tenantId = getRandomTenantId();
  setTenantContext(tenantId);
  
  // Mix of write operations with randomized IDs
  const operation = Math.random();
  
  if (operation < 0.6) {
    // 60% individual creates with randomized IDs
    createResourceScenario(data.token, 'projects', {
      name: `Write Test Project ${generateSafeDocId()}`,
      description: 'Load test write project',
      metadata: {
        testType: 'write_heavy',
        timestamp: Date.now(),
        randomId: generateSafeDocId(),
      },
    });
  } else if (operation < 0.9) {
    // 30% batch creates (more efficient)
    batchCreateScenario(data.token, 'projects', 5, {
      name: 'Batch Project',
      description: 'Batch write test',
    });
  } else {
    // 10% updates (would need existing resource IDs - skip for now)
    // In practice, maintain a pool of test resource IDs for updates
    createResourceScenario(data.token, 'orders', {
      name: `Order ${generateSafeDocId()}`,
      amount: Math.random() * 1000,
      status: 'pending',
    });
  }
  
  // Small delay between writes to avoid overwhelming Firestore
  sleep(0.5);
}


