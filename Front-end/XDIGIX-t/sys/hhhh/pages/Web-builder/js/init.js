/**
 * Initialization Script for MADAS Website Builder
 * Handles loading screen, service initialization, and error handling
 */

class BuilderInitializer {
    constructor() {
        this.config = window.BuilderConfig?.getCurrentConfig() || {};
        this.utils = window.ProductionUtils ? new window.ProductionUtils() : {
            devLog: (msg, data) => console.log(`🔧 ${msg}`, data),
            devError: (msg, error) => console.error(`❌ ${msg}`, error),
            devWarn: (msg, data) => console.warn(`⚠️ ${msg}`, data)
        };
        this.isInitialized = false;
        this.servicesReady = false;
    }

    /**
     * Initialize the builder
     */
    async init() {
        try {
            this.utils.devLog('🚀 Initializing MADAS Website Builder...');

            // Show loading screen
            this.showLoadingScreen();

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await this.waitForDOM();
            }

            // Wait a bit for services to load
            await this.waitForServices();

            // Initialize services
            await this.initializeServices();

            // Setup event listeners
            this.setupEventListeners();

            // Hide loading screen
            this.hideLoadingScreen();

            this.isInitialized = true;
            this.utils.devLog('✅ Builder initialization complete');

        } catch (error) {
            this.utils.devError('❌ Builder initialization failed:', error);
            this.showErrorScreen(error);
        }
    }

    /**
     * Wait for DOM to be ready
     */
    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Wait for services to be available
     */
    async waitForServices() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait

            const checkServices = () => {
                attempts++;
                
                // Check if at least some services are available
                const hasServices = window.BridgeService || window.StorageService || window.PreviewService || window.SiteManager;
                
                if (hasServices || attempts >= maxAttempts) {
                    this.utils.devLog(`Services check complete (attempt ${attempts}/${maxAttempts})`);
                    resolve();
                } else {
                    setTimeout(checkServices, 100);
                }
            };

            checkServices();
        });
    }

    /**
     * Initialize all services
     */
    async initializeServices() {
        try {
            this.utils.devLog('🔧 Initializing services...');

            // Wait for Firebase to be available
            await this.waitForFirebase();

            // Check if services exist and are properly initialized
            this.checkServiceAvailability();

            this.servicesReady = true;
            this.utils.devLog('✅ All services initialized successfully');

        } catch (error) {
            this.utils.devError('❌ Service initialization failed:', error);
            throw error;
        }
    }

    /**
     * Check service availability and log status
     */
    checkServiceAvailability() {
        const services = [
            { name: 'BridgeService', instance: window.BridgeService },
            { name: 'StorageService', instance: window.StorageService },
            { name: 'PreviewService', instance: window.PreviewService },
            { name: 'SiteManager', instance: window.SiteManager }
        ];

        let availableServices = 0;
        services.forEach(service => {
            if (service.instance) {
                this.utils.devLog(`✅ ${service.name} is available`);
                availableServices++;
            } else {
                this.utils.devWarn(`⚠️ ${service.name} is not available`);
            }
        });

        this.utils.devLog(`📊 Services status: ${availableServices}/${services.length} available`);
        
        // Don't fail if some services are missing - the builder can work with partial services
        if (availableServices === 0) {
            this.utils.devWarn('⚠️ No services available - builder may have limited functionality');
        }
    }

    /**
     * Wait for Firebase to be available
     */
    waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait

            const checkFirebase = () => {
                attempts++;
                
                // Check for Firebase and auth objects
                if (window.firebase && window.auth && window.db) {
                    this.utils.devLog('✅ Firebase is ready');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    this.utils.devError('❌ Firebase initialization timeout');
                    reject(new Error('Firebase initialization timeout'));
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };

            checkFirebase();
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for builder creation
        window.addEventListener('builderCreated', (event) => {
            this.utils.devLog('🎯 Builder instance created:', event.detail);
            this.onBuilderCreated(event.detail.builder);
        });

        // Listen for storage changes
        window.addEventListener('storage', (event) => {
            if (event.key === 'newThemeSaved') {
                this.utils.devLog('📝 New theme saved, updating library...');
                this.notifyThemeLibrary();
            }
        });

        // Listen for authentication changes
        if (window.auth) {
            try {
                // Check if auth has the onAuthStateChanged method
                if (typeof window.auth.onAuthStateChanged === 'function') {
                    window.auth.onAuthStateChanged((user) => {
                        this.utils.devLog('🔐 Auth state changed:', user ? 'authenticated' : 'not authenticated');
                        this.onAuthStateChanged(user);
                    });
                } else {
                    this.utils.devWarn('⚠️ Auth object does not have onAuthStateChanged method');
                }
            } catch (error) {
                this.utils.devWarn('⚠️ Error setting up auth state listener:', error);
            }
        } else {
            this.utils.devWarn('⚠️ Auth object not available');
        }

        // Global error handler
        window.addEventListener('error', (event) => {
            this.utils.devError('🚨 Global error:', event.error);
            this.handleGlobalError(event.error);
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.utils.devError('🚨 Unhandled promise rejection:', event.reason);
            this.handleGlobalError(event.reason);
        });
    }

    /**
     * Handle builder creation
     */
    onBuilderCreated(builder) {
        try {
            this.utils.devLog('🎯 Builder instance ready');
            
            // Setup any additional initialization for the builder
            if (builder && typeof builder.setupCollectionListener === 'function') {
                builder.setupCollectionListener();
            }

        } catch (error) {
            this.utils.devError('❌ Error handling builder creation:', error);
        }
    }

    /**
     * Handle authentication state changes
     */
    onAuthStateChanged(user) {
        try {
            if (user) {
                this.utils.devLog('✅ User authenticated:', user.uid);
                this.utils.showNotification('Welcome back!', 'success');
            } else {
                this.utils.devLog('ℹ️ User not authenticated');
            }
        } catch (error) {
            this.utils.devError('❌ Error handling auth state change:', error);
        }
    }

    /**
     * Notify theme library of changes
     */
    notifyThemeLibrary() {
        try {
            // Dispatch custom event for theme library
            window.dispatchEvent(new CustomEvent('themeUpdated', {
                detail: { timestamp: this.utils.getCurrentTimestamp() }
            }));
        } catch (error) {
            this.utils.devError('❌ Error notifying theme library:', error);
        }
    }

    /**
     * Handle global errors
     */
    handleGlobalError(error) {
        try {
            // Don't show error notifications for known issues
            const knownErrors = [
                'bridgeService',
                'Could not establish connection',
                'runtime.lastError'
            ];

            const errorMessage = error?.message || error?.toString() || '';
            const isKnownError = knownErrors.some(known => 
                errorMessage.includes(known)
            );

            if (!isKnownError) {
                this.utils.showNotification(
                    'An error occurred. Please try again.',
                    'error',
                    5000
                );
            }
        } catch (handlingError) {
            this.utils.devError('❌ Error in error handler:', handlingError);
        }
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Show error screen
     */
    showErrorScreen(error) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: white;">
                    <div style="font-size: 48px; margin-bottom: 24px;">⚠️</div>
                    <h2 style="color: white; margin: 0 0 12px 0; font-size: 24px; font-weight: 700;">
                        Initialization Failed
                    </h2>
                    <p style="color: rgba(255,255,255,0.9); margin: 0 0 24px 0; font-size: 16px;">
                        ${error?.message || 'An unknown error occurred'}
                    </p>
                    <button onclick="window.location.reload()" style="
                        background: white; color: #667eea; padding: 12px 24px;
                        border: none; border-radius: 8px; font-weight: 600;
                        cursor: pointer; transition: all 0.3s ease;
                    " onmouseover="this.style.transform='scale(1.05)'" 
                       onmouseout="this.style.transform='scale(1)'">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const initializer = new BuilderInitializer();
        await initializer.init();
        
        // Make initializer globally available
        window.BuilderInitializer = initializer;
        
    } catch (error) {
        console.error('❌ Failed to initialize builder:', error);
    }
});

console.log('🔧 BuilderInitializer loaded successfully');