import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// Global variables
let currentUser = null;
let staffData = [];
let filteredStaffData = [];
let currentPage = 1;
const itemsPerPage = 10;
let selectedStaffIds = new Set();

// DOM Elements
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.getElementById("sidebar");
const addStaffBtn = document.getElementById("addStaffBtn");
const addStaffBtnSidebar = document.getElementById("addStaffBtnSidebar");
const exportStaffBtn = document.getElementById("exportStaffBtn");
const bulkActionsBtn = document.getElementById("bulkActionsBtn");
const staffModal = document.getElementById("staffModal");
const closeStaffModalBtn = document.getElementById("closeStaffModalBtn");
const staffForm = document.getElementById("staffForm");
const cancelStaffBtn = document.getElementById("cancelStaffBtn");
const saveStaffBtn = document.getElementById("saveStaffBtn");
const staffTableBody = document.getElementById("staffTableBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const roleFilter = document.getElementById("roleFilter");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const selectAllCheckbox = document.getElementById("selectAllCheckbox");
const bulkActionsModal = document.getElementById("bulkActionsModal");
const closeBulkModalBtn = document.getElementById("closeBulkModalBtn");
const cancelBulkBtn = document.getElementById("cancelBulkBtn");
const applyBulkBtn = document.getElementById("applyBulkBtn");
const bulkAction = document.getElementById("bulkAction");
const bulkActionDetails = document.getElementById("bulkActionDetails");
const selectedCount = document.getElementById("selectedCount");

// Stats elements
const totalStaff = document.getElementById("total-staff");
const activeStaff = document.getElementById("active-staff");
const pendingStaff = document.getElementById("pending-staff");
const adminStaff = document.getElementById("admin-staff");

// Pagination elements
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const currentPageSpan = document.getElementById("currentPage");
const showingStart = document.getElementById("showingStart");
const showingEnd = document.getElementById("showingEnd");
const totalResults = document.getElementById("totalResults");

// User info elements
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const userInitial = document.getElementById("user-initial");
const logoutBtn = document.getElementById("logout-btn");
const notificationCount = document.getElementById("notificationCount");

// Initialize the application
async function initializeAdminApp() {
  console.log("Initializing admin app...");
  await checkAuth();
  setupEventListeners();
  await loadStaffData();
  updateStats();
}

// Check authentication
async function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("No user authenticated, redirecting to login");
        window.location.href = "/login";
        return;
      }

      try {
        console.log("User authenticated:", user.email);
        currentUser = user;

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

        // Check if user has employees view permission
        if (!userData.permissions?.employees?.includes("view")) {
          console.warn(
            "User has no employees view permission. Redirecting to no-access."
          );
          window.location.href = "../no-access.html";
          return;
        }

        // Store user data
        localStorage.setItem("madasUser", JSON.stringify(userData));

        // Load user data for UI
        await loadUserData();
        resolve();
      } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.href = "/login";
      }
    });
  });
}

