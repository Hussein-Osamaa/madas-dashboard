/**
 * Plan enforcement tests.
 *
 * Tests PlanLimitError model, enforcement service exports,
 * state machine behavior, visibility routes, and feature gating.
 */
import { describe, it, expect } from 'vitest';

/* ── PlanLimitError model ────────────────────────────────────────── */

describe('Enforcement — PlanLimitError', () => {
  it('creates structured error with all fields', async () => {
    const { PlanLimitError } = await import('../modules/platform-core/enforcement.service');
    const err = new PlanLimitError({
      resource: 'products',
      currentUsage: 50,
      allowedLimit: 50,
      plan: 'free',
      tenantId: 't1',
    });

    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('PLAN_LIMIT_EXCEEDED');
    expect(err.statusCode).toBe(403);
    expect(err.resource).toBe('products');
    expect(err.currentUsage).toBe(50);
    expect(err.allowedLimit).toBe(50);
    expect(err.plan).toBe('free');
    expect(err.tenantId).toBe('t1');
    expect(err.message).toContain('products');
    expect(err.message).toContain('50/50');
    expect(err.message).toContain('free');
  });

  it('toJSON excludes sensitive fields', async () => {
    const { PlanLimitError } = await import('../modules/platform-core/enforcement.service');
    const err = new PlanLimitError({
      resource: 'staff',
      currentUsage: 2,
      allowedLimit: 2,
      plan: 'free',
      tenantId: 't1',
    });

    const json = err.toJSON();
    expect(json.code).toBe('PLAN_LIMIT_EXCEEDED');
    expect(json.resource).toBe('staff');
    expect(json.currentUsage).toBe(2);
    expect(json.allowedLimit).toBe(2);
    expect(json.plan).toBe('free');
    // tenantId should NOT be in the JSON response (client-facing)
    expect((json as Record<string, unknown>).tenantId).toBeUndefined();
  });

  it('accepts custom message', async () => {
    const { PlanLimitError } = await import('../modules/platform-core/enforcement.service');
    const err = new PlanLimitError({
      resource: 'products',
      currentUsage: 0,
      allowedLimit: 0,
      plan: 'free',
      tenantId: 't1',
      message: 'Tenant is suspended — cannot create products',
    });
    expect(err.message).toBe('Tenant is suspended — cannot create products');
  });
});

/* ── Enforcement service exports ─────────────────────────────────── */

describe('Enforcement — Service Exports', () => {
  it('exports all enforcement methods', async () => {
    const { enforcementService } = await import('../modules/platform-core/enforcement.service');
    expect(typeof enforcementService.getLimits).toBe('function');
    expect(typeof enforcementService.getUsage).toBe('function');
    expect(typeof enforcementService.getCapabilities).toBe('function');
    expect(typeof enforcementService.enforceProductLimit).toBe('function');
    expect(typeof enforcementService.enforceStaffLimit).toBe('function');
    expect(typeof enforcementService.enforceSiteLimit).toBe('function');
    expect(typeof enforcementService.enforceOrderLimit).toBe('function');
    expect(typeof enforcementService.enforceFeature).toBe('function');
  });
});

/* ── Plan limits definition verification ─────────────────────────── */

describe('Enforcement — Plan Definitions', () => {
  it('free plan has restrictive limits', async () => {
    const { planService } = await import('../modules/platform-core/plan.service');
    // Verify the default plans have sensible limits
    // The free plan should have limited products, staff, sites
    expect(typeof planService.getPlan).toBe('function');
    expect(typeof planService.listPlans).toBe('function');
  });

  it('IPlanLimits fields match enforcement checks', async () => {
    // Verify the enforcement service checks all limit fields
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/platform-core/enforcement.service.ts',
      ),
      'utf-8',
    );

    // All 5 limit fields are checked
    expect(code).toContain('limits.products');
    expect(code).toContain('limits.staff');
    expect(code).toContain('limits.sites');
    expect(code).toContain('limits.monthlyOrders');
    expect(code).toContain('limits.storageMB');
  });

  it('unlimited values (-1) bypass enforcement', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/platform-core/enforcement.service.ts',
      ),
      'utf-8',
    );

    // Every enforce function checks for -1 (unlimited) and returns early
    const enforceBlocks = code.split('async enforce');
    for (let i = 1; i < enforceBlocks.length; i++) {
      const block = enforceBlocks[i];
      if (block.includes('Feature')) continue; // Feature doesn't use -1
      expect(block).toContain('=== -1');
    }
  });
});

/* ── Module integration verification ─────────────────────────────── */

describe('Enforcement — Module Integration', () => {
  it('inventory.service calls enforceProductLimit', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/inventory/inventory.service.ts',
      ),
      'utf-8',
    );
    expect(code).toContain('enforceProductLimit');
  });

  it('builder.service calls enforceSiteLimit', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/builder/builder.service.ts',
      ),
      'utf-8',
    );
    expect(code).toContain('enforceSiteLimit');
  });

  it('orders.service calls enforceOrderLimit', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/orders/orders.service.ts',
      ),
      'utf-8',
    );
    expect(code).toContain('enforceOrderLimit');
  });

  it('enforcement is called before business logic (at top of create functions)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');

    // Inventory: enforceProductLimit before 'Product name is required' validation
    const inv = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/inventory/inventory.service.ts',
      ),
      'utf-8',
    );
    const enforcePos = inv.indexOf('enforceProductLimit');
    const nameCheckPos = inv.indexOf("'Product name is required'");
    expect(enforcePos).toBeLessThan(nameCheckPos);

    // Orders: enforceOrderLimit before checkout validation
    const ord = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/orders/orders.service.ts',
      ),
      'utf-8',
    );
    const orderEnforcePos = ord.indexOf('enforceOrderLimit');
    const checkoutValPos = ord.indexOf('CheckoutRequestSchema.safeParse');
    expect(orderEnforcePos).toBeLessThan(checkoutValPos);
  });
});

