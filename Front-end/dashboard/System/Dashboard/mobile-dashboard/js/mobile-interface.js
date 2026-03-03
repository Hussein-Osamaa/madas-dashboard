// Mobile Interface - Dashboard Mobile UI Components
console.log('📱 Mobile interface loaded');

// Mobile Interface Class
class MobileInterface {
    constructor() {
        this.isMobile = false;
        this.isPWA = false;
        this.mobileMenuOpen = false;
        this.isInitialized = false;
    }

    // Initialize mobile interface
    init() {
        console.log('🎨 Initializing mobile interface...');
        
        this.detectMobile();
        this.setupMobileUI();
        this.setupMobileNavigation();
        this.setupMobileGestures();
        this.setupMobileOptimizations();
        
        this.isInitialized = true;
        console.log('✅ Mobile interface initialized');
    }

    // Detect mobile environment
    detectMobile() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isPWA = window.matchMedia('(display-mode: standalone)').matches;
        
        if (this.isMobile) {
            document.body.classList.add('mobile-device');
        }
        
        if (this.isPWA) {
            document.body.classList.add('pwa-mode');
        }
    }

    // Setup mobile UI components
    setupMobileUI() {
        // Add mobile-specific CSS
        this.addMobileStyles();
        
        // Create mobile header
        this.createMobileHeader();
        
        // Create mobile navigation
        this.createMobileNavigation();
        
        // Create mobile floating action button
        this.createMobileFAB();
        
        // Setup mobile cards
        this.setupMobileCards();
    }

    // Add mobile-specific styles
    addMobileStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Mobile-specific styles */
            .mobile-device {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            
            .mobile-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                background: var(--header-bg);
                border-bottom: 1px solid var(--card-border);
                padding: 1rem;
                display: none;
            }
            
            .mobile-nav {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                background: var(--card-bg);
                border-top: 1px solid var(--card-border);
                display: none;
            }
            
            .mobile-nav-item {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 0.5rem;
                text-decoration: none;
                color: var(--text-secondary);
                transition: color 0.3s;
            }
            
            .mobile-nav-item.active {
                color: var(--madas-primary);
            }
            
            .mobile-nav-item .material-icons {
                font-size: 1.5rem;
                margin-bottom: 0.25rem;
            }
            
            .mobile-nav-item span {
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            .mobile-fab {
                position: fixed;
                bottom: 5rem;
                right: 1rem;
                z-index: 999;
                width: 3.5rem;
                height: 3.5rem;
                border-radius: 50%;
                background: var(--madas-primary);
                color: white;
                border: none;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: none;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .mobile-fab:hover {
                transform: scale(1.1);
            }
            
            .mobile-card {
                margin-bottom: 1rem;
                border-radius: 0.75rem;
                background: var(--card-bg);
                border: 1px solid var(--card-border);
                overflow: hidden;
            }
            
            .mobile-card-header {
                padding: 1rem;
                border-bottom: 1px solid var(--card-border);
                background: var(--madas-light);
            }
            
            .mobile-card-content {
                padding: 1rem;
            }
            
            .mobile-menu-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                display: none;
            }
            
            .mobile-menu {
                position: fixed;
                top: 0;
                left: 0;
                bottom: 0;
                width: 280px;
                background: var(--sidebar-bg);
                z-index: 1000;
                transform: translateX(-100%);
                transition: transform 0.3s;
                overflow-y: auto;
            }
            
            .mobile-menu.open {
                transform: translateX(0);
            }
            
            .mobile-menu-overlay.open {
                display: block;
            }
            
            /* Mobile responsive adjustments */
            @media (max-width: 768px) {
                .mobile-header {
                    display: flex;
                }
                
                .mobile-nav {
                    display: flex;
                }
                
                .mobile-fab {
                    display: flex;
                }
                
                /* Adjust main content for mobile */
                main {
                    padding-bottom: 5rem;
                    padding-top: 4rem;
                }
                
                /* Mobile table adjustments */
                .mobile-table {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                .mobile-table table {
                    min-width: 600px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Create mobile header
    createMobileHeader() {
        const header = document.createElement('div');
        header.className = 'mobile-header';
        header.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <button id="mobile-menu-btn" class="p-2 rounded-lg hover:bg-gray-100">
                    <span class="material-icons">menu</span>
                </button>
                <div class="flex items-center space-x-2">
                    <img src="assets/img/madas.png" alt="Madas" class="w-8 h-8 rounded">
                    <h1 class="text-lg font-bold text-[var(--madas-primary)]">MADAS</h1>
                </div>
                <button id="mobile-notifications-btn" class="p-2 rounded-lg hover:bg-gray-100 relative">
                    <span class="material-icons">notifications</span>
                    <span id="notification-badge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hidden">3</span>
                </button>
            </div>
        `;
        document.body.insertBefore(header, document.body.firstChild);
    }

    // Create mobile navigation
    createMobileNavigation() {
        const nav = document.createElement('div');
        nav.className = 'mobile-nav';
        nav.innerHTML = `
            <a href="index.html" class="mobile-nav-item active" data-page="dashboard">
                <span class="material-icons">dashboard</span>
                <span>Dashboard</span>
            </a>
            <a href="Orders/orders.html" class="mobile-nav-item" data-page="orders">
                <span class="material-icons">receipt_long</span>
                <span>Orders</span>
            </a>
            <a href="Inventory/products.html" class="mobile-nav-item" data-page="inventory">
                <span class="material-icons">inventory_2</span>
                <span>Inventory</span>
            </a>
            <a href="Customers/Customer.html" class="mobile-nav-item" data-page="customers">
                <span class="material-icons">group</span>
                <span>Customers</span>
            </a>
            <a href="Finance/finance.html" class="mobile-nav-item" data-page="finance">
                <span class="material-icons">account_balance_wallet</span>
                <span>Finance</span>
            </a>
        `;
        document.body.appendChild(nav);
    }

    // Create mobile floating action button
    createMobileFAB() {
        const fab = document.createElement('button');
        fab.className = 'mobile-fab';
        fab.innerHTML = '<span class="material-icons">add</span>';
        fab.id = 'mobile-fab';
        document.body.appendChild(fab);
    }

    // Setup mobile cards
    setupMobileCards() {
        // Convert existing cards to mobile-friendly format
        const cards = document.querySelectorAll('.bg-white.rounded-xl');
        cards.forEach(card => {
            card.classList.add('mobile-card');
        });
    }

    // Setup mobile navigation
    setupMobileNavigation() {
        // Mobile menu toggle
        const menuBtn = document.getElementById('mobile-menu-btn');
        const menuOverlay = document.createElement('div');
        menuOverlay.className = 'mobile-menu-overlay';
        menuOverlay.id = 'mobile-menu-overlay';
        
        const mobileMenu = document.createElement('div');
        mobileMenu.className = 'mobile-menu';
        mobileMenu.id = 'mobile-menu';
        mobileMenu.innerHTML = `
            <div class="p-6 border-b border-gray-200">
                <div class="flex items-center space-x-3">
                    <img src="assets/img/madas.png" alt="Madas" class="w-10 h-10 rounded">
                    <div>
                        <h2 class="text-lg font-bold text-[var(--madas-primary)]">MADAS Dashboard</h2>
                        <p class="text-sm text-gray-600">Business Management</p>
                    </div>
                </div>
            </div>
            <nav class="p-4 space-y-2">
                <a href="index.html" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                    <span class="material-icons">dashboard</span>
                    <span>Dashboard</span>
                </a>
                <a href="Orders/orders.html" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                    <span class="material-icons">receipt_long</span>
                    <span>Orders</span>
                </a>
                <a href="Inventory/products.html" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                    <span class="material-icons">inventory_2</span>
                    <span>Inventory</span>
                </a>
                <a href="Customers/Customer.html" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                    <span class="material-icons">group</span>
                    <span>Customers</span>
                </a>
                <a href="Finance/finance.html" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                    <span class="material-icons">account_balance_wallet</span>
                    <span>Finance</span>
                </a>
                <a href="Staff/Admin.html" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                    <span class="material-icons">supervisor_account</span>
                    <span>Staff</span>
                </a>
            </nav>
        `;
        
        document.body.appendChild(menuOverlay);
        document.body.appendChild(mobileMenu);
        
        if (menuBtn) {
            menuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }
        
        menuOverlay.addEventListener('click', () => this.closeMobileMenu());
        
        // Mobile nav item clicks
        const navItems = document.querySelectorAll('.mobile-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    // Toggle mobile menu
    toggleMobileMenu() {
        const menu = document.getElementById('mobile-menu');
        const overlay = document.getElementById('mobile-menu-overlay');
        
        if (menu && overlay) {
            this.mobileMenuOpen = !this.mobileMenuOpen;
            menu.classList.toggle('open', this.mobileMenuOpen);
            overlay.classList.toggle('open', this.mobileMenuOpen);
        }
    }

    // Close mobile menu
    closeMobileMenu() {
        const menu = document.getElementById('mobile-menu');
        const overlay = document.getElementById('mobile-menu-overlay');
        
        if (menu && overlay) {
            this.mobileMenuOpen = false;
            menu.classList.remove('open');
            overlay.classList.remove('open');
        }
    }

    // Setup mobile gestures
    setupMobileGestures() {
        // Swipe gestures for navigation
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Swipe left to open menu
            if (diffX > 50 && Math.abs(diffY) < 50) {
                this.toggleMobileMenu();
            }
            
            // Swipe right to close menu
            if (diffX < -50 && Math.abs(diffY) < 50 && this.mobileMenuOpen) {
                this.closeMobileMenu();
            }
        });
    }

    // Setup mobile optimizations
    setupMobileOptimizations() {
        // Optimize images for mobile
        this.optimizeImages();
        
        // Setup mobile-specific event listeners
        this.setupMobileEvents();
        
        // Setup mobile performance monitoring
        this.setupPerformanceMonitoring();
    }

    // Optimize images for mobile
    optimizeImages() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // Add loading="lazy" for better performance
            img.loading = 'lazy';
            
            // Add mobile-specific attributes
            img.setAttribute('data-mobile-optimized', 'true');
        });
    }

    // Setup mobile events
    setupMobileEvents() {
        // FAB click handler
        const fab = document.getElementById('mobile-fab');
        if (fab) {
            fab.addEventListener('click', () => {
                // Show quick actions menu
                this.showQuickActions();
            });
        }
        
        // Notification button handler
        const notificationBtn = document.getElementById('mobile-notifications-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.showNotifications();
            });
        }
    }

    // Show quick actions
    showQuickActions() {
        // Create quick actions menu
        const actions = [
            { icon: 'add', label: 'New Order', action: () => window.location.href = 'Orders/orders.html' },
            { icon: 'inventory_2', label: 'Add Product', action: () => window.location.href = 'Inventory/products.html' },
            { icon: 'group', label: 'Add Customer', action: () => window.location.href = 'Customers/Customer.html' },
            { icon: 'receipt_long', label: 'View Orders', action: () => window.location.href = 'Orders/orders.html' }
        ];
        
        // Show actions (implement based on your UI framework)
        console.log('Quick actions:', actions);
    }

    // Show notifications
    showNotifications() {
        // Show notifications panel
        console.log('Showing notifications...');
    }

    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Monitor mobile performance
        if ('performance' in window) {
            window.addEventListener('load', () => {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('📊 Mobile performance:', {
                    loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
                });
            });
        }
    }

    // Get mobile interface info
    getMobileInfo() {
        return {
            isMobile: this.isMobile,
            isPWA: this.isPWA,
            menuOpen: this.mobileMenuOpen,
            initialized: this.isInitialized
        };
    }
}

// Initialize mobile interface
const mobileInterface = new MobileInterface();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    mobileInterface.init();
});

// Export for use in other scripts
window.mobileInterface = mobileInterface;
window.MobileInterface = MobileInterface;
