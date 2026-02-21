// products-fixed.js - Fixed version for Firebase hosting compatibility
// Now uses shared authentication system

// Firebase configuration and imports
const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:70470e2204065b4590583d3",
};

// Initialize Firebase (this will be done by shared-auth.js, but we need it for imports)
let firebaseInstance = null;

async function initializeFirebase() {
  try {
    // Import Firebase modules
    const { initializeApp, getApp } = await import(
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

    // Check if Firebase is already initialized
    let app;
    try {
      app = getApp();
    } catch (error) {
      // No app exists, initialize it
      app = initializeApp(firebaseConfig);
    }

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

    // Initialize UI and load storages and products
    initializeUI();
    await loadStorages();
    await loadProducts();
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    // Don't show alert - just log the error. Permission checker will handle redirects if needed.
  }
}

// Global variables
let selectedProducts = new Set();
let currentProducts = [];
let currentStorages = [];
let currentStorageId = 'all';
let isLoadingProducts = false;

// Loading functions
function showLoading(message = "Loading...") {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    const loadingText = loadingScreen.querySelector('p');
    if (loadingText) {
      loadingText.textContent = message;
    }
    loadingScreen.style.display = 'flex';
  }
}

function hideLoading() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
}

function showError(message) {
  alert(`Error: ${message}`);
}

function showSuccess(message) {
  alert(`Success: ${message}`);
}

