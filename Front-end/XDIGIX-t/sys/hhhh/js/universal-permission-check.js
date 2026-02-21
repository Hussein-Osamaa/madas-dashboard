// Universal Permission Checker
// This script can be included on any page to enforce permission-based access control
// It reads from localStorage and checks permissions before allowing access

console.log('🔐 Universal Permission Checker loaded');

(function() {
    'use strict';
    
    // Permission mapping - must match shared-auth.js
    const pagePermissionMap = {
        // Dashboard
        "index.html": ["dashboard_view"],
        
        // Orders
        "orders.html": ["order_view"],
        "scan_log.html": ["scan_log"],
        
        // POS
        "pos.html": ["pos_view", "pos_access"],
        
        // Products & Inventory
        "products.html": ["product_view"],
        "Product-details.html": ["product_view"],
        "low-stock.html": ["low_stock_view"],
        "product-reviews.html": ["reviews_view"],
        "collections.html": ["collection_view"],
        "collection-display.html": ["collection_view"],
        
        // Customers
        "Customer.html": ["customer_view"],
        "loyalty.html": ["loyalty_manage"],
        
        // Finance
        "finance.html": ["finance_view"],
        "deposit-money-simple.html": ["finance_deposit"],
        "expenses.html": ["finance_expenses"],
        "reports.html": ["finance_reports"],
        "insights.html": ["finance_insights"],
        "analytics.html": ["analytics_view"],
        // "shares.html": ["finance_shares"], // Removed - not used in finance system
        
        // Settings
        "general-settings.html": ["settings_general"],
        "shipping-delivery-settings.html": ["settings_shipping"],
        "payments-settings.html": ["settings_payments"],
        "integrations-settings.html": ["settings_integrations"],
        "social-media-settings.html": ["settings_social"],
        "plans-billing-settings.html": ["settings_plans"],
        "staff-settings.html": ["staff_view"],
        
        // Website Builder
        "website-builder.html": ["website_builder"],
        "professional-builder-new.html": ["website_builder"],
        "website-templates.html": ["website_templates"],
        "website-pages.html": ["website_builder"],
        "website-settings.html": ["website_builder"],
        "website-preview.html": ["website_builder"],
        "domains.html": ["website_domains"],
        
        // Gamification
        "game-hub.html": ["game_hub"],
        "discount-wheel.html": ["discount_wheel"],
        "madas-pass.html": ["madas_pass"],
        "scratch-card.html": ["scratch_card"],
        "discount-customize.html": ["discount_view"],
        "madas-pass-customization.html": ["madas_pass"],
        "scratch-card-customize.html": ["scratch_card"],
        
        // Notifications
        "notifications.html": ["notifications_view"],
        
        // Profile
        "profile.html": ["profile_view"],
    };
    
    function mapPermissionToPage(pagePath) {
        const pageName = pagePath.split("/").pop() || "";
        return pagePermissionMap[pageName] || [];
    }
    
    function hasPermission(userData, requiredPermissions) {
        // Owners and super-admins have all permissions
        if (userData.role === "owner" || userData.role === "super-admin" || userData.email === "hesainosama@gmail.com") {
            return true;
        }
        
        // Get user permissions (can be array or object format)
        let userPermissions = [];
        if (Array.isArray(userData.permissions)) {
            userPermissions = userData.permissions;
        } else if (typeof userData.permissions === "object" && userData.permissions !== null) {
            // Convert old format to new format
            Object.entries(userData.permissions).forEach(([section, actions]) => {
                if (Array.isArray(actions)) {
                    actions.forEach(action => {
                        userPermissions.push(`${section}_${action}`);
                    });
                }
            });
        }
        
        // Check if user has at least one required permission
        return requiredPermissions.some(permission => userPermissions.includes(permission));
    }
    
    function checkPermissions() {
        try {
            console.log('🔍 Universal Permission Checker: Starting check...');
            const storedUserData = localStorage.getItem("madasUser");
            if (!storedUserData) {
                console.warn("⚠️ No user data in localStorage - permission check skipped");
                return;
            }
            
            const userData = JSON.parse(storedUserData);
            console.log('👤 User data from localStorage:', {
                email: userData.email,
                role: userData.role,
                permissions: userData.permissions,
                permissionsType: Array.isArray(userData.permissions) ? 'array' : typeof userData.permissions
            });
            
            const currentPage = window.location.pathname;
            const requiredPermissions = mapPermissionToPage(currentPage);
            
            console.log(`📄 Current page: ${currentPage}`);
            console.log(`🔐 Required permissions: ${requiredPermissions.join(", ") || "none"}`);
            
            // Only check if there are required permissions for this page
            if (requiredPermissions.length === 0) {
                console.log(`ℹ️ No permission mapping for page: ${currentPage} - allowing access`);
                return;
            }
            
            // Owners and super-admins bypass checks
            const isOwner = userData.role === "owner";
            const isSuperAdmin = userData.role === "super-admin" || userData.email === "hesainosama@gmail.com";
            
            if (isOwner || isSuperAdmin) {
                console.log(`✅ Owner/Super-admin - full access granted`);
                return;
            }
            
            // STRICT CHECK for staff members
            console.log('🔒 Performing STRICT permission check for staff member...');
            if (!hasPermission(userData, requiredPermissions)) {
                const userPerms = Array.isArray(userData.permissions) ? userData.permissions.join(", ") : JSON.stringify(userData.permissions);
                console.error(`❌ ACCESS DENIED for ${currentPage}`);
                console.error(`   Required: ${requiredPermissions.join(", ")}`);
                console.error(`   User has: ${userPerms}`);
                console.error(`   Redirecting to no-access page...`);
                
                // Use absolute path for redirect
                const baseUrl = window.location.origin;
                window.location.href = `${baseUrl}/sys/Dashboard/no-access.html`;
                return;
            }
            
            console.log(`✅ Permission granted for ${currentPage} - User has required permissions`);
        } catch (error) {
            console.error("❌ Error checking permissions:", error);
        }
    }
    
    // Run check when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(checkPermissions, 500); // Give time for auth to initialize
        });
    } else {
        setTimeout(checkPermissions, 500);
    }
    
    // Expose function globally for manual calls
    window.checkPermissionsFromStorage = checkPermissions;
})();

