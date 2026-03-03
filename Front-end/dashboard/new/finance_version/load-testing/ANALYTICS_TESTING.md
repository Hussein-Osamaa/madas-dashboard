# Analytics Testing Guide

## The Problem

k6 HTTP load tests **work for performance testing** but **don't trigger Analytics** because:
- ❌ HTTP requests don't execute JavaScript
- ❌ Analytics requires JavaScript to run in a browser
- ❌ Firebase Analytics SDK only works in browser environments

## The Solution

To generate Analytics data, you need **real browser sessions** that execute JavaScript.

---

## Option 1: Visit the App Manually (Simplest)

1. Open: https://madas-store.web.app
2. Log in with your test credentials
3. Navigate through pages:
   - Dashboard Home
   - Orders
   - Finance Overview
   - Other pages
4. Wait 5-10 minutes
5. Check Analytics: https://console.firebase.google.com/project/madas-store/analytics

**This will show up in Analytics as real user activity.**

---

## Option 2: Browser Automation Script

Use Playwright or Puppeteer to automate browser sessions:

### Install Playwright

```bash
npm install -g playwright
playwright install chromium
```

### Create Browser Test Script

```javascript
// browser-analytics-test.js
const { chromium } = require('playwright');

async function visitPage(page, url, pageName) {
  console.log(`Visiting ${pageName}: ${url}`);
  await page.goto(url);
  await page.waitForTimeout(2000); // Wait for page to load and Analytics to fire
  console.log(`✓ ${pageName} visited`);
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const baseUrl = 'https://madas-store.web.app';
  
  // Visit pages
  await visitPage(page, baseUrl, 'Dashboard Home');
  await visitPage(page, `${baseUrl}/orders`, 'Orders');
  await visitPage(page, `${baseUrl}/finance/overview`, 'Finance Overview');
  
  // Keep browser open for a few seconds to let Analytics send events
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
```

### Run It

```bash
node browser-analytics-test.js
```

This will:
- ✅ Execute JavaScript (unlike k6 HTTP)
- ✅ Trigger Firebase Analytics events
- ✅ Show up in Analytics dashboard

---

## Option 3: Multiple Browser Sessions (Load Test with Analytics)

Run multiple browser instances to simulate multiple users:

```javascript
// multi-browser-analytics.js
const { chromium } = require('playwright');

async function simulateUser(userId, pages) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log(`User ${userId} starting...`);
  
  for (const [pageName, url] of Object.entries(pages)) {
    await page.goto(url);
    await page.waitForTimeout(1000);
    console.log(`User ${userId} visited ${pageName}`);
  }
  
  await page.waitForTimeout(2000);
  await browser.close();
  console.log(`User ${userId} finished`);
}

const baseUrl = 'https://madas-store.web.app';
const pages = {
  'Dashboard': baseUrl,
  'Orders': `${baseUrl}/orders`,
  'Finance': `${baseUrl}/finance/overview`,
};

// Simulate 10 users
const users = 10;
const promises = [];

for (let i = 0; i < users; i++) {
  promises.push(simulateUser(i + 1, pages));
}

Promise.all(promises).then(() => {
  console.log('All users finished!');
  console.log('Check Analytics: https://console.firebase.google.com/project/madas-store/analytics');
});
```

---

## Option 4: k6 Browser Mode (Advanced)

k6 supports browser automation, but requires the `@k6/browser` extension:

```bash
# Install k6 browser extension
# (Check k6 documentation for current installation method)
```

Then use browser APIs in k6 scripts. However, this is more resource-intensive than HTTP mode.

---

## Recommendation

**For Load Testing (Performance):**
- Use k6 HTTP mode (what you have now)
- Tests system performance and capacity
- Won't show in Analytics

**For Analytics Testing:**
- Use Option 1 (manual visits) for quick testing
- Use Option 2 or 3 (browser automation) for automated testing
- These will trigger Analytics events

---

## Why k6 HTTP Won't Work for Analytics

```
k6 HTTP Request:
  GET https://madas-store.web.app
  ↓
  Server returns HTML
  ↓
  ❌ JavaScript never executes
  ❌ Analytics SDK never loads
  ❌ No Analytics events sent

Browser Session:
  GET https://madas-store.web.app
  ↓
  Browser receives HTML
  ↓
  ✅ Browser executes JavaScript
  ✅ Analytics SDK loads and runs
  ✅ Analytics events are sent
```

---

## Quick Test

Run this to verify Analytics is working:

```bash
# Visit the app manually
open https://madas-store.web.app

# Or use curl to check if site is accessible
curl -I https://madas-store.web.app

# Then check Analytics after 5-10 minutes
open https://console.firebase.google.com/project/madas-store/analytics
```

