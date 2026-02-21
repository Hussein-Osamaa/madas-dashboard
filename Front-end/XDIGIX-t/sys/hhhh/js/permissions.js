// Permission management utility
class PermissionManager {
  constructor() {
    this.currentUser = null;
    this.permissions = null;
  }

  // Initialize permission manager
  async init() {
    const userData = localStorage.getItem("madasUser");
    if (userData) {
      this.currentUser = JSON.parse(userData);
      this.permissions = this.currentUser.permissions || {};
    }
  }

  // Check if user has specific permission
  hasPermission(section, action) {
    if (!this.permissions || !this.permissions[section]) {
      return false;
    }
    return this.permissions[section].includes(action);
  }

  // Check if user has any permission for a section
  hasAnyPermission(section) {
    if (!this.permissions || !this.permissions[section]) {
      return false;
    }
    return this.permissions[section].length > 0;
  }

  // Check if user has view-only access (no edit/create/delete)
  hasViewOnlyAccess(section) {
    if (!this.permissions || !this.permissions[section]) {
      return false;
    }
    const sectionPermissions = this.permissions[section];
    return (
      sectionPermissions.includes("view") &&
      !sectionPermissions.includes("edit") &&
      !sectionPermissions.includes("create") &&
      !sectionPermissions.includes("delete")
    );
  }

  // Check if user is approved
  isApproved() {
    return this.currentUser && this.currentUser.approved === true;
  }

  // Get user display name
  getUserDisplayName() {
    if (!this.currentUser) return "Unknown";
    return (
      this.currentUser.name ||
      (this.currentUser.firstName && this.currentUser.lastName
        ? `${this.currentUser.firstName} ${this.currentUser.lastName}`
        : this.currentUser.email) ||
      "Admin"
    );
  }

  // Apply permission-based UI controls
  applyUI(controls) {
    if (!controls) return;

    Object.keys(controls).forEach((elementId) => {
      const element = document.getElementById(elementId);
      if (!element) return;

      const requiredPermissions = controls[elementId];
      let shouldShow = true;

      if (requiredPermissions.permission) {
        shouldShow = this.hasPermission(
          requiredPermissions.section,
          requiredPermissions.permission
        );
      } else if (requiredPermissions.any) {
        shouldShow = this.hasAnyPermission(requiredPermissions.section);
      }

      if (shouldShow) {
        element.style.display = requiredPermissions.display || "block";
      } else {
        element.style.display = "none";
      }
    });
  }

  // Apply view-only restrictions (disable edit/create/delete elements)
  applyViewOnlyRestrictions(section) {
    if (!this.hasViewOnlyAccess(section)) return;

    // Common edit/create/delete button selectors
    const editSelectors = [
      '[id*="edit"]',
      '[id*="add"]',
      '[id*="create"]',
      '[id*="delete"]',
      '[id*="save"]',
      '[id*="update"]',
      '[id*="remove"]',
      ".edit-btn",
      ".add-btn",
      ".create-btn",
      ".delete-btn",
      ".save-btn",
      ".update-btn",
      ".remove-btn",
    ];

    editSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        // Disable the element
        if (element.tagName === "BUTTON" || element.tagName === "INPUT") {
          element.disabled = true;
          element.style.opacity = "0.5";
          element.style.cursor = "not-allowed";
        } else {
          element.style.pointerEvents = "none";
          element.style.opacity = "0.5";
        }

        // Add visual indicator
        element.title = "View-only access - No editing allowed";
      });
    });

    // Disable form inputs for view-only users
    const formInputs = document.querySelectorAll(
      'input[type="text"], input[type="number"], input[type="email"], textarea, select'
    );
    formInputs.forEach((input) => {
      if (!input.readOnly && !input.disabled) {
        input.readOnly = true;
        input.style.backgroundColor = "#f3f4f6";
        input.style.cursor = "not-allowed";
        input.title = "View-only access - No editing allowed";
      }
    });
  }

  // Redirect if no permission
  redirectIfNoPermission(section, action, redirectUrl = "../no-access.html") {
    if (!this.hasPermission(section, action)) {
      window.location.href = redirectUrl;
      return true; // redirected
    }
    return false; // not redirected
  }

  // Check if user is admin (special case)
  isAdmin() {
    const adminEmails = [
      "hesainosama@gmail.com",
      // Add more admin emails here
      // "admin2@example.com",
      // "admin3@example.com"
    ];

    return this.currentUser && adminEmails.includes(this.currentUser.email);
  }

  // Get all permissions for a section
  getSectionPermissions(section) {
    if (!this.permissions || !this.permissions[section]) {
      return [];
    }
    return this.permissions[section];
  }

  // Check if user can perform action (with admin override)
  canPerformAction(section, action) {
    return this.isAdmin() || this.hasPermission(section, action);
  }
}

// Global permission manager instance
window.permissionManager = new PermissionManager();

// Common permission checks
window.PERMISSIONS = {
  HOME: {
    VIEW: { section: "home", permission: "view" },
  },
  ORDERS: {
    VIEW: { section: "orders", permission: "view" },
    SEARCH: { section: "orders", permission: "search" },
    CREATE: { section: "orders", permission: "create" },
    EDIT: { section: "orders", permission: "edit" },
    DELETE: { section: "orders", permission: "delete" },
  },
  INVENTORY: {
    VIEW: { section: "inventory", permission: "view" },
    CREATE: { section: "inventory", permission: "create" },
    EDIT: { section: "inventory", permission: "edit" },
    DELETE: { section: "inventory", permission: "delete" },
    EXPORT: { section: "inventory", permission: "export" },
  },
  CUSTOMERS: {
    VIEW: { section: "customers", permission: "view" },
    CREATE: { section: "customers", permission: "create" },
    EDIT: { section: "customers", permission: "edit" },
    DELETE: { section: "customers", permission: "delete" },
  },
  EMPLOYEES: {
    VIEW: { section: "employees", permission: "view" },
    CREATE: { section: "employees", permission: "create" },
    EDIT: { section: "employees", permission: "edit" },
    DELETE: { section: "employees", permission: "delete" },
  },
  FINANCE: {
    VIEW: { section: "finance", permission: "view" },
    REPORTS: { section: "finance", permission: "reports" },
    EXPORT: { section: "finance", permission: "export" },
  },
  ANALYTICS: {
    VIEW: { section: "analytics", permission: "view" },
    EXPORT: { section: "analytics", permission: "export" },
    CUSTOM: { section: "analytics", permission: "custom" },
  },
  REPORTS: {
    VIEW: { section: "reports", permission: "view" },
    GENERATE: { section: "reports", permission: "generate" },
    EXPORT: { section: "reports", permission: "export" },
    SCHEDULE: { section: "reports", permission: "schedule" },
  },
  INSIGHTS: {
    VIEW: { section: "insights", permission: "view" },
    EXPORT: { section: "insights", permission: "export" },
    CUSTOM: { section: "insights", permission: "custom" },
  },
  SETTINGS: {
    VIEW: { section: "settings", permission: "view" },
    EDIT: { section: "settings", permission: "edit" },
  },
};
