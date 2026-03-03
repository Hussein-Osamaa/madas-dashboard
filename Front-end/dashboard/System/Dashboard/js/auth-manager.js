// Universal Authentication Manager for MADAS Dashboard
class AuthManager {
    constructor() {
        this.firebaseConfig = {
            apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
            authDomain: "madas-store.firebaseapp.com",
            projectId: "madas-store",
            storageBucket: "madas-store.firebasestorage.app",
            messagingSenderId: "527071300010",
            appId: "1:527071300010:web:70470e2204065b4590583d3"
        };
        
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('🔐 AuthManager initializing...');
        
        // Wait for Firebase to be available
        const checkFirebase = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
                console.log('🔥 Firebase is ready');
                clearInterval(checkFirebase);
                this.initializeFirebase();
            }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkFirebase);
            console.log('⚠️ Firebase initialization timeout - using fallback');
            this.initializeFallback();
        }, 5000);
    }

    initializeFirebase() {
        try {
            const app = firebase.initializeApp(this.firebaseConfig);
            this.auth = firebase.getAuth(app);
            this.db = firebase.getFirestore(app);
            
            console.log('✅ Firebase initialized successfully');
            this.setupAuthListener();
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.initializeFallback();
        }
    }

    initializeFallback() {
        console.log('🔄 Using fallback authentication system');
        
        // Check localStorage for user session
        const userSession = localStorage.getItem('currentUser');
        if (userSession) {
            try {
                this.currentUser = JSON.parse(userSession);
                console.log('👤 User session restored from localStorage:', this.currentUser.email);
                this.updateUI();
            } catch (error) {
                console.error('❌ Error parsing user session:', error);
                this.redirectToLogin();
            }
        } else {
            console.log('👤 No user session found');
            this.redirectToLogin();
        }
    }

    setupAuthListener() {
        if (!this.auth) return;

        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                console.log('👤 User authenticated:', user.email);
                this.saveUserSession(user);
                this.updateUI();
            } else {
                console.log('👤 User not authenticated');
                this.clearUserSession();
                this.redirectToLogin();
            }
        });
    }

    saveUserSession(user) {
        const session = {
            userId: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            loginTime: new Date().toISOString(),
            isAuthenticated: true
        };
        
        localStorage.setItem('currentUser', JSON.stringify(session));
        console.log('💾 User session saved');
    }

    clearUserSession() {
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        console.log('🗑️ User session cleared');
    }

    updateUI() {
        if (!this.currentUser) return;

        // Update user info elements
        const userElements = document.querySelectorAll('[data-user-email]');
        userElements.forEach(element => {
            element.textContent = this.currentUser.email || this.currentUser.email;
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
            // If in Dashboard subdirectory
            if (currentPath.includes('/mobile-dashboard/')) {
                loginPath = '../Login.html';
            } else {
                loginPath = 'Login.html';
            }
        } else {
            loginPath = '../login.html';
        }

        console.log('🔄 Redirecting to login:', loginPath);
        window.location.href = loginPath;
    }

    async logout() {
        console.log('🚪 Logging out user...');
        
        try {
            if (this.auth) {
                await this.auth.signOut();
                console.log('✅ Firebase logout successful');
            }
        } catch (error) {
            console.error('❌ Firebase logout error:', error);
        }

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
        if (!this.currentUser || !this.db) {
            return null;
        }

        try {
            const userDoc = await firebase.firestore().collection('users').doc(this.currentUser.uid).get();
            if (userDoc.exists()) {
                return userDoc.data();
            }
        } catch (error) {
            console.error('❌ Error fetching user data:', error);
        }

        return null;
    }

    async updateUserData(data) {
        if (!this.currentUser || !this.db) {
            return false;
        }

        try {
            await firebase.firestore().collection('users').doc(this.currentUser.uid).update(data);
            console.log('✅ User data updated successfully');
            return true;
        } catch (error) {
            console.error('❌ Error updating user data:', error);
            return false;
        }
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

    console.log('🔐 AuthManager initialized and logout buttons setup');
});

console.log('✅ Universal Authentication Manager loaded');
