// Finance Dashboard JavaScript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  sum,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:70470e2204065b4590583d3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.getElementById("sidebar");
const logoutBtn = document.getElementById("logout-btn");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const userInitial = document.getElementById("user-initial");
const exportReportBtn = document.getElementById("exportReportBtn");
const printReportBtn = document.getElementById("printReportBtn");
const filterBtn = document.getElementById("filterBtn");
const resetFilterBtn = document.getElementById("resetFilterBtn");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");

// Charts
let salesChart, revenueCostChart, categoryChart;

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  console.log("Finance page loaded");
  initializeAuth();
  initializeCharts();
  setupEventListeners();
  setupDateFilters();
});

// Authentication
function initializeAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.log("No user authenticated");
      window.location.href = "/login";
      return;
    }

    try {
      console.log("User authenticated:", user.email);

      // Check if user exists in staff collection
      const q = query(
        collection(db, "staff"),
        where("email", "==", user.email)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn(
          "User not found in staff collection. Redirecting to no-access."
        );
        window.location.href = "../no-access.html";
        return;
      }

      const userData = querySnapshot.docs[0].data();

      // Auto-approve admin user
      const adminEmails = [
        "hesainosama@gmail.com",
        // Add more admin emails here
        // "admin2@example.com",
        // "admin3@example.com"
      ];

      if (adminEmails.includes(user.email)) {
        await updateDoc(doc(db, "staff", querySnapshot.docs[0].id), {
          approved: true,
          permissions: {
            home: ["view"],
            orders: ["view", "search", "create", "edit"],
            inventory: ["view", "edit"],
            customers: ["view", "edit"],
            employees: ["view", "edit"],
            finance: ["view", "edit"],
          },
        });
        console.log("Granted full access to admin");
      }

      // Check if user is approved
      if (!userData.approved) {
        console.warn("User not approved. Redirecting to no-access.");
        window.location.href = "../no-access.html";
        return;
      }

      // Check if user has finance view permission
      if (!userData.permissions?.finance?.includes("view")) {
        console.warn(
          "User has no finance view permission. Redirecting to no-access."
        );
        window.location.href = "../no-access.html";
        return;
      }

      // Store user data
      localStorage.setItem("madasUser", JSON.stringify(userData));

      // Update UI and load data
      updateUserInfo(user, userData);
      loadFinancialData();
    } catch (error) {
      console.error("Authentication check failed:", error);
      window.location.href = "/login";
    }
  });
}

function updateUserInfo(user, userData) {
  const username =
    userData.name ||
    userData.firstName + " " + userData.lastName ||
    user.displayName ||
    user.email.split("@")[0];
  if (userName) userName.textContent = username;
  if (userEmail) userEmail.textContent = user.email;
  if (userInitial) userInitial.textContent = username.charAt(0).toUpperCase();
}

// Event Listeners
function setupEventListeners() {
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "/login";
      } catch (error) {
        console.error("Logout error:", error);
      }
    });
  }

  // Export and print buttons
  if (exportReportBtn) {
    exportReportBtn.addEventListener("click", exportFinanceData);
  }

  if (printReportBtn) {
    printReportBtn.addEventListener("click", printFinanceData);
  }

  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      console.log("Filter button clicked");
      console.log(
        "Start date value:",
        startDate ? startDate.value : "not found"
      );
      console.log("End date value:", endDate ? endDate.value : "not found");
      loadFinancialData();
    });
  } else {
    console.error("Filter button not found!");
  }

  if (resetFilterBtn) {
    resetFilterBtn.addEventListener("click", resetFilters);
  }
}

// Setup date filters
function setupDateFilters() {
  // Set default date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  console.log("Setting up date filters...");
  console.log("Start date element:", startDate);
  console.log("End date element:", endDate);

  if (startDate) {
    startDate.value = thirtyDaysAgo.toISOString().split("T")[0];
    console.log("Start date set to:", startDate.value);
  } else {
    console.error("Start date element not found!");
  }

  if (endDate) {
    endDate.value = today.toISOString().split("T")[0];
    console.log("End date set to:", endDate.value);
  } else {
    console.error("End date element not found!");
  }
}

