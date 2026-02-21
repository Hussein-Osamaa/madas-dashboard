import { useMemo, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  ChartPieIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import OverviewFilters from '../../components/finance/OverviewFilters';
import { useFinanceOverview } from '../../hooks/finance/useFinanceOverview';
import KpiCard from '../../components/finance/KpiCard';
import RevenueVsExpensesChart from '../../components/finance/charts/RevenueVsExpensesChart';
import CashFlowChart from '../../components/finance/charts/CashFlowChart';
import RecentTransactionsList from '../../components/finance/RecentTransactionsList';
import AddExpenseDrawer from '../../components/finance/expenses/AddExpenseDrawer';
import { formatCurrency } from '../../lib/finance/format';
import { useFinanceScope } from '../../hooks/useFinanceScope';
import { trackPageLoad } from '../../lib/performance';

const OverviewPage = () => {
  const scope = useFinanceScope();
  
  // Track page load performance
  useEffect(() => {
    trackPageLoad('finance_overview');
  }, []);
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
  
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const overviewQuery = useFinanceOverview({ range: dateRange });

  const totals = overviewQuery.data?.totals;
  const currency = scope.currency;

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
    [totals, currency]
  );

  const handleExportSnapshot = async () => {
    if (!overviewQuery.data) {
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MADAS Finance';
      workbook.created = new Date();

      // Summary Sheet
      const summarySheet = workbook.addWorksheet('Summary', {
        views: [{ state: 'frozen', ySplit: 1 }]
      });

      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 25 },
        { header: 'Value', key: 'value', width: 20 }
      ];

      const headerRow = summarySheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF27491F' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      const summaryData = [
        { metric: 'Total Sales', value: formatCurrency(totals?.totalSales ?? 0, currency) },
        { metric: 'Total Expenses', value: formatCurrency(totals?.totalExpenses ?? 0, currency) },
        { metric: 'Net Profit', value: formatCurrency(totals?.netProfit ?? 0, currency) },
        { metric: 'Cash Flow Inflow', value: formatCurrency(totals?.inflow ?? 0, currency) },
        { metric: 'Cash Flow Outflow', value: formatCurrency(totals?.outflow ?? 0, currency) },
        { metric: 'Net Cash Flow', value: formatCurrency(totals?.cashFlowNet ?? 0, currency) },
        { metric: 'Period Start', value: dateRange.start.format('YYYY-MM-DD') },
        { metric: 'Period End', value: dateRange.end.format('YYYY-MM-DD') }
      ];

      summaryData.forEach((row, index) => {
        const excelRow = summarySheet.addRow(row);
        excelRow.height = 20;
        excelRow.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' }
            };
          }
        });
      });

      // Revenue vs Expenses Sheet
      const revenueSheet = workbook.addWorksheet('Revenue vs Expenses');
      revenueSheet.columns = [
        { header: 'Month', key: 'month', width: 20 },
        { header: 'Revenue', key: 'revenue', width: 20 },
        { header: 'Expenses', key: 'expenses', width: 20 },
        { header: 'Net', key: 'net', width: 20 }
      ];

      const revenueHeaderRow = revenueSheet.getRow(1);
      revenueHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      revenueHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF27491F' }
      };
      revenueHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
      revenueHeaderRow.height = 25;

      const revenueData = overviewQuery.data.charts.revenueVsExpenses.map((item) => ({
        month: item.label,
        revenue: formatCurrency(item.revenue, currency),
        expenses: formatCurrency(item.expenses, currency),
        net: formatCurrency(item.revenue - item.expenses, currency)
      }));

      revenueData.forEach((row, index) => {
        const excelRow = revenueSheet.addRow(row);
        excelRow.height = 20;
        excelRow.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' }
            };
          }
        });
      });

      // Cash Flow Sheet
      const cashFlowSheet = workbook.addWorksheet('Cash Flow');
      cashFlowSheet.columns = [
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Amount', key: 'amount', width: 20 },
        { header: 'Type', key: 'type', width: 15 }
      ];

      const cashFlowHeaderRow = cashFlowSheet.getRow(1);
      cashFlowHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cashFlowHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF27491F' }
      };
      cashFlowHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
      cashFlowHeaderRow.height = 25;

      const cashFlowData = overviewQuery.data.charts.cashFlow.map((item) => ({
        date: item.date,
        amount: formatCurrency(Math.abs(item.amount), currency),
        type: item.amount >= 0 ? 'Inflow' : 'Outflow'
      }));

      cashFlowData.forEach((row, index) => {
        const excelRow = cashFlowSheet.addRow(row);
        excelRow.height = 20;
        excelRow.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' }
            };
          }
        });
      });

      // Generate filename
      const date = new Date().toISOString().split('T')[0];
      const filename = `Finance_Snapshot_${date}.xlsx`;

      // Download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[OverviewPage] Export failed:', error);
      alert('Failed to export snapshot. Please try again.');
    }
  };

  if (!scope.canView) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don’t have permission to view finance overview data.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8 px-6 py-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Finance HQ</p>
          <h2 className="text-3xl font-bold text-primary">
            Overview {scope.businessName ? `• ${scope.businessName}` : ''}
          </h2>
          <p className="text-sm text-madas-text/70">Monitor revenue, expenses, capital and cash flow in real time.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportSnapshot}
            disabled={!overviewQuery.data || overviewQuery.isLoading}
            className="rounded-2xl border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Snapshot
          </button>
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            + Add Expense
          </button>
        </div>
      </header>

      <div className="relative z-10">
        <OverviewFilters
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onResetToThisMonth={resetToThisMonth}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 relative z-0">
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
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm xl:col-span-4">
          <div className="flex items-center justify-between px-6 pt-6">
            <div>
              <h3 className="text-lg font-semibold text-primary">Revenue vs Expenses</h3>
              <p className="text-xs text-madas-text/60">Last 6 months performance.</p>
            </div>
          </div>
          <div className="px-2 pb-6">
            <RevenueVsExpensesChart data={overviewQuery.data?.charts.revenueVsExpenses ?? []} currency={currency} />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between px-6 pt-6">
            <div>
              <h3 className="text-lg font-semibold text-primary">Net Cash Flow</h3>
              <p className="text-xs text-madas-text/60">Inflow vs outflow by day.</p>
            </div>
            <span className="rounded-2xl bg-primary/10 p-2 text-primary">
              <PresentationChartLineIcon className="h-5 w-5" />
            </span>
          </div>
          <div className="px-2 pb-6">
            <CashFlowChart data={overviewQuery.data?.charts.cashFlow ?? []} currency={currency} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary">Recent Transactions</h3>
              <p className="text-xs text-madas-text/60">Last 5 movements across all channels.</p>
            </div>
          </div>
          <RecentTransactionsList transactions={overviewQuery.data?.recentTransactions ?? []} currency={currency} />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-3">
          <h3 className="mb-4 text-lg font-semibold text-primary">Alerts</h3>
          <ul className="space-y-3 text-sm text-madas-text/70">
            <li className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              Upcoming budgets overrun alerts will render here once budgets module is live.
            </li>
            <li className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              Low capital notifications sync with Capital Return module.
            </li>
          </ul>
        </div>
      </div>

      <AddExpenseDrawer open={isAddExpenseOpen} onClose={() => setIsAddExpenseOpen(false)} />
    </section>
  );
};

export default OverviewPage;

