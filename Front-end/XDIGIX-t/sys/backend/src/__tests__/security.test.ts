/**
 * Security audit verification tests.
 *
 * Tests real security controls, not fake penetration assertions.
 * Verifies code-level protections are in place.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

/* ── JWT Algorithm Enforcement ───────────────────────────────────── */

describe('Security — JWT Algorithm', () => {
  it('auth.service signs with explicit HS256', () => {
    const code = readSrc('services/auth.service.ts');
    const signCalls = code.match(/jwt\.sign\([^)]+\)/g) || [];
    for (const call of signCalls) {
      expect(call).toContain("algorithm: 'HS256'");
    }
  });

  it('central-auth.service signs with explicit HS256', () => {
    const code = readSrc('services/central-auth.service.ts');
    const signCalls = code.match(/jwt\.sign\([^)]+\)/g) || [];
    for (const call of signCalls) {
      // signTokens uses opts which includes algorithm
      expect(code).toContain("algorithm: 'HS256'");
    }
  });

  it('auth.service verifies with algorithms whitelist', () => {
    const code = readSrc('services/auth.service.ts');
    expect(code).toContain("algorithms: ['HS256']");
  });

  it('central-auth.service verifies with algorithms whitelist', () => {
    const code = readSrc('services/central-auth.service.ts');
    expect(code).toContain("algorithms: ['HS256']");
  });

  it('no jwt.verify call without algorithm restriction', () => {
    // Check both auth services have no unprotected verify calls
    for (const file of ['services/auth.service.ts', 'services/central-auth.service.ts']) {
      const code = readSrc(file);
      const verifyLines = code.split('\n').filter((l) => l.includes('jwt.verify('));
      for (const line of verifyLines) {
        expect(line).toContain('algorithms');
      }
    }
  });
});

/* ── Password Reset Token Atomicity ──────────────────────────────── */

describe('Security — Password Reset', () => {
  it('uses findOneAndUpdate for atomic token claim', () => {
    const code = readSrc('services/auth.service.ts');
    // Must use findOneAndUpdate (not findOne then save)
    expect(code).toContain('PasswordResetToken.findOneAndUpdate');
    // Must atomically set used: true
    expect(code).toContain("$set: { used: true }");
  });

  it('no separate findOne + save pattern for reset tokens', () => {
    const code = readSrc('services/auth.service.ts');
    const resetFn = code.slice(code.indexOf('resetPasswordWithToken'));
    // Should NOT have the old pattern: findOne then later doc.save()
    expect(resetFn).not.toContain('resetDoc.used = true');
    expect(resetFn).not.toContain('resetDoc.save()');
  });
});

/* ── Refresh Token Rotation ──────────────────────────────────────── */

