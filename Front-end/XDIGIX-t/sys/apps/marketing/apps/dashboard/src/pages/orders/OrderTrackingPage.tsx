import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { useBusiness } from '../../contexts/BusinessContext';
import { useCurrency } from '../../hooks/useCurrency';
import FullScreenLoader from '../../components/common/FullScreenLoader';
import { useOrders } from '../../hooks/useOrders';
import { Order, OrderStatus } from '../../services/ordersService';
import { useShippingIntegrations } from '../../hooks/useShippingIntegrations';

// Order status configuration with timeline order
const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: string; color: string; bgColor: string; step: number }> = {
  pending: {
    label: 'Pending',
    icon: 'hourglass_empty',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    step: 1
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    icon: 'inventory_2',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    step: 2
  },
  processing: {
    label: 'In Transit',
    icon: 'local_shipping',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    step: 3
  },
  completed: {
    label: 'Delivered',
    icon: 'check_circle',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    step: 4
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'cancel',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    step: -1
  }
};

// Bosta status mapping
const BOSTA_STATUS_CONFIG: Record<number, { label: string; icon: string; color: string }> = {
  10: { label: 'Delivery Created', icon: 'add_circle', color: 'text-blue-500' },
  20: { label: 'Package Received', icon: 'inventory', color: 'text-indigo-500' },
  21: { label: 'Picked Up', icon: 'local_shipping', color: 'text-purple-500' },
  22: { label: 'In Transit', icon: 'moving', color: 'text-purple-600' },
  24: { label: 'Out for Delivery', icon: 'delivery_dining', color: 'text-orange-500' },
  30: { label: 'Waiting for Customer', icon: 'schedule', color: 'text-yellow-600' },
  41: { label: 'Delivered', icon: 'check_circle', color: 'text-green-500' },
  45: { label: 'Completed', icon: 'task_alt', color: 'text-green-600' },
  46: { label: 'Returned', icon: 'keyboard_return', color: 'text-red-500' },
  47: { label: 'Cancelled', icon: 'cancel', color: 'text-red-600' },
  48: { label: 'Failed Delivery', icon: 'error', color: 'text-red-500' }
};

type ViewMode = 'timeline' | 'kanban' | 'list';
type FilterStatus = 'all' | 'active' | OrderStatus;

