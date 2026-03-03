// Dashboard User Management
document.addEventListener('DOMContentLoaded', function() {
    // Wait for user session to be initialized
    setTimeout(() => {
        if (window.userSession && window.userSession.checkAuthentication()) {
            initializeUserDashboard();
        }
    }, 100);
});

function initializeUserDashboard() {
    const userData = window.userSession.getDashboardData();
    
    // Add logout functionality
    addLogoutFunctionality();
    
    // Show plan-specific features
    showPlanSpecificFeatures(userData.subscription.plan);
}


function getPlanColor(plan) {
    const colors = {
        starter: '#10b981',
        professional: '#3b82f6',
        enterprise: '#a855f7'
    };
    return colors[plan] || colors.starter;
}

function addLogoutFunctionality() {
    // The Dashboard already has its own logout functionality
    // This function is kept for compatibility but doesn't need to do anything
    // since the Dashboard's existing logout button will handle the logout
    console.log('✅ Logout functionality is handled by the Dashboard\'s existing logout button');
}

function showPlanSpecificFeatures(plan) {
    console.log(`🎯 Loading features for ${plan} plan`);
    
    // You can add plan-specific feature toggles here
    const features = {
        starter: {
            available: ['Basic Dashboard', 'Profile Management', 'Basic Reports'],
            restricted: ['Advanced Analytics', 'API Access', 'White Label']
        },
        professional: {
            available: ['Full Dashboard', 'Advanced Analytics', 'API Access', 'Priority Support'],
            restricted: ['White Label', 'Custom Integrations']
        },
        enterprise: {
            available: ['Full Dashboard', 'Advanced Analytics', 'API Access', 'Priority Support', 'White Label', 'Custom Integrations'],
            restricted: []
        }
    };
    
    const userFeatures = features[plan] || features.starter;
    
    console.log('✅ Available features:', userFeatures.available);
    if (userFeatures.restricted.length > 0) {
        console.log('❌ Restricted features:', userFeatures.restricted);
    }
    
    // You can implement feature toggling based on plan here
    // For example, hide/show certain dashboard sections
}

// Make functions available globally
window.initializeUserDashboard = initializeUserDashboard;
