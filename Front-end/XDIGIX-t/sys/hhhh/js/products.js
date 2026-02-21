// products.js - CSP-compliant logic for products page

console.log("Products page script starting...");

// Import Firebase from the existing config file
import { auth, db } from "../firebaseConfig.js";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  deleteDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("Firebase imported successfully:", { auth, db });

// Use globally available libraries from CDN
const JsBarcode = window.JsBarcode;
const XLSX = window.XLSX;

if (!JsBarcode) {
  console.warn(
    "JsBarcode library not found. Barcode generation will be disabled."
  );
}

if (!XLSX) {
  console.warn(
    "SheetJS library not found. Excel functionality will be disabled."
  );
}

// Global variables for product selection
let selectedProducts = new Set();
let allProducts = [];

// Basic page load check
console.log("Products page JS loaded");

// Immediate DOM check
console.log("Immediate DOM check:");
console.log("- productsGrid:", document.getElementById("productsGrid"));
console.log("- productModal:", document.getElementById("productModal"));
console.log("- addProductBtn:", document.getElementById("addProductBtn"));
console.log("- user-name:", document.getElementById("user-name"));
console.log("- user-email:", document.getElementById("user-email"));

// Debug: Check if DOM elements exist
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");
  console.log(
    "productsGrid exists:",
    !!document.getElementById("productsGrid")
  );
  console.log(
    "productModal exists:",
    !!document.getElementById("productModal")
  );
  console.log(
    "addProductBtn exists:",
    !!document.getElementById("addProductBtn")
  );
});

}

// Close sidebar when clicking outside on mobile
document.addEventListener("click", (e) => {
  if (
    window.innerWidth < 1024 &&
    sidebar &&
    !sidebar.contains(e.target) &&
    !toggleBtn.contains(e.target)
  ) {
    sidebar.classList.add("-translate-x-full");
  }
});

// Check if essential elements exist
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded");
  const productsGrid = document.getElementById("productsGrid");

  if (!productsGrid) {
    console.error("Products grid element not found");
  }
  // Ensure a div for JS population exists (for compatibility)
  if (!document.getElementById("productList")) {
    const productListDiv = document.createElement("div");
    productListDiv.id = "productList";
    // Insert after productsGrid or at end of main
    const grid = document.getElementById("productsGrid");
    if (grid && grid.parentNode) {
      grid.parentNode.insertBefore(productListDiv, grid.nextSibling);
    } else {
      document.body.appendChild(productListDiv);
    }
  }
});

// Firebase is already initialized from firebaseConfig.js
console.log("Using Firebase from firebaseConfig.js");

// --- Firestore read access debug ---
if (db) {
  console.log("Checking Firestore read access...");
  getDocs(collection(db, "products"))
    .then((snap) => {
      console.log("Test read success:", snap.size);
    })
    .catch((err) => {
      console.error("Test read FAILED:", err.message);
      alert(`Firestore read error: ${err.message}`);
    });
} else {
  console.error("Firebase not initialized, skipping Firestore test");
}

// Import auth functions
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Auth and permissions
if (!auth) {
  console.error("Auth not initialized, cannot set up auth listener");
} else {
  console.log("Setting up auth listener...");
  onAuthStateChanged(auth, async (user) => {
    console.log("Auth state changed:", user ? "User logged in" : "No user");

    if (!user) {
      console.log("No user, redirecting to login");
      window.location.href = "/login";
      return;
    }

    try {
      console.log("Checking user permissions...");
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
      console.log("User data retrieved:", userData);

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
          },
        });
        console.log("Granted full access to admin");
        // Don't reload, just continue with the normal flow
      }

      // Check if user is approved
      if (!userData.approved) {
        console.warn("User not approved. Redirecting to no-access.");
        window.location.href = "../no-access.html";
        return;
      }

      // Check if user has inventory view permission
      if (!userData.permissions?.inventory?.includes("view")) {
        console.warn(
          "User has no inventory view permission. Redirecting to no-access."
        );
        window.location.href = "../no-access.html";
        return;
      }

      // Store user data
      localStorage.setItem("madasUser", JSON.stringify(userData));

      // Update UI
      const username =
        userData.name ||
        userData.firstName + " " + userData.lastName ||
        user.displayName ||
        user.email.split("@")[0];
      document.getElementById("user-name").textContent = username;
      document.getElementById("user-email").textContent = user.email;
      document.getElementById("user-initial").textContent = username
        .charAt(0)
        .toUpperCase();

      // Apply permission-based UI controls
      applyPermissionBasedUI(userData.permissions);

      // Initialize selection functionality
      initializeSelectionHandlers();

      // Initialize DOM elements and event listeners
      initializeDOMElements();

      // Load products
      console.log("Loading products...");
      await loadProducts();
      console.log("Products loaded successfully");
    } catch (error) {
      console.error("Permission check failed:", error);
      // Show error alert and redirect
      alert(`Error: ${error.message}`);
      window.location.href = "/login";
    }
  });
}