// Export initialization function
export async function initializeProducts() {
  console.log("Initializing products page...");
  
  // Wait for business context to be available
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max wait
  
  while (!window.currentBusinessId && attempts < maxAttempts) {
    console.log(`Waiting for business context... attempt ${attempts + 1}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!window.currentBusinessId) {
    console.error('❌ Business context not available after waiting');
    // Don't show alert - just log the error. Permission checker will handle redirects if needed.
    return;
  }
  
  console.log('✅ Business context available, initializing products...');
  await initializeFirebase();
}

// Storage Management Functions
async function loadStorages() {
  console.log("Loading storages...");
  
  try {
    if (!firebaseInstance) {
      console.error('❌ Firebase not initialized');
      return;
    }
    
    const { db, collection, getDocs } = firebaseInstance;
    
    if (!window.currentBusinessId) {
      console.error('❌ No business context available for storages');
      return;
    }
    
    console.log('🏪 Loading storages for business:', window.currentBusinessId);
    const storagesRef = collection(db, "businesses", window.currentBusinessId, "storages");
    const storagesSnapshot = await getDocs(storagesRef);
    
    console.log(`Found ${storagesSnapshot.size} storages`);
    
    currentStorages = [];
    storagesSnapshot.forEach((doc) => {
      currentStorages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Storages loaded:', currentStorages);
    
    // Update storage selector
    updateStorageSelector();
    
    // Update storage count
    const totalStoragesElement = document.getElementById('total-storages');
    if (totalStoragesElement) {
      totalStoragesElement.textContent = currentStorages.length;
    }
    
    console.log('✅ Storages loaded successfully');
    
  } catch (error) {
    console.error("Error loading storages:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    showError(`Failed to load storages: ${error.message}`);
  }
}

function updateStorageSelector() {
  const storageSelector = document.getElementById('storageSelector');
  const productStorage = document.getElementById('productStorage');
  
  if (storageSelector) {
    // Clear existing options except "All Storages"
    storageSelector.innerHTML = '<option value="all">All Storages</option>';
    
    currentStorages.forEach(storage => {
      const option = document.createElement('option');
      option.value = storage.id;
      option.textContent = `${storage.name} (${storage.type})`;
      storageSelector.appendChild(option);
    });
  }
  
  if (productStorage) {
    // Clear existing options except placeholder
    productStorage.innerHTML = '<option value="">Select Storage</option>';
    
    currentStorages.forEach(storage => {
      const option = document.createElement('option');
      option.value = storage.id;
      option.textContent = `${storage.name} (${storage.type})`;
      productStorage.appendChild(option);
    });
  }
}

function getStorageName(storageId) {
  const storage = currentStorages.find(s => s.id === storageId);
  return storage ? `${storage.name} (${storage.type})` : 'Unknown Storage';
}

async function addStorage(storageData) {
  try {
    console.log('Starting storage addition with data:', storageData);
    
    if (!firebaseInstance) {
      throw new Error('Firebase not initialized');
    }
    
    const { db, collection, addDoc } = firebaseInstance;
    
    if (!window.currentBusinessId) {
      throw new Error('No business context available');
    }
    
    console.log('Adding storage to business:', window.currentBusinessId);
    const storagesRef = collection(db, "businesses", window.currentBusinessId, "storages");
    
    const storageDoc = {
      ...storageData,
      createdAt: new Date(),
      isActive: true
    };
    
    console.log('Storage document to add:', storageDoc);
    const docRef = await addDoc(storagesRef, storageDoc);
    
    console.log('✅ Storage added with ID:', docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error("Error adding storage:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw new Error(`Storage addition failed: ${error.message}`);
  }
}

// Storage modal event handlers
function initializeStorageModal() {
  const addStorageBtn = document.getElementById('addStorageBtn');
  const addStorageModal = document.getElementById('addStorageModal');
  const closeStorageModalBtn = document.getElementById('closeStorageModalBtn');
  const cancelStorageBtn = document.getElementById('cancelStorageBtn');
  const addStorageForm = document.getElementById('addStorageForm');
  
  if (addStorageBtn) {
    addStorageBtn.addEventListener('click', () => {
      addStorageModal.classList.remove('hidden');
    });
  }
  
  if (closeStorageModalBtn) {
    closeStorageModalBtn.addEventListener('click', () => {
      addStorageModal.classList.add('hidden');
      addStorageForm.reset();
    });
  }
  
  if (cancelStorageBtn) {
    cancelStorageBtn.addEventListener('click', () => {
      addStorageModal.classList.add('hidden');
      addStorageForm.reset();
    });
  }
  
  if (addStorageForm) {
    addStorageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const storageData = {
        name: document.getElementById('storageName').value,
        type: document.getElementById('storageType').value,
        location: document.getElementById('storageLocation').value,
        description: document.getElementById('storageDescription').value,
        capacity: document.getElementById('storageCapacity').value ? parseInt(document.getElementById('storageCapacity').value) : null
      };
      
      try {
        console.log('Adding storage with data:', storageData);
        await addStorage(storageData);
        console.log('Storage added successfully, reloading storages...');
        await loadStorages(); // Reload storages
        addStorageModal.classList.add('hidden');
        addStorageForm.reset();
        showSuccess('Storage added successfully!');
      } catch (error) {
        console.error('Error in storage form submission:', error);
        showError(`Failed to add storage: ${error.message}`);
      }
    });
  }
}

// Storage selector change handler
function initializeStorageSelector() {
  const storageSelector = document.getElementById('storageSelector');
  
  if (storageSelector) {
    storageSelector.addEventListener('change', async (e) => {
      currentStorageId = e.target.value;
      console.log('Storage changed to:', currentStorageId);
      
      // Check if we have the necessary context before loading products
      if (!window.currentBusinessId) {
        console.warn('⚠️ No business context available, waiting...');
        // Wait a bit for business context to be established
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max wait
        
        while (!window.currentBusinessId && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.currentBusinessId) {
          console.error('❌ Business context not available after waiting');
          showError('Business context not available. Please refresh the page.');
          return;
        }
      }
      
      if (!firebaseInstance) {
        console.warn('⚠️ Firebase not initialized, waiting...');
        // Wait a bit for Firebase to be initialized
        let attempts = 0;
        const maxAttempts = 20; // 2 seconds max wait
        
        while (!firebaseInstance && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!firebaseInstance) {
          console.error('❌ Firebase not initialized after waiting');
          showError('System not ready. Please refresh the page.');
          return;
        }
      }
      
      console.log('✅ Context ready, loading products...');
      await loadProducts(); // Reload products with new storage filter
    });
  }
}

// Initialize the application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, products page ready for initialization");
    initializeStorageModal();
    initializeStorageSelector();
  });
} else {
  console.log("DOM already loaded, products page ready for initialization");
  initializeStorageModal();
  initializeStorageSelector();
}

// Authentication is now handled by shared-auth.js
// These functions are removed to prevent conflicts

function applyPermissionBasedUI(permissions) {
  const addProductBtn = document.getElementById("addProductBtn");
  const uploadExcelBtn = document.getElementById("uploadExcelBtn");
  const downloadExcelBtn = document.getElementById("downloadExcelBtn");

  // Show/hide buttons based on edit permission
  if (addProductBtn) {
    if (!permissions?.inventory?.includes("edit")) {
      addProductBtn.style.display = "none";
    } else {
      addProductBtn.style.display = "flex";
    }
  }

  if (uploadExcelBtn) {
    if (!permissions?.inventory?.includes("edit")) {
      uploadExcelBtn.style.display = "none";
    } else {
      uploadExcelBtn.style.display = "flex";
    }
  }

  if (downloadExcelBtn) {
    if (!permissions?.inventory?.includes("view")) {
      downloadExcelBtn.style.display = "none";
    } else {
      downloadExcelBtn.style.display = "flex";
    }
  }
}

function initializeUI() {
  console.log("Initializing UI...");

  // Initialize selection handlers
  initializeSelectionHandlers();

  // Initialize DOM elements and event listeners
  initializeDOMElements();
}

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
  const productCheckboxes = document.querySelectorAll(".product-checkbox");
  productCheckboxes.forEach((checkbox) => {
    checkbox.checked = isChecked;
    handleProductSelection(checkbox.value, isChecked);
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
  const selectedCount = document.getElementById("selectedCount");
  if (selectedCount) {
    selectedCount.textContent = `${selectedProducts.size} selected`;
  }
}

function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  const productCheckboxes = document.querySelectorAll(".product-checkbox");

  if (productCheckboxes.length === 0) return;

  const checkedCount = Array.from(productCheckboxes).filter(
    (cb) => cb.checked
  ).length;
  selectAllCheckbox.checked = checkedCount === productCheckboxes.length;
  selectAllCheckbox.indeterminate =
    checkedCount > 0 && checkedCount < productCheckboxes.length;
}

function initializeDOMElements() {
  // Initialize modal elements
  const addProductModal = document.getElementById("addProductModal");
  const addProductForm = document.getElementById("addProductForm");
  const closeAddModalBtn = document.getElementById("closeAddModalBtn");
  const cancelAddBtn = document.getElementById("cancelAddBtn");
  const addProductBtn = document.getElementById("addProductBtn");
  const uploadExcelBtn = document.getElementById("uploadExcelBtn");
  const downloadExcelBtn = document.getElementById("downloadExcelBtn");
  const printProductsBtn = document.getElementById("printProductsBtn");
  const printProductsBtnSidebar = document.getElementById(
    "printProductsBtnSidebar"
  );
  const excelFileInput = document.getElementById("excelFileInput");
  const addSizeBtn = document.getElementById("addSizeBtn");

  // Add product button (main header)
  if (addProductBtn) {
    addProductBtn.addEventListener("click", openAddProductModal);
  }

  // Add product button (sidebar)
  const addProductBtnSidebar = document.getElementById("addProductBtnSidebar");
  if (addProductBtnSidebar) {
    addProductBtnSidebar.addEventListener("click", openAddProductModal);
  }

  // Excel upload button
  if (uploadExcelBtn) {
    uploadExcelBtn.addEventListener("click", () => {
      excelFileInput.click();
    });
  }

  // Excel download button
  if (downloadExcelBtn) {
    downloadExcelBtn.addEventListener("click", handleExcelDownload);
  }

  // Print products button (main header)
  if (printProductsBtn) {
    printProductsBtn.addEventListener("click", printProducts);
  }

  // Print products button (sidebar)
  if (printProductsBtnSidebar) {
    printProductsBtnSidebar.addEventListener("click", printProducts);
  }

  // Excel file input
  if (excelFileInput) {
    excelFileInput.addEventListener("change", handleExcelUpload);
  }

  // Modal close buttons
  if (closeAddModalBtn) {
    closeAddModalBtn.addEventListener("click", closeAddProductModal);
  }

  if (cancelAddBtn) {
    cancelAddBtn.addEventListener("click", closeAddProductModal);
  }

  // Modal form submit
  if (addProductForm) {
    addProductForm.addEventListener("submit", handleAddProductSubmit);
  }

  // Add size button
  if (addSizeBtn) {
    console.log("Setting up addSizeBtn event listener");
    addSizeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Add Size button clicked");
      addSizeVariant();
    });
  } else {
    console.error("addSizeBtn not found");
  }

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const stockFilter = document.getElementById("stockFilter");

  // Search input
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
  }

  // Category filter
  if (categoryFilter) {
    categoryFilter.addEventListener("change", handleSearch);
  }

  // Stock filter
  if (stockFilter) {
    stockFilter.addEventListener("change", handleSearch);
  }

  // Logout button is handled by shared-auth.js
}

// Global function for adding size variants (needed for onclick in HTML)
function addSizeVariant() {
  console.log("addSizeVariant function called");
  const sizeVariantsList = document.getElementById("sizeVariantsList");
  if (!sizeVariantsList) {
    console.error("sizeVariantsList not found");
    return;
  }

  const mainBarcode = document.getElementById("mainBarcode").value;
  const sizeCount = sizeVariantsList.children.length + 1;
  const newSize = `S${sizeCount}`;
  const newBarcode = generateSizeVariantBarcode(mainBarcode, newSize);

  const row = document.createElement("div");
  row.className = "flex gap-2 items-center";
  row.innerHTML = `
    <input type="text" class="size-input border px-2 py-1 rounded w-20" placeholder="Size" value="${newSize}" />
    <input type="number" class="qty-input border px-2 py-1 rounded w-20" placeholder="Stock" min="0" />
    <input type="text" class="barcode-input border px-2 py-1 rounded w-40 bg-gray-100" placeholder="Barcode" value="${newBarcode}" readonly />
    <svg class="barcode-svg" width="100" height="40"></svg>
    <button type="button" class="remove-size-btn text-red-500">Remove</button>
  `;

  row.querySelector(".remove-size-btn").addEventListener("click", () => {
    row.remove();
  });

  // Generate barcode SVG for the new size variant
  const svg = row.querySelector(".barcode-svg");
  if (svg && window.JsBarcode) {
    window.JsBarcode(svg, newBarcode, { format: "CODE128" });
  }

  sizeVariantsList.appendChild(row);
}

// Global function for editing products (needed for onclick in HTML)
function editProduct(productId) {
  console.log("editProduct called for:", productId);
  const product = currentProducts.find((p) => p.id === productId);
  if (product) {
    openEditProductModal(product);
  } else {
    console.error("Product not found:", productId);
  }
}

// Global function for deleting products (needed for onclick in HTML)
async function deleteProduct(productId) {
  console.log("deleteProduct called for:", productId);
  if (confirm("Are you sure you want to delete this product?")) {
    try {
      const { db, doc, deleteDoc } = firebaseInstance;
      if (!window.currentBusinessId) {
        showError('No business context available');
        return;
      }
      await deleteDoc(doc(db, "businesses", window.currentBusinessId, "products", productId));
      console.log("Product deleted successfully");
      await loadProducts(); // Reload the products list
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error deleting product: " + error.message);
    }
  }
}

// Global function for opening product details (needed for onclick in HTML)
function openProductDetails(productId) {
  console.log("openProductDetails called for:", productId);
  // For now, just open the edit modal. You can implement a separate details view later
  const product = currentProducts.find((p) => p.id === productId);
  if (product) {
    openEditProductModal(product);
  } else {
    console.error("Product not found:", productId);
  }
}

// Global function for opening low stock page (needed for onclick in HTML)
function openLowStockPage() {
  console.log("Opening low stock page...");
  window.location.href = "./low-stock.html";
}

async function loadProducts() {
  console.log("Loading products...");
  
  // Prevent multiple simultaneous calls
  if (isLoadingProducts) {
    console.log("Products already loading, skipping...");
    return;
  }
  
  isLoadingProducts = true;

  try {
    // Check if Firebase is initialized
    if (!firebaseInstance) {
      throw new Error('Firebase not initialized');
    }
    
    const { db, collection, getDocs, query, where } = firebaseInstance;
    
    // TENANT ISOLATION: Load products for current business only
    if (!window.currentBusinessId) {
      console.error('❌ No business context available');
      console.log('Available window properties:', Object.keys(window).filter(key => key.includes('current')));
      
      // Try to wait a bit more for business context
      console.log('⏳ Waiting for business context...');
      let retryAttempts = 0;
      const maxRetries = 10;
      
      while (!window.currentBusinessId && retryAttempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 200));
        retryAttempts++;
        console.log(`Retry attempt ${retryAttempts}/${maxRetries}`);
      }
      
      if (!window.currentBusinessId) {
        showError('Business context not available. Please wait a moment and try again.');
        return;
      }
    }
    
    console.log('📦 Loading products for business:', window.currentBusinessId);
    const productsRef = collection(db, "businesses", window.currentBusinessId, "products");
    let productsSnapshot;
    
    // Filter by storage if not "all"
    if (currentStorageId && currentStorageId !== 'all') {
      const productsQuery = query(productsRef, where("storageId", "==", currentStorageId));
      productsSnapshot = await getDocs(productsQuery);
      console.log(`Filtering products by storage: ${currentStorageId}`);
    } else {
      productsSnapshot = await getDocs(productsRef);
      console.log('Loading all products');
    }

    console.log(`Found ${productsSnapshot.size} products`);

    const products = [];
    productsSnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });

    currentProducts = products;
    renderProducts(products);
    updateStats(products);
    populateCategoryFilter(products); // <-- Add this line

    // Check if we need to open edit modal
    checkForEditMode();
  } catch (error) {
    console.error("Failed to load products:", error);
    console.log("Products loading failed, will retry automatically");
    
    // Show a subtle loading message instead of an error alert
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
      productsGrid.innerHTML = `
        <div class="col-span-full flex items-center justify-center py-8">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--madas-primary)] mx-auto mb-4"></div>
            <p class="text-gray-500">Loading products...</p>
            <p class="text-xs text-gray-400 mt-2">Please wait while we load your products</p>
          </div>
        </div>
      `;
    }
    
    // Retry loading after a short delay without showing alerts
    setTimeout(() => {
      if (!isLoadingProducts) {
        console.log("Retrying product loading...");
        loadProducts();
      }
    }, 2000);
  } finally {
    isLoadingProducts = false;
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

// Enhanced smart search function
function smartProductMatch(product, searchTerm) {
  if (!searchTerm) return true;
  const fields = [product.name, product.sku, product.description]
    .join(" ")
    .toLowerCase();
  const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
  // All search words must be present (fuzzy: allow 1 missing char per word)
  return searchWords.every((word) => {
    // Fuzzy: allow for missing/extra character
    if (fields.includes(word)) return true;
    // Fuzzy: check for close match (Levenshtein distance 1)
    return fields.split(/\s+/).some((token) => levenshtein(token, word) <= 1);
  });
}

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const v0 = Array(b.length + 1).fill(0);
  const v1 = Array(b.length + 1).fill(0);
  for (let i = 0; i <= b.length; i++) v0[i] = i;
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }
  return v1[b.length];
}

// Replace the product filtering logic in the search handler
function filterProducts(products, searchTerm) {
  return products.filter((product) => smartProductMatch(product, searchTerm));
}

// Search and filter functionality
function handleSearch() {
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const stockFilter = document.getElementById("stockFilter");

  const searchTerm = searchInput ? searchInput.value.trim() : "";
  const selectedCategory = categoryFilter ? categoryFilter.value : "";
  const selectedStockFilter = stockFilter ? stockFilter.value : "";

  // Filter products based on smart fuzzy search, category, and stock
  const filteredProducts = currentProducts.filter((product) => {
    // Smart fuzzy search
    const matchesSearch = smartProductMatch(product, searchTerm);
    // Category filter
    const matchesCategory =
      !selectedCategory ||
      (product.category &&
        product.category.toLowerCase() === selectedCategory.toLowerCase());
    // Stock filter
    let matchesStock = true;
    if (selectedStockFilter) {
      const sizes = product.sizeVariants || {};
      const totalStock = Object.values(sizes).reduce(
        (sum, size) => sum + (size.quantity || 0),
        0
      );
      switch (selectedStockFilter) {
        case "in-stock":
          matchesStock = totalStock > 0;
          break;
        case "low-stock":
          matchesStock =
            totalStock > 0 && totalStock <= (product.lowStockAlert || 5);
          break;
        case "out-of-stock":
          matchesStock = totalStock === 0;
          break;
      }
    }
    return matchesSearch && matchesCategory && matchesStock;
  });

  renderProducts(filteredProducts);
  updateStats(filteredProducts);
}

function checkForEditMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const editProductId = urlParams.get("edit");

  if (editProductId) {
    const product = currentProducts.find((p) => p.id === editProductId);
    if (product) {
      openEditProductModal(product);
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
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
                    <h3 class="text-xl font-medium mb-2">No Products Found</h3>
                    <p>Start by adding your first product to the inventory.</p>
                </div>
            </div>
        `;
    return;
  }

  productsGrid.innerHTML = products
    .map((product) => {
      // Calculate total stock across all size variants
      // Check both sizeVariants (new) and sizes (old) for backward compatibility
      const sizes = product.sizeVariants || product.sizes || {};
      const totalStock = Object.values(sizes).reduce(
        (sum, size) => sum + (size.quantity || size.stock || 0),
        0
      );
      
      // Debug: Log product data for stock calculation
      console.log(`🔍 STOCK CALCULATION DEBUG for "${product.name}":`, {
        'Product ID': product.id,
        'Has sizeVariants': !!product.sizeVariants,
        'Has sizes': !!product.sizes,
        'sizeVariants type': typeof product.sizeVariants,
        'sizes type': typeof product.sizes,
        'sizeVariants value': product.sizeVariants,
        'sizes value': product.sizes,
        'sizesUsed (final)': sizes,
        'totalStock calculated': totalStock,
        'sizeVariants keys': Object.keys(product.sizeVariants || {}),
        'sizeVariants values': Object.values(product.sizeVariants || {}),
        'sizes keys': Object.keys(product.sizes || {}),
        'sizes values': Object.values(product.sizes || {}),
        'All product keys': Object.keys(product),
        'Product object (full)': product
      });

      // Determine stock status and color
      let stockStatus = "In Stock";
      let stockColor = "text-green-600";
      let stockBgColor = "bg-green-100";

      if (totalStock === 0) {
        stockStatus = "Out of Stock";
        stockColor = "text-red-600";
        stockBgColor = "bg-red-100";
      } else if (totalStock <= (product.lowStockAlert || 5)) {
        stockStatus = "Low Stock";
        stockColor = "text-orange-600";
        stockBgColor = "bg-orange-100";
      }

      return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover cursor-pointer product-card" onclick="openProductDetails('${
          product.id
        }')" style="cursor: pointer;">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-3">
                        <input type="checkbox" class="product-checkbox w-4 h-4 text-[var(--madas-primary)] bg-gray-100 border-gray-300 rounded focus:ring-[var(--madas-accent)] focus:ring-2" value="${
                          product.id
                        }" onclick="event.stopPropagation();">
                        <h3 class="text-lg font-semibold text-gray-900">${
                          product.name || "Unnamed Product"
                        }</h3>
                    </div>
                    <!-- Stock Counter -->
                    <div class="mb-3">
                        <div class="flex items-center space-x-2">
                            <span class="material-icons text-sm text-gray-500">inventory</span>
                            <span class="text-sm font-medium text-gray-700">Total Stock:</span>
                            <span class="px-2 py-1 text-xs font-medium ${stockColor} ${stockBgColor} rounded-full">
                                ${stockStatus}
                            </span>
                        </div>
                    </div>
                    <!-- Storage Information -->
                    <div class="mb-3">
                        <div class="flex items-center space-x-2">
                            <span class="material-icons text-sm text-gray-500">warehouse</span>
                            <span class="text-sm font-medium text-gray-700">Storage:</span>
                            <span class="text-sm text-gray-600">${
                              product.storageId ? getStorageName(product.storageId) : 'Not assigned'
                            }</span>
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

  // Add event listeners to checkboxes
  const checkboxes = document.querySelectorAll(".product-checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      handleProductSelection(e.target.value, e.target.checked);
    });
  });
}

