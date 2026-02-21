// Comprehensive authentication and permission check system
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
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
const db = getFirestore(app);
const auth = getAuth(app);

class AuthChecker {
  constructor(requiredPermissions = {}) {
    this.requiredPermissions = requiredPermissions;
    this.userData = null;
    this.isInitialized = false;
  }

  // Initialize the auth checker
  async init() {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        try {
          await this.handleAuthStateChange(user);
          this.isInitialized = true;
          resolve(this.userData);
        } catch (error) {
          console.error("Auth initialization failed:", error);
          reject(error);
        }
      });
    });
  }

  // Handle authentication state changes
  async handleAuthStateChange(user) {
    console.log("Auth state changed. User:", user);

    if (!user) {
      console.warn("No user detected. Redirecting to login.");
      this.redirectToLogin();
      return;
    }

    try {
      await user.getIdToken(true);

      if (!user.email) {
        console.error("User email missing. Redirecting to login.");
        this.redirectToLogin();
        return;
      }

      // Check if user is admin and auto-approve
      const adminEmails = [
        "hesainosama@gmail.com",
        // Add more admin emails here
        // "admin2@example.com",
        // "admin3@example.com"
      ];

      if (adminEmails.includes(user.email)) {
        await this.autoApproveAdmin(user);
        return;
      }

      // Get user data from Firestore
      await this.fetchUserData(user.email);

      // Check if user is approved
      if (!this.userData.approved) {
        console.warn("User not approved. Redirecting to no-access.");
        this.redirectToNoAccess();
        return;
      }

      // Check required permissions
      if (!this.checkRequiredPermissions()) {
        console.warn(
          "User lacks required permissions. Redirecting to no-access."
        );
        this.redirectToNoAccess();
        return;
      }

      // Store user data and update UI
      this.storeUserData();
      this.updateUI();

      // Call success callback
      if (this.onSuccess) {
        this.onSuccess(this.userData);
      }
    } catch (error) {
      console.error("Permission validation failed:", error);
      this.redirectToLogin();
    }
  }

  // Auto-approve admin user
  async autoApproveAdmin(user) {
    const q = query(collection(db, "staff"), where("email", "==", user.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const staffRef = querySnapshot.docs[0].ref;
      await updateDoc(staffRef, {
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
      location.reload();
    }
  }

  // Fetch user data from Firestore
  async fetchUserData(email) {
    const q = query(collection(db, "staff"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("No staff data found");
    }

    this.userData = querySnapshot.docs[0].data();
  }

  // Check if user has required permissions
  checkRequiredPermissions() {
    if (!this.userData.permissions) {
      return false;
    }

    for (const [section, actions] of Object.entries(this.requiredPermissions)) {
      if (!this.userData.permissions[section]) {
        return false;
      }

      for (const action of actions) {
        if (!this.userData.permissions[section].includes(action)) {
          return false;
        }
      }
    }

    return true;
  }

  // Store user data in localStorage
  storeUserData() {
    localStorage.setItem("madasUser", JSON.stringify(this.userData));
  }

  // Update UI with user information
  updateUI() {
    const userNameSpan = document.getElementById("userName");
    if (userNameSpan) {
      userNameSpan.textContent = this.getUserDisplayName();
    }
  }

  // Get user display name
  getUserDisplayName() {
    if (!this.userData) return "Unknown";
    return (
      this.userData.name ||
      (this.userData.firstName && this.userData.lastName
        ? `${this.userData.firstName} ${this.userData.lastName}`
        : this.userData.email) ||
      "Admin"
    );
  }

  // Redirect to login page
  redirectToLogin() {
    window.location.href = "/login";
  }

  // Redirect to no-access page
  redirectToNoAccess() {
    const currentPath = window.location.pathname;
    const isInPagesFolder = currentPath.includes("/pages/");
    const noAccessPath = isInPagesFolder
      ? "../no-access.html"
      : "no-access.html";
    window.location.href = noAccessPath;
  }

  // Set success callback
  setSuccessCallback(callback) {
    this.onSuccess = callback;
  }

  // Get current user data
  getUserData() {
    return this.userData;
  }

  // Check if user has specific permission
  hasPermission(section, action) {
    if (
      !this.userData ||
      !this.userData.permissions ||
      !this.userData.permissions[section]
    ) {
      return false;
    }
    return this.userData.permissions[section].includes(action);
  }
}

// Export the AuthChecker class
window.AuthChecker = AuthChecker;
