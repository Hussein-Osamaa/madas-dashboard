import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useBudgets } from '../hooks/useBudgets';
import { useBudgetTransactions } from '../hooks/useBudgetTransactions';
import BudgetsGrid from '../components/budgets/BudgetsGrid';
import BudgetDetailDrawer from '../components/budgets/BudgetDetailDrawer';
import CreateBudgetModal from '../components/budgets/CreateBudgetModal';
import BudgetVsActualChart from '../components/budgets/BudgetVsActualChart';
import KpiCard from '../components/KpiCard';
import { formatCurrency } from '../lib/format';
import { ArrowTrendingUpIcon, BookmarkIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const BudgetsPage = () => {
  const [range] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().startOf('year'),
    end: dayjs().endOf('year')
  });
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const budgetsQuery = useBudgets({ range });
  const transactionsQuery = useBudgetTransactions(selectedBudgetId);
  const currency = 'USD';

  const kpis = useMemo(() => {
    const totals = budgetsQuery.data?.totals;
    if (!totals) {
      return [
        { label: 'Total Allocated', value: '—', icon: <BookmarkIcon className="h-6 w-6" /> },
        { label: 'Used', value: '—', icon: <ArrowTrendingUpIcon className="h-6 w-6" /> },
        { label: 'Alerts', value: '—', icon: <ExclamationCircleIcon className="h-6 w-6" /> }
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
  }, [budgetsQuery.data]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Budgets</h2>
          <p className="text-sm text-madas-text/70">
            Create category budgets, compare actual spend, and stay alerted when limits are exceeded.
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
        >
          + New Budget
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} primaryValue={kpi.value} trend={kpi.trend} icon={kpi.icon} />
        ))}
      </div>

      <div className="glass-card p-6">
        <BudgetVsActualChart data={budgetsQuery.data?.chart ?? []} currency={currency} />
      </div>

      <div className="glass-card p-6">
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

