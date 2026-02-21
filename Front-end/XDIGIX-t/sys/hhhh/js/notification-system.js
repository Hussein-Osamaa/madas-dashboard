// Notification System for MADAS Dashboard
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:70470e2204065b4590583d3",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

class NotificationSystem {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.isInitialized = false;
  }

  // Initialize the notification system
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Set up real-time listener for notifications
      this.setupNotificationListener();

      // Load initial notifications
      await this.loadNotifications();

      this.isInitialized = true;
      console.log("Notification system initialized");
    } catch (error) {
      console.error("Error initializing notification system:", error);
    }
  }

  // Set up real-time listener for notifications
  setupNotificationListener() {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    onSnapshot(q, (snapshot) => {
      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });

      this.notifications = notifications;
      this.unreadCount = notifications.filter((n) => !n.read).length;
      this.updateNotificationCount();
      this.updateNotificationList();
    });
  }

  // Load notifications from Firestore
  async loadNotifications() {
    try {
      const user = auth.currentUser;
      if (!user) {
        // If no user, load sample notifications
        this.loadSampleNotifications();
        return;
      }

      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const notifications = [];

      snapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });

      this.notifications = notifications;
      this.unreadCount = notifications.filter((n) => !n.read).length;
      this.updateNotificationCount();
      this.updateNotificationList();
    } catch (error) {
      console.error("Error loading notifications:", error);
      // Fallback to sample notifications
      this.loadSampleNotifications();
    }
  }

  // Load sample notifications for demo purposes
  loadSampleNotifications() {
    this.notifications = [
      {
        id: 1,
        title: "Low Stock Alert",
        message:
          "Product 'Nike Air Max' is running low on stock (5 items remaining)",
        type: "warning",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        read: false,
        icon: "warning",
      },
      {
        id: 2,
        title: "New Order Received",
        message: "Order #ORD-2024-001 has been placed by customer John Doe",
        type: "info",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        read: false,
        icon: "receipt_long",
      },
      {
        id: 3,
        title: "Product Added",
        message: "New product 'Adidas Ultraboost' has been added to inventory",
        type: "success",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true,
        icon: "add_circle",
      },
      {
        id: 4,
        title: "System Update",
        message: "System maintenance completed successfully",
        type: "info",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        read: true,
        icon: "system_update",
      },
    ];

    this.unreadCount = this.notifications.filter((n) => !n.read).length;
    this.updateNotificationCount();
    this.updateNotificationList();
  }

  // Update notification count badge
  updateNotificationCount() {
    const notificationCount = document.getElementById("notificationCount");
    // Only count 'real' notifications
    const realUnread = this.notifications.filter((n) => {
      const t = (n.title || "").toLowerCase();
      const m = (n.message || "").toLowerCase();
      return (
        (n.type === "warning" || t.includes("stock") || m.includes("stock")) &&
        !n.read
      );
    }).length;
    if (notificationCount) {
      if (realUnread > 0) {
        notificationCount.textContent = realUnread > 99 ? "99+" : realUnread;
        notificationCount.style.display = "flex";
      } else {
        notificationCount.style.display = "none";
      }
    }
  }

  // Update notification list in dropdown
  updateNotificationList() {
    const notificationList = document.getElementById("notificationList");
    if (!notificationList) return;

    // Only show 'real' notifications
    const realNotifications = this.notifications.filter((n) => {
      const t = (n.title || "").toLowerCase();
      const m = (n.message || "").toLowerCase();
      return n.type === "warning" || t.includes("stock") || m.includes("stock");
    });

    if (!realNotifications || realNotifications.length === 0) {
      notificationList.innerHTML = `
        <div class="p-4 text-center text-gray-500">
          <span class="material-icons text-4xl text-gray-300 mb-2">notifications_none</span>
          <p>No notifications</p>
        </div>
      `;
      return;
    }

    const notificationsHtml = realNotifications
      .map(
        (notification) => `
      <div class="notification-item ${
        notification.read ? "" : "unread"
      }" data-id="${notification.id}">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <span class="material-icons text-lg ${this.getNotificationIconColor(
              notification.type
            )}">
              ${notification.icon}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900">${
              notification.title
            }</p>
            <p class="text-sm text-gray-600 mt-1">${notification.message}</p>
            <p class="text-xs text-gray-400 mt-2">${this.formatTimestamp(
              notification.timestamp
            )}</p>
          </div>
          ${
            !notification.read
              ? '<div class="w-2 h-2 bg-blue-500 rounded-full"></div>'
              : ""
          }
          <button class="delete-notification-btn ml-4 text-red-500 hover:text-red-700" title="Delete">
            <span class="material-icons">delete</span>
          </button>
        </div>
      </div>
    `
      )
      .join("");

    notificationList.innerHTML = notificationsHtml;

    // Add click handlers for notification items (mark as read)
    notificationList.querySelectorAll(".notification-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".delete-notification-btn")) return;
        const notificationId = item.dataset.id;
        this.markNotificationAsRead(notificationId);
        item.classList.remove("unread");
        item.querySelector(".w-2.h-2")?.remove();
      });
    });
    // Add delete button logic
    notificationList
      .querySelectorAll(".delete-notification-btn")
      .forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const item = btn.closest(".notification-item");
          const id = item.getAttribute("data-id");
          try {
            const { getFirestore, doc, deleteDoc } = await import(
              "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
            );
            const db = getFirestore();
            await deleteDoc(doc(db, "notifications", id));
            item.remove();
          } catch (err) {
            alert("Failed to delete notification: " + err.message);
          }
        });
      });
  }

  // Get notification icon color based on type
  getNotificationIconColor(type) {
    switch (type) {
      case "warning":
        return "text-orange-500";
      case "error":
        return "text-red-500";
      case "success":
        return "text-green-500";
      case "info":
      default:
        return "text-blue-500";
    }
  }

  // Format timestamp for display
  formatTimestamp(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }
  }

  // Mark a single notification as read
  async markNotificationAsRead(notificationId) {
    try {
      const user = auth.currentUser;
      if (user) {
        // Update in Firestore
        await updateDoc(doc(db, "notifications", notificationId), {
          read: true,
          readAt: new Date(),
        });
      } else {
        // Update local state for demo
        const notification = this.notifications.find(
          (n) => n.id == notificationId
        );
        if (notification) {
          notification.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.updateNotificationCount();
        }
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead() {
    try {
      const user = auth.currentUser;
      if (user) {
        // Update all unread notifications in Firestore
        const unreadNotifications = this.notifications.filter((n) => !n.read);
        const updatePromises = unreadNotifications.map((notification) =>
          updateDoc(doc(db, "notifications", notification.id), {
            read: true,
            readAt: new Date(),
          })
        );
        await Promise.all(updatePromises);
      } else {
        // Update local state for demo
        this.notifications.forEach((notification) => {
          notification.read = true;
        });
        this.unreadCount = 0;
        this.updateNotificationCount();
        this.updateNotificationList();
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }

  // Create a new notification
  async createNotification(notificationData) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const notification = {
        userId: user.uid,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || "info",
        icon: notificationData.icon || "info",
        timestamp: new Date(),
        read: false,
        ...notificationData,
      };

      await addDoc(collection(db, "notifications"), notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }

  // Setup notification dropdown functionality
  setupDropdown() {
    const notificationBell = document.getElementById("notificationBell");
    const notificationDropdown = document.getElementById(
      "notificationDropdown"
    );
    const markAllReadBtn = document.getElementById("markAllReadBtn");

    if (notificationBell && notificationDropdown) {
      notificationBell.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = notificationDropdown.classList.contains("show");

        if (isOpen) {
          notificationDropdown.classList.remove("show");
        } else {
          notificationDropdown.classList.add("show");
          this.loadNotifications();
        }
      });

      // Close notification dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !notificationBell.contains(e.target) &&
          !notificationDropdown.contains(e.target)
        ) {
          notificationDropdown.classList.remove("show");
        }
      });

      // Mark all as read functionality
      if (markAllReadBtn) {
        markAllReadBtn.addEventListener("click", () => {
          this.markAllNotificationsAsRead();
        });
      }
    }
  }

  // Display error message in notification list
  displayError(message) {
    const notificationList = document.getElementById("notificationList");
    if (notificationList) {
      notificationList.innerHTML = `
        <div class="p-4 text-center text-red-500">
          <span class="material-icons text-4xl text-red-300 mb-2">error</span>
          <p>${message}</p>
        </div>
      `;
    }
  }
}

// Create global notification system instance
const notificationSystem = new NotificationSystem();

// Export functions for use in other modules
export async function initializeNotificationSystem() {
  await notificationSystem.initialize();
  notificationSystem.setupDropdown();
}

export async function createNotification(notificationData) {
  await notificationSystem.createNotification(notificationData);
}

export function getNotificationSystem() {
  return notificationSystem;
}
