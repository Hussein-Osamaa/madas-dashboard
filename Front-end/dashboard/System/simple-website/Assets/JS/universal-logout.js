// Universal Logout Script for All Dashboard Pages
class UniversalLogout {
    constructor() {
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupLogout());
        } else {
            this.setupLogout();
        }
    }

    setupLogout() {
        // Find all logout buttons
        const logoutButtons = document.querySelectorAll('[id*="logout"], [class*="logout"], button[onclick*="logout"]');
        
        logoutButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        });

        // Also check for any existing logout functionality
        this.enhanceExistingLogout();
    }

    handleLogout() {
        console.log('🚪 Logging out user...');
        
        // Clear all user data
        this.clearUserData();
        
        // Clear Firebase auth if available
        this.clearFirebaseAuth();
        
        // Clear any session data
        this.clearSessionData();
        
        // Redirect to login page
        this.redirectToLogin();
    }

    clearUserData() {
        // Clear localStorage data
        const keysToRemove = [
            'currentUser',
            'nextgen_clients',
            'userSession',
            'madasUser',
            'userData',
            'sessionData'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('🧹 Cleared user data from localStorage');
    }

    clearFirebaseAuth() {
        // If Firebase auth is available, sign out
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(() => {
                console.log('🔥 Firebase auth cleared');
            }).catch(error => {
                console.log('Firebase auth not available or error:', error);
            });
        }
        
        // Also check for Firebase v9+ modules
        if (window.auth && typeof window.auth.signOut === 'function') {
            window.auth.signOut().then(() => {
                console.log('🔥 Firebase v9+ auth cleared');
            }).catch(error => {
                console.log('Firebase v9+ auth error:', error);
            });
        }
    }

    clearSessionData() {
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Clear any cookies (if needed)
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        console.log('🧹 Cleared session data');
    }

    redirectToLogin() {
        // Determine the correct path to login page based on current location
        let loginPath = '../login.html';
        
        // If we're in a subdirectory, adjust the path
        const currentPath = window.location.pathname;
        if (currentPath.includes('/Dashboard/')) {
            loginPath = '../../login.html';
        } else if (currentPath.includes('/mobile-dashboard/')) {
            loginPath = '../../../login.html';
        } else if (currentPath.includes('/Staff/') || currentPath.includes('/Inventory/') || 
                   currentPath.includes('/Orders/') || currentPath.includes('/Customers/') ||
                   currentPath.includes('/Main/') || currentPath.includes('/Finance/') ||
                   currentPath.includes('/Game hub/')) {
            loginPath = '../../../login.html';
        }
        
        console.log('🔄 Redirecting to login page:', loginPath);
        window.location.href = loginPath;
    }

    enhanceExistingLogout() {
        // Enhance any existing logout functionality
        const existingLogoutHandlers = document.querySelectorAll('[onclick*="logout"], [onclick*="signOut"]');
        
        existingLogoutHandlers.forEach(element => {
            const originalOnclick = element.getAttribute('onclick');
            element.setAttribute('onclick', '');
            element.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        });
    }
}

// Initialize universal logout
window.universalLogout = new UniversalLogout();

// Also make it available globally
window.handleLogout = () => window.universalLogout.handleLogout();

// Auto-setup for any logout buttons that might be added dynamically
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    const logoutButtons = node.querySelectorAll ? 
                        node.querySelectorAll('[id*="logout"], [class*="logout"]') : [];
                    
                    logoutButtons.forEach(button => {
                        if (!button.hasAttribute('data-logout-setup')) {
                            button.setAttribute('data-logout-setup', 'true');
                            button.addEventListener('click', (e) => {
                                e.preventDefault();
                                window.universalLogout.handleLogout();
                            });
                        }
                    });
                }
            });
        }
    });
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log('✅ Universal logout system initialized');
