import { useMemo, useState, useRef } from 'react';
import dayjs from 'dayjs';
import { ArrowDownCircleIcon, ArrowUpRightIcon, BanknotesIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import ExpensesFilters from '../../components/finance/expenses/ExpensesFilters';
import ExpensesTable from '../../components/finance/expenses/ExpensesTable';
import AddExpenseDrawer from '../../components/finance/expenses/AddExpenseDrawer';
import VendorsPanel from '../../components/finance/expenses/VendorsPanel';
import { useExpensesSummary } from '../../hooks/finance/useExpensesSummary';
import KpiCard from '../../components/finance/KpiCard';
import { useFinanceScope } from '../../hooks/useFinanceScope';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteExpense, createExpense } from '../../services/finance/expensesService';
import { exportExpensesToExcel, importExpensesFromExcel, parseExcelDataToExpenses, downloadExpenseTemplate } from '../../utils/excelUtils';
import type { ExpenseRow } from '../../components/finance/expenses/ExpensesTable';

const ExpensesPage = () => {
  const [startDate, setStartDate] = useState(dayjs().subtract(1, 'year').startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  
  const dateRange = {
    start: dayjs(startDate),
    end: dayjs(endDate)
  };
  
  const resetToThisMonth = () => {
    setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
    setEndDate(dayjs().format('YYYY-MM-DD'));
  };
  
  const [filters, setFilters] = useState<{ vendor?: string; category?: string; status?: string }>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('add');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scope = useFinanceScope();
  const queryClient = useQueryClient();
  const summary = useExpensesSummary({ range: dateRange, filters });
  const currency = scope.currency;

  const deleteMutation = useMutation({
    mutationFn: (expenseId: string) => deleteExpense(scope.businessId!, expenseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finance-expenses-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
    }
  });

  const handleExport = async () => {
    if (!summary.data?.expenses || summary.data.expenses.length === 0) {
      alert('No expenses to export.');
      return;
    }
    
    setIsExporting(true);
    try {
      await exportExpensesToExcel(summary.data.expenses, currency);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export expenses. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!scope.businessId) {
      alert('Business not loaded. Please refresh the page.');
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      const rawData = await importExpensesFromExcel(file);
      const expenses = parseExcelDataToExpenses(rawData);
      
      if (expenses.length === 0) {
        alert('No valid expenses found in the file. Please check the format.');
        setIsImporting(false);
        return;
      }

      let success = 0;
      let failed = 0;

      for (const expense of expenses) {
        try {
          await createExpense(scope.businessId, {
            amount: expense.amount,
            category: expense.category,
            vendorName: expense.vendorName,
            description: expense.description,
            tax: expense.tax,
            status: expense.status,
            currency: expense.currency || currency,
            createdAt: expense.createdAt
          });
          success++;
        } catch (err) {
          console.error('Failed to import expense:', err);
          failed++;
        }
      }

      setImportResults({ success, failed });
      
      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['finance-expenses-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-overview'] });
      
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import expenses. Please check the file format.');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadExpenseTemplate();
    } catch (error) {
      console.error('Template download failed:', error);
      alert('Failed to download template.');
    }
  };

  const handleView = (expense: ExpenseRow) => {
    setSelectedExpense(expense);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const handleEdit = (expense: ExpenseRow) => {
    setSelectedExpense(expense);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const handleDelete = async (expenseId: string) => {
    if (window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(expenseId);
    }
  };

  const handleAddExpense = () => {
    setSelectedExpense(null);
    setDrawerMode('add');
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedExpense(null);
  };

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
    [summary.data, currency]
  );

  if (!scope.canView) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don’t have permission to view finance expenses.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Expenses</h2>
          <p className="text-sm text-madas-text/70">
            Manage outflows, vendors, categories and attachments across every branch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <button
            type="button"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/10"
            onClick={() => summary.refetch()}
          >
            Refresh
          </button>
          
          <div className="relative group">
            <button
              type="button"
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/10 disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            {/* Dropdown for template download */}
            <div className="absolute right-0 mt-1 hidden group-hover:block z-20">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-madas-text shadow-lg hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Download Template
              </button>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || !summary.data?.expenses?.length}
            className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/10 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
          
          <button
            type="button"
            onClick={handleAddExpense}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            + Add Expense
          </button>
        </div>
      </header>

      {/* Import Results Notification */}
      {importResults && (
        <div className={`rounded-xl p-4 ${importResults.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${importResults.failed > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {importResults.failed > 0 ? '⚠️' : '✓'}
              </span>
              <div>
                <p className="font-semibold text-madas-text">
                  Import Complete
                </p>
                <p className="text-sm text-madas-text/70">
                  {importResults.success} expense{importResults.success !== 1 ? 's' : ''} imported successfully
                  {importResults.failed > 0 && `, ${importResults.failed} failed`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setImportResults(null)}
              className="text-madas-text/50 hover:text-madas-text"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10">
        <ExpensesFilters
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onResetToThisMonth={resetToThisMonth}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 relative z-0">
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
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-5">
          <ExpensesTable
            loading={summary.isLoading}
            expenses={summary.data?.expenses ?? []}
            currency={currency}
            onRefresh={summary.refetch}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onExport={handleExport}
            isExporting={isExporting}
          />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <VendorsPanel vendors={summary.data?.vendors ?? []} totalSpent={summary.data?.totals.total ?? 0} currency={currency} />
        </div>
      </div>

      <AddExpenseDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        expense={selectedExpense}
        mode={drawerMode}
      />
    </section>
  );
};

export default ExpensesPage;

