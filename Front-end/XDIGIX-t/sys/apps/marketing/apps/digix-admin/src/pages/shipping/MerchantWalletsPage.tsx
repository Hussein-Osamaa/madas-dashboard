import { useEffect, useState } from 'react';
import { Wallet, CheckCircle, XCircle, RefreshCw, PlusCircle } from 'lucide-react';

const API  = import.meta.env.VITE_API_BACKEND_URL ?? '';
const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

interface MerchantWallet {
  _id: string; merchantId: string; currency: string;
  balance: number; pendingBalance: number;
  totalEarned: number; totalCashedOut: number; totalFees: number;
  lastActivityAt?: string;
}

interface CashoutRequest {
  _id: string; merchantId: string; amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bankName?: string; accountName?: string; accountNumber?: string;
  notes?: string; adminNotes?: string;
  processedAt?: string; createdAt: string;
}

interface WalletTx {
  _id: string; merchantId: string; type: string; amount: number;
  balanceBefore: number; balanceAfter: number; description: string;
  reference?: string; createdAt: string;
}

const TX_COLORS: Record<string, string> = {
  cod_credit:    'text-emerald-400',
  fee_debit:     'text-red-400',
  cashout_debit: 'text-amber-400',
  refund_credit: 'text-blue-400',
  adjustment:    'text-purple-400',
};

const TX_SIGN: Record<string, string> = {
  cod_credit: '+', fee_debit: '-', cashout_debit: '-', refund_credit: '+', adjustment: '±',
};

