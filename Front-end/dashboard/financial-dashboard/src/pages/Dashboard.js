import React, { useState } from "react";
import { Calendar, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { useFinancialData } from "../hooks/useFinancialData";
import KPIGrid from "../components/dashboard/KPIGrid";
import RevenueChart from "../components/charts/RevenueChart";
import ExpenseChart from "../components/charts/ExpenseChart";
import CashFlowChart from "../components/charts/CashFlowChart";
import ExportButton from "../components/export/ExportButton";
import LoadingSpinner from "../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const Dashboard = () => {
  const {
    sales,
    expenses,
    inventory,
    customers,
    kpis,
    loading,
    error,
    dateRange,
    updateDateRange,
    refreshData,
  } = useFinancialData();

  const [selectedPeriod, setSelectedPeriod] = useState("last30days");

  const periodOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last7days", label: "Last 7 days" },
    { value: "last30days", label: "Last 30 days" },
    { value: "thisMonth", label: "This month" },
    { value: "lastMonth", label: "Last month" },
    { value: "thisYear", label: "This year" },
  ];

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    updateDateRange(period);
  };

  const handleRefresh = async () => {
    await refreshData();
    toast.success("Data refreshed successfully");
  };

  // Prepare chart data
  const prepareChartData = () => {
    // Group data by month for charts
    const monthlyData = {};

    // Process sales data
    sales.forEach((sale) => {
      const date = sale.createdAt?.toDate?.() || new Date(sale.createdAt);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          revenue: 0,
          profit: 0,
          expenses: 0,
          cogs: 0,
          cashIn: 0,
          cashOut: 0,
          netCashFlow: 0,
        };
      }

      monthlyData[monthKey].revenue += sale.amount || 0;
      monthlyData[monthKey].cashIn += sale.amount || 0;
    });

    // Process expenses data
    expenses.forEach((expense) => {
      const date = expense.createdAt?.toDate?.() || new Date(expense.createdAt);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          revenue: 0,
          profit: 0,
          expenses: 0,
          cogs: 0,
          cashIn: 0,
          cashOut: 0,
          netCashFlow: 0,
        };
      }

      monthlyData[monthKey].expenses += expense.amount || 0;
      monthlyData[monthKey].cashOut += expense.amount || 0;

      if (expense.category === "Cost of Goods Sold") {
        monthlyData[monthKey].cogs += expense.amount || 0;
      }
    });

    // Calculate profit and net cash flow
    Object.keys(monthlyData).forEach((month) => {
      const data = monthlyData[month];
      data.profit = data.revenue - data.cogs;
      data.netCashFlow = data.cashIn - data.cashOut;
    });

    // Sort by month and prepare arrays
    const sortedMonths = Object.keys(monthlyData).sort();

    return {
      labels: sortedMonths.map((month) => {
        const [year, monthNum] = month.split("-");
        return new Date(year, monthNum - 1).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      }),
      revenue: sortedMonths.map((month) => monthlyData[month].revenue),
      profit: sortedMonths.map((month) => monthlyData[month].profit),
      expenses: sortedMonths.map((month) => monthlyData[month].expenses),
      cogs: sortedMonths.map((month) => monthlyData[month].cogs),
      cashIn: sortedMonths.map((month) => monthlyData[month].cashIn),
      cashOut: sortedMonths.map((month) => monthlyData[month].cashOut),
      netCashFlow: sortedMonths.map((month) => monthlyData[month].netCashFlow),
    };
  };

  const chartData = prepareChartData();

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-danger-600 mb-2">Error loading data</div>
          <p className="text-gray-600">{error}</p>
          <button onClick={handleRefresh} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Financial Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Overview of your business financial performance
          </p>
        </div>

        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          {/* Period Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="input-field"
            >
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Export Button */}
          <ExportButton
            type="report"
            filename="financial-report"
            kpis={kpis}
            sales={sales}
            expenses={expenses}
          />
        </div>
      </div>

      {/* KPI Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Key Performance Indicators
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="metric-card">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <KPIGrid kpis={kpis} loading={loading} />
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={chartData} loading={loading} />
        <ExpenseChart data={chartData} loading={loading} />
      </div>

      {/* Cash Flow Chart */}
      <div className="grid grid-cols-1 gap-6">
        <CashFlowChart data={chartData} loading={loading} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {sales.length + expenses.length}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventory.length}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Customer Growth</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpis?.customers?.growth?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              {kpis?.customers?.growth >= 0 ? (
                <TrendingUp className="h-6 w-6 text-purple-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
