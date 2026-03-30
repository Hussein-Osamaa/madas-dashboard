/**
 * Finance API routes.
 *
 * All routes require JWT authentication and tenant context.
 * Finance data is tenant-scoped — users can only access their own data.
 */

import { Router, Request, Response } from 'express';
import { jwtMiddleware } from '../../middleware/jwt.middleware';
import { financeService } from './finance.service';
import { LedgerEntry } from './ledger-entry.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('finance-routes');
const router = Router();

// All finance routes require authentication
router.use(jwtMiddleware);

/* ── GET /ledger ──────────────────────────────────────────────── */
/**
 * List ledger entries for the authenticated tenant.
 * Query params: type, orderId, status, limit, skip
 */
router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    const entries = await financeService.getLedgerEntries(tenantId, {
      type: req.query.type as string | undefined as any,
      orderId: req.query.orderId as string | undefined,
      status: req.query.status as string | undefined as any,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      skip: req.query.skip ? parseInt(req.query.skip as string, 10) : undefined,
    });

    res.json({ entries, count: entries.length });
  } catch (err) {
    log.error('Failed to fetch ledger entries', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
});

/* ── GET /invoices ────────────────────────────────────────────── */
/**
 * List invoices for the authenticated tenant.
 * Query params: status, limit, skip
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    const invoices = await financeService.getInvoices(tenantId, {
      status: req.query.status as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      skip: req.query.skip ? parseInt(req.query.skip as string, 10) : undefined,
    });

    res.json({ invoices, count: invoices.length });
  } catch (err) {
    log.error('Failed to fetch invoices', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/* ── GET /reconciliation ──────────────────────────────────────── */
/**
 * List reconciliation records for the authenticated tenant.
 * Query params: type, status, limit
 */
router.get('/reconciliation', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    const records = await financeService.getReconciliations(tenantId, {
      type: req.query.type as string | undefined,
      status: req.query.status as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });

    res.json({ records, count: records.length });
  } catch (err) {
    log.error('Failed to fetch reconciliation records', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch reconciliation records' });
  }
});

/* ── GET /subscription ────────────────────────────────────────── */
/**
 * Get the subscription for the authenticated tenant.
 */
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    const subscription = await financeService.getSubscription(tenantId);
    if (!subscription) {
      res.status(404).json({ error: 'No subscription found' });
      return;
    }

    res.json({ subscription });
  } catch (err) {
    log.error('Failed to fetch subscription', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/* ── POST /expenses ───────────────────────────────────────────── */
/**
 * Record a basic expense entry.
 * Body: { businessId, amount, currency, description, referenceId? }
 */
router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context required' });
      return;
    }

    const { businessId, amount, currency, description, referenceId } = req.body;
    if (!businessId || !amount || amount <= 0) {
      res.status(400).json({ error: 'businessId and positive amount required' });
      return;
    }

    const entry = await LedgerEntry.create({
      tenantId,
      businessId,
      type: 'expense',
      amount,
      currency: currency || 'SAR',
      referenceType: 'manual',
      referenceId: referenceId || `EXP-${Date.now()}`,
      status: 'recognized',
      details: { description },
      createdBy: req.user?.uid,
    });

    log.info('Expense recorded', { tenantId, amount: String(amount) });
    res.status(201).json({ entry });
  } catch (err) {
    log.error('Failed to record expense', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to record expense' });
  }
});

/* ── POST /admin/write-off ────────────────────────────────────── */
/**
 * Write off a ledger entry (admin action).
 * Body: { entryId, reason }
 */
router.post('/admin/write-off', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actor = req.user?.uid;
    if (!tenantId || !actor) {
      res.status(400).json({ error: 'Tenant context and actor required' });
      return;
    }

    const { entryId, reason } = req.body;
    if (!entryId || !reason) {
      res.status(400).json({ error: 'entryId and reason required' });
      return;
    }

    const entry = await financeService.writeOff(tenantId, entryId, reason, actor);
    if (!entry) {
      res.status(404).json({ error: 'Ledger entry not found or not owned by tenant' });
      return;
    }

    res.json({ entry });
  } catch (err) {
    log.error('Failed to write off entry', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to write off entry' });
  }
});

/* ── POST /admin/adjust-invoice ───────────────────────────────── */
/**
 * Adjust an invoice total (admin action).
 * Body: { invoiceId, amount, reason }
 */
router.post('/admin/adjust-invoice', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const actor = req.user?.uid;
    if (!tenantId || !actor) {
      res.status(400).json({ error: 'Tenant context and actor required' });
      return;
    }

    const { invoiceId, amount, reason } = req.body;
    if (!invoiceId || amount === undefined || !reason) {
      res.status(400).json({ error: 'invoiceId, amount, and reason required' });
      return;
    }

    const invoice = await financeService.adjustInvoice(invoiceId, { amount, reason }, actor);
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    res.json({ invoice });
  } catch (err) {
    log.error('Failed to adjust invoice', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to adjust invoice' });
  }
});

export default router;
