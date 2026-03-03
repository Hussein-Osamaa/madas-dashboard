// Mobile API Service - Dashboard Mobile Connectivity
console.log('📱 Mobile API service loaded');

// Mobile API Service Class
class MobileAPIService {
    constructor() {
        this.baseURL = 'https://api.madas.com'; // Replace with your actual API endpoint
        this.apiKey = null;
        this.isConnected = false;
        this.syncInterval = null;
        this.offlineQueue = [];
        this.isInitialized = false;
    }

    // Initialize mobile API service
    async init() {
        console.log('🔌 Initializing mobile API service...');
        
        try {
            // Check if we're in a mobile environment
            this.detectMobileEnvironment();
            
            // Initialize API connection
            await this.initializeConnection();
            
            // Setup offline support
            this.setupOfflineSupport();
            
            // Start data synchronization
            this.startDataSync();
            
            this.isInitialized = true;
            console.log('✅ Mobile API service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize mobile API service:', error);
        }
    }

    // Detect mobile environment
    detectMobileEnvironment() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        const isTouch = 'ontouchstart' in window;
        
        this.mobileInfo = {
            isMobile,
            isPWA,
            isTouch,
            userAgent: navigator.userAgent,
            platform: this.getPlatform()
        };
        
        console.log('📱 Mobile environment detected:', this.mobileInfo);
    }

    // Get platform information
    getPlatform() {
        if (/Android/i.test(navigator.userAgent)) return 'Android';
        if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'iOS';
        if (/Windows/i.test(navigator.userAgent)) return 'Windows';
        if (/Mac/i.test(navigator.userAgent)) return 'macOS';
        if (/Linux/i.test(navigator.userAgent)) return 'Linux';
        return 'Unknown';
    }

    // Initialize API connection
    async initializeConnection() {
        try {
            // Get API key from localStorage or generate one
            this.apiKey = localStorage.getItem('madas_api_key') || this.generateAPIKey();
            localStorage.setItem('madas_api_key', this.apiKey);
            
            // Test connection
            const response = await this.testConnection();
            this.isConnected = response.success;
            
            if (this.isConnected) {
                console.log('✅ Mobile API connection established');
            } else {
                console.warn('⚠️ Mobile API connection failed, using offline mode');
            }
        } catch (error) {
            console.error('❌ API connection error:', error);
            this.isConnected = false;
        }
    }

    // Generate API key
    generateAPIKey() {
        return 'madas_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Test API connection
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/health`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return {
                success: response.ok,
                status: response.status,
                data: await response.json()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Setup offline support
    setupOfflineSupport() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('🌐 Back online - syncing data...');
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            console.log('📴 Gone offline - queuing requests...');
            this.isConnected = false;
        });
        
        // Setup service worker for offline support
        this.setupServiceWorker();
    }

    // Setup service worker
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('🔧 Service worker registered:', registration);
            } catch (error) {
                console.error('❌ Service worker registration failed:', error);
            }
        }
    }

    // Start data synchronization
    startDataSync() {
        // Sync every 30 seconds when online
        this.syncInterval = setInterval(() => {
            if (this.isConnected && navigator.onLine) {
                this.syncData();
            }
        }, 30000);
    }

    // Sync data with server
    async syncData() {
        try {
            console.log('🔄 Syncing data with mobile API...');
            
            // Sync user data
            await this.syncUserData();
            
            // Sync business data
            await this.syncBusinessData();
            
            // Sync inventory data
            await this.syncInventoryData();
            
            // Sync orders data
            await this.syncOrdersData();
            
            console.log('✅ Data sync completed');
        } catch (error) {
            console.error('❌ Data sync failed:', error);
        }
    }

    // Sync user data
    async syncUserData() {
        const userData = {
            userId: localStorage.getItem('currentUser'),
            userInfo: JSON.parse(localStorage.getItem('userInfo') || '{}'),
            lastSync: new Date().toISOString()
        };
        
        return await this.apiCall('POST', '/sync/user', userData);
    }

    // Sync business data
    async syncBusinessData() {
        const businessData = {
            businessId: localStorage.getItem('businessId'),
            businessInfo: JSON.parse(localStorage.getItem('businessInfo') || '{}'),
            lastSync: new Date().toISOString()
        };
        
        return await this.apiCall('POST', '/sync/business', businessData);
    }

    // Sync inventory data
    async syncInventoryData() {
        const inventoryData = {
            products: JSON.parse(localStorage.getItem('products') || '[]'),
            collections: JSON.parse(localStorage.getItem('collections') || '[]'),
            lastSync: new Date().toISOString()
        };
        
        return await this.apiCall('POST', '/sync/inventory', inventoryData);
    }

    // Sync orders data
    async syncOrdersData() {
        const ordersData = {
            orders: JSON.parse(localStorage.getItem('orders') || '[]'),
            lastSync: new Date().toISOString()
        };
        
        return await this.apiCall('POST', '/sync/orders', ordersData);
    }

    // Make API call
    async apiCall(method, endpoint, data = null) {
        const url = `${this.baseURL}${endpoint}`;
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ API call failed:', error);
            
            // Queue for offline sync if offline
            if (!navigator.onLine) {
                this.offlineQueue.push({ method, endpoint, data });
            }
            
            throw error;
        }
    }

    // Sync offline data when back online
    async syncOfflineData() {
        if (this.offlineQueue.length === 0) return;
        
        console.log(`🔄 Syncing ${this.offlineQueue.length} offline requests...`);
        
        for (const request of this.offlineQueue) {
            try {
                await this.apiCall(request.method, request.endpoint, request.data);
            } catch (error) {
                console.error('❌ Failed to sync offline request:', error);
            }
        }
        
        this.offlineQueue = [];
        console.log('✅ Offline data sync completed');
    }

    // Get mobile device info
    getDeviceInfo() {
        return {
            ...this.mobileInfo,
            screenSize: {
                width: window.screen.width,
                height: window.screen.height
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }

    // Send push notification
    async sendPushNotification(title, body, data = {}) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                const notification = new Notification(title, {
                    body,
                    icon: '/assets/img/madas-logo.png',
                    data
                });
                
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
            }
        } catch (error) {
            console.error('❌ Failed to send push notification:', error);
        }
    }

    // Request notification permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    // Get mobile analytics
    getMobileAnalytics() {
        return {
            deviceInfo: this.getDeviceInfo(),
            connectionStatus: this.isConnected,
            offlineQueueSize: this.offlineQueue.length,
            lastSync: localStorage.getItem('lastSync'),
            apiKey: this.apiKey ? 'Set' : 'Not Set'
        };
    }

    // Cleanup
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.isInitialized = false;
        console.log('🧹 Mobile API service destroyed');
    }
}

// Initialize mobile API service
const mobileAPI = new MobileAPIService();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    mobileAPI.init();
});

// Export for use in other scripts
window.mobileAPI = mobileAPI;
window.MobileAPIService = MobileAPIService;
