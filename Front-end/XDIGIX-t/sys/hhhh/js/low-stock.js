// low-stock.js - Low Stock Products Page

// Firebase configuration and imports
const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:70470e2204065b4590583d3",
};

// Initialize Firebase
let firebaseInstance = null;

async function initializeFirebase() {
  try {
    // Import Firebase modules
    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
    );
    const {
      getFirestore,
      collection,
      getDocs,
      addDoc,
      updateDoc,
      deleteDoc,
      doc,
      query,
      where,
      orderBy,
    } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
    );
    const { getAuth, onAuthStateChanged, signOut } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
    );

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    firebaseInstance = {
      app,
      auth,
      db,
      collection,
      getDocs,
      addDoc,
      updateDoc,
      deleteDoc,
      doc,
      query,
      where,
      orderBy,
      onAuthStateChanged,
      signOut,
    };

    console.log("Firebase initialized successfully");

    // Initialize UI and load low stock products
    initializeUI();
    await loadLowStockProducts();
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    showError("Failed to initialize application. Please refresh the page.");
  }
}

// Global variables
let currentProducts = [];
let lowStockProducts = [];

// Export initialization function
export async function initializeLowStock() {
  console.log("Initializing low stock page...");
  await initializeFirebase();
}

function initializeUI() {
  console.log("Initializing UI...");

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

  // Initialize search functionality
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");

  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }

  if (categoryFilter) {
    categoryFilter.addEventListener("change", handleSearch);
  }

  // Add product button
  const addProductBtn = document.getElementById("addProductBtn");
  if (addProductBtn) {
    addProductBtn.addEventListener("click", () => {
      window.location.href = "./products.html";
    });
  }
}

async function loadLowStockProducts() {
  console.log("Loading low stock products...");

  try {
    const { db, collection, getDocs } = firebaseInstance;
    const productsSnapshot = await getDocs(collection(db, "products"));

    console.log(`Found ${productsSnapshot.size} total products`);

    const products = [];
    productsSnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });

    currentProducts = products;

    // Filter for low stock products only
    lowStockProducts = products.filter((product) => {
      const sizes = product.sizes || {};
      const totalStock = Object.values(sizes).reduce(
        (sum, size) => sum + (size.quantity || 0),
        0
      );
      // Only include products with stock > 0 but <= low stock alert
      return totalStock > 0 && totalStock <= (product.lowStockAlert || 5);
    });

    console.log(`Found ${lowStockProducts.length} low stock products`);

    renderProducts(lowStockProducts);
    updateStats(lowStockProducts);
    populateCategoryFilter(lowStockProducts); // <-- Add this line
  } catch (error) {
    console.error("Failed to load low stock products:", error);
    showError("Failed to load low stock products. Please refresh the page.");
  }
}

// Populate category filter with unique first words of product names
function populateCategoryFilter(products) {
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;

  const firstWords = new Set();
  products.forEach((product) => {
    if (product.name && typeof product.name === "string") {
      const firstWord = product.name.trim().split(/\s+/)[0];
      if (firstWord) firstWords.add(firstWord);
    }
  });

  // Clear existing options
  categoryFilter.innerHTML = '<option value="">All Categories</option>';
  Array.from(firstWords)
    .sort()
    .forEach((word) => {
      categoryFilter.innerHTML += `<option value="${word}">${word}</option>`;
    });
}

