import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { useFinanceScope } from '../../hooks/useFinanceScope';
import { useCurrency } from '../../hooks/useCurrency';
import { useBusiness } from '../../contexts/BusinessContext';
import { 
  collection, db, getDocs, addDoc, updateDoc, doc, query, where, orderBy, Timestamp, getDoc, setDoc 
} from '../../lib/firebase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CogIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import KpiCard from '../../components/finance/KpiCard';
import { getAllPartnerSummaries, fetchPayments } from '../../services/finance/profitSettlementService';

interface CashFlowSettings {
  autoReservePercentage: number;
  autoReserveEnabled: boolean;
  lastAutoReserveDate?: string;
}

interface CashFlowTransaction {
  id: string;
  type: 'reserve' | 'transfer_to_revenue' | 'auto_reserve';
  amount: number;
  description: string;
  date: Date;
  createdBy?: string;
  createdAt: Date;
}

const CashFlowPage = () => {
  const scope = useFinanceScope();
  const { formatCurrency } = useCurrency();
  const { businessId } = useBusiness();
  const queryClient = useQueryClient();

  // State
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  
  // Form states
  const [settingsForm, setSettingsForm] = useState<CashFlowSettings>({
    autoReservePercentage: 10,
    autoReserveEnabled: false
  });
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [reserveAmount, setReserveAmount] = useState('');
  const [reserveDescription, setReserveDescription] = useState('');

  const dateRange = {
    start: dayjs(startDate),
    end: dayjs(endDate)
  };

  // Fetch cash flow settings
  const settingsQuery = useQuery({
    queryKey: ['cash-flow-settings', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      const settingsRef = doc(db, 'businesses', businessId, 'finance_settings', 'cash_flow');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        return settingsSnap.data() as CashFlowSettings;
      }
      return { autoReservePercentage: 10, autoReserveEnabled: false };
    },
    enabled: !!businessId
  });

  // Fetch cash flow transactions
  const transactionsQuery = useQuery({
    queryKey: ['cash-flow-transactions', businessId, startDate, endDate],
    queryFn: async () => {
      if (!businessId) return [];
      const transRef = collection(db, 'businesses', businessId, 'cash_flow_transactions');
      const q = query(
        transRef,
        where('date', '>=', Timestamp.fromDate(dateRange.start.toDate())),
        where('date', '<=', Timestamp.fromDate(dateRange.end.toDate())),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      })) as CashFlowTransaction[];
    },
    enabled: !!businessId
  });

  // Fetch deposits (for investments)
  const depositsQuery = useQuery({
    queryKey: ['deposits-for-cashflow', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const depositsRef = collection(db, 'businesses', businessId, 'deposits');
      const snapshot = await getDocs(depositsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        amount: Number(doc.data().amount) || 0,
        category: doc.data().category || 'other',
        date: doc.data().date?.toDate?.() || new Date()
      }));
    },
    enabled: !!businessId
  });

  // Fetch partner summaries (for settlements)
  const partnersQuery = useQuery({
    queryKey: ['partners-for-cashflow', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      return getAllPartnerSummaries(businessId);
    },
    enabled: !!businessId
  });

  // Calculate metrics based on formula: Net Cash Flow = Investments + Unsettled Profit - Partners Paid
  const metrics = useMemo(() => {
    // Total Investments (deposits with category 'investment')
    const investments = (depositsQuery.data || [])
      .filter(d => d.category === 'investment')
      .reduce((sum, d) => sum + d.amount, 0);
    
    // Partner data
    const totalProfitDue = (partnersQuery.data || []).reduce((sum, p) => sum + p.totalProfitDue, 0);
    const partnersPaid = (partnersQuery.data || []).reduce((sum, p) => sum + p.totalPaid, 0);
    const unsettledProfit = (partnersQuery.data || []).reduce((sum, p) => sum + p.outstandingBalance, 0);
    
    // Net Cash Flow = Investments + Unsettled Profit - Partners Paid
    const netCashFlow = investments + unsettledProfit - partnersPaid;
    
    // Cash flow reserve transactions
    const reserveTransactions = (transactionsQuery.data || []).filter(t => 
      t.type === 'reserve' || t.type === 'auto_reserve'
    );
    const transferTransactions = (transactionsQuery.data || []).filter(t => 
      t.type === 'transfer_to_revenue'
    );
    
    const totalReserved = reserveTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalTransferred = transferTransactions.reduce((sum, t) => sum + t.amount, 0);
    const reserveBalance = totalReserved - totalTransferred;
    
    return {
      investments,
      unsettledProfit,
      partnersPaid,
      totalProfitDue,
      netCashFlow,
      reserveBalance,
      totalReserved,
      totalTransferred
    };
  }, [depositsQuery.data, partnersQuery.data, transactionsQuery.data]);

  // Update settings when loaded
  useEffect(() => {
    if (settingsQuery.data) {
      setSettingsForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: CashFlowSettings) => {
      if (!businessId) throw new Error('No business ID');
      const settingsRef = doc(db, 'businesses', businessId, 'finance_settings', 'cash_flow');
      await setDoc(settingsRef, settings, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-settings'] });
      setShowSettingsModal(false);
    }
  });

  // Transfer to revenue mutation (creates a deposit)
  const transferToRevenueMutation = useMutation({
    mutationFn: async ({ amount, description }: { amount: number; description: string }) => {
      if (!businessId) throw new Error('No business ID');
      
      // Create deposit (revenue)
      const depositsRef = collection(db, 'businesses', businessId, 'deposits');
      await addDoc(depositsRef, {
        amount,
        source: 'Cash Flow Transfer',
        description: description || 'Transfer from cash flow reserve',
        date: Timestamp.fromDate(new Date()),
        category: 'other',
        reference: `CF-TRANSFER-${Date.now()}`,
        createdAt: Timestamp.fromDate(new Date())
      });
      
      // Record cash flow transaction
      const transRef = collection(db, 'businesses', businessId, 'cash_flow_transactions');
      await addDoc(transRef, {
        type: 'transfer_to_revenue',
        amount,
        description: description || 'Transfer from cash flow to revenue',
        date: Timestamp.fromDate(new Date()),
        createdAt: Timestamp.fromDate(new Date())
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['deposits-for-cashflow'] });
      queryClient.invalidateQueries({ queryKey: ['finance-deposits'] });
      setShowTransferModal(false);
      setTransferAmount('');
      setTransferDescription('');
    }
  });

  // Add to reserve mutation
  const addToReserveMutation = useMutation({
    mutationFn: async ({ amount, description }: { amount: number; description: string }) => {
      if (!businessId) throw new Error('No business ID');
      
      const transRef = collection(db, 'businesses', businessId, 'cash_flow_transactions');
      await addDoc(transRef, {
        type: 'reserve',
        amount,
        description: description || 'Manual reserve addition',
        date: Timestamp.fromDate(new Date()),
        createdAt: Timestamp.fromDate(new Date())
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-transactions'] });
      setShowReserveModal(false);
      setReserveAmount('');
      setReserveDescription('');
    }
  });

  if (!scope.canView) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don't have permission to view cash flow.
        </div>
      </section>
    );
  }

  const isLoading = settingsQuery.isLoading || transactionsQuery.isLoading || 
                    depositsQuery.isLoading || partnersQuery.isLoading;

  return (
    <section className="space-y-6 px-6 py-8">
      {/* Header */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Finance</p>
          <h2 className="text-3xl font-bold text-primary">Cash Flow Reserve</h2>
          <p className="text-sm text-madas-text/70">Net Cash Flow = Investments + Unsettled Profit - Partners Paid</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 transition hover:bg-gray-50"
          >
            <CogIcon className="h-5 w-5" />
            Settings
          </button>
          <button
            onClick={() => setShowReserveModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Add to Reserve
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Transfer to Revenue
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-icons animate-spin text-primary text-3xl">progress_activity</span>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total Investments"
              primaryValue={formatCurrency(metrics.investments)}
              icon={<ArrowDownTrayIcon className="h-6 w-6" />}
              trend={{ value: 'Capital deposited', positive: true }}
            />
            <KpiCard
              label="Unsettled Profit"
              primaryValue={formatCurrency(metrics.unsettledProfit)}
              icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
              trend={{ value: 'Partner outstanding', positive: metrics.unsettledProfit > 0 }}
            />
            <KpiCard
              label="Partners Paid"
              primaryValue={formatCurrency(metrics.partnersPaid)}
              icon={<BanknotesIcon className="h-6 w-6" />}
              trend={{ value: 'Already settled', positive: false }}
            />
            <KpiCard
              label="Net Cash Flow"
              primaryValue={formatCurrency(metrics.netCashFlow)}
              icon={<BanknotesIcon className="h-6 w-6" />}
              trend={{ 
                value: 'Inv + Unsettled - Paid', 
                positive: metrics.netCashFlow > 0 
              }}
            />
          </div>

          {/* Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cash Flow Calculation */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-lg font-semibold text-primary">Cash Flow Calculation</h3>
                <p className="text-xs text-madas-text/60 mt-1">Net Cash Flow = Investments + Unsettled Profit - Partners Paid</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-madas-text/70">💰 Investments (Capital)</span>
                  <span className="font-medium text-green-600">+{formatCurrency(metrics.investments)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-madas-text/70">📊 Unsettled Profit (Outstanding)</span>
                  <span className="font-medium text-blue-600">+{formatCurrency(metrics.unsettledProfit)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-madas-text/70">💸 Partners Paid</span>
                  <span className="font-medium text-red-600">-{formatCurrency(metrics.partnersPaid)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-primary/10 px-3 rounded-lg">
                  <span className="font-bold text-primary">= Net Cash Flow</span>
                  <span className="font-bold text-primary text-lg">{formatCurrency(metrics.netCashFlow)}</span>
                </div>
              </div>
            </div>

            {/* Reserve Activity */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-lg font-semibold text-primary">Reserve Activity</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-madas-text/70">Total Reserved</span>
                  <span className="font-medium text-green-600">+{formatCurrency(metrics.totalReserved)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-madas-text/70">Transferred to Revenue</span>
                  <span className="font-medium text-blue-600">-{formatCurrency(metrics.totalTransferred)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-green-50 px-3 rounded-lg">
                  <span className="font-bold text-green-700">Reserve Balance</span>
                  <span className="font-bold text-green-700 text-lg">{formatCurrency(metrics.reserveBalance)}</span>
                </div>
                
                {/* Auto Reserve Info */}
                <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary">Auto-Reserve</p>
                      <p className="text-sm text-madas-text/60">
                        {settingsForm.autoReserveEnabled 
                          ? `${settingsForm.autoReservePercentage}% of net profit monthly`
                          : 'Disabled'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="text-primary hover:underline text-sm"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-primary">Recent Transactions</h3>
            </div>
            {transactionsQuery.data?.length === 0 ? (
              <div className="py-12 text-center text-madas-text/60">
                <BanknotesIcon className="mx-auto h-12 w-12 text-madas-text/30 mb-3" />
                <p>No cash flow transactions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-sm text-madas-text/60">
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-6 py-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionsQuery.data?.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-6 py-4 text-sm">
                          {dayjs(transaction.date).format('MMM DD, YYYY')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                            transaction.type === 'transfer_to_revenue' 
                              ? 'bg-blue-100 text-blue-700'
                              : transaction.type === 'auto_reserve'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {transaction.type === 'transfer_to_revenue' && '↑ Transfer to Revenue'}
                            {transaction.type === 'auto_reserve' && '⚡ Auto Reserve'}
                            {transaction.type === 'reserve' && '↓ Manual Reserve'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-madas-text/70">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-semibold ${
                            transaction.type === 'transfer_to_revenue' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {transaction.type === 'transfer_to_revenue' ? '-' : '+'}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">Cash Flow Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-madas-text/60 hover:text-madas-text">
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div>
                  <p className="font-medium text-primary">Enable Auto-Reserve</p>
                  <p className="text-sm text-madas-text/60">Automatically reserve percentage monthly</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.autoReserveEnabled}
                    onChange={(e) => setSettingsForm({ ...settingsForm, autoReserveEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">
                  Auto-Reserve Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settingsForm.autoReservePercentage}
                  onChange={(e) => setSettingsForm({ ...settingsForm, autoReservePercentage: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={!settingsForm.autoReserveEnabled}
                />
                <p className="mt-1 text-xs text-madas-text/60">
                  {settingsForm.autoReservePercentage}% of net profit will be reserved automatically each month
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveSettingsMutation.mutate(settingsForm)}
                  disabled={saveSettingsMutation.isPending}
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer to Revenue Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">Transfer to Revenue</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-madas-text/60 hover:text-madas-text">
                <span className="material-icons">close</span>
              </button>
            </div>

            <p className="mb-4 text-sm text-madas-text/70">
              Transfer money from cash flow reserve to revenue. This will create a deposit and increase your profit.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-madas-text/60">
                  Reserve balance: {formatCurrency(metrics.reserveBalance)}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">Description</label>
                <input
                  type="text"
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Q1 profit distribution, Equipment purchase"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const amount = parseFloat(transferAmount);
                    if (amount > 0) {
                      transferToRevenueMutation.mutate({ amount, description: transferDescription });
                    }
                  }}
                  disabled={transferToRevenueMutation.isPending || !transferAmount}
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {transferToRevenueMutation.isPending ? 'Transferring...' : 'Transfer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Reserve Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">Add to Reserve</h3>
              <button onClick={() => setShowReserveModal(false)} className="text-madas-text/60 hover:text-madas-text">
                <span className="material-icons">close</span>
              </button>
            </div>

            <p className="mb-4 text-sm text-madas-text/70">
              Manually add money to cash flow reserve.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={reserveAmount}
                  onChange={(e) => setReserveAmount(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-madas-text/60">
                  Net Cash Flow: {formatCurrency(metrics.netCashFlow)}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">Description</label>
                <input
                  type="text"
                  value={reserveDescription}
                  onChange={(e) => setReserveDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Monthly reserve, Emergency fund"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReserveModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const amount = parseFloat(reserveAmount);
                    if (amount > 0) {
                      addToReserveMutation.mutate({ amount, description: reserveDescription });
                    }
                  }}
                  disabled={addToReserveMutation.isPending || !reserveAmount}
                  className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {addToReserveMutation.isPending ? 'Adding...' : 'Add to Reserve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CashFlowPage;
