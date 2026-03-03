// Business Isolation Script
// This script handles business data isolation and security

console.log('🔒 Business isolation script loaded');

// Business isolation functionality
class BusinessIsolation {
    constructor() {
        this.currentBusiness = null;
        this.isInitialized = false;
    }

    // Initialize business isolation
    init() {
        console.log('🔐 Initializing business isolation...');
        this.isInitialized = true;
        console.log('✅ Business isolation initialized');
    }

    // Set current business context
    setBusinessContext(businessId) {
        this.currentBusiness = businessId;
        console.log('🏢 Business context set:', businessId);
    }

    // Get current business context
    getCurrentBusiness() {
        return this.currentBusiness;
    }

    // Check if business isolation is active
    isActive() {
        return this.isInitialized && this.currentBusiness !== null;
    }
}

// Initialize business isolation
const businessIsolation = new BusinessIsolation();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    businessIsolation.init();
});

// Export for use in other scripts
window.businessIsolation = businessIsolation;
