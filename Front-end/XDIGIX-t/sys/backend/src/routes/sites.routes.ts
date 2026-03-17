import { Router, Request, Response } from 'express';
import { centralJwtMiddleware } from '../middleware/central-jwt.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { Site } from '../schemas/site.schema';
import { Domain } from '../schemas/domain.schema';
import { SiteVersion } from '../schemas/site-version.schema';
import { renderSite } from '../modules/sites/services/site-renderer.service';

const router = Router();

// All routes require auth + tenant resolution
router.use(centralJwtMiddleware);
router.use(tenantMiddleware);

function getDefaultSiteUrl(siteId: string): string {
  const base = process.env.SITE_BASE_URL || 'https://xdigix-os-production.up.railway.app';
  return `${base}/site/${siteId}`;
}

/* ── List sites for business ──────────────────────────────────── */
router.get('/', async (req: Request, res: Response) => {
  const businessId = req.businessId || req.tenantId;
  if (!businessId) { res.status(400).json({ error: 'businessId required' }); return; }
  try {
    const sites = await Site.find({ tenantId: req.tenantId, businessId })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ sites: sites.map(s => ({ ...s, id: String(s._id) })) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Create site ──────────────────────────────────────────────── */
router.post('/', async (req: Request, res: Response) => {
  const businessId = req.businessId || req.tenantId;
  if (!businessId) { res.status(400).json({ error: 'businessId required' }); return; }
  const { name, description, settings } = req.body as Record<string, unknown>;
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  try {
    const site = await Site.create({
      tenantId: req.tenantId,
      businessId,
      name,
      description: description || '',
      status: 'draft',
      sections: [],
      pages: [{ id: 'home', slug: 'home', name: 'Home', sections: [], order: 0 }],
      settings: settings || {},
      createdBy: req.accountPayload?.userId || req.user?.uid || 'unknown',
    });
    res.status(201).json({ id: String(site._id), site });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Get single site ──────────────────────────────────────────── */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const site = await Site.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
    if (!site) { res.status(404).json({ error: 'Site not found' }); return; }
    res.json({ ...site, id: String(site._id) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Update site (sections / settings / pages / name) ─────────── */
router.patch('/:id', async (req: Request, res: Response) => {
  const allowed = ['name', 'description', 'sections', 'pages', 'settings', 'customDomain'] as const;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  try {
    const site = await Site.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: update },
      { new: true }
    ).lean();
    if (!site) { res.status(404).json({ error: 'Site not found' }); return; }
    res.json({ ...site, id: String(site._id) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Delete site ──────────────────────────────────────────────── */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await Site.deleteOne({ _id: req.params.id, tenantId: req.tenantId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Publish site (atomic + version snapshot) ─────────────────── */
router.post('/:id/publish', async (req: Request, res: Response) => {
  const businessId = req.businessId || req.tenantId;
  try {
    // Snapshot current state before publishing
    const current = await Site.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
    if (!current) { res.status(404).json({ error: 'Site not found' }); return; }

    // Save version snapshot (keep last 15 per site)
    const versionCount = await SiteVersion.countDocuments({ siteId: req.params.id });
    if (versionCount >= 15) {
      const oldest = await SiteVersion.findOne({ siteId: req.params.id }).sort({ createdAt: 1 }).lean();
      if (oldest) await SiteVersion.deleteOne({ _id: oldest._id });
    }
    await SiteVersion.create({
      siteId:      req.params.id,
      tenantId:    req.tenantId,
      publishedBy: req.accountPayload?.userId || req.user?.uid || 'unknown',
      snapshot: {
        sections: current.sections,
        pages:    current.pages,
        settings: current.settings,
        name:     current.name,
      },
    });

    // Unpublish all other sites for this business
    await Site.updateMany(
      { tenantId: req.tenantId, businessId, _id: { $ne: req.params.id } },
      { $set: { status: 'draft', isActive: false, unpublishedAt: new Date() } }
    );

    const siteUrl = getDefaultSiteUrl(req.params.id);

    // Publish this site
    const site = await Site.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { status: 'published', isActive: true, publishedAt: new Date(), url: siteUrl, publicUrl: siteUrl } },
      { new: true }
    ).lean();

    // Reroute all custom domains for this business to this site
    await Domain.updateMany(
      { tenantId: req.tenantId },
      { $set: { siteId: req.params.id, updatedAt: new Date() } }
    );

    res.json({ ...site, id: String(site!._id) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Version history ──────────────────────────────────────────── */
router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const versions = await SiteVersion.find({ siteId: req.params.id, tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .select('-snapshot')   // omit full snapshot in list view
      .lean();
    res.json({ versions: versions.map(v => ({ ...v, id: String(v._id) })) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Rollback to a version ────────────────────────────────────── */
router.post('/:id/versions/:versionId/restore', async (req: Request, res: Response) => {
  try {
    const version = await SiteVersion.findOne({
      _id: req.params.versionId,
      siteId: req.params.id,
      tenantId: req.tenantId,
    }).lean();
    if (!version) { res.status(404).json({ error: 'Version not found' }); return; }

    const { sections, pages, settings } = version.snapshot as {
      sections: unknown; pages: unknown; settings: unknown;
    };

    const site = await Site.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { sections, pages, settings, status: 'draft', isActive: false } },
      { new: true }
    ).lean();

    res.json({ ...site, id: String(site!._id), restoredFromVersion: req.params.versionId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Unpublish site ───────────────────────────────────────────── */
router.post('/:id/unpublish', async (req: Request, res: Response) => {
  try {
    const site = await Site.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { status: 'draft', isActive: false, unpublishedAt: new Date(), updatedAt: new Date() } },
      { new: true }
    ).lean();
    if (!site) { res.status(404).json({ error: 'Site not found' }); return; }
    res.json({ ...site, id: String(site._id) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Duplicate site ───────────────────────────────────────────── */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  const businessId = req.businessId || req.tenantId;
  try {
    const source = await Site.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
    if (!source) { res.status(404).json({ error: 'Site not found' }); return; }
    const { _id, createdAt, updatedAt, publishedAt, ...rest } = source as Record<string, unknown>;
    const copy = await Site.create({
      ...rest,
      name: `${source.name} (Copy)`,
      status: 'draft',
      isActive: false,
      url: undefined,
      publicUrl: undefined,
      createdBy: req.accountPayload?.userId || req.user?.uid || 'unknown',
    });
    res.status(201).json({ id: String(copy._id), site: copy });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Render site as high-performance HTML ─────────────────────── */
router.get('/:id/render', async (req: Request, res: Response) => {
  try {
    const site = await Site.findOne({ _id: req.params.id, tenantId: req.tenantId }).lean();
    if (!site) { res.status(404).send('<h1>Site not found</h1>'); return; }
    const pageSlug = typeof req.query.page === 'string' ? req.query.page : undefined;
    // ETag based on updatedAt — allows 304 Not Modified
    const etag = `"${(site as any).updatedAt?.getTime?.().toString(36) ?? 'x'}"`;
    if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
    const html = renderSite(site as unknown as Parameters<typeof renderSite>[0], pageSlug);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/* ── Public render (no auth) ──────────────────────────────────── */
router.get('/:id/public', async (req: Request, res: Response) => {
  try {
    const site = await Site.findOne({ _id: req.params.id }).lean();
    if (!site) { res.status(404).send('<h1>Site not found</h1>'); return; }
    const pageSlug = typeof req.query.page === 'string' ? req.query.page : undefined;
    const etag = `"${(site as any).updatedAt?.getTime?.().toString(36) ?? 'x'}"`;
    if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
    const html = renderSite(site as unknown as Parameters<typeof renderSite>[0], pageSlug);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.send(html);
  } catch (err) {
    res.status(500).send('<h1>Error rendering site</h1>');
  }
});

export default router;