function renderSizeVariants(sizes) {
  if (!sizes || Object.keys(sizes).length === 0) {
    return '<p class="text-sm text-gray-500">No size variants</p>';
  }

  return Object.entries(sizes)
    .map(
      ([size, data]) => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span class="text-sm font-medium">${size}</span>
            <span class="text-sm ${
              data.quantity > 0 ? "text-green-600" : "text-red-600"
            }">
                ${data.quantity || 0} in stock
            </span>
        </div>
    `
    )
    .join("");
}

function updateStats(products) {
  const totalProducts = products.length;

  const lowStock = products.filter((p) => {
    // Support both 'sizeVariants' and 'sizes' field names
    const sizeVariants = p.sizeVariants || p.sizes || {};

    // Calculate total stock from all size variants
    const totalStock = Object.values(sizeVariants).reduce(
      (sum, sizeData) => sum + (sizeData.quantity || 0),
      0
    );

    // If no size variants, use the stock field directly
    const stock = totalStock > 0 ? totalStock : (p.stock || 0);

    // Only count as low stock if stock is > 0 but <= low stock alert threshold
    return stock > 0 && stock <= (p.lowStockThreshold || p.lowStockAlert || 5);
  }).length;

  const outOfStock = products.filter((p) => {
    // Support both 'sizeVariants' and 'sizes' field names
    const sizeVariants = p.sizeVariants || p.sizes || {};

    // Calculate total stock from all size variants
    const totalStock = Object.values(sizeVariants).reduce(
      (sum, sizeData) => sum + (sizeData.quantity || 0),
      0
    );

    // If no size variants, use the stock field directly
    const stock = totalStock > 0 ? totalStock : (p.stock || 0);

    return stock === 0;
  }).length;

  const totalValue = products.reduce((sum, p) => {
    // Support both 'sizeVariants' and 'sizes' field names
    const sizeVariants = p.sizeVariants || p.sizes || {};

    // Calculate total quantity from all size variants
    const totalQuantity = Object.values(sizeVariants).reduce(
      (qty, sizeData) => qty + (sizeData.quantity || 0),
      0
    );

    // If no size variants, use the stock field directly
    const quantity = totalQuantity > 0 ? totalQuantity : (p.stock || 0);

    // Use selling price if available, otherwise use price
    const price = p.sellingPrice || p.price || 0;

    return sum + price * quantity;
  }, 0);

  // Update stats elements
  const totalElement = document.getElementById("total-products");
  const lowStockElement = document.getElementById("low-stock");
  const outOfStockElement = document.getElementById("out-of-stock");
  const totalValueElement = document.getElementById("total-value");

  if (totalElement) totalElement.textContent = totalProducts;
  if (lowStockElement) lowStockElement.textContent = lowStock;
  if (outOfStockElement) outOfStockElement.textContent = outOfStock;
  if (totalValueElement)
    totalValueElement.textContent = `$${totalValue.toFixed(2)}`;
}

// Product modal functions
function openAddProductModal() {
  const modal = document.getElementById("addProductModal");
  if (modal) {
    modal.classList.remove("hidden");

    // Clear form
    document.getElementById("addProductForm").reset();
    document.getElementById("sizeVariantsList").innerHTML = "";

    // Clear barcode SVG
    const svg = document.getElementById("mainBarcodeSvg");
    if (svg) {
      svg.innerHTML = "";
    }

    // Update modal title
    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) {
      modalTitle.textContent = "Add New Product";
    }

    // Add event listeners for form fields
    setupFormEventListeners();
  }
}

function openEditProductModal(product) {
  const modal = document.getElementById("addProductModal");
  if (modal) {
    modal.classList.remove("hidden");

    // Update modal title
    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) {
      modalTitle.textContent = "Edit Product";
    }

    // Populate form with product data
    document.getElementById("productName").value = product.name || "";
    document.getElementById("productDescription").value =
      product.description || "";
    document.getElementById("productPrice").value = product.price || "";
    document.getElementById("productSKU").value = product.sku || "";
    document.getElementById("productLowStock").value =
      product.lowStockAlert || "";
    document.getElementById("mainBarcode").value = product.mainBarcode || product.barcode || "";

    // Render size variants
    renderSizeVariantsInForm(product.sizeVariants || {});

    // Generate barcode if available
    if (product.barcode && window.JsBarcode) {
      const svg = document.getElementById("mainBarcodeSvg");
      if (svg) {
        window.JsBarcode(svg, product.barcode, { format: "CODE128" });
      }
    }

    // Store the product ID for editing
    modal.dataset.editProductId = product.id;

    // Add event listeners for form fields
    setupFormEventListeners();
  }
}

function setupFormEventListeners() {
  // Auto-generate SKU and barcode when product name changes
  const productNameInput = document.getElementById("productName");
  const productSkuInput = document.getElementById("productSKU");

  if (productNameInput) {
    productNameInput.addEventListener("input", () => {
      autoGenerateSKU(); // Auto-generate SKU first
      generateMainBarcode(); // Then generate barcode
    });
  }

  if (productSkuInput) {
    productSkuInput.addEventListener("input", generateMainBarcode);
  }
}

function autoGenerateSKU() {
  const productName = document.getElementById("productName").value;
  const skuInput = document.getElementById("productSKU");

  if (!productName.trim()) {
    return; // Don't generate SKU if no product name
  }

  // Create SKU from product name
  const cleanName = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // Remove special characters
    .substring(0, 6); // Take first 6 characters

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString().slice(-4);

  const generatedSKU = `${cleanName}${timestamp}`;
  skuInput.value = generatedSKU;
}

function closeAddProductModal() {
  const modal = document.getElementById("addProductModal");
  if (modal) {
    modal.classList.add("hidden");
    // Clear edit state
    delete modal.dataset.editProductId;
  }
}

async function handleAddProductSubmit(event) {
  event.preventDefault();

  try {
    const { db, collection, addDoc, doc, updateDoc } = firebaseInstance;
    const modal = document.getElementById("addProductModal");
    const isEditing = modal && modal.dataset.editProductId;

    const productData = {
      name: document.getElementById("productName").value,
      description: document.getElementById("productDescription").value,
      price: parseFloat(document.getElementById("productPrice").value),
      sku: document.getElementById("productSKU").value,
      storageId: document.getElementById("productStorage").value,
      lowStockAlert:
        parseInt(document.getElementById("productLowStock").value) || 5,
      mainBarcode: document.getElementById("mainBarcode").value,
      sizeVariants: getSizeVariantsFromForm(),
      updatedAt: new Date(),
    };

    if (isEditing) {
      // Update existing product
      if (!window.currentBusinessId) {
        showError('No business context available');
        return;
      }
      await updateDoc(
        doc(db, "businesses", window.currentBusinessId, "products", modal.dataset.editProductId),
        productData
      );
      console.log("Product updated successfully");
    } else {
      // Add new product
      if (!window.currentBusinessId) {
        showError('No business context available');
        return;
      }
      productData.createdAt = new Date();
      const productsRef = collection(db, "businesses", window.currentBusinessId, "products");
      await addDoc(productsRef, productData);
      console.log("Product added successfully");
    }

    closeAddProductModal();
    await loadProducts(); // Reload products
  } catch (error) {
    console.error("Failed to save product:", error);
    showError("Failed to save product. Please try again.");
  }
}

function getSizeVariantsFromForm() {
  const sizes = {};
  const sizeVariantsList = document.getElementById("sizeVariantsList");
  if (!sizeVariantsList) return sizes;

  const sizeDivs = sizeVariantsList.querySelectorAll("div");
  sizeDivs.forEach((div) => {
    const sizeInput = div.querySelector(".size-input");
    const qtyInput = div.querySelector(".qty-input");
    const barcodeInput = div.querySelector(".barcode-input");

    if (sizeInput && qtyInput) {
      const size = sizeInput.value.trim();
      const quantity = parseInt(qtyInput.value) || 0;
      const barcode = barcodeInput ? barcodeInput.value.trim() : "";

      if (size && quantity > 0) {
        const mainBarcode = document.getElementById("mainBarcode").value;
        sizes[size] = {
          quantity,
          barcode: barcode || generateSizeVariantBarcode(mainBarcode, size),
        };
      }
    }
  });

  return sizes;
}

function renderSizeVariantsInForm(sizes) {
  const container = document.getElementById("sizeVariantsList");
  if (!container) return;

  container.innerHTML = "";
  Object.entries(sizes).forEach(([size, data]) => {
    const row = document.createElement("div");
    row.className = "flex gap-2 items-center";
    row.innerHTML = `
      <input type="text" class="size-input border px-2 py-1 rounded w-20" placeholder="Size" value="${size}" />
      <input type="number" class="qty-input border px-2 py-1 rounded w-20" placeholder="Stock" min="0" value="${
        data.quantity
      }" />
      <input type="text" class="barcode-input border px-2 py-1 rounded w-40 bg-gray-100" placeholder="Barcode" value="${
        data.barcode || ""
      }" readonly />
      <svg class="barcode-svg" width="100" height="40"></svg>
      <button type="button" class="remove-size-btn text-red-500">Remove</button>
    `;

    row.querySelector(".remove-size-btn").addEventListener("click", () => {
      row.remove();
    });

    // Render barcode SVG - use numeric barcode
    const mainBarcode = document.getElementById("mainBarcode").value;
    const barcode =
      data.barcode || generateSizeVariantBarcode(mainBarcode, size);
    if (barcode) {
      const svg = row.querySelector(".barcode-svg");
      if (svg && window.JsBarcode) {
        window.JsBarcode(svg, barcode, { format: "CODE128" });
      }
    }

    container.appendChild(row);
  });
}

// Add size button functionality
// Local addSizeVariant function - removed to avoid conflicts with global function

// Generate numeric-only barcode
function generateNumericBarcode() {
  // Generate a 12-digit numeric barcode
  // Start with a prefix (e.g., 123) and add random digits
  const prefix = "123";
  const randomDigits = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, "0");
  const barcode = prefix + randomDigits;
  console.log('Generated barcode:', barcode);
  return barcode;
}

// Generate numeric barcode for size variants
function generateSizeVariantBarcode(mainBarcode, size) {
  // Convert main barcode to numeric and add size identifier
  const numericMain = mainBarcode.replace(/\D/g, ""); // Remove non-digits
  const sizeNumeric = size.toString().replace(/\D/g, ""); // Remove non-digits from size
  return numericMain + sizeNumeric.padStart(2, "0");
}

function generateSKU() {
  const productName = document.getElementById("productName").value;
  const skuInput = document.getElementById("productSKU");

  if (!productName.trim()) {
    return; // Don't generate SKU if no product name
  }

  // Create SKU from product name
  const cleanName = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // Remove special characters
    .substring(0, 6); // Take first 6 characters

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString().slice(-4);

  const generatedSKU = `${cleanName}${timestamp}`;
  skuInput.value = generatedSKU;

  // Also update barcode if it's empty - now using numeric barcode
  const barcodeInput = document.getElementById("mainBarcode");
  if (!barcodeInput.value) {
    barcodeInput.value = generateNumericBarcode();
    generateMainBarcode();
  }
}

function generateMainBarcode() {
  const productName = document.getElementById("productName").value;
  const sku = document.getElementById("productSKU").value;

  // Generate numeric barcode instead of alphanumeric
  const barcodeValue = generateNumericBarcode();

  document.getElementById("mainBarcode").value = barcodeValue;

  // Generate barcode SVG if JsBarcode is available
  if (window.JsBarcode) {
    const svg = document.getElementById("mainBarcodeSvg");
    if (svg) {
      window.JsBarcode(svg, barcodeValue, { format: "CODE128" });
    }
  }
}

// Excel functions
async function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    showLoading("Processing Excel file...");
    const jsonData = await readExcelFile(file);
    
    if (jsonData.length === 0) {
      showError("No data found in the Excel file");
      return;
    }
    
    // Debug: Log the first row to see column names
    console.log('Excel file columns:', Object.keys(jsonData[0]));
    console.log('First row data:', jsonData[0]);
    console.log('Main Barcode column exists:', 'Main Barcode' in jsonData[0]);
    console.log('Main Barcode value in first row:', jsonData[0]['Main Barcode']);

    // Process and validate the data with enhanced validation
    const errors = [];
    const warnings = [];

    // Group products by name to handle multiple size variants
    const productGroups = {};
    
    jsonData.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because Excel is 1-indexed and we skip header
      const productName = (row['Product Name'] || row['product_name'] || '').toString().trim();
      
      if (!productName) return; // Skip empty rows
      
      // Initialize product group if it doesn't exist
      if (!productGroups[productName]) {
        const mainBarcodeFromExcel = (row['Main Barcode'] || row['main_barcode'] || '').toString().trim();
        console.log(`Setting mainBarcode for ${productName}:`, {
          fromExcel: mainBarcodeFromExcel,
          isEmpty: !mainBarcodeFromExcel || mainBarcodeFromExcel === '',
          length: mainBarcodeFromExcel.length
        });
        
        productGroups[productName] = {
          name: productName,
          description: (row['Description'] || row['description'] || '').toString().trim(),
          price: parseFloat(row['Cost Price'] || row['cost_price'] || 0),
          sellingPrice: parseFloat(row['Selling Price'] || row['selling_price'] || 0),
          sku: (row['SKU'] || row['sku'] || '').toString().trim(),
          storage: (row['Storage Location'] || row['storage_location'] || '').toString().trim(),
          lowStockAlert: parseInt(row['Low Stock Alert'] || row['low_stock_alert'] || 5),
          unlimitedStock: (row['Unlimited Stock'] || row['unlimited_stock'] || '').toString().toLowerCase() === 'yes',
          mainBarcode: mainBarcodeFromExcel,
          category: (row['Category'] || row['category'] || '').toString().trim(),
          status: (row['Status'] || row['status'] || 'Active').toString().trim(),
          sizeVariants: {},
          rowNumber: rowNumber
        };
      }
      
      // Handle size variants - check for separate Size and Quantity columns
      const size = (row['Size'] || '').toString().trim();
      const quantity = parseInt(row['Quantity'] || 0);
      const sizeBarcode = (row['Size Barcode'] || '').toString().trim();
      
      console.log(`Processing row for ${productName}:`, {
        size: size,
        quantity: quantity,
        sizeBarcode: sizeBarcode,
        hasSize: !!size,
        hasQuantity: quantity > 0
      });
      
      if (size && quantity > 0) {
        productGroups[productName].sizeVariants[size] = {
          quantity: quantity,
          barcode: sizeBarcode || generateNumericBarcode()
        };
        console.log(`Added size variant: ${size} = ${quantity} units`);
      }
      
    });
    
    // Generate barcodes for products that don't have them
    Object.values(productGroups).forEach(product => {
      console.log(`Checking barcode for ${product.name}:`, {
        currentBarcode: product.mainBarcode,
        isEmpty: !product.mainBarcode,
        isEmptyString: product.mainBarcode === '',
        isUndefined: product.mainBarcode === undefined
      });
      
      if (!product.mainBarcode || product.mainBarcode === '') {
        product.mainBarcode = generateNumericBarcode();
        console.log(`✅ Generated barcode for ${product.name}: ${product.mainBarcode}`);
      } else {
        console.log(`Product ${product.name} already has barcode: ${product.mainBarcode}`);
      }
    });
    
    // Convert grouped products to array
    const processedData = Object.values(productGroups);
    
    // Debug: Log the processed data
    console.log('Processed products data:', processedData);
    processedData.forEach((product, index) => {
      console.log(`Product ${index + 1}:`, {
        name: product.name,
        mainBarcode: product.mainBarcode,
        sizeVariants: product.sizeVariants,
        sizeVariantsCount: Object.keys(product.sizeVariants).length,
        sizeVariantsDetails: Object.entries(product.sizeVariants).map(([size, data]) => ({
          size: size,
          quantity: data.quantity,
          barcode: data.barcode
        }))
      });
    });
    
    processedData.forEach((product) => {

      // Enhanced validation
      const rowErrors = [];
      const rowWarnings = [];

      // Required field validation
      if (!product.name) {
        rowErrors.push(`Product Name is required`);
      } else if (product.name.length > 100) {
        rowErrors.push(`Product Name is too long (max 100 characters)`);
      }

      if (!product.price || product.price <= 0) {
        rowErrors.push(`Valid Cost Price is required`);
      } else if (product.price > 999999) {
        rowErrors.push(`Cost Price is too high (max $999,999)`);
      }

      // Optional field validation
      if (product.sellingPrice && product.sellingPrice < product.price) {
        rowWarnings.push(`Selling Price ($${product.sellingPrice}) is less than Cost Price ($${product.price})`);
      }

      if (product.sku && product.sku.length > 50) {
        rowErrors.push(`SKU is too long (max 50 characters)`);
      }

      if (product.description && product.description.length > 500) {
        rowWarnings.push(`Description is too long (max 500 characters)`);
      }

      if (product.lowStockAlert < 0 || product.lowStockAlert > 9999) {
        rowErrors.push(`Low Stock Alert must be between 0 and 9999`);
      }

      // Status validation
      const validStatuses = ['Active', 'Inactive', 'Draft'];
      if (product.status && !validStatuses.includes(product.status)) {
        rowErrors.push(`Status must be one of: ${validStatuses.join(', ')}`);
      }

      // Size variants JSON validation
      // Size variants validation - removed since we now use separate Size and Quantity columns
      // The new format doesn't require JSON validation for size variants

      // Storage validation
      if (product.storage && !currentStorages.some(s => s.name === product.storage)) {
        rowWarnings.push(`Storage Location "${product.storage}" not found in system`);
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNumber}: ${rowErrors.join(', ')}`);
      }

      if (rowWarnings.length > 0) {
        warnings.push(`Row ${rowNumber}: ${rowWarnings.join(', ')}`);
      }
    });

    // Show warnings if any
    if (warnings.length > 0) {
      console.warn('Import warnings:', warnings);
      // You could show warnings in a modal or notification
    }

    // Show errors and stop if any
    if (errors.length > 0) {
      const errorMessage = `Validation errors found:\n\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n... and ${errors.length - 10} more errors` : ''}`;
      showError(errorMessage);
      return;
    }

    // Debug: Check the final data before import
    console.log('=== FINAL DATA BEFORE IMPORT ===');
    console.log('Total products to import:', processedData.length);
    processedData.slice(0, 3).forEach((product, index) => {
      console.log(`📦 SAMPLE PRODUCT ${index + 1} BEFORE IMPORT:`, {
        name: product.name,
        mainBarcode: product.mainBarcode,
        sizeVariants: product.sizeVariants,
        sizeVariantsKeys: Object.keys(product.sizeVariants || {}),
        sizeVariantsCount: Object.keys(product.sizeVariants || {}).length,
        sizeVariantsDetails: Object.entries(product.sizeVariants || {}).map(([size, data]) => ({
          size: size,
          quantity: data.quantity,
          barcode: data.barcode
        })),
        'Full product object': product
      });
    });
    
    // Import the products with progress tracking
    await importProductsWithProgress(processedData);
    
    showSuccess(`Successfully imported ${processedData.length} products${warnings.length > 0 ? ` (${warnings.length} warnings)` : ''}`);
    
    // Refresh the products list
    await loadProducts();

  } catch (error) {
    console.error("Excel upload error:", error);
    showError(`Failed to process Excel file: ${error.message}`);
  } finally {
    hideLoading();
    // Clear the file input
    event.target.value = '';
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
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
  const products = [];
  const productMap = new Map();

  data.forEach((row) => {
    const productName = row["Product Name"] || row["Name"] || "";
    const size = row["Size"] || "";
    const quantity = parseInt(row["Quantity"] || row["Stock"] || 0);
    const price = parseFloat(row["Price"] || 0);
    const sellingPrice = parseFloat(row["Selling Price"] || row["Price"] || 0);
    const description = row["Description"] || "";
    const sku = row["SKU"] || "";
    const category = row["Category"] || "";
    const mainBarcode = row["Main Barcode"] || "";
    const sizeBarcode = row["Size Barcode"] || "";
    const lowStockThreshold = parseInt(row["Low Stock Alert"] || 5);
    const status = row["Status"] || "Active";

    if (!productName) return;

    if (!productMap.has(productName)) {
      // Use main barcode from Excel or generate new one
      const productMainBarcode = mainBarcode || generateNumericBarcode();

      productMap.set(productName, {
        name: productName,
        category: category,
        description: description,
        price: price,
        sellingPrice: sellingPrice,
        sku: sku,
        mainBarcode: productMainBarcode,
        barcode: productMainBarcode, // Keep for compatibility
        lowStockThreshold: lowStockThreshold,
        status: status,
        sizeVariants: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const product = productMap.get(productName);

    // Add size variant if size is specified
    if (size && quantity > 0) {
      // Use size barcode from Excel or generate new one
      const variantBarcode = sizeBarcode || generateSizeVariantBarcode(product.mainBarcode, size);

      product.sizeVariants[size] = {
        quantity: quantity,
        barcode: variantBarcode,
      };
    } else if (!size && quantity > 0) {
      // Product has no size variants, store quantity as stock
      product.stock = quantity;
    }
  });

  return Array.from(productMap.values());
}

async function uploadProductsToFirestore(products) {
  const { db, collection, addDoc } = firebaseInstance;

  if (!window.currentBusinessId) {
    showError('No business context available');
    return;
  }
  
  const productsRef = collection(db, "businesses", window.currentBusinessId, "products");
  for (const product of products) {
    await addDoc(productsRef, product);
  }
}

async function handleExcelDownload() {
  try {
    showLoading("Preparing Excel export...");
    
    const { db, collection, getDocs } = firebaseInstance;
    
    if (!window.currentBusinessId) {
      showError('No business context available');
      return;
    }
    
    const productsRef = collection(db, "businesses", window.currentBusinessId, "products");
    const productsSnapshot = await getDocs(productsRef);

    const products = [];
    productsSnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });

    if (products.length === 0) {
      // Create a sample product for testing if no products exist
      console.log("No products found, creating sample data for testing");
      products = [
        {
          id: 'sample-1',
          name: 'Nike Air Max 270',
          description: 'Comfortable running shoes with Air Max technology',
          price: 150.00,
          sellingPrice: 199.99,
          sku: 'NIKE270001',
          storage: 'Main Warehouse',
          lowStockAlert: 5,
          unlimitedStock: false,
          mainBarcode: '1234567890123',
          sizeVariants: {
            'S': { quantity: 15, barcode: '1234567890123S' },
            'M': { quantity: 25, barcode: '1234567890123M' },
            'L': { quantity: 20, barcode: '1234567890123L' },
            'XL': { quantity: 10, barcode: '1234567890123X' }
          },
          category: 'Shoes',
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sample-2',
          name: 'Adidas Ultraboost 22',
          description: 'Premium running shoes with Boost technology',
          price: 180.00,
          sellingPrice: 249.99,
          sku: 'ADIDAS22001',
          storage: 'Store Front',
          lowStockAlert: 3,
          unlimitedStock: false,
          mainBarcode: '1234567890124',
          sizeVariants: {
            '8': { quantity: 8, barcode: '12345678901248' },
            '9': { quantity: 12, barcode: '12345678901249' },
            '10': { quantity: 15, barcode: '12345678901240' },
            '11': { quantity: 6, barcode: '12345678901241' },
            '12': { quantity: 4, barcode: '12345678901242' }
          },
          category: 'Shoes',
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sample-3',
          name: 'Digital Marketing Course',
          description: 'Complete online course for digital marketing',
          price: 99.99,
          sellingPrice: 149.99,
          sku: 'DIGITAL001',
          storage: 'Digital Storage',
          lowStockAlert: 0,
          unlimitedStock: true,
          mainBarcode: 'DIGITAL001',
          sizeVariants: {},
          category: 'Education',
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
    }

    // Debug: Log products data
    console.log("Products to export:", products);
    console.log("Number of products:", products.length);

    // ✅ CRITICAL: Convert products to Excel format FIRST
    const formattedData = convertProductsToExcel(products);
    console.log("Formatted data rows:", formattedData.length);
    console.log("Sample formatted row:", formattedData[0]);

    // Use the new styled Excel download function
    downloadExcelFile(formattedData, "madas-products-export.xlsx");

    // Excel export completed silently
    console.log("Styled Excel download completed");
  } catch (error) {
    console.error("Excel download failed:", error);
    showError("Failed to download Excel file.");
  } finally {
    hideLoading();
  }
}

function convertProductsToExcel(products) {
  const data = [];

  products.forEach((product) => {
    if (product.sizeVariants && Object.keys(product.sizeVariants).length > 0) {
      // Create a row for each size variant
      Object.entries(product.sizeVariants).forEach(([size, sizeData]) => {
        data.push({
          "Product Name": product.name,
          "Category": product.category || '',
          "Description": product.description || '',
          "Price": product.price || 0,
          "Selling Price": product.sellingPrice || product.price || 0,
          "SKU": product.sku || '',
          "Main Barcode": product.mainBarcode || product.barcode || '',
          "Size": size,
          "Quantity": sizeData.quantity || 0,
          "Size Barcode": sizeData.barcode || '',
          "Low Stock Alert": product.lowStockThreshold || 5,
          "Status": product.status || 'Active',
          "Storage": product.storageName || '',
          "Created Date": product.createdAt ? new Date(product.createdAt.seconds * 1000).toLocaleDateString() : ''
        });
      });
    } else {
      // Product has no size variants
      data.push({
        "Product Name": product.name,
        "Category": product.category || '',
        "Description": product.description || '',
        "Price": product.price || 0,
        "Selling Price": product.sellingPrice || product.price || 0,
        "SKU": product.sku || '',
        "Main Barcode": product.mainBarcode || product.barcode || '',
        "Size": "",
        "Quantity": product.stock || 0,
        "Size Barcode": "",
        "Low Stock Alert": product.lowStockThreshold || 5,
        "Status": product.status || 'Active',
        "Storage": product.storageName || '',
        "Created Date": product.createdAt ? new Date(product.createdAt.seconds * 1000).toLocaleDateString() : ''
      });
    }
  });

  return data;
}

async function downloadExcelFile(data, filename) {
  console.log("Starting styled Excel download with ExcelJS");
  console.log("Data length:", data.length);

  try {
    // Check if ExcelJS is available
    if (typeof ExcelJS === 'undefined') {
      console.warn('⚠️ ExcelJS not loaded, using fallback (no styling)');
      downloadExcelFallback(data, filename);
      return;
    }

    // Create workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MADAS';
    workbook.created = new Date();

    // Add Products worksheet
    const worksheet = workbook.addWorksheet('Products', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Define columns
    worksheet.columns = [
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Cost Price', key: 'price', width: 12 },
      { header: 'Selling Price', key: 'sellingPrice', width: 12 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Main Barcode', key: 'mainBarcode', width: 20 },
      { header: 'Size', key: 'size', width: 12 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Size Barcode', key: 'sizeBarcode', width: 25 },
      { header: 'Low Stock Alert', key: 'lowStockAlert', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Storage', key: 'storage', width: 20 },
      { header: 'Created Date', key: 'createdDate', width: 15 }
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF27491F' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        bottom: { style: 'medium', color: { argb: 'FF1A3A1A' } },
        left: { style: 'thin', color: { argb: 'FF1A3A1A' } },
        right: { style: 'thin', color: { argb: 'FF1A3A1A' } }
      };
    });

    // Add and style data rows
    data.forEach((row) => {
      const excelRow = worksheet.addRow({
        name: row['Product Name'] || row.name || '',
        category: row['Category'] || row.category || '',
        description: row['Description'] || row.description || '',
        price: row['Price'] || row['Cost Price'] || row.price || 0,
        sellingPrice: row['Selling Price'] || row.sellingPrice || row.price || 0,
        sku: row['SKU'] || row.sku || '',
        mainBarcode: row['Main Barcode'] || row.mainBarcode || '',
        size: row['Size'] || row.size || '',
        quantity: row['Quantity'] || row.quantity || 0,
        sizeBarcode: row['Size Barcode'] || row.sizeBarcode || '',
        lowStockAlert: row['Low Stock Alert'] || row.lowStockAlert || 5,
        status: row['Status'] || row.status || 'Active',
        storage: row['Storage'] || row['Storage Location'] || row.storage || '',
        createdDate: row['Created Date'] || row.createdDate || ''
      });

      const rowNum = excelRow.number;
      const isEven = rowNum % 2 === 0;

      // Set row height for better readability
      excelRow.height = 25;

      // Alternating row background
      excelRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF8FAFB' : 'FFFFFFFF' } };
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF374151' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          right: { style: 'hair', color: { argb: 'FFE5E7EB' } }
        };
      });

      // Left-align text columns
      excelRow.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
      excelRow.getCell('description').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      // Price formatting
      excelRow.getCell('price').numFmt = '$#,##0.00';
      excelRow.getCell('price').font = { bold: true, color: { argb: 'FF047857' }, name: 'Calibri', size: 10 };
      excelRow.getCell('sellingPrice').numFmt = '$#,##0.00';
      excelRow.getCell('sellingPrice').font = { bold: true, color: { argb: 'FF047857' }, name: 'Calibri', size: 10 };

      // Status styling
      const status = excelRow.getCell('status').value;
      if (status === 'Active') {
        excelRow.getCell('status').font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
        excelRow.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      } else if (status === 'Inactive') {
        excelRow.getCell('status').font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
        excelRow.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
      }

      // Quantity color coding
      const qty = parseInt(excelRow.getCell('quantity').value) || 0;
      if (qty === 0) {
        excelRow.getCell('quantity').font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 10 };
        excelRow.getCell('quantity').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
      } else if (qty <= 5) {
        excelRow.getCell('quantity').font = { bold: true, color: { argb: 'FFD97706' }, name: 'Calibri', size: 10 };
        excelRow.getCell('quantity').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      } else {
        excelRow.getCell('quantity').font = { bold: true, color: { argb: 'FF059669' }, name: 'Calibri', size: 10 };
      }

      // Size styling
      excelRow.getCell('size').font = { bold: true, color: { argb: 'FF6366F1' }, name: 'Calibri', size: 10 };

      // Barcode styling
      excelRow.getCell('mainBarcode').font = { name: 'Consolas', size: 10, color: { argb: 'FF6B7280' } };
      excelRow.getCell('sizeBarcode').font = { name: 'Consolas', size: 10, color: { argb: 'FF6B7280' } };
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);

    console.log('✅ Styled Excel downloaded:', filename);
  } catch (error) {
    console.error('❌ Error creating styled Excel:', error);
    showError('Failed to create Excel file: ' + error.message);
  }
}

// Fallback without styling
function downloadExcelFallback(data, filename) {
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = createStyledWorksheetWithSizes(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
    console.log("Excel downloaded (fallback):", filename);
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// Create styled worksheet with proper formatting
function createStyledWorksheet(data) {
  // Define column headers with proper order
  const headers = [
    'Product Name',
    'Description', 
    'Cost Price',
    'Selling Price',
    'SKU',
    'Storage Location',
    'Low Stock Alert',
    'Unlimited Stock',
    'Main Barcode',
    'Size Variants',
    'Category',
    'Status',
    'Created Date',
    'Last Updated'
  ];

  // Create worksheet with headers
  const worksheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...data.map(product => [
      product.name || '',
      product.description || '',
      product.price || 0,
      product.sellingPrice || product.price || 0,
      product.sku || '',
      product.storage || '',
      product.lowStockAlert || 5,
      product.unlimitedStock ? 'Yes' : 'No',
      product.mainBarcode || product.barcode || 'No barcode',
      (product.sizeVariants && Object.keys(product.sizeVariants).length > 0) || (product.sizes && Object.keys(product.sizes).length > 0) ? 
        Object.entries(product.sizeVariants || product.sizes || {}).map(([size, data]) => 
          `${size}: ${data.quantity || data.stock || 0} units @ $${data.price || product.price || product.sellingPrice || 0}`
        ).join('; ') : 
        'No sizes',
      product.category || '',
      product.status || 'Active',
      product.createdAt ? new Date(product.createdAt.seconds * 1000).toLocaleDateString() : '',
      product.updatedAt ? new Date(product.updatedAt.seconds * 1000).toLocaleDateString() : ''
    ])
  ]);

  // Set column widths
  const columnWidths = [
    { wch: 25 }, // Product Name
    { wch: 40 }, // Description
    { wch: 12 }, // Cost Price
    { wch: 12 }, // Selling Price
    { wch: 15 }, // SKU
    { wch: 20 }, // Storage Location
    { wch: 12 }, // Low Stock Alert
    { wch: 15 }, // Unlimited Stock
    { wch: 20 }, // Main Barcode
    { wch: 50 }, // Size Variants - Increased width for size data
    { wch: 15 }, // Category
    { wch: 10 }, // Status
    { wch: 12 }, // Created Date
    { wch: 12 }  // Last Updated
  ];
  
  worksheet['!cols'] = columnWidths;

  // Style the header row with enhanced colors
  const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: '' };
    worksheet[cellAddress].s = {
      font: { 
        bold: true, 
        color: { rgb: "FFFFFF" },
        size: 12,
        name: "Arial"
      },
      fill: { 
        fgColor: { rgb: "27491F" },
        patternType: "solid"
      },
      alignment: { 
        horizontal: "center", 
        vertical: "center",
        wrapText: true
      },
      border: {
        top: { style: "medium", color: { rgb: "1A3A1A" } },
        bottom: { style: "medium", color: { rgb: "1A3A1A" } },
        left: { style: "medium", color: { rgb: "1A3A1A" } },
        right: { style: "medium", color: { rgb: "1A3A1A" } }
      }
    };
  }

  // Style data rows with alternating colors and conditional formatting
  for (let row = 1; row <= data.length; row++) {
    const isEvenRow = row % 2 === 0;
    const product = data[row - 1];
    
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: '' };
      
      // Determine cell styling based on content
      let cellStyle = {
        font: { 
          name: "Arial",
          size: 10,
          color: { rgb: "333333" }
        },
        alignment: { 
          vertical: "center",
          horizontal: col <= 1 ? "left" : "center" // Left align name and description
        },
        border: {
          top: { style: "thin", color: { rgb: "E5E5E5" } },
          bottom: { style: "thin", color: { rgb: "E5E5E5" } },
          left: { style: "thin", color: { rgb: "E5E5E5" } },
          right: { style: "thin", color: { rgb: "E5E5E5" } }
        }
      };

      // Alternating row colors
      if (isEvenRow) {
        cellStyle.fill = { 
          fgColor: { rgb: "F8F9FA" },
          patternType: "solid"
        };
      } else {
        cellStyle.fill = { 
          fgColor: { rgb: "FFFFFF" },
          patternType: "solid"
        };
      }

      // Special styling for specific columns
      const columnName = headers[col];
      if (columnName === 'Cost Price' || columnName === 'Selling Price') {
        cellStyle.font.color = { rgb: "2E7D32" }; // Green for prices
        cellStyle.font.bold = true;
      } else if (columnName === 'Status') {
        const status = product.status || 'Active';
        if (status === 'Active') {
          cellStyle.font.color = { rgb: "2E7D32" }; // Green
          cellStyle.fill.fgColor = { rgb: "E8F5E8" };
        } else if (status === 'Inactive') {
          cellStyle.font.color = { rgb: "D32F2F" }; // Red
          cellStyle.fill.fgColor = { rgb: "FFEBEE" };
        } else if (status === 'Draft') {
          cellStyle.font.color = { rgb: "F57C00" }; // Orange
          cellStyle.fill.fgColor = { rgb: "FFF3E0" };
        }
      } else if (columnName === 'Unlimited Stock') {
        const unlimited = product.unlimitedStock;
        if (unlimited) {
          cellStyle.font.color = { rgb: "1976D2" }; // Blue
          cellStyle.font.bold = true;
        }
      } else if (columnName === 'Low Stock Alert') {
        const lowStock = product.lowStockAlert || 5;
        if (lowStock <= 3) {
          cellStyle.font.color = { rgb: "D32F2F" }; // Red for low stock
          cellStyle.font.bold = true;
        } else if (lowStock <= 10) {
          cellStyle.font.color = { rgb: "F57C00" }; // Orange for medium stock
        }
      } else if (columnName === 'Size Variants') {
        // Special styling for size variants
        if (product.sizeVariants && product.sizeVariants.length > 0) {
          cellStyle.font.color = { rgb: "7B1FA2" }; // Purple for size variants
          cellStyle.font.bold = true;
          cellStyle.fill.fgColor = { rgb: "F3E5F5" }; // Light purple background
          cellStyle.alignment.wrapText = true; // Allow text wrapping for long size lists
        } else {
          cellStyle.font.color = { rgb: "757575" }; // Gray for no sizes
          cellStyle.font.italic = true;
        }
      }

      worksheet[cellAddress].s = cellStyle;
    }
  }

  return worksheet;
}

// Create styled worksheet with separate Size and Qty columns
function createStyledWorksheetWithSizes(data) {
  console.log("Creating styled worksheet with sizes data:", data);
  
  // Define headers with separate Size and Qty columns
  const headers = [
    'Product Name',
    'Description', 
    'Cost Price',
    'Selling Price',
    'SKU',
    'Storage Location',
    'Low Stock Alert',
    'Unlimited Stock',
    'Main Barcode',
    'Size',
    'Quantity',
    'Size Barcode',
    'Category',
    'Status',
    'Created Date',
    'Last Updated'
  ];

  // Create rows with separate entries for each size variant
  const rows = [headers];
  
  data.forEach(product => {
    const sizes = product.sizeVariants || product.sizes || {};
    const sizeEntries = Object.keys(sizes);
    
    if (sizeEntries.length > 0) {
      // Create a row for each size variant
      sizeEntries.forEach(size => {
        const sizeData = sizes[size];
        rows.push([
          product.name || '',
          product.description || '',
          product.price || 0,
          product.sellingPrice || product.price || 0,
          product.sku || '',
          product.storage || '',
          product.lowStockAlert || 5,
          product.unlimitedStock ? 'Yes' : 'No',
          product.mainBarcode || product.barcode || 'No barcode',
          size,
          sizeData.quantity || sizeData.stock || 0,
          sizeData.barcode || '',
          product.category || '',
          product.status || 'Active',
          product.createdAt ? new Date(product.createdAt.seconds * 1000).toLocaleDateString() : '',
          product.updatedAt ? new Date(product.updatedAt.seconds * 1000).toLocaleDateString() : ''
        ]);
      });
    } else {
      // Product with no sizes - create one row
      rows.push([
        product.name || '',
        product.description || '',
        product.price || 0,
        product.sellingPrice || product.price || 0,
        product.sku || '',
        product.storage || '',
        product.lowStockAlert || 5,
        product.unlimitedStock ? 'Yes' : 'No',
        product.mainBarcode || product.barcode || 'No barcode',
        'No sizes',
        '',
        '',
        product.category || '',
        product.status || 'Active',
        product.createdAt ? new Date(product.createdAt.seconds * 1000).toLocaleDateString() : '',
        product.updatedAt ? new Date(product.updatedAt.seconds * 1000).toLocaleDateString() : ''
      ]);
    }
  });

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  const columnWidths = [
    { wch: 25 }, // Product Name
    { wch: 40 }, // Description
    { wch: 12 }, // Cost Price
    { wch: 12 }, // Selling Price
    { wch: 15 }, // SKU
    { wch: 20 }, // Storage Location
    { wch: 15 }, // Low Stock Alert
    { wch: 15 }, // Unlimited Stock
    { wch: 20 }, // Main Barcode
    { wch: 12 }, // Size (wider for visibility)
    { wch: 12 }, // Quantity (wider for visibility)
    { wch: 25 }, // Size Barcode (wider to show full barcode)
    { wch: 15 }, // Category
    { wch: 12 }, // Status
    { wch: 15 }, // Created Date
    { wch: 15 }  // Last Updated
  ];
  worksheet['!cols'] = columnWidths;

  // Style header row with MADAS green and modern design
  const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    worksheet[cellAddress].s = {
      font: {
        bold: true,
        color: { rgb: "FFFFFF" },
        name: "Calibri",
        sz: 12
      },
      fill: {
        fgColor: { rgb: "27491F" }, // MADAS green
        patternType: "solid"
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true
      },
      border: {
        top: { style: "medium", color: { rgb: "1A3A1A" } },
        bottom: { style: "medium", color: { rgb: "1A3A1A" } },
        left: { style: "thin", color: { rgb: "1A3A1A" } },
        right: { style: "thin", color: { rgb: "1A3A1A" } }
      }
    };
  }

  // Add freeze panes for header row
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

  // Style data rows with alternating colors and modern design
  for (let row = 1; row < rows.length; row++) {
    const isEvenRow = row % 2 === 0;
    const backgroundColor = isEvenRow ? "F8FAFB" : "FFFFFF";

    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;

      const colName = headers[col];

      worksheet[cellAddress].s = {
        font: {
          name: "Calibri",
          sz: 10,
          color: { rgb: "374151" }
        },
        fill: {
          fgColor: { rgb: backgroundColor },
          patternType: "solid"
        },
        alignment: {
          vertical: "center",
          horizontal: (colName === 'Product Name' || colName === 'Description') ? "left" : "center",
          wrapText: (colName === 'Description')
        },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "hair", color: { rgb: "E5E7EB" } },
          right: { style: "hair", color: { rgb: "E5E7EB" } }
        }
      };

      // Special formatting for specific columns with enhanced styling
      if (colName === 'Cost Price' || colName === 'Selling Price') {
        worksheet[cellAddress].s.font = {
          ...worksheet[cellAddress].s.font,
          bold: true,
          color: { rgb: "047857" }
        };
        worksheet[cellAddress].s.numFmt = '$#,##0.00';
      } else if (colName === 'Status') {
        const status = worksheet[cellAddress].v;
        if (status === 'Active') {
          worksheet[cellAddress].s.font = {
            ...worksheet[cellAddress].s.font,
            bold: true,
            color: { rgb: "FFFFFF" }
          };
          worksheet[cellAddress].s.fill = {
            fgColor: { rgb: "10B981" },
            patternType: "solid"
          };
        } else if (status === 'Inactive') {
          worksheet[cellAddress].s.font = {
            ...worksheet[cellAddress].s.font,
            bold: true,
            color: { rgb: "FFFFFF" }
          };
          worksheet[cellAddress].s.fill = {
            fgColor: { rgb: "EF4444" },
            patternType: "solid"
          };
        }
      } else if (colName === 'Unlimited Stock') {
        if (worksheet[cellAddress].v === 'Yes') {
          worksheet[cellAddress].s.font = {
            ...worksheet[cellAddress].s.font,
            bold: true,
            color: { rgb: "3B82F6" }
          };
        }
      } else if (colName === 'Quantity') {
        const qty = parseInt(worksheet[cellAddress].v) || 0;
        if (qty === 0) {
          worksheet[cellAddress].s.font = {
            ...worksheet[cellAddress].s.font,
            bold: true,
            color: { rgb: "FFFFFF" }
          };
          worksheet[cellAddress].s.fill = {
            fgColor: { rgb: "DC2626" },
            patternType: "solid"
          };
        } else if (qty <= 5) {
          worksheet[cellAddress].s.font = {
            ...worksheet[cellAddress].s.font,
            bold: true,
            color: { rgb: "D97706" }
          };
          worksheet[cellAddress].s.fill = {
            fgColor: { rgb: "FEF3C7" },
            patternType: "solid"
          };
        } else {
          worksheet[cellAddress].s.font = {
            ...worksheet[cellAddress].s.font,
            bold: true,
            color: { rgb: "059669" }
          };
        }
      } else if (colName === 'Size') {
        worksheet[cellAddress].s.font = {
          ...worksheet[cellAddress].s.font,
          bold: true,
          color: { rgb: "6366F1" }
        };
      } else if (colName === 'Main Barcode' || colName === 'Size Barcode') {
        worksheet[cellAddress].s.font = {
          ...worksheet[cellAddress].s.font,
          name: "Consolas",
          color: { rgb: "6B7280" }
        };
      }
    }
  }

  return worksheet;
}

// Create instructions sheet
function createInstructionsSheet() {
  const instructions = [
    ['MADAS PRODUCTS - IMPORT/EXPORT INSTRUCTIONS'],
    [''],
    ['📋 IMPORT INSTRUCTIONS:'],
    ['1. Use the "Template" sheet as a guide for the correct format'],
    ['2. Required fields: Product Name, Cost Price'],
    ['3. Optional fields: Description, Selling Price, SKU, Storage Location, etc.'],
    ['4. For Size Variants: Use JSON format: [{"size":"S","stock":10,"price":25.99}]'],
    ['5. For Unlimited Stock: Enter "Yes" or "No"'],
    ['6. For Status: Use "Active", "Inactive", or "Draft"'],
    [''],
    ['📤 EXPORT INSTRUCTIONS:'],
    ['1. All current products are exported with their complete data'],
    ['2. You can modify the exported file and re-import it'],
    ['3. Changes will update existing products based on SKU or Product Name'],
    [''],
    ['⚠️ IMPORTANT NOTES:'],
    ['• Product Name and SKU must be unique'],
    ['• Prices should be numbers only (no currency symbols)'],
    ['• Dates should be in MM/DD/YYYY format'],
    ['• Size variants must be valid JSON format'],
    ['• Storage locations must exist in your system'],
    [''],
    ['🔧 TROUBLESHOOTING:'],
    ['• If import fails, check the error messages in the dashboard'],
    ['• Ensure all required fields are filled'],
    ['• Verify data formats match the examples'],
    ['• Contact support if issues persist'],
    [''],
    ['📞 SUPPORT:'],
    ['For technical support, contact: support@madas.com'],
    ['Documentation: https://docs.madas.com']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(instructions);
  
  // Style the title with enhanced colors
  worksheet['A1'].s = {
    font: { 
      bold: true, 
      size: 18, 
      color: { rgb: "FFFFFF" },
      name: "Arial"
    },
    fill: { 
      fgColor: { rgb: "27491F" },
      patternType: "solid"
    },
    alignment: { 
      horizontal: "center",
      vertical: "center"
    },
    border: {
      top: { style: "medium", color: { rgb: "1A3A1A" } },
      bottom: { style: "medium", color: { rgb: "1A3A1A" } },
      left: { style: "medium", color: { rgb: "1A3A1A" } },
      right: { style: "medium", color: { rgb: "1A3A1A" } }
    }
  };

  // Style section headers with different colors
  const sectionHeaders = [
    { text: '📋 IMPORT INSTRUCTIONS:', color: '1976D2', bgColor: 'E3F2FD' },
    { text: '📤 EXPORT INSTRUCTIONS:', color: '388E3C', bgColor: 'E8F5E8' },
    { text: '⚠️ IMPORTANT NOTES:', color: 'F57C00', bgColor: 'FFF3E0' },
    { text: '🔧 TROUBLESHOOTING:', color: 'D32F2F', bgColor: 'FFEBEE' },
    { text: '📞 SUPPORT:', color: '7B1FA2', bgColor: 'F3E5F5' }
  ];
  
  sectionHeaders.forEach(section => {
    const cell = Object.keys(worksheet).find(key => worksheet[key].v === section.text);
    if (cell) {
      worksheet[cell].s = {
        font: { 
          bold: true, 
          color: { rgb: section.color },
          size: 12,
          name: "Arial"
        },
        fill: { 
          fgColor: { rgb: section.bgColor },
          patternType: "solid"
        },
        alignment: { 
          horizontal: "left",
          vertical: "center"
        },
        border: {
          top: { style: "thin", color: { rgb: "CCCCCC" } },
          bottom: { style: "thin", color: { rgb: "CCCCCC" } },
          left: { style: "thin", color: { rgb: "CCCCCC" } },
          right: { style: "thin", color: { rgb: "CCCCCC" } }
        }
      };
    }
  });

  // Set column width
  worksheet['!cols'] = [{ wch: 80 }];

  return worksheet;
}

// Create template sheet with sample data
function createTemplateSheet() {
  const templateData = [
    ['Product Name', 'Description', 'Cost Price', 'Selling Price', 'SKU', 'Storage Location', 'Low Stock Alert', 'Unlimited Stock', 'Main Barcode', 'Size', 'Quantity', 'Size Barcode', 'Category', 'Status'],
    ['Nike Air Max 270', 'Comfortable running shoes with Air Max technology', '150.00', '199.99', 'NIKE270001', 'Main Warehouse', '5', 'No', '1234567890123', 'S', '15', '1234567890123S', 'Shoes', 'Active'],
    ['Nike Air Max 270', 'Comfortable running shoes with Air Max technology', '150.00', '199.99', 'NIKE270001', 'Main Warehouse', '5', 'No', '1234567890123', 'M', '25', '1234567890123M', 'Shoes', 'Active'],
    ['Nike Air Max 270', 'Comfortable running shoes with Air Max technology', '150.00', '199.99', 'NIKE270001', 'Main Warehouse', '5', 'No', '1234567890123', 'L', '20', '1234567890123L', 'Shoes', 'Active'],
    ['Nike Air Max 270', 'Comfortable running shoes with Air Max technology', '150.00', '199.99', 'NIKE270001', 'Main Warehouse', '5', 'No', '1234567890123', 'XL', '10', '1234567890123X', 'Shoes', 'Active'],
    ['Adidas Ultraboost 22', 'Premium running shoes with Boost technology', '180.00', '249.99', 'ADIDAS22001', 'Store Front', '3', 'No', '1234567890124', '8', '8', '12345678901248', 'Shoes', 'Active'],
    ['Adidas Ultraboost 22', 'Premium running shoes with Boost technology', '180.00', '249.99', 'ADIDAS22001', 'Store Front', '3', 'No', '1234567890124', '9', '12', '12345678901249', 'Shoes', 'Active'],
    ['Adidas Ultraboost 22', 'Premium running shoes with Boost technology', '180.00', '249.99', 'ADIDAS22001', 'Store Front', '3', 'No', '1234567890124', '10', '15', '12345678901240', 'Shoes', 'Active'],
    ['Digital Marketing Course', 'Complete online course for digital marketing', '99.99', '149.99', 'DIGITAL001', 'Digital Storage', '0', 'Yes', 'DIGITAL001', 'No sizes', '', '', 'Education', 'Active']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(templateData);
  
  // Style header row with enhanced colors
  const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    worksheet[cellAddress].s = {
      font: { 
        bold: true, 
        color: { rgb: "FFFFFF" },
        size: 11,
        name: "Arial"
      },
      fill: { 
        fgColor: { rgb: "27491F" },
        patternType: "solid"
      },
      alignment: { 
        horizontal: "center", 
        vertical: "center",
        wrapText: true
      },
      border: {
        top: { style: "medium", color: { rgb: "1A3A1A" } },
        bottom: { style: "medium", color: { rgb: "1A3A1A" } },
        left: { style: "medium", color: { rgb: "1A3A1A" } },
        right: { style: "medium", color: { rgb: "1A3A1A" } }
      }
    };
  }

  // Style sample data rows with different colors for each product type
  const productTypes = [
    { bgColor: "E8F5E8", borderColor: "C8E6C9" }, // Electronics - Light Green
    { bgColor: "E3F2FD", borderColor: "BBDEFB" }, // Clothing - Light Blue  
    { bgColor: "FFF3E0", borderColor: "FFE0B2" }  // Software - Light Orange
  ];

  for (let row = 1; row < templateData.length; row++) {
    const productType = productTypes[row - 1] || productTypes[0];
    
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const columnName = templateData[0][col];
      
      let cellStyle = {
        font: { 
          name: "Arial",
          size: 10,
          color: { rgb: "333333" }
        },
        fill: { 
          fgColor: { rgb: productType.bgColor },
          patternType: "solid"
        },
        alignment: { 
          vertical: "center",
          horizontal: col <= 1 ? "left" : "center"
        },
        border: {
          top: { style: "thin", color: { rgb: productType.borderColor } },
          bottom: { style: "thin", color: { rgb: productType.borderColor } },
          left: { style: "thin", color: { rgb: productType.borderColor } },
          right: { style: "thin", color: { rgb: productType.borderColor } }
        }
      };

      // Special styling for specific columns
      if (columnName === 'Cost Price' || columnName === 'Selling Price') {
        cellStyle.font.color = { rgb: "2E7D32" };
        cellStyle.font.bold = true;
      } else if (columnName === 'Status') {
        cellStyle.font.color = { rgb: "2E7D32" };
        cellStyle.font.bold = true;
      } else if (columnName === 'Unlimited Stock') {
        if (row === 3) { // Digital Product row
          cellStyle.font.color = { rgb: "1976D2" };
          cellStyle.font.bold = true;
        }
      }

      worksheet[cellAddress].s = cellStyle;
    }
  }

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Product Name
    { wch: 35 }, // Description
    { wch: 12 }, // Cost Price
    { wch: 12 }, // Selling Price
    { wch: 15 }, // SKU
    { wch: 18 }, // Storage Location
    { wch: 15 }, // Low Stock Alert
    { wch: 15 }, // Unlimited Stock
    { wch: 15 }, // Main Barcode
    { wch: 60 }, // Size Variants - Increased width for size data
    { wch: 15 }, // Category
    { wch: 10 }  // Status
  ];

  return worksheet;
}

// Create summary sheet with statistics and charts
function createSummarySheet(data) {
  // Calculate statistics
  const totalProducts = data.length;
  const activeProducts = data.filter(p => p.status === 'Active').length;
  const inactiveProducts = data.filter(p => p.status === 'Inactive').length;
  const draftProducts = data.filter(p => p.status === 'Draft').length;
  const unlimitedStockProducts = data.filter(p => p.unlimitedStock).length;
  
  const totalValue = data.reduce((sum, p) => sum + (p.price || 0), 0);
  const avgPrice = totalValue / totalProducts || 0;
  
  const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
  const storages = [...new Set(data.map(p => p.storage).filter(Boolean))];

  const summaryData = [
    ['MADAS PRODUCTS - EXPORT SUMMARY'],
    [''],
    ['📊 PRODUCT STATISTICS'],
    ['Total Products:', totalProducts],
    ['Active Products:', activeProducts],
    ['Inactive Products:', inactiveProducts],
    ['Draft Products:', draftProducts],
    ['Unlimited Stock Products:', unlimitedStockProducts],
    [''],
    ['💰 FINANCIAL OVERVIEW'],
    ['Total Inventory Value:', `$${totalValue.toFixed(2)}`],
    ['Average Product Price:', `$${avgPrice.toFixed(2)}`],
    [''],
    ['📂 CATEGORIES'],
    ...categories.map(cat => [`• ${cat}`, data.filter(p => p.category === cat).length]),
    [''],
    ['🏪 STORAGE LOCATIONS'],
    ...storages.map(storage => [`• ${storage}`, data.filter(p => p.storage === storage).length]),
    [''],
    ['📈 EXPORT INFORMATION'],
    ['Export Date:', new Date().toLocaleDateString()],
    ['Export Time:', new Date().toLocaleTimeString()],
    ['Business ID:', window.currentBusinessId || 'N/A'],
    ['Total Records:', totalProducts],
    [''],
    ['📋 DATA QUALITY'],
    ['Products with SKU:', data.filter(p => p.sku).length],
    ['Products with Description:', data.filter(p => p.description).length],
    ['Products with Images:', data.filter(p => p.images && p.images.length > 0).length],
    ['Products with Size Variants:', data.filter(p => p.sizeVariants && p.sizeVariants.length > 0).length],
    [''],
    ['⚠️ IMPORTANT NOTES'],
    ['• This export contains all current product data'],
    ['• You can modify the data and re-import it'],
    ['• Changes will update existing products'],
    ['• Always backup your data before making changes'],
    ['• Contact support if you need assistance']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Style the title
  worksheet['A1'].s = {
    font: { 
      bold: true, 
      size: 20, 
      color: { rgb: "FFFFFF" },
      name: "Arial"
    },
    fill: { 
      fgColor: { rgb: "27491F" },
      patternType: "solid"
    },
    alignment: { 
      horizontal: "center",
      vertical: "center"
    },
    border: {
      top: { style: "medium", color: { rgb: "1A3A1A" } },
      bottom: { style: "medium", color: { rgb: "1A3A1A" } },
      left: { style: "medium", color: { rgb: "1A3A1A" } },
      right: { style: "medium", color: { rgb: "1A3A1A" } }
    }
  };

  // Style section headers
  const sectionHeaders = [
    { text: '📊 PRODUCT STATISTICS:', color: '1976D2', bgColor: 'E3F2FD' },
    { text: '💰 FINANCIAL OVERVIEW:', color: '388E3C', bgColor: 'E8F5E8' },
    { text: '📂 CATEGORIES:', color: 'F57C00', bgColor: 'FFF3E0' },
    { text: '🏪 STORAGE LOCATIONS:', color: '7B1FA2', bgColor: 'F3E5F5' },
    { text: '📈 EXPORT INFORMATION:', color: 'D32F2F', bgColor: 'FFEBEE' },
    { text: '📋 DATA QUALITY:', color: '1976D2', bgColor: 'E3F2FD' },
    { text: '⚠️ IMPORTANT NOTES:', color: 'F57C00', bgColor: 'FFF3E0' }
  ];
  
  sectionHeaders.forEach(section => {
    const cell = Object.keys(worksheet).find(key => worksheet[key].v === section.text);
    if (cell) {
      worksheet[cell].s = {
        font: { 
          bold: true, 
          color: { rgb: section.color },
          size: 12,
          name: "Arial"
        },
        fill: { 
          fgColor: { rgb: section.bgColor },
          patternType: "solid"
        },
        alignment: { 
          horizontal: "left",
          vertical: "center"
        },
        border: {
          top: { style: "thin", color: { rgb: "CCCCCC" } },
          bottom: { style: "thin", color: { rgb: "CCCCCC" } },
          left: { style: "thin", color: { rgb: "CCCCCC" } },
          right: { style: "thin", color: { rgb: "CCCCCC" } }
        }
      };
    }
  });

  // Style data rows with alternating colors
  let currentRow = 0;
  summaryData.forEach((row, index) => {
    if (row[0] && !row[0].startsWith('📊') && !row[0].startsWith('💰') && 
        !row[0].startsWith('📂') && !row[0].startsWith('🏪') && 
        !row[0].startsWith('📈') && !row[0].startsWith('📋') && 
        !row[0].startsWith('⚠️') && row[0] !== 'MADAS PRODUCTS - EXPORT SUMMARY' && row[0] !== '') {
      
      const cellA = XLSX.utils.encode_cell({ r: index, c: 0 });
      const cellB = XLSX.utils.encode_cell({ r: index, c: 1 });
      
      const isEven = currentRow % 2 === 0;
      const bgColor = isEven ? "F8F9FA" : "FFFFFF";
      
      [cellA, cellB].forEach(cell => {
        if (worksheet[cell]) {
          worksheet[cell].s = {
            font: { 
              name: "Arial",
              size: 10,
              color: { rgb: "333333" }
            },
            fill: { 
              fgColor: { rgb: bgColor },
              patternType: "solid"
            },
            alignment: { 
              vertical: "center",
              horizontal: "left"
            },
            border: {
              top: { style: "thin", color: { rgb: "E5E5E5" } },
              bottom: { style: "thin", color: { rgb: "E5E5E5" } },
              left: { style: "thin", color: { rgb: "E5E5E5" } },
              right: { style: "thin", color: { rgb: "E5E5E5" } }
            }
          };
        }
      });
      
      currentRow++;
    }
  });

  // Set column widths
  worksheet['!cols'] = [
    { wch: 30 }, // Labels
    { wch: 20 }  // Values
  ];

  return worksheet;
}

// Import products with progress tracking
async function importProductsWithProgress(products) {
  const batchSize = 10; // Process 10 products at a time
  const totalProducts = products.length;
  let processed = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    // Process batch
    await Promise.all(batch.map(async (product) => {
      try {
        // Check if product already exists (by SKU or name)
        const existingProduct = await findExistingProduct(product);
        
        if (existingProduct) {
          // Update existing product
          console.log(`Updating existing product: ${product.name}`);
          console.log(`Product data being passed to updateProduct:`, {
            name: product.name,
            mainBarcode: product.mainBarcode,
            sizeVariants: product.sizeVariants
          });
          await updateProduct(existingProduct.id, product);
        } else {
          // Create new product
          console.log(`Creating new product: ${product.name}`);
          console.log(`Product data being passed to createProduct:`, {
            name: product.name,
            mainBarcode: product.mainBarcode,
            sizeVariants: product.sizeVariants
          });
          await createProduct(product);
        }
        processed++;
      } catch (error) {
        console.error(`Error processing product ${product.name}:`, error);
        throw error;
      }
    }));

    // Update progress
    const progress = Math.round((processed / totalProducts) * 100);
    console.log(`Import progress: ${progress}% (${processed}/${totalProducts})`);
  }
}

// Find existing product by SKU or name
async function findExistingProduct(product) {
  if (!firebaseInstance) return null;
  
  try {
    // First try to find by SKU
    if (product.sku) {
      const skuQuery = firebaseInstance.query(
        firebaseInstance.collection(firebaseInstance.db, 'businesses', window.currentBusinessId, 'products'),
        firebaseInstance.where('sku', '==', product.sku)
      );
      const skuSnapshot = await firebaseInstance.getDocs(skuQuery);
      if (!skuSnapshot.empty) {
        return { id: skuSnapshot.docs[0].id, ...skuSnapshot.docs[0].data() };
      }
    }

    // Then try to find by name
    const nameQuery = firebaseInstance.query(
      firebaseInstance.collection(firebaseInstance.db, 'businesses', window.currentBusinessId, 'products'),
      firebaseInstance.where('name', '==', product.name)
    );
    const nameSnapshot = await firebaseInstance.getDocs(nameQuery);
    if (!nameSnapshot.empty) {
      return { id: nameSnapshot.docs[0].id, ...nameSnapshot.docs[0].data() };
    }

    return null;
  } catch (error) {
    console.error('Error finding existing product:', error);
    return null;
  }
}

// Create new product
async function createProduct(productData) {
  if (!firebaseInstance) throw new Error('Firebase not initialized');
  
  console.log('Creating product with data:', productData);
  console.log('Size variants:', productData.sizeVariants);
  console.log('Main barcode from productData:', productData.mainBarcode);
  console.log('Main barcode type:', typeof productData.mainBarcode);
  console.log('Main barcode length:', productData.mainBarcode ? productData.mainBarcode.length : 'N/A');
  console.log('Main barcode is empty:', !productData.mainBarcode || productData.mainBarcode === '');

  const product = {
    name: productData.name,
    description: productData.description || '',
    price: productData.price,
    sellingPrice: productData.sellingPrice || productData.price,
    sku: productData.sku || generateSKUFromName(productData.name),
    storage: productData.storage || '',
    lowStockAlert: productData.lowStockAlert || 5,
    unlimitedStock: productData.unlimitedStock || false,
    mainBarcode: productData.mainBarcode || '',
    sizeVariants: productData.sizeVariants || {},
    category: productData.category || '',
    status: productData.status || 'Active',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('Product object created with mainBarcode:', product.mainBarcode);
  console.log('Product mainBarcode type:', typeof product.mainBarcode);
  console.log('Product mainBarcode length:', product.mainBarcode ? product.mainBarcode.length : 'N/A');

  console.log('=== CREATING PRODUCT ===');
  console.log('Product name:', product.name);
  console.log('Main barcode being saved:', product.mainBarcode);
  console.log('Main barcode type:', typeof product.mainBarcode);
  console.log('Main barcode length:', product.mainBarcode ? product.mainBarcode.length : 'N/A');
  console.log('💾 FINAL PRODUCT OBJECT BEING SAVED TO DATABASE:', JSON.stringify(product, null, 2));
  console.log('💾 Size variants being saved:', product.sizeVariants);
  console.log('💾 Size variants count:', Object.keys(product.sizeVariants || {}).length);
  console.log('💾 Size variants details:', Object.entries(product.sizeVariants || {}).map(([size, data]) => ({
    size: size,
    quantity: data.quantity,
    barcode: data.barcode
  })));
  console.log('Size variants details:', Object.entries(product.sizeVariants || {}).map(([size, data]) => ({
    size: size,
    quantity: data.quantity,
    barcode: data.barcode
  })));
  
  const docRef = await firebaseInstance.addDoc(
    firebaseInstance.collection(firebaseInstance.db, 'businesses', window.currentBusinessId, 'products'),
    product
  );
  
  console.log('✅ Product saved successfully!');
  console.log('Document ID:', docRef.id);
  console.log('Barcode:', product.mainBarcode);
  console.log('Sizes:', Object.keys(product.sizeVariants || {}).length);
}

// Update existing product
async function updateProduct(productId, productData) {
  if (!firebaseInstance) throw new Error('Firebase not initialized');

  const updateData = {
    name: productData.name,
    description: productData.description || '',
    price: productData.price,
    sellingPrice: productData.sellingPrice || productData.price,
    sku: productData.sku || generateSKUFromName(productData.name),
    storage: productData.storage || '',
    lowStockAlert: productData.lowStockAlert || 5,
    unlimitedStock: productData.unlimitedStock || false,
    mainBarcode: productData.mainBarcode || '',
    sizeVariants: productData.sizeVariants || {},
    category: productData.category || '',
    status: productData.status || 'Active',
    updatedAt: new Date()
  };

  console.log('=== UPDATING PRODUCT ===');
  console.log('Product ID:', productId);
  console.log('Product name:', updateData.name);
  console.log('Main barcode being updated:', updateData.mainBarcode);
  console.log('Main barcode type:', typeof updateData.mainBarcode);
  console.log('Main barcode length:', updateData.mainBarcode ? updateData.mainBarcode.length : 'N/A');
  console.log('Updating product with data:', JSON.stringify(updateData, null, 2));
  console.log('Size variants being updated:', updateData.sizeVariants);
  console.log('Size variants count:', Object.keys(updateData.sizeVariants || {}).length);
  console.log('Size variants details:', Object.entries(updateData.sizeVariants || {}).map(([size, data]) => ({
    size: size,
    quantity: data.quantity,
    barcode: data.barcode
  })));
  
  await firebaseInstance.updateDoc(
    firebaseInstance.doc(firebaseInstance.db, 'businesses', window.currentBusinessId, 'products', productId),
    updateData
  );
  
  console.log('✅ Product updated successfully!');
  console.log('Barcode:', updateData.mainBarcode);
  console.log('Sizes:', Object.keys(updateData.sizeVariants || {}).length);
}

// Generate SKU from product name (enhanced version)
function generateSKUFromName(name) {
  const timestamp = Date.now().toString().slice(-6);
  const nameCode = name.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase();
  return `${nameCode}${timestamp}`;
}

// Print function
async function printProducts() {
  if (selectedProducts.size === 0) {
    showError("Please select products to print");
    return;
  }

  const selectedProductsData = currentProducts.filter((p) =>
    selectedProducts.has(p.id)
  );

  // Create a temporary container for printing
  const printContainer = document.createElement("div");
  printContainer.id = "tempPrintContainer";
  printContainer.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    z-index: -1;
  `;

  // Add print styles
  const printStyles = document.createElement("style");
  printStyles.textContent = `
    @media print {
      body * {
        display: none !important;
      }
      
      #tempPrintContainer,
      #tempPrintContainer * {
        display: block !important;
      }
      
      #tempPrintContainer {
        position: static !important;
        top: auto !important;
        left: auto !important;
        z-index: auto !important;
      }
      
      .print-item {
        margin-bottom: 1cm;
        padding: 1cm;
        border: 1px solid #27491F;
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
        font-size: 40pt;
        color: black;
      }
    }
  `;

  document.head.appendChild(printStyles);
  document.body.appendChild(printContainer);

  // Generate barcode content
  let barcodeContent = "";
  let barcodeScripts = "";

  selectedProductsData.forEach((product) => {
    Object.entries(product.sizeVariants || {}).forEach(([size, data]) => {
      for (let i = 0; i < data.quantity; i++) {
        const barcodeValue =
          data.barcode || `${product.barcode || product.sku}-${size}`;
        const barcodeId = `barcode-${product.id}-${size}-${i}`;

        barcodeContent += `
          <div class="print-item">
            <div class="code-text">${barcodeValue}</div>
            <svg id="${barcodeId}"></svg>
            <div class="desc-text">${product.name} Size ${size}</div>
          </div>
        `;

        barcodeScripts += `
          JsBarcode("#${barcodeId}", "${barcodeValue}", {
            format: "CODE128",
            displayValue: true,
            fontSize: 14,
            lineColor: "#000",
            width: 2,
            height: 60
          });
        `;
      }
    });
  });

  printContainer.innerHTML = barcodeContent;

  // Generate barcodes
  setTimeout(() => {
    // Execute barcode generation scripts
    const script = document.createElement("script");
    script.textContent = barcodeScripts;
    document.head.appendChild(script);

    // Print after a short delay to ensure barcodes are generated
    setTimeout(() => {
      window.print();

      // Clean up after printing
      setTimeout(() => {
        document.body.removeChild(printContainer);
        document.head.removeChild(printStyles);
        document.head.removeChild(script);
      }, 1000);
    }, 500);
  }, 100);
}

