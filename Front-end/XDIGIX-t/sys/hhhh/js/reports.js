// Reports Dashboard JavaScript
// Firebase is handled by shared-auth.js - no need for duplicate imports

// DOM Elements
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.getElementById("sidebar");
const logoutBtn = document.getElementById("logout-btn");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const userInitial = document.getElementById("user-initial");
const generateReportBtn = document.getElementById("generateReportBtn");
const exportReportBtn = document.getElementById("exportReportBtn");
const scheduleReportBtn = document.getElementById("scheduleReportBtn");

// Report data
let currentReportData = null;

// Initialize the application
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Reports page loaded");

  // Wait for shared auth to initialize
  await new Promise((resolve) => {
    if (window.authInitialized) {
      resolve();
    } else {
      window.addEventListener("authInitialized", resolve, { once: true });
    }
  });

  // Update user info from shared auth
  updateUserInfo();

  loadReportTemplates();
  setupEventListeners();
});

// Update user info from shared auth data
function updateUserInfo() {
  const user = window.currentUser;
  const userData = window.currentUserData;

  if (user && userData) {
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

  // Logout is handled by shared-auth.js - no need to handle here

  // Generate report
  if (generateReportBtn) {
    generateReportBtn.addEventListener("click", generateReport);
  }

  // Export report
  if (exportReportBtn) {
    exportReportBtn.addEventListener("click", exportReport);
  }

  // Schedule report
  if (scheduleReportBtn) {
    scheduleReportBtn.addEventListener("click", scheduleReport);
  }

  // Report template selection
  const reportTemplates = document.querySelectorAll(".report-template");
  reportTemplates.forEach((template) => {
    template.addEventListener("click", () => {
      selectReportTemplate(template.dataset.type);
    });
  });
}

// Report Templates
function loadReportTemplates() {
  const templates = [
    {
      id: "inventory",
      name: "Inventory Report",
      description: "Complete inventory status and stock levels",
      icon: "inventory_2",
      color: "bg-blue-500",
    },
    {
      id: "sales",
      name: "Sales Report",
      description: "Sales performance and revenue analysis",
      icon: "trending_up",
      color: "bg-green-500",
    },
    {
      id: "financial",
      name: "Financial Report",
      description: "Financial metrics and profitability analysis",
      icon: "account_balance_wallet",
      color: "bg-purple-500",
    },
    {
      id: "customer",
      name: "Customer Report",
      description: "Customer behavior and demographics",
      icon: "group",
      color: "bg-orange-500",
    },
    {
      id: "performance",
      name: "Performance Report",
      description: "Overall business performance metrics",
      icon: "analytics",
      color: "bg-red-500",
    },
    {
      id: "custom",
      name: "Custom Report",
      description: "Create a custom report with your criteria",
      icon: "build",
      color: "bg-gray-500",
    },
  ];

  const templatesContainer = document.getElementById("reportTemplates");
  if (templatesContainer) {
    templatesContainer.innerHTML = "";

    templates.forEach((template) => {
      const templateElement = createTemplateElement(template);
      templatesContainer.appendChild(templateElement);
    });
  }
}

function createTemplateElement(template) {
  const div = document.createElement("div");
  div.className =
    "report-template card-hover bg-white rounded-xl p-6 shadow-sm border border-gray-100 cursor-pointer";
  div.dataset.type = template.id;

  div.innerHTML = `
        <div class="flex items-center space-x-4">
            <div class="w-12 h-12 ${template.color} rounded-lg flex items-center justify-center">
                <span class="material-icons text-white">${template.icon}</span>
            </div>
            <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900">${template.name}</h3>
                <p class="text-sm text-gray-600">${template.description}</p>
            </div>
            <span class="material-icons text-gray-400">chevron_right</span>
        </div>
    `;

  return div;
}

function selectReportTemplate(type) {
  // Remove active class from all templates
  document.querySelectorAll(".report-template").forEach((template) => {
    template.classList.remove("ring-2", "ring-[var(--madas-primary)]");
  });

  // Add active class to selected template
  const selectedTemplate = document.querySelector(`[data-type="${type}"]`);
  if (selectedTemplate) {
    selectedTemplate.classList.add("ring-2", "ring-[var(--madas-primary)]");
  }

  // Show report configuration
  showReportConfiguration(type);
}

function showReportConfiguration(type) {
  const configSection = document.getElementById("reportConfiguration");
  if (!configSection) return;

  configSection.classList.remove("hidden");

  // Update configuration based on report type
  const configContent = getReportConfiguration(type);
  configSection.innerHTML = configContent;

  // Setup configuration event listeners
  setupConfigurationListeners(type);
}

function getReportConfiguration(type) {
  const configurations = {
    inventory: `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-900">Inventory Report Configuration</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <select class="w-full border border-gray-300 px-3 py-2 rounded-lg">
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="custom">Custom range</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Include Categories</label>
                        <select class="w-full border border-gray-300 px-3 py-2 rounded-lg">
                            <option value="all">All Categories</option>
                            <option value="electronics">Electronics</option>
                            <option value="clothing">Clothing</option>
                            <option value="books">Books</option>
                        </select>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <label class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 text-[var(--madas-primary)] rounded">
                        <span class="ml-2 text-sm">Include low stock alerts</span>
                    </label>
                    <label class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 text-[var(--madas-primary)] rounded">
                        <span class="ml-2 text-sm">Include out of stock items</span>
                    </label>
                </div>
            </div>
        `,
    sales: `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-900">Sales Report Configuration</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <select class="w-full border border-gray-300 px-3 py-2 rounded-lg">
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="custom">Custom range</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Group By</label>
                        <select class="w-full border border-gray-300 px-3 py-2 rounded-lg">
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                        </select>
                    </div>
                </div>
            </div>
        `,
    financial: `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-900">Financial Report Configuration</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Period</label>
                        <select class="w-full border border-gray-300 px-3 py-2 rounded-lg">
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                        <select class="w-full border border-gray-300 px-3 py-2 rounded-lg">
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                        </select>
                    </div>
                </div>
            </div>
        `,
    custom: `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold text-gray-900">Custom Report Configuration</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
                        <input type="text" placeholder="Enter report name" class="w-full border border-gray-300 px-3 py-2 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea placeholder="Enter report description" rows="3" class="w-full border border-gray-300 px-3 py-2 rounded-lg"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Select Data Sources</label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" class="w-4 h-4 text-[var(--madas-primary)] rounded">
                                <span class="ml-2 text-sm">Products</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="w-4 h-4 text-[var(--madas-primary)] rounded">
                                <span class="ml-2 text-sm">Orders</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="w-4 h-4 text-[var(--madas-primary)] rounded">
                                <span class="ml-2 text-sm">Customers</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="w-4 h-4 text-[var(--madas-primary)] rounded">
                                <span class="ml-2 text-sm">Staff</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `,
  };

  return configurations[type] || configurations.custom;
}

function setupConfigurationListeners(type) {
  // Add any specific event listeners for the configuration
  console.log("Setting up configuration listeners for:", type);
}

// Report Generation
async function generateReport() {
  try {
    const selectedTemplate = document.querySelector(".report-template.ring-2");
    if (!selectedTemplate) {
      showError("Please select a report template first");
      return;
    }

    const reportType = selectedTemplate.dataset.type;
    console.log("Generating report:", reportType);

    // Show loading state
    showLoading("Generating report...");

    // Generate report data
    const reportData = await generateReportData(reportType);

    // Display report
    displayReport(reportData);

    // Hide loading
    hideLoading();

    showSuccess("Report generated successfully");
  } catch (error) {
    console.error("Error generating report:", error);
    hideLoading();
    showError("Failed to generate report");
  }
}

async function generateReportData(type) {
  const reportData = {
    type: type,
    generatedAt: new Date().toISOString(),
    data: {},
  };

  switch (type) {
    case "inventory":
      reportData.data = await generateInventoryReport();
      break;
    case "sales":
      reportData.data = await generateSalesReport();
      break;
    case "financial":
      reportData.data = await generateFinancialReport();
      break;
    case "customer":
      reportData.data = await generateCustomerReport();
      break;
    case "performance":
      reportData.data = await generatePerformanceReport();
      break;
    default:
      reportData.data = await generateCustomReport();
  }

  currentReportData = reportData;
  return reportData;
}

async function generateInventoryReport() {
  try {
    // This function will need to fetch data from your backend or a data source
    // For now, it's a placeholder.
    console.log("Placeholder: Generating Inventory Report Data");
    return {
      summary: {
        totalProducts: 100,
        totalValue: 10000,
        lowStockCount: 10,
        outOfStockCount: 5,
      },
      products: Array.from({ length: 50 }, (_, i) => ({
        name: `Product ${i + 1}`,
        sku: `SKU-${i + 1}`,
        category: "Electronics",
        stock: Math.floor(Math.random() * 100) + 1,
        value: Math.floor(Math.random() * 100) + 50,
        lowStockAlert: 10,
      })),
    };
  } catch (error) {
    console.error("Error generating inventory report:", error);
    return { summary: {}, products: [] };
  }
}

async function generateSalesReport() {
  // Simulate sales data for demo
  return {
    summary: {
      totalSales: Math.floor(Math.random() * 1000) + 500,
      totalRevenue: Math.floor(Math.random() * 50000) + 20000,
      avgOrderValue: Math.floor(Math.random() * 200) + 50,
    },
    sales: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      sales: Math.floor(Math.random() * 50) + 10,
      revenue: Math.floor(Math.random() * 2000) + 500,
    })),
  };
}

