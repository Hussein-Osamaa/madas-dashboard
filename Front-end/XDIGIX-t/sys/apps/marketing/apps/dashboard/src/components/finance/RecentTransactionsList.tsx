import dayjs from 'dayjs';
import { TransactionRecord } from '../../services/finance/financeService';
import { formatCurrency } from '../../lib/finance/format';

function toDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === 'string') { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'object' && v !== null && ('seconds' in v || '_seconds' in v)) {
    const sec = (v as { seconds?: number; _seconds?: number }).seconds ?? (v as { _seconds?: number })._seconds;
    if (typeof sec === 'number') return new Date(sec * 1000);
  }
  return null;
}

type Props = {
  transactions: Array<{ id: string } & TransactionRecord>;
  currency?: string;
};

const typeColors: Record<string, string> = {
  income: 'bg-emerald-100 text-emerald-700',
  expense: 'bg-rose-100 text-rose-700',
  transfer: 'bg-primary/10 text-primary'
};

const RecentTransactionsList = ({ transactions, currency = 'USD' }: Props) => {
  if (!transactions.length) {
    return <p className="text-sm text-madas-text/50">No transactions recorded for this period.</p>;
  }

  return (
    <ul className="space-y-3">
      {transactions.map((transaction) => (
        <li
          key={transaction.id}
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
        >
          <div>
            <p className="text-sm font-semibold text-primary">
              {transaction.linkedType ? `${transaction.linkedType.toUpperCase()} #${transaction.linkedId}` : 'Manual entry'}
            </p>
            <p className="text-xs text-madas-text/60">
              {toDate(transaction.createdAt) ? dayjs(toDate(transaction.createdAt)).format('MMM D, YYYY • HH:mm') : '—'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                typeColors[transaction.type] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {transaction.type}
            </span>
            <span className="text-sm font-semibold text-madas-text">{formatCurrency(transaction.amount, currency)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default RecentTransactionsList;