function resetFilters() {
  setupDateFilters();
  loadFinancialData();
}

// Load Financial Data
async function loadFinancialData() {
  try {
    console.log("Loading financial data...");

    // Load financial metrics
    await loadFinancialMetrics();

    // Load charts data
    await loadChartsData();

    // Load cash flow summary
    await loadCashFlowSummary();

    // Load top performing products
    await loadTopPerformingProducts();

    console.log("Financial data loaded successfully");
  } catch (error) {
    console.error("Error loading financial data:", error);
    showError("Failed to load financial data");
  }
}

async function loadFinancialMetrics() {
  try {
    console.log("Loading financial metrics...");

    // Get date range for filtering
    const startDateValue = startDate ? startDate.value : null;
    const endDateValue = endDate ? endDate.value : null;

    // 1. Calculate Total Stock
    const totalStock = await calculateTotalStock();
    updateMetric("totalStock", totalStock.toLocaleString());

    // 2. Calculate Total Capital (inventory value)
    const totalCapital = await calculateTotalCapital();
    updateMetric("totalCapital", `${totalCapital.toLocaleString()} EGP`);

    // 3. Calculate Capital Return (from scan logs)
    const capitalReturn = await calculateCapitalReturn(
      startDateValue,
      endDateValue
    );
    updateMetric("capitalReturn", `${capitalReturn.toLocaleString()} EGP`);

    // 3.5. Calculate Net Capital Return (Capital Return - Total Supplies)
    const totalSupplies = await calculateTotalSupplies();
    const netCapitalReturn = capitalReturn - totalSupplies;
    updateMetric(
      "netCapitalReturn",
      `${netCapitalReturn.toLocaleString()} EGP`
    );

    // 4. Calculate Total Sales (from scan logs)
    const totalSales = await calculateTotalSales(startDateValue, endDateValue);
    updateMetric("totalSales", `${totalSales.toLocaleString()} EGP`);

    // 5. Calculate Total Deposits (from localStorage with date filter)
    const totalDeposits = calculateTotalDeposits(startDateValue, endDateValue);
    updateMetric("totalDeposits", `${totalDeposits.toLocaleString()} EGP`);

    // 5. Calculate additional metrics
    const totalOrders = await calculateTotalOrders(
      startDateValue,
      endDateValue
    );
    updateMetric("totalOrders", totalOrders.toLocaleString());

    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    updateMetric("avgOrderValue", `${avgOrderValue.toLocaleString()} EGP`);

    const profitMargin =
      totalSales > 0 ? (capitalReturn / totalSales) * 100 : 0;
    updateMetric("profitMargin", `${profitMargin.toFixed(1)}%`);

    console.log("Financial metrics loaded successfully");
  } catch (error) {
    console.error("Error loading financial metrics:", error);
  }
}

// Calculate total stock across all products
async function calculateTotalStock() {
  try {
    const productsSnapshot = await getDocs(collection(db, "products"));
    let totalStock = 0;

    productsSnapshot.forEach((doc) => {
      const product = doc.data();

      // Check if product has size variants
      if (product.sizes && typeof product.sizes === "object") {
        // Sum stock from all size variants
        Object.values(product.sizes).forEach((sizeData) => {
          totalStock += parseInt(sizeData.quantity || 0);
        });
      } else if (product.sizeVariants && Array.isArray(product.sizeVariants)) {
        // Sum stock from size variants array
        product.sizeVariants.forEach((variant) => {
          totalStock += parseInt(variant.stock || 0);
        });
      } else {
        // Use main product stock
        totalStock += parseInt(product.stock || 0);
      }
    });

    return totalStock;
  } catch (error) {
    console.error("Error calculating total stock:", error);
    return 0;
  }
}