// Load user data
async function loadUserData() {
  try {
    const userDoc = await getDocs(
      query(collection(db, "staff"), where("email", "==", currentUser.email))
    );
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      if (userName)
        userName.textContent =
          userData.name || currentUser.displayName || "User";
      if (userEmail) userEmail.textContent = currentUser.email;
      if (userInitial)
        userInitial.textContent = (
          userData.name ||
          currentUser.displayName ||
          "U"
        )
          .charAt(0)
          .toUpperCase();
    }
  } catch (error) {
    console.error("Error loading user data:", error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Add staff button
  if (addStaffBtn) {
    addStaffBtn.addEventListener("click", () => openStaffModal());
  }

  // Close modal button
  if (closeStaffModalBtn) {
    closeStaffModalBtn.addEventListener("click", closeStaffModal);
  }

  // Cancel button
  if (cancelStaffBtn) {
    cancelStaffBtn.addEventListener("click", closeStaffModal);
  }

  // Staff form submission
  if (staffForm) {
    staffForm.addEventListener("submit", handleStaffFormSubmit);
  }

  // Generate password button
  const generatePasswordBtn = document.getElementById("generatePasswordBtn");
  if (generatePasswordBtn) {
    generatePasswordBtn.addEventListener("click", () => {
      const newPassword = generateRandomPassword();
      const newPasswordInput = document.getElementById("newPassword");
      const confirmPasswordInput = document.getElementById("confirmPassword");

      if (newPasswordInput) newPasswordInput.value = newPassword;
      if (confirmPasswordInput) confirmPasswordInput.value = newPassword;

      showNotification("Random password generated", "success");
    });
  }

  // Send reset email button
  const sendResetEmailBtn = document.getElementById("sendResetEmailBtn");
  if (sendResetEmailBtn) {
    sendResetEmailBtn.addEventListener("click", async () => {
      const staffId = document.getElementById("staffId")?.value;
      const email = document.getElementById("staffEmail")?.value;

      if (!staffId || !email) {
        showNotification("Please select a staff member first", "error");
        return;
      }

      try {
        const success = await sendPasswordResetToStaff(email);
        if (success) {
          showNotification("Password reset email sent successfully", "success");
        } else {
          showNotification("Failed to send password reset email", "error");
        }
      } catch (error) {
        console.error("Error sending reset email:", error);
        showNotification("Error sending password reset email", "error");
      }
    });
  }

  // Clear password button
  const clearPasswordBtn = document.getElementById("clearPasswordBtn");
  if (clearPasswordBtn) {
    clearPasswordBtn.addEventListener("click", () => {
      const newPasswordInput = document.getElementById("newPassword");
      const confirmPasswordInput = document.getElementById("confirmPassword");

      if (newPasswordInput) newPasswordInput.value = "";
      if (confirmPasswordInput) confirmPasswordInput.value = "";

      showNotification("Password fields cleared", "info");
    });
  }

  // Search input
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 300));
  }

  // Filter selects
  if (statusFilter) {
    statusFilter.addEventListener("change", handleFilter);
  }
  if (roleFilter) {
    roleFilter.addEventListener("change", handleFilter);
  }

  // Clear filters button
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", clearFilters);
  }

  // Select all checkbox
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", handleSelectAll);
  }

  // Pagination buttons
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => changePage(-1));
  }
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => changePage(1));
  }

  // Export button
  if (exportStaffBtn) {
    exportStaffBtn.addEventListener("click", exportStaffData);
  }

  // Bulk actions
  if (bulkActionsBtn) {
    bulkActionsBtn.addEventListener("click", openBulkActionsModal);
  }
  if (closeBulkModalBtn) {
    closeBulkModalBtn.addEventListener("click", closeBulkActionsModal);
  }
  if (cancelBulkBtn) {
    cancelBulkBtn.addEventListener("click", closeBulkActionsModal);
  }
  if (bulkAction) {
    bulkAction.addEventListener("change", handleBulkActionChange);
  }
  if (applyBulkBtn) {
    applyBulkBtn.addEventListener("click", handleBulkAction);
  }

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // Profile button
  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      window.location.href = "./profile.html";
    });
  }

  // Menu toggle
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      if (sidebar) sidebar.classList.toggle("-translate-x-full");
    });
  }

  // Permission checkboxes
  setupPermissionCheckboxes();
}

// Setup permission checkboxes
function setupPermissionCheckboxes() {
  const permissionSections = [
    "dashboard",
    "orders",
    "inventory",
    "customers",
    "employees",
    "finance",
    "analytics",
    "reports",
    "insights",
    "settings",
  ];

  permissionSections.forEach((section) => {
    const allCheckbox = document.getElementById(`${section}-all`);
    const checkboxes = document.querySelectorAll(`input[name="${section}"]`);

    if (allCheckbox) {
      allCheckbox.addEventListener("change", (e) => {
        checkboxes.forEach((checkbox) => {
          checkbox.checked = e.target.checked;
        });
      });
    }

    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
        const someChecked = Array.from(checkboxes).some((cb) => cb.checked);

        if (allCheckbox) {
          allCheckbox.checked = allChecked;
          allCheckbox.indeterminate = someChecked && !allChecked;
        }
      });
    });
  });
}

