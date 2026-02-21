import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useFinanceScope } from '../../hooks/useFinanceScope';
import { useCurrency } from '../../hooks/useCurrency';
import {
  fetchCalculations,
  fetchPayments,
  fetchPartners,
  getAllPartnerSummaries,
  type ProfitCalculation,
  type PartnerPayment,
  type Partner,
  type PartnerSummary
} from '../../services/finance/profitSettlementService';
import { fetchExpenses } from '../../services/finance/expensesService';
import { collection, getDocs, query, where, orderBy, Timestamp, db } from '../../lib/firebase';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

function toDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'object' && v !== null) {
    const sec = (v as { seconds?: number; _seconds?: number }).seconds ?? (v as { _seconds?: number })._seconds;
    if (typeof sec === 'number') return new Date(sec * 1000);
  }
  return null;
}

const AnalyticsPage = () => {
  const scope = useFinanceScope();
  const { formatCurrency } = useCurrency();
  const businessId = scope.businessId;

  // State
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [calculations, setCalculations] = useState<ProfitCalculation[]>([]);
  const [payments, setPayments] = useState<PartnerPayment[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [summaries, setSummaries] = useState<PartnerSummary[]>([]);
  const [deposits, setDeposits] = useState<{ date: Date; amount: number; category: string }[]>([]);
  const [expenses, setExpenses] = useState<{ date: Date; amount: number; category: string }[]>([]);

  // Calculate date range from date pickers
  const dateRange = useMemo(() => {
    return { 
      start: dayjs(startDate).startOf('day').toDate(), 
      end: dayjs(endDate).endOf('day').toDate() 
    };
  }, [startDate, endDate]);

  // Reset to this month
  const resetToThisMonth = () => {
    setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
    setEndDate(dayjs().format('YYYY-MM-DD'));
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!businessId) return;
      setLoading(true);
      try {
        // Use a wide date range for fetching all data (5 years)
        const wideRange = {
          start: dayjs().subtract(5, 'year'),
          end: dayjs()
        };

        // Fetch all data in parallel
        const [calcsData, paymentsData, partnersData, summariesData, expensesRaw] = await Promise.all([
          fetchCalculations(businessId),
          fetchPayments(businessId),
          fetchPartners(businessId),
          getAllPartnerSummaries(businessId),
          fetchExpenses(businessId, wideRange, {})
        ]);

        setCalculations(calcsData.filter(c => c.status !== 'voided'));
        setPayments(paymentsData.filter(p => !p.isVoided));
        setPartners(partnersData);
        setSummaries(summariesData);

        // Transform expenses (backend may return plain Date/string, not Firestore Timestamp)
        const expensesData = expensesRaw.map(e => ({
          date: toDate(e.createdAt) ?? new Date(0),
          amount: e.amount || 0,
          category: e.category || 'Other'
        }));
        setExpenses(expensesData);

        // Fetch deposits
        const depositsRef = collection(db, 'businesses', businessId, 'deposits');
        const depositsSnap = await getDocs(depositsRef);
        const depositsData = depositsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            date: toDate(data.date) ?? toDate(data.createdAt) ?? new Date(),
            amount: Number(data.amount) || 0,
            category: data.category || 'other'
          };
        });
        setDeposits(depositsData);
        
        console.log('[Analytics] Loaded data:', {
          deposits: depositsData.length,
          expenses: expensesData.length,
          totalExpenseAmount: expensesData.reduce((sum, e) => sum + e.amount, 0),
          totalDepositAmount: depositsData.reduce((sum, d) => sum + d.amount, 0)
        });
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [businessId]);

  // Filter data by date range
  const filteredDeposits = useMemo(() => 
    deposits.filter(d => d.date >= dateRange.start && d.date <= dateRange.end),
    [deposits, dateRange]
  );
  
  // Filter deposits for revenue calculation - EXCLUDE investments (they go to cash flow only, not profit)
  const revenueDeposits = useMemo(() => 
    filteredDeposits.filter(d => d.category !== 'investment'),
    [filteredDeposits]
  );

  const filteredExpenses = useMemo(() => {
    const filtered = expenses.filter(e => e.date >= dateRange.start && e.date <= dateRange.end);
    console.log('[Analytics] Filtered expenses:', {
      total: expenses.length,
      filtered: filtered.length,
      dateRange: { start: dateRange.start, end: dateRange.end },
      totalAmount: filtered.reduce((sum, e) => sum + e.amount, 0)
    });
    return filtered;
  }, [expenses, dateRange]);

  const filteredPayments = useMemo(() => 
    payments.filter(p => p.createdAt >= dateRange.start && p.createdAt <= dateRange.end),
    [payments, dateRange]
  );

  const filteredCalculations = useMemo(() => 
    calculations.filter(c => c.calculatedAt >= dateRange.start && c.calculatedAt <= dateRange.end),
    [calculations, dateRange]
  );

  // Summary statistics - Using revenueDeposits (excludes investments from profit calculation)
  const stats = useMemo(() => {
    const totalRevenue = revenueDeposits.reduce((sum, d) => sum + d.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalPayments = filteredPayments
      .filter(p => p.type === 'payment' || p.type === 'settlement')
      .reduce((sum, p) => sum + p.amount, 0);
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    return { totalRevenue, totalExpenses, netProfit, totalPayments, profitMargin };
  }, [revenueDeposits, filteredExpenses, filteredPayments]);

  // Revenue vs Expenses by month
  const revenueExpensesData = useMemo(() => {
    const monthMap = new Map<string, { month: string; revenue: number; expenses: number; profit: number }>();
    
    // Get all months in range
    let current = dayjs(dateRange.start).startOf('month');
    const end = dayjs(dateRange.end).endOf('month');
    while (current.isBefore(end) || current.isSame(end, 'month')) {
      const key = current.format('MMM YYYY');
      monthMap.set(key, { month: current.format('MMM'), revenue: 0, expenses: 0, profit: 0 });
      current = current.add(1, 'month');
    }

    // Add deposits (excluding investments - they don't count as revenue/profit)
    revenueDeposits.forEach(d => {
      const key = dayjs(d.date).format('MMM YYYY');
      const existing = monthMap.get(key);
      if (existing) {
        existing.revenue += d.amount;
        existing.profit = existing.revenue - existing.expenses;
      }
    });

    // Add expenses
    filteredExpenses.forEach(e => {
      const key = dayjs(e.date).format('MMM YYYY');
      const existing = monthMap.get(key);
      if (existing) {
        existing.expenses += e.amount;
        existing.profit = existing.revenue - existing.expenses;
      }
    });

    return Array.from(monthMap.values()).slice(-12);
  }, [revenueDeposits, filteredExpenses, dateRange]);

  // Partner distribution data
  const partnerDistributionData = useMemo(() => {
    return summaries.map(s => ({
      name: s.partner.name,
      value: s.totalProfitDue,
      percentage: s.partner.profitSharePercentage
    })).filter(p => p.value > 0);
  }, [summaries]);

  // Payment breakdown by type
  const paymentBreakdownData = useMemo(() => {
    const breakdown = {
      payment: 0,
      settlement: 0,
      adjustment: 0
    };
    
    filteredPayments.forEach(p => {
      if (p.type === 'payment') breakdown.payment += p.amount;
      else if (p.type === 'settlement') breakdown.settlement += p.amount;
      else if (p.type === 'adjustment') breakdown.adjustment += Math.abs(p.amount);
    });

    return [
      { name: 'Payments', value: breakdown.payment, color: '#22c55e' },
      { name: 'Settlements', value: breakdown.settlement, color: '#6366f1' },
      { name: 'Adjustments', value: breakdown.adjustment, color: '#f59e0b' }
    ].filter(p => p.value > 0);
  }, [filteredPayments]);

  // Expense breakdown by category
  const expenseBreakdownData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    filteredExpenses.forEach(e => {
      const current = categoryMap.get(e.category) || 0;
      categoryMap.set(e.category, current + e.amount);
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredExpenses]);

  // Daily trend data
  const dailyTrendData = useMemo(() => {
    const dayMap = new Map<string, { date: string; revenue: number; expenses: number }>();
    
    // Initialize days
    let current = dayjs(dateRange.start);
    const end = dayjs(dateRange.end);
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const key = current.format('YYYY-MM-DD');
      dayMap.set(key, { date: current.format('MMM D'), revenue: 0, expenses: 0 });
      current = current.add(1, 'day');
    }

    revenueDeposits.forEach(d => {
      const key = dayjs(d.date).format('YYYY-MM-DD');
      const existing = dayMap.get(key);
      if (existing) existing.revenue += d.amount;
    });

    filteredExpenses.forEach(e => {
      const key = dayjs(e.date).format('YYYY-MM-DD');
      const existing = dayMap.get(key);
      if (existing) existing.expenses += e.amount;
    });

    // Calculate days in range
    const daysInRange = dayjs(dateRange.end).diff(dayjs(dateRange.start), 'day');
    
    // For longer periods (more than 60 days), aggregate by week
    if (daysInRange > 60) {
      const weekMap = new Map<string, { date: string; revenue: number; expenses: number }>();
      Array.from(dayMap.entries()).forEach(([key, value]) => {
        const weekKey = dayjs(key).startOf('week').format('MMM D');
        const existing = weekMap.get(weekKey) || { date: weekKey, revenue: 0, expenses: 0 };
        existing.revenue += value.revenue;
        existing.expenses += value.expenses;
        weekMap.set(weekKey, existing);
      });
      return Array.from(weekMap.values()).slice(-24);
    }

    return Array.from(dayMap.values()).slice(-60);
  }, [revenueDeposits, filteredExpenses, dateRange]);

  // Partner balance status
  const partnerBalanceData = useMemo(() => {
    return summaries.map(s => ({
      name: s.partner.name,
      due: s.totalProfitDue,
      paid: s.totalPaid,
      outstanding: s.outstandingBalance,
      credit: s.creditBalance
    }));
  }, [summaries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-icons animate-spin text-4xl text-primary">progress_activity</span>
          <p className="mt-2 text-madas-text/70">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Analytics</h1>
          <p className="text-sm text-madas-text/70">
            Financial insights and performance metrics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-madas-text/70">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-madas-text/70">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={resetToThisMonth}
            className="px-4 py-1.5 text-sm font-medium text-madas-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset to This Month
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Total Revenue</p>
            <span className="material-icons rounded-lg bg-green-100 p-2 text-lg text-green-600">trending_up</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-madas-text/50 mt-1">From deposits</p>
        </article>
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Total Expenses</p>
            <span className="material-icons rounded-lg bg-red-100 p-2 text-lg text-red-600">trending_down</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
          <p className="text-xs text-madas-text/50 mt-1">{filteredExpenses.length} transactions</p>
        </article>
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Net Profit</p>
            <span className={clsx(
              'material-icons rounded-lg p-2 text-lg',
              stats.netProfit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
            )}>
              {stats.netProfit >= 0 ? 'account_balance' : 'warning'}
            </span>
          </div>
          <p className={clsx(
            'mt-4 text-2xl font-semibold',
            stats.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'
          )}>
            {formatCurrency(stats.netProfit)}
          </p>
          <p className="text-xs text-madas-text/50 mt-1">
            {stats.profitMargin.toFixed(1)}% margin
          </p>
        </article>
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Partner Payments</p>
            <span className="material-icons rounded-lg bg-purple-100 p-2 text-lg text-purple-600">payments</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-purple-600">{formatCurrency(stats.totalPayments)}</p>
          <p className="text-xs text-madas-text/50 mt-1">{filteredPayments.length} payments</p>
        </article>
        <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-madas-text/70">Calculations</p>
            <span className="material-icons rounded-lg bg-indigo-100 p-2 text-lg text-indigo-600">calculate</span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-indigo-600">{filteredCalculations.length}</p>
          <p className="text-xs text-madas-text/50 mt-1">Profit calculations</p>
        </article>
      </section>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue vs Expenses */}
        <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-primary mb-4">Revenue vs Expenses</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueExpensesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Profit Trend */}
        <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-primary mb-4">Profit Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueExpensesData}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Net Profit"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#profitGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Partner Distribution */}
        <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-primary mb-4">Partner Profit Share</h3>
          <div className="h-[250px]">
            {partnerDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={partnerDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    labelLine={false}
                  >
                    {partnerDistributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-madas-text/50">
                No partner data available
              </div>
            )}
          </div>
        </article>

        {/* Payment Breakdown */}
        <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-primary mb-4">Payment Breakdown</h3>
          <div className="h-[250px]">
            {paymentBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name }) => name}
                    labelLine={false}
                  >
                    {paymentBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-madas-text/50">
                No payment data available
              </div>
            )}
          </div>
        </article>

        {/* Expense Categories */}
        <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-primary mb-4">Expense Categories</h3>
          <div className="h-[250px]">
            {expenseBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseBreakdownData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" width={80} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-madas-text/50">
                No expense data available
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Daily Trend */}
      <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-4">
          {dayjs(endDate).diff(dayjs(startDate), 'day') <= 60 ? 'Daily' : 'Weekly'} Cash Flow
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Partner Balances Table */}
      <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-4">Partner Balances</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Partner</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Total Due</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Total Paid</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Outstanding</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Credit</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-madas-text/60">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {partnerBalanceData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-madas-text/60">
                    No partner data available
                  </td>
                </tr>
              ) : (
                partnerBalanceData.map((partner, idx) => (
                  <tr key={idx} className="hover:bg-base/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-madas-text">
                      {partner.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {formatCurrency(partner.due)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      {formatCurrency(partner.paid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                      {formatCurrency(partner.outstanding)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600">
                      {formatCurrency(partner.credit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {partner.credit > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                          Credit
                        </span>
                      ) : partner.outstanding > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                          Due
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Recent Calculations */}
      <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary mb-4">Recent Profit Calculations</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Period</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Expenses</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-madas-text/60">Net Profit</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-madas-text/60">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-madas-text/60">Calculated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCalculations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-madas-text/60">
                    No calculations in selected period
                  </td>
                </tr>
              ) : (
                filteredCalculations.slice(0, 10).map((calc) => (
                  <tr key={calc.id} className="hover:bg-base/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-madas-text">
                      {dayjs(calc.periodStart).format('MMM D')} - {dayjs(calc.periodEnd).format('MMM D, YYYY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {formatCurrency(calc.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      {formatCurrency(calc.totalExpenses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                      <span className={calc.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(calc.netProfit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={clsx(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                        calc.status === 'draft' && 'bg-gray-100 text-gray-700',
                        calc.status === 'finalized' && 'bg-blue-100 text-blue-700',
                        calc.status === 'settled' && 'bg-green-100 text-green-700'
                      )}>
                        {calc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-madas-text/70">
                      {dayjs(calc.calculatedAt).format('MMM D, YYYY')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
};

export default AnalyticsPage;
