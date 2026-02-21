/**
 * Universal Authentication Check
 * Checks both localStorage (from marketing website) and Firebase Auth
 * Use this at the top of every dashboard page
 */

// Check localStorage first (from marketing website login)
function checkLocalStorageAuth() {
    const madasUser = localStorage.getItem('madasUser');
    const madasBusiness = localStorage.getItem('madasBusiness');
    
    if (madasUser && madasBusiness) {
        console.log('✅ User authenticated via marketing website login');
        return {
            authenticated: true,
            user: JSON.parse(madasUser),
            business: JSON.parse(madasBusiness),
            source: 'localStorage'
        };
    }
    
    return {
        authenticated: false,
        source: 'none'
    };
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.checkLocalStorageAuth = checkLocalStorageAuth;
}

// Auto-check on page load
document.addEventListener('DOMContentLoaded', () => {
    const authResult = checkLocalStorageAuth();
    
    if (!authResult.authenticated) {
        console.log('❌ No authentication found, checking Firebase...');
        // Will be handled by onAuthStateChanged in individual pages
    } else {
        console.log('✅ Authentication valid:', authResult.user.email);
        // Store in window for easy access
        window.currentUser = authResult.user;
        window.currentBusiness = authResult.business;
    }
});
