// Navigation Manager for Mobile App
// Handles navigation state, transitions, and user interactions

export class NavigationManager {
    constructor(app) {
        this.app = app;
        this.currentPage = 'dashboard';
        this.pageHistory = ['dashboard'];
        this.maxHistoryLength = 10;
        
        this.initialize();
    }
    
    initialize() {
        console.log('🧭 Initializing Navigation Manager...');
        
        // Initialize navigation state
        this.updateNavigationState();
        
        // Setup navigation event listeners
        this.setupEventListeners();
        
        console.log('✅ Navigation Manager initialized');
    }
    
    setupEventListeners() {
        // Handle back button
        window.addEventListener('popstate', (e) => {
            this.handleBrowserBack();
        });
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // Handle resize events
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }
    
    // Navigation methods
    navigateToPage(pageName, options = {}) {
        try {
            console.log(`🧭 Navigating to: ${pageName}`);
            
            // Validate page exists
            if (!this.isValidPage(pageName)) {
                console.error(`❌ Invalid page: ${pageName}`);
                return false;
            }
            
            // Check permissions
            if (!this.canAccessPage(pageName)) {
                console.error(`❌ Access denied to page: ${pageName}`);
                this.showAccessDenied();
                return false;
            }
            
            // Store previous page
            const previousPage = this.currentPage;
            
            // Update current page
            this.currentPage = pageName;
            
            // Add to history (if not replacing)
            if (!options.replace) {
                this.addToHistory(pageName);
            }
            
            // Update URL
            this.updateURL(pageName, options);
            
            // Update UI
            this.updateNavigationState();
            
            // Load page content
            this.loadPageContent(pageName);
            
            // Notify page change
            this.notifyPageChange(pageName, previousPage);
            
            // Close navigation drawer
            if (options.closeDrawer !== false) {
                this.app.closeNavigation();
            }
            
            console.log(`✅ Navigated to ${pageName}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Navigation failed:`, error);
            return false;
        }
    }
    
    goBack() {
        if (this.pageHistory.length > 1) {
            // Remove current page from history
            this.pageHistory.pop();
            
            // Get previous page
            const previousPage = this.pageHistory[this.pageHistory.length - 1];
            
            // Navigate to previous page
            this.navigateToPage(previousPage, { replace: true });
            
            return true;
        }
        
        return false;
    }
    
    canGoBack() {
        return this.pageHistory.length > 1;
    }
    
    // Page management
    isValidPage(pageName) {
        const validPages = [
            'dashboard',
            'orders',
            'products',
            'customers',
            'finance',
            'analytics',
            'staff',
            'settings'
        ];
        
        return validPages.includes(pageName);
    }
    
    canAccessPage(pageName) {
        const user = this.app.getCurrentUser();
        if (!user || !user.permissions) {
            return false;
        }
        
        const pagePermissions = {
            dashboard: ['home'],
            orders: ['orders'],
            products: ['inventory'],
            customers: ['customers'],
            finance: ['finance'],
            analytics: ['analytics'],
            staff: ['employees'],
            settings: ['settings']
        };
        
        const requiredPermission = pagePermissions[pageName];
        if (!requiredPermission) {
            return true; // Page doesn't require specific permissions
        }
        
        const permission = user.permissions[requiredPermission[0]];
        return permission && permission.includes('view');
    }
    
    loadPageContent(pageName) {
        try {
            // Hide all pages
            this.app.elements.pages.forEach(page => {
                page.classList.remove('active');
                page.classList.add('hidden');
            });
            
            // Show target page
            const targetPage = document.getElementById(`${pageName}-page`);
            if (targetPage) {
                targetPage.classList.remove('hidden');
                targetPage.classList.add('active');
                
                // Trigger page show event
                const pageInstance = this.app.pages[pageName];
                if (pageInstance && typeof pageInstance.onShow === 'function') {
                    pageInstance.onShow();
                }
            }
            
        } catch (error) {
            console.error(`❌ Failed to load page content for ${pageName}:`, error);
        }
    }
    
    updateNavigationState() {
        try {
            // Update page title
            this.app.updatePageTitle();
            
            // Update navigation items
            this.updateNavigationItems();
            
            // Update bottom navigation
            this.updateBottomNavigation();
            
        } catch (error) {
            console.error('❌ Failed to update navigation state:', error);
        }
    }
    
