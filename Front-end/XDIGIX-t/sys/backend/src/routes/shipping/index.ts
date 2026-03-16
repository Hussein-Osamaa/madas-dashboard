/**
 * Shipping Module — main router
 * Mounted at /api/shipping
 *
 * Sub-routes:
 *   /shipping/geo            — countries, cities, zones
 *   /shipping/pricing        — weight brackets, SLA, COD, config, calculator
 *   /shipping/couriers       — courier CRUD
 *   /shipping/shipments      — shipment CRUD + tracking
 *   /shipping/warehouse-bins — bin management + scanning
 *   /shipping/analytics      — analytics & reports
 *   /shipping/wallet         — merchant wallet, transactions, cashouts
 */
import { Router } from 'express';
import geoRoutes           from './geo.routes';
import pricingRoutes       from './pricing.routes';
import couriersRoutes      from './couriers.routes';
import shipmentsRoutes     from './shipments.routes';
import warehouseBinsRoutes from './warehouse-bins.routes';
import analyticsRoutes     from './analytics.routes';
import walletRoutes        from './wallet.routes';

const router = Router();

// Public: tracking by tracking number (no auth required)
// Proxied from /api/shipping/track/:trackingNumber via shipmentsRoutes
router.use('/geo',            geoRoutes);
router.use('/pricing',        pricingRoutes);
router.use('/couriers',       couriersRoutes);
router.use('/shipments',      shipmentsRoutes);
router.use('/warehouse-bins', warehouseBinsRoutes);
router.use('/analytics',      analyticsRoutes);
router.use('/wallet',         walletRoutes);

// Seed Egypt data if not present
router.post('/seed/egypt', async (_req, res) => {
  try {
    const { Country } = await import('../../schemas/shipping/country.schema');
    const { City }    = await import('../../schemas/shipping/city.schema');
    const { Zone }    = await import('../../schemas/shipping/zone.schema');
    const { WeightBracket } = await import('../../schemas/shipping/weight-bracket.schema');
    const { SLARule }       = await import('../../schemas/shipping/sla-rule.schema');
    const { CODRule }       = await import('../../schemas/shipping/cod-rule.schema');
    const { PricingConfig } = await import('../../schemas/shipping/pricing-config.schema');

    // Country
    await Country.findOneAndUpdate(
      { code: 'EG' },
      { code: 'EG', name: 'Egypt', currency: 'EGP', timezone: 'Africa/Cairo', weightUnit: 'kg', isActive: true },
      { upsert: true }
    );

    // Core cities
    const citiesData = [
      { countryCode: 'EG', name: 'Cairo',      nameAr: 'القاهرة' },
      { countryCode: 'EG', name: 'Giza',        nameAr: 'الجيزة' },
      { countryCode: 'EG', name: 'Alexandria',  nameAr: 'الإسكندرية' },
      { countryCode: 'EG', name: 'Qalyubia',    nameAr: 'القليوبية' },
    ];
    for (const c of citiesData) {
      await City.findOneAndUpdate({ countryCode: c.countryCode, name: c.name }, c, { upsert: true });
    }

    const cairo = await City.findOne({ countryCode: 'EG', name: 'Cairo' }).lean();
    const giza  = await City.findOne({ countryCode: 'EG', name: 'Giza'  }).lean();

    if (cairo) {
      const cairoZones = [
        { cityId: cairo._id.toString(), zoneName: 'Nasr City',     zoneCode: 'NC', isRemote: false, extraFee: 0,  deliverySLADays: 1 },
        { cityId: cairo._id.toString(), zoneName: 'Maadi',         zoneCode: 'MD', isRemote: false, extraFee: 0,  deliverySLADays: 1 },
        { cityId: cairo._id.toString(), zoneName: 'New Cairo',     zoneCode: 'NC2',isRemote: false, extraFee: 10, deliverySLADays: 1 },
        { cityId: cairo._id.toString(), zoneName: 'Heliopolis',    zoneCode: 'HP', isRemote: false, extraFee: 0,  deliverySLADays: 1 },
        { cityId: cairo._id.toString(), zoneName: 'Downtown Cairo',zoneCode: 'DT', isRemote: false, extraFee: 0,  deliverySLADays: 1 },
      ];
      for (const z of cairoZones) await Zone.findOneAndUpdate({ cityId: z.cityId, zoneName: z.zoneName }, z, { upsert: true });
    }

    if (giza) {
      const gizaZones = [
        { cityId: giza._id.toString(), zoneName: 'Dokki',        zoneCode: 'DK', isRemote: false, extraFee: 0,  deliverySLADays: 1 },
        { cityId: giza._id.toString(), zoneName: 'Mohandessin',  zoneCode: 'MH', isRemote: false, extraFee: 0,  deliverySLADays: 1 },
        { cityId: giza._id.toString(), zoneName: '6th October',  zoneCode: 'SO', isRemote: false, extraFee: 15, deliverySLADays: 2 },
        { cityId: giza._id.toString(), zoneName: 'Sheikh Zayed', zoneCode: 'SZ', isRemote: false, extraFee: 15, deliverySLADays: 2 },
      ];
      for (const z of gizaZones) await Zone.findOneAndUpdate({ cityId: z.cityId, zoneName: z.zoneName }, z, { upsert: true });
    }

    // Weight brackets
    const brackets = [
      { minWeight: 0,  maxWeight: 1,  extraPrice: 0,  label: '0–1 kg' },
      { minWeight: 1,  maxWeight: 3,  extraPrice: 5,  label: '1–3 kg' },
      { minWeight: 3,  maxWeight: 5,  extraPrice: 10, label: '3–5 kg' },
      { minWeight: 5,  maxWeight: 10, extraPrice: 20, label: '5–10 kg' },
      { minWeight: 10, maxWeight: 20, extraPrice: 40, label: '10–20 kg' },
      { minWeight: 20, maxWeight: 999, extraPrice: 80, label: '20+ kg' },
    ];
    for (const b of brackets) await WeightBracket.findOneAndUpdate({ minWeight: b.minWeight, maxWeight: b.maxWeight }, b, { upsert: true });

    // SLA rules
    const slaRules = [
      { name: 'Same Day Super Fast', type: 'same_day_super_fast', maxDeliveryHours: 6,  price: 70, priority: 0 },
      { name: 'Same Day',            type: 'same_day',            maxDeliveryHours: 24, price: 45, priority: 1 },
      { name: 'Next Day',            type: 'next_day',            maxDeliveryHours: 48, price: 0,  priority: 2 },
      { name: '2–3 Days',            type: 'two_to_three_days',   maxDeliveryHours: 72, price: 0,  priority: 3 },
    ];
    for (const s of slaRules) await SLARule.findOneAndUpdate({ type: s.type }, s, { upsert: true });

    // COD rule
    await CODRule.findOneAndUpdate({}, { percentageFee: 1.5, minimumFee: 10, maximumFee: 50, threshold: 2000, thresholdExtraPercent: 1, enabled: true }, { upsert: true });

    // Pricing config
    await PricingConfig.findOneAndUpdate({}, { basePrice: 40, volumetricDivisor: 5000, currency: 'EGP' }, { upsert: true });

    res.json({ success: true, message: 'Egypt shipping data seeded' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