// Global error handler
window.addEventListener("error", (event) => {
  console.error("Global error caught:", event.error);
  alert("An error occurred while loading the page. Please refresh.");
});

function applyPermissionBasedUI(permissions) {
  const addProductBtn = document.getElementById("addProductBtn");

  // Show/hide add product button based on edit permission
  if (addProductBtn) {
    if (!permissions?.inventory?.includes("edit")) {
      addProductBtn.style.display = "none";
    } else {
      addProductBtn.style.display = "flex";
    }
  }
}

function initializeDOMElements() {
  // Initialize modal elements
  productModal = document.getElementById("productModal");
  productForm = document.getElementById("productForm");
  productModalTitle = document.getElementById("productModalTitle");
  productCancelBtn = document.getElementById("productCancelBtn");
  addProductBtn = document.getElementById("addProductBtn");

  // Initialize size variants elements
  sizeVariantsList = document.getElementById("sizeVariantsList");
  addSizeBtn = document.getElementById("addSizeBtn");

  // Initialize Excel upload/download elements
  uploadExcelBtn = document.getElementById("uploadExcelBtn");
  downloadExcelBtn = document.getElementById("downloadExcelBtn");
  excelFileInput = document.getElementById("excelFileInput");

  // Initialize print button elements
  printProductsBtn = document.getElementById("printProductsBtn");
  printProductsBtnSidebar = document.getElementById("printProductsBtnSidebar");

  // Set up modal event listeners
  if (addProductBtn) {
    addProductBtn.addEventListener("click", () => {
      openProductModal();
    });
  }

  if (productCancelBtn) {
    productCancelBtn.addEventListener("click", () => {
      closeProductModal();
    });
  }

  if (addSizeBtn) {
    addSizeBtn.addEventListener("click", () => {
      const row = document.createElement("div");
      row.className = "flex gap-2 items-center";
      row.innerHTML = `
        <input type="text" class="size-input border px-2 py-1 rounded w-20" placeholder="Size" />
        <input type="number" class="qty-input border px-2 py-1 rounded w-20" placeholder="Stock" min="0" />
        <input type="text" class="barcode-input border px-2 py-1 rounded w-40 bg-gray-100" placeholder="Barcode" readonly />
        <svg class="barcode-svg" width="100" height="40"></svg>
        <button type="button" class="remove-size-btn text-red-500">Remove</button>
      `;
      row.querySelector(".remove-size-btn").addEventListener("click", () => {
        row.remove();
      });
      sizeVariantsList.appendChild(row);
    });
  }

  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("productName").value.trim();
      const description = document
        .getElementById("productDescription")
        .value.trim();
      const price = parseFloat(document.getElementById("productPrice").value);
      const sku = document.getElementById("productSKU").value.trim();
      const lowStockAlert =
        parseInt(document.getElementById("productLowStock").value) || 0;
      const barcode = document.getElementById("mainBarcode").value.trim();
      const { sizes, sizeBarcodes } = getSizeVariantsFromForm();
      const productData = {
        name,
        description,
        price,
        sku,
        lowStockAlert,
        stock: sizes,
        barcode,
        sizeBarcodes,
      };

      try {
        if (editingProductId) {
          await updateDoc(doc(db, "products", editingProductId), productData);
        } else {
          await addDoc(collection(db, "products"), productData);
        }
        closeProductModal();
        await loadProducts();
      } catch (err) {
        alert("Error saving product: " + err.message);
      }
    });
  }

  // Set up Excel upload/download event listeners
  if (uploadExcelBtn) {
    uploadExcelBtn.addEventListener("click", () => {
      if (!XLSX) {
        alert(
          "Excel processing library not loaded. Please refresh the page and try again."
        );
        return;
      }
      excelFileInput.click();
    });
  }

  if (excelFileInput) {
    excelFileInput.addEventListener("change", handleExcelUpload);
  }

  if (downloadExcelBtn) {
    downloadExcelBtn.addEventListener("click", handleExcelDownload);
  }

  // Set up print button event listeners
  if (printProductsBtn) {
    printProductsBtn.addEventListener("click", printProducts);
  }
  if (printProductsBtnSidebar) {
    printProductsBtnSidebar.addEventListener("click", printProducts);
  }
}

