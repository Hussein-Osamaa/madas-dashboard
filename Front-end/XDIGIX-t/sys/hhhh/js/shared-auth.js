// Shared Authentication Script for MADAS Dashboard
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:70470e2204065b4590583d3",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentUserData = null;
let authInitialized = false; // Flag to prevent multiple initializations

// Initialize authentication
export function initializeAuth() {
  // Prevent multiple auth listeners
  if (authInitialized) {
    console.log("Auth already initialized, skipping...");
    return;
  }

  authInitialized = true;
  console.log("Initializing shared authentication system...");

  // Add retry logic for network issues
  let retryCount = 0;
  const maxRetries = 3;

  const initializeWithRetry = () => {
    try {
      onAuthStateChanged(auth, async (user) => {
        console.log(
          "Shared auth state changed:",
          user ? "User logged in" : "No user"
        );

    if (!user) {
      // Redirect to login if no user
      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/signup") &&
        !window.location.pathname.includes("no-access.html") &&
        !window.location.pathname.includes("debug-") &&
        !window.location.pathname.includes("test-")
      ) {
        console.log("No user, redirecting to login");
        window.location.href = "/login";
      }
      return;
    }

    try {
      // Find which business this user belongs to
      // First, try to find the business where user is owner
      const businessesQuery = query(
        collection(db, "businesses"),
        where("owner.email", "==", user.email)
      );
      const businessesSnapshot = await getDocs(businessesQuery);
      
      let businessId = null;
      let userData = null;
      let staffDocId = null;
      
      if (!businessesSnapshot.empty) {
        // User is owner of a business
        const businessDoc = businessesSnapshot.docs[0];
        businessId = businessDoc.id;
        const businessData = businessDoc.data();
        
        userData = {
          email: user.email,
          name: businessData.owner?.name || user.displayName || user.email.split("@")[0],
          role: "owner",
          approved: true,
          permissions: [
            "dashboard_view", "order_view", "order_create", "order_update", "order_delete", "scan_log",
            "pos_view", "pos_access",
            "product_view", "product_create", "product_update", "product_delete", "product_import", "product_export",
            "collection_view", "collection_create", "collection_update", "collection_delete",
            "reviews_view", "reviews_manage", "low_stock_view",
            "customer_view", "customer_create", "customer_update", "customer_delete", "loyalty_manage",
            "finance_view", "finance_deposit", "finance_expenses", "finance_reports", "finance_insights",
            "analytics_view",
            "discount_view", "discount_create", "discount_update", "discount_delete",
            "website_builder", "website_publish", "website_templates", "website_domains",
            "game_hub", "discount_wheel", "madas_pass", "scratch_card", "loyalty_program",
            "settings_general", "settings_shipping", "settings_payments", "settings_integrations", "settings_social", "settings_plans",
            "staff_view", "staff_create", "staff_update", "staff_delete",
            "notifications_view", "ticket_system",
            "profile_view", "profile_update"
          ]
        };
      } else {
        // User might be staff - search all businesses
        const allBusinessesQuery = query(collection(db, "businesses"));
        const allBusinessesSnapshot = await getDocs(allBusinessesQuery);
        
        for (const businessDoc of allBusinessesSnapshot.docs) {
          businessId = businessDoc.id;
          const staffQuery = query(
            collection(db, "businesses", businessId, "staff"),
            where("email", "==", user.email)
          );
          const staffSnapshot = await getDocs(staffQuery);
          
          if (!staffSnapshot.empty) {
            const staffDoc = staffSnapshot.docs[0];
            staffDocId = staffDoc.id;
            const staffData = staffDoc.data();
            
            userData = {
              ...staffData,
              email: user.email,
              name: staffData.name || `${staffData.firstName || ""} ${staffData.lastName || ""}`.trim() || user.displayName || user.email.split("@")[0],
              role: staffData.role || "staff"
            };
            
            // Ensure permissions is an array (handle both formats)
            if (!Array.isArray(userData.permissions)) {
              if (typeof userData.permissions === "object" && userData.permissions !== null) {
                // Convert old format to new format
                const permissionsArray = [];
                Object.entries(userData.permissions).forEach(([section, actions]) => {
                  if (Array.isArray(actions)) {
                    actions.forEach(action => {
                      permissionsArray.push(`${section}_${action}`);
                    });
                  }
                });
                userData.permissions = permissionsArray;
              } else {
                userData.permissions = [];
              }
            }
            break;
          }
        }
      }
      
      if (!userData) {
        console.warn(
          "User not found in any business or staff collection. Redirecting to no-access."
        );
        window.location.href = "../no-access.html";
        return;
      }

      // Auto-approve admin/super admin users and grant full permissions
      const adminEmails = [
        "hesainosama@gmail.com",
        // Add more admin emails here
      ];

      if (adminEmails.includes(user.email) && userData.role !== "owner") {
        // Grant full access to admins
        const fullPermissions = [
          "dashboard_view", "order_view", "order_create", "order_update", "order_delete", "scan_log",
          "pos_view", "pos_access",
          "product_view", "product_create", "product_update", "product_delete", "product_import", "product_export",
          "collection_view", "collection_create", "collection_update", "collection_delete",
          "reviews_view", "reviews_manage", "low_stock_view",
          "customer_view", "customer_create", "customer_update", "customer_delete", "loyalty_manage",
          "finance_view", "finance_deposit", "finance_expenses", "finance_reports", "finance_insights",
          "analytics_view",
          "discount_view", "discount_create", "discount_update", "discount_delete",
          "website_builder", "website_publish", "website_templates", "website_domains",
          "game_hub", "discount_wheel", "madas_pass", "scratch_card", "loyalty_program",
          "settings_general", "settings_shipping", "settings_payments", "settings_integrations", "settings_social", "settings_plans",
          "staff_view", "staff_create", "staff_update", "staff_delete",
          "notifications_view", "ticket_system",
          "profile_view", "profile_update"
        ];
        
        if (staffDocId && businessId) {
          // Update staff document with full permissions
          await updateDoc(doc(db, "businesses", businessId, "staff", staffDocId), {
            approved: true,
            role: "admin",
            permissions: fullPermissions
          });
        }
        
        userData.approved = true;
        userData.role = "admin";
        userData.permissions = fullPermissions;
        console.log("Granted full access to admin");
      }

      // Ensure all approved staff users have at least dashboard view permission
      if (
        userData.approved &&
        userData.role !== "owner" &&
        (!Array.isArray(userData.permissions) || userData.permissions.length === 0 || !userData.permissions.includes("dashboard_view"))
      ) {
        if (!Array.isArray(userData.permissions)) {
          userData.permissions = [];
        }
        
        if (!userData.permissions.includes("dashboard_view")) {
          userData.permissions.push("dashboard_view");
        }

        if (staffDocId && businessId) {
          await updateDoc(doc(db, "businesses", businessId, "staff", staffDocId), {
            permissions: userData.permissions
          });
        }
        
        console.log("Added default dashboard_view permission for user");
      }

      // Check if user is approved (unless they're an owner)
      if (userData.role !== "owner" && !userData.approved) {
        console.warn("User not approved. Redirecting to no-access.");
        window.location.href = "../no-access.html";
        return;
      }

      // Store user data
      currentUser = user;
      currentUserData = userData;
      localStorage.setItem("madasUser", JSON.stringify(userData));

      // Update UI
      updateUserUI(user, userData);

      // Check page-specific permissions
      checkPagePermissions(userData);
    } catch (error) {
      console.error("Permission check failed:", error);
      
      // Check if it's a network error
      if (error.message && error.message.includes('ERR_INTERNET_DISCONNECTED')) {
        console.warn("Network error detected, will retry...");
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying authentication (attempt ${retryCount}/${maxRetries})...`);
          setTimeout(initializeWithRetry, 2000 * retryCount); // Exponential backoff
          return;
        } else {
          console.error("Max retries reached, showing offline message");
          showOfflineMessage();
          return;
        }
      }
      
      window.location.href = "/login";
    }
  });
  
  } catch (error) {
    console.error("Failed to initialize Firebase Auth:", error);
    if (retryCount < maxRetries) {
      retryCount++;
      console.log(`Retrying Firebase initialization (attempt ${retryCount}/${maxRetries})...`);
      setTimeout(initializeWithRetry, 2000 * retryCount);
    } else {
      console.error("Max retries reached for Firebase initialization");
      showOfflineMessage();
    }
  }
  };

  // Start the initialization
  initializeWithRetry();

  // Setup logout functionality
  setupLogout();
}

// Check network connectivity
async function checkNetworkConnectivity() {
  try {
    // Test basic connectivity
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    return true;
  } catch (error) {
    console.error('Network connectivity check failed:', error);
    return false;
  }
}

// Test Firebase connectivity specifically
async function testFirebaseConnectivity() {
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: 'test' })
    });
    
    // Even a 400 error means Firebase is reachable
    return response.status === 400 || response.status === 200;
  } catch (error) {
    console.error('Firebase connectivity test failed:', error);
    return false;
  }
}

// Show offline message when network is unavailable
function showOfflineMessage() {
  const offlineMessage = document.createElement('div');
  offlineMessage.id = 'offline-message';
  offlineMessage.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f44336;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 10000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-family: Arial, sans-serif;
  `;
  offlineMessage.innerHTML = `
    <strong>Connection Error</strong><br>
    Unable to connect to authentication service.<br>
    Please check your internet connection and refresh the page.
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: 1px solid white;
      color: white;
      padding: 5px 10px;
      margin-left: 10px;
      border-radius: 3px;
      cursor: pointer;
    ">Dismiss</button>
  `;
  
  // Remove any existing offline message
  const existing = document.getElementById('offline-message');
  if (existing) existing.remove();
  
  document.body.appendChild(offlineMessage);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (offlineMessage.parentElement) {
      offlineMessage.remove();
    }
  }, 10000);
}

// Diagnostic function for debugging connectivity issues
window.debugFirebaseConnectivity = async function() {
  console.log('🔍 Running Firebase connectivity diagnostics...');
  
  // Test 1: Basic network connectivity
  console.log('1. Testing basic network connectivity...');
  const networkOk = await checkNetworkConnectivity();
  console.log(`   Network connectivity: ${networkOk ? '✅ OK' : '❌ FAILED'}`);
  
  // Test 2: Firebase API connectivity
  console.log('2. Testing Firebase API connectivity...');
  const firebaseOk = await testFirebaseConnectivity();
  console.log(`   Firebase API: ${firebaseOk ? '✅ OK' : '❌ FAILED'}`);
  
  // Test 3: Firebase SDK loading
  console.log('3. Testing Firebase SDK loading...');
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    console.log('   Firebase SDK: ✅ OK');
  } catch (error) {
    console.log('   Firebase SDK: ❌ FAILED -', error.message);
  }
  
  // Test 4: Current auth state
  console.log('4. Current authentication state...');
  console.log(`   Auth initialized: ${authInitialized ? '✅ YES' : '❌ NO'}`);
  console.log(`   Current user: ${currentUser ? '✅ LOGGED IN' : '❌ NOT LOGGED IN'}`);
  
  // Test 5: Browser info
  console.log('5. Browser information...');
  console.log(`   User Agent: ${navigator.userAgent}`);
  console.log(`   Online status: ${navigator.onLine ? '✅ ONLINE' : '❌ OFFLINE'}`);
  
  // Summary
  const allTestsPassed = networkOk && firebaseOk;
  console.log(`\n🎯 Summary: ${allTestsPassed ? '✅ All tests passed' : '❌ Some tests failed'}`);
  
  if (!allTestsPassed) {
    console.log('\n💡 Troubleshooting tips:');
    if (!networkOk) console.log('   - Check your internet connection');
    if (!firebaseOk) console.log('   - Check if Firebase services are accessible');
    console.log('   - Try refreshing the page');
    console.log('   - Check browser console for additional errors');
    console.log('   - Try disabling browser extensions');
  }
  
  return { networkOk, firebaseOk, authInitialized, currentUser: !!currentUser };
};

// Update user interface elements
function updateUserUI(user, userData) {
  const username =
    userData.name ||
    userData.firstName + " " + userData.lastName ||
    user.displayName ||
    user.email.split("@")[0];

  // Update user info in header
  const userNameElement = document.getElementById("user-name");
  const userEmailElement = document.getElementById("user-email");
  const userInitialElement = document.getElementById("user-initial");

  if (userNameElement) userNameElement.textContent = username;
  if (userEmailElement) userEmailElement.textContent = user.email;
  if (userInitialElement)
    userInitialElement.textContent = username.charAt(0).toUpperCase();
}

// Permission mapping: Maps permission strings to required permissions for pages
// Format: "category_action" (e.g., "dashboard_view", "order_create")
function mapPermissionToPage(pagePath) {
  const pageName = pagePath.split("/").pop() || "";
  
  // Map pages to required permission strings (matching staff-settings.html format)
  const pagePermissionMap = {
    // Dashboard
    "index.html": ["dashboard_view"],
    
    // Orders
    "orders.html": ["order_view"],
    "scan_log.html": ["scan_log"],
    
    // POS
    "pos.html": ["pos_view", "pos_access"],
    
    // Products & Inventory
    "products.html": ["product_view"],
    "Product-details.html": ["product_view"],
    "low-stock.html": ["low_stock_view"],
    "product-reviews.html": ["reviews_view"],
    "collections.html": ["collection_view"],
    "collection-display.html": ["collection_view"],
    
    // Customers
    "Customer.html": ["customer_view"],
    "loyalty.html": ["loyalty_manage"],
    
    // Finance
    "finance.html": ["finance_view"],
    "deposit-money-simple.html": ["finance_deposit"],
    "expenses.html": ["finance_expenses"],
    "reports.html": ["finance_reports"],
    "insights.html": ["finance_insights"],
    "analytics.html": ["analytics_view"],
    // "shares.html": ["finance_shares"], // Removed - not used in finance system
    
    // Settings
    "general-settings.html": ["settings_general"],
    "shipping-delivery-settings.html": ["settings_shipping"],
    "payments-settings.html": ["settings_payments"],
    "integrations-settings.html": ["settings_integrations"],
    "social-media-settings.html": ["settings_social"],
    "plans-billing-settings.html": ["settings_plans"],
    "staff-settings.html": ["staff_view"],
    
    // Website Builder
    "website-builder.html": ["website_builder"],
    "professional-builder-new.html": ["website_builder"],
    "website-templates.html": ["website_templates"],
    "website-pages.html": ["website_builder"],
    "website-settings.html": ["website_builder"],
    "website-preview.html": ["website_builder"],
    "domains.html": ["website_domains"],
    
    // Gamification
    "game-hub.html": ["game_hub"],
    "discount-wheel.html": ["discount_wheel"],
    "madas-pass.html": ["madas_pass"],
    "scratch-card.html": ["scratch_card"],
    "discount-customize.html": ["discount_view"],
    "madas-pass-customization.html": ["madas_pass"],
    "scratch-card-customize.html": ["scratch_card"],
    
    // Discount
    "discount-customize.html": ["discount_view"],
    
    // Notifications
    "notifications.html": ["notifications_view"],
    
    // Profile
    "profile.html": ["profile_view"],
  };
  
  return pagePermissionMap[pageName] || [];
}

// Check if user has any of the required permissions
function hasPermission(userData, requiredPermissions) {
  // Owners and super admins have all permissions
  if (userData.role === "owner" || userData.role === "super-admin" || userData.email === "hesainosama@gmail.com") {
    console.log("✅ User is owner/admin - granting access");
    return true;
  }
  
  // Regular admins also have all permissions (if they're in the admin list)
  const adminEmails = ["hesainosama@gmail.com"];
  if (userData.role === "admin" && adminEmails.includes(userData.email)) {
    console.log("✅ User is admin - granting access");
    return true;
  }
  
  // Get user permissions (can be array or object format)
  let userPermissions = [];
  if (Array.isArray(userData.permissions)) {
    userPermissions = userData.permissions;
  } else if (typeof userData.permissions === "object" && userData.permissions !== null) {
    // Convert old format to new format
    Object.entries(userData.permissions).forEach(([section, actions]) => {
      if (Array.isArray(actions)) {
        actions.forEach(action => {
          userPermissions.push(`${section}_${action}`);
        });
      }
    });
  }
  
  // Check if user has at least one required permission
  const hasAccess = requiredPermissions.some(permission => userPermissions.includes(permission));
  
  if (!hasAccess) {
    console.warn(`❌ Permission denied. User has: [${userPermissions.join(", ")}], Required: [${requiredPermissions.join(", ")}]`);
  } else {
    console.log(`✅ Permission granted. User has one of: [${requiredPermissions.join(", ")}]`);
  }
  
  return hasAccess;
}

// Check page-specific permissions
function checkPagePermissions(userData) {
  const currentPage = window.location.pathname;
  const requiredPermissions = mapPermissionToPage(currentPage);
  
  // If no permission mapping exists, allow access (for pages not in the system)
  if (requiredPermissions.length === 0) {
    console.log(`No permission mapping for page: ${currentPage}, allowing access`);
    applyPermissionBasedUI(userData.permissions);
    return;
  }
  
  // STRICT CHECK: Only owners and super-admins bypass permission checks
  const isOwner = userData.role === "owner";
  const isSuperAdmin = userData.role === "super-admin" || userData.email === "hesainosama@gmail.com";
  
  if (isOwner || isSuperAdmin) {
    console.log(`✅ Owner/Super-admin - full access granted`);
    applyPermissionBasedUI(userData.permissions);
    return;
  }
  
  // For staff members, STRICT permission checking is REQUIRED
  // Check if user has required permission
  if (!hasPermission(userData, requiredPermissions)) {
    console.warn(
      `❌ ACCESS DENIED: User lacks required permissions for ${currentPage}. Required: ${requiredPermissions.join(", ")}. User has: ${Array.isArray(userData.permissions) ? userData.permissions.join(", ") : "none"}. Redirecting to no-access.`
    );
    window.location.href = "../no-access.html";
    return;
  }
  
  console.log(`✅ Permission granted for ${currentPage}`);
  
  // Apply permission-based UI controls
  applyPermissionBasedUI(userData.permissions);
}

// Apply permission-based UI controls
function applyPermissionBasedUI(permissions) {
  // Get permissions as array format
  let userPermissions = [];
  if (Array.isArray(permissions)) {
    userPermissions = permissions;
  } else if (typeof permissions === "object" && permissions !== null) {
    // Convert old format to new format
    Object.entries(permissions).forEach(([section, actions]) => {
      if (Array.isArray(actions)) {
        actions.forEach(action => {
          userPermissions.push(`${section}_${action}`);
        });
      }
    });
  }
  
  // Hide/show elements based on permissions
  const permissionElementMap = {
    // Order permissions
    order_create: ["#addOrderBtn", ".create-order-btn"],
    order_update: [".edit-order-btn"],
    order_delete: [".delete-order-btn"],
    
    // Product permissions
    product_create: ["#addProductBtn", ".create-product-btn"],
    product_update: [".edit-product-btn"],
    product_delete: [".delete-product-btn"],
    product_import: [".import-product-btn", "#import-products"],
    product_export: [".export-product-btn", "#export-products"],
    
    // Collection permissions
    collection_create: ["#addCollectionBtn", ".create-collection-btn"],
    collection_update: [".edit-collection-btn"],
    collection_delete: [".delete-collection-btn"],
    
    // Customer permissions
    customer_create: ["#addCustomerBtn", ".create-customer-btn"],
    customer_update: [".edit-customer-btn"],
    customer_delete: [".delete-customer-btn"],
    
    // Finance permissions
    finance_deposit: ["#record-transfer", ".add-deposit-btn"],
    finance_expenses: [".add-expense-btn", "#add-expense"],
    finance_reports: [".generate-report-btn"],
    
    // Staff permissions
    staff_create: ["#add-staff-btn", "#addStaffBtn"],
    staff_update: [".edit-staff-btn"],
    staff_delete: [".delete-staff-btn"],
    
    // Discount permissions
    discount_create: ["#addDiscountBtn", ".create-discount-btn"],
    discount_update: [".edit-discount-btn"],
    discount_delete: [".delete-discount-btn"],
    
    // Website builder permissions
    website_publish: ["#publish-website", ".publish-btn"],
    website_domains: ["#manage-domains", ".domain-settings"],
    
    // Settings permissions (only allow access if has settings permission)
    settings_general: [".settings-general-link"],
    settings_shipping: [".settings-shipping-link"],
    settings_payments: [".settings-payments-link"],
    settings_integrations: [".settings-integrations-link"],
    settings_social: [".settings-social-link"],
    settings_plans: [".settings-plans-link"],
  };
  
  // Hide elements if user doesn't have permission
  Object.entries(permissionElementMap).forEach(([permission, selectors]) => {
    const hasPermission = userPermissions.includes(permission);
    if (!hasPermission) {
      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          el.style.display = "none";
        });
      });
    }
  });
}

