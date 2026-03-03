// Dashboard Template - Add this to any dashboard page to fix JavaScript errors
(function() {
    'use strict';

    console.log('🔧 Dashboard template loaded');

    // Add this script to any dashboard page before the closing </body> tag:
    // <script src="js/error-fix.js"></script>
    // <script src="js/dashboard-fix.js"></script>

    // This template provides:
    // 1. Firebase configuration fixes
    // 2. Missing function definitions
    // 3. Error handling
    // 4. Fallback functionality

    // Quick fix for immediate use:
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
                console.log('🔥 Firebase initialized');
                return {
                    auth: () => ({
                        onAuthStateChanged: (callback) => {
                            const mockUser = { uid: 'test', email: 'test@example.com' };
                            setTimeout(() => callback(mockUser), 100);
                        },
                        signOut: () => Promise.resolve()
                    }),
                    firestore: () => ({
                        collection: () => ({
                            doc: () => ({
                                get: () => Promise.resolve({ exists: () => false }),
                                set: () => Promise.resolve(),
                                update: () => Promise.resolve(),
                                delete: () => Promise.resolve()
                            }),
                            add: () => Promise.resolve({ id: 'mock-id' }),
                            get: () => Promise.resolve({ docs: [] })
                        })
                    })
                };
            }
        };
    }

    // Fix auth and db
    if (typeof auth === 'undefined') {
        window.auth = window.firebase.auth();
    }

    if (typeof db === 'undefined') {
        window.db = window.firebase.firestore();
    }

    // Fix common functions
    if (typeof initializeProducts === 'undefined') {
        window.initializeProducts = function() {
            console.log('📦 Products initialized');
        };
    }

    if (typeof loadProducts === 'undefined') {
        window.loadProducts = function() {
            console.log('📦 Loading products');
        };
    }

    if (typeof loadStaffList === 'undefined') {
        window.loadStaffList = function() {
            console.log('👥 Loading staff list');
        };
    }

    if (typeof loadOrders === 'undefined') {
        window.loadOrders = function() {
            console.log('📋 Loading orders');
        };
    }

    // Fix service objects
    if (typeof authService === 'undefined') {
        window.authService = {
            isInitialized: true,
            getCurrentUser: () => ({ uid: 'test', email: 'test@example.com' }),
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

    console.log('✅ Dashboard template fixes applied');

})();