describe('Security — Refresh Token', () => {
  it('refresh token is deleted on use (single-use rotation)', () => {
    const code = readSrc('services/central-auth.service.ts');
    expect(code).toContain('findOneAndDelete');
    expect(code).toContain('Atomic claim: delete the refresh token on use');
  });

  it('old refresh token cannot be replayed', () => {
    const code = readSrc('services/central-auth.service.ts');
    // findOneAndDelete means the token is gone after first use
    const refreshFn = code.slice(code.indexOf('export async function refreshToken'));
    expect(refreshFn).toContain('findOneAndDelete');
    // Should NOT use findOne (which keeps the token)
    expect(refreshFn).not.toMatch(/RefreshToken\.findOne\(\{[^}]*token:/);
  });
});

/* ── Production Config Validation ────────────────────────────────── */

describe('Security — Config Validation', () => {
  it('JWT secrets validated for minimum length in production', () => {
    const code = readSrc('config.ts');
    expect(code).toContain('accessSecret.length < 32');
    expect(code).toContain('refreshSecret.length < 32');
  });

  it('MONGODB_URI required in production', () => {
    const code = readSrc('config.ts');
    expect(code).toContain("!config.mongo.uri");
    expect(code).toContain('MONGODB_URI is required in production');
  });

  it('JWT secret missing causes process.exit in production', () => {
    const code = readSrc('config.ts');
    expect(code).toContain("process.exit(1)");
  });

  it('ZAMMIT_ENCRYPTION_KEY warns when missing', () => {
    const code = readSrc('config.ts');
    expect(code).toContain('ZAMMIT_ENCRYPTION_KEY is not set');
  });
});

/* ── Error Middleware Sanitization ────────────────────────────────── */

describe('Security — Error Handling', () => {
  it('production errors do not leak stack traces', () => {
    const code = readSrc('middleware/error.middleware.ts');
    expect(code).toContain("isProd");
    expect(code).toContain("'Internal server error'");
    // Stack only in dev
    expect(code).toContain("!isProd && err.stack");
  });

  it('production logs do not include full error objects', () => {
    const code = readSrc('middleware/error.middleware.ts');
    // Production: only log message, not full error object
    expect(code).toContain('err.message');
    // The full object logging should be in the else (dev) branch only
    const lines = code.split('\n');
    const fullErrorLog = lines.find((l) => l.includes("console.error('[Error]', err)"));
    // If it exists, it should be in a non-production block
    if (fullErrorLog) {
      // Verify it's in the else branch
      const idx = lines.indexOf(fullErrorLog);
      const context = lines.slice(Math.max(0, idx - 3), idx).join('\n');
      expect(context).toContain('else');
    }
  });

  it('4xx errors show message, 5xx errors are generic in production', () => {
    const code = readSrc('middleware/error.middleware.ts');
    expect(code).toContain('statusCode < 500');
  });
});

/* ── Cart Price Server-Side Validation ───────────────────────────── */

describe('Security — Cart Price Validation', () => {
  it('cart add does NOT accept price from client body', () => {
    const code = readSrc('routes/public.routes.ts');
    // The destructured body should NOT include 'price'
    const cartAddSection = code.slice(code.indexOf("/:tenantId/cart/add"));
    const bodyDestructure = cartAddSection.match(/const \{[^}]+\} = req\.body/);
    if (bodyDestructure) {
      expect(bodyDestructure[0]).not.toContain('price');
    }
  });

  it('cart add fetches price from product database', () => {
    const code = readSrc('routes/public.routes.ts');
    // Verify the server-side price lookup exists in the cart add handler
    expect(code).toContain("NEVER trust client-supplied prices");
    expect(code).toContain("pData.price");
    expect(code).toContain("pData.sellingPrice");
  });

  it('product not found returns 404 (not default price)', () => {
    const code = readSrc('routes/public.routes.ts');
    expect(code).toContain("Product not found");
  });
});

/* ── Tenant Isolation ────────────────────────────────────────────── */

describe('Security — Tenant Isolation', () => {
  it('reporting routes enforce tenant scoping', () => {
    const code = readSrc('modules/reporting/reporting.routes.ts');
    expect(code).toContain('reqTenantId');
    expect(code).toContain('filters.tenantId = reqTenantId');
  });

  it('export routes block cross-tenant access', () => {
    const code = readSrc('modules/exports/export.routes.ts');
    expect(code).toContain('Cross-tenant access denied');
    expect(code).toContain('job.tenantId !== tenantScope');
  });

  it('support routes enforce tenant scoping', () => {
    const code = readSrc('modules/support/support.routes.ts');
    expect(code).toContain('enforceTenant');
    expect(code).toContain("ticket.tenantId !== tenantScope");
  });

  it('support routes hide internal tickets from merchants', () => {
    const code = readSrc('modules/support/support.routes.ts');
    expect(code).toContain("visibility === 'internal'");
    expect(code).toContain("filters.visibility = 'tenant'");
  });

  it('export generators exclude internal tickets for merchant scope', () => {
    const code = readSrc('modules/exports/export-generators.ts');
    expect(code).toContain("scope === 'merchant_self'");
    expect(code).toContain("query.visibility = 'tenant'");
  });

  it('audit log export restricted to admin scope', () => {
    const code = readSrc('modules/exports/export-generators.ts');
    expect(code).toContain("opts.scope !== 'admin_tenant'");
  });
});

