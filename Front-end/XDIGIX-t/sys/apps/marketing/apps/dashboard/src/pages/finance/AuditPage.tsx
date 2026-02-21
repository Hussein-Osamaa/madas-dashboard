import { useState, useEffect, useMemo } from 'react';
import { useFinanceScope } from '../../hooks/useFinanceScope';
import { useAuth } from '../../contexts/AuthContext';
import { collection, db, getDocs, query, orderBy, where, Timestamp } from '../../lib/firebase';
import { format } from 'date-fns';

type AuditLogEntry = {
  id: string;
  action: string;
  module: string;
  entityId: string;
  entityName: string;
  changes?: Record<string, { old: any; new: any }>;
  user: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
};

const AuditPage = () => {
  const scope = useFinanceScope();
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    module: 'all',
    user: 'all',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date()
  });

  useEffect(() => {
    const loadAuditLogs = async () => {
      if (!scope.businessId) return;
      try {
        // Load audit logs from various finance collections
        const logs: AuditLogEntry[] = [];

        // Load from transactions
        const transactionsRef = collection(db, 'businesses', scope.businessId, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsRef);
        transactionsSnapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.metadata?.auditLog) {
            logs.push({
              id: `transaction-${docSnap.id}`,
              action: data.metadata.auditLog.action || 'created',
              module: 'transactions',
              entityId: docSnap.id,
              entityName: data.description || 'Transaction',
              changes: data.metadata.auditLog.changes,
              user: data.metadata.auditLog.user || 'Unknown',
              userId: data.metadata.auditLog.userId || '',
              timestamp: data.metadata.auditLog.timestamp?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
              metadata: data.metadata.auditLog.metadata
            });
          }
        });

        // Load from expenses
        const expensesRef = collection(db, 'businesses', scope.businessId, 'expenses');
        const expensesSnapshot = await getDocs(expensesRef);
        expensesSnapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.metadata?.auditLog) {
            logs.push({
              id: `expense-${docSnap.id}`,
              action: data.metadata.auditLog.action || 'created',
              module: 'expenses',
              entityId: docSnap.id,
              entityName: data.description || 'Expense',
              changes: data.metadata.auditLog.changes,
              user: data.metadata.auditLog.user || 'Unknown',
              userId: data.metadata.auditLog.userId || '',
              timestamp: data.metadata.auditLog.timestamp?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
              metadata: data.metadata.auditLog.metadata
            });
          }
        });

        // Load from payments
        const paymentsRef = collection(db, 'businesses', scope.businessId, 'payments');
        const paymentsSnapshot = await getDocs(paymentsRef);
        paymentsSnapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.metadata?.auditLog) {
            logs.push({
              id: `payment-${docSnap.id}`,
              action: data.metadata.auditLog.action || 'created',
              module: 'payments',
              entityId: docSnap.id,
              entityName: data.description || 'Payment',
              changes: data.metadata.auditLog.changes,
              user: data.metadata.auditLog.user || 'Unknown',
              userId: data.metadata.auditLog.userId || '',
              timestamp: data.metadata.auditLog.timestamp?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
              metadata: data.metadata.auditLog.metadata
            });
          }
        });

        // Load from accounts
        const accountsRef = collection(db, 'businesses', scope.businessId, 'accounts');
        const accountsSnapshot = await getDocs(accountsRef);
        accountsSnapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.metadata?.auditLog) {
            logs.push({
              id: `account-${docSnap.id}`,
              action: data.metadata.auditLog.action || 'created',
              module: 'accounts',
              entityId: docSnap.id,
              entityName: data.name || 'Account',
              changes: data.metadata.auditLog.changes,
              user: data.metadata.auditLog.user || 'Unknown',
              userId: data.metadata.auditLog.userId || '',
              timestamp: data.metadata.auditLog.timestamp?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
              metadata: data.metadata.auditLog.metadata
            });
          }
        });

        // Sort by timestamp (most recent first)
        logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setAuditLogs(logs);
      } catch (error) {
        console.error('Failed to load audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadAuditLogs();
  }, [scope.businessId]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (filters.module !== 'all' && log.module !== filters.module) return false;
      if (filters.user !== 'all' && log.userId !== filters.user) return false;
      if (filters.startDate && log.timestamp < filters.startDate) return false;
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (log.timestamp > endDate) return false;
      }
      return true;
    });
  }, [auditLogs, filters]);

  const uniqueModules = useMemo(() => {
    const modules = new Set(auditLogs.map((log) => log.module));
    return Array.from(modules);
  }, [auditLogs]);

  const uniqueUsers = useMemo(() => {
    const users = new Set(auditLogs.map((log) => log.userId).filter(Boolean));
    return Array.from(users);
  }, [auditLogs]);

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'bg-green-100 text-green-600';
      case 'updated':
        return 'bg-blue-100 text-blue-600';
      case 'deleted':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (!scope.canManage) {
    return (
      <section className="px-6 py-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-madas-text/60">
          You don't have permission to access the finance audit log.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-6 py-8">
      <header>
        <h2 className="text-3xl font-bold text-primary">Audit Log</h2>
        <p className="text-sm text-madas-text/70">
          Trace every change across finance entities. Filter by module, user and date.
        </p>
      </header>

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">Module</label>
            <select
              value={filters.module}
              onChange={(e) => setFilters((prev) => ({ ...prev, module: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">All Modules</option>
              {uniqueModules.map((module) => (
                <option key={module} value={module}>
                  {module.charAt(0).toUpperCase() + module.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">User</label>
            <select
              value={filters.user}
              onChange={(e) => setFilters((prev) => ({ ...prev, user: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map((userId) => {
                const log = auditLogs.find((l) => l.userId === userId);
                return (
                  <option key={userId} value={userId}>
                    {log?.user || userId}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">Start Date</label>
            <input
              type="date"
              value={format(filters.startDate, 'yyyy-MM-dd')}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  startDate: e.target.value ? new Date(e.target.value) : new Date()
                }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-madas-text/80 mb-2">End Date</label>
            <input
              type="date"
              value={format(filters.endDate, 'yyyy-MM-dd')}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  endDate: e.target.value ? new Date(e.target.value) : new Date()
                }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <header className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary">Audit Trail</h3>
              <p className="text-sm text-madas-text/70">
                {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} found
              </p>
            </div>
            {scope.canExport && (
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors"
              >
                <span className="material-icons text-base mr-1 align-middle">download</span>
                Export
              </button>
            )}
          </div>
        </header>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-icons animate-spin text-primary text-2xl">progress_activity</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="material-icons text-4xl text-madas-text/30 mb-2">history</span>
              <p className="text-sm text-madas-text/60">No audit log entries found</p>
              <p className="text-xs text-madas-text/50 mt-1">
                Audit logs are created when finance entities are modified
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-madas-text/70 uppercase tracking-wider">
                    Changes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-base transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                      {format(log.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/80 capitalize">
                      {log.module}
                    </td>
                    <td className="px-6 py-4 text-sm text-madas-text/80">{log.entityName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">{log.user}</td>
                    <td className="px-6 py-4 text-sm text-madas-text/70">
                      {log.changes ? (
                        <details className="cursor-pointer">
                          <summary className="text-primary hover:underline">View Changes</summary>
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            {Object.entries(log.changes).map(([key, change]) => (
                              <div key={key} className="mb-1">
                                <strong>{key}:</strong> {JSON.stringify(change.old)} →{' '}
                                {JSON.stringify(change.new)}
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : (
                        <span className="text-madas-text/50">—</span>
                      )}
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

export default AuditPage;
