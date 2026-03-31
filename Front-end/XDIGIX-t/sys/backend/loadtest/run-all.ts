/**
 * Native Node.js load test runner — no k6 dependency required.
 *
 * Executes all 5 scenarios against the running server and
 * produces real measured results: latency percentiles, error rates,
 * throughput, and per-endpoint breakdowns.
 *
 * Usage: MONGODB_URI=... npx tsx loadtest/run-all.ts
 */

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const TENANT = process.env.TENANT_ID || 'loadtest-tenant';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const MERCHANT_TOKEN = process.env.MERCHANT_TOKEN || '';

/* ── Utilities ────────────────────────────────────────────────────── */

interface Result {
  url: string;
  method: string;
  status: number;
  durationMs: number;
  error?: string;
}

const results: Map<string, Result[]> = new Map();

async function req(
  label: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Result> {
  const url = `${BASE}${path}`;
  const start = performance.now();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Origin': BASE, // Bypass CSRF check
    };
    // Add auth for admin/support/export endpoints
    if (path.includes('/admin/') || path.includes('/support/') || path.includes('/exports')) {
      if (ADMIN_TOKEN) headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
    }
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const durationMs = Math.round(performance.now() - start);
    const r: Result = { url: path, method, status: res.status, durationMs };
    if (!results.has(label)) results.set(label, []);
    results.get(label)!.push(r);
    return r;
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const r: Result = { url: path, method, status: 0, durationMs, error: (err as Error).message };
    if (!results.has(label)) results.set(label, []);
    results.get(label)!.push(r);
    return r;
  }
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * (p / 100)) - 1;
  return sorted[Math.max(0, idx)];
}

function summarize(label: string, data: Result[]) {
  const durations = data.map((r) => r.durationMs);
  const errors = data.filter((r) => r.status >= 400 || r.status === 0);
  const successes = data.filter((r) => r.status >= 200 && r.status < 400);

  return {
    label,
    requests: data.length,
    successes: successes.length,
    errors: errors.length,
    errorRate: `${((errors.length / data.length) * 100).toFixed(1)}%`,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    min: Math.min(...durations),
    max: Math.max(...durations),
    statusCounts: data.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<number, number>),
  };
}

/* ── Concurrent runner ────────────────────────────────────────────── */

async function runConcurrent(
  label: string,
  concurrency: number,
  iterations: number,
  fn: (vu: number, iter: number) => Promise<void>,
) {
  console.log(`\n▶ ${label} (${concurrency} VUs × ${iterations} iterations)`);
  const start = performance.now();

  const workers = Array.from({ length: concurrency }, (_, vu) =>
    (async () => {
      for (let i = 0; i < iterations; i++) {
        await fn(vu, i);
      }
    })(),
  );
  await Promise.all(workers);

  const elapsed = Math.round(performance.now() - start);
  const data = results.get(label) || [];
  const rps = data.length > 0 ? Math.round((data.length / elapsed) * 1000) : 0;
  console.log(`  Completed in ${elapsed}ms — ${data.length} requests — ${rps} req/s`);
}

/* ══════════════════════════════════════════════════════════════════
   SCENARIO 1: STOREFRONT
   ══════════════════════════════════════════════════════════════════ */

