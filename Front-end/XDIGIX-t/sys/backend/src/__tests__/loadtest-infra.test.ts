/**
 * Load test infrastructure verification tests.
 *
 * Validates that load test scripts, config, seed, and perf
 * middleware are correctly structured. Does NOT run actual load tests.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const LOAD_DIR = path.resolve(__dirname, '../../loadtest');
const SRC_DIR = path.resolve(__dirname, '..');

/* ── Load test files presence ────────────────────────────────────── */

describe('LoadTest — File Structure', () => {
  it('loadtest directory exists', () => {
    expect(fs.existsSync(LOAD_DIR)).toBe(true);
  });

  it('config.js exists with thresholds', () => {
    const file = path.join(LOAD_DIR, 'config.js');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('THRESHOLDS');
    expect(content).toContain('SCENARIOS');
    expect(content).toContain('BASE_URL');
    expect(content).toContain('TENANT_ID');
  });

  it('storefront scenario exists', () => {
    const file = path.join(LOAD_DIR, 'scenarios/storefront.js');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('storefrontFlow');
    expect(content).toContain('checkout');
    expect(content).toContain('products');
  });

  it('admin scenario exists', () => {
    const file = path.join(LOAD_DIR, 'scenarios/admin.js');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('dashboard');
    expect(content).toContain('reports');
  });

  it('checkout-burst scenario exists', () => {
    const file = path.join(LOAD_DIR, 'scenarios/checkout-burst.js');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('checkoutBurst');
    expect(content).toContain('idempotencyKey');
  });

  it('mixed scenario exists', () => {
    const file = path.join(LOAD_DIR, 'scenarios/mixed.js');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('storefrontTraffic');
    expect(content).toContain('adminTraffic');
    expect(content).toContain('backgroundTraffic');
  });

  it('concurrency scenario exists', () => {
    const file = path.join(LOAD_DIR, 'scenarios/concurrency.js');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('idempotencyTest');
    expect(content).toContain('healthCheckTest');
    expect(content).toContain('concurrentReportTest');
  });

  it('seed script exists', () => {
    const file = path.join(LOAD_DIR, 'seed.ts');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('MONGODB_URI');
    expect(content).toContain('products');
    expect(content).toContain('storefrontorders');
    expect(content).toContain('shipments');
    expect(content).toContain('ledgerentries');
    expect(content).toContain('tickets');
    expect(content).toContain('notificationlogs');
  });

  it('run documentation exists', () => {
    const file = path.join(LOAD_DIR, 'RUN.md');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf-8');
    expect(content).toContain('k6');
    expect(content).toContain('BASE_URL');
    expect(content).toContain('SEED_COUNT');
  });
});

/* ── Threshold config ────────────────────────────────────────────── */

describe('LoadTest — Thresholds', () => {
  it('config defines p95 and p99 latency targets', () => {
    const content = fs.readFileSync(path.join(LOAD_DIR, 'config.js'), 'utf-8');
    expect(content).toContain('p(95)<500');
    expect(content).toContain('p(99)<2000');
  });

  it('config defines error rate target', () => {
    const content = fs.readFileSync(path.join(LOAD_DIR, 'config.js'), 'utf-8');
    expect(content).toContain('rate<0.01');
  });

  it('checkout burst has relaxed thresholds', () => {
    const content = fs.readFileSync(path.join(LOAD_DIR, 'scenarios/checkout-burst.js'), 'utf-8');
    expect(content).toContain('rate>0.90'); // 90% not 95%
    expect(content).toContain('rate<0.10'); // 10% error ok
  });

  it('concurrency test defines idempotency threshold', () => {
    const content = fs.readFileSync(path.join(LOAD_DIR, 'scenarios/concurrency.js'), 'utf-8');
    expect(content).toContain('duplicate_checkouts_accepted');
    expect(content).toContain('count<2');
  });
});

/* ── Scenario profiles ───────────────────────────────────────────── */

describe('LoadTest — Scenarios', () => {
  it('config defines steady, ramp, spike, checkoutBurst profiles', () => {
    const content = fs.readFileSync(path.join(LOAD_DIR, 'config.js'), 'utf-8');
    expect(content).toContain('steady:');
    expect(content).toContain('ramp:');
    expect(content).toContain('spike:');
    expect(content).toContain('checkoutBurst:');
  });

  it('mixed test uses 3 parallel executors', () => {
    const content = fs.readFileSync(path.join(LOAD_DIR, 'scenarios/mixed.js'), 'utf-8');
    expect(content).toContain('storefront:');
    expect(content).toContain('admin:');
    expect(content).toContain('background:');
  });
});