// Global functions for inline event handlers
window.openProductDetails = function (productId) {
  // Navigate to product details page
  window.location.href = `./Product-details.html?id=${productId}`;
};

window.editProduct = function (productId) {
  const product = currentProducts.find((p) => p.id === productId);
  if (product) {
    openEditProductModal(product);
  }
};

window.deleteProduct = async function (productId) {
  if (confirm("Are you sure you want to delete this product?")) {
    try {
      const { db, doc, deleteDoc } = firebaseInstance;
      if (!window.currentBusinessId) {
        showError('No business context available');
        return;
      }
      await deleteDoc(doc(db, "businesses", window.currentBusinessId, "products", productId));
      await loadProducts(); // Reload products
      console.log("Product deleted successfully");
    } catch (error) {
      console.error("Failed to delete product:", error);
      showError("Failed to delete product. Please try again.");
    }
  }
};

window.generateMainBarcode = function () {
  // Generate numeric barcode instead of alphanumeric
  const barcodeValue = generateNumericBarcode();

  document.getElementById("mainBarcode").value = barcodeValue;

  // Generate barcode SVG if JsBarcode is available
  if (window.JsBarcode) {
    const svg = document.getElementById("mainBarcodeSvg");
    if (svg) {
      window.JsBarcode(svg, barcodeValue, { format: "CODE128" });
    }
  }
};

