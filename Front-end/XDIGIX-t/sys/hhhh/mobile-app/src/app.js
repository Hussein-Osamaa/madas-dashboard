// MADAS Mobile Dashboard - Main Application
import { initializeFirebase } from './services/firebase-mobile.js';
import { AuthService } from './services/auth-mobile.js';
import { ApiService } from './services/api-mobile.js';
import { NavigationManager } from './components/navigation.js';
import { ModalManager } from './components/modals.js';
import { DashboardPage } from './pages/dashboard.js';
import { OrdersPage } from './pages/orders.js';
import { ProductsPage } from './pages/products.js';
import { CustomersPage } from './pages/customers.js';
import { FinancePage } from './pages/finance.js';
import { AnalyticsPage } from './pages/analytics.js';
import { StaffPage } from './pages/staff.js';
import { SettingsPage } from './pages/settings.js';
import { POSPage } from './pages/pos.js';

class MobileApp {
    constructor() {
        this.currentUser = null;
        this.currentBusiness = null;
        this.currentPage = 'dashboard';
        this.isInitialized = false;
        
        // Services
        this.authService = null;
        this.apiService = null;
        this.navigationManager = null;
        this.modalManager = null;
        
        // Pages
        this.pages = {
            dashboard: null,
            orders: null,
            products: null,
            customers: null,
            finance: null,
            analytics: null,
            staff: null,
            settings: null
        };
        
        // DOM Elements
        this.elements = {};
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Initializing MADAS Mobile App...');
            
            // Initialize Firebase
            await this.initializeFirebase();
            
            // Initialize services
            await this.initializeServices();
            
            // Initialize DOM elements
            this.initializeElements();
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Initialize pages
            await this.initializePages();
            
            // Initialize navigation
            this.initializeNavigation();
            
            // Initialize modals
            this.initializeModals();
            
            // Check authentication
            await this.checkAuthentication();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ MADAS Mobile App initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize mobile app:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }
    
    async initializeFirebase() {
        try {
            console.log('🔥 Initializing Firebase...');
            await initializeFirebase();
            console.log('✅ Firebase initialized');
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            throw error;
        }
    }
    
    async initializeServices() {
        try {
            console.log('⚙️ Initializing services...');
            
            // Initialize services and wait for them to be ready
            this.authService = new AuthService();
            await this.authService.initialize();
            
            this.apiService = new ApiService();
            await this.apiService.initialize();
            
            console.log('✅ Services initialized');
        } catch (error) {
            console.error('❌ Services initialization failed:', error);
            throw error;
        }
    }
    
    initializeElements() {
        console.log('🎯 Initializing DOM elements...');
        
        this.elements = {
            // Loading screen
            loadingScreen: document.getElementById('loading-screen'),
            app: document.getElementById('app'),
            
            // Header
            menuToggle: document.getElementById('menu-toggle'),
            pageTitle: document.getElementById('page-title'),
            notificationsBtn: document.getElementById('notifications-btn'),
            profileBtn: document.getElementById('profile-btn'),
            notificationBadge: document.getElementById('notification-badge'),
            
            // Navigation
            mobileNav: document.getElementById('mobile-nav'),
            closeNav: document.getElementById('close-nav'),
            navItems: document.querySelectorAll('.nav-item'),
            bottomNavItems: document.querySelectorAll('.bottom-nav-item'),
            
            // Business info
            businessName: document.getElementById('business-name'),
            businessPlan: document.getElementById('business-plan'),
            
            // User info
            userName: document.getElementById('user-name'),
            userRole: document.getElementById('user-role'),
            userInitial: document.getElementById('user-initial'),
            
            // Pages
            pages: document.querySelectorAll('.page'),
            
            // Logout
            logoutBtn: document.getElementById('logout-btn'),
            
            // Modals
            modalOverlay: document.getElementById('modal-overlay'),
            profileModal: document.getElementById('profile-modal'),
            notificationsModal: document.getElementById('notifications-modal'),
            closeProfile: document.getElementById('close-profile'),
            closeNotifications: document.getElementById('close-notifications'),
            logoutProfileBtn: document.getElementById('logout-profile-btn'),
            
            // Notifications
            notificationsList: document.getElementById('notifications-list')
        };
        
        console.log('✅ DOM elements initialized');
    }
    