// Load staff data
async function loadStaffData() {
  try {
    console.log("Loading staff data...");
    const staffQuery = query(
      collection(db, "staff"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(staffQuery);

    staffData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("Staff data loaded:", staffData.length, "records");
    filteredStaffData = [...staffData];
    renderStaffTable();
    updateStats();
  } catch (error) {
    console.error("Error loading staff data:", error);
    showNotification("Error loading staff data: " + error.message, "error");
  }
}

// Render staff table
function renderStaffTable() {
  console.log(
    "Rendering staff table with",
    filteredStaffData.length,
    "records"
  );

  if (!staffTableBody) {
    console.error("Staff table body not found");
    return;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageData = filteredStaffData.slice(startIndex, endIndex);

  staffTableBody.innerHTML = "";

  if (pageData.length === 0) {
    staffTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <span class="material-icons text-4xl mb-2 text-gray-300">group</span>
                        <p class="text-lg font-medium">No staff members found</p>
                        <p class="text-sm">Try adjusting your search or filters</p>
                    </div>
                </td>
            </tr>
        `;
  } else {
    pageData.forEach((staff) => {
      const row = createStaffRow(staff);
      staffTableBody.appendChild(row);
    });
  }

  updatePagination();
}

// Create staff row
function createStaffRow(staff) {
  const row = document.createElement("tr");
  row.className = "hover:bg-gray-50 transition-colors";
  row.dataset.staffId = staff.id;

  const statusBadge = getStatusBadge(staff.status);
  const roleBadge = getRoleBadge(staff.role);
  const lastLogin = staff.lastLogin
    ? new Date(staff.lastLogin).toLocaleDateString()
    : "Never";

  row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
            <input type="checkbox" class="staff-checkbox w-4 h-4 text-[var(--madas-primary)] rounded" data-staff-id="${
              staff.id
            }">
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
                <div class="w-10 h-10 bg-[var(--madas-accent)] rounded-full flex items-center justify-center mr-3">
                    <span class="text-[var(--madas-primary)] font-bold text-sm">${
                      staff.name?.charAt(0).toUpperCase() || "U"
                    }</span>
                </div>
                <div>
                    <div class="text-sm font-medium text-gray-900">${
                      staff.name || "Unknown"
                    }</div>
                    <div class="text-sm text-gray-500">${
                      staff.email || "No email"
                    }</div>
                </div>
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ${staff.contact || staff.phone || "No contact"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            ${roleBadge}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
            ${statusBadge}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${lastLogin}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div class="flex items-center space-x-2">
                <button onclick="editStaff('${
                  staff.id
                }')" class="text-[var(--madas-primary)] hover:text-[#1f3c19] transition-colors">
                    <span class="material-icons text-sm">edit</span>
                </button>
                <button onclick="viewStaff('${
                  staff.id
                }')" class="text-blue-600 hover:text-blue-800 transition-colors">
                    <span class="material-icons text-sm">visibility</span>
                </button>
                <button onclick="deleteStaff('${
                  staff.id
                }')" class="text-red-600 hover:text-red-800 transition-colors">
                    <span class="material-icons text-sm">delete</span>
                </button>
            </div>
        </td>
    `;

  // Add checkbox event listener
  const checkbox = row.querySelector(".staff-checkbox");
  if (checkbox) {
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        selectedStaffIds.add(staff.id);
      } else {
        selectedStaffIds.delete(staff.id);
      }
      updateSelectedCount();
    });
  }

  return row;
}

// Get status badge
function getStatusBadge(status) {
  const statusConfig = {
    active: { class: "bg-green-100 text-green-800", icon: "check_circle" },
    pending: { class: "bg-yellow-100 text-yellow-800", icon: "pending" },
    suspended: { class: "bg-red-100 text-red-800", icon: "block" },
  };

  // Handle undefined or null status
  if (!status) {
    status = "pending";
  }

  const config = statusConfig[status] || statusConfig.pending;
  return `
        <span class="status-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          config.class
        }">
            <span class="material-icons text-xs mr-1">${config.icon}</span>
            ${status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    `;
}

// Get role badge
function getRoleBadge(role) {
  const roleConfig = {
    owner: {
      class:
        "bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 text-yellow-900 border border-yellow-400 shadow-md",
      icon: "star",
    },
    admin: {
      class: "bg-purple-100 text-purple-800",
      icon: "admin_panel_settings",
    },
    manager: { class: "bg-blue-100 text-blue-800", icon: "supervisor_account" },
    staff: { class: "bg-gray-100 text-gray-800", icon: "person" },
  };

  // Handle undefined or null role
  if (!role) {
    role = "staff";
  }

  const config = roleConfig[role] || roleConfig.staff;
  return `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
          config.class
        }">
            <span class="material-icons text-xs mr-1">${config.icon}</span>
            ${role.charAt(0).toUpperCase() + role.slice(1)}
            ${
              role === "owner"
                ? '<span class="ml-1 text-xs font-extrabold"></span>'
                : ""
            }
        </span>
    `;
}

// Update stats
function updateStats() {
  const stats = {
    total: staffData.length,
    active: staffData.filter((s) => s.status === "active").length,
    pending: staffData.filter((s) => s.status === "pending").length,
    admin: staffData.filter((s) => s.role === "admin").length,
  };

  if (totalStaff) totalStaff.textContent = stats.total;
  if (activeStaff) activeStaff.textContent = stats.active;
  if (pendingStaff) pendingStaff.textContent = stats.pending;
  if (adminStaff) adminStaff.textContent = stats.admin;

  // Update notification count
  if (notificationCount) notificationCount.textContent = stats.pending;
}

// Handle search
function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();

  filteredStaffData = staffData.filter(
    (staff) =>
      staff.name?.toLowerCase().includes(searchTerm) ||
      staff.email?.toLowerCase().includes(searchTerm) ||
      staff.contact?.toLowerCase().includes(searchTerm) ||
      staff.role?.toLowerCase().includes(searchTerm)
  );

  currentPage = 1;
  renderStaffTable();
}