function handleSearch() {
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");

  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const selectedCategory = categoryFilter ? categoryFilter.value : "";

  console.log("Searching low stock products with:", {
    searchTerm,
    selectedCategory,
  });

  // Filter low stock products based on search criteria
  const filteredProducts = lowStockProducts.filter((product) => {
    // Search term filter
    const matchesSearch =
      !searchTerm ||
      (product.name && product.name.toLowerCase().includes(searchTerm)) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
      (product.description &&
        product.description.toLowerCase().includes(searchTerm)) ||
      (product.category && product.category.toLowerCase().includes(searchTerm));

    // Category filter
    const matchesCategory =
      !selectedCategory ||
      (product.category &&
        product.category.toLowerCase() === selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  console.log(
    `Filtered ${filteredProducts.length} low stock products from ${lowStockProducts.length} total`
  );

  // Render filtered products
  renderProducts(filteredProducts);
  updateStats(filteredProducts);
}

function renderProducts(products) {
  const productsGrid = document.getElementById("productsGrid");
  if (!productsGrid) {
    console.error("Products grid not found");
    return;
  }

  if (products.length === 0) {
    productsGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-500">
                    <span class="material-icons text-6xl mb-4">inventory_2</span>
                    <h3 class="text-xl font-medium mb-2">No Low Stock Products Found</h3>
                    <p>All products have sufficient stock levels.</p>
                </div>
            </div>
        `;
    return;
  }

  productsGrid.innerHTML = products
    .map((product) => {
      // Calculate total stock across all size variants
      const sizes = product.sizes || {};
      const totalStock = Object.values(sizes).reduce(
        (sum, size) => sum + (size.quantity || 0),
        0
      );

      // Determine stock status and color
      let stockStatus = "Low Stock";
      let stockColor = "text-orange-600";
      let stockBgColor = "bg-orange-100";

      if (totalStock === 0) {
        stockStatus = "Out of Stock";
        stockColor = "text-red-600";
        stockBgColor = "bg-red-100";
      }

      return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover cursor-pointer" onclick="openProductDetails('${
          product.id
        }')" style="cursor: pointer;">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-3">
                        <h3 class="text-lg font-semibold text-gray-900">${
                          product.name || "Unnamed Product"
                        }</h3>
                    </div>
                    
                    <!-- Stock Counter -->
                    <div class="mb-3">
                        <div class="flex items-center space-x-2">
                            <span class="material-icons text-sm text-gray-500">inventory</span>
                            <span class="text-sm font-medium text-gray-700">Total Stock:</span>
                            <span class="text-lg font-bold ${stockColor}">${totalStock}</span>
                            <span class="px-2 py-1 text-xs font-medium ${stockColor} ${stockBgColor} rounded-full">
                                ${stockStatus}
                            </span>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-gray-500">SKU: ${
                          product.sku || "N/A"
                        }</span>
                        <div class="flex space-x-2">
                            <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="event.stopPropagation(); editProduct('${
                              product.id
                            }')">Edit</button>
                            <button class="text-red-600 hover:text-red-800 text-sm" onclick="event.stopPropagation(); deleteProduct('${
                              product.id
                            }')">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    })
    .join("");
}

function updateStats(products) {
  const lowStockCount = products.length;
  const totalValue = products.reduce((sum, p) => {
    const sizes = p.sizes || {};
    const totalQuantity = Object.values(sizes).reduce(
      (qty, size) => qty + (size.quantity || 0),
      0
    );
    return sum + (p.price || 0) * totalQuantity;
  }, 0);

  // Calculate average stock level
  const totalStock = products.reduce((sum, p) => {
    const sizes = p.sizes || {};
    return (
      sum +
      Object.values(sizes).reduce((qty, size) => qty + (size.quantity || 0), 0)
    );
  }, 0);
  const avgStock =
    products.length > 0 ? Math.round(totalStock / products.length) : 0;

  // Update stats elements
  const lowStockElement = document.getElementById("low-stock-count");
  const totalValueElement = document.getElementById("total-value");
  const avgStockElement = document.getElementById("avg-stock");

  if (lowStockElement) lowStockElement.textContent = lowStockCount;
  if (totalValueElement)
    totalValueElement.textContent = `$${totalValue.toFixed(2)}`;
  if (avgStockElement) avgStockElement.textContent = avgStock;
}

// Global functions for product actions
function openProductDetails(productId) {
  console.log("openProductDetails called for:", productId);
  // Redirect to products page with edit parameter
  window.location.href = `./products.html?edit=${productId}`;
}

function editProduct(productId) {
  console.log("editProduct called for:", productId);
  // Redirect to products page with edit parameter
  window.location.href = `./products.html?edit=${productId}`;
}

async function deleteProduct(productId) {
  console.log("deleteProduct called for:", productId);
  if (confirm("Are you sure you want to delete this product?")) {
    try {
      const { db, doc, deleteDoc } = firebaseInstance;
      await deleteDoc(doc(db, "products", productId));
      console.log("Product deleted successfully");
      await loadLowStockProducts(); // Reload the low stock products list
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error deleting product: " + error.message);
    }
  }
}

function showError(message) {
  console.error(message);
  // You can implement a more sophisticated error display here
  alert(message);
}
