import dayjs from 'dayjs';
import { TransactionRecord } from '../services/financeService';
import { formatCurrency } from '../lib/format';

type Props = {
  transactions: Array<{ id: string } & TransactionRecord>;
  currency?: string;
};

const typeColors = {
  income: 'bg-success/10 text-success',
  expense: 'bg-danger/10 text-danger',
  transfer: 'bg-primary/10 text-primary'
};

const RecentTransactionsList = ({ transactions, currency = 'USD' }: Props) => {
  if (!transactions.length) {
    return <p className="text-sm text-madas-text/50">No transactions recorded for this period.</p>;
  }

  return (
    <ul className="space-y-3">
      {transactions.map((transaction) => (
        <li key={transaction.id} className="flex items-center justify-between rounded-2xl border border-primary/10 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">
              {transaction.linkedType ? `${transaction.linkedType.toUpperCase()} #${transaction.linkedId}` : 'Manual entry'}
            </p>
            <p className="text-xs text-madas-text/60">{dayjs(transaction.createdAt.toDate()).format('MMM D, YYYY • HH:mm')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${typeColors[transaction.type]}`}>
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