// --- Product Selection Functions ---
function initializeSelectionHandlers() {
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", handleSelectAll);
  }
}

function handleSelectAll() {
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  const isChecked = selectAllCheckbox.checked;

  // Update all product checkboxes
  document.querySelectorAll(".product-checkbox").forEach((checkbox) => {
    checkbox.checked = isChecked;
    const productId = checkbox.getAttribute("data-product-id");
    if (isChecked) {
      selectedProducts.add(productId);
    } else {
      selectedProducts.delete(productId);
    }
  });

  updateSelectedCount();
}

function handleProductSelection(productId, isChecked) {
  if (isChecked) {
    selectedProducts.add(productId);
  } else {
    selectedProducts.delete(productId);
  }

  updateSelectedCount();
  updateSelectAllCheckbox();
}

function updateSelectedCount() {
  const selectedCountEl = document.getElementById("selectedCount");
  if (selectedCountEl) {
    selectedCountEl.textContent = `${selectedProducts.size} selected`;
  }
}

function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  const totalProducts = allProducts.length;
  const selectedCount = selectedProducts.size;

  if (selectAllCheckbox) {
    if (selectedCount === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === totalProducts) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }
}

let editingProductId = null;

// Modal elements - will be initialized after DOM is ready
let productModal,
  productForm,
  productModalTitle,
  productCancelBtn,
  addProductBtn;

// --- Barcode Generation Helpers ---
function generateBarcode(value) {
  // Use a simple hash for uniqueness if needed
  return value;
}

function renderBarcode(svgId, value) {
  if (!value || !JsBarcode) return;
  try {
    JsBarcode(svgId, value, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: false,
    });
  } catch (error) {
    console.warn("Barcode rendering failed:", error);
  }
}

// --- Size Variants Dynamic Logic ---
let sizeVariantsList, addSizeBtn;

function renderSizeVariants(sizes = {}, sizeBarcodes = {}) {
  if (!sizeVariantsList) return;

  sizeVariantsList.innerHTML = "";
  Object.entries(sizes).forEach(([size, qty], idx) => {
    const barcode = sizeBarcodes[size] || "";
    const row = document.createElement("div");
    row.className = "flex gap-2 items-center";
    row.innerHTML = `
      <input type="text" class="size-input border px-2 py-1 rounded w-20" placeholder="Size" value="${size}" />
      <input type="number" class="qty-input border px-2 py-1 rounded w-20" placeholder="Stock" min="0" value="${qty}" />
      <input type="text" class="barcode-input border px-2 py-1 rounded w-40 bg-gray-100" placeholder="Barcode" value="${barcode}" readonly />
      <svg class="barcode-svg" width="100" height="40"></svg>
      <button type="button" class="remove-size-btn text-red-500">Remove</button>
    `;
    row.querySelector(".remove-size-btn").addEventListener("click", () => {
      row.remove();
    });
    // Render barcode SVG
    if (barcode) renderBarcode(row.querySelector(".barcode-svg"), barcode);
    sizeVariantsList.appendChild(row);
  });
}