// Handle filter
function handleFilter() {
  const statusFilterValue = statusFilter.value;
  const roleFilterValue = roleFilter.value;

  filteredStaffData = staffData.filter((staff) => {
    const statusMatch =
      !statusFilterValue || staff.status === statusFilterValue;
    const roleMatch = !roleFilterValue || staff.role === roleFilterValue;
    return statusMatch && roleMatch;
  });

  currentPage = 1;
  renderStaffTable();
}

// Clear filters
function clearFilters() {
  if (searchInput) searchInput.value = "";
  if (statusFilter) statusFilter.value = "";
  if (roleFilter) roleFilter.value = "";
  filteredStaffData = [...staffData];
  currentPage = 1;
  renderStaffTable();
}

// Update pagination
function updatePagination() {
  const totalPages = Math.ceil(filteredStaffData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(
    currentPage * itemsPerPage,
    filteredStaffData.length
  );

  if (showingStart) showingStart.textContent = startIndex;
  if (showingEnd) showingEnd.textContent = endIndex;
  if (totalResults) totalResults.textContent = filteredStaffData.length;
  if (currentPageSpan) currentPageSpan.textContent = currentPage;

  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
}

// Change page
function changePage(delta) {
  const totalPages = Math.ceil(filteredStaffData.length / itemsPerPage);
  const newPage = currentPage + delta;

  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderStaffTable();
  }
}