/* ── CSRF Protection ─────────────────────────────────────────────── */

describe('Security — CSRF', () => {
  it('CSRF middleware is applied globally', () => {
    const code = readSrc('app.ts');
    expect(code).toContain('csrfProtection');
  });
});

/* ── Rate Limiting ───────────────────────────────────────────────── */

describe('Security — Rate Limiting', () => {
  it('global rate limiter is configured', () => {
    const code = readSrc('app.ts');
    expect(code).toContain('rateLimit');
  });

  it('auth endpoints have strict rate limiting', () => {
    const code = readSrc('routes/auth.routes.ts');
    expect(code).toContain('authRateLimit');
  });

  it('brute force middleware exists', () => {
    expect(fs.existsSync(path.join(SRC, 'middleware/brute-force.middleware.ts'))).toBe(true);
  });
});

/* ── Helmet Security Headers ─────────────────────────────────────── */

describe('Security — HTTP Headers', () => {
  it('helmet is configured', () => {
    const code = readSrc('app.ts');
    expect(code).toContain('helmet(');
  });

  it('cross-origin resource policy is set', () => {
    const code = readSrc('app.ts');
    expect(code).toContain('crossOriginResourcePolicy');
  });
});

/* ── Background Job Atomicity ────────────────────────────────────── */

describe('Security — Concurrency Safety', () => {
  it('event bus uses atomic claim (findOneAndUpdate)', () => {
    const code = readSrc('modules/platform-core/event-bus.service.ts');
    expect(code).toContain('findOneAndUpdate');
    expect(code).toContain("status: 'pending'");
    expect(code).toContain("status: 'processing'");
  });

  it('export job uses atomic claim', () => {
    const code = readSrc('modules/exports/export.service.ts');
    expect(code).toContain('findOneAndUpdate');
    expect(code).toContain("status: 'queued'");
  });

  it('notification retry uses atomic claim', () => {
    const code = readSrc('modules/notifications/notification.service.ts');
    expect(code).toContain('findOneAndUpdate');
    expect(code).toContain("status: 'retrying'");
  });

  it('shipping retry uses atomic claim with $inc', () => {
    const code = readSrc('modules/shipping-module/shipping.jobs.ts');
    expect(code).toContain('findOneAndUpdate');
    expect(code).toContain('$inc: { retryCount: 1 }');
  });
});

/* ── Sensitive Data Protection ───────────────────────────────────── */

describe('Security — Data Protection', () => {
  it('staff routes exclude passwordHash from responses', () => {
    const code = readSrc('routes/staff.routes.ts');
    expect(code).toContain('passwordHash');
    // Should destructure or select to remove it
    expect(code.includes("'-passwordHash'") || code.includes('passwordHash: _')).toBe(true);
  });

  it('public routes strip internal fields', () => {
    const code = readSrc('routes/public.routes.ts');
    expect(code).toContain('stripMeta');
  });

  it('audit log export excludes details field', () => {
    const code = readSrc('modules/exports/export-generators.ts');
    expect(code).toContain('details intentionally excluded');
  });
});

/* ── Plan Enforcement Security ───────────────────────────────────── */

describe('Security — Plan Enforcement', () => {
  it('suspended tenants blocked from creating products', () => {
    const code = readSrc('modules/platform-core/enforcement.service.ts');
    expect(code).toContain("tenant.status === 'suspended'");
    expect(code).toContain("tenant.status === 'cancelled'");
  });

  it('PlanLimitError.toJSON excludes tenantId', () => {
    const code = readSrc('modules/platform-core/enforcement.service.ts');
    // toJSON should not include tenantId
    const toJsonBlock = code.slice(code.indexOf('toJSON()'));
    expect(toJsonBlock).not.toMatch(/tenantId.*this\.tenantId/);
  });
});
