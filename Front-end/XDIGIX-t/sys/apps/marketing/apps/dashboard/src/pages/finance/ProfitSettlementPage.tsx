import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useFinanceScope } from '../../hooks/useFinanceScope';
import { useCurrency } from '../../hooks/useCurrency';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchPartners,
  createPartner,
  updatePartner,
  fetchPayments,
  recordPayment,
  voidPayment,
  voidCalculation,
  calculateProfit,
  fetchCalculations,
  getAllPartnerSummaries,
  settlePartnerBalance,
  fetchAuditLogs,
  type Partner,
  type PartnerPayment,
  type ProfitCalculation,
  type PartnerSummary,
  type AuditLog
} from '../../services/finance/profitSettlementService';

type TabType = 'overview' | 'partners' | 'payments' | 'calculations' | 'audit';

const ProfitSettlementPage = () => {
  const scope = useFinanceScope();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const businessId = scope.businessId;

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Data states
  const [partners, setPartners] = useState<Partner[]>([]);
  const [payments, setPayments] = useState<PartnerPayment[]>([]);
  const [calculations, setCalculations] = useState<ProfitCalculation[]>([]);
  const [summaries, setSummaries] = useState<PartnerSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showVoidPaymentModal, setShowVoidPaymentModal] = useState(false);
  const [showVoidCalcModal, setShowVoidCalcModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  // Form states
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<PartnerSummary | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    profitSharePercentage: 0,
    isActive: true
  });
  const [paymentForm, setPaymentForm] = useState({
    partnerId: '',
    amount: 0,
    description: '',
    reference: ''
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    partnerId: '',
    amount: 0,
    description: ''
  });
  const [settlementForm, setSettlementForm] = useState({
    amount: 0,
    description: ''
  });
  const [calculateForm, setCalculateForm] = useState({
    periodStart: dayjs().startOf('month').format('YYYY-MM-DD'),
    periodEnd: dayjs().endOf('month').format('YYYY-MM-DD')
  });

  // Processing states
  const [processing, setProcessing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Void states
  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null);
  const [voidingCalcId, setVoidingCalcId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Show notification helper
  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    setNotification({ type, title, message });
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  };

  // Load data
  const loadData = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [partnersData, paymentsData, calcsData, summariesData, logsData] = await Promise.all([
        fetchPartners(businessId),
        fetchPayments(businessId),
        fetchCalculations(businessId),
        getAllPartnerSummaries(businessId),
        fetchAuditLogs(businessId, 50)
      ]);
      setPartners(partnersData);
      setPayments(paymentsData);
      setCalculations(calcsData);
      setSummaries(summariesData);
      setAuditLogs(logsData);
      setLastUpdated(new Date());
      
      console.log('[ProfitSettlementPage] Data loaded:', {
        partners: partnersData.length,
        calculations: calcsData.length,
        summaries: summariesData.map(s => ({ name: s.partner.name, totalProfitDue: s.totalProfitDue }))
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessId]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalProfitDue = summaries.reduce((sum, s) => sum + s.totalProfitDue, 0);
    const totalPaid = summaries.reduce((sum, s) => sum + s.totalPaid, 0);
    const totalOutstanding = summaries.reduce((sum, s) => sum + s.outstandingBalance, 0);
    const totalCredit = summaries.reduce((sum, s) => sum + s.creditBalance, 0);
    const totalSharePercentage = partners.filter(p => p.isActive).reduce((sum, p) => sum + p.profitSharePercentage, 0);
    
    return { totalProfitDue, totalPaid, totalOutstanding, totalCredit, totalSharePercentage };
  }, [summaries, partners]);

  // Handlers
  const handleSavePartner = async () => {
    if (!businessId || !user) return;
    setProcessing(true);
    try {
      if (editingPartner) {
        await updatePartner(businessId, editingPartner.id, partnerForm, user.uid);
      } else {
        await createPartner(businessId, partnerForm, user.uid);
      }
      setShowPartnerModal(false);
      setEditingPartner(null);
      setPartnerForm({ name: '', email: '', phone: '', profitSharePercentage: 0, isActive: true });
      await loadData();
      showToast('success', 'Partner Saved', `Partner "${partnerForm.name}" has been saved successfully.`);
    } catch (error) {
      showToast('error', 'Error', 'Failed to save partner: ' + (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!businessId || !user) return;
    const partner = partners.find(p => p.id === paymentForm.partnerId);
    if (!partner) {
      showToast('error', 'Error', 'Please select a partner');
      return;
    }
    setProcessing(true);
    try {
      await recordPayment(businessId, {
        partnerId: paymentForm.partnerId,
        partnerName: partner.name,
        amount: paymentForm.amount,
        type: 'payment',
        description: paymentForm.description,
        reference: paymentForm.reference
      }, user.uid);
      setShowPaymentModal(false);
      setPaymentForm({ partnerId: '', amount: 0, description: '', reference: '' });
      await loadData();
      showToast('success', 'Payment Recorded', `Payment of ${formatCurrency(paymentForm.amount)} to ${partner.name} has been recorded.`);
    } catch (error) {
      showToast('error', 'Error', 'Failed to record payment: ' + (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRecordAdjustment = async () => {
    if (!businessId || !user) return;
    const partner = partners.find(p => p.id === adjustmentForm.partnerId);
    if (!partner) {
      showToast('error', 'Error', 'Please select a partner');
      return;
    }
    setProcessing(true);
    try {
      await recordPayment(businessId, {
        partnerId: adjustmentForm.partnerId,
        partnerName: partner.name,
        amount: adjustmentForm.amount,
        type: 'adjustment',
        description: adjustmentForm.description || 'Manual adjustment'
      }, user.uid);
      setShowAdjustmentModal(false);
      setAdjustmentForm({ partnerId: '', amount: 0, description: '' });
      await loadData();
      showToast('success', 'Adjustment Added', `Adjustment of ${formatCurrency(adjustmentForm.amount)} for ${partner.name} has been recorded.`);
    } catch (error) {
      showToast('error', 'Error', 'Failed to record adjustment: ' + (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCalculateProfit = async () => {
    if (!businessId || !user) return;
    setProcessing(true);
    try {
      const result = await calculateProfit(
        businessId,
        new Date(calculateForm.periodStart),
        new Date(calculateForm.periodEnd),
        user.uid
      );
      setShowCalculateModal(false);
      
      // Reload all data to get updated summaries
      await loadData();
      
      // Show detailed success message
      const netProfit = result.netProfit;
      const status = netProfit >= 0 ? 'Profit' : 'Loss';
      showToast('success', 'Profit Calculated', 
        `Period: ${dayjs(result.periodStart).format('MMM D')} - ${dayjs(result.periodEnd).format('MMM D, YYYY')} | Revenue: ${formatCurrency(result.totalRevenue)} | Expenses: ${formatCurrency(result.totalExpenses)} | Net ${status}: ${formatCurrency(Math.abs(netProfit))}`
      );
    } catch (error) {
      showToast('error', 'Calculation Failed', (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSettleBalance = async () => {
    if (!businessId || !user || !selectedPartner) return;
    setProcessing(true);
    try {
      await settlePartnerBalance(
        businessId,
        selectedPartner.partner.id,
        settlementForm.amount,
        settlementForm.description,
        user.uid
      );
      const partnerName = selectedPartner.partner.name;
      setShowSettleModal(false);
      setSelectedPartner(null);
      setSettlementForm({ amount: 0, description: '' });
      await loadData();
      showToast('success', 'Balance Settled', `Settlement of ${formatCurrency(settlementForm.amount)} for ${partnerName} has been recorded.`);
    } catch (error) {
      showToast('error', 'Settlement Failed', (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const openVoidPaymentModal = (paymentId: string) => {
    setVoidingPaymentId(paymentId);
    setVoidReason('');
    setShowVoidPaymentModal(true);
  };

  const handleVoidPayment = async () => {
    if (!businessId || !user || !voidingPaymentId || !voidReason.trim()) return;
    setProcessing(true);
    try {
      await voidPayment(businessId, voidingPaymentId, voidReason, user.uid);
      setShowVoidPaymentModal(false);
      setVoidingPaymentId(null);
      setVoidReason('');
      await loadData();
      showToast('success', 'Payment Voided', 'The payment has been voided successfully.');
    } catch (error) {
      showToast('error', 'Void Failed', (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const openVoidCalcModal = (calcId: string) => {
    setVoidingCalcId(calcId);
    setVoidReason('');
    setShowVoidCalcModal(true);
  };

  const handleVoidCalculation = async () => {
    if (!businessId || !user || !voidingCalcId || !voidReason.trim()) return;
    setProcessing(true);
    try {
      await voidCalculation(businessId, voidingCalcId, voidReason, user.uid);
      setShowVoidCalcModal(false);
      setVoidingCalcId(null);
      setVoidReason('');
      await loadData();
      showToast('success', 'Calculation Voided', 'The profit calculation has been voided successfully.');
    } catch (error) {
      showToast('error', 'Void Failed', (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const openEditPartner = (partner: Partner) => {
    setEditingPartner(partner);
    setPartnerForm({
      name: partner.name,
      email: partner.email || '',
      phone: partner.phone || '',
      profitSharePercentage: partner.profitSharePercentage,
      isActive: partner.isActive
    });
    setShowPartnerModal(true);
  };

  const openSettleModal = (summary: PartnerSummary) => {
    setSelectedPartner(summary);
    setSettlementForm({
      amount: summary.outstandingBalance,
      description: ''
    });
    setShowSettleModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-icons animate-spin text-4xl text-primary">progress_activity</span>
          <p className="mt-2 text-madas-text/70">Loading profit settlement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Profit Settlement</h1>
          <p className="text-sm text-madas-text/70">
            Manage partner profit shares, payments, and settlements
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCalculateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <span className="material-icons text-base">calculate</span>
            Calculate Profit
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <span className="material-icons text-base">payments</span>
            Record Payment
          </button>
          <button
            onClick={() => setShowAdjustmentModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text hover:bg-base transition-colors"
          >
            <span className="material-icons text-base">tune</span>
            Add Adjustment
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Total Profit Due</p>
            <span className="material-icons rounded-lg bg-blue-100 p-2 text-lg text-blue-600">account_balance</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-primary">{formatCurrency(totals.totalProfitDue)}</p>
          {lastUpdated && (
            <p className="mt-1 text-xs text-madas-text/50">
              Updated: {dayjs(lastUpdated).format('h:mm:ss A')}
            </p>
          )}
        </article>
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Total Paid</p>
            <span className="material-icons rounded-lg bg-green-100 p-2 text-lg text-green-600">check_circle</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-green-600">{formatCurrency(totals.totalPaid)}</p>
        </article>
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Outstanding Balance</p>
            <span className="material-icons rounded-lg bg-orange-100 p-2 text-lg text-orange-600">pending</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-orange-600">{formatCurrency(totals.totalOutstanding)}</p>
        </article>
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Credit Balance</p>
            <span className="material-icons rounded-lg bg-purple-100 p-2 text-lg text-purple-600">savings</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-purple-600">{formatCurrency(totals.totalCredit)}</p>
        </article>
      </section>

      {/* Share Percentage Warning */}
      {totals.totalSharePercentage !== 100 && partners.length > 0 && (
        <div className={clsx(
          'rounded-lg px-4 py-3 text-sm',
          totals.totalSharePercentage > 100 
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
        )}>
          <span className="material-icons text-base mr-2 align-middle">warning</span>
          Total partner share is {totals.totalSharePercentage}%. 
          {totals.totalSharePercentage > 100 
            ? ' This exceeds 100% and needs to be corrected.'
            : ` Remaining ${100 - totals.totalSharePercentage}% is unallocated.`
          }
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(['overview', 'partners', 'payments', 'calculations', 'audit'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'pb-3 text-sm font-medium border-b-2 transition-colors capitalize',
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-madas-text/60 hover:text-madas-text'
              )}
            >
              {tab === 'audit' ? 'Audit Log' : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab - Partner Summaries */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Partner Profit Summary</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Partner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Share %</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Total Due</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Total Paid</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Balance</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-madas-text/60">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-madas-text/60">
                        No partners configured. Add partners to start tracking profit settlements.
                      </td>
                    </tr>
                  ) : (
                    summaries.map((summary) => (
                      <tr key={summary.partner.id} className="hover:bg-base/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-medium text-madas-text">{summary.partner.name}</p>
                            {summary.partner.email && (
                              <p className="text-xs text-madas-text/60">{summary.partner.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {summary.partner.profitSharePercentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {formatCurrency(summary.totalProfitDue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                          {formatCurrency(summary.totalPaid)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {summary.creditBalance > 0 ? (
                            <span className="text-purple-600">-{formatCurrency(summary.creditBalance)}</span>
                          ) : summary.outstandingBalance > 0 ? (
                            <span className="text-orange-600">+{formatCurrency(summary.outstandingBalance)}</span>
                          ) : (
                            <span className="text-green-600">{formatCurrency(0)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {summary.creditBalance > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                              Credit
                            </span>
                          ) : summary.outstandingBalance > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                              Due
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              Settled
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {summary.outstandingBalance > 0 && (
                            <button
                              onClick={() => openSettleModal(summary)}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
                            >
                              <span className="material-icons text-sm">handshake</span>
                              Settle
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Partners Tab */}
        {activeTab === 'partners' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Partners</h2>
              <button
                onClick={() => {
                  setEditingPartner(null);
                  setPartnerForm({ name: '', email: '', phone: '', profitSharePercentage: 0, isActive: true });
                  setShowPartnerModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                <span className="material-icons text-base">person_add</span>
                Add Partner
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Contact</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-madas-text/60">Share %</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-madas-text/60">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-madas-text/60">
                        No partners yet. Click "Add Partner" to create one.
                      </td>
                    </tr>
                  ) : (
                    partners.map((partner) => (
                      <tr key={partner.id} className="hover:bg-base/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-madas-text">
                          {partner.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                          <div>
                            {partner.email && <p>{partner.email}</p>}
                            {partner.phone && <p>{partner.phone}</p>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                            {partner.profitSharePercentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={clsx(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            partner.isActive 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          )}>
                            {partner.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => openEditPartner(partner)}
                            className="text-madas-text/60 hover:text-primary transition-colors"
                          >
                            <span className="material-icons text-xl">edit</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Payment History</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Partner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Description</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-madas-text/60">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-madas-text/60">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id} className={clsx(
                        'transition-colors',
                        payment.isVoided ? 'bg-red-50/50' : 'hover:bg-base/50'
                      )}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                          {dayjs(payment.createdAt).format('MMM D, YYYY')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-madas-text">
                          {payment.partnerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={clsx(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                            payment.type === 'payment' && 'bg-green-100 text-green-700',
                            payment.type === 'adjustment' && 'bg-blue-100 text-blue-700',
                            payment.type === 'settlement' && 'bg-purple-100 text-purple-700',
                            payment.type === 'credit_applied' && 'bg-orange-100 text-orange-700'
                          )}>
                            {payment.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-madas-text/70 max-w-[200px] truncate">
                          {payment.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {payment.isVoided ? (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                              Voided
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              Valid
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {!payment.isVoided && (
                            <button
                              onClick={() => openVoidPaymentModal(payment.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Void this payment"
                            >
                              <span className="material-icons text-xl">block</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calculations Tab */}
        {activeTab === 'calculations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Profit Calculations</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Period</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Expenses</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Net Profit</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-madas-text/60">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Calculated</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {calculations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-madas-text/60">
                        No calculations yet. Click "Calculate Profit" to create one.
                      </td>
                    </tr>
                  ) : (
                    calculations.map((calc) => (
                      <tr key={calc.id} className={clsx(
                        'transition-colors',
                        calc.status === 'voided' ? 'bg-red-50/50' : 'hover:bg-base/50'
                      )}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-madas-text">
                          {dayjs(calc.periodStart).format('MMM D')} - {dayjs(calc.periodEnd).format('MMM D, YYYY')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-madas-text">
                          {formatCurrency(calc.totalRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                          {formatCurrency(calc.totalExpenses)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                          <span className={calc.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(calc.netProfit)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={clsx(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                            calc.status === 'draft' && 'bg-gray-100 text-gray-700',
                            calc.status === 'finalized' && 'bg-blue-100 text-blue-700',
                            calc.status === 'settled' && 'bg-green-100 text-green-700',
                            calc.status === 'voided' && 'bg-red-100 text-red-700'
                          )}>
                            {calc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                          {dayjs(calc.calculatedAt).format('MMM D, YYYY h:mm A')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {calc.status !== 'voided' && (
                            <button
                              onClick={() => openVoidCalcModal(calc.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                              title="Void this calculation"
                            >
                              <span className="material-icons text-xl">block</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary">Audit Log</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-madas-text/60">
                        No audit logs yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-base/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                          {dayjs(log.performedAt).format('MMM D, YYYY h:mm A')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={clsx(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                            log.action === 'create' && 'bg-green-100 text-green-700',
                            log.action === 'update' && 'bg-blue-100 text-blue-700',
                            log.action === 'void' && 'bg-red-100 text-red-700',
                            log.action === 'payment' && 'bg-purple-100 text-purple-700',
                            log.action === 'calculate' && 'bg-orange-100 text-orange-700',
                            log.action === 'settlement' && 'bg-teal-100 text-teal-700'
                          )}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70 capitalize">
                          {log.entityType}
                        </td>
                        <td className="px-6 py-4 text-sm text-madas-text max-w-[300px] truncate">
                          {log.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                          {log.performedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Partner Modal */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-primary mb-4">
              {editingPartner ? 'Edit Partner' : 'Add Partner'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Name *</label>
                <input
                  type="text"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Partner name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Email</label>
                <input
                  type="email"
                  value={partnerForm.email}
                  onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="partner@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Phone</label>
                <input
                  type="tel"
                  value={partnerForm.phone}
                  onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Profit Share % *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={partnerForm.profitSharePercentage}
                  onChange={(e) => setPartnerForm({ ...partnerForm, profitSharePercentage: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={partnerForm.isActive}
                  onChange={(e) => setPartnerForm({ ...partnerForm, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-sm text-madas-text">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPartnerModal(false)}
                className="px-4 py-2 text-sm text-madas-text hover:bg-base rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePartner}
                disabled={processing || !partnerForm.name}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {processing ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-primary mb-4">Record Payment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Partner *</label>
                <select
                  value={paymentForm.partnerId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, partnerId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select partner</option>
                  {partners.filter(p => p.isActive).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Amount *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Reference</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Check #, transfer ref, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Description</label>
                <textarea
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Payment notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-sm text-madas-text hover:bg-base rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={processing || !paymentForm.partnerId || !paymentForm.amount}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-primary mb-4">Add Adjustment</h3>
            <p className="text-sm text-madas-text/70 mb-4">
              Use adjustments for manual corrections. Positive amounts increase the partner's credit, negative amounts increase their debt.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Partner *</label>
                <select
                  value={adjustmentForm.partnerId}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, partnerId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Positive or negative"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Reason *</label>
                <textarea
                  value={adjustmentForm.description}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Reason for adjustment..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="px-4 py-2 text-sm text-madas-text hover:bg-base rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordAdjustment}
                disabled={processing || !adjustmentForm.partnerId || !adjustmentForm.description}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Saving...' : 'Add Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculate Profit Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-primary mb-4">Calculate Profit</h3>
            <p className="text-sm text-madas-text/70 mb-4">
              Select the period to calculate profit distribution for all partners.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Period Start *</label>
                <input
                  type="date"
                  value={calculateForm.periodStart}
                  onChange={(e) => setCalculateForm({ ...calculateForm, periodStart: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Period End *</label>
                <input
                  type="date"
                  value={calculateForm.periodEnd}
                  onChange={(e) => setCalculateForm({ ...calculateForm, periodEnd: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCalculateModal(false)}
                className="px-4 py-2 text-sm text-madas-text hover:bg-base rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCalculateProfit}
                disabled={processing || !calculateForm.periodStart || !calculateForm.periodEnd}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {processing ? 'Calculating...' : 'Calculate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettleModal && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-primary mb-4">Settle Balance</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-madas-text/70">Partner</p>
              <p className="font-medium text-madas-text">{selectedPartner.partner.name}</p>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-sm text-madas-text/70">Outstanding Balance</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(selectedPartner.outstandingBalance)}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Settlement Amount *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settlementForm.amount}
                  onChange={(e) => setSettlementForm({ ...settlementForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {settlementForm.amount > selectedPartner.outstandingBalance && (
                  <p className="text-xs text-purple-600 mt-1">
                    This will create a credit balance of {formatCurrency(settlementForm.amount - selectedPartner.outstandingBalance)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Notes</label>
                <textarea
                  value={settlementForm.description}
                  onChange={(e) => setSettlementForm({ ...settlementForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Settlement notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSettleModal(false);
                  setSelectedPartner(null);
                }}
                className="px-4 py-2 text-sm text-madas-text hover:bg-base rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSettleBalance}
                disabled={processing || !settlementForm.amount}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Settling...' : 'Settle Balance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Payment Modal */}
      {showVoidPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-icons text-red-500 text-2xl">warning</span>
              <h3 className="text-lg font-semibold text-primary">Void Payment</h3>
            </div>
            <p className="text-sm text-madas-text/70 mb-4">
              This action cannot be undone. The payment will be marked as voided and will not count towards the partner's paid amount.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Reason for voiding *</label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Enter reason..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowVoidPaymentModal(false);
                  setVoidingPaymentId(null);
                  setVoidReason('');
                }}
                className="px-4 py-2 text-sm text-madas-text hover:bg-base rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidPayment}
                disabled={processing || !voidReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Voiding...' : 'Void Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Calculation Modal */}
      {showVoidCalcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-icons text-red-500 text-2xl">warning</span>
              <h3 className="text-lg font-semibold text-primary">Void Calculation</h3>
            </div>
            <p className="text-sm text-madas-text/70 mb-4">
              This action cannot be undone. The profit calculation will be marked as voided and will not count towards partner profit distributions.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-madas-text mb-1">Reason for voiding *</label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Enter reason..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowVoidCalcModal(false);
                  setVoidingCalcId(null);
                  setVoidReason('');
                }}
                className="px-4 py-2 text-sm text-madas-text hover:bg-base rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidCalculation}
                disabled={processing || !voidReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Voiding...' : 'Void Calculation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showNotification && notification && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl p-4 shadow-lg max-w-md animate-slide-up',
          notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        )}>
          <span className={clsx(
            'material-icons text-xl',
            notification.type === 'success' ? 'text-green-600' : 'text-red-600'
          )}>
            {notification.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <div className="flex-1">
            <p className={clsx(
              'font-medium',
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            )}>
              {notification.title}
            </p>
            <p className={clsx(
              'text-sm mt-1',
              notification.type === 'success' ? 'text-green-700' : 'text-red-700'
            )}>
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            className={clsx(
              'hover:opacity-70 transition-opacity',
              notification.type === 'success' ? 'text-green-600' : 'text-red-600'
            )}
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfitSettlementPage;