async function generateFinancialReport() {
  // Simulate financial data for demo
  return {
    summary: {
      revenue: Math.floor(Math.random() * 100000) + 50000,
      costs: Math.floor(Math.random() * 60000) + 30000,
      profit: Math.floor(Math.random() * 40000) + 20000,
      margin: Math.floor(Math.random() * 30) + 20,
    },
    monthly: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2024, i, 1).toLocaleDateString("en-US", {
        month: "short",
      }),
      revenue: Math.floor(Math.random() * 10000) + 5000,
      costs: Math.floor(Math.random() * 6000) + 3000,
      profit: Math.floor(Math.random() * 4000) + 2000,
    })),
  };
}

async function generateCustomerReport() {
  // Simulate customer data for demo
  return {
    summary: {
      totalCustomers: Math.floor(Math.random() * 1000) + 500,
      newCustomers: Math.floor(Math.random() * 100) + 50,
      repeatCustomers: Math.floor(Math.random() * 200) + 100,
    },
    demographics: {
      ageGroups: [
        { group: "18-25", count: Math.floor(Math.random() * 200) + 100 },
        { group: "26-35", count: Math.floor(Math.random() * 300) + 150 },
        { group: "36-45", count: Math.floor(Math.random() * 250) + 120 },
        { group: "46+", count: Math.floor(Math.random() * 150) + 80 },
      ],
    },
  };
}

