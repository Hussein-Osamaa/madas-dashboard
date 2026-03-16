import { useEffect, useState } from 'react';
import { Wallet, ArrowDownCircle, TrendingUp, CreditCard, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { api } from '../lib/api';

interface MerchantWallet {
  merchantId: string; currency: string;
  balance: number; pendingBalance: number;
  totalEarned: number; totalCashedOut: number; totalFees: number;
}

interface WalletTx {
  _id: string; type: string; amount: number;
  balanceBefore: number; balanceAfter: number;
  description: string; createdAt: string;
}

interface CashoutRequest {
  _id: string; amount: number; status: 'pending'|'approved'|'rejected';
  bankName?: string; accountName?: string; createdAt: string; adminNotes?: string;
}

const TX_ICON: Record<string,string>  = { cod_credit:'💰', fee_debit:'📦', cashout_debit:'🏦', refund_credit:'↩️', adjustment:'⚙️' };
const TX_SIGN: Record<string,string>  = { cod_credit:'+', fee_debit:'-', cashout_debit:'-', refund_credit:'+', adjustment:'±' };
const TX_COLOR: Record<string,string> = { cod_credit:'text-emerald-400', fee_debit:'text-red-400', cashout_debit:'text-amber-400', refund_credit:'text-blue-400', adjustment:'text-purple-400' };

export default function WalletPage() {
  const [wallet,   setWallet]   = useState<MerchantWallet | null>(null);
  const [txs,      setTxs]      = useState<WalletTx[]>([]);
  const [cashouts, setCashouts] = useState<CashoutRequest[]>([]);
  const [showCashoutForm, setShowCashoutForm] = useState(false);
  const [form, setForm] = useState({ amount: '', bankName: '', accountName: '', accountNumber: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [w, t, c] = await Promise.all([
      api.get('/shipping/wallet/me'),
      api.get('/shipping/wallet/transactions?limit=30'),
      api.get('/shipping/wallet/cashout'), // we'll add a list endpoint
    ]);
    setWallet(w.wallet ?? null);
    setTxs(t.transactions ?? []);
    setCashouts(c.cashouts ?? []);
  };

  useEffect(() => { load(); }, []);

  const submitCashout = async () => {
    setError('');
    if (!form.amount || Number(form.amount) < 50) { setError('Minimum cashout is 50 EGP'); return; }
    setSubmitting(true);
    try {
      await api.post('/shipping/wallet/cashout', {
        amount: Number(form.amount),
        bankName: form.bankName, accountName: form.accountName,
        accountNumber: form.accountNumber, notes: form.notes,
      });
      setShowCashoutForm(false);
      setForm({ amount: '', bankName: '', accountName: '', accountNumber: '', notes: '' });
      load();
    } catch (err) {
      setError((err as Error).message || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  const fmt = (n: number) => `${n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
  const fmtDate = (s: string) => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">My Wallet</h1>
      </div>

      {wallet && (
        <>
          {/* Balance cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Wallet,       label: 'Available Balance', value: fmt(wallet.balance),        color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { icon: Clock,        label: 'Pending (COD)',     value: fmt(wallet.pendingBalance),  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
              { icon: TrendingUp,   label: 'Total Earned',      value: fmt(wallet.totalEarned),     color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
              { icon: ArrowDownCircle, label: 'Total Cashed Out', value: fmt(wallet.totalCashedOut), color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
            ].map(k => (
              <div key={k.label} className={`border rounded-xl p-4 ${k.bg}`}>
                <k.icon className={`w-5 h-5 mb-2 ${k.color}`} />
                <p className="text-xs text-gray-400">{k.label}</p>
                <p className={`text-lg font-bold mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Cashout button */}
          <div className="flex justify-end">
            <button onClick={() => setShowCashoutForm(v => !v)}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-black rounded-xl font-semibold text-sm hover:bg-amber-400 transition-colors">
              <CreditCard className="w-4 h-4" />Request Cashout
            </button>
          </div>

          {/* Cashout form */}
          {showCashoutForm && (
            <div className="bg-[#1a1b3e]/80 border border-amber-500/30 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />Cashout Request
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Amount (EGP)', key: 'amount', type: 'number', placeholder: 'Min. 50 EGP' },
                  { label: 'Bank Name',    key: 'bankName', type: 'text', placeholder: 'e.g. CIB, HSBC' },
                  { label: 'Account Name', key: 'accountName', type: 'text', placeholder: 'Account holder name' },
                  { label: 'Account Number / IBAN', key: 'accountNumber', type: 'text', placeholder: 'Account number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder}
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
                <input type="text" value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any notes for admin..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50" />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowCashoutForm(false)} className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg text-sm">Cancel</button>
                <button onClick={submitCashout} disabled={submitting}
                  className="flex-1 py-2 bg-amber-500 text-black rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />{submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-white/5">
            {txs.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No transactions yet</p>
            )}
            {txs.map(tx => (
              <div key={tx._id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xl">{TX_ICON[tx.type] ?? '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{tx.description}</p>
                  <p className="text-xs text-gray-500">{fmtDate(tx.createdAt)}</p>
                </div>
                <span className={`text-sm font-bold whitespace-nowrap ${TX_COLOR[tx.type] ?? 'text-white'}`}>
                  {TX_SIGN[tx.type]}{fmt(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cashout history */}
        <div className="bg-[#1a1b3e]/80 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Cashout Requests</h3>
          </div>
          <div className="divide-y divide-white/5">
            {cashouts.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No cashout requests yet</p>
            )}
            {cashouts.map(c => (
              <div key={c._id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{fmt(c.amount)}</p>
                  <p className="text-xs text-gray-500">{fmtDate(c.createdAt)}</p>
                  {c.adminNotes && <p className="text-xs text-gray-400 italic mt-0.5">"{c.adminNotes}"</p>}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  c.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                  c.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                  'bg-amber-500/10 text-amber-400'
                }`}>
                  {c.status === 'approved' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {c.status === 'rejected' && <XCircle className="w-3 h-3 inline mr-1" />}
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