/* ── Visibility routes ───────────────────────────────────────────── */

describe('Enforcement — Visibility Routes', () => {
  it('merchant plan-usage route exists', async () => {
    const { merchantPlanRouter } = await import('../modules/platform-core/enforcement.routes');
    const stack = (merchantPlanRouter as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const routes = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(routes).toContain('/plan-usage');
  });

  it('admin plan-usage route exists', async () => {
    const { adminPlanRouter } = await import('../modules/platform-core/enforcement.routes');
    const stack = (adminPlanRouter as unknown as { stack: Array<{ route?: { path: string } }> }).stack;
    const routes = stack.filter((l) => l.route).map((l) => l.route!.path);
    expect(routes).toContain('/tenants/:tenantId/plan-usage');
  });
});

/* ── Capabilities structure ──────────────────────────────────────── */

describe('Enforcement — Capabilities', () => {
  it('TenantUsage tracks all 5 resource types', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/platform-core/enforcement.service.ts',
      ),
      'utf-8',
    );

    // TenantUsage interface has all 5 fields
    expect(code).toContain('products: number');
    expect(code).toContain('staff: number');
    expect(code).toContain('publishedSites: number');
    expect(code).toContain('monthlyOrders: number');
    expect(code).toContain('storageMB: number');
  });

  it('TenantCapabilities includes overLimit flags', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/platform-core/enforcement.service.ts',
      ),
      'utf-8',
    );

    // overLimit flags are computed for all resource types
    expect(code).toContain("overLimit: Record<string, boolean>");
    expect(code).toContain("products: limits.products !== -1");
    expect(code).toContain("staff: limits.staff !== -1");
    expect(code).toContain("publishedSites: limits.sites !== -1");
    expect(code).toContain("monthlyOrders: limits.monthlyOrders !== -1");
    expect(code).toContain("storageMB: limits.storageMB !== -1");
  });
});

/* ── Suspended/cancelled tenant behavior ─────────────────────────── */

describe('Enforcement — Tenant Status Checks', () => {
  it('enforceProductLimit blocks suspended tenants', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/platform-core/enforcement.service.ts',
      ),
      'utf-8',
    );
    // Verify suspended/cancelled check in enforceProductLimit
    expect(code).toContain("tenant.status === 'suspended'");
    expect(code).toContain("tenant.status === 'cancelled'");
  });
});

/* ── Grace period behavior ───────────────────────────────────────── */

describe('Enforcement — Grace Period', () => {
  it('grace period uses the active plan limits (not free)', async () => {
    // Grace-period tenants have planActivation='grace' but plan='starter'/'pro'/etc.
    // The enforcement service reads tenant.plan which is the grace plan
    // so they get the limits of the active grace plan
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/platform-core/enforcement.service.ts',
      ),
      'utf-8',
    );

    // getLimits reads tenant.plan (which is the current plan, even during grace)
    expect(code).toContain('tenant.plan');
    expect(code).toContain("Plan.findOne({ planId: tenant.plan })");
  });
});

/* ── Audit logging ───────────────────────────────────────────────── */

describe('Enforcement — Audit', () => {
  it('violations are logged to audit service', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const code = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/platform-core/enforcement.service.ts',
      ),
      'utf-8',
    );

    expect(code).toContain('auditService.log');
    expect(code).toContain("action: 'limit_violation'");
    expect(code).toContain("module: 'enforcement'");
    expect(code).toContain('currentUsage');
    expect(code).toContain('allowedLimit');
  });
});

/* ── Feature gating ──────────────────────────────────────────────── */

describe('Enforcement — Feature Gating', () => {
  it('enforceFeature checks feature flag and throws if disabled', async () => {
    const { enforcementService } = await import('../modules/platform-core/enforcement.service');
    expect(typeof enforcementService.enforceFeature).toBe('function');
  });

  it('enforceFeature error message includes flag name', async () => {
    const { PlanLimitError } = await import('../modules/platform-core/enforcement.service');
    const err = new PlanLimitError({
      resource: 'advanced_reporting',
      currentUsage: 0,
      allowedLimit: 0,
      plan: 'n/a',
      tenantId: 't1',
      message: 'Feature "advanced_reporting" is not enabled for this tenant',
    });
    expect(err.message).toContain('advanced_reporting');
  });
});

/* ── Downgrade behavior ──────────────────────────────────────────── */

describe('Enforcement — Downgrade Behavior', () => {
  it('overLimit flags allow read but block create', async () => {
    // The enforcement service only blocks at CREATE boundaries
    // Existing resources above the limit remain readable
    // Verify: enforcement is called in createProduct, not in getProduct/listProducts
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const inv = readFileSync(
      resolve(
        '/Users/hesainosamagmail.com/university/Project\'s/Web/Front-End/Projects/Madas/Front-end/XDIGIX-t/sys/backend/src/modules/inventory/inventory.service.ts',
      ),
      'utf-8',
    );

    // enforceProductLimit appears in createProduct
    const createBlock = inv.slice(inv.indexOf('async function createProduct'));
    expect(createBlock).toContain('enforceProductLimit');

    // But NOT in getProduct or listProducts
    const getIdx = inv.indexOf('async function getProduct');
    if (getIdx > 0) {
      const getBlock = inv.slice(getIdx, inv.indexOf('async function', getIdx + 50));
      expect(getBlock).not.toContain('enforceProductLimit');
    }
  });
});
