/**
 * Merchant Wallet & Cashout routes
 * Mounted at /api/shipping/wallet
 *
 * Merchant (auth required):
 *   GET  /wallet/me                   — own wallet summary
 *   GET  /wallet/transactions          — own transaction history
 *   POST /wallet/cashout               — request a cashout
 *   GET  /wallet/cashout               — own cashout history
 *
 * Admin (auth required):
 *   GET  /wallet/admin/all             — all merchant wallets
 *   GET  /wallet/admin/transactions    — merchant transaction history
 *   GET  /wallet/admin/cashouts        — all cashout requests
 *   PATCH /wallet/admin/cashouts/:id   — approve or reject
 *   POST /wallet/admin/adjust          — manual balance adjustment
 */
import { Router, Request, Response, NextFunction } from 'express';
import * as WalletService from '../../modules/shipping/services/wallet.service';

const router = Router();

// ─── Auth helper ──────────────────────────────────────────────────────────────

function getMerchantIdFromReq(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(Buffer.from(auth.split('.')[1], 'base64url').toString());
    return (payload.businessId ?? payload.userId ?? payload.sub ?? null) as string | null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const requireMerchant = (req: Request, res: Response, next: NextFunction): any => {
  const id = getMerchantIdFromReq(req);
  if (!id) { res.status(401).json({ error: 'Authentication required' }); return; }
  (req as Request & { _merchantId: string })._merchantId = id;
  next();
};

// ─── Merchant routes ─────────────────────────────────────────────────────────

router.get('/me', requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { _merchantId: string })._merchantId;
    const wallet = await WalletService.getWallet(merchantId);
    res.json({ wallet });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/transactions', requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { _merchantId: string })._merchantId;
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const result = await WalletService.listTransactions(merchantId, page, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/cashout', requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { _merchantId: string })._merchantId;
    const { amount, bankName, accountName, accountNumber, notes } = req.body;
    if (!amount || Number(amount) <= 0) { res.status(400).json({ error: 'amount required and must be positive' }); return; }
    const request = await WalletService.requestCashout(merchantId, Number(amount), { bankName, accountName, accountNumber }, notes);
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// GET /wallet/cashout — merchant's own cashout history
router.get('/cashout', requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as Request & { _merchantId: string })._merchantId;
    const { CashoutRequest } = await import('../../schemas/shipping/cashout-request.schema');
    const cashouts = await CashoutRequest.find({ merchantId }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ cashouts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

router.get('/admin/all', async (req: Request, res: Response) => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const result = await WalletService.listAllWallets(page, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/admin/transactions', async (req: Request, res: Response) => {
  try {
    const merchantId = req.query.merchantId as string;
    if (!merchantId) { res.status(400).json({ error: 'merchantId query required' }); return; }
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const result = await WalletService.listTransactions(merchantId, page, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/admin/cashouts', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const page   = Math.max(1, Number(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const result = await WalletService.listCashouts(status, page, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/admin/cashouts/:id', async (req: Request, res: Response) => {
  try {
    const { action, adminNotes } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ error: 'action must be "approve" or "reject"' });
      return;
    }
    const adminId = req.headers['x-admin-id'] as string || 'admin';
    let result;
    if (action === 'approve') {
      result = await WalletService.approveCashout(req.params.id, adminId, adminNotes);
    } else {
      result = await WalletService.rejectCashout(req.params.id, adminId, adminNotes);
    }
    res.json({ success: true, request: result });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/admin/adjust', async (req: Request, res: Response) => {
  try {
    const { merchantId, amount, description } = req.body;
    if (!merchantId) { res.status(400).json({ error: 'merchantId required' }); return; }
    if (amount === undefined || amount === null) { res.status(400).json({ error: 'amount required' }); return; }
    if (!description) { res.status(400).json({ error: 'description required' }); return; }
    const adminId = req.headers['x-admin-id'] as string || 'admin';
    const result = await WalletService.adminAdjustBalance(merchantId, Number(amount), description, adminId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
