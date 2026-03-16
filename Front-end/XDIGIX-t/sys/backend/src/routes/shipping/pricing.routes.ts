/**
 * Pricing configuration routes: Weight Brackets, SLA Rules, COD Rules, Pricing Config
 * Also exposes POST /calculate for live price quotes.
 */
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { WeightBracket } from '../../schemas/shipping/weight-bracket.schema';
import { SLARule }       from '../../schemas/shipping/sla-rule.schema';
import { CODRule }       from '../../schemas/shipping/cod-rule.schema';
import { PricingConfig } from '../../schemas/shipping/pricing-config.schema';
import { calculateShippingPrice } from '../../modules/shipping/services/pricing-engine.service';

const router = Router();
const validate = (req: Request, res: Response, next: import('express').NextFunction) => {
  const { validationResult } = require('express-validator');
  const errs = validationResult(req);
  if (!errs.isEmpty()) { res.status(400).json({ error: errs.array()[0]?.msg }); return; }
  next();
};

// ── Price Calculator ───────────────────────────────────────────────────────────
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const breakdown = await calculateShippingPrice(req.body);
    res.json({ breakdown });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

// ── Pricing Config (singleton) ─────────────────────────────────────────────────
router.get('/config', async (_req, res: Response) => {
  let cfg = await PricingConfig.findOne().lean();
  if (!cfg) cfg = await PricingConfig.create({});
  res.json({ config: cfg });
});

router.put('/config',
  [body('basePrice').optional().isNumeric(), body('volumetricDivisor').optional().isNumeric()],
  validate,
  async (req: Request, res: Response) => {
    try {
      let cfg = await PricingConfig.findOne();
      if (!cfg) cfg = new PricingConfig();
      Object.assign(cfg, req.body);
      await cfg.save();
      res.json({ config: cfg });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

// ── Weight Brackets ────────────────────────────────────────────────────────────
router.get('/weight-brackets', async (_req, res: Response) => {
  const brackets = await WeightBracket.find({ isActive: true }).sort({ minWeight: 1 }).lean();
  res.json({ brackets });
});

router.post('/weight-brackets',
  [body('minWeight').isNumeric(), body('maxWeight').isNumeric(), body('extraPrice').isNumeric()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const bracket = await WeightBracket.create(req.body);
      res.status(201).json({ bracket });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

router.patch('/weight-brackets/:id', async (req: Request, res: Response) => {
  try {
    const bracket = await WeightBracket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bracket) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ bracket });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.delete('/weight-brackets/:id', async (req: Request, res: Response) => {
  await WeightBracket.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── SLA Rules ──────────────────────────────────────────────────────────────────
router.get('/sla-rules', async (_req, res: Response) => {
  const rules = await SLARule.find({ isActive: true }).sort({ priority: 1 }).lean();
  res.json({ rules });
});

router.post('/sla-rules',
  [body('name').isString().notEmpty(), body('maxDeliveryHours').isInt({ min: 1 }), body('price').isNumeric()],
  validate,
  async (req: Request, res: Response) => {
    try {
      const rule = await SLARule.create(req.body);
      res.status(201).json({ rule });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

router.patch('/sla-rules/:id', async (req: Request, res: Response) => {
  try {
    const rule = await SLARule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ rule });
  } catch (err) { res.status(500).json({ error: (err as Error).message }); }
});

router.delete('/sla-rules/:id', async (req: Request, res: Response) => {
  await SLARule.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ── COD Rules (singleton) ──────────────────────────────────────────────────────
router.get('/cod-rules', async (_req, res: Response) => {
  let rule = await CODRule.findOne().lean();
  if (!rule) rule = await CODRule.create({});
  res.json({ rule });
});

router.put('/cod-rules',
  [body('percentageFee').optional().isNumeric(), body('minimumFee').optional().isNumeric()],
  validate,
  async (req: Request, res: Response) => {
    try {
      let rule = await CODRule.findOne();
      if (!rule) rule = new CODRule();
      Object.assign(rule, req.body);
      await rule.save();
      res.json({ rule });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

export default router;
