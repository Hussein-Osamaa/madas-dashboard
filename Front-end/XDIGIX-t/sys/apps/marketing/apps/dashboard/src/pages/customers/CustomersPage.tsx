import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../hooks/useCurrency';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import CustomerStats from '../../components/customers/CustomerStats';
import CustomerModal from '../../components/customers/CustomerModal';
import CustomerDetailsDrawer from '../../components/customers/CustomerDetailsDrawer';
import { useCustomers } from '../../hooks/useCustomers';
import { Customer, CustomerDraft } from '../../services/customersService';

type StatusFilter = 'all' | 'active' | 'inactive' | 'vip';

const formatDate = (date?: Date) => {
  if (!date) return 'Never';
  try {
    return format(date, 'MMM d, yyyy');
  } catch {
    return date.toString();
  }
};

const CustomersPage = () => {
  const { businessId, permissions, loading } = useBusiness();
  const { formatCurrency } = useCurrency();
  const {
    customers,
    stats,
    isLoading,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    creating,
    updating,
    deleting
  } = useCustomers(businessId);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { hasPermission } = useBusiness();
  const canEdit = hasPermission('customer_update') || 
                  hasPermission('customer_edit') || 
                  permissions?.customers?.includes('update') ||
                  permissions?.customers?.includes('edit');

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;

      if (!term) {
        return matchesStatus;
      }

      const haystacks = [
        customer.name,
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.phone
      ];

      const matchesSearch = haystacks.some(
        (value) => value && value.toLowerCase().includes(term)
      );

      return matchesStatus && matchesSearch;
    });
  }, [customers, statusFilter, searchTerm]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: CustomerDraft) => {
    if (!businessId) return;

    if (payload.id) {
      const { id, ...rest } = payload;
      await updateCustomer({ customerId: id, payload: rest });
    } else {
      const { id, ...rest } = payload;
      await createCustomer(rest as Omit<CustomerDraft, 'id'>);
    }

    setModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (customerId: string) => {
    if (!canEdit) return;
    const confirmed = window.confirm('Delete this customer? This action cannot be undone.');
    if (!confirmed) return;
    await deleteCustomer(customerId);
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(null);
      setDetailsOpen(false);
    }
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setModalOpen(true);
  };

  if (loading) {
    return <FullScreenLoader message="Loading business context..." />;
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Customers</h1>
          <p className="text-sm text-madas-text/70">
            Manage customer records, contact information, and purchase history.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
          onClick={openCreateModal}
          disabled={!canEdit}
        >
          <span className="material-icons text-base">person_add</span>
          Add customer
        </button>
      </header>

      <CustomerStats
        total={stats.total}
        active={stats.active}
        vip={stats.vip}
        newThisMonth={stats.newThisMonth}
        totalRevenue={stats.totalRevenue}
      />

      <section className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-base/40 px-4 py-3 text-sm text-madas-text/70 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <span className="material-icons text-madas-text/60">search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search customers"
              className="w-48 bg-transparent text-xs text-madas-text focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="vip">VIP</option>
          </select>
        </div>
        <p className="text-xs text-madas-text/50">{filteredCustomers.length} customers</p>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center text-madas-text/70">
            <span className="material-icons animate-spin text-3xl text-primary">progress_activity</span>
            <p>Loading customers…</p>
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <span className="material-icons text-5xl text-madas-text/30">sentiment_dissatisfied</span>
          <div>
            <h3 className="text-lg font-semibold text-primary">No customers found</h3>
            <p className="text-sm text-madas-text/60">
              Adjust your filters or add a new customer to get started.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-60"
            onClick={openCreateModal}
            disabled={!canEdit}
          >
            <span className="material-icons text-base">person_add</span>
            Add customer
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Total spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Last order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="cursor-pointer transition-colors hover:bg-base/60"
                    onClick={() => handleRowClick(customer)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {customer.name?.charAt(0).toUpperCase() ?? 'C'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-primary">{customer.name || 'Unnamed customer'}</span>
                          <span className="text-xs text-madas-text/50">ID • {customer.id.slice(-6)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                      <div className="flex flex-col">
                        <span>{customer.email || '—'}</span>
                        <span className="text-xs text-madas-text/50">{customer.phone || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {customer.orderCount ?? 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                      {formatCurrency(customer.totalSpent ?? 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize',
                          customer.status === 'vip'
                            ? 'bg-purple-100 text-purple-600'
                            : customer.status === 'inactive'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-green-100 text-green-600'
                        )}
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                      {formatDate(customer.lastOrder)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-madas-text transition-colors hover:bg-base"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRowClick(customer);
                          }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-madas-text transition-colors hover:bg-base disabled:opacity-60"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditCustomer(customer);
                          }}
                          disabled={!canEdit}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(customer.id);
                          }}
                          disabled={!canEdit || deleting}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CustomerModal
        open={modalOpen}
        initialValue={editingCustomer ?? undefined}
        onClose={() => {
          setModalOpen(false);
          setEditingCustomer(null);
        }}
        onSubmit={handleSubmit}
        onDelete={
          editingCustomer
            ? async () => {
                await handleDelete(editingCustomer.id);
                setModalOpen(false);
                setEditingCustomer(null);
              }
            : undefined
        }
        submitting={creating || updating}
        deleting={deleting}
      />

      <CustomerDetailsDrawer
        open={detailsOpen}
        customer={selectedCustomer}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedCustomer(null);
        }}
        onEdit={canEdit ? (customer) => handleEditCustomer(customer) : undefined}
      />
    </div>
  );
};

export default CustomersPage;

