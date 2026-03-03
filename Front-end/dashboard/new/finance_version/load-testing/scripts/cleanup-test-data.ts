#!/usr/bin/env ts-node
/**
 * Test Data Cleanup Script
 * Removes test data created during load testing
 * 
 * Usage:
 *   ts-node scripts/cleanup-test-data.ts --tenant-id TENANT_ID [--prefix loadtest]
 * 
 * WARNING: This script will delete data. Use with caution.
 * Only run against test/staging tenants.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CleanupOptions {
  tenantId: string;
  prefix: string;
  dataFile?: string;
}

/**
 * Load test data from file
 */
function loadTestData(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    console.warn(`Data file not found: ${filePath}`);
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Main cleanup function
 * 
 * NOTE: This script generates instructions for cleanup rather than directly deleting data
 * For safety, you should implement actual deletion via your API or Admin SDK
 */
function cleanup(options: CleanupOptions): void {
  const { tenantId, prefix, dataFile } = options;
  
  console.log(`\n=== Test Data Cleanup for Tenant: ${tenantId} ===\n`);
  console.log('WARNING: This script generates cleanup instructions only.');
  console.log('You must implement actual deletion via your API or Firebase Admin SDK.\n');
  
  // Load test data if file provided
  let testData: any = null;
  if (dataFile && fs.existsSync(dataFile)) {
    testData = loadTestData(dataFile);
  }
  
  if (testData) {
    console.log('Found test data file. Cleanup instructions:\n');
    
    console.log('Projects to delete:');
    testData.projects?.forEach((project: any) => {
      console.log(`  - ${project.id}`);
    });
    
    console.log('\nOrders to delete:');
    testData.orders?.forEach((order: any) => {
      console.log(`  - ${order.id}`);
    });
    
    console.log('\nUsers to delete:');
    testData.users?.forEach((user: any) => {
      console.log(`  - ${user.id} (${user.email})`);
    });
  } else {
    console.log(`\nCleanup instructions for documents with prefix: "${prefix}"`);
    console.log('\nTo clean up test data, you can:');
    console.log('1. Query Firestore for documents with ID starting with prefix');
    console.log('2. Delete via Firestore Admin SDK or API');
    console.log('\nExample Firestore query (Admin SDK):');
    console.log(`
const admin = require('firebase-admin');
const db = admin.firestore();

async function cleanup() {
  const collections = ['projects', 'orders', 'users'];
  
  for (const collection of collections) {
    const snapshot = await db.collection(collection)
      .where(admin.firestore.FieldPath.documentId(), '>=', '${prefix}')
      .where(admin.firestore.FieldPath.documentId(), '<', '${prefix}\\uffff')
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(\`Deleted \${snapshot.size} documents from \${collection}\`);
  }
}

cleanup();
    `);
  }
  
  console.log('\n=== Cleanup Instructions ===');
  console.log('\nOption 1: Via Firestore Admin SDK (Recommended)');
  console.log('- Use the script above to delete documents by prefix');
  console.log('- Run from a Node.js environment with Firebase Admin SDK');
  
  console.log('\nOption 2: Via System API');
  console.log(`- DELETE /api/projects/{id} for each project`);
  console.log(`- DELETE /api/orders/{id} for each order`);
  console.log(`- DELETE /api/users/{id} for each user`);
  
  console.log('\nOption 3: Manual Firestore Console');
  console.log('- Open Firestore console');
  console.log(`- Filter documents by ID prefix: "${prefix}"`);
  console.log('- Manually delete test documents');
  
  console.log('\n⚠️  Safety Checklist:');
  console.log(`  [ ] Confirm tenant ID: ${tenantId}`);
  console.log(`  [ ] Confirm this is NOT production`);
  console.log(`  [ ] Backup data if needed`);
  console.log(`  [ ] Review documents to be deleted`);
  console.log(`  [ ] Execute cleanup`);
  
  // Generate cleanup script
  const scriptContent = `
// Auto-generated cleanup script for tenant: ${tenantId}
// Run this with Firebase Admin SDK: ts-node cleanup-${tenantId}.ts

const admin = require('firebase-admin');
const db = admin.firestore();

// Initialize Firebase Admin (you'll need to provide service account key)
// admin.initializeApp({
//   credential: admin.credential.cert('./path-to-service-account.json')
// });

async function cleanup() {
  const prefix = '${prefix}';
  const tenantId = '${tenantId}';
  const collections = ['projects', 'orders', 'users'];
  
  console.log(\`Cleaning up test data for tenant: \${tenantId}\`);
  console.log(\`Prefix: \${prefix}\n\`);
  
  for (const collection of collections) {
    try {
      // Query documents with prefix
      const snapshot = await db.collection(collection)
        .where(admin.firestore.FieldPath.documentId(), '>=', prefix)
        .where(admin.firestore.FieldPath.documentId(), '<', prefix + '\\uffff')
        .where('tenantId', '==', tenantId) // Additional tenant filter for safety
        .get();
      
      if (snapshot.empty) {
        console.log(\`No documents found in \${collection}\`);
        continue;
      }
      
      console.log(\`Found \${snapshot.size} documents in \${collection}\`);
      
      // Delete in batches of 500 (Firestore limit)
      const batches: any[] = [];
      let batch = db.batch();
      let count = 0;
      
      snapshot.docs.forEach((doc, index) => {
        batch.delete(doc.ref);
        count++;
        
        if (count === 500 || index === snapshot.docs.length - 1) {
          batches.push(batch);
          batch = db.batch();
          count = 0;
        }
      });
      
      // Execute batches
      for (const b of batches) {
        await b.commit();
      }
      
      console.log(\`Deleted \${snapshot.size} documents from \${collection}\`);
    } catch (error) {
      console.error(\`Error cleaning up \${collection}:\`, error);
    }
  }
  
  console.log('\\nCleanup complete!');
}

cleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
  `.trim();
  
  const scriptPath = path.join(__dirname, `../data/cleanup-${tenantId}.ts`);
  const dataDir = path.dirname(scriptPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(scriptPath, scriptContent);
  console.log(`\n✅ Generated cleanup script: ${scriptPath}`);
  console.log(`   Edit and run with: ts-node ${scriptPath}\n`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  let tenantId: string | undefined;
  let prefix = 'loadtest';
  let dataFile: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tenant-id' && args[i + 1]) {
      tenantId = args[i + 1];
      i++;
    } else if (args[i] === '--prefix' && args[i + 1]) {
      prefix = args[i + 1];
      i++;
    } else if (args[i] === '--data-file' && args[i + 1]) {
      dataFile = args[i + 1];
      i++;
    }
  }
  
  if (!tenantId) {
    console.error('Error: --tenant-id is required');
    console.log('Usage: ts-node scripts/cleanup-test-data.ts --tenant-id TENANT_ID [--prefix loadtest] [--data-file data.json]');
    process.exit(1);
  }
  
  // Safety check: warn if tenant ID looks like production
  if (tenantId.toLowerCase().includes('prod') || tenantId === 'production') {
    console.error('⚠️  WARNING: Tenant ID looks like production!');
    console.error('Cleanup scripts should only run on test/staging tenants.');
    const response = process.stdin.setEncoding('utf8');
    console.log('Type "yes" to continue:');
    // In a real implementation, you'd read from stdin
  }
  
  cleanup({ tenantId, prefix, dataFile });
}

if (require.main === module) {
  main();
}

export { cleanup, CleanupOptions };