// Calculate total capital (inventory value)
async function calculateTotalCapital() {
  try {
    const productsSnapshot = await getDocs(collection(db, "products"));
    let totalCapital = 0;

    productsSnapshot.forEach((doc) => {
      const product = doc.data();
      const basePrice = parseFloat(product.price) || 0;

      // Check if product has size variants
      if (product.sizes && typeof product.sizes === "object") {
        // Calculate value from all size variants
        Object.values(product.sizes).forEach((sizeData) => {
          const quantity = parseInt(sizeData.quantity || 0);
          const price = parseFloat(sizeData.price) || basePrice;
          totalCapital += quantity * price;
        });
      } else if (product.sizeVariants && Array.isArray(product.sizeVariants)) {
        // Calculate value from size variants array
        product.sizeVariants.forEach((variant) => {
          const quantity = parseInt(variant.stock || 0);
          const price = parseFloat(variant.price) || basePrice;
          totalCapital += quantity * price;
        });
      } else {
        // Use main product stock and price
        const quantity = parseInt(product.stock || 0);
        totalCapital += quantity * basePrice;
      }
    });

    return totalCapital;
  } catch (error) {
    console.error("Error calculating total capital:", error);
    return 0;
  }
}

// Calculate capital return from scan logs
async function calculateCapitalReturn(startDate, endDate) {
  try {
    console.log("Calculating capital return...");
    console.log("Date range:", startDate, "to", endDate);

    let q = query(collection(db, "scan_log"), orderBy("timestamp", "desc"));

    // Apply date filters if provided
    if (startDate && endDate) {
      const startTimestamp = new Date(startDate);
      const endTimestamp = new Date(endDate + "T23:59:59");
      q = query(
        collection(db, "scan_log"),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
        orderBy("timestamp", "desc")
      );
    }

    const scanLogsSnapshot = await getDocs(q);
    let capitalReturn = 0;
    let orderCount = 0;
    let returnCount = 0;

    console.log("Found", scanLogsSnapshot.size, "scan log entries");

    scanLogsSnapshot.forEach((doc) => {
      const log = doc.data();
      console.log("Processing log:", log);

      if (log.type === "order") {
        // Add to capital return when order is processed
        const price = parseFloat(log.price || 0);
        capitalReturn += price;
        orderCount++;
        console.log(
          "Order found - price:",
          price,
          "running total:",
          capitalReturn
        );
      } else if (log.type === "return") {
        // Subtract from capital return when return is processed
        const price = parseFloat(log.price || 0);
        capitalReturn -= price;
        returnCount++;
        console.log(
          "Return found - price:",
          price,
          "running total:",
          capitalReturn
        );
      }
    });

    console.log("Final capital return:", capitalReturn);
    console.log(
      "Orders processed:",
      orderCount,
      "Returns processed:",
      returnCount
    );

    return capitalReturn;
  } catch (error) {
    console.error("Error calculating capital return:", error);
    return 0;
  }
}

// Calculate Total Supplies from expenses
async function calculateTotalSupplies() {
  try {
    const q = query(
      collection(db, "expenses"),
      where("category", "==", "Supplies")
    );

    const expensesSnapshot = await getDocs(q);
    let totalSupplies = 0;

    expensesSnapshot.forEach((doc) => {
      const expense = doc.data();
      totalSupplies += parseFloat(expense.amount || 0);
    });

    return totalSupplies;
  } catch (error) {
    console.error("Error calculating total supplies:", error);
    return 0;
  }
}

// Calculate total sales from scan logs
async function calculateTotalSales(startDate, endDate) {
  try {
    let q = query(
      collection(db, "scan_log"),
      where("type", "==", "order"),
      orderBy("timestamp", "desc")
    );

    // Apply date filters if provided
    if (startDate && endDate) {
      const startTimestamp = new Date(startDate);
      const endTimestamp = new Date(endDate + "T23:59:59");
      q = query(
        collection(db, "scan_log"),
        where("type", "==", "order"),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
        orderBy("timestamp", "desc")
      );
    }

    const scanLogsSnapshot = await getDocs(q);
    let totalSales = 0;

    scanLogsSnapshot.forEach((doc) => {
      const log = doc.data();
      totalSales += parseFloat(log.price || 0);
    });

    // Add deposits from localStorage to total sales
    const financeData = JSON.parse(
      localStorage.getItem("madas_finance_data")
    ) || { totalDeposits: 0 };
    totalSales += financeData.totalDeposits || 0;

    return totalSales;
  } catch (error) {
    console.error("Error calculating total sales:", error);
    return 0;
  }
}

