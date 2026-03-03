#!/usr/bin/env node

/**
 * Browser Analytics Test
 * Visits pages using a real browser to trigger Analytics events
 * 
 * Install dependencies:
 *   npm install -g playwright
 *   playwright install chromium
 * 
 * Run:
 *   node scripts/browser-analytics-test.js
 */

const { chromium } = require('playwright');

const baseUrl = process.env.BASE_URL || 'https://madas-store.web.app';
const numUsers = parseInt(process.env.NUM_USERS || '10');
const delay = parseInt(process.env.DELAY || '2000'); // milliseconds between visits

async function visitPages(userId) {
  const browser = await chromium.launch({ 
    headless: true, // Set to false to see browser
  });
  
  const context = await browser.newContext({
    userAgent: `MADAS-Test-User-${userId}/1.0`,
  });
  
  const page = await context.newPage();
  
  try {
    console.log(`[User ${userId}] Starting...`);
    
    // Visit Dashboard Home
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(delay);
    console.log(`[User ${userId}] ✓ Visited Dashboard Home`);
    
    // Visit Orders
    await page.goto(`${baseUrl}/orders`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(delay);
    console.log(`[User ${userId}] ✓ Visited Orders`);
    
    // Visit Finance Overview
    await page.goto(`${baseUrl}/finance/overview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(delay);
    console.log(`[User ${userId}] ✓ Visited Finance Overview`);
    
    // Visit Products (if exists)
    try {
      await page.goto(`${baseUrl}/products`, { waitUntil: 'networkidle', timeout: 5000 });
      await page.waitForTimeout(delay);
      console.log(`[User ${userId}] ✓ Visited Products`);
    } catch (e) {
      // Page might not exist, that's ok
    }
    
    // Wait for Analytics events to be sent
    await page.waitForTimeout(3000);
    
    console.log(`[User ${userId}] ✓ Finished`);
    
  } catch (error) {
    console.error(`[User ${userId}] ✗ Error:`, error.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('\n🚀 Browser Analytics Test');
  console.log('='.repeat(50));
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Users: ${numUsers}`);
  console.log(`Delay: ${delay}ms`);
  console.log('='.repeat(50));
  console.log('');
  
  const promises = [];
  
  for (let i = 1; i <= numUsers; i++) {
    // Stagger starts slightly
    promises.push(
      new Promise(resolve => {
        setTimeout(() => {
          visitPages(i).then(resolve).catch(resolve);
        }, i * 100);
      })
    );
  }
  
  await Promise.all(promises);
  
  console.log('\n✅ All users finished!');
  console.log('\n📊 Check Analytics Dashboard:');
  console.log('   https://console.firebase.google.com/project/madas-store/analytics');
  console.log('\n   Note: It may take 5-10 minutes for data to appear\n');
}

// Check if Playwright is installed
try {
  require('playwright');
} catch (e) {
  console.error('\n❌ Playwright not installed!\n');
  console.log('Install it with:');
  console.log('  npm install -g playwright');
  console.log('  playwright install chromium\n');
  process.exit(1);
}

main().catch(console.error);

