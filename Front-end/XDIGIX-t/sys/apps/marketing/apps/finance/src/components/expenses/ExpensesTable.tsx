import { formatCurrency, formatDate } from '../../lib/format';

export type ExpenseRow = {
  id: string;
  amount: number;
  category: string;
  vendorName?: string;
  description?: string;
  status?: string;
  createdAt: Date;
  currency?: string;
};

type Props = {
  expenses: ExpenseRow[];
  loading: boolean;
  currency: string;
  onRefresh: () => void;
};

const statusClass = (status?: string) => {
  switch (status) {
    case 'approved':
      return 'bg-success/10 text-success';
    case 'pending':
      return 'bg-primary/10 text-primary';
    case 'rejected':
      return 'bg-danger/10 text-danger';
    default:
      return 'bg-madas-text/10 text-madas-text/70';
  }
};

const ExpensesTable = ({ expenses, loading, currency, onRefresh }: Props) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-primary">Expenses</h3>
        <p className="text-xs text-madas-text/60">Detailed view of every expense recorded for the selected period.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10"
        >
          Refresh
        </button>
        <button className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10">
          Export
        </button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-primary/10">
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
        <tbody className="divide-y divide-primary/10 text-sm text-madas-text">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-madas-text/60">
                Loading expenses...
              </td>
            </tr>
          ) : expenses.length ? (
            expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-primary/5">
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
                    <button className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10">
                      View
                    </button>
                    <button className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10">
                      Edit
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


