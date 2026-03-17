/**
 * AI Theme API  (/api/ai/*)
 * ─────────────────────────────────────────────────────────────────────
 * Authenticated endpoints used by the builder to preview and apply
 * AI-generated page layouts.
 *
 * Endpoints:
 *   POST /api/ai/render-preview
 *     Body: { layout: AiLayout, siteName?: string }
 *     Returns HTML preview of the AI layout (no DB writes)
 *
 *   POST /api/ai/sites/:siteId/apply
 *     Body: { layout: AiLayout }
 *     Overwrites the site's sections (+ optionally theme/seo) in MongoDB
 *     and returns the updated site document
 *
 * Security:
 *   - JWT-protected (auth middleware applied in index.ts)
 *   - Input validated with AiLayoutSchema (Zod) — blocks raw HTML,
 *     unregistered section types, oversized payloads
 *   - Rate-limited to 10 req/min per IP (generation is expensive)
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { validateAiLayout } from '../schemas/ai-layout.schema';
import { renderFromLayout } from '../modules/sites/services/site-renderer.service';
import { Site } from '../schemas/site.schema';
import type { ISection } from '../schemas/site.schema';

const router = Router();

/** 10 AI requests per minute per IP — generation is expensive */
const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests — please wait a moment.' },
});

/* ── POST /api/ai/render-preview ───────────────────────────────────── */
router.post('/render-preview', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { layout: rawLayout, siteName, tenantId: bodyTenantId } = req.body ?? {};

    if (!rawLayout || typeof rawLayout !== 'object') {
      return res.status(400).json({ error: 'Missing required field: layout' });
    }

    /* Validate layout — blocks raw HTML and unregistered section types */
    const validation = validateAiLayout(rawLayout);
    if (!validation.success) {
      return res.status(422).json({ error: 'Invalid layout', details: validation.errors });
    }

    /* Resolve tenantId: from body, JWT, or fallback to 'preview' */
    const tenantId: string =
      bodyTenantId ??
      (req as Request & { user?: { tenantId?: string } }).user?.tenantId ??
      'preview';

    const html = renderFromLayout(validation.data, tenantId, String(siteName ?? 'AI Preview'));

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(html);
  } catch (err) {
    console.error('[ai.routes] render-preview error', err);
    return res.status(500).json({ error: 'Preview rendering failed' });
  }
});

/* ── POST /api/ai/sites/:siteId/apply ──────────────────────────────── */
router.post('/sites/:siteId/apply', aiLimiter, async (req: Request, res: Response) => {
  try {
    const { siteId } = req.params;
    const { layout: rawLayout } = req.body ?? {};

    if (!rawLayout || typeof rawLayout !== 'object') {
      return res.status(400).json({ error: 'Missing required field: layout' });
    }

    /* Validate layout */
    const validation = validateAiLayout(rawLayout);
    if (!validation.success) {
      return res.status(422).json({ error: 'Invalid layout', details: validation.errors });
    }

    /* Find the site and verify ownership */
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const reqUser = (req as Request & { user?: { tenantId?: string; businessId?: string } }).user;
    if (reqUser?.tenantId && site.tenantId !== reqUser.tenantId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data: layout } = validation;

    /* Convert AiLayout sections to ISection documents */
    const newSections: ISection[] = layout.sections.map((s, i) => ({
      id:      `${Date.now()}-${i}-${s.type}`,
      type:    s.type,
      data:    (s.data ?? {}) as Record<string, unknown>,
      content: {} as Record<string, unknown>,
      style:   {} as Record<string, unknown>,
      hidden:  s.hidden ?? false,
      order:   s.order ?? i,
    }));

    /* Apply sections */
    site.sections = newSections as ISection[];

    /* Optionally apply theme overrides */
    if (layout.theme) {
      const t = layout.theme;
      if (t.primaryColor)    site.settings.theme.primaryColor    = t.primaryColor;
      if (t.secondaryColor)  site.settings.theme.secondaryColor  = t.secondaryColor;
      if (t.accentColor)     site.settings.theme.accentColor     = t.accentColor;
      if (t.backgroundColor) site.settings.theme.backgroundColor = t.backgroundColor;
      if (t.textColor)       site.settings.theme.textColor       = t.textColor;
      if (t.fontFamily)      site.settings.theme.fontFamily      = t.fontFamily;
      if (t.borderRadius)    site.settings.theme.borderRadius    = t.borderRadius;
    }

    /* Optionally apply SEO overrides */
    if (layout.seo) {
      if (layout.seo.title)       site.settings.seo.title       = layout.seo.title;
      if (layout.seo.description) site.settings.seo.description = layout.seo.description;
      if (layout.seo.keywords)    site.settings.seo.keywords    = layout.seo.keywords;
    }

    /* Mark as modified (Mongoose mixed fields) */
    site.markModified('sections');
    site.markModified('settings');
    await site.save();

    return res.json({
      ok:       true,
      siteId:   site._id,
      sections: site.sections.length,
      message:  'AI layout applied successfully',
    });
  } catch (err) {
    console.error('[ai.routes] apply error', err);
    return res.status(500).json({ error: 'Failed to apply AI layout' });
  }
});

export default router;
