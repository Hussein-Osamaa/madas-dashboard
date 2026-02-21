import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { getPastMonths } from '../../lib/finance/format';
import {
  fetchExpenses,
  fetchOrders,
  fetchRecentTransactions,
  fetchTransactions
} from '../../services/finance/financeService';
import { getAllPartnerSummaries, fetchPayments } from '../../services/finance/profitSettlementService';
import { collection, getDocs, query, where, orderBy, Timestamp } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { useFinanceScope } from '../useFinanceScope';

export type OverviewFilters = {
  range: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  branch?: string;
  currency?: string;
};

dayjs.extend(isBetween);

export const useFinanceOverview = (filters: OverviewFilters) => {
  const scope = useFinanceScope();
  const { range, branch } = filters;

  return useQuery({
    queryKey: [
      'finance-overview',
      scope.businessId,
      range.start.valueOf(),
      range.end.valueOf(),
      branch
    ],
    enabled: scope.canView && !scope.loading && Boolean(scope.businessId),
    queryFn: async () => {
      const businessId = scope.businessId!;
      
      // Fetch deposits
      const depositsRef = collection(db, 'businesses', businessId, 'deposits');
      const depositsQuery = query(
        depositsRef,
        where('date', '>=', Timestamp.fromDate(filters.range.start.toDate())),
        where('date', '<=', Timestamp.fromDate(filters.range.end.toDate())),
        orderBy('date', 'desc')
      );
      
      const [orders, expenses, transactions, recentTransactions, depositsSnap, partnerSummaries, partnerPayments] = await Promise.all([
        fetchOrders(businessId, filters.range, branch),
        fetchExpenses(businessId, filters.range),
        fetchTransactions(businessId, filters.range, { type: 'all', method: 'all' }),
        fetchRecentTransactions(businessId),
        getDocs(depositsQuery),
        getAllPartnerSummaries(businessId),
        fetchPayments(businessId)
      ]);
      
      // Process deposits
      const deposits = depositsSnap.docs.map(doc => ({
        id: doc.id,
        amount: Number(doc.data().amount) || 0,
        category: doc.data().category || 'other',
        date: doc.data().date?.toDate?.() || new Date()
      }));
      
      // Investment deposits (capital injected into business)
      const investmentDeposits = deposits.filter(d => d.category === 'investment');
      const totalInvestments = investmentDeposits.reduce((sum, d) => sum + d.amount, 0);
      
      // Revenue deposits (excluding investments and loans - they're capital, not revenue)
      const revenueDeposits = deposits.filter(d => d.category !== 'investment' && d.category !== 'loan');
      const totalDepositsRevenue = revenueDeposits.reduce((sum, d) => sum + d.amount, 0);

      // Calculate totals
      const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      
      // Net Profit = Sales + Deposits (revenue) - Expenses
      const netProfit = totalSales + totalDepositsRevenue - totalExpenses;
      
      // Partner data
      const totalProfitDue = partnerSummaries.reduce((sum, p) => sum + p.totalProfitDue, 0);
      const totalPaidToPartners = partnerSummaries.reduce((sum, p) => sum + p.totalPaid, 0);
      const unsettledProfit = partnerSummaries.reduce((sum, p) => sum + p.outstandingBalance, 0);
      
      // Net Cash Flow = Investments + Unsettled Profit - Partners Paid
      const netCashFlow = totalInvestments + unsettledProfit - totalPaidToPartners;

      // Revenue vs Expenses monthly chart
      const monthlySeries = getPastMonths(6).map((month) => {
        const monthOrders = orders.filter((order) =>
          dayjs(order.createdAt.toDate()).isBetween(month.start, month.end, null, '[]')
        );
        const monthExpenses = expenses.filter((expense) =>
          dayjs(expense.createdAt.toDate()).isBetween(month.start, month.end, null, '[]')
        );
        const monthDeposits = revenueDeposits.filter((d) =>
          dayjs(d.date).isBetween(month.start, month.end, null, '[]')
        );
        return {
          label: month.label,
          revenue: monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) +
                   monthDeposits.reduce((sum, d) => sum + d.amount, 0),
          expenses: monthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
        };
      });

      // Build Cash Flow chart data by date
      // Cash Flow = Cumulative (Investments + Unsettled Profit - Partners Paid)
      const cashFlowByDate = new Map<string, { investments: number; partnersPaid: number }>();
      
      // Initialize all days in range
      let currentDay = dayjs(filters.range.start);
      const endDay = dayjs(filters.range.end);
      while (currentDay.isBefore(endDay) || currentDay.isSame(endDay, 'day')) {
        const dateKey = currentDay.format('YYYY-MM-DD');
        cashFlowByDate.set(dateKey, { investments: 0, partnersPaid: 0 });
        currentDay = currentDay.add(1, 'day');
      }

      // Add investment deposits
      investmentDeposits.forEach(d => {
        const dateKey = dayjs(d.date).format('YYYY-MM-DD');
        const existing = cashFlowByDate.get(dateKey);
        if (existing) {
          existing.investments += d.amount;
        }
      });

      // Add partner payments (within date range)
      const paymentsInRange = partnerPayments.filter(p => 
        !p.isVoided && 
        (p.type === 'payment' || p.type === 'settlement') &&
        dayjs(p.createdAt).isBetween(filters.range.start, filters.range.end, null, '[]')
      );
      
      paymentsInRange.forEach(p => {
        const dateKey = dayjs(p.createdAt).format('YYYY-MM-DD');
        const existing = cashFlowByDate.get(dateKey);
        if (existing) {
          existing.partnersPaid += p.amount;
        }
      });

      // Calculate cumulative cash flow
      let cumulativeInvestments = 0;
      let cumulativePartnersPaid = 0;
      
      const cashFlowChartData = Array.from(cashFlowByDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => {
          cumulativeInvestments += data.investments;
          cumulativePartnersPaid += data.partnersPaid;
          
          // Cash Flow = Investments + Unsettled Profit - Partners Paid
          // For chart, we show: Cumulative Investments - Cumulative Partners Paid + Current Unsettled
          const cashFlowAmount = cumulativeInvestments + unsettledProfit - cumulativePartnersPaid;
          
          return {
            date: dayjs(date).format('MMM D'),
            amount: cashFlowAmount
          };
        });

      // If range is more than 30 days, aggregate by week
      let finalCashFlowData = cashFlowChartData;
      if (cashFlowChartData.length > 30) {
        const weeklyData = new Map<string, number>();
        cashFlowChartData.forEach((item, index) => {
          const weekIndex = Math.floor(index / 7);
          const weekLabel = cashFlowChartData[weekIndex * 7]?.date || item.date;
          weeklyData.set(weekLabel, item.amount); // Use last value of the week
        });
        finalCashFlowData = Array.from(weeklyData.entries()).map(([date, amount]) => ({
          date,
          amount
        }));
      }

      return {
        totals: {
          totalSales: totalSales + totalDepositsRevenue,
          totalExpenses,
          netProfit,
          cashFlowNet: netCashFlow,
          investments: totalInvestments,
          unsettledProfit: unsettledProfit,
          partnersPaid: totalPaidToPartners
        },
        charts: {
          revenueVsExpenses: monthlySeries,
          cashFlow: finalCashFlowData
        },
        recentTransactions
      };
    }
  });
};
