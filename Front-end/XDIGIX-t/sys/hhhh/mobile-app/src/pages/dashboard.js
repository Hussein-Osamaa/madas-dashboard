// Dashboard Page for Mobile App
// Main dashboard with stats, quick actions, and recent activity

import { FirebaseUtils } from '../services/firebase-mobile.js';

export class DashboardPage {
    constructor(app) {
        this.app = app;
        this.isInitialized = false;
        this.statsData = null;
        this.recentActivity = [];
        this.refreshInterval = null;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('📊 Initializing Dashboard Page...');
            
            // Setup page elements
            this.setupElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize data
            await this.loadInitialData();
            
            this.isInitialized = true;
            console.log('✅ Dashboard Page initialized');
            
        } catch (error) {
            console.error('❌ Dashboard Page initialization failed:', error);
        }
    }
    
    setupElements() {
        this.elements = {
            statsGrid: document.querySelector('.stats-grid'),
            totalOrders: document.getElementById('total-orders'),
            totalProducts: document.getElementById('total-products'),
            totalCustomers: document.getElementById('total-customers'),
            totalRevenue: document.getElementById('total-revenue'),
            activityList: document.getElementById('activity-list'),
            quickActions: document.querySelectorAll('.action-btn')
        };
    }
    
    setupEventListeners() {
        // Quick action buttons
        this.elements.quickActions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });
        
        // Pull to refresh
        this.setupPullToRefresh();
        
        // Swipe gestures
        this.setupSwipeGestures();
    }
    
    setupPullToRefresh() {
        let startY = 0;
        let currentY = 0;
        let isRefreshing = false;
        
        const mainContent = document.querySelector('.main-content');
        
        mainContent.addEventListener('touchstart', (e) => {
            if (mainContent.scrollTop === 0) {
                startY = e.touches[0].clientY;
            }
        });
        
        mainContent.addEventListener('touchmove', (e) => {
            if (mainContent.scrollTop === 0 && !isRefreshing) {
                currentY = e.touches[0].clientY;
                const pullDistance = currentY - startY;
                
                if (pullDistance > 0) {
                    e.preventDefault();
                    const pullPercentage = Math.min(pullDistance / 100, 1);
                    
                    // Visual feedback
                    if (pullPercentage > 0.5) {
                        mainContent.style.transform = `translateY(${pullDistance * 0.5}px)`;
                    }
                }
            }
        });
        
        mainContent.addEventListener('touchend', (e) => {
            if (mainContent.scrollTop === 0 && !isRefreshing) {
                const pullDistance = currentY - startY;
                
                if (pullDistance > 100) {
                    this.refreshData();
                }
                
                // Reset transform
                mainContent.style.transform = '';
            }
        });
    }
    
    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        
        const mainContent = document.querySelector('.main-content');
        
        mainContent.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        mainContent.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // Horizontal swipe (minimum 50px, max 30° angle)
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    // Swipe right - go to previous page or open menu
                    this.app.openNavigation();
                } else {
                    // Swipe left - could be used for quick actions
                    console.log('Swipe left detected');
                }
            }
        });
    }
    
    async loadInitialData() {
        try {
            console.log('📊 Loading dashboard data...');
            
            // Show loading state
            this.showLoadingState();
            
            // Load dashboard stats
            await this.loadStats();
            
            // Load recent activity
            await this.loadRecentActivity();
            
            // Hide loading state
            this.hideLoadingState();
            
        } catch (error) {
            console.error('❌ Failed to load dashboard data:', error);
            this.showErrorState('Failed to load dashboard data');
        }
    }
    
    async loadStats() {
        try {
            const apiService = this.app.getApiService();
            
            // Check if API service is ready
            if (!apiService || !apiService.db || !apiService.modules) {
                console.log('⏳ API service not ready yet, waiting...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.loadStats(); // Retry
            }
            
            const stats = await apiService.getDashboardStats();
            
            this.statsData = stats;
            this.updateStatsDisplay(stats);
            
        } catch (error) {
            console.error('❌ Failed to load stats:', error);
            // Don't throw error, just show empty stats
            this.showEmptyStats();
        }
    }
    
    updateStatsDisplay(stats) {
        try {
            // Update stat values
            if (this.elements.totalOrders) {
                this.elements.totalOrders.textContent = stats.totalOrders || 0;
            }
            
            if (this.elements.totalProducts) {
                this.elements.totalProducts.textContent = stats.totalProducts || 0;
            }
            
            if (this.elements.totalCustomers) {
                this.elements.totalCustomers.textContent = stats.totalCustomers || 0;
            }
            
            if (this.elements.totalRevenue) {
                this.elements.totalRevenue.textContent = FirebaseUtils.formatCurrency(stats.totalRevenue || 0);
            }
            
            // Add animation to stats
            this.animateStats();
            
        } catch (error) {
            console.error('❌ Failed to update stats display:', error);
        }
    }
    
    animateStats() {
        const statCards = document.querySelectorAll('.stat-card');
        
        statCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate-in');
            }, index * 100);
        });
    }
    
    async loadRecentActivity() {
        try {
            const apiService = this.app.getApiService();
            
            // Get recent orders and notifications
            const [orders, notifications] = await Promise.all([
                apiService.getOrders({}, { limit: 5 }),
                apiService.getNotifications()
            ]);
            
            // Combine and format activity
            const activities = [];
            
            // Recent orders
            orders.forEach(order => {
                activities.push({
                    type: 'order',
                    icon: 'shopping_cart',
                    title: `New Order #${order.orderNumber || order.id.slice(-6)}`,
                    message: `$${order.total || 0} from ${order.customerName || 'Unknown Customer'}`,
                    time: order.createdAt,
                    color: 'success'
                });
            });
            
            // Recent notifications
            notifications.slice(0, 3).forEach(notification => {
                activities.push({
                    type: 'notification',
                    icon: notification.icon || 'info',
                    title: notification.title,
                    message: notification.message,
                    time: notification.createdAt,
                    color: 'info'
                });
            });
            
            // Sort by time
            activities.sort((a, b) => {
                const timeA = FirebaseUtils.timestampToDate(a.time);
                const timeB = FirebaseUtils.timestampToDate(b.time);
                return timeB - timeA;
            });
            
            this.recentActivity = activities.slice(0, 5);
            this.updateActivityDisplay();
            
        } catch (error) {
            console.error('❌ Failed to load recent activity:', error);
            this.recentActivity = [];
        }
    }
    
    updateActivityDisplay() {
        try {
            if (!this.elements.activityList) return;
            
            if (this.recentActivity.length === 0) {
                this.elements.activityList.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <span class="material-icons">info</span>
                        </div>
                        <div class="activity-content">
                            <p class="activity-text">No recent activity</p>
                            <p class="activity-time">Get started by creating your first order</p>
                        </div>
                    </div>
                `;
                return;
            }
            
            this.elements.activityList.innerHTML = this.recentActivity.map(activity => `
                <div class="activity-item" data-type="${activity.type}">
                    <div class="activity-icon" style="background-color: var(--${activity.color || 'info'})">
                        <span class="material-icons">${activity.icon}</span>
                    </div>
                    <div class="activity-content">
                        <p class="activity-text">${activity.title}</p>
                        <p class="activity-message">${activity.message}</p>
                        <p class="activity-time">${FirebaseUtils.getRelativeTime(FirebaseUtils.timestampToDate(activity.time))}</p>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('❌ Failed to update activity display:', error);
        }
    }
    
    handleQuickAction(action) {
        try {
            console.log('⚡ Quick action:', action);
            
            switch (action) {
                case 'new-order':
                    this.app.navigationManager.navigateToPage('orders');
                    break;
                    
                case 'add-product':
                    this.app.navigationManager.navigateToPage('products');
                    break;
                    
                case 'scan-barcode':
                    this.handleBarcodeScan();
                    break;
                    
                case 'view-reports':
                    this.app.navigationManager.navigateToPage('analytics');
                    break;
                    
                default:
                    console.log('Unknown quick action:', action);
            }
            
        } catch (error) {
            console.error('❌ Quick action failed:', error);
            this.app.showError('Action failed. Please try again.');
        }
    }
    
    async handleBarcodeScan() {
        try {
            // Check if camera is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.app.showError('Camera not available on this device');
                return;
            }
            
            // Request camera permission
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (error) {
                this.app.showError('Camera permission denied');
                return;
            }
            
            // Show barcode scanner modal
            this.showBarcodeScanner();
            
        } catch (error) {
            console.error('❌ Barcode scan failed:', error);
            this.app.showError('Failed to open barcode scanner');
        }
    }
    
    showBarcodeScanner() {
        const scannerModal = this.app.modalManager.createModal({
            id: 'barcode-scanner-modal',
            title: 'Scan Barcode',
            content: `
                <div class="scanner-container">
                    <div class="scanner-placeholder">
                        <span class="material-icons">qr_code_scanner</span>
                        <p>Barcode scanner would open here</p>
                        <p class="text-sm text-gray-500">Camera integration needed</p>
                    </div>
                </div>
            `,
            actions: [
                {
                    id: 'close',
                    label: 'Close',
                    class: 'secondary',
                    handler: () => {
                        this.app.modalManager.closeModal('barcode-scanner-modal');
                    }
                }
            ]
        });
        
        this.app.modalManager.openModal('barcode-scanner-modal');
    }
    
    async refreshData() {
        try {
            console.log('🔄 Refreshing dashboard data...');
            
            // Show refresh indicator
            this.showRefreshIndicator();
            
            // Reload data
            await this.loadStats();
            await this.loadRecentActivity();
            
            // Hide refresh indicator
            this.hideRefreshIndicator();
            
            // Show success feedback
            this.showRefreshSuccess();
            
        } catch (error) {
            console.error('❌ Refresh failed:', error);
            this.hideRefreshIndicator();
            this.app.showError('Failed to refresh data');
        }
    }
    
    showLoadingState() {
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="col-span-full flex items-center justify-center py-8">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--madas-primary)] mx-auto mb-4"></div>
                        <p class="text-gray-500">Loading dashboard...</p>
                    </div>
                </div>
            `;
        }
    }
    
    hideLoadingState() {
        // Loading state is handled by data loading
    }
    
    showErrorState(message) {
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="col-span-full flex items-center justify-center py-8">
                    <div class="text-center">
                        <span class="material-icons text-4xl text-red-500 mb-4">error</span>
                        <p class="text-gray-700 mb-2">Failed to load dashboard</p>
                        <p class="text-sm text-gray-500">${message}</p>
                        <button class="mt-4 px-4 py-2 bg-[var(--madas-primary)] text-white rounded-lg" onclick="window.mobileApp.pages.dashboard.refreshData()">
                            Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    showEmptyStats() {
        // Show empty stats while loading
        this.updateStatsDisplay({
            totalOrders: 0,
            totalProducts: 0,
            totalCustomers: 0,
            totalRevenue: 0
        });
    }
    
    showRefreshIndicator() {
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>Refreshing...';
        }
    }
    
    hideRefreshIndicator() {
        this.app.updatePageTitle();
    }
    
    showRefreshSuccess() {
        // Show brief success indicator
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.innerHTML = '<span class="text-green-500 mr-2">✓</span>Dashboard';
            
            setTimeout(() => {
                this.app.updatePageTitle();
            }, 1500);
        }
    }
    
    // Page lifecycle methods
    onShow() {
        console.log('📊 Dashboard page shown');
        
        // Start auto-refresh if needed
        this.startAutoRefresh();
        
        // Update data if stale
        if (this.shouldRefreshData()) {
            this.refreshData();
        }
    }
    
    onHide() {
        console.log('📊 Dashboard page hidden');
        
        // Stop auto-refresh
        this.stopAutoRefresh();
    }
    
    onResume() {
        console.log('📊 Dashboard page resumed');
        
        // Refresh data when app resumes
        this.refreshData();
    }
    
    onOrientationChange() {
        console.log('📊 Dashboard orientation changed');
        
        // Recalculate layouts if needed
        this.updateLayout();
    }
    
    onLayoutChange({ isMobile, isTablet, isDesktop }) {
        console.log('📊 Dashboard layout changed:', { isMobile, isTablet, isDesktop });
        
        // Adjust layout for different screen sizes
        this.updateLayout();
    }
    
    updateLayout() {
        // Adjust stats grid layout
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid) {
            const isMobile = window.innerWidth < 768;
            statsGrid.style.gridTemplateColumns = isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';
        }
    }
    
    startAutoRefresh() {
        // Refresh data every 5 minutes
        this.refreshInterval = setInterval(() => {
            if (this.shouldRefreshData()) {
                this.refreshData();
            }
        }, 5 * 60 * 1000);
    }
    
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
    
    shouldRefreshData() {
        // Refresh if data is older than 2 minutes
        if (!this.statsData) return true;
        
        const lastUpdate = this.statsData.lastUpdated;
        if (!lastUpdate) return true;
        
        const now = new Date();
        const dataAge = now - lastUpdate;
        
        return dataAge > 2 * 60 * 1000; // 2 minutes
    }
    
    // Public API
    getStats() {
        return this.statsData;
    }
    
    getRecentActivity() {
        return this.recentActivity;
    }
    
    // Cleanup
    destroy() {
        console.log('🗑️ Destroying Dashboard Page...');
        
        this.stopAutoRefresh();
        
        // Remove event listeners
        this.elements.quickActions.forEach(btn => {
            btn.removeEventListener('click', this.handleQuickAction);
        });
        
        console.log('✅ Dashboard Page destroyed');
    }
}
