// Dashboard Fix Script - Resolves common JavaScript errors
(function() {
    'use strict';

    console.log('🔧 Dashboard fix script loaded');

    // Fix Firebase initialization issues
    function fixFirebaseIssues() {
        // Wait for Firebase to be available
        const checkFirebase = setInterval(() => {
            if (window.firebaseConfig && window.db && window.auth) {
                console.log('✅ Firebase is ready');
                clearInterval(checkFirebase);
                initializeDashboard();
            }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkFirebase);
            console.log('⚠️ Firebase initialization timeout - using fallback');
            initializeDashboardFallback();
        }, 5000);
    }

    function initializeDashboard() {
        console.log('🚀 Initializing dashboard with Firebase');
        
        // Initialize modules
        if (window.authModule) {
            console.log('✅ Auth module ready');
        }
        
        if (window.businessModule) {
            console.log('✅ Business module ready');
        }
        
        if (window.staffModule) {
            console.log('✅ Staff module ready');
        }

        // Setup common dashboard functionality
        setupDashboardFeatures();
    }

    function initializeDashboardFallback() {
        console.log('🔄 Initializing dashboard without Firebase');
        
        // Setup fallback functionality
        setupFallbackFeatures();
        setupDashboardFeatures();
    }

    function setupDashboardFeatures() {
        // Setup logout functionality
        setupLogoutButtons();
        
        // Setup navigation
        setupNavigation();
        
        // Setup user interface
        setupUserInterface();
        
        // Setup data loading
        setupDataLoading();
    }

    function setupFallbackFeatures() {
        console.log('🔄 Setting up fallback features');
        
        // Create mock Firebase objects
        window.firebase = window.firebase || {
            auth: () => ({
                onAuthStateChanged: (callback) => {
                    // Mock user for testing
                    const mockUser = {
                        uid: 'test-user',
                        email: 'test@example.com',
                        displayName: 'Test User'
                    };
                    setTimeout(() => callback(mockUser), 100);
                },
                signOut: () => Promise.resolve()
            }),
            firestore: () => ({
                collection: () => ({
                    doc: () => ({
                        get: () => Promise.resolve({ exists: () => false }),
                        set: () => Promise.resolve(),
                        update: () => Promise.resolve(),
                        delete: () => Promise.resolve()
                    }),
                    add: () => Promise.resolve({ id: 'mock-id' }),
                    get: () => Promise.resolve({ docs: [] })
                })
            })
        };

        window.db = window.firebase.firestore();
        window.auth = window.firebase.auth();
    }

    function setupLogoutButtons() {
        const logoutButtons = document.querySelectorAll('[id*="logout"], [class*="logout"]');
        logoutButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🚪 Logout clicked');
                
                // Clear all data
                localStorage.clear();
                sessionStorage.clear();
                
                // Redirect to login
                window.location.href = '../login.html';
            });
        });
    }

    function setupNavigation() {
        // Setup mobile menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('-translate-x-full');
            });
        }

        // Setup dropdown menus
        const dropdownToggles = document.querySelectorAll('[id*="toggle"]');
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const submenu = document.querySelector(`#${toggle.id.replace('toggle', 'submenu')}`);
                if (submenu) {
                    submenu.classList.toggle('hidden');
                }
            });
        });
    }

    function setupUserInterface() {
        // Update user info if available
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                updateUserElements(user);
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
    }

    function updateUserElements(user) {
        // Update user name elements
        const nameElements = document.querySelectorAll('[data-user-name], #user-name');
        nameElements.forEach(element => {
            element.textContent = user.name || user.email || 'User';
        });

        // Update user email elements
        const emailElements = document.querySelectorAll('[data-user-email], #user-email');
        emailElements.forEach(element => {
            element.textContent = user.email || 'user@example.com';
        });

        // Update user company elements
        const companyElements = document.querySelectorAll('[data-user-company], #user-company');
        companyElements.forEach(element => {
            element.textContent = user.company || 'Company';
        });
    }

    function setupDataLoading() {
        // Load dashboard data
        loadDashboardData();
        
        // Setup data refresh
        setupDataRefresh();
    }

    function loadDashboardData() {
        console.log('📊 Loading dashboard data');
        
        // Load stats
        loadStats();
        
        // Load recent activity
        loadRecentActivity();
        
        // Load charts/data
        loadCharts();
    }

    function loadStats() {
        // Mock stats for demonstration
        const stats = {
            totalSales: 12500,
            totalOrders: 45,
            totalCustomers: 120,
            totalProducts: 89
        };

        // Update stats elements
        Object.keys(stats).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = key === 'totalSales' ? `$${stats[key]}` : stats[key];
            }
        });
    }

    function loadRecentActivity() {
        // Mock recent activity
        const activities = [
            { type: 'order', message: 'New order received', time: '2 minutes ago' },
            { type: 'customer', message: 'New customer registered', time: '15 minutes ago' },
            { type: 'inventory', message: 'Low stock alert', time: '1 hour ago' }
        ];

        const activityContainer = document.getElementById('recent-activity');
        if (activityContainer) {
            activityContainer.innerHTML = activities.map(activity => `
                <div class="activity-item p-3 bg-gray-50 rounded-lg">
                    <p class="text-sm font-medium">${activity.message}</p>
                    <p class="text-xs text-gray-500">${activity.time}</p>
                </div>
            `).join('');
        }
    }

    function loadCharts() {
        // Mock chart data
        console.log('📈 Loading charts');
        // Chart implementation would go here
    }

    function setupDataRefresh() {
        // Refresh data every 30 seconds
        setInterval(() => {
            console.log('🔄 Refreshing dashboard data');
            loadDashboardData();
        }, 30000);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixFirebaseIssues);
    } else {
        fixFirebaseIssues();
    }

    // Make functions available globally
    window.dashboardFix = {
        initializeDashboard,
        setupDashboardFeatures,
        loadDashboardData
    };

})();
