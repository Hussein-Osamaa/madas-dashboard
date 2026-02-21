// Firebase-based Permission Checker
// This script reads permissions directly from Firestore for real-time, secure permission checking
// Much more secure than localStorage-based checking
// Runs in background - no loading screen, only redirects if access denied

console.log('🔐 Firebase Permission Checker loaded');

// This will be initialized once Firebase is loaded
(async function() {
    'use strict';
    
    // Wait for Firebase to be available (faster polling)
    const waitForFirebase = () => {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                // Check if Firebase is loaded by looking for firebase SDK scripts or window.firebase
                if (window.firebase || document.querySelector('script[src*="firebase"]') || window.firebaseConfig) {
                    // Minimal delay to ensure Firebase is ready
                    setTimeout(resolve, 50);
                } else {
                    setTimeout(checkFirebase, 10);
                }
            };
            checkFirebase();
        });
    };
    
    // Permission mapping - must match the system
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
    
    function hasPermission(permissions, requiredPermissions) {
        // Convert permissions to array if needed
        let userPermissions = [];
        if (Array.isArray(permissions)) {
            userPermissions = permissions;
        } else if (typeof permissions === "object" && permissions !== null) {
            // Convert old format to new format
            Object.entries(permissions).forEach(([section, actions]) => {
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
    
    async function checkPermissionsFromFirebase() {
        try {
            console.log('🔍 Firebase Permission Checker: Starting real-time check...');
            
            // Wait for Firebase to be ready
            await waitForFirebase();
            
            // Import Firebase modules dynamically
            const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
            const { getFirestore, doc, getDoc, collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
            const { initializeApp, getApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
            
            // Firebase configuration
            const firebaseConfig = {
                apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
                authDomain: "madas-store.firebaseapp.com",
                projectId: "madas-store",
                storageBucket: "madas-store.firebasestorage.app",
                messagingSenderId: "527071300010",
                appId: "1:527071300010:web:7470e2204065b4590583d3"
            };
            
            // Initialize Firebase app if not already initialized
            let app;
            try {
                app = getApp();
            } catch (error) {
                // No app exists, initialize it
                app = initializeApp(firebaseConfig);
            }
            
            const auth = getAuth(app);
            const db = getFirestore(app);
            
            // Use a Promise to wait for auth state synchronously
            const checkAuthAndPermissions = new Promise((resolve) => {
                onAuthStateChanged(auth, async (user) => {
                    if (!user) {
                        console.warn("⚠️ No authenticated user detected; skipping redirect to avoid unexpected logout");
                        resolve(true); // Fail open to avoid disrupting the session
                        return;
                    }
                    
                    try {
                        console.log('👤 Checking permissions for user:', user.email);
                        
                        const currentPage = window.location.pathname;
                        const requiredPermissions = mapPermissionToPage(currentPage);
                        
                        console.log(`📄 Current page: ${currentPage}`);
                        console.log(`🔐 Required permissions: ${requiredPermissions.join(", ") || "none"}`);
                        
                        // No permission required for this page
                        if (requiredPermissions.length === 0) {
                            console.log(`ℹ️ No permission required for this page`);
                            resolve(true);
                            return;
                        }
                        
                        // Check if user is business owner
                        const businessesQuery = query(collection(db, "businesses"), where("owner.userId", "==", user.uid));
                        const businessSnapshot = await getDocs(businessesQuery);
                        
                        if (!businessSnapshot.empty) {
                            console.log('✅ User is business owner - full access granted');
                            resolve(true);
                            return;
                        }
                        
                        // Check if super admin
                        const superAdminEmails = ["hesainosama@gmail.com", "test@example.com"];
                        if (superAdminEmails.includes(user.email)) {
                            console.log('✅ Super admin - full access granted');
                            resolve(true);
                            return;
                        }
                        
                        // User is staff - check permissions from Firestore
                        console.log('🔍 User is staff member - checking permissions from Firestore...');
                        
                        // Find which business this staff member belongs to
                        const allBusinesses = await getDocs(collection(db, "businesses"));
                        let userPermissions = null;
                        let userRole = null;
                        let foundStaff = false;
                        
                        for (const businessDoc of allBusinesses.docs) {
                            const businessId = businessDoc.id;
                            const staffRef = doc(db, 'businesses', businessId, 'staff', user.uid);
                            const staffDoc = await getDoc(staffRef);
                            
                            if (staffDoc.exists()) {
                                const staffData = staffDoc.data();
                                userPermissions = staffData.permissions;
                                userRole = staffData.role;
                                foundStaff = true;
                                
                                console.log('📋 Staff data found:', {
                                    businessId,
                                    role: userRole,
                                    permissions: userPermissions,
                                    permissionsType: Array.isArray(userPermissions) ? 'array' : typeof userPermissions
                                });
                                break;
                            }
                        }
                        
                        if (!foundStaff) {
                            console.error('❌ Staff member not found in any business');
                            const baseUrl = window.location.origin;
                            window.location.href = `${baseUrl}/Dashboard/no-access.html`;
                            resolve(false);
                            return;
                        }
                        
                        // STRICT CHECK for ALL staff members (including admins)
                        // Only business owners and super-admins bypass permission checks
                        console.log('🔒 Performing STRICT permission check for staff member...');
                        if (!hasPermission(userPermissions, requiredPermissions)) {
                            const userPerms = Array.isArray(userPermissions) 
                                ? userPermissions.join(", ") 
                                : JSON.stringify(userPermissions);
                                
                            console.error(`❌ ACCESS DENIED for ${currentPage}`);
                            console.error(`   Required: ${requiredPermissions.join(", ")}`);
                            console.error(`   User has: ${userPerms}`);
                            console.error(`   Redirecting to no-access page...`);
                            
                            const baseUrl = window.location.origin;
                            window.location.href = `${baseUrl}/Dashboard/no-access.html`;
                            resolve(false);
                            return;
                        }
                        
                        console.log(`✅ Permission granted - User has required permissions`);
                        resolve(true);
                        
                    } catch (error) {
                        console.error("❌ Error during permission check:", error);
                        // On error, allow access to prevent blocking (you can change this behavior)
                        resolve(true);
                    }
                });
            });
            
            // Wait for permission check to complete
            const hasAccess = await checkAuthAndPermissions;
            
            if (hasAccess) {
                console.log('✅ Permission check complete - access granted');
            }
            // If access denied, redirect happens in the checkAuthAndPermissions promise
            
        } catch (error) {
            console.error("❌ Error initializing Firebase permission checker:", error);
        }
    }
    
    // Initialize immediately - run in background without blocking
    // No loading screen - page loads normally, only redirects if access denied
    checkPermissionsFromFirebase().catch(error => {
        console.error("❌ Critical error in permission check:", error);
        // On critical error, allow access (fail open) - no action needed
    });
    
    // Expose function globally
    window.checkFirebasePermissions = checkPermissionsFromFirebase;
})();

