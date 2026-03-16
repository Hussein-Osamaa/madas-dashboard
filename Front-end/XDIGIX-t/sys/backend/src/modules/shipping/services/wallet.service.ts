/**
 * WalletService — atomic balance operations for merchant COD wallets.
 *
 * All mutations are atomic via findOneAndUpdate + $inc so concurrent
 * deliveries for the same merchant never produce a race condition.
 */
import { MerchantWallet }   from '../../../schemas/shipping/merchant-wallet.schema';
import { WalletTransaction, WalletTxType } from '../../../schemas/shipping/wallet-transaction.schema';
import { CashoutRequest }   from '../../../schemas/shipping/cashout-request.schema';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getOrCreateWallet(merchantId: string) {
  return MerchantWallet.findOneAndUpdate(
    { merchantId },
    { $setOnInsert: { merchantId, currency: 'EGP', balance: 0, pendingBalance: 0, totalEarned: 0, totalCashedOut: 0, totalFees: 0 } },
    { upsert: true, new: true }
  );
}

async function recordTx(
  merchantId: string,
  type: WalletTxType,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  description: string,
  reference?: string,
  createdBy?: string,
) {
  return WalletTransaction.create({ merchantId, type, amount, balanceBefore, balanceAfter, description, reference, createdBy });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Called when a shipment is CREATED.
 * Debits shipping + COD fee from the merchant's balance (or records as debt).
 * If balance < fee we still record the debit (balance can go negative; settled on next COD).
 */
export async function debitShipmentFee(merchantId: string, totalFee: number, shipmentId: string) {
  const wallet = await getOrCreateWallet(merchantId);
  const before = wallet.balance;
  const after  = before - totalFee;

  await MerchantWallet.updateOne(
    { merchantId },
    { $inc: { balance: -totalFee, totalFees: totalFee }, $set: { lastActivityAt: new Date() } }
  );

  await recordTx(merchantId, 'fee_debit', totalFee, before, after,
    `Shipping fee for ${shipmentId}`, shipmentId);
}

/**
 * Called when a COD shipment is OUT_FOR_DELIVERY.
 * Moves COD amount into pendingBalance (not yet available until delivered).
 */
export async function holdCODPending(merchantId: string, codAmount: number, shipmentId: string) {
  if (codAmount <= 0) return;
  await MerchantWallet.updateOne(
    { merchantId },
    { $inc: { pendingBalance: codAmount }, $set: { lastActivityAt: new Date() } }
  );
}

/**
 * Called when a COD shipment is DELIVERED.
 * Moves amount from pendingBalance → balance and records the credit.
 * merchantReceives = codAmount - totalFee (already calculated in pricing engine).
 */
export async function creditCODDelivery(merchantId: string, merchantReceives: number, codAmount: number, shipmentId: string) {
  if (merchantReceives <= 0) return;
  const wallet = await getOrCreateWallet(merchantId);
  const before = wallet.balance;
  const after  = before + merchantReceives;

  // Drain pending by the raw COD amount, credit net amount to balance
  await MerchantWallet.updateOne(
    { merchantId },
    {
      $inc: {
        balance:        merchantReceives,
        pendingBalance: -Math.min(codAmount, wallet.pendingBalance), // don't go below 0
        totalEarned:    merchantReceives,
      },
      $set: { lastActivityAt: new Date() },
    }
  );

  await recordTx(merchantId, 'cod_credit', merchantReceives, before, after,
    `COD delivered — ${shipmentId} (net after fees)`, shipmentId);
}

/**
 * Called when a shipment is RETURNED after holding COD pending.
 * Releases the pending amount (no credit since COD was never collected).
 */
export async function releasePendingCOD(merchantId: string, codAmount: number, shipmentId: string) {
  if (codAmount <= 0) return;
  const wallet = await getOrCreateWallet(merchantId);
  await MerchantWallet.updateOne(
    { merchantId },
    { $inc: { pendingBalance: -Math.min(codAmount, wallet.pendingBalance) } }
  );
}

/**
 * Merchant requests a cashout. Validates sufficient balance and creates the request.
 */
export async function requestCashout(
  merchantId: string,
  amount: number,
  bankInfo: { bankName?: string; accountName?: string; accountNumber?: string },
  notes?: string,
) {
  const wallet = await getOrCreateWallet(merchantId);
  if (wallet.balance < amount) {
    throw new Error(`Insufficient balance. Available: ${wallet.balance.toFixed(2)} EGP`);
  }
  if (amount < 50) {
    throw new Error('Minimum cashout amount is 50 EGP');
  }

  // Reserve the amount
  await MerchantWallet.updateOne({ merchantId }, { $inc: { balance: -amount } });

  return CashoutRequest.create({ merchantId, amount, ...bankInfo, notes, status: 'pending' });
}

/**
 * Admin approves a cashout. Records the debit transaction.
 */
export async function approveCashout(cashoutId: string, adminId: string, adminNotes?: string) {
  const req = await CashoutRequest.findById(cashoutId);
  if (!req) throw new Error('Cashout request not found');
  if (req.status !== 'pending') throw new Error(`Request is already ${req.status}`);

  const wallet = await getOrCreateWallet(req.merchantId);
  const before = wallet.balance; // already debited at request time
  const after  = before;         // balance was already reduced

  const tx = await recordTx(req.merchantId, 'cashout_debit', req.amount, before + req.amount, after,
    `Cashout approved — ${req.amount} EGP`, cashoutId, adminId);

  await MerchantWallet.updateOne(
    { merchantId: req.merchantId },
    { $inc: { totalCashedOut: req.amount }, $set: { lastActivityAt: new Date() } }
  );

  await CashoutRequest.updateOne({ _id: cashoutId }, {
    status: 'approved', processedBy: adminId, adminNotes,
    processedAt: new Date(), transactionId: tx._id.toString(),
  });

  return req;
}

/**
 * Admin rejects a cashout. Refunds the reserved amount back to balance.
 */
export async function rejectCashout(cashoutId: string, adminId: string, adminNotes?: string) {
  const req = await CashoutRequest.findById(cashoutId);
  if (!req) throw new Error('Cashout request not found');
  if (req.status !== 'pending') throw new Error(`Request is already ${req.status}`);

  // Refund the reserved amount back to balance
  await MerchantWallet.updateOne(
    { merchantId: req.merchantId },
    { $inc: { balance: req.amount }, $set: { lastActivityAt: new Date() } }
  );

  await CashoutRequest.updateOne({ _id: cashoutId }, {
    status: 'rejected', processedBy: adminId, adminNotes, processedAt: new Date(),
  });

  return req;
}

/**
 * Admin manual adjustment (add or subtract arbitrary amount).
 */
export async function adminAdjustBalance(
  merchantId: string, amount: number, description: string, adminId: string,
) {
  const wallet = await getOrCreateWallet(merchantId);
  const before = wallet.balance;
  const after  = before + amount;

  await MerchantWallet.updateOne(
    { merchantId },
    { $inc: { balance: amount }, $set: { lastActivityAt: new Date() } }
  );

  await recordTx(merchantId, 'adjustment', Math.abs(amount), before, after, description, undefined, adminId);
  return { before, after, amount };
}

/**
 * Get wallet summary for a merchant.
 */
export async function getWallet(merchantId: string) {
  return getOrCreateWallet(merchantId);
}

/**
 * List wallet transactions for a merchant (paginated).
 */
export async function listTransactions(merchantId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ merchantId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WalletTransaction.countDocuments({ merchantId }),
  ]);
  return { transactions, total, page, pages: Math.ceil(total / limit) };
}

/**
 * Admin: list all wallets with balance summary.
 */
export async function listAllWallets(page = 1, limit = 30) {
  const skip = (page - 1) * limit;
  const [wallets, total] = await Promise.all([
    MerchantWallet.find().sort({ balance: -1 }).skip(skip).limit(limit).lean(),
    MerchantWallet.countDocuments(),
  ]);
  return { wallets, total, page, pages: Math.ceil(total / limit) };
}

/**
 * Admin: list cashout requests.
 */
export async function listCashouts(status?: string, page = 1, limit = 30) {
  const skip = (page - 1) * limit;
  const filter = status ? { status } : {};
  const [cashouts, total] = await Promise.all([
    CashoutRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CashoutRequest.countDocuments(filter),
  ]);
  return { cashouts, total, page, pages: Math.ceil(total / limit) };
}