// Open staff modal
function openStaffModal(staffId = null) {
  const modalTitle = document.getElementById("modalTitle");
  const staffIdInput = document.getElementById("staffId");
  const passwordChangeSection = document.getElementById(
    "passwordChangeSection"
  );

  if (modalTitle) {
    modalTitle.textContent = staffId
      ? "Edit Staff Member"
      : "Add New Staff Member";
  }

  // Store staff ID for editing
  if (staffIdInput) {
    staffIdInput.value = staffId || "";
  }

  // Show/hide password change section
  if (passwordChangeSection) {
    if (staffId) {
      passwordChangeSection.classList.remove("hidden");
    } else {
      passwordChangeSection.classList.add("hidden");
    }
  }

  if (staffId) {
    loadStaffDataForEdit(staffId);
  } else {
    if (staffForm) staffForm.reset();
    clearPermissionCheckboxes();
  }

  if (staffModal) staffModal.classList.remove("hidden");
}

// Close staff modal
function closeStaffModal() {
  if (staffModal) staffModal.classList.add("hidden");
  if (staffForm) staffForm.reset();

  // Clear password fields
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const staffIdInput = document.getElementById("staffId");

  if (newPasswordInput) newPasswordInput.value = "";
  if (confirmPasswordInput) confirmPasswordInput.value = "";
  if (staffIdInput) staffIdInput.value = "";

  // Hide password change section
  const passwordChangeSection = document.getElementById(
    "passwordChangeSection"
  );
  if (passwordChangeSection) {
    passwordChangeSection.classList.add("hidden");
  }

  clearPermissionCheckboxes();
}

// Load staff data for editing
async function loadStaffDataForEdit(staffId) {
  try {
    const staffDoc = await getDocs(
      query(collection(db, "staff"), where("__name__", "==", staffId))
    );
    if (!staffDoc.empty) {
      const staffData = staffDoc.docs[0].data();
      populateStaffForm(staffData);
    }
  } catch (error) {
    console.error("Error loading staff data for edit:", error);
    showNotification("Error loading staff data", "error");
  }
}

// Populate staff form
function populateStaffForm(staff) {
  const [firstName, ...lastNameParts] = (staff.name || "").split(" ");
  const lastName = lastNameParts.join(" ");

  const firstNameInput = document.getElementById("staffFirstName");
  const lastNameInput = document.getElementById("staffLastName");
  const emailInput = document.getElementById("staffEmail");
  const contactInput = document.getElementById("staffContact");
  const roleInput = document.getElementById("staffRole");
  const statusInput = document.getElementById("staffStatus");

  if (firstNameInput) firstNameInput.value = firstName || "";
  if (lastNameInput) lastNameInput.value = lastName || "";
  if (emailInput) emailInput.value = staff.email || "";
  if (contactInput) contactInput.value = staff.contact || staff.phone || "";
  if (roleInput) roleInput.value = staff.role || "";
  if (statusInput) statusInput.value = staff.status || "pending";

  // Set permissions
  if (staff.permissions) {
    Object.keys(staff.permissions).forEach((section) => {
      staff.permissions[section].forEach((permission) => {
        const checkbox = document.querySelector(
          `input[name="${section}"][value="${permission}"]`
        );
        if (checkbox) checkbox.checked = true;
      });
    });
  }
}

// Clear permission checkboxes
function clearPermissionCheckboxes() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
    checkbox.indeterminate = false;
  });
}

