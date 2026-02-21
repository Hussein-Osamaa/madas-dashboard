// Business Insights Dashboard JavaScript
// Firebase is handled by shared-auth.js - no need for duplicate imports

// DOM Elements
let menuToggle, sidebar, logoutBtn, userName, userEmail, userInitial;
let refreshInsightsBtn, exportInsightsBtn;
let highPriorityCount, growthOpportunities, aiRecommendations;
let criticalInsightsList, salesForecastChart;

// Insights data
let currentInsights = [];
let currentUser = null;
let currentUserData = null;

// Initialize the application
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Insights page loaded");

  // Initialize DOM elements
  initializeDOMElements();

  // Wait for shared auth to initialize
  await waitForAuth();

  // Update user info from shared auth
  updateUserInfo();

  // Load insights data
  await loadInsights();

  // Setup event listeners
  setupEventListeners();

  // Initialize charts
  initializeCharts();
});

// Wait for authentication to be ready
async function waitForAuth() {
  return new Promise((resolve) => {
    if (window.authInitialized) {
      resolve();
    } else {
      window.addEventListener("authInitialized", resolve, { once: true });
    }
  });
}

// Initialize DOM elements
function initializeDOMElements() {
  menuToggle = document.getElementById("menu-toggle");
  sidebar = document.getElementById("sidebar");
  logoutBtn = document.getElementById("logout-btn");
  userName = document.getElementById("user-name");
  userEmail = document.getElementById("user-email");
  userInitial = document.getElementById("user-initial");
  refreshInsightsBtn = document.getElementById("refreshInsightsBtn");
  exportInsightsBtn = document.getElementById("exportInsightsBtn");
  highPriorityCount = document.getElementById("highPriorityCount");
  growthOpportunities = document.getElementById("growthOpportunities");
  aiRecommendations = document.getElementById("aiRecommendations");
  criticalInsightsList = document.getElementById("criticalInsightsList");
  salesForecastChart = document.getElementById("salesForecastChart");
}

// Update user info from shared auth data
function updateUserInfo() {
  const user = window.currentUser;
  const userData = window.currentUserData;

  if (user && userData) {
    currentUser = user;
    currentUserData = userData;

    const username =
      userData.name ||
      userData.firstName + " " + userData.lastName ||
      user.displayName ||
      user.email.split("@")[0];

    if (userName) userName.textContent = username;
    if (userEmail) userEmail.textContent = user.email;
    if (userInitial) userInitial.textContent = username.charAt(0).toUpperCase();
  }
}

// Event Listeners
function setupEventListeners() {
  }

  // Refresh insights
  if (refreshInsightsBtn) {
    refreshInsightsBtn.addEventListener("click", async () => {
      showLoading("Refreshing insights...");
      await loadInsights();
      hideLoading();
      showSuccess("Insights refreshed successfully");
    });
  }

  // Export insights
  if (exportInsightsBtn) {
    exportInsightsBtn.addEventListener("click", exportInsights);
  }

  // Finance dropdown functionality
  setupFinanceDropdown();
}

// Setup finance dropdown
function setupFinanceDropdown() {
  const financeDropdownBtn = document.getElementById("finance-dropdown-btn");
  const financeDropdownMenu = document.getElementById("finance-dropdown-menu");
  const dropdownArrow = document.querySelector(".dropdown-arrow");

  if (financeDropdownBtn && financeDropdownMenu) {
    financeDropdownBtn.addEventListener("click", () => {
      const isOpen = financeDropdownMenu.classList.contains("show");

      if (isOpen) {
        financeDropdownMenu.classList.remove("show");
        financeDropdownMenu.classList.add("hidden");
        dropdownArrow.classList.remove("rotate");
      } else {
        financeDropdownMenu.classList.remove("hidden");
        financeDropdownMenu.classList.add("show");
        dropdownArrow.classList.add("rotate");
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !financeDropdownBtn.contains(e.target) &&
        !financeDropdownMenu.contains(e.target)
      ) {
        financeDropdownMenu.classList.remove("show");
        financeDropdownMenu.classList.add("hidden");
        dropdownArrow.classList.remove("rotate");
      }
    });
  }
}

// Load Insights
async function loadInsights() {
  try {
    console.log("Loading insights...");

    // Load critical insights
    await loadCriticalInsights();

    // Load AI recommendations
    await loadAIRecommendations();

    // Load sales forecasting
    await loadSalesForecasting();

    // Load inventory predictions
    await loadInventoryPredictions();

    // Load market trends
    await loadMarketTrends();

    // Update summary stats
    updateSummaryStats();

    console.log("Insights loaded successfully");
  } catch (error) {
    console.error("Error loading insights:", error);
    showError("Failed to load insights");
  }
}

// Load Critical Insights
async function loadCriticalInsights() {
  try {
    const insights = await generateCriticalInsights();
    displayCriticalInsights(insights);
  } catch (error) {
    console.error("Error loading critical insights:", error);
  }
}

