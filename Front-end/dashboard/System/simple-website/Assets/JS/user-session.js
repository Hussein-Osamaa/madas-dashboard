// User Session Management System
class UserSession {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    // Initialize session
    init() {
        this.loadUserSession();
        this.checkAuthentication();
    }

    // Load user session from localStorage
    loadUserSession() {
        const sessionData = localStorage.getItem('currentUser');
        if (sessionData) {
            this.currentUser = JSON.parse(sessionData);
            console.log('👤 User session loaded:', this.currentUser);
        }
    }

    // Check if user is authenticated
    checkAuthentication() {
        if (!this.currentUser || !this.currentUser.isAuthenticated) {
            console.log('❌ No valid session found');
            this.redirectToLogin();
            return false;
        }
        return true;
    }

    // Get current user data
    getUser() {
        return this.currentUser;
    }

    // Get user ID
    getUserId() {
        return this.currentUser ? this.currentUser.userId : null;
    }

    // Get user email
    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }

    // Get user name
    getUserName() {
        if (!this.currentUser) return null;
        return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }

    // Get user company
    getUserCompany() {
        return this.currentUser ? this.currentUser.company : null;
    }

    // Get user plan
    getUserPlan() {
        return this.currentUser ? this.currentUser.plan : null;
    }

    // Get user-specific data
    getUserData() {
        if (!this.currentUser) return null;
        
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        const userData = clients.find(client => client.id === this.currentUser.userId);
        
        return userData;
    }

    // Update user data
    updateUserData(updatedData) {
        if (!this.currentUser) return false;
        
        const clients = JSON.parse(localStorage.getItem('nextgen_clients') || '[]');
        const userIndex = clients.findIndex(client => client.id === this.currentUser.userId);
        
        if (userIndex !== -1) {
            clients[userIndex] = { ...clients[userIndex], ...updatedData };
            localStorage.setItem('nextgen_clients', JSON.stringify(clients));
            
            // Update session
            this.currentUser = { ...this.currentUser, ...updatedData };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            console.log('✅ User data updated successfully');
            return true;
        }
        
        return false;
    }

    // Logout user
    logout() {
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        console.log('👋 User logged out');
        this.redirectToLogin();
    }

    // Redirect to login page
    redirectToLogin() {
        window.location.href = '../login.html';
    }

    // Check session validity
    isSessionValid() {
        if (!this.currentUser) return false;
        
        const loginTime = new Date(this.currentUser.loginTime);
        const now = new Date();
        const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
        
        // Session expires after 24 hours
        if (hoursSinceLogin > 24) {
            this.logout();
            return false;
        }
        
        return true;
    }

    // Display user info in dashboard
    displayUserInfo() {
        if (!this.currentUser) return;
        
        // Update any elements that should show user info
        const userInfoElements = document.querySelectorAll('[data-user-info]');
        userInfoElements.forEach(element => {
            const infoType = element.getAttribute('data-user-info');
            switch (infoType) {
                case 'name':
                    element.textContent = this.getUserName();
                    break;
                case 'email':
                    element.textContent = this.getUserEmail();
                    break;
                case 'company':
                    element.textContent = this.getUserCompany();
                    break;
                case 'plan':
                    element.textContent = this.getUserPlan();
                    break;
                case 'id':
                    element.textContent = this.getUserId();
                    break;
            }
        });
    }

    // Get user-specific dashboard data
    getDashboardData() {
        const userData = this.getUserData();
        if (!userData) return null;
        
        return {
            personalInfo: {
                id: userData.id,
                name: `${userData.firstName} ${userData.lastName}`,
                email: userData.email,
                company: userData.company,
                phone: userData.phone
            },
            subscription: {
                plan: userData.plan,
                status: userData.status,
                joinedDate: userData.createdAt,
                newsletter: userData.newsletter
            },
            access: this.getUserAccess(userData.plan)
        };
    }

    // Get user access based on plan
    getUserAccess(plan) {
        const planAccess = {
            starter: {
                features: ['Basic Dashboard', 'Profile Management', 'Basic Support'],
                limitations: ['Limited Analytics', 'Basic Reports']
            },
            professional: {
                features: ['Full Dashboard', 'Advanced Analytics', 'Priority Support', 'API Access'],
                limitations: ['No White Label']
            },
            enterprise: {
                features: ['Full Dashboard', 'Advanced Analytics', 'Priority Support', 'API Access', 'White Label', 'Custom Integrations'],
                limitations: []
            }
        };
        
        return planAccess[plan] || planAccess.starter;
    }
}

// Initialize user session when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.userSession = new UserSession();
    
    // Display user info if authenticated
    if (window.userSession.checkAuthentication()) {
        window.userSession.displayUserInfo();
        console.log('🎯 Dashboard loaded for user:', window.userSession.getUserName());
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserSession;
}