const OrderTrackingPage = () => {
  const { businessId, loading } = useBusiness();
  const { formatCurrency } = useCurrency();
  const { orders, isLoading, updateOrder } = useOrders(businessId);
  const { isBostaEnabled } = useShippingIntegrations(businessId);

  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Filter by status
    if (filterStatus === 'active') {
      result = result.filter(o => !['completed', 'cancelled'].includes(o.status));
    } else if (filterStatus !== 'all') {
      result = result.filter(o => o.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o =>
        o.customerName?.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term) ||
        o.bostaTrackingNumber?.toLowerCase().includes(term) ||
        o.customerContact?.includes(term)
      );
    }

    // Sort by date (newest first)
    return result.sort((a, b) => {
      const dateA = a.createdAt || a.date || new Date(0);
      const dateB = b.createdAt || b.date || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [orders, filterStatus, searchTerm]);

  // Group orders by status for Kanban view
  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, Order[]> = {
      pending: [],
      ready_for_pickup: [],
      processing: [],
      completed: [],
      cancelled: []
    };

    filteredOrders.forEach(order => {
      grouped[order.status].push(order);
    });

    return grouped;
  }, [filteredOrders]);

  // Stats
  const stats = useMemo(() => ({
    total: orders.length,
    active: orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length,
    pending: orders.filter(o => o.status === 'pending').length,
    readyForPickup: orders.filter(o => o.status === 'ready_for_pickup').length,
    inTransit: orders.filter(o => o.status === 'processing').length,
    delivered: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  }), [orders]);

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrder({ orderId, payload: { status: newStatus } });
  };

  if (loading || isLoading) {
    return <FullScreenLoader message="Loading order tracking..." />;
  }

  return (
    <div className="space-y-6 px-6 py-8">
      {/* Header */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Order Tracking</h1>
          <p className="text-sm text-madas-text/70">
            Track your orders from creation to delivery
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['timeline', 'kanban', 'list'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={clsx(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  viewMode === mode
                    ? 'bg-primary text-white'
                    : 'bg-white text-madas-text hover:bg-gray-50'
                )}
              >
                <span className="material-icons text-base align-middle mr-1">
                  {mode === 'timeline' ? 'timeline' : mode === 'kanban' ? 'view_kanban' : 'list'}
                </span>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <span className="material-icons text-gray-600">receipt_long</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-madas-text/60">Total Orders</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <span className="material-icons text-blue-600">pending_actions</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              <p className="text-xs text-madas-text/60">Active</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <span className="material-icons text-amber-600">hourglass_empty</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-madas-text/60">Pending</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
              <span className="material-icons text-cyan-600">inventory_2</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-600">{stats.readyForPickup}</p>
              <p className="text-xs text-madas-text/60">Ready for Pickup</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <span className="material-icons text-purple-600">local_shipping</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.inTransit}</p>
              <p className="text-xs text-madas-text/60">In Transit</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <span className="material-icons text-green-600">check_circle</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-xs text-madas-text/60">Delivered</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <span className="material-icons text-red-600">cancel</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              <p className="text-xs text-madas-text/60">Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-base/40 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
            <span className="material-icons text-madas-text/60 text-sm">search</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, or tracking number..."
              className="w-64 bg-transparent text-xs text-madas-text focus:outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All Orders</option>
            <option value="active">Active Orders</option>
            <option value="pending">Pending</option>
            <option value="ready_for_pickup">Ready for Pickup</option>
            <option value="processing">In Transit</option>
            <option value="completed">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="text-sm text-madas-text/60">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* Content based on view mode */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <span className="material-icons text-5xl text-madas-text/30">local_shipping</span>
          <div>
            <h3 className="text-lg font-semibold text-primary">No orders to track</h3>
            <p className="text-sm text-madas-text/60">
              {filterStatus === 'active' ? 'No active orders at the moment' : 'No orders match your filters'}
            </p>
          </div>
        </div>
      ) : viewMode === 'timeline' ? (
        <TimelineView 
          orders={filteredOrders} 
          onOrderClick={openOrderDetail}
          formatCurrency={formatCurrency}
          isBostaEnabled={!!isBostaEnabled}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanView 
          ordersByStatus={ordersByStatus}
          onOrderClick={openOrderDetail}
          onStatusUpdate={handleStatusUpdate}
          formatCurrency={formatCurrency}
        />
      ) : (
        <ListView 
          orders={filteredOrders}
          onOrderClick={openOrderDetail}
          formatCurrency={formatCurrency}
          isBostaEnabled={!!isBostaEnabled}
        />
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOrder(null);
          }}
          onStatusUpdate={handleStatusUpdate}
          formatCurrency={formatCurrency}
          isBostaEnabled={!!isBostaEnabled}
        />
      )}
    </div>
  );
};

