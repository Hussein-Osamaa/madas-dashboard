import { useState } from 'react';
import dayjs from 'dayjs';
import { formatCurrency, formatDate } from '../../lib/finance/format';
import { usePayments } from '../../hooks/finance/usePayments';
import PaymentFilters from '../../components/finance/PaymentFilters';
import AddPaymentModal from '../../components/finance/modals/AddPaymentModal';
import { useFinanceScope } from '../../hooks/useFinanceScope';

const statusStyles: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  refunded: 'bg-blue-100 text-blue-700',
  failed: 'bg-rose-100 text-rose-700'
};

const PaymentsPage = () => {
  const [range] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().subtract(29, 'day'),
    end: dayjs()
  });
  const [filters, setFilters] = useState({ method: 'all', status: 'all' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const scope = useFinanceScope();
  const paymentsQuery = usePayments({ range, method: filters.method, status: filters.status });
  const currency = scope.currency;

  if (!scope.canView) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don’t have permission to view finance payments.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Payments</h2>
          <p className="text-sm text-madas-text/70">
            Track incoming payments, link to orders, manage refunds and payment statuses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PaymentFilters
            method={filters.method}
            onMethodChange={(value) => setFilters((prev) => ({ ...prev, method: value }))}
            status={filters.status}
            onStatusChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          />
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            + Record Payment
          </button>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-primary/5 text-xs uppercase tracking-wide text-primary">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Linked Order</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-madas-text">
              {paymentsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-madas-text/60">
                    Loading payments...
                  </td>
                </tr>
              ) : paymentsQuery.data && paymentsQuery.data.length ? (
                paymentsQuery.data.map((payment) => (
                  <tr key={payment.id} className="transition hover:bg-primary/5">
                    <td className="px-4 py-3">{formatDate(payment.createdAt.toDate())}</td>
                    <td className="px-4 py-3">{payment.customerName ?? 'Walk-in'}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(payment.amount, payment.currency || currency)}
                    </td>
                    <td className="px-4 py-3 capitalize">{payment.method.replace('_', ' ')}</td>
                    <td className="px-4 py-3 capitalize">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[payment.status] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{payment.orderId ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10">
                          View
                        </button>
                        <button className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10">
                          Refund
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-madas-text/60">
                    No payments recorded in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddPaymentModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
};

export default PaymentsPage;

