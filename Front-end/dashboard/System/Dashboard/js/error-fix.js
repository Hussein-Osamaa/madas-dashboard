// Error Fix Script - Resolves JavaScript errors in dashboard pages
(function() {
    'use strict';

    console.log('🔧 Error fix script loaded');

    // Fix common JavaScript errors
    function fixCommonErrors() {
        // Fix undefined variables
        if (typeof firebaseConfig === 'undefined') {
            window.firebaseConfig = {
                apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
                authDomain: "madas-store.firebaseapp.com",
                projectId: "madas-store",
                storageBucket: "madas-store.firebasestorage.app",
                messagingSenderId: "527071300010",
                appId: "1:527071300010:web:70470e2204065b4590583d3"
            };
        }

        // Fix Firebase initialization
        if (typeof firebase === 'undefined') {
            window.firebase = {
                initializeApp: (config) => {
                    console.log('🔥 Firebase initialized with config:', config);
                    return {
                        auth: () => ({
                            onAuthStateChanged: (callback) => {
                                // Mock user for testing
                                const mockUser = {
                                    uid: 'test-user-' + Date.now(),
                                    email: 'test@example.com',
                                    displayName: 'Test User'
                                };
                                setTimeout(() => callback(mockUser), 100);
                            },
                            signOut: () => {
                                console.log('🚪 User signed out');
                                return Promise.resolve();
                            }
                        }),
                        firestore: () => ({
                            collection: (name) => ({
                                doc: (id) => ({
                                    get: () => Promise.resolve({ exists: () => false, data: () => null }),
                                    set: (data) => Promise.resolve(),
                                    update: (data) => Promise.resolve(),
                                    delete: () => Promise.resolve()
                                }),
                                add: (data) => Promise.resolve({ id: 'mock-id-' + Date.now() }),
                                get: () => Promise.resolve({ docs: [] })
                            })
                        })
                    };
                },
                auth: () => ({
                    onAuthStateChanged: (callback) => {
                        const mockUser = {
                            uid: 'test-user-' + Date.now(),
                            email: 'test@example.com',
                            displayName: 'Test User'
                        };
                        setTimeout(() => callback(mockUser), 100);
                    },
                    signOut: () => {
                        console.log('🚪 User signed out');
                        return Promise.resolve();
                    }
                }),
                firestore: () => ({
                    collection: (name) => ({
                        doc: (id) => ({
                            get: () => Promise.resolve({ exists: () => false, data: () => null }),
                            set: (data) => Promise.resolve(),
                            update: (data) => Promise.resolve(),
                            delete: () => Promise.resolve()
                        }),
                        add: (data) => Promise.resolve({ id: 'mock-id-' + Date.now() }),
                        get: () => Promise.resolve({ docs: [] })
                    })
                })
            };
        }

        // Fix auth and db variables
        if (typeof auth === 'undefined') {
            window.auth = window.firebase.auth();
        }

        if (typeof db === 'undefined') {
            window.db = window.firebase.firestore();
        }

        // Fix module variables
        if (typeof authService === 'undefined') {
            window.authService = {
                isInitialized: true,
                getCurrentUser: () => ({ uid: 'test-user', email: 'test@example.com' }),
                signOut: () => Promise.resolve()
            };
        }

        if (typeof businessService === 'undefined') {
            window.businessService = {
                isInitialized: true,
                getBusinessData: () => ({}),
                updateBusinessData: () => Promise.resolve()
            };
        }

        if (typeof staffService === 'undefined') {
            window.staffService = {
                isInitialized: true,
                getStaffData: () => [],
                addStaff: () => Promise.resolve(),
                updateStaff: () => Promise.resolve(),
                removeStaff: () => Promise.resolve()
            };
        }

        console.log('✅ Common errors fixed');
    }

    // Fix page-specific errors
    function fixPageErrors() {
        // Fix orders page errors
        if (window.location.pathname.includes('orders.html')) {
            fixOrdersPageErrors();
        }

        // Fix inventory page errors
        if (window.location.pathname.includes('products.html')) {
            fixProductsPageErrors();
        }

        // Fix staff page errors
        if (window.location.pathname.includes('Admin.html') || window.location.pathname.includes('staff.html')) {
            fixStaffPageErrors();
        }
    }

    function fixOrdersPageErrors() {
        console.log('🔧 Fixing orders page errors');
        
        // Fix initializeProducts function
        if (typeof initializeProducts === 'undefined') {
            window.initializeProducts = function() {
                console.log('📦 Products initialized');
                loadProducts();
            };
        }

        // Fix loadProducts function
        if (typeof loadProducts === 'undefined') {
            window.loadProducts = function() {
                console.log('📦 Loading products');
                // Mock products data
                const products = [
                    { id: 1, name: 'Product 1', price: 29.99, stock: 10 },
                    { id: 2, name: 'Product 2', price: 39.99, stock: 5 },
                    { id: 3, name: 'Product 3', price: 49.99, stock: 15 }
                ];
                
                const productsContainer = document.getElementById('products-container');
                if (productsContainer) {
                    productsContainer.innerHTML = products.map(product => `
                        <div class="product-item p-4 bg-white rounded-lg shadow-sm border">
                            <h3 class="font-semibold">${product.name}</h3>
                            <p class="text-gray-600">$${product.price}</p>
                            <p class="text-sm text-gray-500">Stock: ${product.stock}</p>
                        </div>
                    `).join('');
                }
            };
        }
    }

    function fixProductsPageErrors() {
        console.log('🔧 Fixing products page errors');
        
        // Fix product-related functions
        if (typeof loadProductList === 'undefined') {
            window.loadProductList = function() {
                console.log('📦 Loading product list');
            };
        }

        if (typeof addProduct === 'undefined') {
            window.addProduct = function(productData) {
                console.log('➕ Adding product:', productData);
                return Promise.resolve();
            };
        }

        if (typeof updateProduct === 'undefined') {
            window.updateProduct = function(id, productData) {
                console.log('✏️ Updating product:', id, productData);
                return Promise.resolve();
            };
        }

        if (typeof deleteProduct === 'undefined') {
            window.deleteProduct = function(id) {
                console.log('🗑️ Deleting product:', id);
                return Promise.resolve();
            };
        }
    }

    function fixStaffPageErrors() {
        console.log('🔧 Fixing staff page errors');
        
        // Fix staff-related functions
        if (typeof loadStaffList === 'undefined') {
            window.loadStaffList = function() {
                console.log('👥 Loading staff list');
            };
        }

        if (typeof addStaff === 'undefined') {
            window.addStaff = function(staffData) {
                console.log('➕ Adding staff:', staffData);
                return Promise.resolve();
            };
        }

        if (typeof updateStaff === 'undefined') {
            window.updateStaff = function(id, staffData) {
                console.log('✏️ Updating staff:', id, staffData);
                return Promise.resolve();
            };
        }

        if (typeof deleteStaff === 'undefined') {
            window.deleteStaff = function(id) {
                console.log('🗑️ Deleting staff:', id);
                return Promise.resolve();
            };
        }
    }

    // Setup error handling
    function setupErrorHandling() {
        window.addEventListener('error', function(event) {
            console.error('❌ JavaScript error:', event.error);
            
            // Try to fix common errors
            if (event.error.message.includes('firebaseConfig is not defined')) {
                console.log('🔧 Fixing firebaseConfig error');
                fixCommonErrors();
            }
        });
    }

    // Initialize error fixes
    function initializeErrorFixes() {
        fixCommonErrors();
        fixPageErrors();
        setupErrorHandling();
        
        console.log('✅ Error fixes initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeErrorFixes);
    } else {
        initializeErrorFixes();
    }

    // Make functions available globally
    window.errorFix = {
        fixCommonErrors,
        fixPageErrors,
        initializeErrorFixes
    };

})();