async function generateCriticalInsights() {
  const insights = [];

  try {
    // Get Firebase instances from shared auth
    const { getFirestore, collection, getDocs } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );
    const db = getFirestore();

    // Check for low stock items
    const productsSnapshot = await getDocs(collection(db, "products"));
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let lowStockProducts = [];

    productsSnapshot.forEach((doc) => {
      const product = doc.data();
      const sizes = product.sizes || {};

      let hasStock = false;
      let isLowStock = false;

      Object.entries(sizes).forEach(([size, data]) => {
        const stock = parseInt(data.quantity) || 0;
        if (stock > 0) hasStock = true;
        if (stock <= (product.lowStockAlert || 5) && stock > 0) {
          isLowStock = true;
          lowStockProducts.push({
            name: product.name,
            size: size,
            stock: stock,
            sku: product.sku,
          });
        }
      });

      if (!hasStock) outOfStockCount++;
      if (isLowStock) lowStockCount++;
    });

    // Add critical insights based on data
    if (outOfStockCount > 0) {
      insights.push({
        type: "critical",
        title: "Out of Stock Items",
        message: `${outOfStockCount} products are completely out of stock. This could result in lost sales.`,
        priority: "high",
        action: "Review Inventory",
        impact: "High",
      });
    }

    if (lowStockCount > 0) {
      insights.push({
        type: "warning",
        title: "Low Stock Alert",
        message: `${lowStockCount} products are running low on stock. Consider restocking soon.`,
        priority: "medium",
        action: "Check Stock Levels",
        impact: "Medium",
      });
    }

    // Add demo insights if no real data
    if (insights.length === 0) {
      insights.push({
        type: "info",
        title: "Sales Performance",
        message: "Sales are 15% above target this month. Great performance!",
        priority: "low",
        action: "View Details",
        impact: "Positive",
      });

      insights.push({
        type: "success",
        title: "Customer Satisfaction",
        message:
          "Customer satisfaction score is 4.8/5. Excellent service quality.",
        priority: "low",
        action: "View Feedback",
        impact: "Positive",
      });
    }

    return insights;
  } catch (error) {
    console.error("Error generating critical insights:", error);
    return [
      {
        type: "error",
        title: "Data Error",
        message: "Unable to load critical insights. Please try again.",
        priority: "high",
        action: "Retry",
        impact: "Critical",
      },
    ];
  }
}

function displayCriticalInsights(insights) {
  if (!criticalInsightsList) return;

  criticalInsightsList.innerHTML = "";

  insights.forEach((insight) => {
    const insightElement = createInsightElement(insight);
    criticalInsightsList.appendChild(insightElement);
  });
}

function createInsightElement(insight) {
  const div = document.createElement("div");
  div.className = `insight-card priority-${insight.priority} bg-white p-4 rounded-lg shadow-sm mb-4`;

  div.innerHTML = `
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center space-x-2 mb-2">
          <span class="material-icons text-${getPriorityColor(
            insight.priority
          )}">${getInsightIcon(insight.type)}</span>
          <h4 class="font-semibold text-[var(--madas-primary)]">${
            insight.title
          }</h4>
          <span class="trend-indicator ${getImpactClass(insight.impact)}">${
    insight.impact
  }</span>
        </div>
        <p class="text-sm text-gray-600 mb-3">${insight.message}</p>
      </div>
      <button class="text-[var(--madas-primary)] hover:text-[#1f3c19]" onclick="handleInsightAction('${
        insight.action
      }')">
        <span class="material-icons">${getActionIcon(insight.action)}</span>
      </button>
    </div>
  `;

  return div;
}

// Load AI Recommendations
async function loadAIRecommendations() {
  try {
    const recommendations = await generateAIRecommendations();
    // Recommendations are already displayed in the HTML
    // We just need to update any dynamic data
  } catch (error) {
    console.error("Error loading AI recommendations:", error);
  }
}

async function generateAIRecommendations() {
  // This would typically call an AI service
  // For now, return mock data
  return [
    {
      type: "stock",
      title: "Low Stock Alert",
      message:
        "Nike Air Max (SKU: NK-AM-001) is running low on stock. Consider restocking to avoid lost sales.",
      currentStock: 3,
      avgDailySales: 2,
      action: "Restock",
    },
    {
      type: "pricing",
      title: "Price Optimization",
      message:
        "Adidas Ultraboost shows high demand. Consider a 5% price increase to maximize profit.",
      currentPrice: 120,
      suggestedPrice: 126,
      action: "Adjust Price",
    },
  ];
}

// Load Sales Forecasting
async function loadSalesForecasting() {
  try {
    const forecast = await generateSalesForecast();
    // Chart will be initialized separately
  } catch (error) {
    console.error("Error loading sales forecasting:", error);
  }
}

async function generateSalesForecast() {
  // Mock sales forecast data
  return {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    actual: [12000, 15000, 14000, 18000, 16000, 20000],
    forecast: [null, null, null, null, null, 22000],
  };
}

