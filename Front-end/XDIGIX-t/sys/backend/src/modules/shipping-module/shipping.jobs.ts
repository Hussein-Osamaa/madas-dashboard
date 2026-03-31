/**
 * Shipping background jobs.
 */

import { createLogger } from '../../lib/logger';
import { Shipment } from './shipment.schema';
import { Carrier } from './carrier.schema';

const log = createLogger('shipping-jobs');

/**
 * Poll carriers that don't support webhooks for tracking updates.
 * Foundation stub — to be implemented with actual carrier API integrations.
 */
export async function pollCarrierTracking(): Promise<number> {
  // Find carriers that do not support webhooks
  const carriers = await Carrier.find({ supportsWebhook: false, status: 'active' }).lean();
  if (carriers.length === 0) return 0;

  const carrierIds = carriers.map((c) => c.carrierId);

  // Find active shipments assigned to these carriers
  const shipments = await Shipment.find({
    carrierId: { $in: carrierIds },
    status: { $in: ['carrier_booked', 'picked_up', 'in_transit', 'out_for_delivery'] },
  }).lean();

  if (shipments.length === 0) return 0;

  log.info(`Polling tracking for ${shipments.length} shipments across ${carriers.length} non-webhook carriers`);

  // Stub: In production, iterate shipments and call carrier API for tracking updates
  // For each update, call shippingService.updateTracking(...)
  let processed = 0;
  for (const shipment of shipments) {
    try {
      // TODO: Call carrier-specific API to get tracking status
      // const carrierStatus = await carrierApi.getTracking(shipment.trackingNumber);
      // if (carrierStatus !== shipment.status) {
      //   await shippingService.updateTracking(shipment.shipmentId, carrierStatus, { rawData: carrierResponse }, 'poll');
      // }
      processed++;
    } catch (err) {
      log.error(`Failed to poll tracking for shipment ${shipment.shipmentId}`, {
        error: (err as Error).message,
        tenantId: shipment.tenantId,
      });
    }
  }

  return processed;
}

/**
 * Process failed delivery retries.
 * Find shipments with status=failed_delivery that still have retries left,
 * and schedule them for re-delivery (set status back to out_for_delivery).
 */
export async function processFailedDeliveryRetries(): Promise<number> {
  let processed = 0;
  let done = false;

  while (!done) {
    // Atomic claim: only one worker processes each shipment
    const claimed = await Shipment.findOneAndUpdate(
      {
        status: 'failed_delivery',
        $expr: { $lt: ['$retryCount', '$maxRetries'] },
      },
      {
        $set: { status: 'out_for_delivery' },
        $inc: { retryCount: 1 },
      },
      { new: true },
    );
    if (!claimed) { done = true; break; }

    try {
      log.info(`Retry scheduled: shipment ${claimed.shipmentId}, attempt ${claimed.retryCount}/${claimed.maxRetries}`, {
        tenantId: claimed.tenantId,
      });
      processed++;
    } catch (err) {
      log.error(`Failed to schedule retry for shipment ${claimed.shipmentId}`, {
        error: (err as Error).message,
        tenantId: claimed.tenantId,
      });
    }
  }

  if (processed > 0) {
    log.info(`Processed ${processed} failed delivery retries`);
  }

  return processed;
}
