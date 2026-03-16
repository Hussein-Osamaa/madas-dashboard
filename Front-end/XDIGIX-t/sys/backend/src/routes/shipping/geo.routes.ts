/**
 * Geographic data routes: Countries, Cities, Zones
 * Admin: full CRUD  |  Authenticated: read-only
 */
import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { Country } from '../../schemas/shipping/country.schema';
import { City }    from '../../schemas/shipping/city.schema';
import { Zone }    from '../../schemas/shipping/zone.schema';

const router = Router();

const validate = (req: Request, res: Response, next: import('express').NextFunction) => {
  const { validationResult } = require('express-validator');
  const errs = validationResult(req);
  if (!errs.isEmpty()) { res.status(400).json({ error: errs.array()[0]?.msg, details: errs.array() }); return; }
  next();
};

// ── Countries ──────────────────────────────────────────────────────────────────
router.get('/countries', async (_req, res: Response) => {
  const countries = await Country.find().sort({ name: 1 }).lean();
  res.json({ countries });
});

router.post('/countries',
  [body('code').isString().isLength({ min: 2, max: 3 }).notEmpty(),
   body('name').isString().notEmpty(),
   body('currency').isString().notEmpty(),
   body('timezone').isString().notEmpty()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const country = await Country.create(req.body);
      res.status(201).json({ country });
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 11000) { res.status(409).json({ error: 'Country code already exists' }); return; }
      res.status(500).json({ error: e.message });
    }
  });

router.patch('/countries/:id',
  [param('id').isString()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const country = await Country.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!country) { res.status(404).json({ error: 'Not found' }); return; }
      res.json({ country });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

router.delete('/countries/:id', async (req: Request, res: Response) => {
  await Country.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── Cities ─────────────────────────────────────────────────────────────────────
router.get('/cities', async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.countryCode) filter.countryCode = req.query.countryCode;
  const cities = await City.find(filter).sort({ name: 1 }).lean();
  res.json({ cities });
});

router.post('/cities',
  [body('countryCode').isString().notEmpty(), body('name').isString().notEmpty()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const city = await City.create(req.body);
      res.status(201).json({ city });
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 11000) { res.status(409).json({ error: 'City already exists in this country' }); return; }
      res.status(500).json({ error: e.message });
    }
  });

router.patch('/cities/:id', async (req: Request, res: Response) => {
  try {
    const city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!city) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ city });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.delete('/cities/:id', async (req: Request, res: Response) => {
  await City.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── Zones ──────────────────────────────────────────────────────────────────────
router.get('/zones', async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.cityId) filter.cityId = req.query.cityId;
  const zones = await Zone.find(filter).sort({ zoneName: 1 }).lean();
  res.json({ zones });
});

router.post('/zones',
  [body('cityId').isString().notEmpty(), body('zoneName').isString().notEmpty()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const zone = await Zone.create(req.body);
      res.status(201).json({ zone });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

router.patch('/zones/:id', async (req: Request, res: Response) => {
  try {
    const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!zone) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ zone });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.delete('/zones/:id', async (req: Request, res: Response) => {
  await Zone.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