    initializeEventListeners() {
        console.log('🎧 Initializing event listeners...');
        
        // Menu toggle
        this.elements.menuToggle?.addEventListener('click', () => {
            this.toggleNavigation();
        });
        
        // Close navigation
        this.elements.closeNav?.addEventListener('click', () => {
            this.closeNavigation();
        });
        
        // Navigation items
        this.elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                    this.closeNavigation();
                }
            });
        });
        
        // Bottom navigation
        this.elements.bottomNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page && page !== 'more') {
                    this.navigateToPage(page);
                } else if (page === 'more') {
                    this.toggleNavigation();
                }
            });
        });
        
        // Header buttons
        this.elements.profileBtn?.addEventListener('click', () => {
            this.showProfileModal();
        });
        
        this.elements.notificationsBtn?.addEventListener('click', () => {
            this.showNotificationsModal();
        });
        
        // Logout buttons
        this.elements.logoutBtn?.addEventListener('click', () => {
            this.logout();
        });
        
        this.elements.logoutProfileBtn?.addEventListener('click', () => {
            this.logout();
        });
        
        // Modal close buttons
        this.elements.closeProfile?.addEventListener('click', () => {
            this.hideProfileModal();
        });
        
        this.elements.closeNotifications?.addEventListener('click', () => {
            this.hideNotificationsModal();
        });
        
        // Modal overlay
        this.elements.modalOverlay?.addEventListener('click', (e) => {
            if (e.target === this.elements.modalOverlay) {
                this.hideAllModals();
            }
        });
        
        // Touch gestures
        this.initializeTouchGestures();
        
        console.log('✅ Event listeners initialized');
    }
    
    initializeTouchGestures() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // Swipe right to open navigation
            if (deltaX > 100 && Math.abs(deltaY) < 100) {
                this.openNavigation();
            }
            
            // Swipe left to close navigation
            if (deltaX < -100 && Math.abs(deltaY) < 100) {
                this.closeNavigation();
            }
        });
    }
    
    async initializePages() {
        console.log('📄 Initializing pages...');
        
        try {
            this.pages.dashboard = new DashboardPage(this);
            this.pages.orders = new OrdersPage(this);
            this.pages.products = new ProductsPage(this);
            this.pages.customers = new CustomersPage(this);
            this.pages.finance = new FinancePage(this);
            this.pages.analytics = new AnalyticsPage(this);
            this.pages.staff = new StaffPage(this);
            this.pages.settings = new SettingsPage(this);
            this.pages.pos = new POSPage(this);
            
            console.log('✅ Pages initialized');
        } catch (error) {
            console.error('❌ Pages initialization failed:', error);
            throw error;
        }
    }
    
    initializeNavigation() {
        console.log('🧭 Initializing navigation...');
        
        this.navigationManager = new NavigationManager(this);
        console.log('✅ Navigation initialized');
    }
    
    initializeModals() {
        console.log('🪟 Initializing modals...');
        
        this.modalManager = new ModalManager(this);
        console.log('✅ Modals initialized');
    }
    
    async checkAuthentication() {
        try {
            console.log('🔐 Checking authentication...');
            
            const user = await this.authService.getCurrentUser();
            if (user) {
                this.currentUser = user;
                await this.loadBusinessData();
                this.updateUI();
            } else {
                this.redirectToLogin();
            }
            
            console.log('✅ Authentication checked');
        } catch (error) {
            console.error('❌ Authentication check failed:', error);
            this.redirectToLogin();
        }
    }
    
    async loadBusinessData() {
        try {
            if (!this.currentUser) return;
            
            console.log('🏢 Loading business data...');
            
            // Load business information
            const businessData = await this.apiService.getBusinessData(this.currentUser.uid);
            this.currentBusiness = businessData;
            
            console.log('✅ Business data loaded:', businessData);
        } catch (error) {
            console.error('❌ Failed to load business data:', error);
            this.showError('Failed to load business information.');
        }
    }
    
    updateUI() {
        try {
            console.log('🎨 Updating UI...');
            
            // Update business info
            if (this.currentBusiness) {
                this.elements.businessName.textContent = this.currentBusiness.businessName || 'Loading...';
                this.elements.businessPlan.textContent = `${this.currentBusiness.plan?.type || 'Basic'} Plan`;
            }
            
            // Update user info
            if (this.currentUser) {
                const displayName = this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User';
                this.elements.userName.textContent = displayName;
                this.elements.userRole.textContent = this.currentUser.role || 'Owner';
                this.elements.userInitial.textContent = displayName.charAt(0).toUpperCase();
                
                // Update profile modal
                const profileName = document.getElementById('profile-name');
                const profileEmail = document.getElementById('profile-email');
                const profileRole = document.getElementById('profile-role');
                const profileInitial = document.getElementById('profile-initial');
                
                if (profileName) profileName.textContent = displayName;
                if (profileEmail) profileEmail.textContent = this.currentUser.email || '';
                if (profileRole) profileRole.textContent = this.currentUser.role || 'Owner';
                if (profileInitial) profileInitial.textContent = displayName.charAt(0).toUpperCase();
            }
            
            // Update page title
            this.updatePageTitle();
            
            console.log('✅ UI updated');
        } catch (error) {
            console.error('❌ Failed to update UI:', error);
        }
    }
    
    updatePageTitle() {
        const pageTitles = {
            dashboard: 'Dashboard',
            orders: 'Orders',
            products: 'Products',
            customers: 'Customers',
            finance: 'Finance',
            analytics: 'Analytics',
            staff: 'Staff',
            settings: 'Settings'
        };
        
        this.elements.pageTitle.textContent = pageTitles[this.currentPage] || 'Dashboard';
    }
    
    navigateToPage(pageName) {
        try {
            console.log(`🧭 Navigating to page: ${pageName}`);
            
            // Hide current page
            this.elements.pages.forEach(page => {
                page.classList.remove('active');
                page.classList.add('hidden');
            });
            
            // Show target page
            const targetPage = document.getElementById(`${pageName}-page`);
            if (targetPage) {
                targetPage.classList.remove('hidden');
                targetPage.classList.add('active');
            }
            
            // Update navigation states
            this.elements.navItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.page === pageName) {
                    item.classList.add('active');
                }
            });
            
            this.elements.bottomNavItems.forEach(item => {
                item.classList.remove('active');
                if (item.dataset.page === pageName) {
                    item.classList.add('active');
                }
            });
            
            // Update current page
            this.currentPage = pageName;
            this.updatePageTitle();
            
            // Initialize page if needed
            if (this.pages[pageName] && typeof this.pages[pageName].onShow === 'function') {
                this.pages[pageName].onShow();
            }
            
            console.log(`✅ Navigated to ${pageName}`);
        } catch (error) {
            console.error(`❌ Failed to navigate to ${pageName}:`, error);
        }
    }
    
    toggleNavigation() {
        this.elements.mobileNav.classList.toggle('show');
    }
    
    openNavigation() {
        this.elements.mobileNav.classList.add('show');
    }
    
    closeNavigation() {
        this.elements.mobileNav.classList.remove('show');
    }
    
    showProfileModal() {
        this.elements.profileModal.classList.remove('hidden');
        this.elements.modalOverlay.classList.remove('hidden');
    }
    
    hideProfileModal() {
        this.elements.profileModal.classList.add('hidden');
        this.elements.modalOverlay.classList.add('hidden');
    }
    
    showNotificationsModal() {
        this.elements.notificationsModal.classList.remove('hidden');
        this.elements.modalOverlay.classList.remove('hidden');
        this.loadNotifications();
    }
    
    hideNotificationsModal() {
        this.elements.notificationsModal.classList.add('hidden');
        this.elements.modalOverlay.classList.add('hidden');
    }
    
    hideAllModals() {
        this.hideProfileModal();
        this.hideNotificationsModal();
    }
    
    async loadNotifications() {
        try {
            const notifications = await this.apiService.getNotifications();
            this.renderNotifications(notifications);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }
    
    renderNotifications(notifications) {
        if (!this.elements.notificationsList) return;
        
        if (notifications.length === 0) {
            this.elements.notificationsList.innerHTML = `
                <div class="text-center py-8">
                    <span class="material-icons text-4xl text-gray-400 mb-2">notifications_none</span>
                    <p class="text-gray-500">No notifications</p>
                </div>
            `;
            return;
        }
        
        this.elements.notificationsList.innerHTML = notifications.map(notification => `
            <div class="notification-item">
                <div class="notification-icon">
                    <span class="material-icons">${notification.icon || 'info'}</span>
                </div>
                <div class="notification-content">
                    <h4>${notification.title}</h4>
                    <p>${notification.message}</p>
                    <p class="text-xs text-gray-400 mt-1">${this.formatTime(notification.createdAt)}</p>
                </div>
            </div>
        `).join('');
    }
    
    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }
    
    async logout() {
        try {
            console.log('🚪 Logging out...');
            
            await this.authService.logout();
            this.redirectToLogin();
            
        } catch (error) {
            console.error('❌ Logout failed:', error);
            this.showError('Failed to logout. Please try again.');
        }
    }
    
    redirectToLogin() {
        window.location.href = '/login';
    }
    
    hideLoadingScreen() {
        this.elements.loadingScreen.classList.add('hidden');
        this.elements.app.classList.remove('hidden');
    }
    
    showError(message) {
        // Simple error display - can be enhanced with a proper toast system
        alert(message);
    }
    
    // Public API for pages to access
    getCurrentUser() {
        return this.currentUser;
    }
    
    getCurrentBusiness() {
        return this.currentBusiness;
    }
    
    getApiService() {
        return this.apiService;
    }
    
    getAuthService() {
        return this.authService;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mobileApp = new MobileApp();
});

// Handle page visibility changes for performance optimization
document.addEventListener('visibilitychange', () => {
    if (window.mobileApp && window.mobileApp.isInitialized) {
        if (document.hidden) {
            // Page is hidden - pause updates
            console.log('📱 App paused');
        } else {
            // Page is visible - resume updates
            console.log('📱 App resumed');
            if (window.mobileApp.currentPage && window.mobileApp.pages[window.mobileApp.currentPage]) {
                const currentPage = window.mobileApp.pages[window.mobileApp.currentPage];
                if (typeof currentPage.onResume === 'function') {
                    currentPage.onResume();
                }
            }
        }
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('🌐 App is online');
    if (window.mobileApp) {
        window.mobileApp.showNotification('Connection restored', 'success');
    }
});

window.addEventListener('offline', () => {
    console.log('📴 App is offline');
    if (window.mobileApp) {
        window.mobileApp.showNotification('You are offline', 'warning');
    }
});

// Export for use in other modules
export { MobileApp };