// Load Inventory Predictions
async function loadInventoryPredictions() {
  try {
    const predictions = await generateInventoryPredictions();
    // Predictions are displayed in the HTML
  } catch (error) {
    console.error("Error loading inventory predictions:", error);
  }
}

async function generateInventoryPredictions() {
  return [
    {
      product: "Nike Air Max",
      risk: "high",
      daysToStockout: 5,
      action: "Restock immediately",
    },
    {
      product: "Adidas Ultraboost",
      risk: "medium",
      daysToStockout: 12,
      action: "Monitor closely",
    },
    {
      product: "Puma RS-X",
      risk: "low",
      daysToStockout: 30,
      action: "Adequate stock",
    },
  ];
}

// Load Market Trends
async function loadMarketTrends() {
  try {
    const trends = await generateMarketTrends();
    // Trends are displayed in the HTML
  } catch (error) {
    console.error("Error loading market trends:", error);
  }
}

async function generateMarketTrends() {
  return [
    {
      category: "Athletic Footwear",
      growth: 12,
      description: "Growing demand for sustainable athletic shoes.",
      opportunity: true,
    },
    {
      category: "Online Sales",
      growth: 25,
      description: "E-commerce sales up 25% this quarter.",
      trending: true,
    },
    {
      category: "Customer Demographics",
      growth: 8,
      description: "Gen Z customers prefer sustainable brands.",
      insight: true,
    },
  ];
}

// Update Summary Stats
function updateSummaryStats() {
  if (highPriorityCount) highPriorityCount.textContent = "3";
  if (growthOpportunities) growthOpportunities.textContent = "5";
  if (aiRecommendations) aiRecommendations.textContent = "12";
}

// Initialize Charts
function initializeCharts() {
  if (salesForecastChart && window.Chart) {
    const ctx = salesForecastChart.getContext("2d");

    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Actual Sales",
            data: [12000, 15000, 14000, 18000, 16000, 20000],
            borderColor: "#27491F",
            backgroundColor: "rgba(39, 73, 31, 0.1)",
            tension: 0.4,
          },
          {
            label: "Forecast",
            data: [null, null, null, null, null, 22000],
            borderColor: "#FFD300",
            backgroundColor: "rgba(255, 211, 0, 0.1)",
            borderDash: [5, 5],
            tension: 0.4,
          },
        ],
      },
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
          },
        },
      },
    });
  }
}

// Export Insights
function exportInsights() {
  try {
    const insightsData = {
      timestamp: new Date().toISOString(),
      insights: currentInsights,
      summary: {
        highPriority: 3,
        growthOpportunities: 5,
        aiRecommendations: 12,
      },
    };

    const dataStr = JSON.stringify(insightsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `insights-${new Date().toISOString().split("T")[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showSuccess("Insights exported successfully");
  } catch (error) {
    console.error("Error exporting insights:", error);
    showError("Failed to export insights");
  }
}

// Handle Insight Actions
window.handleInsightAction = function (action) {
  if (
    window.permissionManager &&
    !window.permissionManager.canPerformAction("insights", "custom")
  ) {
    alert("You don't have permission to perform this action");
    return;
  }

  switch (action) {
    case "Review Inventory":
      window.location.href = "./products.html";
      break;
    case "Check Stock Levels":
      window.location.href = "./products.html";
      break;
    case "View Details":
      alert("Detailed view will be implemented here");
      break;
    case "View Feedback":
      alert("Customer feedback view will be implemented here");
      break;
    case "Retry":
      loadInsights();
      break;
    default:
      alert(`${action} functionality will be implemented here`);
  }
};

// Utility Functions
function getPriorityColor(priority) {
  switch (priority) {
    case "high":
      return "red-600";
    case "medium":
      return "yellow-600";
    case "low":
      return "green-600";
    default:
      return "gray-600";
  }
}

function getInsightIcon(type) {
  switch (type) {
    case "critical":
      return "priority_high";
    case "warning":
      return "warning";
    case "info":
      return "info";
    case "success":
      return "check_circle";
    case "error":
      return "error";
    default:
      return "lightbulb";
  }
}

function getActionIcon(action) {
  switch (action) {
    case "Review Inventory":
      return "inventory_2";
    case "Check Stock Levels":
      return "assessment";
    case "View Details":
      return "visibility";
    case "View Feedback":
      return "rate_review";
    case "Retry":
      return "refresh";
    default:
      return "arrow_forward";
  }
}

function getImpactClass(impact) {
  switch (impact) {
    case "High":
    case "Critical":
      return "negative";
    case "Positive":
      return "positive";
    default:
      return "neutral";
  }
}

function showLoading(message) {
  // You can implement a loading indicator here
  console.log(message);
}

function hideLoading() {
  // Hide loading indicator
}

function showSuccess(message) {
  alert(message); // You can replace this with a better notification system
}

function showError(message) {
  alert(message); // You can replace this with a better notification system
}

console.log("Insights script loaded");
