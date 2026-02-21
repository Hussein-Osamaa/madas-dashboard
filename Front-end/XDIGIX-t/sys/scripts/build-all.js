#!/usr/bin/env node

/**
 * Build script to build all apps and prepare for unified deployment
 * This script builds all apps and copies them to a unified dist directory
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, cwd) {
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
  } catch (error) {
    console.error(`Error executing: ${command}`);
    process.exit(1);
  }
}

const rootDir = path.resolve(__dirname, '..');
const unifiedDist = path.join(rootDir, 'dist-unified');

// Clean unified dist
log('Cleaning unified dist directory...', 'blue');
if (fs.existsSync(unifiedDist)) {
  fs.rmSync(unifiedDist, { recursive: true, force: true });
}
fs.mkdirSync(unifiedDist, { recursive: true });

// Build Marketing (root)
log('Building Marketing app...', 'green');
exec('npm run build', path.join(rootDir, 'apps', 'marketing'));
const marketingDist = path.join(rootDir, 'apps', 'marketing', 'dist');
if (fs.existsSync(marketingDist)) {
  copyDir(marketingDist, unifiedDist);
}

// Build Dashboard (/dashboard)
log('Building Dashboard app...', 'green');
exec('npm run build', path.join(rootDir, 'apps', 'marketing', 'apps', 'dashboard'));
const dashboardDist = path.join(rootDir, 'apps', 'marketing', 'apps', 'dashboard', 'dist');
const dashboardTarget = path.join(unifiedDist, 'dashboard');
if (fs.existsSync(dashboardDist)) {
  fs.mkdirSync(dashboardTarget, { recursive: true });
  copyDir(dashboardDist, dashboardTarget);
}

// Build Finance (/finance)
log('Building Finance app...', 'green');
exec('npm run build', path.join(rootDir, 'apps', 'marketing', 'apps', 'finance'));
const financeDist = path.join(rootDir, 'apps', 'marketing', 'apps', 'finance', 'dist');
const financeTarget = path.join(unifiedDist, 'finance');
if (fs.existsSync(financeDist)) {
  fs.mkdirSync(financeTarget, { recursive: true });
  copyDir(financeDist, financeTarget);
}

// Build Digix Admin (/admin)
log('Building Digix Admin app...', 'green');
exec('npm run build', path.join(rootDir, 'apps', 'marketing', 'apps', 'digix-admin'));
const adminDist = path.join(rootDir, 'apps', 'marketing', 'apps', 'digix-admin', 'dist');
const adminTarget = path.join(unifiedDist, 'admin');
if (fs.existsSync(adminDist)) {
  fs.mkdirSync(adminTarget, { recursive: true });
  copyDir(adminDist, adminTarget);
}

// Build Fulfillment / Warehouse (/warehouse)
log('Building Fulfillment app...', 'green');
exec('npm run build', path.join(rootDir, 'apps', 'marketing', 'apps', 'fulfillment'));
const fulfillmentDist = path.join(rootDir, 'apps', 'marketing', 'apps', 'fulfillment', 'dist');
const fulfillmentTarget = path.join(unifiedDist, 'warehouse');
if (fs.existsSync(fulfillmentDist)) {
  fs.mkdirSync(fulfillmentTarget, { recursive: true });
  copyDir(fulfillmentDist, fulfillmentTarget);
}

log('✅ All apps built successfully!', 'green');
log(`Unified dist directory: ${unifiedDist}`, 'blue');

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