// Handle staff form submission
async function handleStaffFormSubmit(e) {
  e.preventDefault();

  const formData = new FormData(staffForm);
  const staffData = {
    id: formData.get("staffId") || document.getElementById("staffId")?.value,
    firstName:
      formData.get("staffFirstName") ||
      document.getElementById("staffFirstName")?.value,
    lastName:
      formData.get("staffLastName") ||
      document.getElementById("staffLastName")?.value,
    email: document.getElementById("staffEmail")?.value,
    contact: document.getElementById("staffContact")?.value,
    role: document.getElementById("staffRole")?.value,
    status: document.getElementById("staffStatus")?.value,
    permissions: getPermissionsFromForm(),
  };

  // Validate password change if editing
  if (staffData.id) {
    const newPassword = document.getElementById("newPassword")?.value;
    const confirmPassword = document.getElementById("confirmPassword")?.value;

    if (newPassword || confirmPassword) {
      // Check if both fields are filled
      if (!newPassword || !confirmPassword) {
        showNotification("Please fill both password fields", "error");
        return;
      }

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        showNotification("Passwords do not match", "error");
        return;
      }

      // Check password length
      if (newPassword.length < 6) {
        showNotification(
          "Password must be at least 6 characters long",
          "error"
        );
        return;
      }

      // Check for common weak passwords
      const weakPasswords = [
        "password",
        "123456",
        "qwerty",
        "admin",
        "letmein",
      ];
      if (weakPasswords.includes(newPassword.toLowerCase())) {
        showNotification("Please choose a stronger password", "error");
        return;
      }

      staffData.newPassword = newPassword;
    }
  }

  try {
    if (saveStaffBtn) {
      saveStaffBtn.disabled = true;
      saveStaffBtn.textContent = "Saving...";
    }

    if (staffData.id) {
      await updateStaffMember(staffData);
    } else {
      await createStaffMember(staffData);
    }

    closeStaffModal();
    showNotification("Staff member saved successfully", "success");
    await loadStaffData(); // Reload data
  } catch (error) {
    console.error("Error saving staff member:", error);
    showNotification("Error saving staff member", "error");
  } finally {
    if (saveStaffBtn) {
      saveStaffBtn.disabled = false;
      saveStaffBtn.textContent = "Save Staff Member";
    }
  }
}

// Get permissions from form
function getPermissionsFromForm() {
  const permissions = {};
  const permissionSections = [
    "dashboard",
    "orders",
    "inventory",
    "customers",
    "employees",
    "finance",
    "analytics",
    "reports",
    "insights",
    "settings",
  ];

  permissionSections.forEach((section) => {
    const checkboxes = document.querySelectorAll(
      `input[name="${section}"]:checked`
    );
    if (checkboxes.length > 0) {
      permissions[section] = Array.from(checkboxes).map((cb) => cb.value);
    }
  });

  return permissions;
}

// Create staff member
async function createStaffMember(staffData) {
  const staffDoc = {
    name: `${staffData.firstName} ${staffData.lastName}`.trim(),
    email: staffData.email,
    contact: staffData.contact,
    phone: staffData.contact,
    role: staffData.role,
    status: staffData.status,
    permissions: {
      home: ["view"], // Ensure all users have home access
      ...staffData.permissions,
    },
    createdAt: new Date().toISOString(),
    lastLogin: null,
    approved: staffData.status === "active",
  };

  await addDoc(collection(db, "staff"), staffDoc);
}

