import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { 
  ArrowDownTrayIcon, 
  PlusIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useFinanceScope } from '../../hooks/useFinanceScope';
import { formatCurrency } from '../../lib/finance/format';
import { trackPageLoad } from '../../lib/performance';
import { useBusiness } from '../../contexts/BusinessContext';
import { collection, db, getDocs, addDoc, deleteDoc, doc, query, where, orderBy, Timestamp } from '../../lib/firebase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import KpiCard from '../../components/finance/KpiCard';

interface Deposit {
  id: string;
  amount: number;
  source: string;
  description: string;
  date: Date;
  category: 'sales' | 'investment' | 'loan' | 'refund' | 'other';
  reference?: string;
  createdAt: Date;
}

const DEPOSIT_CATEGORIES = [
  { value: 'sales', label: 'Sales Revenue', icon: '💰' },
  { value: 'investment', label: 'Investment', icon: '📈' },
  { value: 'loan', label: 'Loan', icon: '🏦' },
  { value: 'refund', label: 'Refund', icon: '↩️' },
  { value: 'other', label: 'Other', icon: '📋' }
];

const DepositsPage = () => {
  const scope = useFinanceScope();
  const { businessId } = useBusiness();
  const queryClient = useQueryClient();
  const currency = scope.currency;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  
  const dateRange = {
    start: dayjs(startDate),
    end: dayjs(endDate)
  };
  
  const resetToThisMonth = () => {
    setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
    setEndDate(dayjs().format('YYYY-MM-DD'));
  };

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    source: '',
    description: '',
    date: dayjs().format('YYYY-MM-DD'),
    category: 'sales' as Deposit['category'],
    reference: ''
  });

  useEffect(() => {
    trackPageLoad('finance_deposits');
  }, []);

  // Fetch deposits
  const depositsQuery = useQuery({
    queryKey: ['finance-deposits', businessId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!businessId) return [];
      
      const depositsRef = collection(db, 'businesses', businessId, 'deposits');
      const q = query(
        depositsRef,
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
      })) as Deposit[];
    },
    enabled: !!businessId
  });

  // Add deposit mutation
  const addMutation = useMutation({
    mutationFn: async (data: Omit<Deposit, 'id' | 'createdAt'>) => {
      if (!businessId) throw new Error('No business ID');
      
      const depositsRef = collection(db, 'businesses', businessId, 'deposits');
      await addDoc(depositsRef, {
        ...data,
        date: Timestamp.fromDate(new Date(data.date)),
        createdAt: Timestamp.fromDate(new Date())
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      setIsAddModalOpen(false);
      resetForm();
    }
  });

  // Delete deposit mutation
  const deleteMutation = useMutation({
    mutationFn: async (depositId: string) => {
      if (!businessId) throw new Error('No business ID');
      await deleteDoc(doc(db, 'businesses', businessId, 'deposits', depositId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    }
  });

  const resetForm = () => {
    setFormData({
      amount: '',
      source: '',
      description: '',
      date: dayjs().format('YYYY-MM-DD'),
      category: 'sales',
      reference: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.source) {
      alert('Please fill in amount and source');
      return;
    }

    addMutation.mutate({
      amount: parseFloat(formData.amount),
      source: formData.source,
      description: formData.description,
      date: new Date(formData.date),
      category: formData.category,
      reference: formData.reference
    });
  };

  // Calculate totals
  const totals = {
    total: depositsQuery.data?.reduce((sum, d) => sum + d.amount, 0) || 0,
    byCategory: DEPOSIT_CATEGORIES.map(cat => ({
      ...cat,
      total: depositsQuery.data?.filter(d => d.category === cat.value).reduce((sum, d) => sum + d.amount, 0) || 0
    })),
    count: depositsQuery.data?.length || 0
  };

  if (!scope.canView) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don't have permission to view deposits.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      {/* Header */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Finance</p>
          <h2 className="text-3xl font-bold text-primary">Deposits</h2>
          <p className="text-sm text-madas-text/70">Track incoming money and revenue sources</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          <PlusIcon className="h-5 w-5" />
          Add Deposit
        </button>
      </header>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-madas-text/70">Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-madas-text/70">End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={resetToThisMonth}
          className="px-4 py-1.5 text-sm font-medium text-madas-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Reset to This Month
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Deposits"
          primaryValue={formatCurrency(totals.total, currency)}
          icon={<BanknotesIcon className="h-6 w-6" />}
          trend={totals.count > 0 ? { value: `${totals.count} deposits`, positive: true } : undefined}
        />
        <KpiCard
          label="Sales Revenue"
          primaryValue={formatCurrency(totals.byCategory.find(c => c.value === 'sales')?.total || 0, currency)}
          icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
        />
        <KpiCard
          label="Investments"
          primaryValue={formatCurrency(totals.byCategory.find(c => c.value === 'investment')?.total || 0, currency)}
          icon={<ArrowDownTrayIcon className="h-6 w-6" />}
        />
        <KpiCard
          label="Other Income"
          primaryValue={formatCurrency(
            (totals.byCategory.find(c => c.value === 'loan')?.total || 0) +
            (totals.byCategory.find(c => c.value === 'refund')?.total || 0) +
            (totals.byCategory.find(c => c.value === 'other')?.total || 0),
            currency
          )}
          icon={<CalendarIcon className="h-6 w-6" />}
        />
      </div>

      {/* Deposits Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-primary">Recent Deposits</h3>
        </div>
        
        {depositsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-icons animate-spin text-primary text-3xl">progress_activity</span>
          </div>
        ) : depositsQuery.data?.length === 0 ? (
          <div className="py-12 text-center text-madas-text/60">
            <BanknotesIcon className="mx-auto h-12 w-12 text-madas-text/30 mb-3" />
            <p>No deposits found for this period</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 text-primary hover:underline"
            >
              Add your first deposit
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sm text-madas-text/60">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Source</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Reference</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {depositsQuery.data?.map((deposit) => (
                  <tr key={deposit.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm">
                      {dayjs(deposit.date).format('MMM DD, YYYY')}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-primary">{deposit.source}</p>
                        {deposit.description && (
                          <p className="text-xs text-madas-text/60">{deposit.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        {DEPOSIT_CATEGORIES.find(c => c.value === deposit.category)?.icon}
                        {DEPOSIT_CATEGORIES.find(c => c.value === deposit.category)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-madas-text/60">
                      {deposit.reference || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-semibold text-green-600">
                        +{formatCurrency(deposit.amount, currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this deposit?')) {
                            deleteMutation.mutate(deposit.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Deposit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">Add Deposit</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-madas-text/60 hover:text-madas-text"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">
                  Source *
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g., Customer payment, Bank transfer"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Deposit['category'] })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {DEPOSIT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">
                  Reference (optional)
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Invoice #, Transaction ID, etc."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-madas-text/80">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {addMutation.isPending ? 'Adding...' : 'Add Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default DepositsPage;