async function generatePerformanceReport() {
  // Simulate performance data for demo
  return {
    summary: {
      conversionRate: (Math.random() * 10 + 2).toFixed(1),
      avgSessionDuration: Math.floor(Math.random() * 300) + 120,
      bounceRate: (Math.random() * 30 + 10).toFixed(1),
    },
    metrics: {
      pageViews: Math.floor(Math.random() * 10000) + 5000,
      uniqueVisitors: Math.floor(Math.random() * 5000) + 2500,
      orders: Math.floor(Math.random() * 1000) + 500,
    },
  };
}

async function generateCustomReport() {
  // Generate a custom report based on selected criteria
  return {
    summary: {
      customMetric1: Math.floor(Math.random() * 1000) + 500,
      customMetric2: Math.floor(Math.random() * 500) + 250,
      customMetric3: (Math.random() * 100).toFixed(1),
    },
    data: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Custom Item ${i + 1}`,
      value: Math.floor(Math.random() * 1000) + 100,
    })),
  };
}

function displayReport(reportData) {
  const reportContainer = document.getElementById("reportDisplay");
  if (!reportContainer) return;

  const reportHtml = generateReportHTML(reportData);
  reportContainer.innerHTML = reportHtml;
  reportContainer.classList.remove("hidden");

  // Scroll to report
  reportContainer.scrollIntoView({ behavior: "smooth" });
}

function generateReportHTML(reportData) {
  const { type, generatedAt, data } = reportData;

  return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-[var(--madas-primary)]">${
                      type.charAt(0).toUpperCase() + type.slice(1)
                    } Report</h2>
                    <p class="text-sm text-gray-600">Generated on ${new Date(
                      generatedAt
                    ).toLocaleString()}</p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="exportReport()" class="bg-[var(--madas-primary)] text-white px-4 py-2 rounded-lg hover:bg-[#1f3c19] transition-colors">
                        <span class="material-icons text-sm mr-1">download</span>
                        Export
                    </button>
                    <button onclick="printReport()" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                        <span class="material-icons text-sm mr-1">print</span>
                        Print
                    </button>
                </div>
            </div>
            
            ${generateReportContent(type, data)}
        </div>
    `;
}

function generateReportContent(type, data) {
  switch (type) {
    case "inventory":
      return generateInventoryReportContent(data);
    case "sales":
      return generateSalesReportContent(data);
    case "financial":
      return generateFinancialReportContent(data);
    case "customer":
      return generateCustomerReportContent(data);
    case "performance":
      return generatePerformanceReportContent(data);
    default:
      return generateCustomReportContent(data);
  }
}

function generateInventoryReportContent(data) {
  const { summary, products } = data;

  return `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-blue-600">Total Products</h3>
                    <p class="text-2xl font-bold text-blue-900">${
                      summary.totalProducts
                    }</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-green-600">Total Value</h3>
                    <p class="text-2xl font-bold text-green-900">$${summary.totalValue.toLocaleString()}</p>
                </div>
                <div class="bg-orange-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-orange-600">Low Stock</h3>
                    <p class="text-2xl font-bold text-orange-900">${
                      summary.lowStockCount
                    }</p>
                </div>
                <div class="bg-red-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-red-600">Out of Stock</h3>
                    <p class="text-2xl font-bold text-red-900">${
                      summary.outOfStockCount
                    }</p>
                </div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${products
                          .map(
                            (product) => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
                                  product.name
                                }</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                                  product.sku
                                }</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
                                  product.category
                                }</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${
                                  product.stock
                                }</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${product.value.toLocaleString()}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function generateSalesReportContent(data) {
  const { summary, sales } = data;

  return `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-blue-600">Total Sales</h3>
                    <p class="text-2xl font-bold text-blue-900">${
                      summary.totalSales
                    }</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-green-600">Total Revenue</h3>
                    <p class="text-2xl font-bold text-green-900">$${summary.totalRevenue.toLocaleString()}</p>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-purple-600">Avg Order Value</h3>
                    <p class="text-2xl font-bold text-purple-900">$${
                      summary.avgOrderValue
                    }</p>
                </div>
            </div>
            
            <div class="bg-gray-50 p-4 rounded-lg">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Daily Sales (Last 30 Days)</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr>
                                <th class="text-left text-sm font-medium text-gray-500">Date</th>
                                <th class="text-left text-sm font-medium text-gray-500">Sales</th>
                                <th class="text-left text-sm font-medium text-gray-500">Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sales
                              .map(
                                (day) => `
                                <tr>
                                    <td class="text-sm text-gray-900">${
                                      day.date
                                    }</td>
                                    <td class="text-sm text-gray-900">${
                                      day.sales
                                    }</td>
                                    <td class="text-sm text-gray-900">$${day.revenue.toLocaleString()}</td>
                                </tr>
                            `
                              )
                              .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function generateFinancialReportContent(data) {
  const { summary, monthly } = data;

  return `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-green-600">Revenue</h3>
                    <p class="text-2xl font-bold text-green-900">$${summary.revenue.toLocaleString()}</p>
                </div>
                <div class="bg-red-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-red-600">Costs</h3>
                    <p class="text-2xl font-bold text-red-900">$${summary.costs.toLocaleString()}</p>
                </div>
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-blue-600">Profit</h3>
                    <p class="text-2xl font-bold text-blue-900">$${summary.profit.toLocaleString()}</p>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-purple-600">Margin</h3>
                    <p class="text-2xl font-bold text-purple-900">${
                      summary.margin
                    }%</p>
                </div>
            </div>
        </div>
    `;
}

function generateCustomerReportContent(data) {
  const { summary, demographics } = data;

  return `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-blue-600">Total Customers</h3>
                    <p class="text-2xl font-bold text-blue-900">${summary.totalCustomers}</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-green-600">New Customers</h3>
                    <p class="text-2xl font-bold text-green-900">${summary.newCustomers}</p>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-purple-600">Repeat Customers</h3>
                    <p class="text-2xl font-bold text-purple-900">${summary.repeatCustomers}</p>
                </div>
            </div>
        </div>
    `;
}

function generatePerformanceReportContent(data) {
  const { summary, metrics } = data;

  return `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-blue-600">Conversion Rate</h3>
                    <p class="text-2xl font-bold text-blue-900">${summary.conversionRate}%</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-green-600">Avg Session Duration</h3>
                    <p class="text-2xl font-bold text-green-900">${summary.avgSessionDuration}s</p>
                </div>
                <div class="bg-orange-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-orange-600">Bounce Rate</h3>
                    <p class="text-2xl font-bold text-orange-900">${summary.bounceRate}%</p>
                </div>
            </div>
        </div>
    `;
}

function generateCustomReportContent(data) {
  const { summary, data: customData } = data;

  return `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-blue-600">Custom Metric 1</h3>
                    <p class="text-2xl font-bold text-blue-900">${summary.customMetric1}</p>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-green-600">Custom Metric 2</h3>
                    <p class="text-2xl font-bold text-green-900">${summary.customMetric2}</p>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <h3 class="text-sm font-medium text-purple-600">Custom Metric 3</h3>
                    <p class="text-2xl font-bold text-purple-900">${summary.customMetric3}</p>
                </div>
            </div>
        </div>
    `;
}

// Export functionality
function exportReport() {
  if (!currentReportData) {
    showError("No report to export");
    return;
  }

  try {
    // Create CSV data
    const csvData = convertReportToCSV(currentReportData);

    // Create and download file
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentReportData.type}-report-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccess("Report exported successfully");
  } catch (error) {
    console.error("Export error:", error);
    showError("Failed to export report");
  }
}

function convertReportToCSV(reportData) {
  const { type, generatedAt, data } = reportData;

  let csvRows = [
    [`${type.charAt(0).toUpperCase() + type.slice(1)} Report`],
    [`Generated on: ${new Date(generatedAt).toLocaleString()}`],
    [""],
  ];

  // Add summary data
  if (data.summary) {
    csvRows.push(["Summary"]);
    Object.entries(data.summary).forEach(([key, value]) => {
      csvRows.push([key, value]);
    });
    csvRows.push([""]);
  }

  // Add detailed data
  if (data.products) {
    csvRows.push(["Products"]);
    csvRows.push(["Name", "SKU", "Category", "Stock", "Value"]);
    data.products.forEach((product) => {
      csvRows.push([
        product.name,
        product.sku,
        product.category,
        product.stock,
        product.value,
      ]);
    });
  }

  if (data.sales) {
    csvRows.push(["Sales"]);
    csvRows.push(["Date", "Sales", "Revenue"]);
    data.sales.forEach((sale) => {
      csvRows.push([sale.date, sale.sales, sale.revenue]);
    });
  }

  return csvRows.map((row) => row.join(",")).join("\n");
}

// Schedule functionality
function scheduleReport() {
  // Implement report scheduling functionality
  showSuccess("Report scheduling feature coming soon!");
}

// Print functionality
function printReport() {
  if (!currentReportData) {
    showError("No report to print");
    return;
  }

  window.print();
}

// Utility functions
function showLoading(message) {
  // You can implement a loading indicator here
  console.log("Loading:", message);
}

function hideLoading() {
  // Hide loading indicator
  console.log("Loading complete");
}

function showSuccess(message) {
  // You can implement a toast notification here
  console.log("Success:", message);
}

function showError(message) {
  // You can implement a toast notification here
  console.error("Error:", message);
}

// Make functions globally available for inline onclick handlers
window.exportReport = exportReport;
window.printReport = printReport;
