// Mobile API for MADAS Dashboard
class MobileAPI {
    constructor() {
        this.isOnline = navigator.onLine;
        this.queue = [];
        this.init();
    }

    init() {
        console.log('📱 Mobile API initialized');
        this.setupEventListeners();
        this.checkConnectivity();
    }

    setupEventListeners() {
        // Online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 Connection restored');
            this.processQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 Connection lost');
        });

        // Visibility change (app backgrounding)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 App backgrounded');
                this.saveState();
            } else {
                console.log('📱 App foregrounded');
                this.restoreState();
            }
        });
    }

    checkConnectivity() {
        if (this.isOnline) {
            console.log('✅ Online - processing queued requests');
            this.processQueue();
        } else {
            console.log('📴 Offline - queuing requests');
        }
    }

    async processQueue() {
        if (!this.isOnline || this.queue.length === 0) return;

        console.log(`🔄 Processing ${this.queue.length} queued requests`);
        
        const requests = [...this.queue];
        this.queue = [];

        for (const request of requests) {
            try {
                await this.executeRequest(request);
            } catch (error) {
                console.error('❌ Request failed:', error);
                // Re-queue failed requests
                this.queue.push(request);
            }
        }
    }

    async executeRequest(request) {
        const { method, url, data, headers } = request;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    queueRequest(method, url, data = null, headers = {}) {
        const request = { method, url, data, headers, timestamp: Date.now() };
        this.queue.push(request);
        
        console.log(`📝 Queued ${method} request to ${url}`);
        
        if (this.isOnline) {
            this.processQueue();
        }
    }

    // API Methods
    async get(url, headers = {}) {
        if (this.isOnline) {
            try {
                const response = await fetch(url, { method: 'GET', headers });
                return response.json();
            } catch (error) {
                console.error('❌ GET request failed:', error);
                this.queueRequest('GET', url, null, headers);
                throw error;
            }
        } else {
            this.queueRequest('GET', url, null, headers);
            throw new Error('Offline - request queued');
        }
    }

    async post(url, data, headers = {}) {
        if (this.isOnline) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify(data)
                });
                return response.json();
            } catch (error) {
                console.error('❌ POST request failed:', error);
                this.queueRequest('POST', url, data, headers);
                throw error;
            }
        } else {
            this.queueRequest('POST', url, data, headers);
            throw new Error('Offline - request queued');
        }
    }

    async put(url, data, headers = {}) {
        if (this.isOnline) {
            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify(data)
                });
                return response.json();
            } catch (error) {
                console.error('❌ PUT request failed:', error);
                this.queueRequest('PUT', url, data, headers);
                throw error;
            }
        } else {
            this.queueRequest('PUT', url, data, headers);
            throw new Error('Offline - request queued');
        }
    }

    async delete(url, headers = {}) {
        if (this.isOnline) {
            try {
                const response = await fetch(url, { method: 'DELETE', headers });
                return response.json();
            } catch (error) {
                console.error('❌ DELETE request failed:', error);
                this.queueRequest('DELETE', url, null, headers);
                throw error;
            }
        } else {
            this.queueRequest('DELETE', url, null, headers);
            throw new Error('Offline - request queued');
        }
    }

    // State Management
    saveState() {
        const state = {
            queue: this.queue,
            timestamp: Date.now()
        };
        localStorage.setItem('mobileAPIState', JSON.stringify(state));
        console.log('💾 Mobile API state saved');
    }

    restoreState() {
        try {
            const state = JSON.parse(localStorage.getItem('mobileAPIState') || '{}');
            if (state.queue && Array.isArray(state.queue)) {
                this.queue = state.queue;
                console.log(`🔄 Restored ${this.queue.length} queued requests`);
                this.processQueue();
            }
        } catch (error) {
            console.error('❌ Failed to restore state:', error);
        }
    }

    // Utility Methods
    isConnected() {
        return this.isOnline;
    }

    getQueueLength() {
        return this.queue.length;
    }

    clearQueue() {
        this.queue = [];
        console.log('🗑️ Queue cleared');
    }

    // Device Information
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            onLine: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled,
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
    }

    // Performance Monitoring
    measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`⏱️ ${name} took ${end - start} milliseconds`);
        return result;
    }
}

// Initialize Mobile API
window.mobileAPI = new MobileAPI();

// Make it globally available
window.MobileAPI = MobileAPI;

console.log('✅ Mobile API loaded');
