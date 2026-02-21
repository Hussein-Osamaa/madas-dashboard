import { useState } from 'react';
import { useReports } from '../hooks/useReports';
import ProfitLossCard from '../components/reports/ProfitLossCard';
import CashFlowChart from '../components/reports/CashFlowChart';
import ExpensesByCategoryChart from '../components/reports/ExpensesByCategoryChart';
import ReportsToolbar from '../components/reports/ReportsToolbar';
import TaxSummaryCard from '../components/reports/TaxSummaryCard';

const ReportsPage = () => {
  const [filters, setFilters] = useState({ range: '30d' });
  const reportsQuery = useReports(filters);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Reports</h2>
          <p className="text-sm text-madas-text/70">
            Analyze profit & loss, cash flow, category spend and tax exposure. Export results in multiple formats.
          </p>
        </div>
      </header>

      <ReportsToolbar filters={filters} onFiltersChange={setFilters} onExport={() => reportsQuery.refetch()} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfitLossCard data={reportsQuery.data?.profitLoss ?? null} />
        <TaxSummaryCard data={reportsQuery.data?.taxSummary ?? null} />
      </div>

      <div className="glass-card p-6">
        <CashFlowChart data={reportsQuery.data?.cashFlow ?? []} />
      </div>

      <div className="glass-card p-6">
        <ExpensesByCategoryChart data={reportsQuery.data?.expensesByCategory ?? []} />
      </div>
    </section>
  );
};

export default ReportsPage;