// Setup logout functionality
function setupLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          localStorage.removeItem("madasUser");
          window.location.href = "/login";
        })
        .catch((error) => {
          console.error("Logout error:", error);
        });
    });
  }
}

// Export functions for use in other modules
export { auth, db, currentUser, currentUserData };

// Auto-initialize when script loads (for pages that include this script)
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
  });
} else if (typeof window !== 'undefined' && document.readyState === 'complete') {
  // Already loaded, initialize immediately
  initializeAuth();
}

// Universal permission checker - works even if shared-auth.js hasn't run yet
// This checks localStorage for permissions and enforces access control
window.checkPermissionsFromStorage = function() {
  try {
    const storedUserData = localStorage.getItem("madasUser");
    if (!storedUserData) {
      console.warn("No user data in localStorage");
      return;
    }
    
    const userData = JSON.parse(storedUserData);
    const currentPage = window.location.pathname;
    const requiredPermissions = mapPermissionToPage(currentPage);
    
    // Only check if there are required permissions for this page
    if (requiredPermissions.length === 0) {
      console.log(`No permission mapping for page: ${currentPage}`);
      return;
    }
    
    // Owners and super-admins bypass checks
    const isOwner = userData.role === "owner";
    const isSuperAdmin = userData.role === "super-admin" || userData.email === "hesainosama@gmail.com";
    
    if (isOwner || isSuperAdmin) {
      console.log(`✅ Owner/Super-admin - full access`);
      return;
    }
    
    // Check permissions
    if (!hasPermission(userData, requiredPermissions)) {
      console.warn(`❌ ACCESS DENIED: Insufficient permissions. Redirecting...`);
      window.location.href = "../no-access.html";
    }
  } catch (error) {
    console.error("Error checking permissions from storage:", error);
  }
};

// Auto-check permissions on page load (if shared-auth.js hasn't already)
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (typeof window.checkPermissionsFromStorage === 'function') {
          window.checkPermissionsFromStorage();
        }
      }, 1000); // Give time for auth to initialize
    });
  } else {
    setTimeout(() => {
      if (typeof window.checkPermissionsFromStorage === 'function') {
        window.checkPermissionsFromStorage();
      }
    }, 1000);
  }
}
