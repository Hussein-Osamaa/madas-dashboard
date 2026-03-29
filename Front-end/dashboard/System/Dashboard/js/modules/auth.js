// Authentication Module for MADAS Dashboard
class AuthModule {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        console.log('🔐 Authentication module initialized');
        this.setupAuthListeners();
    }

    setupAuthListeners() {
        // Listen for auth state changes
        if (window.auth) {
            window.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                if (user) {
                    console.log('👤 User authenticated:', user.email);
                    this.handleAuthenticatedUser(user);
                } else {
                    console.log('👤 User not authenticated');
                    this.handleUnauthenticatedUser();
                }
            });
        }
    }

    handleAuthenticatedUser(user) {
        // Update UI for authenticated user
        this.updateUserInterface(user);
        this.loadUserData(user);
    }

    handleUnauthenticatedUser() {
        // Redirect to login or show login prompt
        console.log('❌ User not authenticated - redirecting to login');
        // Don't auto-redirect, let the page handle it
    }

    updateUserInterface(user) {
        // Update user info in the interface
        const userElements = document.querySelectorAll('[data-user-email]');
        userElements.forEach(element => {
            element.textContent = user.email;
        });

        const nameElements = document.querySelectorAll('[data-user-name]');
        nameElements.forEach(element => {
            element.textContent = user.displayName || user.email.split('@')[0];
        });
    }

    loadUserData(user) {
        // Load user-specific data from Firestore
        if (window.db) {
            this.getUserProfile(user.uid);
            this.getUserPermissions(user.uid);
        }
    }

    async getUserProfile(uid) {
        try {
            const API_BASE = window.VITE_API_BACKEND_URL || 'https://xdigix-os-production.up.railway.app/api';
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_BASE}/users/${uid}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const userData = await res.json();
                console.log('User profile loaded:', userData);
                this.updateUserProfile(userData.data || userData);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    async getUserPermissions(uid) {
        // Permissions are handled server-side via JWT
        console.log('User permissions managed via JWT');
    }

    updateUserProfile(userData) {
        // Update UI with user profile data
        const profileElements = document.querySelectorAll('[data-user-company]');
        profileElements.forEach(element => {
            element.textContent = userData.company || 'N/A';
        });
    }

    updateUserPermissions(permissions) {
        // Update UI based on user permissions
        console.log('🔐 Applying user permissions:', permissions);
        // Implement permission-based UI updates here
    }

    async signOut() {
        try {
            if (window.auth) {
                await window.auth.signOut();
                console.log('👋 User signed out successfully');
                window.location.href = '../login.html';
            }
        } catch (error) {
            console.error('❌ Error signing out:', error);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// Initialize auth module
window.authModule = new AuthModule();

// Make signOut available globally
window.signOut = () => window.authModule.signOut();

console.log('✅ Authentication module loaded');