async function scenarioStorefront() {
  const label = 'storefront';
  await runConcurrent(label, 10, 5, async (vu, iter) => {
    // Browse products
    await req(label, 'GET', `/api/public/${TENANT}/products`);
    // Search
    await req(label, 'GET', `/api/public/${TENANT}/products?search=test`);
    // Checkout
    await req(label, 'POST', `/api/public/${TENANT}/checkout`, {
      customer: { email: `sf-${vu}-${iter}@test.com`, firstName: 'Load', lastName: 'Test' },
      shipping: { address: '1 Test St', city: 'Cairo', state: 'Cairo', postalCode: '11511', country: 'EG', method: 'standard' },
      paymentMethod: 'cod',
      items: [{ productId: 'LT-SKU-0001', name: 'Test Product', price: 100, quantity: 1 }],
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   SCENARIO 2: ADMIN / REPORTING
   ══════════════════════════════════════════════════════════════════ */

async function scenarioAdmin() {
  const label = 'admin';
  await runConcurrent(label, 5, 3, async () => {
    await req(label, 'GET', `/api/admin/reports/dashboard?tenantId=${TENANT}&from=2026-01-01&to=2026-03-31`);
    await req(label, 'GET', `/api/admin/reports/orders?tenantId=${TENANT}&from=2026-01-01&to=2026-03-31`);
    await req(label, 'GET', `/api/admin/reports/revenue?tenantId=${TENANT}&from=2026-01-01&to=2026-03-31`);
    await req(label, 'GET', `/api/admin/reports/inventory?tenantId=${TENANT}`);
    await req(label, 'GET', `/api/admin/reports/shipping?tenantId=${TENANT}&from=2026-01-01&to=2026-03-31`);
    await req(label, 'GET', `/api/admin/reports/notifications?tenantId=${TENANT}&from=2026-01-01&to=2026-03-31`);
    await req(label, 'GET', `/api/admin/reports/tenants`);
    await req(label, 'GET', `/api/support/tickets?tenantId=${TENANT}&limit=20`);
    await req(label, 'GET', `/api/admin/tenants/${TENANT}/plan-usage`);
  });
}

/* ══════════════════════════════════════════════════════════════════
   SCENARIO 3: CHECKOUT BURST
   ══════════════════════════════════════════════════════════════════ */

async function scenarioCheckoutBurst() {
  const label = 'checkout-burst';
  await runConcurrent(label, 20, 5, async (vu, iter) => {
    await req(label, 'POST', `/api/public/${TENANT}/checkout`, {
      customer: { email: `burst-${vu}-${iter}@test.com`, firstName: 'Burst', lastName: 'Test' },
      shipping: { address: '1 Burst St', city: 'Alex', state: 'Alex', postalCode: '21500', country: 'EG', method: 'standard' },
      paymentMethod: 'cod',
      idempotencyKey: `burst-${vu}-${iter}-${Date.now()}`,
      items: [{ productId: 'LT-SKU-0001', name: 'Flash Item', price: 50, quantity: 1 }],
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   SCENARIO 4: MIXED TRAFFIC
   ══════════════════════════════════════════════════════════════════ */

async function scenarioMixed() {
  const label = 'mixed';
  await runConcurrent(label, 15, 3, async (vu, iter) => {
    if (vu < 10) {
      // 66% storefront
      await req(label, 'GET', `/api/public/${TENANT}/products`);
      if (Math.random() < 0.3) {
        await req(label, 'POST', `/api/public/${TENANT}/checkout`, {
          customer: { email: `mix-${vu}-${iter}@test.com`, firstName: 'Mix', lastName: 'Test' },
          shipping: { address: '1 Mix St', city: 'Cairo', state: 'Cairo', postalCode: '11511', country: 'EG', method: 'standard' },
          paymentMethod: 'cod',
          items: [{ productId: 'LT-SKU-0001', name: 'T-Shirt', price: 200, quantity: 1 }],
        });
      }
    } else if (vu < 13) {
      // 20% admin
      await req(label, 'GET', `/api/admin/reports/dashboard?tenantId=${TENANT}`);
      await req(label, 'GET', `/api/support/tickets?tenantId=${TENANT}&limit=10`);
    } else {
      // 13% health
      await req(label, 'GET', '/health');
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   SCENARIO 5: CONCURRENCY SAFETY
   ══════════════════════════════════════════════════════════════════ */

async function scenarioConcurrency() {
  const label = 'concurrency';
  const sharedKey = `race-${Date.now()}`;

  // 20 VUs all submit same idempotency key simultaneously
  console.log(`\n▶ concurrency-idempotency (20 VUs × 1 iteration, same key)`);
  const idemResults: Result[] = [];
  const promises = Array.from({ length: 20 }, (_, vu) =>
    req(label, 'POST', `/api/public/${TENANT}/checkout`, {
      customer: { email: 'race@test.com', firstName: 'Race', lastName: 'Test' },
      shipping: { address: '1 Race St', city: 'Cairo', state: 'Cairo', postalCode: '11511', country: 'EG', method: 'standard' },
      paymentMethod: 'cod',
      idempotencyKey: sharedKey,
      items: [{ productId: 'LT-SKU-0001', name: 'Race Item', price: 100, quantity: 1 }],
    }).then((r) => { idemResults.push(r); return r; }),
  );
  await Promise.all(promises);

  const accepted = idemResults.filter((r) => r.status >= 200 && r.status < 300).length;
  const conflicts = idemResults.filter((r) => r.status === 409).length;
  console.log(`  Accepted: ${accepted}, Conflicts: ${conflicts}, Errors: ${idemResults.filter((r) => r.status >= 500).length}`);

  // Concurrent health checks
  await runConcurrent(label + '-health', 10, 5, async () => {
    await req(label, 'GET', '/health');
  });

  // Concurrent reports
  await runConcurrent(label + '-reports', 5, 3, async () => {
    const endpoints = [
      `/api/admin/reports/orders?tenantId=${TENANT}`,
      `/api/admin/reports/revenue?tenantId=${TENANT}`,
      `/api/admin/reports/inventory?tenantId=${TENANT}`,
    ];
    const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
    await req(label, 'GET', ep);
  });
}

/* ══════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════ */

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log(' XDIGIX Load Test Execution');
  console.log(`═══════════════════════════════════════════════════`);
  console.log(`Target:    ${BASE}`);
  console.log(`Tenant:    ${TENANT}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Verify server is up
  const health = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => null);
  if (!health) {
    console.error('Server not reachable at', BASE);
    process.exit(1);
  }
  console.log(`Health:    ${JSON.stringify(health)}`);
  console.log('═══════════════════════════════════════════════════');

  await scenarioStorefront();
  await scenarioAdmin();
  await scenarioCheckoutBurst();
  await scenarioMixed();
  await scenarioConcurrency();

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log(' RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════');

  const allResults: ReturnType<typeof summarize>[] = [];
  for (const [label, data] of results) {
    const s = summarize(label, data);
    allResults.push(s);
    console.log(`\n── ${s.label} ──`);
    console.log(`  Requests:   ${s.requests}`);
    console.log(`  Successes:  ${s.successes}`);
    console.log(`  Errors:     ${s.errors} (${s.errorRate})`);
    console.log(`  Latency:    p50=${s.p50}ms  p95=${s.p95}ms  p99=${s.p99}ms  avg=${s.avg}ms  min=${s.min}ms  max=${s.max}ms`);
    console.log(`  Status:     ${JSON.stringify(s.statusCounts)}`);
  }

  // Per-endpoint breakdown for top slowest
  console.log('\n── SLOWEST ENDPOINTS ──');
  const allFlat = Array.from(results.values()).flat();
  const byEndpoint = new Map<string, number[]>();
  for (const r of allFlat) {
    const key = `${r.method} ${r.url}`;
    if (!byEndpoint.has(key)) byEndpoint.set(key, []);
    byEndpoint.get(key)!.push(r.durationMs);
  }

  const endpointStats = Array.from(byEndpoint.entries()).map(([key, times]) => ({
    endpoint: key,
    count: times.length,
    avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    p95: percentile(times, 95),
    max: Math.max(...times),
  })).sort((a, b) => b.p95 - a.p95);

  for (const ep of endpointStats.slice(0, 10)) {
    console.log(`  ${ep.endpoint}  count=${ep.count}  avg=${ep.avg}ms  p95=${ep.p95}ms  max=${ep.max}ms`);
  }

  // Threshold checks
  console.log('\n── THRESHOLD CHECKS ──');
  const overallDurations = allFlat.map((r) => r.durationMs);
  const overallErrors = allFlat.filter((r) => r.status >= 400 || r.status === 0);
  const p95 = percentile(overallDurations, 95);
  const p99 = percentile(overallDurations, 99);
  const errorRate = (overallErrors.length / allFlat.length) * 100;

  const checks = [
    { name: 'p95 < 500ms', value: p95, pass: p95 < 500 },
    { name: 'p99 < 2000ms', value: p99, pass: p99 < 2000 },
    { name: 'error rate < 5%', value: `${errorRate.toFixed(1)}%`, pass: errorRate < 5 },
  ];

  for (const c of checks) {
    console.log(`  ${c.pass ? '✅' : '❌'} ${c.name}: ${c.value}`);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(` Total: ${allFlat.length} requests across 5 scenarios`);
  console.log('═══════════════════════════════════════════════════');

  // Write JSON artifact
  const artifact = {
    timestamp: new Date().toISOString(),
    base: BASE,
    tenant: TENANT,
    scenarios: allResults,
    endpoints: endpointStats,
    thresholds: checks,
    totalRequests: allFlat.length,
  };
  const fs = await import('fs');
  fs.writeFileSync('/tmp/xdigix-loadtest-results.json', JSON.stringify(artifact, null, 2));
  console.log('\nResults saved to /tmp/xdigix-loadtest-results.json');
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