// addSizeBtn event listener will be initialized after DOM is ready

function getSizeVariantsFromForm() {
  if (!sizeVariantsList) return { sizes: {}, sizeBarcodes: {} };

  const sizes = {};
  const sizeBarcodes = {};
  sizeVariantsList.querySelectorAll("div").forEach((row) => {
    const size = row.querySelector(".size-input").value.trim();
    const qty = parseInt(row.querySelector(".qty-input").value) || 0;
    const barcode = row.querySelector(".barcode-input").value.trim();
    if (size) {
      sizes[size] = qty;
      sizeBarcodes[size] = barcode;
    }
  });
  return { sizes, sizeBarcodes };
}

// --- Update openProductModal and form submit logic ---
function openProductModal(product = null) {
  if (!productModal) return;

  productModal.classList.remove("hidden");
  productModalTitle.textContent = product ? "Edit Product" : "Add Product";
  editingProductId = product ? product.id : null;
  productForm.reset();
  document.getElementById("productName").value = product?.name || "";
  document.getElementById("productDescription").value =
    product?.description || "";
  document.getElementById("productPrice").value = product?.price || "";
  document.getElementById("productSKU").value = product?.sku || "";
  document.getElementById("productLowStock").value =
    product?.lowStockAlert || "";
  // Main barcode
  let mainBarcode = product?.barcode || "";
  if (!mainBarcode) {
    // Generate a new barcode (e.g., random or based on timestamp)
    mainBarcode = "P" + Date.now() + Math.floor(Math.random() * 1000);
  }
  document.getElementById("mainBarcode").value = mainBarcode;
  renderBarcode("#mainBarcodeSvg", mainBarcode);
  // Size barcodes
  const sizeBarcodes = product?.sizeBarcodes || {};
  // If new, generate barcodes for each size
  const sizes = product?.stock || {};
  const generatedBarcodes = {};
  Object.keys(sizes).forEach((size) => {
    generatedBarcodes[size] = sizeBarcodes[size] || mainBarcode + "-" + size;
  });
  renderSizeVariants(sizes, generatedBarcodes);
}

function closeProductModal() {
  if (!productModal) return;

  productModal.classList.add("hidden");
  editingProductId = null;
}

// productForm event listener will be initialized after DOM is ready

