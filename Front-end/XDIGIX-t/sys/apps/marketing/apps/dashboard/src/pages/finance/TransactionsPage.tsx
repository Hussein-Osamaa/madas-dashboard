import { useState } from 'react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '../../lib/finance/format';
import { useTransactions } from '../../hooks/finance/useTransactions';
import TransactionFilters from '../../components/finance/TransactionFilters';
import AddTransactionModal from '../../components/finance/modals/AddTransactionModal';
import { useFinanceScope } from '../../hooks/useFinanceScope';

const TransactionsPage = () => {
  const scope = useFinanceScope();
  const [range] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().subtract(29, 'day'),
    end: dayjs()
  });
  const [filters, setFilters] = useState({ type: 'all', method: 'all' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const transactionsQuery = useTransactions({ range, type: filters.type, method: filters.method });
  const queryClient = useQueryClient();
  const currency = scope.currency;

  const handleDelete = async () => {
    await queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
  };

  if (!scope.canView) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don’t have permission to view finance transactions.
        </div>
      </section>
    );
  }
  return (
    <section className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Transactions</h2>
          <p className="text-sm text-madas-text/70">
            Unified ledger for all income, expenses and transfers
            {scope.businessName ? (
              <>
                {' '}
                scoped to <strong>{scope.businessName}</strong>.
              </>
            ) : (
              '.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TransactionFilters
            type={filters.type}
            onTypeChange={(value) => setFilters((prev) => ({ ...prev, type: value }))}
            method={filters.method}
            onMethodChange={(value) => setFilters((prev) => ({ ...prev, method: value }))}
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            + Add Transaction
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-primary/5 text-xs uppercase tracking-wide text-primary">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Linked</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-madas-text">
              {transactionsQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-madas-text/60">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactionsQuery.data && transactionsQuery.data.length ? (
                transactionsQuery.data.map((transaction) => (
                  <tr key={transaction.id} className="transition hover:bg-primary/5">
                    <td className="px-4 py-3 font-semibold text-primary">{transaction.id}</td>
                    <td className="px-4 py-3 capitalize">{transaction.type}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(transaction.amount, transaction.currency || currency)}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {transaction.method.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      {transaction.linkedType ? `${transaction.linkedType} • ${transaction.linkedId}` : 'Manual'}
                    </td>
                    <td className="px-4 py-3">{transaction.userId ?? '—'}</td>
                    <td className="px-4 py-3">{formatDate(transaction.createdAt.toDate())}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10">
                          View
                        </button>
                        <button className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10">
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-madas-text/60">
                    No transactions recorded in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddTransactionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default TransactionsPage;

