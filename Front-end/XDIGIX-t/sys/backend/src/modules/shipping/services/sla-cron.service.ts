/**
 * SLA Breach Cron Service
 *
 * Runs periodically to detect shipments that have exceeded their SLA deadline
 * and auto-downgrade them to the fallback SLA (or just flag them).
 *
 * Also handles:
 * - Auto-transitioning stale "pickup_scheduled" shipments that were never picked up
 *
 * Called from the server startup (index.ts) using setInterval.
 * Set env SLA_CRON_INTERVAL_MS to override (default: 30 minutes).
 */

import { Shipment }  from '../../../schemas/shipping/shipment.schema';
import { SLARule }   from '../../../schemas/shipping/sla-rule.schema';
import { ShipmentEvent } from '../../../schemas/shipping/shipment-event.schema';
import { notifyShipmentStatusChange } from './notification.service';

const ACTIVE_STATUSES = [
  'pending', 'pickup_scheduled', 'picked_up',
  'in_warehouse', 'sorted', 'assigned_to_courier', 'out_for_delivery',
];

/**
 * SLA breach check: marks shipments that have exceeded their SLA as "sla_breached" in metadata
 * and falls back to a lower-priority SLA if configured.
 */
async function checkSLABreaches() {
  const now = new Date();

  // Get all SLA rules with maxDeliveryHours defined
  const slaRules = await SLARule.find({ isActive: { $ne: false } }).lean();
  const slaMap = new Map(slaRules.map(r => [r._id.toString(), r]));

  // Find active shipments that have an SLA set, not yet breached
  const shipments = await Shipment.find({
    status: { $in: ACTIVE_STATUSES },
    slaId: { $exists: true, $ne: null },
    slaBreached: { $ne: true },
  }).select('_id trackingNumber merchantId slaId createdAt recipientName recipientEmail status').lean();

  for (const s of shipments) {
    const sla = slaMap.get(String(s.slaId));
    if (!sla?.maxDeliveryHours) continue;

    const deadline = new Date(s.createdAt as Date);
    deadline.setHours(deadline.getHours() + sla.maxDeliveryHours);

    if (now > deadline) {
      // SLA breached — mark it
      await Shipment.updateOne({ _id: s._id }, { $set: { slaBreached: true } });

      await ShipmentEvent.create({
        shipmentId: s._id.toString(),
        trackingNumber: s.trackingNumber,
        eventType: 'NOTE_ADDED',
        description: `SLA breached — exceeded ${sla.maxDeliveryHours}h window (${sla.name ?? sla.type})`,
        performedBy: 'system',
        performedByRole: 'system',
        timestamp: now,
      });

      console.log(`[SLA Cron] Breach flagged: ${s.trackingNumber} (SLA: ${sla.type}, deadline was ${deadline.toISOString()})`);

      // Fallback SLA: if this SLA has a fallbackSLAId, update to lower-tier
      if (sla.fallbackSLAId) {
        await Shipment.updateOne({ _id: s._id }, { $set: { slaId: sla.fallbackSLAId } });
      }
    }
  }
}

/**
 * Auto-cancel stale "pending" shipments not picked up within 48h (configurable).
 */
async function cancelStalePickups() {
  const cutoffHours = Number(process.env.STALE_PICKUP_HOURS ?? 48);
  const cutoff = new Date(Date.now() - cutoffHours * 60 * 60 * 1000);

  const stale = await Shipment.find({
    status: 'pending',
    createdAt: { $lt: cutoff },
  }).select('_id trackingNumber merchantId recipientName recipientEmail').lean();

  for (const s of stale) {
    await Shipment.updateOne({ _id: s._id }, { $set: { status: 'cancelled' } });

    await ShipmentEvent.create({
      shipmentId: s._id.toString(),
      trackingNumber: s.trackingNumber,
      eventType: 'CANCELLED',
      description: `Auto-cancelled after ${cutoffHours}h without pickup`,
      performedBy: 'system',
      performedByRole: 'system',
      timestamp: new Date(),
    });

    notifyShipmentStatusChange({
      trackingNumber: s.trackingNumber,
      newStatus: 'cancelled',
      recipientName: s.recipientName as string,
      recipientEmail: s.recipientEmail as string | undefined,
    }).catch(() => {/* non-critical */});

    console.log(`[SLA Cron] Auto-cancelled stale: ${s.trackingNumber}`);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

let _started = false;

export function startShippingCron() {
  if (_started) return;
  _started = true;

  const intervalMs = Number(process.env.SLA_CRON_INTERVAL_MS ?? 30 * 60 * 1000); // 30 min default

  const tick = async () => {
    try {
      await checkSLABreaches();
      await cancelStalePickups();
    } catch (err) {
      console.error('[SLA Cron] Error:', err);
    }
  };

  // Run once on startup (after 10s delay to let DB connect)
  setTimeout(tick, 10_000);

  setInterval(tick, intervalMs);
  console.log(`[SLA Cron] Started (interval: ${intervalMs / 60000}min)`);
}
