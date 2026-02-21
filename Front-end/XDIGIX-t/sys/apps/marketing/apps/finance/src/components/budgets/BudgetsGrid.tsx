import { formatCurrency } from '../../lib/format';

export type BudgetSummary = {
  id: string;
  name: string;
  category: string;
  allocated: number;
  spent: number;
  startDate: Date;
  endDate: Date;
  status: 'on_track' | 'warning' | 'exceeded';
};

type Props = {
  budgets: BudgetSummary[];
  loading: boolean;
  currency: string;
  onSelectBudget: (id: string) => void;
};

const statusLabel = {
  on_track: { text: 'On Track', badge: 'bg-success/10 text-success' },
  warning: { text: 'Approaching Limit', badge: 'bg-accent/10 text-primary' },
  exceeded: { text: 'Exceeded', badge: 'bg-danger/10 text-danger' }
};

const BudgetsGrid = ({ budgets, loading, currency, onSelectBudget }: Props) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-primary">Budgets overview</h3>
        <p className="text-xs text-madas-text/60">
          Click a budget to view category performance, alerts and transactions.
        </p>
      </div>
    </div>
    {loading ? (
      <div className="rounded-2xl border border-primary/10 bg-white px-4 py-6 text-center text-sm text-madas-text/60">
        Loading budgets...
      </div>
    ) : budgets.length ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {budgets.map((budget) => {
          const progress = budget.allocated ? Math.min((budget.spent / budget.allocated) * 100, 120) : 0;
          const status = statusLabel[budget.status];
          return (
            <button
              key={budget.id}
              onClick={() => onSelectBudget(budget.id)}
              className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">{budget.name}</p>
                  <p className="text-xs text-madas-text/60 capitalize">{budget.category}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}>{status.text}</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-madas-text/50">Allocated</p>
                <p className="text-base font-semibold text-primary">
                  {formatCurrency(budget.allocated, currency)}
                </p>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-madas-text/60">
                  <span>Spent</span>
                  <span>
                    {formatCurrency(budget.spent, currency)} • {progress.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-madas-text/60">
                {budget.startDate.toLocaleDateString()} – {budget.endDate.toLocaleDateString()}
              </p>
            </button>
          );
        })}
      </div>
    ) : (
      <div className="rounded-2xl border border-primary/10 bg-white px-4 py-6 text-center text-sm text-madas-text/60">
        No budgets created yet. Click “New Budget” to get started.
      </div>
    )}
  </div>
);

export default BudgetsGrid;