// Attach edit/delete listeners after loading products
async function loadProducts() {
  try {
    console.log("Starting loadProducts function...");
    const productsSnapshot = await getDocs(collection(db, "products"));
    console.log("Products snapshot retrieved, count:", productsSnapshot.size);

    // Debug: Log each product to see what's in the database
    productsSnapshot.forEach((docSnap) => {
      console.log("Product found:", docSnap.id, docSnap.data());
    });

    const productsGrid = document.getElementById("productsGrid");
    if (!productsGrid) {
      console.error("Products grid element not found!");
      return;
    }

    // Clear global products array and selected products
    allProducts = [];
    selectedProducts.clear();

    if (productsSnapshot.empty) {
      console.log("No products found");
      productsGrid.innerHTML = `
        <div class="col-span-full flex items-center justify-center p-8">
          <div class="text-center">
            <span class="material-icons text-gray-400 text-4xl mb-4">inventory_2</span>
            <p class="text-gray-500 mb-4">No products found</p>
            <p class="text-sm text-gray-400 mb-4">Click "Add Product" to create your first product</p>
            <button onclick="document.getElementById('addProductBtn').click()" class="bg-[var(--madas-primary)] text-white px-6 py-3 rounded-lg hover:bg-[#1f3c19] transition-colors flex items-center space-x-2 mx-auto">
              <span class="material-icons">add</span>
              <span>Add Your First Product</span>
            </button>
          </div>
        </div>
      `;
      updateSelectedCount();
      updateSelectAllCheckbox();
      return;
    }

    console.log("Processing products...");
    productsGrid.innerHTML = "";
    let totalProducts = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    productsSnapshot.forEach((docSnap) => {
      const product = docSnap.data();
      product.id = docSnap.id;
      allProducts.push(product);
      totalProducts++;
      // Sum all stock quantities
      const stockObj = product.stock || {};
      const stockSum = Object.values(stockObj).reduce((a, b) => a + b, 0);
      totalValue += (product.price || 0) * stockSum;
      // Low/out of stock logic
      const lowStockThreshold = product.lowStockAlert ?? 10;
      const minStock = Math.min(...Object.values(stockObj), Infinity);
      if (stockSum <= 0) outOfStock++;
      else if (minStock <= lowStockThreshold) lowStock++;
      const stockStatus =
        stockSum <= 0
          ? "bg-red-100 text-red-800"
          : minStock <= lowStockThreshold
          ? "bg-orange-100 text-orange-800"
          : "bg-green-100 text-green-800";
      const stockText =
        stockSum <= 0
          ? "Out of Stock"
          : minStock <= lowStockThreshold
          ? "Low Stock"
          : "In Stock";
      const sizeList = Object.entries(stockObj)
        .map(([size, qty]) => `${size}: ${qty}`)
        .join(", ");

      const productCard = document.createElement("div");
      productCard.className =
        "card-hover bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative";
      productCard.innerHTML = `
        <!-- Product Selection Checkbox -->
        <div class="absolute top-3 left-3 z-10">
          <input type="checkbox" 
                 class="product-checkbox w-5 h-5 text-[var(--madas-primary)] bg-gray-100 border-gray-300 rounded focus:ring-[var(--madas-accent)] focus:ring-2 cursor-pointer" 
                 data-product-id="${product.id}">
        </div>
        
        <div class="aspect-square bg-gray-100 flex items-center justify-center">
          <span class="material-icons text-gray-400 text-4xl">image</span>
        </div>
        <div class="p-4">
          <h3 class="font-semibold text-gray-900 mb-2">${
            product.name || "Unnamed Product"
          }</h3>
          <p class="text-sm text-gray-600 mb-3">${
            product.description || "No description"
          }</p>
          <div class="flex items-center justify-between mb-3">
            <span class="text-lg font-bold text-[var(--madas-primary)]">$${
              product.price || 0
            }</span>
            <span class="px-2 py-1 text-xs font-semibold rounded-full ${stockStatus}">${stockText}</span>
          </div>
          <div class="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Sizes: ${sizeList || "N/A"}</span>
            <span>SKU: ${product.sku || "N/A"}</span>
          </div>
          <div class="flex gap-2">
            <button class="flex-1 bg-blue-100 text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-200 transition-colors text-sm viewDetailsBtn" data-id="${
              product.id
            }">
              View Details
            </button>
            <button class="flex-1 bg-[var(--madas-primary)] text-white py-2 px-3 rounded-lg hover:bg-[#1f3c19] transition-colors text-sm editProductBtn" data-id="${
              product.id
            }">
              Edit
            </button>
            <button class="bg-red-100 text-red-600 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors text-sm deleteProductBtn" data-id="${
              product.id
            }">
              Delete
            </button>
          </div>
        </div>
      `;
      productsGrid.appendChild(productCard);
    });

    console.log("Updating stats...");
    // Update stats
    const totalProductsEl = document.getElementById("total-products");
    const lowStockEl = document.getElementById("low-stock");
    const outOfStockEl = document.getElementById("out-of-stock");
    const totalValueEl = document.getElementById("total-value");

    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (lowStockEl) lowStockEl.textContent = lowStock;
    if (outOfStockEl) outOfStockEl.textContent = outOfStock;
    if (totalValueEl) totalValueEl.textContent = `$${totalValue.toFixed(2)}`;

    console.log("Attaching event listeners...");

    // Attach checkbox event listeners
    document.querySelectorAll(".product-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const productId = e.target.getAttribute("data-product-id");
        handleProductSelection(productId, e.target.checked);
      });
    });

    // Attach edit/delete/view details listeners
    document.querySelectorAll(".editProductBtn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = btn.getAttribute("data-id");
        const docRef = doc(db, "products", id);
        const docSnap = await getDocs(
          query(collection(db, "products"), where("__name__", "==", id))
        );
        if (!docSnap.empty) {
          const product = docSnap.docs[0].data();
          product.id = id;
          openProductModal(product);
        }
      });
    });
    document.querySelectorAll(".deleteProductBtn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = btn.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this product?")) {
          await deleteDoc(doc(db, "products", id));
          await loadProducts();
        }
      });
    });
    document.querySelectorAll(".viewDetailsBtn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = btn.getAttribute("data-id");
        window.open(`./Product-der.html?id=${id}`, "_blank");
      });
    });

    // Update selection UI
    updateSelectedCount();
    updateSelectAllCheckbox();

    console.log("loadProducts completed successfully");
  } catch (error) {
    console.error("Error loading products:", error);
    const productsGrid = document.getElementById("productsGrid");
    if (productsGrid) {
      productsGrid.innerHTML = `
        <div class="col-span-full flex items-center justify-center p-8">
          <div class="text-center text-red-500">
            <span class="material-icons text-4xl mb-4">error</span>
            <p>Error loading products: ${error.message}</p>
            <button onclick="location.reload()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded">Retry</button>
          </div>
        </div>
      `;
    }
  }
}

