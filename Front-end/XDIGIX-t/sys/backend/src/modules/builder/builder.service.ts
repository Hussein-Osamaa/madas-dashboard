import { Site, ISite, ISection } from '../../schemas/site.schema';
import { Domain } from '../../schemas/domain.schema';
import { SiteVersion } from './site-version.schema';
import { renderCache } from './render-cache';
import { renderSite } from '../sites/services/site-renderer.service';
import { eventBus } from '../platform-core/event-bus.service';
import { auditService } from '../platform-core/audit.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('builder');

/* ── Result types ────────────────────────────────────────────────── */

interface PublishResult {
  version: number;
  status: 'published';
}

interface RollbackResult {
  version: number;
}

interface UnpublishResult {
  status: 'draft';
}

interface BindDomainResult {
  domain: string;
  siteId: string;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Build a config snapshot from the current site state */
function buildConfigSnapshot(site: ISite): Record<string, unknown> {
  return {
    sections: site.sections,
    pageSections: site.pageSections,
    pages: site.pages,
    settings: site.settings,
    themeName: site.themeName,
  };
}

/* ── Builder service ─────────────────────────────────────────────── */

export const builderService = {

  // ── Read ────────────────────────────────────────────────────────

  /** Load a site document by ID */
  async getSite(siteId: string): Promise<ISite | null> {
    return Site.findById(siteId);
  },

  // ── Config updates (draft saves, no publish) ───────────────────

  /** Update section config (normal builder save, no publish) */
  async updateSections(
    siteId: string,
    sections: ISection[],
    pageSections: Record<string, ISection[]>,
    actor: string,
  ): Promise<ISite | null> {
    const site = await Site.findByIdAndUpdate(
      siteId,
      { $set: { sections, pageSections } },
      { new: true },
    );
    if (!site) return null;

    log.info(`Sections updated for site ${siteId}`, { actor });
    await auditService.log({
      actor,
      actorType: 'user',
      module: 'builder',
      action: 'updateSections',
      entityType: 'site',
      entityId: siteId,
      tenantId: site.tenantId,
    });
    return site;
  },

  /** Update theme */
  async updateTheme(
    siteId: string,
    theme: Record<string, unknown>,
    actor: string,
  ): Promise<ISite | null> {
    const site = await Site.findByIdAndUpdate(
      siteId,
      { $set: { 'settings.theme': theme } },
      { new: true },
    );
    if (!site) return null;

    log.info(`Theme updated for site ${siteId}`, { actor });
    await auditService.log({
      actor,
      actorType: 'user',
      module: 'builder',
      action: 'updateTheme',
      entityType: 'site',
      entityId: siteId,
      tenantId: site.tenantId,
    });
    return site;
  },

  // ── Publish (candidate -> active flow) ─────────────────────────

  /**
   * Publish a site. Follows the strict candidate -> active flow:
   *   1. Validate site
   *   2. Set candidateVersion + candidateStatus='building'
   *   3. Snapshot config into SiteVersion collection
   *   4. Render HTML
   *   5. Store rendered HTML in Redis
   *   6. ONLY on success: promote candidate to activeVersion
   *   7. Emit event + audit log
   *
   * activeVersion NEVER changes unless Redis write succeeds.
   */
  async publishSite(
    siteId: string,
    actor: string,
    correlationId?: string,
  ): Promise<PublishResult> {
    // Step 1: Load site, validate
    const site = await Site.findById(siteId);
    if (!site) throw new Error(`Site not found: ${siteId}`);

    // Plan enforcement: check published site count limit
    // Only enforce if this is a new publish (not a re-publish of an already-active site)
    if (!site.activeVersion || site.activeVersion === 0) {
      const tenantId = (site as Record<string, unknown>).tenantId as string;
      if (tenantId) {
        const { enforcementService } = await import('../platform-core/enforcement.service');
        await enforcementService.enforceSiteLimit(tenantId);
      }
    }

    const hasSections =
      (site.sections && site.sections.length > 0) ||
      (site.pageSections && Object.keys(site.pageSections).length > 0);
    if (!hasSections) {
      throw new Error(`Site ${siteId} has no sections to publish`);
    }

    // Step 2: Determine candidate version, mark as building
    const candidateVersion = (site.activeVersion || 0) + 1;
    await Site.updateOne(
      { _id: siteId },
      {
        $set: {
          candidateVersion,
          candidateStatus: 'building',
          candidateFailedAt: null,
          candidateFailureReason: null,
        },
      },
    );
    log.info(`Publish started: site=${siteId} candidate=v${candidateVersion}`, { actor, correlationId });

    // Step 3: Create config snapshot in SiteVersion collection
    const snapshot = buildConfigSnapshot(site);
    await SiteVersion.create({
      siteId,
      tenantId: site.tenantId,
      version: candidateVersion,
      configSnapshot: snapshot,
      createdBy: actor,
    });

    // Step 4: Render the site
    let html: string;
    try {
      html = renderSite(site);
    } catch (renderErr) {
      const reason = (renderErr as Error).message?.slice(0, 500) || 'Render failed';
      await Site.updateOne(
        { _id: siteId },
        {
          $set: {
            candidateStatus: 'failed',
            candidateFailureReason: reason,
            candidateFailedAt: new Date(),
          },
        },
      );
      log.error(`Render failed: site=${siteId} v${candidateVersion}`, { error: reason, actor });
      throw new Error(`Render failed for site ${siteId}: ${reason}`);
    }

    // Step 5: Mark storing, write to Redis
    await Site.updateOne({ _id: siteId }, { $set: { candidateStatus: 'storing' } });

    const stored = await renderCache.set(siteId, candidateVersion, 'home', html);
    if (!stored) {
      const reason = 'Failed to store rendered artifact in Redis';
      await Site.updateOne(
        { _id: siteId },
        {
          $set: {
            candidateStatus: 'failed',
            candidateFailureReason: reason,
            candidateFailedAt: new Date(),
          },
        },
      );
      log.error(`Redis store failed: site=${siteId} v${candidateVersion}`, { actor });
      throw new Error(reason);
    }

    // Step 6: Promote candidate to active (atomic update)
    const previousVersion = site.activeVersion ?? null;
    await Site.updateOne(
      { _id: siteId },
      {
        $set: {
          previousVersion,
          activeVersion: candidateVersion,
          publishedVersion: candidateVersion,
          status: 'published',
          publishedAt: new Date(),
          candidateVersion: null,
          candidateStatus: null,
          candidateFailedAt: null,
          candidateFailureReason: null,
        },
      },
    );

    log.info(`Published: site=${siteId} v${candidateVersion}`, { actor, correlationId });

    // Step 7: Event + audit
    await eventBus.safePublish('site.published', {
      siteId,
      tenantId: site.tenantId,
      version: candidateVersion,
      previousVersion,
      actor,
    }, { tenantId: site.tenantId, correlationId });

    await auditService.log({
      actor,
      actorType: 'user',
      module: 'builder',
      action: 'publish',
      entityType: 'site',
      entityId: siteId,
      tenantId: site.tenantId,
      correlationId,
      details: { version: candidateVersion, previousVersion },
    });

    return { version: candidateVersion, status: 'published' };
  },

  // ── Rollback ───────────────────────────────────────────────────

  /**
   * Rollback to the previous version.
   * If the artifact is missing from Redis, re-renders from the snapshot.
   */
  async rollbackSite(
    siteId: string,
    actor: string,
    correlationId?: string,
  ): Promise<RollbackResult> {
    // Step 1: Load site, validate previousVersion exists
    const site = await Site.findById(siteId);
    if (!site) throw new Error(`Site not found: ${siteId}`);
    if (!site.previousVersion) {
      throw new Error(`No previous version available for site ${siteId}`);
    }

    const targetVersion = site.previousVersion;

    // Step 2: Check if artifact exists in Redis
    const cached = await renderCache.get(siteId, targetVersion, 'home');
    if (!cached) {
      log.info(`Artifact missing for v${targetVersion}, re-rendering from snapshot`, { siteId });

      // Load config snapshot
      const versionDoc = await SiteVersion.findOne({ siteId, version: targetVersion });
      if (!versionDoc) {
        throw new Error(`Version snapshot not found: site=${siteId} v${targetVersion}`);
      }

      // Build a temporary site object with the snapshot config for rendering
      const snapshotSite = {
        ...site.toObject(),
        sections: (versionDoc.configSnapshot.sections as ISite['sections']) || [],
        pageSections: (versionDoc.configSnapshot.pageSections as ISite['pageSections']) || {},
        pages: (versionDoc.configSnapshot.pages as ISite['pages']) || [],
        settings: (versionDoc.configSnapshot.settings as ISite['settings']) || site.settings,
        themeName: (versionDoc.configSnapshot.themeName as string) || site.themeName,
      } as unknown as ISite;

      const html = renderSite(snapshotSite);
      await renderCache.set(siteId, targetVersion, 'home', html);
    }

    // Step 3: Update site — swap active to previous
    await Site.updateOne(
      { _id: siteId },
      {
        $set: {
          activeVersion: targetVersion,
          publishedVersion: targetVersion,
          previousVersion: null,
        },
      },
    );

    log.info(`Rolled back: site=${siteId} to v${targetVersion}`, { actor, correlationId });

    // Step 4: Emit event
    await eventBus.safePublish('site.rollback', {
      siteId,
      tenantId: site.tenantId,
      version: targetVersion,
      actor,
    }, { tenantId: site.tenantId, correlationId });

    // Step 5: Audit log
    await auditService.log({
      actor,
      actorType: 'user',
      module: 'builder',
      action: 'rollback',
      entityType: 'site',
      entityId: siteId,
      tenantId: site.tenantId,
      correlationId,
      details: { rolledBackToVersion: targetVersion },
    });

    return { version: targetVersion };
  },

  // ── Unpublish ──────────────────────────────────────────────────

  /** Unpublish a site — sets status to draft and invalidates artifacts */
  async unpublishSite(
    siteId: string,
    reason: string,
    actor: string,
  ): Promise<UnpublishResult> {
    // Step 1: Load and update
    const site = await Site.findById(siteId);
    if (!site) throw new Error(`Site not found: ${siteId}`);

    await Site.updateOne(
      { _id: siteId },
      {
        $set: {
          status: 'draft',
          unpublishedAt: new Date(),
        },
      },
    );

    // Step 2: Invalidate rendered artifacts
    await renderCache.invalidate(siteId);

    log.info(`Unpublished: site=${siteId}`, { actor, reason });

    // Step 3: Emit event
    await eventBus.safePublish('site.unpublished', {
      siteId,
      tenantId: site.tenantId,
      reason,
      actor,
    }, { tenantId: site.tenantId });

    // Step 4: Audit log
    await auditService.log({
      actor,
      actorType: 'user',
      module: 'builder',
      action: 'unpublish',
      entityType: 'site',
      entityId: siteId,
      tenantId: site.tenantId,
      details: { reason },
    });

    return { status: 'draft' };
  },

  // ── Domain binding ─────────────────────────────────────────────

  /**
   * Bind a custom domain to a site.
   * Builder only writes `siteId` on the domain record.
   * Verification/activation fields are owned by Platform Core.
   */
  async bindDomain(
    siteId: string,
    domain: string,
    actor: string,
  ): Promise<BindDomainResult> {
    const site = await Site.findById(siteId);
    if (!site) throw new Error(`Site not found: ${siteId}`);

    // Find existing domain or create a new one
    const existingDomain = await Domain.findOne({ domain, tenantId: site.tenantId });
    if (existingDomain) {
      // Update siteId only (Builder's owned field)
      await Domain.updateOne(
        { _id: existingDomain._id },
        { $set: { siteId } },
      );
    } else {
      // Create domain record with minimal fields — Platform Core handles verification
      const rootDomain = domain.split('.').slice(-2).join('.');
      const isSubdomain = domain.split('.').length > 2;
      await Domain.create({
        tenantId: site.tenantId,
        siteId,
        domain,
        rootDomain,
        isSubdomain,
        status: 'pending_dns',
        verificationToken: `xdigix-verify-${site.tenantId}-${Date.now()}`,
      });
    }

    // Update site's customDomain field
    await Site.updateOne(
      { _id: siteId },
      { $set: { customDomain: domain, 'settings.customDomain': domain } },
    );

    log.info(`Domain bound: ${domain} -> site ${siteId}`, { actor });

    await auditService.log({
      actor,
      actorType: 'user',
      module: 'builder',
      action: 'bindDomain',
      entityType: 'site',
      entityId: siteId,
      tenantId: site.tenantId,
      details: { domain },
    });

    return { domain, siteId };
  },

  // ── Version history ────────────────────────────────────────────

  /** Return SiteVersion records ordered by version descending */
  async getVersionHistory(siteId: string, limit = 20) {
    return SiteVersion.find({ siteId })
      .sort({ version: -1 })
      .limit(limit)
      .lean();
  },
};
