import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  ChartPieIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import OverviewFilters from '../components/OverviewFilters';
import { useFinanceOverview } from '../hooks/useFinanceOverview';
import KpiCard from '../components/KpiCard';
import RevenueVsExpensesChart from '../components/charts/RevenueVsExpensesChart';
import CashFlowChart from '../components/charts/CashFlowChart';
import RecentTransactionsList from '../components/RecentTransactionsList';
import { formatCurrency } from '../lib/format';
import { useTenant } from '../context/TenantProvider';
import { usePermissions, FINANCE_PERMISSIONS } from '../context/PermissionsProvider';
import PermissionGate from '../components/PermissionGate';

const OverviewPage = () => {
  const tenant = useTenant();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();

  // Redirect if no permission
  useEffect(() => {
    if (!permissionsLoading && !hasPermission(FINANCE_PERMISSIONS.VIEW)) {
      navigate('/login');
    }
  }, [hasPermission, permissionsLoading, navigate]);
  const [rangeId, setRangeId] = useState('30d');
  const [dateRange, setDateRange] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().subtract(29, 'day'),
    end: dayjs()
  });

  const overviewQuery = useFinanceOverview({ range: dateRange });

  const totals = overviewQuery.data?.totals;
  const currency = 'USD';

  const kpis = useMemo(
    () => [
      {
        label: 'Total Sales',
        value: formatCurrency(totals?.totalSales ?? 0, currency),
        trend: totals
          ? {
              value: totals.totalSales >= totals.totalExpenses ? '+ Healthy margin' : 'Needs attention',
              positive: totals.totalSales >= totals.totalExpenses
            }
          : undefined,
        icon: <ArrowUpRightIcon className="h-6 w-6" />
      },
      {
        label: 'Total Expenses',
        value: formatCurrency(totals?.totalExpenses ?? 0, currency),
        icon: <ArrowDownRightIcon className="h-6 w-6" />
      },
      {
        label: 'Net Profit',
        value: formatCurrency(totals?.netProfit ?? 0, currency),
        icon: <ChartPieIcon className="h-6 w-6" />,
        trend: totals
          ? {
              value: totals.netProfit >= 0 ? 'Profitable period' : 'Operating loss',
              positive: totals.netProfit >= 0
            }
          : undefined
      },
      {
        label: 'Net Cash Flow',
        value: formatCurrency(totals?.cashFlowNet ?? 0, currency),
        secondaryValue:
          totals && totals.inflow !== undefined
            ? `Inflow ${formatCurrency(totals.inflow, currency)} • Outflow ${formatCurrency(totals.outflow, currency)}`
            : undefined,
        icon: <BanknotesIcon className="h-6 w-6" />
      }
    ],
    [totals]
  );

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Finance HQ</p>
          <h2 className="text-3xl font-bold text-primary">
            Overview {tenant.tenantName ? `• ${tenant.tenantName}` : ''}
          </h2>
          <p className="text-sm text-madas-text/70">Monitor revenue, expenses, capital and cash flow in real time.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-primary shadow border border-primary/10 hover:bg-primary/10 transition">
            Export Snapshot
          </button>
          <button className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition">
            + Add Expense
          </button>
        </div>
      </header>

      <OverviewFilters
        currentRangeId={rangeId}
        onRangeChange={(id, start, end) => {
          setRangeId(id);
          setDateRange({ start, end });
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            primaryValue={kpi.value}
            secondaryValue={kpi.secondaryValue}
            trend={kpi.trend}
            icon={kpi.icon}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-7">
        <div className="glass-card xl:col-span-4 px-6 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-primary">Revenue vs Expenses</h3>
              <p className="text-xs text-madas-text/60">Last 6 months performance.</p>
            </div>
          </div>
          <div className="pb-6">
            <RevenueVsExpensesChart data={overviewQuery.data?.charts.revenueVsExpenses ?? []} currency={currency} />
          </div>
        </div>
        <div className="glass-card xl:col-span-3 px-6 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-primary">Net Cash Flow</h3>
              <p className="text-xs text-madas-text/60">Inflow vs outflow by day.</p>
            </div>
            <span className="rounded-2xl bg-primary/10 p-2 text-primary">
              <PresentationChartLineIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="pb-6">
            <CashFlowChart data={overviewQuery.data?.charts.cashFlow ?? []} currency={currency} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="glass-card lg:col-span-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-primary">Recent Transactions</h3>
              <p className="text-xs text-madas-text/60">Last 5 movements across all channels.</p>
            </div>
          </div>
          <RecentTransactionsList transactions={overviewQuery.data?.recentTransactions ?? []} currency={currency} />
        </div>
        <div className="glass-card lg:col-span-3 p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Alerts</h3>
          <ul className="space-y-3 text-sm text-madas-text/70">
            <li className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              Upcoming budgets overrun alerts will render here once budgets module is live.
            </li>
            <li className="rounded-2xl border border-danger/10 bg-danger/5 p-4">
              Low capital notifications sync with Capital Return module.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default OverviewPage;

