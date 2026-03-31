/**
 * Admin load test — reporting, dashboard, support, exports.
 *
 * Flows:
 * 1. Reporting dashboard (all 7 summaries)
 * 2. Individual reports (orders, revenue, inventory)
 * 3. Support ticket listing
 * 4. Export creation
 * 5. Admin tenant overview
 *
 * Run: k6 run --env BASE_URL=http://localhost:3000 --env ADMIN_TOKEN=xxx loadtest/scenarios/admin.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, TENANT_ID, THRESHOLDS, SCENARIOS, adminHeaders } from '../config.js';

const dashboardDuration = new Trend('dashboard_duration_ms');
const reportDuration = new Trend('report_duration_ms');

export const options = {
  scenarios: {
    reporting: { ...SCENARIOS.steady, vus: 10, exec: 'adminFlow' },
  },
  thresholds: {
    ...THRESHOLDS,
    dashboard_duration_ms: ['p(95)<5000'],   // Dashboard p95 under 5s (7 parallel aggregations)
    report_duration_ms: ['p(95)<3000'],      // Individual report p95 under 3s
  },
};

export function adminFlow() {
  const params = adminHeaders();

  group('Dashboard', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/admin/reports/dashboard?tenantId=${TENANT_ID}&from=2026-01-01&to=2026-03-31`,
      params,
    );
    dashboardDuration.add(Date.now() - start);
    check(res, {
      'dashboard: status 200': (r) => r.status === 200,
      'dashboard: has data': (r) => {
        try { return JSON.parse(r.body).ok === true; } catch { return false; }
      },
    });
  });

  sleep(1 + Math.random());

  group('Revenue report', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/admin/reports/revenue?tenantId=${TENANT_ID}&from=2026-01-01&to=2026-03-31`,
      params,
    );
    reportDuration.add(Date.now() - start);
    check(res, { 'revenue: status 200': (r) => r.status === 200 });
  });

  sleep(0.5);

  group('Order report', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/admin/reports/orders?tenantId=${TENANT_ID}&from=2026-01-01&to=2026-03-31`,
      params,
    );
    reportDuration.add(Date.now() - start);
    check(res, { 'orders: status 200': (r) => r.status === 200 });
  });

  sleep(0.5);

  group('Inventory report', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/admin/reports/inventory?tenantId=${TENANT_ID}`,
      params,
    );
    reportDuration.add(Date.now() - start);
    check(res, { 'inventory: status 200': (r) => r.status === 200 });
  });

  sleep(0.5);

  group('Support tickets', () => {
    const res = http.get(
      `${BASE_URL}/api/support/tickets?tenantId=${TENANT_ID}&limit=20`,
      params,
    );
    check(res, { 'tickets: status 200': (r) => r.status === 200 });
  });

  sleep(0.5);

  group('Plan usage', () => {
    const res = http.get(
      `${BASE_URL}/api/admin/tenants/${TENANT_ID}/plan-usage`,
      params,
    );
    check(res, { 'plan-usage: status 200': (r) => r.status === 200 });
  });

  sleep(1 + Math.random());
}