// Calculate total deposits from localStorage with date filtering
function calculateTotalDeposits(startDate, endDate) {
  try {
    console.log("Calculating total deposits...");
    console.log("Date range:", startDate, "to", endDate);

    const financeData = JSON.parse(
      localStorage.getItem("madas_finance_data")
    ) || { deposits: [] };

    const deposits = financeData.deposits || [];
    console.log("Found", deposits.length, "deposits in localStorage");

    let totalDeposits = 0;
    let filteredCount = 0;

    deposits.forEach((deposit) => {
      console.log("Processing deposit:", deposit);

      const depositDate = new Date(deposit.date);

      // If no date filter, include all deposits
      if (!startDate && !endDate) {
        totalDeposits += parseFloat(deposit.amount || 0);
        filteredCount++;
        console.log(
          "No filter - including deposit:",
          deposit.amount,
          "running total:",
          totalDeposits
        );
      } else {
        // Apply date filter
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate
          ? new Date(endDate + "T23:59:59")
          : new Date(9999, 11, 31);

        if (depositDate >= start && depositDate <= end) {
          totalDeposits += parseFloat(deposit.amount || 0);
          filteredCount++;
          console.log(
            "Date filter match - including deposit:",
            deposit.amount,
            "running total:",
            totalDeposits
          );
        } else {
          console.log(
            "Date filter - excluding deposit:",
            deposit.amount,
            "date:",
            deposit.date
          );
        }
      }
    });

    console.log("Final total deposits:", totalDeposits);
    console.log("Deposits included:", filteredCount, "out of", deposits.length);

    return totalDeposits;
  } catch (error) {
    console.error("Error calculating total deposits:", error);
    return 0;
  }
}

// Calculate total orders from scan logs
async function calculateTotalOrders(startDate, endDate) {
  try {
    let q = query(
      collection(db, "scan_log"),
      where("type", "==", "order"),
      orderBy("timestamp", "desc")
    );

    // Apply date filters if provided
    if (startDate && endDate) {
      const startTimestamp = new Date(startDate);
      const endTimestamp = new Date(endDate + "T23:59:59");
      q = query(
        collection(db, "scan_log"),
        where("type", "==", "order"),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
        orderBy("timestamp", "desc")
      );
    }

    const scanLogsSnapshot = await getDocs(q);
    return scanLogsSnapshot.size;
  } catch (error) {
    console.error("Error calculating total orders:", error);
    return 0;
  }
}

