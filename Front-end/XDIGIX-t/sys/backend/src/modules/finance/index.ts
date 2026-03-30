// ── Finance Module ─────────────────────────────────────────────────
// Append-mostly ledger, invoicing, revenue recognition, and reconciliation.

// Services
export { financeService } from './finance.service';

// Event handlers
export { registerFinanceEventHandlers } from './finance.events';

// Background jobs
export { checkOverdueInvoices, checkSubscriptionRenewals, checkCodReconciliation } from './finance.jobs';

// Revenue policy
export { shouldRecognizeRevenue, DEFAULT_REVENUE_POLICY } from './revenue-policy';
export type { RevenuePolicy, RevenueEvent } from './revenue-policy';

// Routes
export { default as financeRoutes } from './finance.routes';

// Schemas
export { LedgerEntry } from './ledger-entry.schema';
export type { ILedgerEntry, LedgerEntryType, LedgerEntryStatus, LedgerReferenceType } from './ledger-entry.schema';

export { Invoice, generateInvoiceNumber } from './invoice.schema';
export type { IInvoice, IInvoiceItem, InvoiceType, InvoiceStatus } from './invoice.schema';

export { Subscription } from './subscription.schema';
export type { ISubscription, SubscriptionStatus } from './subscription.schema';

export { CreditNote, generateCreditNoteNumber } from './credit-note.schema';
export type { ICreditNote, CreditNoteStatus } from './credit-note.schema';

export { Reconciliation } from './reconciliation.schema';
export type { IReconciliation, ReconciliationType, ReconciliationStatus } from './reconciliation.schema';