window.generateSKU = function () {
  const productName = document.getElementById("productName").value;
  const skuInput = document.getElementById("productSKU");

  if (!productName.trim()) {
    alert("Please enter a product name first");
    return;
  }

  // Create SKU from product name
  const cleanName = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // Remove special characters
    .substring(0, 6); // Take first 6 characters

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString().slice(-4);

  const generatedSKU = `${cleanName}${timestamp}`;
  skuInput.value = generatedSKU;

  // Also update barcode if it's empty - now using numeric barcode
  const barcodeInput = document.getElementById("mainBarcode");
  if (!barcodeInput.value) {
    barcodeInput.value = generateNumericBarcode();
    generateMainBarcode();
  }
};

console.log("Products fixed script loaded");

window.generateSKU = function () {
  const productName = document.getElementById("productName").value;
  const skuInput = document.getElementById("productSKU");

  if (!productName.trim()) {
    alert("Please enter a product name first");
    return;
  }

  // Create SKU from product name
  const cleanName = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // Remove special characters
    .substring(0, 6); // Take first 6 characters

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString().slice(-4);

  const generatedSKU = `${cleanName}${timestamp}`;
  skuInput.value = generatedSKU;

  // Also update barcode if it's empty - now using numeric barcode
  const barcodeInput = document.getElementById("mainBarcode");
  if (!barcodeInput.value) {
    barcodeInput.value = generateNumericBarcode();
    generateMainBarcode();
  }
};
console.log("Products fixed script loaded");