function updateMetric(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

async function loadChartsData() {
  try {
    console.log("Loading charts data...");

    // Get date range for filtering
    const startDateValue = startDate ? startDate.value : null;
    const endDateValue = endDate ? endDate.value : null;

    // Sales Trend Chart
    const salesData = await generateSalesData(startDateValue, endDateValue);
    updateSalesChart(salesData);

    // Revenue vs Cost Chart
    const revenueCostData = await generateRevenueCostData(
      startDateValue,
      endDateValue
    );
    updateRevenueCostChart(revenueCostData);

    // Category Chart
    const categoryData = await generateCategoryData();
    updateCategoryChart(categoryData);

    console.log("Charts data loaded successfully");
  } catch (error) {
    console.error("Error loading charts data:", error);
  }
}

async function generateSalesData(startDate, endDate) {
  try {
    // Get scan logs for the date range
    let q = query(
      collection(db, "scan_log"),
      where("type", "==", "order"),
      orderBy("timestamp", "desc")
    );

    if (startDate && endDate) {
      const startTimestamp = new Date(startDate);
      const endTimestamp = new Date(endDate + "T23:59:59");
      q = query(
        collection(db, "scan_log"),
        where("type", "==", "order"),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
        orderBy("timestamp", "desc")
      );
    }

    const scanLogsSnapshot = await getDocs(q);

    // Group by date
    const salesByDate = {};
    scanLogsSnapshot.forEach((doc) => {
      const log = doc.data();
      const date = log.timestamp.toDate().toISOString().split("T")[0];
      if (!salesByDate[date]) {
        salesByDate[date] = 0;
      }
      salesByDate[date] += parseFloat(log.price || 0);
    });

    // Convert to chart format
    const labels = Object.keys(salesByDate).sort();
    const data = labels.map((date) => salesByDate[date]);

    return {
      labels: labels,
      datasets: [
        {
          label: "Sales",
          data: data,
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  } catch (error) {
    console.error("Error generating sales data:", error);
    return { labels: [], datasets: [] };
  }
}

async function generateRevenueCostData(startDate, endDate) {
  try {
    // Get scan logs for the date range
    let q = query(collection(db, "scan_log"), orderBy("timestamp", "desc"));

    if (startDate && endDate) {
      const startTimestamp = new Date(startDate);
      const endTimestamp = new Date(endDate + "T23:59:59");
      q = query(
        collection(db, "scan_log"),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
        orderBy("timestamp", "desc")
      );
    }

    const scanLogsSnapshot = await getDocs(q);

    // Group by date
    const revenueByDate = {};
    const costByDate = {};

    scanLogsSnapshot.forEach((doc) => {
      const log = doc.data();
      const date = log.timestamp.toDate().toISOString().split("T")[0];

      if (!revenueByDate[date]) revenueByDate[date] = 0;
      if (!costByDate[date]) costByDate[date] = 0;

      if (log.type === "order") {
        revenueByDate[date] += parseFloat(log.price || 0);
        // Assume cost is 60% of revenue
        costByDate[date] += parseFloat(log.price || 0) * 0.6;
      }
    });

    const labels = Object.keys(revenueByDate).sort();

    return {
      labels: labels,
      datasets: [
        {
          label: "Revenue",
          data: labels.map((date) => revenueByDate[date]),
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
        },
        {
          label: "Cost",
          data: labels.map((date) => costByDate[date]),
          borderColor: "#EF4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
        },
      ],
    };
  } catch (error) {
    console.error("Error generating revenue cost data:", error);
    return { labels: [], datasets: [] };
  }
}

async function generateCategoryData() {
  try {
    const productsSnapshot = await getDocs(collection(db, "products"));
    const categoryValues = {};

    productsSnapshot.forEach((doc) => {
      const product = doc.data();
      const category = product.category || "Uncategorized";
      const basePrice = parseFloat(product.price) || 0;

      if (!categoryValues[category]) {
        categoryValues[category] = 0;
      }

      // Calculate inventory value for this product
      if (product.sizes && typeof product.sizes === "object") {
        Object.values(product.sizes).forEach((sizeData) => {
          const quantity = parseInt(sizeData.quantity || 0);
          const price = parseFloat(sizeData.price) || basePrice;
          categoryValues[category] += quantity * price;
        });
      } else if (product.sizeVariants && Array.isArray(product.sizeVariants)) {
        product.sizeVariants.forEach((variant) => {
          const quantity = parseInt(variant.stock || 0);
          const price = parseFloat(variant.price) || basePrice;
          categoryValues[category] += quantity * price;
        });
      } else {
        const quantity = parseInt(product.stock || 0);
        categoryValues[category] += quantity * basePrice;
      }
    });

    const labels = Object.keys(categoryValues);
    const data = Object.values(categoryValues);
    const colors = [
      "#EF4444",
      "#F59E0B",
      "#3B82F6",
      "#8B5CF6",
      "#10B981",
      "#F97316",
      "#06B6D4",
      "#84CC16",
      "#EC4899",
      "#6366F1",
    ];

    return {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    };
  } catch (error) {
    console.error("Error generating category data:", error);
    return { labels: [], datasets: [] };
  }
}

// Charts Initialization
function initializeCharts() {
  // Sales Trend Chart
  const salesCtx = document.getElementById("salesChart");
  if (salesCtx) {
    salesChart = new Chart(salesCtx, {
      type: "line",
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }

  // Revenue vs Cost Chart
  const revenueCostCtx = document.getElementById("revenueCostChart");
  if (revenueCostCtx) {
    revenueCostChart = new Chart(revenueCostCtx, {
      type: "line",
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  }

  // Category Chart
  const categoryCtx = document.getElementById("categoryChart");
  if (categoryCtx) {
    categoryChart = new Chart(categoryCtx, {
      type: "doughnut",
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }
}

function updateSalesChart(data) {
  if (salesChart) {
    salesChart.data = data;
    salesChart.update();
  }
}

function updateRevenueCostChart(data) {
  if (revenueCostChart) {
    revenueCostChart.data = data;
    revenueCostChart.update();
  }
}

function updateCategoryChart(data) {
  if (categoryChart) {
    categoryChart.data = data;
    categoryChart.update();
  }
}

async function loadCashFlowSummary() {
  try {
    console.log("Loading cash flow summary...");

    // Get date range for filtering
    const startDateValue = startDate ? startDate.value : null;
    const endDateValue = endDate ? endDate.value : null;

    const cashFlow = await calculateCashFlowSummary(
      startDateValue,
      endDateValue
    );
    displayCashFlowSummary(cashFlow);

    console.log("Cash flow summary loaded successfully");
  } catch (error) {
    console.error("Error loading cash flow summary:", error);
  }
}

async function calculateCashFlowSummary(startDate, endDate) {
  try {
    let q = query(collection(db, "scan_log"), orderBy("timestamp", "desc"));

    if (startDate && endDate) {
      const startTimestamp = new Date(startDate);
      const endTimestamp = new Date(endDate + "T23:59:59");
      q = query(
        collection(db, "scan_log"),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
        orderBy("timestamp", "desc")
      );
    }

    const scanLogsSnapshot = await getDocs(q);
    let cashIn = 0;
    let cashOut = 0;

    scanLogsSnapshot.forEach((doc) => {
      const log = doc.data();
      const amount = parseFloat(log.price || 0);

      if (log.type === "order") {
        cashIn += amount;
      } else if (log.type === "return") {
        cashOut += amount;
      }
    });

    const netCashFlow = cashIn - cashOut;

    return {
      cashIn: cashIn,
      cashOut: cashOut,
      netCashFlow: netCashFlow,
    };
  } catch (error) {
    console.error("Error calculating cash flow summary:", error);
    return { cashIn: 0, cashOut: 0, netCashFlow: 0 };
  }
}

function displayCashFlowSummary(cashFlow) {
  updateMetric("cashIn", `${cashFlow.cashIn.toLocaleString()} EGP`);
  updateMetric("cashOut", `${cashFlow.cashOut.toLocaleString()} EGP`);
  updateMetric("netCashFlow", `${cashFlow.netCashFlow.toLocaleString()} EGP`);
}

async function loadTopPerformingProducts() {
  try {
    console.log("Loading top performing products...");

    // Get date range for filtering
    const startDateValue = startDate ? startDate.value : null;
    const endDateValue = endDate ? endDate.value : null;

    const products = await generateTopPerformingProducts(
      startDateValue,
      endDateValue
    );
    displayTopPerformingProducts(products);

    console.log("Top performing products loaded successfully");
  } catch (error) {
    console.error("Error loading top performing products:", error);
  }
}

async function generateTopPerformingProducts(startDate, endDate) {
  try {
    let q = query(
      collection(db, "scan_log"),
      where("type", "==", "order"),
      orderBy("timestamp", "desc")
    );

    if (startDate && endDate) {
      const startTimestamp = new Date(startDate);
      const endTimestamp = new Date(endDate + "T23:59:59");
      q = query(
        collection(db, "scan_log"),
        where("type", "==", "order"),
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
        orderBy("timestamp", "desc")
      );
    }

    const scanLogsSnapshot = await getDocs(q);
    const productStats = {};

    // Aggregate product statistics
    scanLogsSnapshot.forEach((doc) => {
      const log = doc.data();
      const productId = log.productId;
      const productName = log.productName;
      const size = log.size;
      const price = parseFloat(log.price || 0);

      if (!productStats[productId]) {
        productStats[productId] = {
          name: productName,
          unitsSold: 0,
          revenue: 0,
          profit: 0,
          stock: 0,
        };
      }

      productStats[productId].unitsSold += 1;
      productStats[productId].revenue += price;
      productStats[productId].profit += price * 0.4; // Assume 40% profit margin
    });

    // Get current stock levels
    const productsSnapshot = await getDocs(collection(db, "products"));
    productsSnapshot.forEach((doc) => {
      const product = doc.data();
      const productId = doc.id;

      if (productStats[productId]) {
        let currentStock = 0;

        if (product.sizes && typeof product.sizes === "object") {
          Object.values(product.sizes).forEach((sizeData) => {
            currentStock += parseInt(sizeData.quantity || 0);
          });
        } else if (
          product.sizeVariants &&
          Array.isArray(product.sizeVariants)
        ) {
          product.sizeVariants.forEach((variant) => {
            currentStock += parseInt(variant.stock || 0);
          });
        } else {
          currentStock = parseInt(product.stock || 0);
        }

        productStats[productId].stock = currentStock;
      }
    });

    // Convert to array and sort by revenue
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return topProducts;
  } catch (error) {
    console.error("Error generating top performing products:", error);
    return [];
  }
}

function displayTopPerformingProducts(products) {
  const tbody = document.getElementById("topProductsTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  products.forEach((product) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50";
    row.innerHTML = `
      <td class="py-3 px-4">
        <div>
          <div class="font-medium text-gray-900">${product.name}</div>
        </div>
      </td>
      <td class="py-3 px-4 text-gray-600">-</td>
      <td class="py-3 px-4 text-gray-600">${product.unitsSold}</td>
      <td class="py-3 px-4 text-gray-600">${product.revenue.toLocaleString()} EGP</td>
      <td class="py-3 px-4 text-gray-600">${product.profit.toLocaleString()} EGP</td>
      <td class="py-3 px-4 text-gray-600">${product.stock}</td>
    `;
    tbody.appendChild(row);
  });
}

function exportFinanceData() {
  try {
    // Create a comprehensive financial report
    const report = {
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: startDate ? startDate.value : null,
        end: endDate ? endDate.value : null,
      },
      metrics: {
        totalStock: document.getElementById("totalStock")?.textContent || "0",
        totalCapital:
          document.getElementById("totalCapital")?.textContent || "0 EGP",
        capitalReturn:
          document.getElementById("capitalReturn")?.textContent || "0 EGP",
        totalSales:
          document.getElementById("totalSales")?.textContent || "0 EGP",
        totalOrders: document.getElementById("totalOrders")?.textContent || "0",
        avgOrderValue:
          document.getElementById("avgOrderValue")?.textContent || "0 EGP",
        profitMargin:
          document.getElementById("profitMargin")?.textContent || "0%",
      },
      cashFlow: {
        cashIn: document.getElementById("cashIn")?.textContent || "0 EGP",
        cashOut: document.getElementById("cashOut")?.textContent || "0 EGP",
        netCashFlow:
          document.getElementById("netCashFlow")?.textContent || "0 EGP",
      },
    };

    // Convert to JSON and download
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance_report_${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);

    showSuccess("Finance report exported successfully");
  } catch (error) {
    console.error("Error exporting finance data:", error);
    showError("Failed to export finance data");
  }
}

function printFinanceData() {
  try {
    window.print();
    showSuccess("Print dialog opened");
  } catch (error) {
    console.error("Error printing finance data:", error);
    showError("Failed to open print dialog");
  }
}

function showSuccess(message) {
  // You can implement a toast notification here
  console.log("Success:", message);
  alert(message);
}

function showError(message) {
  // You can implement a toast notification here
  console.error("Error:", message);
  alert("Error: " + message);
}

// Auto-refresh every 5 minutes
setInterval(loadFinancialData, 5 * 60 * 1000);
