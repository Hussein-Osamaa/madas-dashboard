/**
 * Finance event consumers.
 *
 * Subscribes to platform events (order, shipment, COD, return)
 * and creates finance records. Finance is a CONSUMER only —
 * it reads from StorefrontOrder but never writes to it.
 */

import { eventBus } from '../platform-core/event-bus.service';
import { financeService } from './finance.service';
import { shouldRecognizeRevenue, RevenuePolicy } from './revenue-policy';
import { StorefrontOrder } from '../../schemas/storefront-order.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('finance-events');

export function registerFinanceEventHandlers(): void {
  /* ── order.confirmed -> create receivable ───────────────────── */
  eventBus.subscribe('order.confirmed', async (event) => {
    const { orderId, tenantId, businessId, total } = event.payload as Record<string, unknown>;
    if (!orderId || !tenantId) {
      log.warn('order.confirmed missing required fields', { orderId: String(orderId) });
      return;
    }

    // Load order to get revenuePolicy snapshot + currency
    const order = await StorefrontOrder.findOne({
      orderId: String(orderId),
      tenantId: String(tenantId),
    }).lean();

    if (!order) {
      log.warn('Order not found for receivable creation', { orderId: String(orderId) });
      return;
    }

    const orderAny = order as Record<string, unknown>;
    const policy = (orderAny.revenuePolicy as Record<string, unknown>) || {
      recognitionPoint: order.paymentMethod === 'cod' ? 'cod_collection' : 'shipment',
      policyVersion: 1,
    };
    const currency = order.currency || 'SAR';
    const amount = order.total || (total as number) || 0;

    await financeService.createReceivable(
      String(tenantId),
      String(businessId || order.businessId),
      String(orderId),
      amount,
      currency,
      policy,
      event.correlationId
    );

    log.info('Receivable created for confirmed order', {
      orderId: String(orderId),
      tenantId: String(tenantId),
      amount: String(amount),
    });
  });

  /* ── order.cancelled -> void receivable ─────────────────────── */
  eventBus.subscribe('order.cancelled', async (event) => {
    const { orderId, tenantId } = event.payload as Record<string, unknown>;
    if (!orderId || !tenantId) return;

    await financeService.voidReceivable(
      String(tenantId),
      String(orderId),
      'Order cancelled',
      event.correlationId
    );

    log.info('Receivable voided for cancelled order', {
      orderId: String(orderId),
      tenantId: String(tenantId),
    });
  });

  /* ── shipment.picked_up -> recognize revenue (for prepaid) ──── */
  eventBus.subscribe('shipment.picked_up', async (event) => {
    const { orderId, tenantId } = event.payload as Record<string, unknown>;
    if (!orderId || !tenantId) return;

    const order = await StorefrontOrder.findOne({
      orderId: String(orderId),
      tenantId: String(tenantId),
    }).lean();

    if (!order) {
      log.warn('Order not found for shipment revenue check', { orderId: String(orderId) });
      return;
    }

    const orderAny = order as Record<string, unknown>;
    const policy: RevenuePolicy = (orderAny.revenuePolicy as RevenuePolicy) || {
      recognitionPoint: 'shipment',
      policyVersion: 1,
      appliedAt: new Date().toISOString(),
    };
    const paymentMethod = order.paymentMethod || '';
    const paymentStatus = order.paymentStatus || '';

    if (shouldRecognizeRevenue(policy, paymentMethod, 'shipment', paymentStatus)) {
      await financeService.recognizeRevenue(String(tenantId), String(orderId), event.correlationId);
      log.info('Revenue recognized on shipment', {
        orderId: String(orderId),
        tenantId: String(tenantId),
        paymentMethod,
      });
    }
  });

  /* ── cod.collected -> record COD receipt + recognize revenue ── */
  eventBus.subscribe('cod.collected', async (event) => {
    const { orderId, tenantId, amount, currency, shipmentId } = event.payload as Record<string, unknown>;
    if (!orderId || !tenantId) return;

    await financeService.recordCodCollection(
      String(tenantId),
      String(shipmentId || orderId),
      Number(amount) || 0,
      String(currency || 'SAR'),
      event.correlationId
    );

    await financeService.recognizeRevenue(String(tenantId), String(orderId), event.correlationId);

    log.info('COD collected and revenue recognized', {
      orderId: String(orderId),
      tenantId: String(tenantId),
      amount: String(amount),
    });
  });

  /* ── return.resolved -> record refund or credit note ─────────── */
  eventBus.subscribe('return.resolved', async (event) => {
    const { returnId, orderId, tenantId, businessId, resolution, amount, currency } =
      event.payload as Record<string, unknown>;
    if (!returnId || !orderId || !tenantId) return;

    const resolvedAmount = Number(amount) || 0;
    if (resolvedAmount <= 0) return;

    if (resolution === 'refund') {
      await financeService.recordRefund(
        String(tenantId),
        String(orderId),
        resolvedAmount,
        String(returnId),
        event.correlationId
      );
    } else if (resolution === 'store_credit') {
      await financeService.issueCreditNote(
        String(tenantId),
        String(businessId || ''),
        String(returnId),
        String(orderId),
        resolvedAmount,
        String(currency || 'SAR'),
        'Return store credit'
      );
    }

    log.info('Return resolved in finance', {
      returnId: String(returnId),
      orderId: String(orderId),
      resolution: String(resolution),
      amount: String(resolvedAmount),
    });
  });

  /* ── tenant.plan_changed -> subscription update (foundation) ── */
  eventBus.subscribe('tenant.plan_changed', async (event) => {
    const { tenantId, newPlan } = event.payload as Record<string, unknown>;
    // Foundation: log for now. Full subscription billing in later phase.
    log.info('Tenant plan changed - subscription update pending', {
      tenantId: String(tenantId),
      newPlan: String(newPlan),
    });
  });

  log.info('Finance event handlers registered');
}
