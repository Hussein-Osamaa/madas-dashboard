/**
 * Fulfillment event handlers.
 *
 * Subscribes to platform events and triggers fulfillment workflows.
 * - order.confirmed  -> create fulfillment job
 * - order.cancelled  -> cancel unstarted fulfillment job
 * - return.approved  -> log readiness for receiving
 */

import { eventBus } from '../platform-core/event-bus.service';
import { createLogger } from '../../lib/logger';
import { fulfillmentService } from './fulfillment.service';
import { FulfillmentJob } from './fulfillment-job.schema';
import StorefrontOrder from '../../schemas/storefront-order.schema';

const log = createLogger('fulfillment');

export function registerFulfillmentEventHandlers(): void {
  /* ── order.confirmed -> create fulfillment job ────────────── */
  eventBus.subscribe('order.confirmed', async (event) => {
    const { orderId, tenantId, businessId } = event.payload as {
      orderId: string;
      tenantId: string;
      businessId: string;
    };

    // Load order to get line items
    const order = await StorefrontOrder.findOne({ orderId, tenantId }).lean();
    if (!order) {
      log.warn('order.confirmed received but order not found', { orderId, tenantId });
      return;
    }

    const items = ((order as any).items || []).map((item: any, i: number) => ({
      lineItemIndex: i,
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      qty: item.quantity,
      pickedQty: 0,
      packedQty: 0,
      shortQty: 0,
    }));

    await fulfillmentService.createJob(tenantId, businessId, orderId, items);
    log.info('Fulfillment job created for confirmed order', { orderId, tenantId });
  });

  /* ── order.cancelled -> cancel unstarted job ──────────────── */
  eventBus.subscribe('order.cancelled', async (event) => {
    const { orderId, tenantId } = event.payload as {
      orderId: string;
      tenantId: string;
    };

    const job = await FulfillmentJob.findOne({
      orderId,
      tenantId,
      status: { $in: ['created', 'picking'] },
    });

    if (job) {
      await fulfillmentService.cancelJob(
        job.fulfillmentJobId,
        'Order cancelled',
        'system',
        event.correlationId ?? undefined,
      );
      log.info('Fulfillment job cancelled due to order cancellation', {
        orderId,
        fulfillmentJobId: job.fulfillmentJobId,
      });
    }
  });

  /* ── return.approved -> log readiness ─────────────────────── */
  eventBus.subscribe('return.approved', async (event) => {
    const { returnId, orderId, tenantId } = event.payload as {
      returnId: string;
      orderId: string;
      tenantId: string;
    };
    log.info('Return approved — warehouse ready for receiving', { returnId, orderId, tenantId });
  });

  log.info('Fulfillment event handlers registered');
}