// Logout logic
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    auth.signOut().then(() => {
      window.location.href = "/login";
    });
  });
}

// --- Print Products Logic ---

async function printProducts() {
  try {
    // Check if any products are selected
    if (selectedProducts.size === 0) {
      alert("Please select at least one product to print.");
      return;
    }

    // Create a new window for printing
    const printWindow = window.open("", "_blank");

    // Get selected products
    const selectedProductData = allProducts.filter((product) =>
      selectedProducts.has(product.id)
    );

    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MADAS Barcodes - Print</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          :root {
            --madas-primary: #27491F;
            --madas-light: #F4F4F4;
            --madas-dark: #F0CAE1;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }

          .print-header {
            text-align: center;
            margin-bottom: 20px;
            padding: 20px;
            background: #f0f0f0;
            border-radius: 5px;
          }

          .print-header h1 {
            color: var(--madas-primary);
            margin: 0 0 10px 0;
            font-size: 24px;
          }

          .print-header p {
            margin: 5px 0;
            color: #666;
          }

          .print-item {
            margin-bottom: 1cm;
            padding: 1cm;
            border: 1px solid var(--madas-primary);
            text-align: center;
            page-break-inside: avoid;
            background: white;
          }

          .print-item svg {
            margin: 0 auto .3cm;
            width: 100%;
            height: auto;
          }

          .code-text {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: .3cm;
            color: var(--madas-primary);
          }

          .desc-text {
            font-size: 30pt;
            color: var(--madas-dark);
            margin-top: .3cm;
          }

          .product-info {
            font-size: 14pt;
            color: #666;
            margin-bottom: .2cm;
          }

          .size-info {
            font-size: 16pt;
            font-weight: bold;
            color: var(--madas-primary);
            margin-bottom: .2cm;
          }

          @media print {
            body {
              margin: 1cm;
            }
            
            .print-item {
              margin-bottom: 1cm;
              padding: 1cm;
              border: 1px solid var(--madas-primary);
              text-align: center;
              page-break-inside: avoid;
            }

            .print-item svg {
              margin: 0 auto .3cm;
              width: 100%;
              height: auto;
            }

            .code-text {
              font-size: 12pt;
              font-weight: bold;
              margin-bottom: .3cm;
            }

            .desc-text {
              font-size: 30pt;
              color: var(--madas-dark);
            }

            .product-info {
              font-size: 14pt;
              color: #666;
              margin-bottom: .2cm;
            }

            .size-info {
              font-size: 16pt;
              font-weight: bold;
              color: var(--madas-primary);
              margin-bottom: .2cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>MADAS Barcodes</h1>
          <p>Printed on: ${new Date().toLocaleDateString()}</p>
          <p>Selected Products: ${selectedProducts.size} of ${
      allProducts.length
    }</p>
        </div>
    `;

    // Process each selected product
    for (const product of selectedProductData) {
      const stockObj = product.stock || {};
      const sizeBarcodes = product.sizeBarcodes || {};

      // For each size variant, create barcodes equal to the stock quantity
      Object.entries(stockObj).forEach(([size, quantity]) => {
        const barcode = sizeBarcodes[size] || product.barcode + "-" + size;

        // Create barcodes equal to the stock quantity
        for (let i = 0; i < quantity; i++) {
          const barcodeId = `barcode-${product.id}-${size}-${i}`;

          printContent += `
            <div class="print-item">
              <div class="code-text">${barcode}</div>
              <svg id="${barcodeId}"></svg>
              <div class="product-info">${
                product.name || "Unnamed Product"
              }</div>
              <div class="size-info">Size: ${size}</div>
              <div class="desc-text">MADAS ${
                product.name || "Product"
              } Size ${size}</div>
            </div>
          `;
        }
      });
    }

    printContent += `
        <script>
          // Generate barcodes after page loads
          window.addEventListener('load', function() {
            const selectedProductData = ${JSON.stringify(selectedProductData)};
            
            selectedProductData.forEach(product => {
              const stockObj = product.stock || {};
              const sizeBarcodes = product.sizeBarcodes || {};
              
              Object.entries(stockObj).forEach(([size, quantity]) => {
                const barcode = sizeBarcodes[size] || (product.barcode + '-' + size);
                
                for (let i = 0; i < quantity; i++) {
                  const barcodeId = 'barcode-' + product.id + '-' + size + '-' + i;
                  const svgElement = document.getElementById(barcodeId);
                  
                  if (svgElement && typeof JsBarcode !== 'undefined') {
                    JsBarcode(svgElement, barcode, {
                      format: "CODE128",
                      displayValue: true,
                      fontSize: 14,
                      lineColor: "#000",
                      width: 2,
                      height: 60
                    });
                  }
                }
              });
            });
            
            // Auto-print after barcodes are generated
            setTimeout(() => {
              window.print();
            }, 500);
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // The print will be triggered automatically after barcodes are generated
  } catch (error) {
    console.error("Error printing products:", error);
    alert("Error generating print view: " + error.message);
  }
}

// Print button event listeners will be initialized in initializeDOMElements

// --- Excel Upload/Download Functions ---
let uploadExcelBtn, downloadExcelBtn, excelFileInput;

async function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    // Show loading state
    uploadExcelBtn.disabled = true;
    uploadExcelBtn.innerHTML =
      '<span class="material-icons animate-spin">hourglass_empty</span><span>Processing...</span>';

    const data = await readExcelFile(file);
    const products = parseExcelData(data);

    if (products.length === 0) {
      alert(
        "No valid products found in the Excel file. Please check the format."
      );
      return;
    }

    // Confirm upload
    const confirmed = confirm(
      `Found ${products.length} products in the file. Do you want to upload them?`
    );
    if (!confirmed) return;

    // Upload products to Firestore
    await uploadProductsToFirestore(products);

    alert(`Successfully uploaded ${products.length} products!`);

    // Reload products
    await loadProducts();
  } catch (error) {
    console.error("Error uploading Excel file:", error);
    alert("Error uploading Excel file: " + error.message);
  } finally {
    // Reset button state
    uploadExcelBtn.disabled = false;
    uploadExcelBtn.innerHTML =
      '<span class="material-icons">upload_file</span><span>Upload Excel</span>';
    // Clear file input
    excelFileInput.value = "";
  }
}

function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function parseExcelData(data) {
  if (!data || data.length < 2) return [];

  const headers = data[0];
  const products = [];

  // Expected headers
  const expectedHeaders = [
    "Name",
    "Description",
    "Price",
    "SKU",
    "Low Stock Alert",
    "Size",
    "Stock",
    "Barcode",
  ];

  // Validate headers
  const headerMap = {};
  headers.forEach((header, index) => {
    if (expectedHeaders.includes(header)) {
      headerMap[header] = index;
    }
  });

  if (Object.keys(headerMap).length < 3) {
    throw new Error("Invalid Excel format. Please use the template provided.");
  }

  // Group products by name (for multiple sizes)
  const productGroups = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const name = row[headerMap["Name"]] || "";
    const description = row[headerMap["Description"]] || "";
    const price = parseFloat(row[headerMap["Price"]]) || 0;
    const sku = row[headerMap["SKU"]] || "";
    const lowStockAlert = parseInt(row[headerMap["Low Stock Alert"]]) || 10;
    const size = row[headerMap["Size"]] || "";
    const stock = parseInt(row[headerMap["Stock"]]) || 0;
    const barcode = row[headerMap["Barcode"]] || "";

    if (!name) continue;

    if (!productGroups[name]) {
      productGroups[name] = {
        name,
        description,
        price,
        sku,
        lowStockAlert,
        stock: {},
        sizeBarcodes: {},
        barcode: barcode || generateBarcode(name),
      };
    }

    if (size && stock > 0) {
      productGroups[name].stock[size] = stock;
      if (barcode) {
        productGroups[name].sizeBarcodes[size] = barcode;
      }
    }
  }

  return Object.values(productGroups);
}

function generateBarcode(productName) {
  return "P" + Date.now() + Math.floor(Math.random() * 1000);
}

async function uploadProductsToFirestore(products) {
  const batch = [];

  for (const product of products) {
    try {
      await addDoc(collection(db, "products"), product);
    } catch (error) {
      console.error("Error adding product:", product.name, error);
      throw new Error(`Failed to add product: ${product.name}`);
    }
  }
}

// Download Excel functionality will be initialized in initializeDOMElements

async function handleExcelDownload() {
  try {
    // Show loading state
    downloadExcelBtn.disabled = true;
    downloadExcelBtn.innerHTML =
      '<span class="material-icons animate-spin">hourglass_empty</span><span>Preparing...</span>';

    // Get all products
    const productsSnapshot = await getDocs(collection(db, "products"));
    const products = [];

    productsSnapshot.forEach((docSnap) => {
      const product = docSnap.data();
      product.id = docSnap.id;
      products.push(product);
    });

    if (products.length === 0) {
      alert("No products to download.");
      return;
    }

    // Convert to Excel format
    const excelData = convertProductsToExcel(products);

    // Create and download file
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `MADAS_Products_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    link.click();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading Excel file:", error);
    alert("Error downloading Excel file: " + error.message);
  } finally {
    // Reset button state
    downloadExcelBtn.disabled = false;
    downloadExcelBtn.innerHTML =
      '<span class="material-icons">download</span><span>Download Excel</span>';
  }
}

function convertProductsToExcel(products) {
  // Headers
  const headers = [
    "Name",
    "Description",
    "Price",
    "SKU",
    "Low Stock Alert",
    "Size",
    "Stock",
    "Barcode",
  ];
  const excelData = [headers];

  // Convert each product to rows
  products.forEach((product) => {
    const stockObj = product.stock || {};
    const sizeBarcodes = product.sizeBarcodes || {};

    if (Object.keys(stockObj).length === 0) {
      // Product with no sizes
      excelData.push([
        product.name || "",
        product.description || "",
        product.price || 0,
        product.sku || "",
        product.lowStockAlert || 10,
        "",
        0,
        product.barcode || "",
      ]);
    } else {
      // Product with sizes
      Object.entries(stockObj).forEach(([size, stock]) => {
        excelData.push([
          product.name || "",
          product.description || "",
          product.price || 0,
          product.sku || "",
          product.lowStockAlert || 10,
          size,
          stock,
          sizeBarcodes[size] || product.barcode || "",
        ]);
      });
    }
  });

  return excelData;
}
