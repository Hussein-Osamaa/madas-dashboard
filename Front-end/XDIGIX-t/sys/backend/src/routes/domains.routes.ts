import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { jwtMiddleware } from '../middleware/jwt.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { v4 as uuidv4 } from 'uuid';
import { Domain } from '../schemas/domain.schema';
import * as dns from 'dns/promises';

const router = Router();
router.use(jwtMiddleware);
router.use(tenantMiddleware);

function sanitizeDomain(domain: string): string | null {
  const cleaned = domain
    .toLowerCase()
    .trim()
    .replace(/^(https?:\/\/)?/, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  return domainRegex.test(cleaned) ? cleaned : null;
}

router.post(
  '/add',
  body('domain').isString().notEmpty(),
  body('tenantId').isString().notEmpty(),
  body('siteId').isString().notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: 'Invalid input', details: errors.array() });
      return;
    }
    const { domain: rawDomain, tenantId, siteId } = req.body;
    const domain = sanitizeDomain(rawDomain);
    if (!domain) {
      res.status(400).json({ success: false, error: 'Invalid domain format' });
      return;
    }
    if (tenantId !== req.tenantId) {
      res.status(403).json({ success: false, error: 'Tenant mismatch' });
      return;
    }
    const existing = await Domain.findOne({ domain });
    if (existing) {
      res.status(409).json({ success: false, error: 'Domain already registered' });
      return;
    }
    const rootDomain = domain.split('.').slice(-2).join('.');
    const isSubdomain = domain.split('.').length > 2 && !domain.startsWith('www.');
    const verificationToken = `digix-verification=${uuidv4().replace(/-/g, '')}`;
    const doc = await Domain.create({
      tenantId,
      siteId,
      domain,
      rootDomain,
      isSubdomain,
      verificationToken,
      status: 'pending_dns',
      dnsRecords: {
        txtRecord: { host: `_digix-verification.${domain}`, value: verificationToken },
      },
    });
    res.json({
      success: true,
      domainId: doc._id.toString(),
      domain,
      status: doc.status,
      verificationToken,
      instructions: {
        domain,
        isSubdomain,
        verification: { type: 'TXT', host: domain, value: verificationToken, description: 'Add this TXT record' },
        pointing: { type: 'A', host: domain, value: ['199.36.158.100'], description: 'Point A record to hosting IP' },
      },
    });
  }
);

router.post(
  '/verify',
  body('domainId').isString().notEmpty(),
  body('tenantId').isString().notEmpty(),
  async (req: Request, res: Response) => {
    const { domainId, tenantId } = req.body;
    if (tenantId !== req.tenantId) {
      res.status(403).json({ success: false, error: 'Tenant mismatch' });
      return;
    }
    const doc = await Domain.findOne({ _id: domainId, tenantId });
    if (!doc) {
      res.status(404).json({ success: false, error: 'Domain not found' });
      return;
    }
    let valid = false;
    try {
      const records = await dns.resolveTxt(doc.domain);
      const flat = records.flat();
      valid = flat.some((r) => r.includes(doc.verificationToken));
    } catch {
      valid = false;
    }
    if (valid) {
      doc.status = 'verified';
      doc.failureCount = 0;
      await doc.save();
    } else {
      doc.failureCount = (doc.failureCount || 0) + 1;
      await doc.save();
    }
    res.json({ success: true, status: doc.status, checkResult: { txtRecordValid: valid } });
  }
);

router.post(
  '/remove',
  body('domainId').isString().notEmpty(),
  body('tenantId').isString().notEmpty(),
  async (req: Request, res: Response) => {
    const { domainId, tenantId } = req.body;
    if (tenantId !== req.tenantId) {
      res.status(403).json({ success: false, error: 'Tenant mismatch' });
      return;
    }
    await Domain.deleteOne({ _id: domainId, tenantId });
    res.json({ success: true });
  }
);

router.get('/status', query('domainId').isString().notEmpty(), query('tenantId').isString().notEmpty(), async (req: Request, res: Response) => {
  const domainId = req.query.domainId as string;
  const tenantId = req.query.tenantId as string;
  if (tenantId !== req.tenantId) {
    res.status(403).json({ success: false, error: 'Tenant mismatch' });
    return;
  }
  const doc = await Domain.findOne({ _id: domainId, tenantId }).lean();
  if (!doc) {
    res.status(404).json({ success: false, error: 'Domain not found' });
    return;
  }
  res.json({ success: true, domain: doc });
});

router.get('/list', query('tenantId').isString().notEmpty(), async (req: Request, res: Response) => {
  const tenantId = req.query.tenantId as string;
  if (tenantId !== req.tenantId) {
    res.status(403).json({ success: false, error: 'Tenant mismatch' });
    return;
  }
  const domains = await Domain.find({ tenantId }).lean();
  res.json({ success: true, domains });
});

export default router;
