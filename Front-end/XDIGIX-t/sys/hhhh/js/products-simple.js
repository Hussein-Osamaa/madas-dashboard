// products-simple.js - Simplified version for Firebase hosting compatibility

console.log("Products simple script starting...");

// Wait for Firebase to be available globally
function waitForFirebase() {
  return new Promise((resolve) => {
    const checkFirebase = () => {
      if (window.firebase && window.firebase.app) {
        console.log("Firebase found globally");
        resolve(window.firebase);
      } else {
        console.log("Firebase not ready, waiting...");
        setTimeout(checkFirebase, 100);
      }
    };
    checkFirebase();
  });
}

// Initialize Firebase manually
async function initializeFirebase() {
  try {
    // Import Firebase modules
    const { initializeApp } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
    );
    const { getAuth, onAuthStateChanged, signOut } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
    );
    const {
      getFirestore,
      collection,
      getDocs,
      query,
      where,
      updateDoc,
      doc,
      deleteDoc,
      addDoc,
    } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
    );

    console.log("Firebase modules imported successfully");

    // Firebase config
    const firebaseConfig = {
      apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
      authDomain: "madas-store.firebaseapp.com",
      projectId: "madas-store",
      storageBucket: "madas-store.appspot.com",
      messagingSenderId: "527071300010",
      appId: "1:527071300010:web:70470e2204065b4590583d3",
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log("Firebase initialized successfully");

    return {
      auth,
      db,
      onAuthStateChanged,
      collection,
      getDocs,
      query,
      where,
      updateDoc,
      doc,
      deleteDoc,
      addDoc,
    };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    throw error;
  }
}

// Global variables
let selectedProducts = new Set();
let allProducts = [];
let firebaseInstance = null;

// Initialize everything when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM loaded, initializing...");

  try {
    // Initialize Firebase
    firebaseInstance = await initializeFirebase();
    console.log("Firebase ready:", firebaseInstance);

    // Set up auth listener
    setupAuthListener();

    // Initialize UI
    initializeUI();
  } catch (error) {
    console.error("Initialization failed:", error);
    showError("Failed to initialize Firebase. Please refresh the page.");
  }
});

function setupAuthListener() {
  const { auth, onAuthStateChanged } = firebaseInstance;

  onAuthStateChanged(auth, async (user) => {
    console.log("Auth state changed:", user ? "User logged in" : "No user");

    if (!user) {
      console.log("No user, redirecting to login");
      window.location.href = "/login";
      return;
    }

    try {
      await checkUserPermissions(user);
      await loadProducts();
    } catch (error) {
      console.error("Auth setup failed:", error);
      showError("Authentication failed. Please try again.");
    }
  });
}

async function checkUserPermissions(user) {
  const { db, collection, getDocs, query, where, updateDoc, doc } =
    firebaseInstance;

  console.log("Checking user permissions...");

  // Check if user exists in staff collection
  const q = query(collection(db, "staff"), where("email", "==", user.email));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.warn("User not found in staff collection");
    window.location.href = "../no-access.html";
    return;
  }

  const userData = querySnapshot.docs[0].data();
  console.log("User data:", userData);

  // Auto-approve admin user
  if (user.email === "hesainosama@gmail.com") {
    await updateDoc(doc(db, "staff", querySnapshot.docs[0].id), {
      approved: true,
      permissions: {
        home: ["view"],
        orders: ["search", "create", "edit"],
        inventory: ["view", "edit"],
        customers: ["view", "edit"],
        employees: ["view", "edit"],
      },
    });
    console.log("Admin access granted");
  }

  // Check approval
  if (!userData.approved) {
    console.warn("User not approved");
    window.location.href = "../no-access.html";
    return;
  }

  // Check inventory permission
  if (!userData.permissions?.inventory?.includes("view")) {
    console.warn("No inventory view permission");
    window.location.href = "../no-access.html";
    return;
  }

  // Update UI with user info
  updateUserUI(user, userData);
}

function updateUserUI(user, userData) {
  const username =
    userData.name ||
    userData.firstName + " " + userData.lastName ||
    user.displayName ||
    user.email.split("@")[0];

  const userNameElement = document.getElementById("user-name");
  const userEmailElement = document.getElementById("user-email");
  const userInitialElement = document.getElementById("user-initial");

  if (userNameElement) userNameElement.textContent = username;
  if (userEmailElement) userEmailElement.textContent = user.email;
  if (userInitialElement)
    userInitialElement.textContent = username.charAt(0).toUpperCase();
}

function initializeUI() {
  console.log("Initializing UI...");

  }

  // Add product button
  const addProductBtn = document.getElementById("addProductBtn");
  if (addProductBtn) {
    addProductBtn.addEventListener("click", () => {
      console.log("Add product clicked");
      // TODO: Implement add product modal
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        const { auth, signOut } = firebaseInstance;
        await signOut(auth);
        window.location.href = "/login";
      } catch (error) {
        console.error("Logout failed:", error);
      }
    });
  }
}

async function loadProducts() {
  console.log("Loading products...");

  try {
    const { db, collection, getDocs } = firebaseInstance;
    const productsSnapshot = await getDocs(collection(db, "products"));

    console.log(`Found ${productsSnapshot.size} products`);

    const products = [];
    productsSnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });

    allProducts = products;
    renderProducts(products);
    updateStats(products);
  } catch (error) {
    console.error("Failed to load products:", error);
    showError("Failed to load products. Please refresh the page.");
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
    .map(
      (product) => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover">
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-900 mb-1">${
                      product.name || "Unnamed Product"
                    }</h3>
                    <p class="text-sm text-gray-600 mb-2">${
                      product.description || "No description"
                    }</p>
                    <div class="flex items-center space-x-4 text-sm">
                        <span class="text-[var(--madas-primary)] font-semibold">$${
                          product.price || 0
                        }</span>
                        <span class="text-gray-500">SKU: ${
                          product.sku || "N/A"
                        }</span>
                    </div>
                </div>
            </div>
            
            <div class="space-y-3">
                ${renderSizeVariants(product.sizes || {})}
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-100">
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-500">Last updated: ${new Date(
                      product.updatedAt?.toDate() || Date.now()
                    ).toLocaleDateString()}</span>
                    <div class="flex space-x-2">
                        <button class="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                        <button class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `
    )
    .join("");
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
    const sizes = p.sizes || {};
    return Object.values(sizes).some(
      (size) => size.quantity > 0 && size.quantity <= (p.lowStockAlert || 5)
    );
  }).length;
  const outOfStock = products.filter((p) => {
    const sizes = p.sizes || {};
    return Object.values(sizes).every((size) => size.quantity <= 0);
  }).length;
  const totalValue = products.reduce((sum, p) => {
    const sizes = p.sizes || {};
    const totalQuantity = Object.values(sizes).reduce(
      (qty, size) => qty + (size.quantity || 0),
      0
    );
    return sum + (p.price || 0) * totalQuantity;
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

function showError(message) {
  console.error(message);
  // You can implement a proper error display here
  alert(message);
}

console.log("Products simple script loaded");
