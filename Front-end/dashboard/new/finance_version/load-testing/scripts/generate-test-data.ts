#!/usr/bin/env ts-node
/**
 * Test Data Generator
 * Synthesizes tenant-scoped test data (users, projects, orders) for load testing
 * 
 * Usage:
 *   ts-node scripts/generate-test-data.ts --tenant-id TENANT_ID --count 100
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestDataOptions {
  tenantId: string;
  count: number;
  outputFile?: string;
}

interface TestData {
  tenantId: string;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    projectId: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  users: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
  }>;
}

/**
 * Generate random string
 */
function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Generate random email
 */
function randomEmail(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomString(8)}@loadtest.test`;
}

/**
 * Generate test data for a tenant
 */
function generateTestData(options: TestDataOptions): TestData {
  const { tenantId, count } = options;
  
  const projects: TestData['projects'] = [];
  const orders: TestData['orders'] = [];
  const users: TestData['users'] = [];
  
  // Generate projects
  for (let i = 0; i < count; i++) {
    const projectId = `loadtest_project_${Date.now()}_${i}_${randomString(8)}`;
    projects.push({
      id: projectId,
      name: `Load Test Project ${i + 1}`,
      description: `Test project generated for load testing - ${randomString(20)}`,
      status: ['active', 'pending', 'completed'][Math.floor(Math.random() * 3)],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  // Generate orders (linked to projects)
  for (let i = 0; i < count * 2; i++) {
    const project = projects[Math.floor(Math.random() * projects.length)];
    orders.push({
      id: `loadtest_order_${Date.now()}_${i}_${randomString(8)}`,
      projectId: project.id,
      amount: Math.random() * 10000,
      status: ['pending', 'processing', 'completed', 'cancelled'][Math.floor(Math.random() * 4)],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  // Generate users
  const roles: Array<'tenant_admin' | 'staff' | 'client_staff'> = ['tenant_admin', 'staff', 'client_staff'];
  for (let i = 0; i < Math.min(count / 10, 20); i++) {
    users.push({
      id: `loadtest_user_${Date.now()}_${i}_${randomString(8)}`,
      email: randomEmail(`user${i}`),
      name: `Load Test User ${i + 1}`,
      role: roles[Math.floor(Math.random() * roles.length)],
    });
  }
  
  return {
    tenantId,
    projects,
    orders,
    users,
  };
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let tenantId: string | undefined;
  let count = 100;
  let outputFile: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tenant-id' && args[i + 1]) {
      tenantId = args[i + 1];
      i++;
    } else if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[i + 1];
      i++;
    }
  }
  
  if (!tenantId) {
    console.error('Error: --tenant-id is required');
    console.log('Usage: ts-node scripts/generate-test-data.ts --tenant-id TENANT_ID [--count 100] [--output output.json]');
    process.exit(1);
  }
  
  console.log(`Generating test data for tenant: ${tenantId}`);
  console.log(`Count: ${count}`);
  
  const testData = generateTestData({ tenantId, count, outputFile });
  
  // Output file
  const outputPath = outputFile || path.join(__dirname, '../data', `test-data-${tenantId}.json`);
  
  // Ensure data directory exists
  const dataDir = path.dirname(outputPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));
  
  console.log(`\nTest data generated successfully:`);
  console.log(`  - ${testData.projects.length} projects`);
  console.log(`  - ${testData.orders.length} orders`);
  console.log(`  - ${testData.users.length} users`);
  console.log(`\nOutput file: ${outputPath}`);
  console.log(`\nNOTE: This is test data metadata only.`);
  console.log(`You'll need to actually create these resources in your System via API or Admin SDK.`);
  console.log(`See README.md for instructions on loading test data.`);
}

if (require.main === module) {
  main();
}

export { generateTestData, TestData, TestDataOptions };


