/**
 * Revenue recognition policy resolver.
 *
 * Determines WHEN revenue should be recognized based on payment method
 * and the event that triggered the check. Uses the order's revenuePolicy
 * snapshot (rule 33) — not the tenant's current policy.
 */

/* ── Types ──────────────────────────────────────────────────────── */

export interface RevenuePolicy {
  recognitionPoint: 'shipment' | 'delivery' | 'cod_collection' | 'payment_confirmation';
  policyVersion: number;
  appliedAt: string;
}

export type RevenueEvent = 'shipment' | 'cod_collected' | 'payment_confirmed' | 'delivery';

/* ── Default Policy ─────────────────────────────────────────────── */

export const DEFAULT_REVENUE_POLICY: RevenuePolicy = {
  recognitionPoint: 'shipment',
  policyVersion: 1,
  appliedAt: new Date().toISOString(),
};

/* ── Revenue Recognition Logic ──────────────────────────────────── */

/**
 * Determine if revenue should be recognized for a given event.
 *
 * Rules (per architectural contract):
 * - Stripe/prepaid (card): recognize on shipment (payment already received)
 * - COD: recognize on cod.collected
 * - Manual (instapay, vodafone_cash, bank_transfer):
 *     recognize on LATER of payment_confirmation and shipment
 *
 * @param _policy       - Revenue policy snapshot from the order (reserved for future versioned logic)
 * @param paymentMethod - Payment method used for the order
 * @param event         - The event that just occurred
 * @param paymentStatus - Current payment status of the order
 * @returns true if revenue should be recognized now
 */
export function shouldRecognizeRevenue(
  _policy: RevenuePolicy,
  paymentMethod: string,
  event: RevenueEvent,
  paymentStatus: string
): boolean {
  switch (paymentMethod) {
    case 'stripe':
    case 'card':
    case 'paymob':
    case 'fawry':
      // Prepaid: recognize on shipment if payment received
      return event === 'shipment' && paymentStatus === 'paid';

    case 'cod':
      // COD: recognize on cash collection
      return event === 'cod_collected';

    case 'instapay':
    case 'vodafone_cash':
    case 'bank_transfer':
      // Manual: recognize on shipment IF payment already confirmed
      if (event === 'shipment' && paymentStatus === 'paid') return true;
      // Or recognize on payment confirmation IF already shipped
      // (caller checks shipped status separately)
      if (event === 'payment_confirmed') return true;
      return false;

    default:
      // Default to shipment-based recognition
      return event === 'shipment' && paymentStatus === 'paid';
  }
}