/* ── Performance middleware ───────────────────────────────────────── */

describe('LoadTest — Perf Middleware', () => {
  it('perf.middleware.ts exists', () => {
    const file = path.join(SRC_DIR, 'middleware/perf.middleware.ts');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('perf middleware logs request duration', () => {
    const content = fs.readFileSync(
      path.join(SRC_DIR, 'middleware/perf.middleware.ts'),
      'utf-8',
    );
    expect(content).toContain('durationMs');
    expect(content).toContain('process.hrtime.bigint');
    expect(content).toContain("res.on('finish'");
  });

  it('perf middleware flags slow requests', () => {
    const content = fs.readFileSync(
      path.join(SRC_DIR, 'middleware/perf.middleware.ts'),
      'utf-8',
    );
    expect(content).toContain('SLOW_THRESHOLD_MS');
    expect(content).toContain('Slow request');
  });

  it('perf middleware is wired into app.ts', () => {
    const content = fs.readFileSync(
      path.join(SRC_DIR, 'app.ts'),
      'utf-8',
    );
    expect(content).toContain('perfMiddleware');
    expect(content).toContain("from './middleware/perf.middleware'");
  });

  it('perf middleware supports PERF_LOG_ALL env var', () => {
    const content = fs.readFileSync(
      path.join(SRC_DIR, 'middleware/perf.middleware.ts'),
      'utf-8',
    );
    expect(content).toContain('PERF_LOG_ALL');
  });
});

/* ── Seed data ───────────────────────────────────────────────────── */

describe('LoadTest — Seed Data', () => {
  it('seed covers all 7 collection types', () => {
    const content = fs.readFileSync(path.join(LOAD_DIR, 'seed.ts'), 'utf-8');
    const collections = [
      'tenants', 'products', 'storefrontorders', 'shipments',
      'ledgerentries', 'tickets', 'notificationlogs',
    ];
    for (const col of collections) {
      expect(content).toContain(col);
    }
  });

  it('seed uses upsert for tenant (idempotent)', () => {
    const content = fs.readFileSync(path.join(LOAD_DIR, 'seed.ts'), 'utf-8');
    expect(content).toContain('$setOnInsert');
    expect(content).toContain('upsert: true');
  });

  it('seed cleans up before inserting (repeatable)', () => {
    const content = fs.readFileSync(path.join(LOAD_DIR, 'seed.ts'), 'utf-8');
    expect(content).toContain('deleteMany');
  });

  it('seed supports SEED_COUNT multiplier', () => {
    const content = fs.readFileSync(path.join(LOAD_DIR, 'seed.ts'), 'utf-8');
    expect(content).toContain('SEED_COUNT');
    expect(content).toContain('COUNT');
  });
});

/* ── Critical flows covered ──────────────────────────────────────── */

describe('LoadTest — Critical Flow Coverage', () => {
  const allScenarios = ['storefront.js', 'admin.js', 'checkout-burst.js', 'mixed.js', 'concurrency.js']
    .map((f) => fs.readFileSync(path.join(LOAD_DIR, 'scenarios', f), 'utf-8'))
    .join('\n');

  it('covers product listing', () => {
    expect(allScenarios).toContain('/products');
  });

  it('covers product search', () => {
    expect(allScenarios).toContain('search=');
  });

  it('covers cart operations', () => {
    expect(allScenarios).toContain('/cart');
  });

  it('covers checkout creation', () => {
    expect(allScenarios).toContain('/checkout');
  });

  it('covers reporting dashboard', () => {
    expect(allScenarios).toContain('/reports/dashboard');
  });

  it('covers individual reports', () => {
    expect(allScenarios).toContain('/reports/orders');
    expect(allScenarios).toContain('/reports/revenue');
    expect(allScenarios).toContain('/reports/inventory');
  });

  it('covers support tickets', () => {
    expect(allScenarios).toContain('/support/tickets');
  });

  it('covers plan usage', () => {
    expect(allScenarios).toContain('/plan-usage');
  });

  it('covers health check', () => {
    expect(allScenarios).toContain('/health');
  });

  it('covers idempotency/concurrency', () => {
    expect(allScenarios).toContain('idempotencyKey');
  });
});
