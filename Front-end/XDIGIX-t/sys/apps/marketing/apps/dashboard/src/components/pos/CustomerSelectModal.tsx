import { useState } from 'react';
import { useCustomers } from '../../hooks/useCustomers';
import { useBusiness } from '../../contexts/BusinessContext';

type Props = {
  open: boolean;
  onClose: () => void;
  selectedCustomer: { name: string; contact?: string; email?: string } | null;
  onSelect: (customer: { name: string; contact?: string; email?: string } | null) => void;
};

const CustomerSelectModal = ({ open, onClose, selectedCustomer, onSelect }: Props) => {
  const { businessId } = useBusiness();
  const { customers, isLoading } = useCustomers(businessId ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', contact: '', email: '' });

  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCustomer = (customer: { name: string; contact?: string; email?: string }) => {
    onSelect(customer);
  };

  const handleWalkIn = () => {
    onSelect(null);
  };

  const handleCreateNew = () => {
    if (!newCustomer.name.trim()) {
      alert('Please enter a customer name');
      return;
    }
    onSelect({
      name: newCustomer.name,
      contact: newCustomer.contact || undefined,
      email: newCustomer.email || undefined
    });
    setNewCustomer({ name: '', contact: '', email: '' });
    setShowNewCustomerForm(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-primary">Select Customer</h2>
            <p className="text-sm text-madas-text/70">Choose a customer or create a new one</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-base transition-colors"
          >
            <span className="material-icons text-madas-text/60">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-base px-4 py-2">
            <span className="material-icons text-madas-text/60">search</span>
            <input
              type="search"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-madas-text focus:outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-2">
          <button
            type="button"
            onClick={handleWalkIn}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-madas-text hover:bg-base transition-colors"
          >
            Walk-in Customer
          </button>
          <button
            type="button"
            onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
            className="flex-1 rounded-lg border border-primary bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-[#1f3c19] transition-colors"
          >
            {showNewCustomerForm ? 'Cancel' : 'New Customer'}
          </button>
        </div>

        {/* New Customer Form */}
        {showNewCustomerForm && (
          <div className="px-6 py-4 border-b border-gray-200 bg-base/40">
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-madas-text/80 mb-1 block">Name *</span>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Customer name"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-madas-text/80 mb-1 block">Contact</span>
                  <input
                    type="tel"
                    value={newCustomer.contact}
                    onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Phone number"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-madas-text/80 mb-1 block">Email</span>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Email address"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-[#1f3c19] transition-colors"
              >
                Create & Select
              </button>
            </div>
          </div>
        )}

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-icons animate-spin text-primary text-4xl">progress_activity</span>
            </div>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className={`w-full text-left rounded-lg border p-4 transition-all ${
                    selectedCustomer?.name === customer.name
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/30 hover:bg-base'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-primary">{customer.name}</p>
                      {customer.phone && (
                        <p className="text-sm text-madas-text/70 mt-1">{customer.phone}</p>
                      )}
                      {customer.email && (
                        <p className="text-sm text-madas-text/70">{customer.email}</p>
                      )}
                    </div>
                    {selectedCustomer?.name === customer.name && (
                      <span className="material-icons text-primary">check_circle</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-icons text-6xl text-madas-text/30 mb-4">group</span>
              <p className="text-sm font-medium text-madas-text/70 mb-1">No customers found</p>
              <p className="text-xs text-madas-text/60">
                {searchQuery ? 'Try a different search term' : 'Create a new customer to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSelectModal;

