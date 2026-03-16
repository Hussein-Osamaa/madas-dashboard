/**
 * Shipping Pricing Engine
 *
 * Formula:
 *   shipping_price = base_price + weight_fee + zone_fee + remote_area_fee + SLA_fee + COD_fee + packaging_fee + insurance_fee
 */
import { Zone } from '../../../schemas/shipping/zone.schema';
import { WeightBracket } from '../../../schemas/shipping/weight-bracket.schema';
import { SLARule } from '../../../schemas/shipping/sla-rule.schema';
import { CODRule } from '../../../schemas/shipping/cod-rule.schema';
import { PricingConfig } from '../../../schemas/shipping/pricing-config.schema';

export interface PriceInput {
  actualWeight: number;     // kg
  length?: number;          // cm
  width?: number;           // cm
  height?: number;          // cm
  zoneId?: string;
  slaId?: string;
  codAmount?: number;
  includePackaging?: boolean;
  declaredValue?: number;   // for insurance
}

export interface PriceBreakdown {
  basePrice: number;
  weightFee: number;
  volumetricWeight: number;
  chargeableWeight: number;
  zoneFee: number;
  remoteAreaFee: number;
  slaFee: number;
  codFee: number;
  packagingFee: number;
  insuranceFee: number;
  fuelSurcharge: number;
  total: number;
  currency: string;
  merchantReceives: number;  // codAmount - total fees
}

export async function calculateShippingPrice(input: PriceInput): Promise<PriceBreakdown> {
  const [config, codRule] = await Promise.all([
    PricingConfig.findOne().lean(),
    CODRule.findOne({ enabled: true }).lean(),
  ]);

  const basePrice = config?.basePrice ?? 40;
  const divisor   = config?.volumetricDivisor ?? 5000;
  const currency  = config?.currency ?? 'EGP';

  // 1. Volumetric weight
  let volumetricWeight = 0;
  if (input.length && input.width && input.height) {
    volumetricWeight = (input.length * input.width * input.height) / divisor;
  }
  const chargeableWeight = Math.max(input.actualWeight, volumetricWeight);

  // 2. Weight bracket fee
  const brackets = await WeightBracket.find({ isActive: true }).sort({ minWeight: 1 }).lean();
  let weightFee = 0;
  for (const b of brackets) {
    if (chargeableWeight >= b.minWeight && chargeableWeight < b.maxWeight) {
      weightFee = b.extraPrice;
      break;
    }
  }

  // 3. Zone fee + remote fee
  let zoneFee = 0;
  let remoteAreaFee = 0;
  if (input.zoneId) {
    const zone = await Zone.findById(input.zoneId).lean();
    if (zone) {
      zoneFee = zone.extraFee ?? 0;
      if (zone.isRemote) {
        remoteAreaFee = zone.extraFee;
        zoneFee = 0; // already counted as remote
      }
    }
  }

  // 4. SLA fee
  let slaFee = 0;
  if (input.slaId) {
    const sla = await SLARule.findById(input.slaId).lean();
    if (sla) slaFee = sla.price;
  }

  // 5. COD fee
  let codFee = 0;
  const codAmount = input.codAmount ?? 0;
  if (codAmount > 0 && codRule) {
    let raw = (codAmount * codRule.percentageFee) / 100;
    // Extra % above threshold
    if (codAmount > codRule.threshold) {
      raw += ((codAmount - codRule.threshold) * codRule.thresholdExtraPercent) / 100;
    }
    codFee = Math.min(Math.max(raw, codRule.minimumFee), codRule.maximumFee);
  }

  // 6. Packaging
  const packagingFee = input.includePackaging ? (config?.packagingFee ?? 0) : 0;

  // 7. Insurance
  const declaredValue = input.declaredValue ?? 0;
  const insuranceFee = declaredValue > 0
    ? (declaredValue * (config?.insuranceFeePercent ?? 0)) / 100
    : 0;

  // 8. Fuel surcharge
  const subtotal = basePrice + weightFee + zoneFee + remoteAreaFee + slaFee + packagingFee + insuranceFee;
  const fuelSurcharge = (subtotal * (config?.fuelSurchargePercent ?? 0)) / 100;

  const total = subtotal + fuelSurcharge + codFee;
  const merchantReceives = codAmount - total;

  return {
    basePrice,
    weightFee,
    volumetricWeight: Math.round(volumetricWeight * 100) / 100,
    chargeableWeight: Math.round(chargeableWeight * 100) / 100,
    zoneFee,
    remoteAreaFee,
    slaFee,
    codFee: Math.round(codFee * 100) / 100,
    packagingFee,
    insuranceFee: Math.round(insuranceFee * 100) / 100,
    fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency,
    merchantReceives: Math.round(merchantReceives * 100) / 100,
  };
}