// Update staff member
async function updateStaffMember(staffData) {
  const staffRef = doc(db, "staff", staffData.id);
  const updateData = {
    name: `${staffData.firstName} ${staffData.lastName}`.trim(),
    email: staffData.email,
    contact: staffData.contact,
    phone: staffData.contact,
    role: staffData.role,
    status: staffData.status,
    permissions: {
      home: ["view"], // Ensure all users have home access
      ...staffData.permissions,
    },
    approved: staffData.status === "active",
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(staffRef, updateData);

  // Handle password change if provided
  if (staffData.newPassword) {
    try {
      await handlePasswordChange(staffData.email, staffData.newPassword);
      showNotification("Password updated successfully", "success");
    } catch (error) {
      console.error("Error updating password:", error);
      showNotification(
        "Staff updated but password change failed: " + error.message,
        "warning"
      );
    }
  }
}

// Handle password change for staff members
async function handlePasswordChange(email, newPassword) {
  try {
    // First, try to create the user in Firebase Auth if they don't exist
    try {
      await createUserWithEmailAndPassword(auth, email, newPassword);
      console.log("Created new Firebase Auth user for:", email);

      // Store the temporary password in Firestore for reference
      const staffQuery = query(
        collection(db, "staff"),
        where("email", "==", email)
      );
      const staffSnapshot = await getDocs(staffQuery);

      if (!staffSnapshot.empty) {
        const staffDoc = staffSnapshot.docs[0];
        await updateDoc(doc(db, "staff", staffDoc.id), {
          tempPassword: newPassword,
          passwordUpdatedAt: new Date().toISOString(),
          needsPasswordReset: false,
        });
      }
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        // User already exists, send password reset email
        console.log(
          "User already exists in Firebase Auth, sending reset email"
        );
        await sendPasswordResetEmail(auth, email);

        // Update Firestore to indicate password reset was sent
        const staffQuery = query(
          collection(db, "staff"),
          where("email", "==", email)
        );
        const staffSnapshot = await getDocs(staffQuery);

        if (!staffSnapshot.empty) {
          const staffDoc = staffSnapshot.docs[0];
          await updateDoc(doc(db, "staff", staffDoc.id), {
            passwordResetSentAt: new Date().toISOString(),
            needsPasswordReset: true,
          });
        }

        return;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error in handlePasswordChange:", error);
    throw error;
  }
}

// Generate random password
function generateRandomPassword() {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password;
}

// Send password reset email (for better security)
async function sendPasswordResetToStaff(email) {
  try {
    await sendPasswordResetEmail(auth, email);

    // Update Firestore to track the reset email
    const staffQuery = query(
      collection(db, "staff"),
      where("email", "==", email)
    );
    const staffSnapshot = await getDocs(staffQuery);

    if (!staffSnapshot.empty) {
      const staffDoc = staffSnapshot.docs[0];
      await updateDoc(doc(db, "staff", staffDoc.id), {
        passwordResetSentAt: new Date().toISOString(),
        needsPasswordReset: true,
      });
    }

    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

// Handle select all
function handleSelectAll(e) {
  const checkboxes = document.querySelectorAll(".staff-checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = e.target.checked;
    if (e.target.checked) {
      selectedStaffIds.add(checkbox.dataset.staffId);
    } else {
      selectedStaffIds.delete(checkbox.dataset.staffId);
    }
  });
  updateSelectedCount();
}

// Update selected count
function updateSelectedCount() {
  if (selectedCount) selectedCount.textContent = selectedStaffIds.size;
}

// Open bulk actions modal
function openBulkActionsModal() {
  if (selectedStaffIds.size === 0) {
    showNotification("Please select staff members first", "warning");
    return;
  }
  if (bulkActionsModal) bulkActionsModal.classList.remove("hidden");
}

// Close bulk actions modal
function closeBulkActionsModal() {
  if (bulkActionsModal) bulkActionsModal.classList.add("hidden");
  if (bulkAction) bulkAction.value = "";
  if (bulkActionDetails) bulkActionDetails.classList.add("hidden");
}

// Handle bulk action change
function handleBulkActionChange() {
  const action = bulkAction?.value;
  if (action && bulkActionDetails) {
    bulkActionDetails.classList.remove("hidden");
  } else if (bulkActionDetails) {
    bulkActionDetails.classList.add("hidden");
  }
}

// Handle bulk action
async function handleBulkAction() {
  const action = bulkAction?.value;
  if (!action) return;

  try {
    if (applyBulkBtn) {
      applyBulkBtn.disabled = true;
      applyBulkBtn.textContent = "Applying...";
    }

    switch (action) {
      case "approve":
        await bulkUpdateStatus("active");
        break;
      case "suspend":
        await bulkUpdateStatus("suspended");
        break;
      case "delete":
        await bulkDelete();
        break;
      case "export":
        await bulkExport();
        break;
    }

    closeBulkActionsModal();
    selectedStaffIds.clear();
    updateSelectedCount();
    showNotification(`Bulk action completed successfully`, "success");
    await loadStaffData(); // Reload data
  } catch (error) {
    console.error("Error applying bulk action:", error);
    showNotification("Error applying bulk action", "error");
  } finally {
    if (applyBulkBtn) {
      applyBulkBtn.disabled = false;
      applyBulkBtn.textContent = "Apply Action";
    }
  }
}

// Bulk update status
async function bulkUpdateStatus(status) {
  const batch = writeBatch(db);

  for (const staffId of selectedStaffIds) {
    const staffRef = doc(db, "staff", staffId);
    batch.update(staffRef, {
      status: status,
      approved: status === "active",
      updatedAt: new Date().toISOString(),
    });
  }

  await batch.commit();
}

// Bulk delete
async function bulkDelete() {
  if (
    !confirm(
      `Are you sure you want to delete ${selectedStaffIds.size} staff members?`
    )
  ) {
    return;
  }

  const batch = writeBatch(db);

  for (const staffId of selectedStaffIds) {
    const staffRef = doc(db, "staff", staffId);
    batch.delete(staffRef);
  }

  await batch.commit();
}

// Bulk export
async function bulkExport() {
  const selectedStaff = staffData.filter((staff) =>
    selectedStaffIds.has(staff.id)
  );
  exportToCSV(selectedStaff, "selected-staff-export");
}

// Export staff data
function exportStaffData() {
  exportToCSV(filteredStaffData, "staff-export");
}

// Export to CSV
function exportToCSV(data, filename) {
  const headers = [
    "Name",
    "Email",
    "Contact",
    "Role",
    "Status",
    "Last Login",
    "Created At",
  ];
  const csvContent = [
    headers.join(","),
    ...data.map((staff) =>
      [
        staff.name || "",
        staff.email || "",
        staff.contact || staff.phone || "",
        staff.role || "",
        staff.status || "",
        staff.lastLogin
          ? new Date(staff.lastLogin).toLocaleDateString()
          : "Never",
        staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : "",
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Show notification
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
    type === "error"
      ? "bg-red-100 text-red-700"
      : type === "success"
      ? "bg-green-100 text-green-700"
      : type === "warning"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-blue-100 text-blue-700"
  }`;

  notification.innerHTML = `
        <div class="flex items-center">
            <span class="material-icons mr-2">${
              type === "error"
                ? "error"
                : type === "success"
                ? "check_circle"
                : type === "warning"
                ? "warning"
                : "info"
            }</span>
            <span>${message}</span>
        </div>
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Handle logout
async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = "/login";
  } catch (error) {
    console.error("Error signing out:", error);
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Global functions for inline event handlers
window.editStaff = editStaff;
window.viewStaff = viewStaff;
window.deleteStaff = deleteStaff;

// Edit staff function
async function editStaff(staffId) {
  openStaffModal(staffId);
}

// View staff function
function viewStaff(staffId) {
  const staff = staffData.find((s) => s.id === staffId);
  if (staff) {
    alert(
      `Staff Details:\nName: ${staff.name}\nEmail: ${staff.email}\nRole: ${staff.role}\nStatus: ${staff.status}`
    );
  }
}

// Delete staff function
async function deleteStaff(staffId) {
  if (!confirm("Are you sure you want to delete this staff member?")) {
    return;
  }

  try {
    await deleteDoc(doc(db, "staff", staffId));
    showNotification("Staff member deleted successfully", "success");
    await loadStaffData(); // Reload data
  } catch (error) {
    console.error("Error deleting staff member:", error);
    showNotification("Error deleting staff member", "error");
  }
}

// Initialize the application
console.log("Admin enhanced script loaded");
initializeAdminApp();
