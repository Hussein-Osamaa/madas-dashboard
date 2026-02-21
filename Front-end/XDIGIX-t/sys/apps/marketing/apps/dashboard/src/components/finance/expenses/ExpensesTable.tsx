import { formatCurrency, formatDate } from '../../../lib/finance/format';

export type ExpenseRow = {
  id: string;
  amount: number;
  category: string;
  vendorName?: string;
  description?: string;
  status?: string;
  createdAt: Date;
  currency?: string;
  tax?: number;
};

type Props = {
  expenses: ExpenseRow[];
  loading: boolean;
  currency: string;
  onRefresh: () => void;
  onView?: (expense: ExpenseRow) => void;
  onEdit?: (expense: ExpenseRow) => void;
  onDelete?: (expenseId: string) => void;
  onExport?: () => void;
  isExporting?: boolean;
};

const statusClass = (status?: string) => {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-700';
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'rejected':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const ExpensesTable = ({ expenses, loading, currency, onRefresh, onView, onEdit, onDelete, onExport, isExporting }: Props) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-primary">Expenses</h3>
        <p className="text-xs text-madas-text/60">Detailed view of every expense recorded for the selected period.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10"
        >
          Refresh
        </button>
        <button 
          onClick={onExport}
          disabled={isExporting || expenses.length === 0}
          className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-primary/5 text-xs uppercase tracking-wide text-primary">
          <tr>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Vendor</th>
            <th className="px-4 py-3 text-left">Category</th>
            <th className="px-4 py-3 text-left">Description</th>
            <th className="px-4 py-3 text-left">Amount</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm text-madas-text">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-madas-text/60">
                Loading expenses...
              </td>
            </tr>
          ) : expenses.length ? (
            expenses.map((expense) => (
              <tr key={expense.id} className="transition hover:bg-primary/5">
                <td className="px-4 py-3">{formatDate(expense.createdAt)}</td>
                <td className="px-4 py-3">{expense.vendorName ?? '—'}</td>
                <td className="px-4 py-3 capitalize">{expense.category}</td>
                <td className="px-4 py-3">{expense.description ?? '—'}</td>
                <td className="px-4 py-3 font-semibold">
                  {formatCurrency(expense.amount, expense.currency || currency)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(expense.status)}`}>
                    {expense.status ?? 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onView?.(expense)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit?.(expense)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
                          onDelete?.(expense.id);
                        }
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-madas-text/60">
                No expenses recorded for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default ExpensesTable;

