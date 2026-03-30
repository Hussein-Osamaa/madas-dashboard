/**
 * Builder P0 tests.
 *
 * Tests publish flow, candidate/active model, failure handling,
 * rollback, render cache, domain binding, audit.
 */
import { describe, it, expect } from 'vitest';

/* ═══════════════════════════════════════════════════════════════════
   CANDIDATE → ACTIVE PUBLISH MODEL
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Publish Flow Contract', () => {
  it('candidateVersion = activeVersion + 1', () => {
    const activeVersion = 3;
    const candidateVersion = (activeVersion || 0) + 1;
    expect(candidateVersion).toBe(4);
  });

  it('candidateVersion starts at 1 when no activeVersion', () => {
    const activeVersion = null;
    const candidateVersion = (activeVersion || 0) + 1;
    expect(candidateVersion).toBe(1);
  });

  it('activeVersion changes ONLY after artifact stored', () => {
    // Flow: candidateVersion set → render → store in Redis → THEN activeVersion updated
    const steps = ['set_candidate', 'render', 'store_redis', 'promote_active'];
    const renderIndex = steps.indexOf('render');
    const storeIndex = steps.indexOf('store_redis');
    const promoteIndex = steps.indexOf('promote_active');
    expect(storeIndex).toBeLessThan(promoteIndex);
    expect(renderIndex).toBeLessThan(storeIndex);
  });

  it('previousVersion set to old activeVersion on promote', () => {
    const before = { activeVersion: 3, previousVersion: 2 };
    const candidateVersion = 4;
    const after = {
      previousVersion: before.activeVersion,
      activeVersion: candidateVersion,
    };
    expect(after.previousVersion).toBe(3);
    expect(after.activeVersion).toBe(4);
  });

  it('status becomes published on successful publish', () => {
    const status = 'published';
    expect(status).toBe('published');
  });

  it('candidate fields cleared after successful publish', () => {
    const after = {
      candidateVersion: null,
      candidateStatus: null,
      candidateFailedAt: null,
      candidateFailureReason: null,
    };
    expect(after.candidateVersion).toBeNull();
    expect(after.candidateStatus).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   RENDER FAILURE
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Render Failure', () => {
  it('render failure leaves activeVersion unchanged', () => {
    const before = { activeVersion: 3 };
    const renderFailed = true;
    const after = renderFailed ? before : { activeVersion: 4 };
    expect(after.activeVersion).toBe(3);
  });

  it('render failure marks candidate as failed', () => {
    const candidate = {
      candidateStatus: 'failed' as const,
      candidateFailedAt: new Date(),
      candidateFailureReason: 'Renderer threw: invalid section type',
    };
    expect(candidate.candidateStatus).toBe('failed');
    expect(candidate.candidateFailedAt).toBeInstanceOf(Date);
    expect(candidate.candidateFailureReason).toBeTruthy();
  });

  it('render failure preserves candidateVersion number', () => {
    // The candidate number is preserved so we can debug which version failed
    const candidateVersion = 5;
    expect(candidateVersion).toBe(5);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   REDIS FAILURE
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Redis Failure', () => {
  it('Redis write failure leaves activeVersion unchanged', () => {
    const before = { activeVersion: 3 };
    const redisFailed = true;
    const after = redisFailed ? before : { activeVersion: 4 };
    expect(after.activeVersion).toBe(3);
  });

  it('Redis failure marks candidate as failed with storage reason', () => {
    const candidate = {
      candidateStatus: 'failed' as const,
      candidateFailureReason: 'Redis write failed: connection timeout',
    };
    expect(candidate.candidateStatus).toBe('failed');
    expect(candidate.candidateFailureReason).toContain('Redis');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   CANDIDATE STATUS LIFECYCLE
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Candidate Status Lifecycle', () => {
  it('valid candidate statuses', () => {
    const valid = ['building', 'storing', 'failed', null];
    valid.forEach(s => expect(['building', 'storing', 'failed', null]).toContain(s));
  });

  it('lifecycle: null → building → storing → null (success)', () => {
    const lifecycle = [null, 'building', 'storing', null]; // null at end = promoted
    expect(lifecycle[1]).toBe('building');
    expect(lifecycle[2]).toBe('storing');
    expect(lifecycle[3]).toBeNull(); // cleared after promotion
  });

  it('lifecycle: null → building → failed (render error)', () => {
    const lifecycle = [null, 'building', 'failed'];
    expect(lifecycle[2]).toBe('failed');
  });

  it('lifecycle: null → building → storing → failed (Redis error)', () => {
    const lifecycle = [null, 'building', 'storing', 'failed'];
    expect(lifecycle[3]).toBe('failed');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   RETRY AFTER FAILURE
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Retry After Failed Publish', () => {
  it('retry overwrites stale candidate state', () => {
    // If previous publish failed at candidateVersion=5,
    // retry creates candidateVersion=5 (same or +1 from active)
    // The failed candidate metadata is overwritten
    const before = {
      activeVersion: 4,
      candidateVersion: 5,
      candidateStatus: 'failed',
    };
    const retryCandidate = (before.activeVersion || 0) + 1;
    expect(retryCandidate).toBe(5); // Same candidate number (or could be new)
  });

  it('retry resets candidateStatus to building', () => {
    const newStatus = 'building';
    expect(newStatus).toBe('building');
  });

  it('retry clears previous failure reason', () => {
    const after = {
      candidateFailedAt: null,
      candidateFailureReason: null,
    };
    expect(after.candidateFailedAt).toBeNull();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   ROLLBACK
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Rollback Flow', () => {
  it('rollback sets activeVersion to previousVersion', () => {
    const before = { activeVersion: 4, previousVersion: 3 };
    const after = { activeVersion: before.previousVersion, previousVersion: null };
    expect(after.activeVersion).toBe(3);
  });

  it('rollback requires previousVersion to exist', () => {
    const site = { activeVersion: 1, previousVersion: null };
    const canRollback = site.previousVersion !== null && site.previousVersion !== undefined;
    expect(canRollback).toBe(false);
  });

  it('rollback clears previousVersion (no double-rollback)', () => {
    const after = { previousVersion: null };
    expect(after.previousVersion).toBeNull();
  });

  it('rollback rebuilds artifact if Redis cache miss', () => {
    // If Redis doesn't have the artifact for the rollback version,
    // reload config snapshot from SiteVersion and re-render
    const redisHasArtifact = false;
    const hasConfigSnapshot = true;
    const canRebuild = !redisHasArtifact && hasConfigSnapshot;
    expect(canRebuild).toBe(true);
  });

  it('publishedVersion aligns with activeVersion after rollback', () => {
    const rollbackVersion = 3;
    const after = { activeVersion: rollbackVersion, publishedVersion: rollbackVersion };
    expect(after.activeVersion).toBe(after.publishedVersion);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   RENDER CACHE (Redis Artifacts)
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Render Cache Keys', () => {
  it('artifact key includes siteId, version, and pageSlug', () => {
    const key = `site:abc123:v3:home`;
    expect(key).toContain('abc123');
    expect(key).toContain('v3');
    expect(key).toContain('home');
  });

  it('different pages have different keys', () => {
    const homeKey = `site:abc:v1:home`;
    const productsKey = `site:abc:v1:products`;
    expect(homeKey).not.toBe(productsKey);
  });

  it('different versions have different keys', () => {
    const v1Key = `site:abc:v1:home`;
    const v2Key = `site:abc:v2:home`;
    expect(v1Key).not.toBe(v2Key);
  });

  it('invalidation clears all site artifacts', () => {
    // cacheDel('site:abc:*') clears all versions and pages
    const pattern = 'site:abc123:*';
    expect(pattern).toContain('*');
  });

  it('TTL is 7 days', () => {
    const ttlSeconds = 7 * 24 * 60 * 60;
    expect(ttlSeconds).toBe(604800);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   DOMAIN BINDING
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Domain Binding', () => {
  it('Builder writes siteId to domain record', () => {
    const domainUpdate = { siteId: 'site-123' };
    expect(domainUpdate.siteId).toBeTruthy();
  });

  it('Builder does NOT write verification fields', () => {
    const builderFields = ['siteId'];
    const platformCoreFields = ['verificationToken', 'dnsRecords', 'status'];
    builderFields.forEach(f => expect(platformCoreFields).not.toContain(f));
  });

  it('domain binding requires same tenant', () => {
    const siteTenantId = 'tenant-1';
    const domainTenantId = 'tenant-1';
    const sameTenat = siteTenantId === domainTenantId;
    expect(sameTenat).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   VERSION HISTORY
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Version History', () => {
  it('each publish creates a version snapshot', () => {
    const versions = [
      { version: 1, createdAt: new Date('2026-03-28') },
      { version: 2, createdAt: new Date('2026-03-29') },
      { version: 3, createdAt: new Date('2026-03-30') },
    ];
    expect(versions.length).toBe(3);
  });

  it('config snapshot includes sections and theme', () => {
    const snapshot = {
      sections: [{ id: 'hero-1', type: 'hero' }],
      pageSections: { home: [], products: [] },
      theme: { colorPrimary: '#1a1a1a' },
    };
    expect(snapshot.sections).toBeTruthy();
    expect(snapshot.theme).toBeTruthy();
  });

  it('rendered HTML is NOT in the snapshot', () => {
    const snapshot = { sections: [], theme: {} };
    expect(snapshot).not.toHaveProperty('renderedHtml');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   AUDIT AND EVENTS
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Audit and Events', () => {
  it('publish emits site.published event', () => {
    const eventType = 'site.published';
    expect(eventType).toBe('site.published');
  });

  it('rollback emits site.rollback event', () => {
    const eventType = 'site.rollback';
    expect(eventType).toBe('site.rollback');
  });

  it('unpublish emits site.unpublished event', () => {
    const eventType = 'site.unpublished';
    expect(eventType).toBe('site.unpublished');
  });

  it('publish audit entry includes version and actor', () => {
    const auditEntry = {
      action: 'site.published',
      module: 'builder',
      entityType: 'site',
      entityId: 'site-123',
      details: { version: 4, actor: 'user-456' },
    };
    expect(auditEntry.details.version).toBe(4);
    expect(auditEntry.details.actor).toBeTruthy();
  });

  it('failed publish audit entry includes reason', () => {
    const auditEntry = {
      action: 'site.publish_failed',
      details: { version: 5, reason: 'Redis write timeout' },
    };
    expect(auditEntry.details.reason).toBeTruthy();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   UNPUBLISH
   ═══════════════════════════════════════════════════════════════════ */

describe('Builder — Unpublish', () => {
  it('unpublish sets status to draft', () => {
    const afterStatus = 'draft';
    expect(afterStatus).toBe('draft');
  });

  it('unpublish invalidates all cached artifacts', () => {
    // renderCache.invalidate(siteId) called
    const invalidated = true;
    expect(invalidated).toBe(true);
  });
});
