import { useState } from 'react';
import dayjs from 'dayjs';
import { useReports } from '../../hooks/finance/useReports';
import ProfitLossCard from '../../components/finance/reports/ProfitLossCard';
import ReportsCashFlowChart from '../../components/finance/reports/CashFlowChart';
import ExpensesByCategoryChart from '../../components/finance/reports/ExpensesByCategoryChart';
import ReportsToolbar from '../../components/finance/reports/ReportsToolbar';
import TaxSummaryCard from '../../components/finance/reports/TaxSummaryCard';
import { useFinanceScope } from '../../hooks/useFinanceScope';

const ReportsPage = () => {
  const scope = useFinanceScope();
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  
  const resetToThisMonth = () => {
    setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
    setEndDate(dayjs().format('YYYY-MM-DD'));
  };
  
  const reportsQuery = useReports({ 
    startDate, 
    endDate 
  });
  const currency = scope.currency;

  if (!scope.canManage) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don’t have permission to access finance reports.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Reports</h2>
          <p className="text-sm text-madas-text/70">
            Analyze profit &amp; loss, cash flow, category spend and tax exposure. Export results in multiple formats.
          </p>
        </div>
      </header>

      <ReportsToolbar 
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onResetToThisMonth={resetToThisMonth}
        onExport={() => reportsQuery.refetch()} 
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfitLossCard data={reportsQuery.data?.profitLoss ?? null} currency={currency} />
        <TaxSummaryCard data={reportsQuery.data?.taxSummary ?? null} currency={currency} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <ReportsCashFlowChart data={reportsQuery.data?.cashFlow ?? []} currency={currency} />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <ExpensesByCategoryChart data={reportsQuery.data?.expensesByCategory ?? []} currency={currency} />
      </div>
    </section>
  );
};

export default ReportsPage;

