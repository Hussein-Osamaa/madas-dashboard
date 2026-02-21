import { format } from 'date-fns';
import { Customer } from '../../services/customersService';
import { useCurrency } from '../../hooks/useCurrency';

type Props = {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (customer: Customer) => void;
};

const formatDate = (date?: Date) => {
  if (!date) return '—';
  try {
    return format(date, 'MMM d, yyyy');
  } catch {
    return date.toString();
  }
};

const CustomerDetailsDrawer = ({ customer, open, onClose, onEdit }: Props) => {
  const { formatCurrency } = useCurrency();

  if (!open || !customer) {
    return null;
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-600',
    inactive: 'bg-gray-100 text-gray-600',
    vip: 'bg-purple-100 text-purple-600'
  };

  const address = customer.addressDetails;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 p-4">
      <div className="h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-card">
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">{customer.name || 'Unnamed customer'}</h2>
            <p className="text-xs text-madas-text/60">Customer details and activity</p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-madas-text/60 transition-colors hover:bg-base"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
        </header>

        <section className="space-y-6 px-6 py-6">
          <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-primary">Contact</h3>
            <dl className="grid grid-cols-1 gap-3 text-sm text-madas-text/70">
              <div>
                <dt className="text-xs uppercase tracking-wide text-madas-text/50">Email</dt>
                <dd>{customer.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-madas-text/50">Phone</dt>
                <dd>{customer.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-madas-text/50">Status</dt>
                <dd>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusColors[customer.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    <span className="material-icons text-xs">
                      {customer.status === 'vip'
                        ? 'workspace_premium'
                        : customer.status === 'inactive'
                        ? 'pause_circle'
                        : 'check_circle'}
                    </span>
                    {customer.status}
                  </span>
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-primary">Ordering & Value</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm text-madas-text/70">
              <div>
                <dt className="text-xs uppercase tracking-wide text-madas-text/50">Total orders</dt>
                <dd className="text-base font-semibold text-primary">{customer.orderCount ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-madas-text/50">Active orders</dt>
                <dd className="text-base font-semibold text-primary">{customer.activeOrders ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-madas-text/50">Total spent</dt>
                <dd className="text-base font-semibold text-primary">
                  {formatCurrency(customer.totalSpent ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-madas-text/50">Pending amount</dt>
                <dd>{formatCurrency(customer.pendingAmount ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-madas-text/50">Average order</dt>
                <dd>{formatCurrency(customer.avgOrderValue ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-madas-text/50">Last order</dt>
                <dd>{formatDate(customer.lastOrder)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-madas-text/50">First seen</dt>
                <dd>{formatDate(customer.createdAt)}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-primary">Address</h3>
            {address ? (
              <dl className="grid grid-cols-1 gap-3 text-sm text-madas-text/70">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-madas-text/50">Primary</dt>
                  <dd>{address.line || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-madas-text/50">Line 2</dt>
                  <dd>{address.addressLine2 || '—'}</dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-madas-text/50">Neighborhood</dt>
                    <dd>{address.neighborhood || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-madas-text/50">District</dt>
                    <dd>{address.district || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-madas-text/50">Governorate</dt>
                    <dd>{address.governorate || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-madas-text/50">Country</dt>
                    <dd>{address.country || '—'}</dd>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-madas-text/50">Apartment</dt>
                    <dd>{address.apartment || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-madas-text/50">Floor</dt>
                    <dd>{address.floor || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-madas-text/50">Building</dt>
                    <dd>{address.building || '—'}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-madas-text/50">Clarification</dt>
                  <dd>{address.addressClarification || '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-madas-text/60">No address on file.</p>
            )}
          </article>
        </section>

        <footer className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          {onEdit ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text transition-colors hover:bg-base"
              onClick={() => onEdit(customer)}
            >
              <span className="material-icons text-base">edit</span>
              Edit customer
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19]"
            onClick={onClose}
          >
            <span className="material-icons text-base">close</span>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CustomerDetailsDrawer;

