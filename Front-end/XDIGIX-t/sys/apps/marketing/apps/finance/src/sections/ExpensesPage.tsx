import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ArrowDownCircleIcon, ArrowUpRightIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import ExpensesFilters from '../components/expenses/ExpensesFilters';
import ExpensesTable from '../components/expenses/ExpensesTable';
import AddExpenseDrawer from '../components/expenses/AddExpenseDrawer';
import VendorsPanel from '../components/expenses/VendorsPanel';
import { useExpensesSummary } from '../hooks/useExpensesSummary';
import KpiCard from '../components/KpiCard';
import { usePermissions, FINANCE_PERMISSIONS } from '../context/PermissionsProvider';
import PermissionGate from '../components/PermissionGate';

const ExpensesPage = () => {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();

  // Redirect if no permission to view expenses (using existing finance_expenses permission)
  useEffect(() => {
    if (!permissionsLoading && !hasPermission(FINANCE_PERMISSIONS.EXPENSES)) {
      navigate('/overview');
    }
  }, [hasPermission, permissionsLoading, navigate]);
  const [rangeId, setRangeId] = useState('30d');
  const [dateRange, setDateRange] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().subtract(29, 'day'),
    end: dayjs()
  });
  const [filters, setFilters] = useState<{ vendor?: string; category?: string; status?: string }>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const summary = useExpensesSummary({ range: dateRange, filters });
  const currency = 'USD';

  const kpis = useMemo(
    () => [
      {
        label: 'Total Expenses',
        value: summary.data ? summary.data.totals.formattedTotal(currency) : '—',
        trend: summary.data
          ? {
              value: summary.data.totals.delta >= 0 ? `+${summary.data.totals.delta}% vs prev.` : `${summary.data.totals.delta}%`,
              positive: summary.data.totals.delta >= 0
            }
          : undefined,
        icon: <ArrowDownCircleIcon className="h-6 w-6" />
      },
      {
        label: 'Average Expense',
        value: summary.data ? summary.data.totals.formattedAverage(currency) : '—',
        icon: <BanknotesIcon className="h-6 w-6" />
      },
      {
        label: 'Active Vendors',
        value: summary.data ? summary.data.totals.vendorsActive.toString() : '0',
        icon: <ArrowUpRightIcon className="h-6 w-6" />,
        trend:
          summary.data && summary.data.totals.vendorsNew
            ? {
                value: `+${summary.data.totals.vendorsNew} new`,
                positive: true
              }
            : undefined
      }
    ],
    [summary.data]
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Expenses</h2>
          <p className="text-sm text-madas-text/70">
            Manage outflows, vendors, categories and attachments across every tenant branch.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow border border-primary/10 hover:bg-primary/10 transition"
            onClick={() => summary.refetch()}
          >
            Refresh
          </button>
          <PermissionGate permission={FINANCE_PERMISSIONS.EXPENSES}>
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
            >
              + Add Expense
            </button>
          </PermissionGate>
        </div>
      </header>

      <ExpensesFilters
        currentRangeId={rangeId}
        onRangeChange={(id, start, end) => {
          setRangeId(id);
          setDateRange({ start, end });
        }}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            primaryValue={kpi.value}
            trend={kpi.trend}
            icon={kpi.icon}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="glass-card lg:col-span-5 p-6">
          <ExpensesTable
            loading={summary.isLoading}
            expenses={summary.data?.expenses ?? []}
            currency={currency}
            onRefresh={summary.refetch}
          />
        </div>
        <div className="glass-card lg:col-span-2 p-6">
          <VendorsPanel vendors={summary.data?.vendors ?? []} totalSpent={summary.data?.totals.total ?? 0} currency={currency} />
        </div>
      </div>

      <AddExpenseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </section>
  );
};

export default ExpensesPage;

