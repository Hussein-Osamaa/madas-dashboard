/**
 * Finance background jobs.
 *
 * These are called on interval from app.ts (same pattern as inventory/orders jobs).
 */

import { Invoice } from './invoice.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('finance-jobs');

/**
 * Check for issued invoices past their due date and mark them overdue.
 * Returns the count of invoices transitioned to overdue.
 */
export async function checkOverdueInvoices(): Promise<number> {
  const now = new Date();

  const result = await Invoice.updateMany(
    {
      status: 'issued',
      dueDate: { $lt: now, $ne: null },
    },
    {
      $set: { status: 'overdue' },
    }
  );

  const count = result.modifiedCount || 0;
  if (count > 0) {
    log.info(`Marked ${count} invoices as overdue`);
  }

  return count;
}

/**
 * Subscription renewal check (foundation stub).
 * In future phases, this will:
 * - Find subscriptions where currentPeriodEnd < now
 * - Generate renewal invoices
 * - Update subscription periods
 */
export async function checkSubscriptionRenewals(): Promise<number> {
  // Foundation stub — full implementation in subscription billing phase
  log.debug('Subscription renewal check ran (stub)');
  return 0;
}

/**
 * COD reconciliation reminder (foundation stub).
 * In future phases, this will:
 * - Find COD receipts without matching reconciliation
 * - Flag unreconciled periods
 * - Send notifications to finance team
 */
export async function checkCodReconciliation(): Promise<number> {
  // Foundation stub — full implementation in reconciliation phase
  log.debug('COD reconciliation check ran (stub)');
  return 0;
}
