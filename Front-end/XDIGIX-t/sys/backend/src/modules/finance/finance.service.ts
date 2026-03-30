import { LedgerEntry, ILedgerEntry, LedgerEntryType, LedgerEntryStatus } from './ledger-entry.schema';
import { Invoice, IInvoice, generateInvoiceNumber, IInvoiceItem } from './invoice.schema';
import { CreditNote, generateCreditNoteNumber } from './credit-note.schema';
import { Reconciliation } from './reconciliation.schema';
import { Subscription } from './subscription.schema';
import { eventBus } from '../platform-core/event-bus.service';
import { auditService } from '../platform-core/audit.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('finance');

/* ── Finance Service ────────────────────────────────────────────── */

export const financeService = {
  /* ── Ledger Operations ──────────────────────────────────────── */

  /**
   * Create a revenue receivable entry when an order is confirmed.
   * For COD orders: status=pending (not yet accrued until shipped).
   * For prepaid orders: status=accrued (payment already received).
   */
  async createReceivable(
    tenantId: string,
    businessId: string,
    orderId: string,
    amount: number,
    currency: string,
    revenuePolicy: Record<string, unknown>,
    correlationId?: string
  ): Promise<ILedgerEntry> {
    const isCod = revenuePolicy?.recognitionPoint === 'cod_collection';
    const entry = await LedgerEntry.create({
      tenantId,
      businessId,
      type: 'revenue_receivable' as LedgerEntryType,
      amount,
      currency,
      referenceType: 'order',
      referenceId: orderId,
      orderId,
      status: isCod ? 'pending' : ('accrued' as LedgerEntryStatus),
      revenuePolicy,
      correlationId,
    });
    log.info('Receivable created', { tenantId, orderId, amount: String(amount), status: entry.status });
    return entry;
  },

  /**
   * Recognize revenue for an order.
   * Finds the receivable ledger entry and updates status to recognized.
   */
  async recognizeRevenue(
    tenantId: string,
    orderId: string,
    correlationId?: string
  ): Promise<ILedgerEntry | null> {
    const entry = await LedgerEntry.findOneAndUpdate(
      {
        tenantId,
        orderId,
        type: 'revenue_receivable',
        status: { $in: ['pending', 'accrued'] },
      },
      { $set: { status: 'recognized' as LedgerEntryStatus } },
      { new: true }
    );

    if (!entry) {
      log.warn('No receivable found for revenue recognition', { tenantId, orderId });
      return null;
    }

    // Publish revenue.recognized event
    await eventBus.safePublish('revenue.recognized', {
      tenantId,
      orderId,
      amount: entry.amount,
      currency: entry.currency,
      entryId: entry._id?.toString(),
    }, { tenantId, correlationId });

    log.info('Revenue recognized', { tenantId, orderId, amount: String(entry.amount) });
    return entry;
  },

  /**
   * Record a payment received for an order.
   */
  async recordPayment(
    tenantId: string,
    orderId: string,
    amount: number,
    method: string,
    correlationId?: string
  ): Promise<ILedgerEntry> {
    // Look up the receivable to get businessId
    const receivable = await LedgerEntry.findOne({
      tenantId,
      orderId,
      type: 'revenue_receivable',
    }).lean();

    const businessId = receivable?.businessId || '';

    const entry = await LedgerEntry.create({
      tenantId,
      businessId,
      type: 'payment_received' as LedgerEntryType,
      amount,
      currency: receivable?.currency || 'SAR',
      referenceType: 'order',
      referenceId: orderId,
      orderId,
      status: 'recognized' as LedgerEntryStatus,
      details: { paymentMethod: method },
      correlationId,
    });

    log.info('Payment recorded', { tenantId, orderId, amount: String(amount), method });
    return entry;
  },

  /**
   * Record a refund for an order (creates a reversal entry).
   */
  async recordRefund(
    tenantId: string,
    orderId: string,
    amount: number,
    returnId?: string,
    correlationId?: string
  ): Promise<ILedgerEntry> {
    const receivable = await LedgerEntry.findOne({
      tenantId,
      orderId,
      type: 'revenue_receivable',
    }).lean();

    const businessId = receivable?.businessId || '';

    const entry = await LedgerEntry.create({
      tenantId,
      businessId,
      type: 'refund' as LedgerEntryType,
      amount,
      currency: receivable?.currency || 'SAR',
      referenceType: returnId ? 'return' : 'order',
      referenceId: returnId || orderId,
      orderId,
      status: 'reversed' as LedgerEntryStatus,
      details: { returnId },
      correlationId,
    });

    log.info('Refund recorded', { tenantId, orderId, amount: String(amount), returnId: returnId || 'none' });
    return entry;
  },

  /**
   * Void a receivable entry when an order is cancelled.
   */
  async voidReceivable(
    tenantId: string,
    orderId: string,
    reason: string,
    correlationId?: string
  ): Promise<ILedgerEntry | null> {
    const entry = await LedgerEntry.findOneAndUpdate(
      {
        tenantId,
        orderId,
        type: 'revenue_receivable',
        status: { $in: ['pending', 'accrued'] },
      },
      { $set: { status: 'voided' as LedgerEntryStatus } },
      { new: true }
    );

    if (!entry) {
      log.warn('No receivable found to void', { tenantId, orderId });
      return null;
    }

    await eventBus.safePublish('receivable.voided', {
      tenantId,
      orderId,
      amount: entry.amount,
      reason,
    }, { tenantId, correlationId });

    log.info('Receivable voided', { tenantId, orderId, reason });
    return entry;
  },

  /**
   * Record a COD cash collection from a shipment.
   */
  async recordCodCollection(
    tenantId: string,
    shipmentId: string,
    amount: number,
    currency: string,
    correlationId?: string
  ): Promise<ILedgerEntry> {
    const entry = await LedgerEntry.create({
      tenantId,
      businessId: '', // COD collections are shipment-level; businessId resolved later if needed
      type: 'cod_receipt' as LedgerEntryType,
      amount,
      currency: currency || 'SAR',
      referenceType: 'order',
      referenceId: shipmentId,
      status: 'recognized' as LedgerEntryStatus,
      details: { shipmentId },
      correlationId,
    });

    log.info('COD collection recorded', { tenantId, shipmentId, amount: String(amount) });
    return entry;
  },

  /* ── Invoice Operations ─────────────────────────────────────── */

  /**
   * Create a new invoice with auto-generated invoice number.
   */
  async createInvoice(
    tenantId: string,
    businessId: string,
    type: 'subscription' | 'manual' | 'adjustment',
    items: IInvoiceItem[],
    dueDate?: Date
  ): Promise<IInvoice> {
    const invoiceNumber = generateInvoiceNumber();
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal; // Taxes/discounts can be added later

    const invoice = await Invoice.create({
      tenantId,
      businessId,
      invoiceNumber,
      type,
      items,
      subtotal,
      total,
      currency: 'SAR',
      status: 'draft',
      dueDate,
    });

    log.info('Invoice created', { tenantId, invoiceNumber, total: String(total) });
    return invoice;
  },

  /**
   * Adjust an invoice (update total, add adjustment ledger entry).
   */
  async adjustInvoice(
    invoiceId: string,
    adjustment: { amount: number; reason: string },
    actor: string
  ): Promise<IInvoice | null> {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      log.warn('Invoice not found for adjustment', { invoiceId });
      return null;
    }

    const previousTotal = invoice.total;
    invoice.total = invoice.total + adjustment.amount;
    await invoice.save();

    // Create adjustment ledger entry
    await LedgerEntry.create({
      tenantId: invoice.tenantId,
      businessId: invoice.businessId,
      type: 'expense' as LedgerEntryType,
      amount: adjustment.amount,
      currency: invoice.currency,
      referenceType: 'invoice',
      referenceId: invoiceId,
      invoiceId,
      status: 'recognized' as LedgerEntryStatus,
      details: { reason: adjustment.reason, previousTotal, newTotal: invoice.total },
      createdBy: actor,
    });

    // Audit log
    await auditService.log({
      actor,
      actorType: 'admin',
      module: 'finance',
      action: 'adjust_invoice',
      entityType: 'invoice',
      entityId: invoiceId,
      tenantId: invoice.tenantId,
      details: { reason: adjustment.reason, amount: adjustment.amount, previousTotal, newTotal: invoice.total },
    });

    log.info('Invoice adjusted', { invoiceId, amount: String(adjustment.amount), actor });
    return invoice;
  },

  /* ── Credit Notes ───────────────────────────────────────────── */

  /**
   * Issue a credit note for a return or adjustment.
   */
  async issueCreditNote(
    tenantId: string,
    businessId: string,
    returnId: string,
    orderId: string,
    amount: number,
    currency: string,
    reason: string
  ): Promise<void> {
    const creditNoteNumber = generateCreditNoteNumber();

    await CreditNote.create({
      tenantId,
      businessId,
      creditNoteNumber,
      returnId,
      orderId,
      amount,
      currency: currency || 'SAR',
      reason,
      status: 'issued',
    });

    await eventBus.safePublish('credit_note.issued', {
      tenantId,
      businessId,
      creditNoteNumber,
      returnId,
      orderId,
      amount,
      currency,
    }, { tenantId });

    log.info('Credit note issued', { tenantId, creditNoteNumber, amount: String(amount), returnId });
  },

  /* ── Write-offs ─────────────────────────────────────────────── */

  /**
   * Write off a ledger entry (creates a write_off entry and audits).
   */
  async writeOff(
    tenantId: string,
    entryId: string,
    reason: string,
    actor: string
  ): Promise<ILedgerEntry | null> {
    const original = await LedgerEntry.findById(entryId);
    if (!original || original.tenantId !== tenantId) {
      log.warn('Ledger entry not found for write-off', { tenantId, entryId });
      return null;
    }

    // Mark the original as voided
    original.status = 'voided' as LedgerEntryStatus;
    await original.save();

    // Create the write-off entry
    const writeOffEntry = await LedgerEntry.create({
      tenantId,
      businessId: original.businessId,
      type: 'write_off' as LedgerEntryType,
      amount: original.amount,
      currency: original.currency,
      referenceType: original.referenceType,
      referenceId: original.referenceId,
      orderId: original.orderId,
      status: 'recognized' as LedgerEntryStatus,
      details: { reason, originalEntryId: entryId },
      createdBy: actor,
    });

    // Audit log
    await auditService.log({
      actor,
      actorType: 'admin',
      module: 'finance',
      action: 'write_off',
      entityType: 'ledger_entry',
      entityId: entryId,
      tenantId,
      details: { reason, amount: original.amount, currency: original.currency },
    });

    log.info('Write-off recorded', { tenantId, entryId, amount: String(original.amount), actor });
    return writeOffEntry;
  },

  /* ── Query Helpers ──────────────────────────────────────────── */

  /**
   * Get ledger entries for a tenant, with optional filters.
   */
  async getLedgerEntries(
    tenantId: string,
    filters: { type?: LedgerEntryType; orderId?: string; status?: LedgerEntryStatus; limit?: number; skip?: number } = {}
  ): Promise<ILedgerEntry[]> {
    const query: Record<string, unknown> = { tenantId };
    if (filters.type) query.type = filters.type;
    if (filters.orderId) query.orderId = filters.orderId;
    if (filters.status) query.status = filters.status;

    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = filters.skip ?? 0;

    return LedgerEntry.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<ILedgerEntry[]>();
  },

  /**
   * Get invoices for a tenant.
   */
  async getInvoices(
    tenantId: string,
    filters: { status?: string; limit?: number; skip?: number } = {}
  ): Promise<IInvoice[]> {
    const query: Record<string, unknown> = { tenantId };
    if (filters.status) query.status = filters.status;

    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = filters.skip ?? 0;

    return Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IInvoice[]>();
  },

  /**
   * Get reconciliation records for a tenant.
   */
  async getReconciliations(
    tenantId: string,
    filters: { type?: string; status?: string; limit?: number } = {}
  ) {
    const query: Record<string, unknown> = { tenantId };
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    const limit = Math.min(filters.limit ?? 50, 200);

    return Reconciliation.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  /**
   * Get subscription for a tenant.
   */
  async getSubscription(tenantId: string) {
    return Subscription.findOne({ tenantId }).lean();
  },
};

export default financeService;
