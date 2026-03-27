import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { centralJwtMiddleware } from '../middleware/central-jwt.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { Site } from '../schemas/site.schema';
import { Domain } from '../schemas/domain.schema';
import { SiteVersion } from '../schemas/site-version.schema';
import { renderSite } from '../modules/sites/services/site-renderer.service';

/* ── Zod schema for PATCH /sites/:id ─────────────────────────── */
const SectionSchemaZ = z.object({
  id:      z.string(),
  type:    z.string(),
  order:   z.number().optional(),
  data:    z.record(z.unknown()).optional(),
  content: z.record(z.unknown()).optional(),
  style:   z.record(z.unknown()).optional(),
  hidden:  z.boolean().optional(),
}).passthrough();

const PageSeoSchemaZ = z.object({
  title:       z.string().max(80).optional(),
  description: z.string().max(200).optional(),
  ogImage:     z.string().max(500).optional(),
  canonical:   z.string().max(500).optional(),
}).optional();

const PageSchemaZ = z.object({
  id:       z.string(),
  slug:     z.string(),
  name:     z.string().max(200),
  sections: z.array(SectionSchemaZ).optional(),
  order:    z.number().optional(),
  seo:      PageSeoSchemaZ,
}).passthrough();

const PatchSiteSchema = z.object({
  name:         z.string().min(1).max(200).optional(),
  description:  z.string().max(1000).optional(),
  sections:     z.array(SectionSchemaZ).optional(),
  pages:        z.array(PageSchemaZ).optional(),
  settings: z.object({
    theme:    z.record(z.string()).optional(),
    seo: z.object({
      title:       z.string().max(80).optional(),
      description: z.string().max(200).optional(),
      keywords:    z.array(z.string()).optional(),
      ogImage:     z.string().max(500).optional(),
    }).optional(),
    analytics:     z.record(z.string()).optional(),
    customCss:     z.string().max(100_000).optional(),
    customJs:      z.never({ invalid_type_error: 'customJs is rejected for security reasons' }).optional(),
    announcements: z.object({
      enabled:     z.boolean().optional(),
      text:        z.string().max(500).optional(),
      link:        z.string().max(500).optional(),
      dismissible: z.boolean().optional(),
    }).optional(),
    favicon:      z.string().max(500).optional(),
    customDomain: z.string().max(253).optional(),
  }).passthrough().optional(),
  customDomain: z.string().max(253).optional(),
});

const router = Router();

// All routes require auth + tenant resolution
router.use(centralJwtMiddleware);
router.use(tenantMiddleware);

/** Slugify a brand/site name into a valid subdomain label */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // non-alphanumeric → dash
    .replace(/^-+|-+$/g, '')       // trim leading/trailing dashes
    .slice(0, 63) || 'store';      // max label length
}

function getDefaultSiteUrl(siteId: string): string {
  const base = process.env.SITE_BASE_URL || 'https://xdigix-os-production.up.railway.app';
  return `${base}/site/${siteId}`;
}

function getSubdomainUrl(subdomain: string): string {
  const rootDomain = process.env.SITE_ROOT_DOMAIN || 'xdigix.com';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${subdomain}.${rootDomain}`;
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
  const { name, themeName, description, settings } = req.body as Record<string, unknown>;
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  try {
    const site = await Site.create({
      tenantId: req.tenantId,
      businessId,
      name,
      themeName: themeName || name,
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
  // Validate request body with Zod
  const parsed = PatchSiteSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    res.status(422).json({ error: `Validation failed — ${issues}` });
    return;
  }

  const allowed = ['name', 'description', 'sections', 'pages', 'settings', 'customDomain'] as const;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if ((parsed.data as Record<string, unknown>)[key] !== undefined) {
      update[key] = (parsed.data as Record<string, unknown>)[key];
    }
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

    // Generate subdomain from site name (e.g. "Madas" → madas.xdigix.com)
    const rootDomain = process.env.SITE_ROOT_DOMAIN || 'xdigix.com';
    let subdomain = slugify(current.name);
    // Ensure uniqueness: check if subdomain is taken by another tenant
    const existingDomain = await Domain.findOne({
      domain: `${subdomain}.${rootDomain}`,
      tenantId: { $ne: req.tenantId },
    }).lean();
    if (existingDomain) {
      // Append short hash to make unique
      subdomain = `${subdomain}-${crypto.randomBytes(3).toString('hex')}`;
    }

    const subdomainFull = `${subdomain}.${rootDomain}`;
    const subdomainUrl = getSubdomainUrl(subdomain);
    const fallbackUrl = getDefaultSiteUrl(req.params.id);

    // Upsert the subdomain Domain record for this tenant
    await Domain.findOneAndUpdate(
      { tenantId: req.tenantId, rootDomain, isSubdomain: true },
      {
        $set: {
          siteId: req.params.id,
          domain: subdomainFull,
          rootDomain,
          isSubdomain: true,
          status: 'active',
          updatedAt: new Date(),
        },
        $setOnInsert: {
          tenantId: req.tenantId,
          verificationToken: crypto.randomBytes(16).toString('hex'),
          failureCount: 0,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Publish this site — publicUrl is the subdomain, url is fallback
    const site = await Site.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: { status: 'published', isActive: true, publishedAt: new Date(), url: fallbackUrl, publicUrl: subdomainUrl, slug: subdomain } },
      { new: true }
    ).lean();

    // Reroute all custom domains for this business to this site
    await Domain.updateMany(
      { tenantId: req.tenantId, isSubdomain: { $ne: true } },
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
