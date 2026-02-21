// Firebase Mobile Service
// This service initializes Firebase for the mobile app and provides access to Firebase services

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
    authDomain: "madas-store.firebaseapp.com",
    projectId: "madas-store",
    storageBucket: "madas-store.firebasestorage.app",
    messagingSenderId: "527071300010",
    appId: "1:527071300010:web:70470e2204065b4590583d3"
};

// Firebase instances
let firebaseApp = null;
let firebaseAuth = null;
let firebaseFirestore = null;
let firebaseStorage = null;
let firebaseMessaging = null;

// Initialize Firebase
export async function initializeFirebase() {
    try {
        console.log('🔥 Initializing Firebase for mobile app...');
        
        // Import Firebase modules
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
        const { getAuth, connectAuthEmulator } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
        const { getFirestore, connectFirestoreEmulator } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const { getStorage, connectStorageEmulator } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');
        const { getMessaging, isSupported } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');
        
        // Initialize Firebase app
        firebaseApp = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
        
        // Initialize Firebase Auth
        firebaseAuth = getAuth(firebaseApp);
        console.log('✅ Firebase Auth initialized');
        
        // Initialize Firestore
        firebaseFirestore = getFirestore(firebaseApp);
        console.log('✅ Firestore initialized');
        
        // Initialize Storage
        firebaseStorage = getStorage(firebaseApp);
        console.log('✅ Firebase Storage initialized');
        
        // Initialize Messaging (if supported)
        if (await isSupported()) {
            firebaseMessaging = getMessaging(firebaseApp);
            console.log('✅ Firebase Messaging initialized');
        } else {
            console.log('⚠️ Firebase Messaging not supported on this device');
        }
        
        // Configure offline persistence for Firestore
        await configureOfflinePersistence();
        
        // Setup push notifications
        await setupPushNotifications();
        
        console.log('🎉 Firebase initialization complete');
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        throw error;
    }
}

// Configure offline persistence
async function configureOfflinePersistence() {
    try {
        const { enableNetwork, disableNetwork } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        
        // Enable offline persistence (this is enabled by default in v9+)
        console.log('📱 Offline persistence configured');
        
        // Listen for network status changes
        window.addEventListener('online', () => {
            enableNetwork(firebaseFirestore);
            console.log('🌐 Firestore network enabled');
        });
        
        window.addEventListener('offline', () => {
            disableNetwork(firebaseFirestore);
            console.log('📴 Firestore network disabled');
        });
        
    } catch (error) {
        console.error('❌ Failed to configure offline persistence:', error);
    }
}

// Setup push notifications
async function setupPushNotifications() {
    try {
        if (!firebaseMessaging) return;
        
        const { getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');
        
        // Request permission for notifications
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('🔔 Notification permission granted');
            } else {
                console.log('🔕 Notification permission denied');
                return;
            }
        }
        
        // Get FCM token
        try {
            const token = await getToken(firebaseMessaging, {
                vapidKey: 'YOUR_VAPID_KEY_HERE' // Replace with your VAPID key
            });
            
            if (token) {
                console.log('📱 FCM Token:', token);
                // Store token for later use
                localStorage.setItem('fcmToken', token);
            }
        } catch (error) {
            console.log('⚠️ Could not get FCM token:', error);
        }
        
        // Handle foreground messages
        onMessage(firebaseMessaging, (payload) => {
            console.log('📨 Foreground message received:', payload);
            
            // Show notification
            if (payload.notification) {
                showNotification(payload.notification.title, payload.notification.body);
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to setup push notifications:', error);
    }
}

// Show notification
function showNotification(title, body) {
    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/icon-72x72.png',
            tag: 'madas-notification'
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        // Auto close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);
    }
}

// Get Firebase instances
export function getFirebaseApp() {
    if (!firebaseApp) {
        throw new Error('Firebase app not initialized. Call initializeFirebase() first.');
    }
    return firebaseApp;
}

export function getFirebaseAuth() {
    if (!firebaseAuth) {
        throw new Error('Firebase Auth not initialized. Call initializeFirebase() first.');
    }
    return firebaseAuth;
}

export function getFirebaseFirestore() {
    if (!firebaseFirestore) {
        throw new Error('Firestore not initialized. Call initializeFirebase() first.');
    }
    return firebaseFirestore;
}

export function getFirebaseStorage() {
    if (!firebaseStorage) {
        throw new Error('Firebase Storage not initialized. Call initializeFirebase() first.');
    }
    return firebaseStorage;
}

export function getFirebaseMessaging() {
    if (!firebaseMessaging) {
        console.warn('Firebase Messaging not available');
        return null;
    }
    return firebaseMessaging;
}

// Firebase utility functions
export const FirebaseUtils = {
    // Get current timestamp
    getCurrentTimestamp() {
        return new Date();
    },
    
    // Convert Firestore timestamp to Date
    timestampToDate(timestamp) {
        if (timestamp && timestamp.toDate) {
            return timestamp.toDate();
        }
        return new Date(timestamp);
    },
    
    // Convert Date to Firestore timestamp
    dateToTimestamp(date) {
        return new Date(date);
    },
    
    // Generate unique ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },
    
    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Sanitize string for Firestore
    sanitizeString(str) {
        if (typeof str !== 'string') return '';
        return str.trim().replace(/[<>]/g, '');
    },
    
    // Format currency
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },
    
    // Format date
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
    },
    
    // Format time
    formatTime(date, options = {}) {
        const defaultOptions = {
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
    },
    
    // Get relative time
    getRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        return this.formatDate(date);
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Export Firebase modules for use in other services
export async function getFirebaseModules() {
    const [
        { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile },
        { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter },
        { ref, uploadBytes, getDownloadURL, deleteObject }
    ] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'),
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js')
    ]);
    
    return {
        auth: {
            signInWithEmailAndPassword,
            createUserWithEmailAndPassword,
            signOut,
            onAuthStateChanged,
            updateProfile
        },
        firestore: {
            collection,
            doc,
            getDocs,
            getDoc,
            addDoc,
            updateDoc,
            deleteDoc,
            query,
            where,
            orderBy,
            limit,
            startAfter
        },
        storage: {
            ref,
            uploadBytes,
            getDownloadURL,
            deleteObject
        }
    };
}

// Initialize Firebase when this module is imported
if (typeof window !== 'undefined') {
    // Only initialize in browser environment
    initializeFirebase().catch(error => {
        console.error('Failed to initialize Firebase:', error);
    });
}
