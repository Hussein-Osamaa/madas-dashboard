// Universal Authentication Manager for MADAS Dashboard
// Firebase removed - uses localStorage session only
class AuthManager {
    constructor() {
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('AuthManager initializing...');
        this.initializeFallback();
    }

    initializeFallback() {
        console.log('Using localStorage authentication system');

        // Check localStorage for user session
        const userSession = localStorage.getItem('currentUser');
        if (userSession) {
            try {
                this.currentUser = JSON.parse(userSession);
                console.log('User session restored from localStorage:', this.currentUser.email);
                this.updateUI();
            } catch (error) {
                console.error('Error parsing user session:', error);
                this.redirectToLogin();
            }
        } else {
            console.log('No user session found');
            this.redirectToLogin();
        }
    }

    saveUserSession(user) {
        const session = {
            userId: user.uid || user.userId,
            email: user.email,
            displayName: user.displayName || '',
            loginTime: new Date().toISOString(),
            isAuthenticated: true
        };

        localStorage.setItem('currentUser', JSON.stringify(session));
        console.log('User session saved');
    }

    clearUserSession() {
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        console.log('User session cleared');
    }

    updateUI() {
        if (!this.currentUser) return;

        // Update user info elements
        const userElements = document.querySelectorAll('[data-user-email]');
        userElements.forEach(element => {
            element.textContent = this.currentUser.email || '';
        });

        const nameElements = document.querySelectorAll('[data-user-name]');
        nameElements.forEach(element => {
            element.textContent = this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User';
        });

        const brandElements = document.querySelectorAll('[data-brand-name]');
        brandElements.forEach(element => {
            element.textContent = 'MADAS Dashboard';
        });

        const planElements = document.querySelectorAll('[data-user-plan]');
        planElements.forEach(element => {
            element.textContent = 'Premium Plan';
        });

        // Hide loading screens
        const loadingScreens = document.querySelectorAll('#loadingScreen, .loading-screen');
        loadingScreens.forEach(screen => {
            screen.style.display = 'none';
        });
    }

    redirectToLogin() {
        const currentPath = window.location.pathname;
        let loginPath = '';

        if (currentPath.includes('/Dashboard/')) {
            if (currentPath.includes('/mobile-dashboard/')) {
                loginPath = '../Login.html';
            } else {
                loginPath = 'Login.html';
            }
        } else {
            loginPath = '../login.html';
        }

        console.log('Redirecting to login:', loginPath);
        window.location.href = loginPath;
    }

    async logout() {
        console.log('Logging out user...');
        this.clearUserSession();
        this.redirectToLogin();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    async getUserData() {
        return this.currentUser || null;
    }

    async updateUserData(data) {
        if (!this.currentUser) return false;
        Object.assign(this.currentUser, data);
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        return true;
    }
}

// Initialize AuthManager
window.authManager = new AuthManager();

// Make logout function globally available
window.logout = () => window.authManager.logout();

// Setup logout buttons
document.addEventListener('DOMContentLoaded', function() {
    const logoutButtons = document.querySelectorAll('#logout-btn, .logout-link, [data-logout]');
    logoutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            window.authManager.logout();
        });
    });

    console.log('AuthManager initialized and logout buttons setup');
});

console.log('Universal Authentication Manager loaded');
