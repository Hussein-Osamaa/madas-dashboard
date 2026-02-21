import { useState } from 'react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '../lib/format';
import { useTransactions } from '../hooks/useTransactions';
import TransactionFilters from '../components/TransactionFilters';
import AddTransactionModal from '../components/modals/AddTransactionModal';
import { useTenant } from '../context/TenantProvider';

const TransactionsPage = () => {
  const tenant = useTenant();
  const [range] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().subtract(29, 'day'),
    end: dayjs()
  });
  const [filters, setFilters] = useState({ type: 'all', method: 'all' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const transactionsQuery = useTransactions({ range, type: filters.type, method: filters.method });
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    // Placeholder for delete integration (Phase 2/3)
    await queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Transactions</h2>
          <p className="text-sm text-madas-text/70">
            Unified ledger for all income, expenses and transfers scoped to tenant <strong>{tenant.tenantName}</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <TransactionFilters
            type={filters.type}
            onTypeChange={(value) => setFilters((prev) => ({ ...prev, type: value }))}
            method={filters.method}
            onMethodChange={(value) => setFilters((prev) => ({ ...prev, method: value }))}
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            + Add Transaction
          </button>
        </div>
      </header>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-primary/10">
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
            <tbody className="divide-y divide-primary/10 text-sm text-madas-text">
              {transactionsQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-madas-text/60">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactionsQuery.data && transactionsQuery.data.length ? (
                transactionsQuery.data.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-primary/5">
                    <td className="px-4 py-3 font-semibold text-primary">{transaction.id}</td>
                    <td className="px-4 py-3 capitalize">{transaction.type}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(transaction.amount, transaction.currency || 'USD')}
                    </td>
                    <td className="px-4 py-3 capitalize">{transaction.method.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      {transaction.linkedType ? `${transaction.linkedType} • ${transaction.linkedId}` : 'Manual'}
                    </td>
                    <td className="px-4 py-3">{transaction.userId ?? '—'}</td>
                    <td className="px-4 py-3">{formatDate(transaction.createdAt.toDate())}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10">
                          View
                        </button>
                        <button className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10">
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          className="rounded-xl bg-danger/10 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger/20"
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
