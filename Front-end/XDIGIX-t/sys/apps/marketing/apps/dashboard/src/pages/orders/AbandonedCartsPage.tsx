import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../hooks/useCurrency';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { collection, db, getDocs, query, limit as fbLimit } from '../../lib/firebase';
import { getPreferredPublicUrl } from '../../utils/siteUrls';
import {
  AbandonedCart,
  fetchAbandonedCarts,
  markCartRecovered,
  markRecoveryEmailSent,
  deleteAbandonedCart
} from '../../services/abandonedCartsService';

type StatusFilter = 'all' | 'active' | 'recovered' | 'expired';

const AbandonedCartsPage = () => {
  const { businessId, loading: bizLoading } = useBusiness();
  const { formatCurrency } = useCurrency();

  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  // Fetch store URL for linking
  useEffect(() => {
    if (!businessId) return;
    (async () => {
      try {
        const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
        const snap = await getDocs(query(sitesRef, fbLimit(1)));
        if (!snap.empty) {
          const siteDoc = snap.docs[0];
          const d = siteDoc.data();
          const url = getPreferredPublicUrl(siteDoc.id, d.customDomain || null, d.slug || null);
          setStoreUrl(url);
        }
      } catch { /* ignore */ }
    })();
  }, [businessId]);

  const loadCarts = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const data = await fetchAbandonedCarts(businessId);
      setCarts(data);
    } catch (err) {
      console.error('Failed to load abandoned carts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadCarts();
  }, [loadCarts]);

  // Stats
  const stats = useMemo(() => {
    const active = carts.filter(c => c.status === 'active');
    const recovered = carts.filter(c => c.status === 'recovered');
    const totalValue = active.reduce((sum, c) => sum + c.totalValue, 0);
    const recoveredValue = recovered.reduce((sum, c) => sum + c.totalValue, 0);

    return {
      totalAbandoned: carts.length,
      activeCount: active.length,
      recoveredCount: recovered.length,
      expiredCount: carts.filter(c => c.status === 'expired').length,
      totalAtRisk: totalValue,
      recoveredValue,
      recoveryRate: carts.length > 0
        ? Math.round((recovered.length / carts.length) * 100)
        : 0
    };
  }, [carts]);

  // Filter
  const filteredCarts = useMemo(() => {
    return carts.filter(cart => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        cart.customerName.toLowerCase().includes(term) ||
        (cart.customerEmail || '').toLowerCase().includes(term) ||
        (cart.customerPhone || '').includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || cart.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [carts, searchTerm, statusFilter]);

  const handleSendRecoveryEmail = async (cart: AbandonedCart) => {
    if (!businessId) return;
    setActionLoading(cart.id);
    try {
      await markRecoveryEmailSent(businessId, cart.id);
      await loadCarts();
    } catch {
      alert('Failed to mark recovery email. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertToOrder = async (cart: AbandonedCart) => {
    if (!businessId) return;
    setActionLoading(cart.id);
    try {
      await markCartRecovered(businessId, cart.id);
      await loadCarts();
      setSelectedCart(null);
    } catch {
      alert('Failed to convert cart.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCart = async (cart: AbandonedCart) => {
    if (!businessId) return;
    if (!confirm('Delete this abandoned cart record?')) return;
    setActionLoading(cart.id);
    try {
      await deleteAbandonedCart(businessId, cart.id);
      setCarts(prev => prev.filter(c => c.id !== cart.id));
      if (selectedCart?.id === cart.id) setSelectedCart(null);
    } catch {
      alert('Failed to delete cart.');
    } finally {
      setActionLoading(null);
    }
  };

  if (bizLoading) {
    return <FullScreenLoader message="Loading abandoned carts..." />;
  }

  return (
    <div className="space-y-6 px-6 py-8">
      {/* Header */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Abandoned Carts</h1>
          <p className="text-sm text-madas-text/70">
            Recover lost sales by following up with customers who left items in their cart.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {storeUrl && (
            <a
              href={`${storeUrl}/cart`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text transition-colors hover:bg-base"
            >
              <span className="material-icons text-base">open_in_new</span>
              View Store Cart
            </a>
          )}
          <button
            type="button"
            onClick={loadCarts}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text transition-colors hover:bg-base"
          >
            <span className="material-icons text-base">refresh</span>
            Refresh
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
              <span className="material-icons text-2xl text-orange-600">shopping_cart</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-madas-text/50">Active Carts</p>
              <p className="text-2xl font-bold text-primary">{stats.activeCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <span className="material-icons text-2xl text-red-600">attach_money</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-madas-text/50">Value at Risk</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalAtRisk)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <span className="material-icons text-2xl text-green-600">check_circle</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-madas-text/50">Recovered</p>
              <p className="text-2xl font-bold text-green-600">{stats.recoveredCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <span className="material-icons text-2xl text-blue-600">trending_up</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-madas-text/50">Recovery Rate</p>
              <p className="text-2xl font-bold text-blue-600">{stats.recoveryRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-madas-text/40">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, email, or phone..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'recovered', 'expired'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={clsx(
                'rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors',
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 text-madas-text hover:bg-base'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Carts Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredCarts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <span className="material-icons mb-4 text-6xl text-madas-text/30">remove_shopping_cart</span>
          <h3 className="text-lg font-semibold text-madas-text/70">No abandoned carts found</h3>
          <p className="text-sm text-madas-text/50 mt-1 max-w-md">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'When customers add items to their cart on your live store, abandoned carts will automatically appear here. Carts are tracked in real-time from your website.'}
          </p>
          {!searchTerm && statusFilter === 'all' && storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-base"
            >
              <span className="material-icons text-base">storefront</span>
              Visit Your Store
            </a>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Abandoned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Recovery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCarts.map((cart) => {
                  const statusStyles: Record<AbandonedCart['status'], string> = {
                    active: 'bg-orange-100 text-orange-600',
                    recovered: 'bg-green-100 text-green-600',
                    expired: 'bg-gray-100 text-gray-600'
                  };
                  const busy = actionLoading === cart.id;

                  return (
                    <tr key={cart.id} className="transition-colors hover:bg-base/60">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-primary">{cart.customerName}</span>
                          <span className="text-xs text-madas-text/50">{cart.customerEmail || cart.customerPhone || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                        <div className="flex flex-col">
                          <span>{cart.items.length} item{cart.items.length !== 1 ? 's' : ''}</span>
                          <span className="text-xs text-madas-text/50 truncate max-w-[150px]">
                            {cart.items.map(i => i.name).join(', ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {formatCurrency(cart.totalValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                        <div className="flex flex-col">
                          <span>{formatDistanceToNow(cart.lastActivity, { addSuffix: true })}</span>
                          <span className="text-xs text-madas-text/50">
                            {format(cart.createdAt, 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize',
                          statusStyles[cart.status]
                        )}>
                          <span className="material-icons text-xs">
                            {cart.status === 'active' ? 'schedule' : cart.status === 'recovered' ? 'check_circle' : 'cancel'}
                          </span>
                          {cart.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col">
                          <span className={cart.recoveryEmailSent ? 'text-green-600' : 'text-madas-text/50'}>
                            {cart.recoveryEmailSent ? '✓ Email sent' : 'Not sent'}
                          </span>
                          <span className="text-xs text-madas-text/50">
                            {cart.recoveryAttempts} attempt{cart.recoveryAttempts !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {cart.status === 'active' && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleSendRecoveryEmail(cart)}
                                className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-madas-text transition-colors hover:bg-base disabled:opacity-50"
                                title="Mark recovery email sent"
                              >
                                <span className="material-icons text-sm">mail</span>
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleConvertToOrder(cart)}
                                className="rounded-lg bg-primary px-3 py-1 text-xs text-white transition-colors hover:bg-[#1f3c19] disabled:opacity-50"
                                title="Mark as recovered"
                              >
                                <span className="material-icons text-sm">check</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedCart(cart)}
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-madas-text transition-colors hover:bg-base"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDeleteCart(cart)}
                            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                            title="Delete"
                          >
                            <span className="material-icons text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cart Detail Modal */}
      {selectedCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-semibold text-primary">Cart Details</h3>
              <button
                type="button"
                onClick={() => setSelectedCart(null)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <span className="material-icons text-madas-text/60">close</span>
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* Customer Info */}
              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="text-sm font-medium text-madas-text mb-2">Customer</h4>
                <p className="font-medium text-primary">{selectedCart.customerName}</p>
                {selectedCart.customerEmail && (
                  <p className="text-sm text-madas-text/70">{selectedCart.customerEmail}</p>
                )}
                {selectedCart.customerPhone && (
                  <p className="text-sm text-madas-text/70">{selectedCart.customerPhone}</p>
                )}
              </div>

              {/* Cart Items */}
              <div>
                <h4 className="text-sm font-medium text-madas-text mb-2">Items in Cart</h4>
                <div className="space-y-2">
                  {selectedCart.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="material-icons text-gray-400">image</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-madas-text">{item.name}</p>
                          <p className="text-xs text-madas-text/50">
                            Qty: {item.quantity}
                            {item.size ? ` · Size: ${item.size}` : ''}
                            {item.color ? ` · ${item.color}` : ''}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium text-primary">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-lg bg-primary/5 p-4">
                <span className="font-medium text-madas-text">Total Value</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(selectedCart.totalValue)}</span>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-sm font-medium text-madas-text mb-2">Activity</h4>
                <div className="text-sm text-madas-text/70 space-y-1">
                  <p>Created: {format(selectedCart.createdAt, 'MMM d, yyyy h:mm a')}</p>
                  <p>Last activity: {format(selectedCart.lastActivity, 'MMM d, yyyy h:mm a')}</p>
                  <p>Source: {selectedCart.source || 'website'}</p>
                  <p>Session ID: <span className="font-mono text-xs">{selectedCart.id}</span></p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              {selectedCart.status === 'active' && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading === selectedCart.id}
                    onClick={() => handleSendRecoveryEmail(selectedCart)}
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text hover:bg-base disabled:opacity-50"
                  >
                    Mark Email Sent
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading === selectedCart.id}
                    onClick={() => handleConvertToOrder(selectedCart)}
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#1f3c19] disabled:opacity-50"
                  >
                    Mark Recovered
                  </button>
                </>
              )}
              {selectedCart.status !== 'active' && (
                <button
                  type="button"
                  onClick={() => setSelectedCart(null)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text hover:bg-base"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbandonedCartsPage;
