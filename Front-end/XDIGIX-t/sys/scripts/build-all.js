/**
 * Build all frontend apps and assemble dist-unified/.
 *
 * Each app is built via its own `npx vite build`, then its `dist/`
 * output is copied into the top-level `dist-unified/` directory at the
 * correct sub-path so the static server can serve them.
 *
 * Usage:  node scripts/build-all.js
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist-unified');

/** Apps to build: { name, src (relative to ROOT), dest (folder inside dist-unified) } */
const APPS = [
  { name: 'dashboard',         src: 'apps/marketing/apps/dashboard',          dest: 'dashboard' },
  { name: 'finance',           src: 'apps/marketing/apps/finance',            dest: 'finance' },
  { name: 'admin',             src: 'apps/marketing/apps/digix-admin',        dest: 'admin' },
  { name: 'fulfillment',       src: 'apps/marketing/apps/fulfillment',        dest: 'warehouse' },
  { name: 'tracking',          src: 'apps/marketing/apps/tracking',           dest: 'track' },
  { name: 'merchant-shipping', src: 'apps/marketing/apps/merchant-shipping',  dest: 'ship' },
];

/** Marketing landing page (root of dist-unified) */
const MARKETING = { name: 'marketing', src: 'apps/marketing', dest: '.' };

function run(bin, args, cwd) {
  const label = [bin, ...args].join(' ');
  console.log(`  > ${label}`);
  try {
    execFileSync(bin, args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });
  } catch (err) {
    console.error(`  [WARN] Command failed in ${cwd}: ${label}`);
    return false;
  }
  return true;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────
console.log('\nBuilding all apps...\n');

// 1. Build each app
for (const app of APPS) {
  const appDir = path.join(ROOT, app.src);
  const pkgPath = path.join(appDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.log(`Skipping ${app.name} (no package.json)`);
    continue;
  }

  console.log(`\nBuilding ${app.name}...`);

  // Install deps if node_modules missing
  if (!fs.existsSync(path.join(appDir, 'node_modules'))) {
    run('npm', ['install', '--legacy-peer-deps'], appDir);
  }

  const ok = run('npx', ['vite', 'build'], appDir);
  if (!ok) {
    console.log(`${app.name} build failed, skipping copy`);
    continue;
  }

  // Copy dist/ to dist-unified/<dest>
  const distSrc = path.join(appDir, 'dist');
  if (fs.existsSync(distSrc)) {
    const target = path.join(DIST, app.dest);
    console.log(`  Copying to dist-unified/${app.dest}`);
    copyDir(distSrc, target);
  }
}

// 2. Build marketing landing (optional)
const marketingDir = path.join(ROOT, MARKETING.src);
if (fs.existsSync(path.join(marketingDir, 'package.json'))) {
  console.log(`\nBuilding marketing landing...`);
  if (!fs.existsSync(path.join(marketingDir, 'node_modules'))) {
    run('npm', ['install', '--legacy-peer-deps'], marketingDir);
  }
  if (run('npx', ['vite', 'build'], marketingDir)) {
    const marketingDist = path.join(marketingDir, 'dist');
    if (fs.existsSync(marketingDist)) {
      for (const entry of fs.readdirSync(marketingDist, { withFileTypes: true })) {
        const src = path.join(marketingDist, entry.name);
        const dest = path.join(DIST, entry.name);
        // Don't overwrite app directories already populated
        if (entry.isDirectory() && APPS.some(a => a.dest === entry.name)) continue;
        if (entry.isDirectory()) {
          copyDir(src, dest);
        } else {
          fs.mkdirSync(DIST, { recursive: true });
          fs.copyFileSync(src, dest);
        }
      }
    }
  }
}

console.log('\nBuild complete! Output in dist-unified/\n');