// Timeline View Component
const TimelineView = ({ 
  orders, 
  onOrderClick, 
  formatCurrency,
  isBostaEnabled
}: { 
  orders: Order[]; 
  onOrderClick: (order: Order) => void;
  formatCurrency: (amount: number) => string;
  isBostaEnabled: boolean;
}) => (
  <div className="space-y-4">
    {orders.map(order => (
      <div
        key={order.id}
        className="rounded-xl border border-gray-100 bg-white p-6 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onOrderClick(order)}
      >
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Order Info */}
          <div className="flex-shrink-0 lg:w-64">
            <div className="flex items-center gap-3 mb-2">
              <div className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                STATUS_CONFIG[order.status].bgColor
              )}>
                <span className={clsx('material-icons', STATUS_CONFIG[order.status].color)}>
                  {STATUS_CONFIG[order.status].icon}
                </span>
              </div>
              <div>
                <p className="font-semibold text-primary">#{order.id.slice(-6)}</p>
                <p className="text-xs text-madas-text/60">
                  {order.createdAt ? formatDistanceToNow(order.createdAt, { addSuffix: true }) : 'Unknown'}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm font-medium text-madas-text">{order.customerName}</p>
              <p className="text-xs text-madas-text/60">{order.customerContact}</p>
              <p className="text-sm font-bold text-primary">{formatCurrency(order.total)}</p>
            </div>
            {isBostaEnabled && order.bostaTrackingNumber && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-red-50 text-red-600 font-medium">
                  Bosta: {order.bostaTrackingNumber}
                </span>
              </div>
            )}
          </div>

          {/* Timeline Progress */}
          <div className="flex-1">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full" />
              <div 
                className="absolute top-5 left-0 h-1 bg-primary rounded-full transition-all"
                style={{ 
                  width: order.status === 'cancelled' ? '0%' : 
                         `${((STATUS_CONFIG[order.status].step - 1) / 3) * 100}%` 
                }}
              />

              {/* Status Steps */}
              <div className="relative flex justify-between">
                {(['pending', 'ready_for_pickup', 'processing', 'completed'] as OrderStatus[]).map((status, index) => {
                  const config = STATUS_CONFIG[status];
                  const currentStep = STATUS_CONFIG[order.status].step;
                  const isActive = config.step <= currentStep && order.status !== 'cancelled';
                  const isCurrent = order.status === status;

                  return (
                    <div key={status} className="flex flex-col items-center">
                      <div className={clsx(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                        isActive ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-400',
                        isCurrent && 'ring-4 ring-primary/20'
                      )}>
                        <span className="material-icons text-lg">{config.icon}</span>
                      </div>
                      <p className={clsx(
                        'mt-2 text-xs font-medium',
                        isActive ? 'text-primary' : 'text-gray-400'
                      )}>
                        {config.label}
                      </p>
                      {index === 0 && order.createdAt && (
                        <p className="text-[10px] text-madas-text/50 mt-1">
                          {format(order.createdAt, 'MMM d, HH:mm')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cancelled Badge */}
            {order.status === 'cancelled' && (
              <div className="mt-4 flex items-center gap-2 text-red-600">
                <span className="material-icons text-sm">cancel</span>
                <span className="text-sm font-medium">Order Cancelled</span>
              </div>
            )}

            {/* Bosta Timeline */}
            {isBostaEnabled && order.bostaTimeline && order.bostaTimeline.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-madas-text/60 mb-2">Bosta Tracking Updates</p>
                <div className="flex flex-wrap gap-2">
                  {order.bostaTimeline.slice(-3).map((event, idx) => {
                    const statusConfig = BOSTA_STATUS_CONFIG[event.state?.value || 0];
                    return (
                      <div key={idx} className="flex items-center gap-1 text-xs bg-gray-50 rounded px-2 py-1">
                        <span className={clsx('material-icons text-sm', statusConfig?.color || 'text-gray-500')}>
                          {statusConfig?.icon || 'info'}
                        </span>
                        <span>{statusConfig?.label || 'Unknown'}</span>
                        {event.timestamp && (
                          <span className="text-madas-text/50">
                            • {format(new Date(event.timestamp), 'MMM d')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Kanban View Component
const KanbanView = ({
  ordersByStatus,
  onOrderClick,
  onStatusUpdate,
  formatCurrency
}: {
  ordersByStatus: Record<OrderStatus, Order[]>;
  onOrderClick: (order: Order) => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => void;
  formatCurrency: (amount: number) => string;
}) => {
  const statusOrder: OrderStatus[] = ['pending', 'ready_for_pickup', 'processing', 'completed', 'cancelled'];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statusOrder.map(status => {
        const config = STATUS_CONFIG[status];
        const orders = ordersByStatus[status];

        return (
          <div key={status} className="flex-shrink-0 w-72">
            {/* Column Header */}
            <div className={clsx(
              'rounded-t-lg px-4 py-3 flex items-center justify-between',
              config.bgColor
            )}>
              <div className="flex items-center gap-2">
                <span className={clsx('material-icons text-lg', config.color)}>{config.icon}</span>
                <span className={clsx('font-semibold text-sm', config.color)}>{config.label}</span>
              </div>
              <span className={clsx(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                config.bgColor,
                config.color
              )}>
                {orders.length}
              </span>
            </div>

            {/* Column Content */}
            <div className="bg-gray-50 rounded-b-lg p-3 min-h-[400px] space-y-3">
              {orders.map(order => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onOrderClick(order)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-primary">#{order.id.slice(-6)}</span>
                    <span className="text-[10px] text-madas-text/50">
                      {order.createdAt ? formatDistanceToNow(order.createdAt, { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-madas-text mb-1">{order.customerName}</p>
                  <p className="text-xs text-madas-text/60 mb-2">{order.productCount} items</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-primary">{formatCurrency(order.total)}</span>
                    {order.bostaTrackingNumber && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                        Bosta
                      </span>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {!['completed', 'cancelled'].includes(status) && (
                    <div className="mt-3 pt-2 border-t border-gray-100 flex gap-2">
                      {status === 'pending' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onStatusUpdate(order.id, 'ready_for_pickup'); }}
                          className="flex-1 text-[10px] bg-blue-50 text-blue-600 rounded px-2 py-1 hover:bg-blue-100"
                        >
                          Mark Ready
                        </button>
                      )}
                      {status === 'ready_for_pickup' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onStatusUpdate(order.id, 'processing'); }}
                          className="flex-1 text-[10px] bg-purple-50 text-purple-600 rounded px-2 py-1 hover:bg-purple-100"
                        >
                          Mark In Transit
                        </button>
                      )}
                      {status === 'processing' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onStatusUpdate(order.id, 'completed'); }}
                          className="flex-1 text-[10px] bg-green-50 text-green-600 rounded px-2 py-1 hover:bg-green-100"
                        >
                          Mark Delivered
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {orders.length === 0 && (
                <div className="text-center py-8 text-madas-text/40">
                  <span className="material-icons text-2xl">inbox</span>
                  <p className="text-xs mt-1">No orders</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// List View Component
const ListView = ({
  orders,
  onOrderClick,
  formatCurrency,
  isBostaEnabled
}: {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  formatCurrency: (amount: number) => string;
  isBostaEnabled: boolean;
}) => (
  <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
            Order
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
            Customer
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
            Status
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
            Items
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
            Total
          </th>
          {isBostaEnabled && (
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
              Tracking
            </th>
          )}
          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">
            Date
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {orders.map(order => {
          const statusConfig = STATUS_CONFIG[order.status];
          return (
            <tr
              key={order.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onOrderClick(order)}
            >
              <td className="px-4 py-4 whitespace-nowrap">
                <span className="font-medium text-primary">#{order.id.slice(-6)}</span>
              </td>
              <td className="px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-madas-text">{order.customerName}</p>
                  <p className="text-xs text-madas-text/60">{order.customerContact}</p>
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span className={clsx(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  statusConfig.bgColor,
                  statusConfig.color
                )}>
                  <span className="material-icons text-sm">{statusConfig.icon}</span>
                  {statusConfig.label}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-madas-text">
                {order.productCount} items
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-primary">
                {formatCurrency(order.total)}
              </td>
              {isBostaEnabled && (
                <td className="px-4 py-4 whitespace-nowrap">
                  {order.bostaTrackingNumber ? (
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-medium">
                      {order.bostaTrackingNumber}
                    </span>
                  ) : (
                    <span className="text-xs text-madas-text/40">-</span>
                  )}
                </td>
              )}
              <td className="px-4 py-4 whitespace-nowrap text-xs text-madas-text/60">
                {order.createdAt ? format(order.createdAt, 'MMM d, yyyy HH:mm') : '-'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// Order Detail Modal Component
const OrderDetailModal = ({
  order,
  onClose,
  onStatusUpdate,
  formatCurrency,
  isBostaEnabled
}: {
  order: Order;
  onClose: () => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => void;
  formatCurrency: (amount: number) => string;
  isBostaEnabled: boolean;
}) => {
  const statusConfig = STATUS_CONFIG[order.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'flex h-12 w-12 items-center justify-center rounded-xl',
              statusConfig.bgColor
            )}>
              <span className={clsx('material-icons text-xl', statusConfig.color)}>
                {statusConfig.icon}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Order #{order.id.slice(-6)}</h2>
              <p className="text-sm text-madas-text/60">
                Created {order.createdAt ? formatDistanceToNow(order.createdAt, { addSuffix: true }) : 'Unknown'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          {/* Status Timeline */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-madas-text mb-4">Order Progress</h3>
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-5 right-5 h-1 bg-gray-200 rounded-full" />
              <div 
                className="absolute top-5 left-5 h-1 bg-primary rounded-full transition-all"
                style={{ 
                  width: order.status === 'cancelled' ? '0%' : 
                         `${((STATUS_CONFIG[order.status].step - 1) / 3) * 100}%` 
                }}
              />

              <div className="relative flex justify-between">
                {(['pending', 'ready_for_pickup', 'processing', 'completed'] as OrderStatus[]).map((status) => {
                  const config = STATUS_CONFIG[status];
                  const currentStep = STATUS_CONFIG[order.status].step;
                  const isActive = config.step <= currentStep && order.status !== 'cancelled';
                  const isCurrent = order.status === status;

                  return (
                    <div key={status} className="flex flex-col items-center">
                      <div className={clsx(
                        'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                        isActive ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-400',
                        isCurrent && 'ring-4 ring-primary/20'
                      )}>
                        <span className="material-icons text-lg">{config.icon}</span>
                      </div>
                      <p className={clsx(
                        'mt-2 text-xs font-medium text-center',
                        isActive ? 'text-primary' : 'text-gray-400'
                      )}>
                        {config.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {order.status === 'cancelled' && (
              <div className="mt-4 flex items-center gap-2 text-red-600 justify-center">
                <span className="material-icons">cancel</span>
                <span className="font-medium">Order Cancelled</span>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-madas-text mb-3 flex items-center gap-2">
                <span className="material-icons text-lg text-primary">person</span>
                Customer
              </h3>
              <p className="text-sm font-medium text-madas-text">{order.customerName}</p>
              <p className="text-xs text-madas-text/60 mt-1">{order.customerContact}</p>
              {order.customerEmail && (
                <p className="text-xs text-madas-text/60">{order.customerEmail}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-madas-text mb-3 flex items-center gap-2">
                <span className="material-icons text-lg text-primary">location_on</span>
                Delivery Address
              </h3>
              {order.shippingAddress ? (
                <>
                  <p className="text-sm text-madas-text">{order.shippingAddress.address}</p>
                  <p className="text-xs text-madas-text/60 mt-1">
                    {[order.shippingAddress.district, order.shippingAddress.city].filter(Boolean).join(', ')}
                  </p>
                  {(order.shippingAddress.floor || order.shippingAddress.apartment) && (
                    <p className="text-xs text-madas-text/60">
                      Floor: {order.shippingAddress.floor}, Apt: {order.shippingAddress.apartment}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-madas-text/50">No address provided</p>
              )}
            </div>
          </div>

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-madas-text mb-3 flex items-center gap-2">
                <span className="material-icons text-lg text-primary">shopping_bag</span>
                Items ({order.productCount})
              </h3>
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-madas-text">{item.name} × {item.quantity}</span>
                    <span className="font-medium text-primary">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="font-semibold text-madas-text">Total</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(order.total)}</span>
              </div>
            </div>
          )}

          {/* Bosta Tracking */}
          {isBostaEnabled && order.bostaTrackingNumber && (
            <div className="bg-red-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 34 34" fill="none">
                  <path d="M32.6634 8.83273L17.7948 0.266462C17.2016 -0.0888208 16.4503 -0.0888208 15.8572 0.266462L0.9886 8.83273C0.39544 9.18801 0 9.81962 0 10.5302V23.0835C0 23.7941 0.355896 24.4257 0.9886 24.781L15.8572 33.3473C16.1735 33.5052 16.4899 33.6236 16.8458 33.6236C17.2016 33.6236 17.518 33.5447 17.8344 33.3473L32.7029 24.781C33.2961 24.4257 33.6915 23.7941 33.6915 23.0835V10.5302C33.6519 9.81962 33.2565 9.18801 32.6634 8.83273Z" fill="#E30613"/>
                </svg>
                Bosta Tracking
              </h3>
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="text-xs text-red-600/70">Tracking Number</p>
                  <p className="text-sm font-bold text-red-700">{order.bostaTrackingNumber}</p>
                </div>
                {order.bostaStatus && (
                  <div>
                    <p className="text-xs text-red-600/70">Status</p>
                    <p className="text-sm font-medium text-red-700">{order.bostaStatus}</p>
                  </div>
                )}
              </div>

              {order.bostaTimeline && order.bostaTimeline.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-xs font-medium text-red-600 mb-2">Tracking History</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {order.bostaTimeline.map((event, idx) => {
                      const statusConfig = BOSTA_STATUS_CONFIG[event.state?.value || 0];
                      return (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className={clsx('material-icons text-sm mt-0.5', statusConfig?.color || 'text-gray-500')}>
                            {statusConfig?.icon || 'info'}
                          </span>
                          <div>
                            <p className="font-medium text-red-700">{statusConfig?.label || 'Unknown'}</p>
                            {event.timestamp && (
                              <p className="text-red-600/60">{format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')}</p>
                            )}
                            {event.note && (
                              <p className="text-red-600/60 mt-0.5">{event.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-100">
          <div className="flex gap-2">
            {!['completed', 'cancelled'].includes(order.status) && (
              <button
                type="button"
                onClick={() => onStatusUpdate(order.id, 'cancelled')}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Cancel Order
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {order.status === 'pending' && (
              <button
                type="button"
                onClick={() => { onStatusUpdate(order.id, 'ready_for_pickup'); onClose(); }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Mark Ready for Pickup
              </button>
            )}
            {order.status === 'ready_for_pickup' && (
              <button
                type="button"
                onClick={() => { onStatusUpdate(order.id, 'processing'); onClose(); }}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Mark In Transit
              </button>
            )}
            {order.status === 'processing' && (
              <button
                type="button"
                onClick={() => { onStatusUpdate(order.id, 'completed'); onClose(); }}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mark Delivered
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;