    updateNavigationItems() {
        this.app.elements.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === this.currentPage) {
                item.classList.add('active');
            }
        });
    }
    
    updateBottomNavigation() {
        this.app.elements.bottomNavItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === this.currentPage) {
                item.classList.add('active');
            }
        });
    }
    
    updateURL(pageName, options = {}) {
        try {
            const url = new URL(window.location);
            url.pathname = `/${pageName}`;
            
            if (options.replace) {
                window.history.replaceState({ page: pageName }, '', url);
            } else {
                window.history.pushState({ page: pageName }, '', url);
            }
            
        } catch (error) {
            console.error('❌ Failed to update URL:', error);
        }
    }
    
    addToHistory(pageName) {
        // Remove if already exists
        const index = this.pageHistory.indexOf(pageName);
        if (index > -1) {
            this.pageHistory.splice(index, 1);
        }
        
        // Add to end
        this.pageHistory.push(pageName);
        
        // Limit history length
        if (this.pageHistory.length > this.maxHistoryLength) {
            this.pageHistory.shift();
        }
    }
    
    // Event handlers
    handleBrowserBack() {
        console.log('🔙 Browser back button pressed');
        
        if (this.canGoBack()) {
            this.goBack();
        } else {
            // If no history, redirect to dashboard
            this.navigateToPage('dashboard', { replace: true });
        }
    }
    
    handleOrientationChange() {
        console.log('📱 Orientation changed');
        
        // Recalculate layouts
        this.app.elements.pages.forEach(page => {
            if (page.classList.contains('active')) {
                const pageInstance = this.app.pages[this.currentPage];
                if (pageInstance && typeof pageInstance.onOrientationChange === 'function') {
                    pageInstance.onOrientationChange();
                }
            }
        });
    }
    
    handleResize() {
        console.log('📐 Window resized');
        
        // Handle responsive layout changes
        this.updateResponsiveLayout();
    }
    
    updateResponsiveLayout() {
        const width = window.innerWidth;
        const isMobile = width < 768;
        const isTablet = width >= 768 && width < 1024;
        const isDesktop = width >= 1024;
        
        document.body.classList.toggle('mobile', isMobile);
        document.body.classList.toggle('tablet', isTablet);
        document.body.classList.toggle('desktop', isDesktop);
        
        // Notify current page of layout change
        const pageInstance = this.app.pages[this.currentPage];
        if (pageInstance && typeof pageInstance.onLayoutChange === 'function') {
            pageInstance.onLayoutChange({ isMobile, isTablet, isDesktop });
        }
    }
    
    // Utility methods
    notifyPageChange(newPage, previousPage) {
        console.log(`📄 Page changed: ${previousPage} → ${newPage}`);
        
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_view', {
                page_title: newPage,
                page_location: window.location.href
            });
        }
        
        // Custom event
        window.dispatchEvent(new CustomEvent('pageChanged', {
            detail: { newPage, previousPage }
        }));
    }
    
    showAccessDenied() {
        // Show access denied message
        this.app.showError('You do not have permission to access this page.');
        
        // Redirect to dashboard
        setTimeout(() => {
            this.navigateToPage('dashboard');
        }, 2000);
    }
    
    // Deep linking
    handleDeepLink(url) {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname.substring(1); // Remove leading slash
            
            if (this.isValidPage(path)) {
                this.navigateToPage(path, { replace: true });
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Failed to handle deep link:', error);
            return false;
        }
    }
    
    // Tab management
    switchTab(tabName, pageName = this.currentPage) {
        try {
            console.log(`📑 Switching to tab: ${tabName} in ${pageName}`);
            
            const pageInstance = this.app.pages[pageName];
            if (pageInstance && typeof pageInstance.switchTab === 'function') {
                pageInstance.switchTab(tabName);
            }
            
        } catch (error) {
            console.error(`❌ Failed to switch tab:`, error);
        }
    }
    
    // Modal navigation
    openModal(modalName, data = {}) {
        try {
            console.log(`🪟 Opening modal: ${modalName}`);
            
            if (modalName === 'profile') {
                this.app.showProfileModal();
            } else if (modalName === 'notifications') {
                this.app.showNotificationsModal();
            } else {
                // Handle custom modals
                const modal = document.getElementById(`${modalName}-modal`);
                if (modal) {
                    modal.classList.remove('hidden');
                    this.app.elements.modalOverlay.classList.remove('hidden');
                    
                    // Pass data to modal
                    if (typeof window[`${modalName}Modal`] === 'object' && 
                        window[`${modalName}Modal`].onOpen) {
                        window[`${modalName}Modal`].onOpen(data);
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ Failed to open modal:`, error);
        }
    }
    
    closeModal(modalName) {
        try {
            console.log(`🪟 Closing modal: ${modalName}`);
            
            if (modalName === 'profile') {
                this.app.hideProfileModal();
            } else if (modalName === 'notifications') {
                this.app.hideNotificationsModal();
            } else {
                // Handle custom modals
                const modal = document.getElementById(`${modalName}-modal`);
                if (modal) {
                    modal.classList.add('hidden');
                    this.app.elements.modalOverlay.classList.add('hidden');
                }
            }
            
        } catch (error) {
            console.error(`❌ Failed to close modal:`, error);
        }
    }
    
    // Utility functions
    debounce(func, wait) {
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
    
    // Get current navigation state
    getCurrentState() {
        return {
            currentPage: this.currentPage,
            history: [...this.pageHistory],
            canGoBack: this.canGoBack()
        };
    }
    
    // Reset navigation
    reset() {
        this.currentPage = 'dashboard';
        this.pageHistory = ['dashboard'];
        this.updateNavigationState();
    }
}
