import { useState, useEffect } from "react";
import {
  subscribeToSales,
  subscribeToExpenses,
  getSales,
  getExpenses,
  getInventory,
  getCustomers,
} from "../api/collections";
import { calculateKPIs, getDateRange } from "../utils/calculations";

export const useFinancialData = (period = "last30days") => {
  const [data, setData] = useState({
    sales: [],
    expenses: [],
    inventory: [],
    customers: [],
    kpis: null,
    loading: true,
    error: null,
  });

  const [dateRange, setDateRange] = useState(getDateRange(period));

  useEffect(() => {
    const unsubscribeSales = subscribeToSales(
      (sales) => {
        setData((prev) => ({ ...prev, sales }));
      },
      { startDate: dateRange.start, endDate: dateRange.end }
    );

    const unsubscribeExpenses = subscribeToExpenses(
      (expenses) => {
        setData((prev) => ({ ...prev, expenses }));
      },
      { startDate: dateRange.start, endDate: dateRange.end }
    );

    // Load static data
    const loadStaticData = async () => {
      try {
        const [inventoryResult, customersResult] = await Promise.all([
          getInventory(),
          getCustomers(),
        ]);

        if (inventoryResult.success) {
          setData((prev) => ({ ...prev, inventory: inventoryResult.data }));
        }

        if (customersResult.success) {
          setData((prev) => ({ ...prev, customers: customersResult.data }));
        }

        setData((prev) => ({ ...prev, loading: false }));
      } catch (error) {
        setData((prev) => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
      }
    };

    loadStaticData();

    return () => {
      unsubscribeSales();
      unsubscribeExpenses();
    };
  }, [dateRange]);

  // Calculate KPIs whenever data changes
  useEffect(() => {
    if (data.sales.length > 0 || data.expenses.length > 0) {
      const kpis = calculateKPIs(
        data.sales,
        data.expenses,
        data.inventory,
        data.customers
      );
      setData((prev) => ({ ...prev, kpis }));
    }
  }, [data.sales, data.expenses, data.inventory, data.customers]);

  const updateDateRange = (newPeriod) => {
    setDateRange(getDateRange(newPeriod));
  };

  const refreshData = async () => {
    setData((prev) => ({ ...prev, loading: true }));

    try {
      const [salesResult, expensesResult] = await Promise.all([
        getSales({ startDate: dateRange.start, endDate: dateRange.end }),
        getExpenses({ startDate: dateRange.start, endDate: dateRange.end }),
      ]);

      if (salesResult.success) {
        setData((prev) => ({ ...prev, sales: salesResult.data }));
      }

      if (expensesResult.success) {
        setData((prev) => ({ ...prev, expenses: expensesResult.data }));
      }
    } catch (error) {
      setData((prev) => ({
        ...prev,
        error: error.message,
      }));
    } finally {
      setData((prev) => ({ ...prev, loading: false }));
    }
  };

  return {
    ...data,
    dateRange,
    updateDateRange,
    refreshData,
  };
};
