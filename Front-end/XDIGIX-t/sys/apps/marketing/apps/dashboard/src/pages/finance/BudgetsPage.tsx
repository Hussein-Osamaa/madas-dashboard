import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ArrowTrendingUpIcon, BookmarkIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useBudgets } from '../../hooks/finance/useBudgets';
import { useBudgetTransactions } from '../../hooks/finance/useBudgetTransactions';
import BudgetsGrid from '../../components/finance/budgets/BudgetsGrid';
import BudgetDetailDrawer from '../../components/finance/budgets/BudgetDetailDrawer';
import CreateBudgetModal from '../../components/finance/budgets/CreateBudgetModal';
import BudgetVsActualChart from '../../components/finance/budgets/BudgetVsActualChart';
import KpiCard from '../../components/finance/KpiCard';
import { formatCurrency } from '../../lib/finance/format';
import { useFinanceScope } from '../../hooks/useFinanceScope';

const BudgetsPage = () => {
  const scope = useFinanceScope();
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  
  const range = {
    start: dayjs(startDate),
    end: dayjs(endDate)
  };
  
  const resetToThisMonth = () => {
    setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
    setEndDate(dayjs().format('YYYY-MM-DD'));
  };
  
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const budgetsQuery = useBudgets({ range });
  const transactionsQuery = useBudgetTransactions(selectedBudgetId);
  const currency = scope.currency;

  const kpis = useMemo(() => {
    const totals = budgetsQuery.data?.totals;
    if (!totals) {
      return [
        { label: 'Total Allocated', value: '—', icon: <BookmarkIcon className="h-6 w-6" /> },
        { label: 'Total Used', value: '—', icon: <ArrowTrendingUpIcon className="h-6 w-6" /> },
        { label: 'Budgets in Alert', value: '—', icon: <ExclamationCircleIcon className="h-6 w-6" /> }
      ];
    }

    return [
      {
        label: 'Total Allocated',
        value: formatCurrency(totals.totalAllocated, currency),
        trend: totals.totalAllocated
          ? {
              value: `${((totals.totalUsed / totals.totalAllocated) * 100).toFixed(1)}% used`,
              positive: totals.totalUsed <= totals.totalAllocated
            }
          : undefined,
        icon: <BookmarkIcon className="h-6 w-6" />
      },
      {
        label: 'Total Used',
        value: formatCurrency(totals.totalUsed, currency),
        icon: <ArrowTrendingUpIcon className="h-6 w-6" />
      },
      {
        label: 'Budgets in Alert',
        value: `${totals.overBudgetCount}`,
        trend: totals.overBudgetCount
          ? {
              value: `${totals.overBudgetCount} over limit`,
              positive: false
            }
          : undefined,
        icon: <ExclamationCircleIcon className="h-6 w-6" />
      }
    ];
  }, [budgetsQuery.data, currency]);

  if (!scope.canView) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don’t have permission to view finance budgets.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Budgets</h2>
          <p className="text-sm text-madas-text/70">
            Create category budgets, compare actual spend, and stay alerted when limits are exceeded.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          + New Budget
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 relative z-0">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} primaryValue={kpi.value} trend={kpi.trend} icon={kpi.icon} />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <BudgetVsActualChart data={budgetsQuery.data?.chart ?? []} currency={currency} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <BudgetsGrid
          budgets={budgetsQuery.data?.budgets ?? []}
          loading={budgetsQuery.isLoading}
          currency={currency}
          onSelectBudget={setSelectedBudgetId}
        />
      </div>

      <BudgetDetailDrawer
        open={Boolean(selectedBudgetId)}
        onClose={() => setSelectedBudgetId(null)}
        budget={budgetsQuery.data?.budgets.find((budget) => budget.id === selectedBudgetId) ?? null}
        currency={currency}
        transactions={transactionsQuery.data ?? []}
      />

      <CreateBudgetModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </section>
  );
};

export default BudgetsPage;

