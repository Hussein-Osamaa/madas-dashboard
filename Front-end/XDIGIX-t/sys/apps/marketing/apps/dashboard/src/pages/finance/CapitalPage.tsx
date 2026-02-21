import { useState, useEffect, useMemo } from 'react';
import { useFinanceScope } from '../../hooks/useFinanceScope';
import { collection, db, getDocs, query, orderBy, where, Timestamp } from '../../lib/firebase';
import { format } from 'date-fns';

function toValidDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'number') { const d = new Date(v < 1e12 ? v * 1000 : v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    try { return (v as { toDate: () => Date }).toDate(); } catch { return null; }
  }
  if (typeof v === 'object' && v !== null) {
    const sec = (v as { seconds?: number; _seconds?: number }).seconds ?? (v as { _seconds?: number })._seconds;
    if (typeof sec === 'number' && Number.isFinite(sec)) {
      const d = new Date(sec * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function formatTimestamp(value: unknown, fmt: string, fallback = 'N/A'): string {
  try {
    const d = toValidDate(value);
    return d ? format(d, fmt) : fallback;
  } catch {
    return fallback;
  }
}

type ScanLogEntry = {
  id: string;
  type: 'order' | 'return';
  price: number;
  productName: string;
  timestamp: Date | null;
  user?: string;
};

const CapitalPage = () => {
  const scope = useFinanceScope();
  const [scanLogs, setScanLogs] = useState<ScanLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date()
  });

  useEffect(() => {
    const loadScanLogs = async () => {
      if (!scope.businessId) return;
      try {
        const scanLogsRef = collection(db, 'businesses', scope.businessId, 'scan_log');
        let q = query(scanLogsRef, orderBy('timestamp', 'desc'));

        if (dateRange.start && dateRange.end) {
          const startTimestamp = Timestamp.fromDate(dateRange.start);
          const endTimestamp = Timestamp.fromDate(
            new Date(dateRange.end.getTime() + 24 * 60 * 60 * 1000 - 1)
          );
          q = query(
            scanLogsRef,
            where('timestamp', '>=', startTimestamp),
            where('timestamp', '<=', endTimestamp),
            orderBy('timestamp', 'desc')
          );
        }

        const snapshot = await getDocs(q);
        const logs: ScanLogEntry[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const timestamp = toValidDate(data.timestamp);
            return {
              id: docSnap.id,
              type: (data.type as 'order' | 'return') || 'order',
              price: parseFloat(data.price || 0),
              productName: data.productName || 'Unknown Product',
              timestamp: timestamp ?? null,
              user: data.user || data.userId || 'Unknown'
            };
          })
          .filter((log) => log.type === 'order' || log.type === 'return');

        setScanLogs(logs);
      } catch (error) {
        console.error('Failed to load scan logs:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadScanLogs();
  }, [scope.businessId, dateRange.start, dateRange.end]);

  const metrics = useMemo(() => {
    const orders = scanLogs.filter((log) => log.type === 'order');
    const returns = scanLogs.filter((log) => log.type === 'return');

    const totalOrders = orders.reduce((sum, log) => sum + log.price, 0);
    const totalReturns = returns.reduce((sum, log) => sum + log.price, 0);
    const capitalReturn = totalOrders - totalReturns;
    const orderCount = orders.length;
    const returnCount = returns.length;
    const netTransactions = orderCount - returnCount;

    return {
      capitalReturn,
      totalOrders,
      totalReturns,
      orderCount,
      returnCount,
      netTransactions,
      avgOrderValue: orderCount > 0 ? totalOrders / orderCount : 0,
      returnRate: orderCount > 0 ? (returnCount / orderCount) * 100 : 0
    };
  }, [scanLogs]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: scope.currency
    }).format(amount);
  };

  if (!scope.canView) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don't have permission to view capital insights.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      <header>
        <h2 className="text-3xl font-bold text-primary">Capital Return</h2>
        <p className="text-sm text-madas-text/70">
          Track capital return from orders and returns based on scan log events
        </p>
      </header>

      {/* Date Range Filter */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-madas-text/80">Start Date:</label>
            <input
              type="date"
              value={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  start: e.target.value ? new Date(e.target.value) : null
                }))
              }
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-madas-text/80">End Date:</label>
            <input
              type="date"
              value={dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  end: e.target.value ? new Date(e.target.value) : null
                }))
              }
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              setDateRange({
                start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                end: new Date()
              })
            }
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
          >
            Reset to This Month
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <article className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-madas-text/70">Capital Return</p>
            <span className="material-icons text-green-600">trending_up</span>
          </div>
          <p className="text-2xl font-bold text-primary">
            {loading ? '—' : formatCurrency(metrics.capitalReturn)}
          </p>
          <p className="text-xs text-madas-text/60 mt-1">Net from orders and returns</p>
        </article>

        <article className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-madas-text/70">Total Orders</p>
            <span className="material-icons text-blue-600">shopping_cart</span>
          </div>
          <p className="text-2xl font-bold text-primary">
            {loading ? '—' : formatCurrency(metrics.totalOrders)}
          </p>
          <p className="text-xs text-madas-text/60 mt-1">{metrics.orderCount} transactions</p>
        </article>

        <article className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-madas-text/70">Total Returns</p>
            <span className="material-icons text-red-600">keyboard_return</span>
          </div>
          <p className="text-2xl font-bold text-primary">
            {loading ? '—' : formatCurrency(metrics.totalReturns)}
          </p>
          <p className="text-xs text-madas-text/60 mt-1">{metrics.returnCount} transactions</p>
        </article>

        <article className="card-hover rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-madas-text/70">Avg Order Value</p>
            <span className="material-icons text-purple-600">analytics</span>
          </div>
          <p className="text-2xl font-bold text-primary">
            {loading ? '—' : formatCurrency(metrics.avgOrderValue)}
          </p>
          <p className="text-xs text-madas-text/60 mt-1">
            {metrics.returnRate.toFixed(1)}% return rate
          </p>
        </article>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <header className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-primary">Recent Transactions</h3>
          <p className="text-sm text-madas-text/70">Orders and returns from scan log</p>
        </header>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-icons animate-spin text-primary text-2xl">progress_activity</span>
            </div>
          ) : scanLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-icons text-4xl text-madas-text/30 mb-2">receipt_long</span>
              <p className="text-sm text-madas-text/60">No transactions found for this period</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {scanLogs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="hover:bg-base transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                      {formatTimestamp(log.timestamp, 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.type === 'order'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {log.type === 'order' ? 'Order' : 'Return'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-madas-text/80">{log.productName}</td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        log.type === 'order' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {log.type === 'order' ? '+' : '-'}
                      {formatCurrency(log.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                      {log.user || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};

export default CapitalPage;