export default function MerchantWalletsPage() {
  const [tab, setTab]       = useState<'wallets'|'cashouts'>('wallets');
  const [wallets, setWallets] = useState<MerchantWallet[]>([]);
  const [cashouts, setCashouts] = useState<CashoutRequest[]>([]);
  const [cashoutFilter, setCashoutFilter] = useState('pending');

  // Detail drawer
  const [selectedWallet, setSelectedWallet] = useState<MerchantWallet | null>(null);
  const [txs, setTxs] = useState<WalletTx[]>([]);

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState<{ merchantId: string } | null>(null);
  const [adjustForm, setAdjustForm] = useState({ amount: '', description: '' });

  // Cashout action modal
  const [actionModal, setActionModal] = useState<{ cashout: CashoutRequest; action: 'approve'|'reject' } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const loadWallets = async () => {
    const r = await fetch(`${API}/shipping/wallet/admin/all?limit=50`, { headers: auth() });
    const d = await r.json();
    setWallets(d.wallets ?? []);
  };

  const loadCashouts = async () => {
    const r = await fetch(`${API}/shipping/wallet/admin/cashouts?status=${cashoutFilter}&limit=50`, { headers: auth() });
    const d = await r.json();
    setCashouts(d.cashouts ?? []);
  };

  const loadTxs = async (merchantId: string) => {
    const r = await fetch(`${API}/shipping/wallet/admin/all`, { headers: auth() }); // reuse wallet list
    // We need merchant-specific transactions — call the transactions endpoint with a fake token approach
    // Since admin doesn't have a merchant token, we expose a special admin endpoint below
    // For now fetch via admin transactions route (added to wallet routes)
    const tr = await fetch(`${API}/shipping/wallet/admin/transactions?merchantId=${merchantId}&limit=30`, { headers: auth() });
    const td = await tr.json();
    setTxs(td.transactions ?? []);
    void r; // suppress unused warning
  };

  useEffect(() => { loadWallets(); }, []);
  useEffect(() => { loadCashouts(); }, [cashoutFilter]);

  const openWallet = (w: MerchantWallet) => {
    setSelectedWallet(w);
    loadTxs(w.merchantId);
  };

  const handleAdjust = async () => {
    if (!adjustModal || !adjustForm.amount || !adjustForm.description) return;
    await fetch(`${API}/shipping/wallet/admin/adjust`, {
      method: 'POST', headers: auth(),
      body: JSON.stringify({ merchantId: adjustModal.merchantId, amount: Number(adjustForm.amount), description: adjustForm.description }),
    });
    setAdjustModal(null);
    setAdjustForm({ amount: '', description: '' });
    loadWallets();
    if (selectedWallet?.merchantId === adjustModal.merchantId) loadTxs(adjustModal.merchantId);
  };

  const handleCashoutAction = async () => {
    if (!actionModal) return;
    await fetch(`${API}/shipping/wallet/admin/cashouts/${actionModal.cashout._id}`, {
      method: 'PATCH', headers: auth(),
      body: JSON.stringify({ action: actionModal.action, adminNotes }),
    });
    setActionModal(null);
    setAdminNotes('');
    loadCashouts();
    loadWallets();
  };

  const fmt = (n: number) => `${n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
  const fmtDate = (s?: string) => s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Merchant Wallets</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
        {(['wallets','cashouts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── WALLETS TAB ── */}
      {tab === 'wallets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet list */}
          <div className="lg:col-span-2 space-y-3">
            {wallets.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No merchant wallets yet</p>
            )}
            {wallets.map(w => (
              <div key={w._id}
                onClick={() => openWallet(w)}
                className={`bg-[#1a1b3e]/80 border rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-colors ${selectedWallet?._id === w._id ? 'border-amber-500/50' : 'border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{w.merchantId}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Last activity: {fmtDate(w.lastActivityAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-400">{fmt(w.balance)}</p>
                    {w.pendingBalance > 0 && (
                      <p className="text-xs text-amber-400">+ {fmt(w.pendingBalance)} pending</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/5">
                  {[
                    { label: 'Total Earned',    value: fmt(w.totalEarned),    color: 'text-emerald-400' },
                    { label: 'Total Fees',      value: fmt(w.totalFees),      color: 'text-red-400' },
                    { label: 'Total Cashed Out',value: fmt(w.totalCashedOut), color: 'text-amber-400' },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-gray-500">{f.label}</p>
                      <p className={`text-sm font-medium ${f.color}`}>{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Transaction drawer */}
          {selectedWallet && (
            <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedWallet.merchantId}</h3>
                  <p className="text-xs text-gray-500">Balance: {fmt(selectedWallet.balance)}</p>
                </div>
                <button onClick={() => { setAdjustModal({ merchantId: selectedWallet.merchantId }); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-xs hover:bg-purple-500/20">
                  <PlusCircle className="w-3.5 h-3.5" />Adjust
                </button>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {txs.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No transactions</p>}
                {txs.map(tx => (
                  <div key={tx._id} className="bg-white/5 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 capitalize">{tx.type.replace(/_/g,' ')}</span>
                      <span className={`text-sm font-bold ${TX_COLORS[tx.type] ?? 'text-white'}`}>
                        {TX_SIGN[tx.type]}{fmt(tx.amount)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{fmtDate(tx.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CASHOUTS TAB ── */}
      {tab === 'cashouts' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
            {['pending','approved','rejected'].map(s => (
              <button key={s} onClick={() => setCashoutFilter(s)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${cashoutFilter === s ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>

          {cashouts.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">No {cashoutFilter} cashout requests</p>
          )}

          {cashouts.map(c => (
            <div key={c._id} className="bg-[#1a1b3e]/80 border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{c.merchantId}</p>
                  <p className="text-2xl font-bold text-amber-400">{fmt(c.amount)}</p>
                  {c.bankName && <p className="text-xs text-gray-400">{c.bankName} · {c.accountName} · {c.accountNumber}</p>}
                  {c.notes && <p className="text-xs text-gray-500 italic">"{c.notes}"</p>}
                  <p className="text-xs text-gray-600">Requested: {fmtDate(c.createdAt)}</p>
                  {c.adminNotes && <p className="text-xs text-gray-400">Admin: {c.adminNotes}</p>}
                  {c.processedAt && <p className="text-xs text-gray-600">Processed: {fmtDate(c.processedAt)}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {c.status === 'pending' && (
                    <>
                      <button onClick={() => { setActionModal({ cashout: c, action: 'approve' }); setAdminNotes(''); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20">
                        <CheckCircle className="w-4 h-4" />Approve
                      </button>
                      <button onClick={() => { setActionModal({ cashout: c, action: 'reject' }); setAdminNotes(''); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                        <XCircle className="w-4 h-4" />Reject
                      </button>
                    </>
                  )}
                  {c.status !== 'pending' && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${c.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {c.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Adjust Balance</h2>
            <p className="text-xs text-gray-400">Merchant: <span className="text-white">{adjustModal.merchantId}</span></p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Amount (positive = add, negative = deduct)</label>
              <input type="number" value={adjustForm.amount}
                onChange={e => setAdjustForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
                placeholder="e.g. 100 or -50" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Reason</label>
              <input type="text" value={adjustForm.description}
                onChange={e => setAdjustForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50"
                placeholder="Manual correction..." />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setAdjustModal(null)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAdjust} className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cashout Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1b3e] border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-white capitalize">
              {actionModal.action} Cashout Request
            </h2>
            <p className="text-sm text-gray-400">
              {actionModal.cashout.merchantId} — <span className="text-amber-400 font-bold">{fmt(actionModal.cashout.amount)}</span>
            </p>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Admin Notes (optional)</label>
              <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none focus:border-amber-500/50"
                placeholder="Payment reference, rejection reason..." />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setActionModal(null)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg text-sm">Cancel</button>
              <button onClick={handleCashoutAction}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${actionModal.action === 'approve' ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-red-500 text-white hover:bg-red-400'}`}>
                {actionModal.action === 'approve' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {actionModal.action === 'approve' ? 'Approve & Pay' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
