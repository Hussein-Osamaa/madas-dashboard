import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";

// Date utilities
export const getDateRange = (period) => {
  const now = new Date();

  switch (period) {
    case "today":
      return { start: now, end: now };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return { start: yesterday, end: yesterday };
    case "last7days":
      return { start: subDays(now, 7), end: now };
    case "last30days":
      return { start: subDays(now, 30), end: now };
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "lastMonth":
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case "thisYear":
      return { start: startOfYear(now), end: endOfYear(now) };
    default:
      return { start: subDays(now, 30), end: now };
  }
};

// Revenue calculations
export const calculateRevenue = (sales) => {
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
  const grossRevenue = sales.reduce(
    (sum, sale) => sum + (sale.grossAmount || sale.amount || 0),
    0
  );
  const netRevenue = totalRevenue;

  return {
    totalRevenue,
    grossRevenue,
    netRevenue,
    averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
    totalOrders: sales.length,
  };
};

// Expense calculations
export const calculateExpenses = (expenses) => {
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0
  );

  // Categorize expenses
  const categories = expenses.reduce((acc, expense) => {
    const category = expense.category || "Other";
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += expense.amount || 0;
    return acc;
  }, {});

  // Calculate COGS (Cost of Goods Sold)
  const cogs = categories["Cost of Goods Sold"] || 0;

  // Calculate Operating Expenses (OPEX)
  const opex = totalExpenses - cogs;

  return {
    totalExpenses,
    cogs,
    opex,
    categories,
    averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0,
  };
};

// Profit calculations
export const calculateProfit = (revenue, expenses) => {
  const grossProfit = revenue.totalRevenue - expenses.cogs;
  const netProfit = grossProfit - expenses.opex;

  const grossMargin =
    revenue.totalRevenue > 0 ? (grossProfit / revenue.totalRevenue) * 100 : 0;
  const netMargin =
    revenue.totalRevenue > 0 ? (netProfit / revenue.totalRevenue) * 100 : 0;

  return {
    grossProfit,
    netProfit,
    grossMargin,
    netMargin,
    isProfitable: netProfit > 0,
  };
};

// Cash flow calculations
export const calculateCashFlow = (sales, expenses, period = "month") => {
  const cashIn = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
  const cashOut = expenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0
  );
  const operatingCashFlow = cashIn - cashOut;

  // Calculate cash runway (months of operation with current cash)
  const monthlyBurnRate = Math.abs(operatingCashFlow);
  const cashRunway = monthlyBurnRate > 0 ? 12 : null; // Simplified calculation

  return {
    cashIn,
    cashOut,
    operatingCashFlow,
    cashRunway,
    burnRate: monthlyBurnRate,
  };
};

// Inventory calculations
export const calculateInventoryMetrics = (inventory) => {
  const totalInventoryValue = inventory.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.costPrice || 0);
  }, 0);

  const totalStock = inventory.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );

  // Calculate inventory turnover (simplified)
  const inventoryTurnover = totalInventoryValue > 0 ? 12 : 0; // Simplified calculation

  // Calculate days of inventory on hand
  const daysOfInventory = inventoryTurnover > 0 ? 365 / inventoryTurnover : 0;

  return {
    totalInventoryValue,
    totalStock,
    inventoryTurnover,
    daysOfInventory,
    lowStockItems: inventory.filter(
      (item) => (item.quantity || 0) < (item.minStock || 10)
    ),
  };
};

// Customer metrics
export const calculateCustomerMetrics = (customers, sales) => {
  const totalCustomers = customers.length;

  // Calculate repeat purchase rate
  const customerPurchaseCounts = sales.reduce((acc, sale) => {
    const customerId = sale.customerId;
    if (customerId) {
      acc[customerId] = (acc[customerId] || 0) + 1;
    }
    return acc;
  }, {});

  const repeatCustomers = Object.values(customerPurchaseCounts).filter(
    (count) => count > 1
  ).length;
  const repeatPurchaseRate =
    totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

  // Calculate average customer value
  const totalCustomerValue = sales.reduce(
    (sum, sale) => sum + (sale.amount || 0),
    0
  );
  const averageCustomerValue =
    totalCustomers > 0 ? totalCustomerValue / totalCustomers : 0;

  return {
    totalCustomers,
    repeatCustomers,
    repeatPurchaseRate,
    averageCustomerValue,
    newCustomers: customers.filter((customer) => {
      const customerDate =
        customer.createdAt?.toDate?.() || new Date(customer.createdAt);
      const thirtyDaysAgo = subDays(new Date(), 30);
      return customerDate > thirtyDaysAgo;
    }).length,
  };
};

// Growth calculations
export const calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// KPI calculations
export const calculateKPIs = (
  sales,
  expenses,
  inventory,
  customers,
  previousPeriodData = {}
) => {
  const revenue = calculateRevenue(sales);
  const expenseData = calculateExpenses(expenses);
  const profit = calculateProfit(revenue, expenseData);
  const cashFlow = calculateCashFlow(sales, expenses);
  const inventoryMetrics = calculateInventoryMetrics(inventory);
  const customerMetrics = calculateCustomerMetrics(customers, sales);

  // Calculate growth rates
  const revenueGrowth = calculateGrowth(
    revenue.totalRevenue,
    previousPeriodData.revenue?.totalRevenue || 0
  );
  const profitGrowth = calculateGrowth(
    profit.netProfit,
    previousPeriodData.profit?.netProfit || 0
  );
  const customerGrowth = calculateGrowth(
    customerMetrics.totalCustomers,
    previousPeriodData.customers?.totalCustomers || 0
  );

  return {
    revenue: {
      ...revenue,
      growth: revenueGrowth,
    },
    expenses: expenseData,
    profit: {
      ...profit,
      growth: profitGrowth,
    },
    cashFlow,
    inventory: inventoryMetrics,
    customers: {
      ...customerMetrics,
      growth: customerGrowth,
    },
    // Additional KPIs
    roi:
      profit.netProfit > 0
        ? (profit.netProfit / expenseData.totalExpenses) * 100
        : 0,
    breakEvenPoint:
      expenseData.totalExpenses / (revenue.totalRevenue / revenue.totalOrders),
    refundRate: 0, // Would need refund data
    churnRate: 0, // Would need customer activity data
  };
};

// Format currency
export const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

// Format percentage
export const formatPercentage = (value, decimals = 1) => {
  return `${value.toFixed(decimals)}%`;
};

// Format number
export const formatNumber = (value, decimals = 0) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};
