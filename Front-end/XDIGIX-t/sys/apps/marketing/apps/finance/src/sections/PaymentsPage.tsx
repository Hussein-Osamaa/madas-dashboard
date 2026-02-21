import { useState } from 'react';
import dayjs from 'dayjs';
import { formatCurrency, formatDate } from '../lib/format';
import { usePayments } from '../hooks/usePayments';
import PaymentFilters from '../components/PaymentFilters';
import AddPaymentModal from '../components/modals/AddPaymentModal';

const PaymentsPage = () => {
  const [range] = useState<{ start: dayjs.Dayjs; end: dayjs.Dayjs }>({
    start: dayjs().subtract(29, 'day'),
    end: dayjs()
  });
  const [filters, setFilters] = useState({ method: 'all', status: 'all' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const paymentsQuery = usePayments({ range, method: filters.method, status: filters.status });

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-primary">Payments</h2>
          <p className="text-sm text-madas-text/70">
            Track incoming payments, link to orders, manage refunds and payment statuses.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <PaymentFilters
            method={filters.method}
            onMethodChange={(value) => setFilters((prev) => ({ ...prev, method: value }))}
            status={filters.status}
            onStatusChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition"
          >
            + Record Payment
          </button>
        </div>
      </header>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-primary/10">
            <thead className="bg-accent/10 text-xs uppercase tracking-wide text-primary">
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
            <tbody className="divide-y divide-primary/10 text-sm text-madas-text">
              {paymentsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-madas-text/60">
                    Loading payments...
                  </td>
                </tr>
              ) : paymentsQuery.data && paymentsQuery.data.length ? (
                paymentsQuery.data.map((payment) => (
                  <tr key={payment.id} className="hover:bg-accent/10">
                    <td className="px-4 py-3">{formatDate(payment.createdAt.toDate())}</td>
                    <td className="px-4 py-3">{payment.customerName ?? 'Walk-in'}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatCurrency(payment.amount, payment.currency || 'USD')}
                    </td>
                    <td className="px-4 py-3 capitalize">{payment.method.replace('_', ' ')}</td>
                    <td className="px-4 py-3 capitalize">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          payment.status === 'completed'
                            ? 'bg-success/10 text-success'
                            : payment.status === 'pending'
                              ? 'bg-primary/10 text-primary'
                              : payment.status === 'refunded'
                                ? 'bg-accent/10 text-primary'
                                : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{payment.orderId ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10">
                          View
                        </button>
                        <button className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-primary shadow hover:bg-primary/10">
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
