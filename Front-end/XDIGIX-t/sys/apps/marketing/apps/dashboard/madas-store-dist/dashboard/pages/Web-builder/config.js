/**
 * MADAS Website Builder Configuration
 * Production-ready configuration for builder services
 * Firebase removed - using backend API
 */

class BuilderConfig {
    /**
     * Get development settings
     * @returns {Object} Development configuration
     */
    static getDevConfig() {
        return {
            enableDebugLogs: true,
            enableConsoleWarnings: true,
            enablePerformanceMonitoring: true,
            autoSaveInterval: 30000, // 30 seconds
            maxRetries: 3,
            retryDelay: 1000
        };
    }

    /**
     * Get production settings
     * @returns {Object} Production configuration
     */
    static getProdConfig() {
        return {
            enableDebugLogs: false,
            enableConsoleWarnings: false,
            enablePerformanceMonitoring: true,
            autoSaveInterval: 60000, // 1 minute
            maxRetries: 5,
            retryDelay: 2000
        };
    }

    /**
     * Get current environment configuration
     * @returns {Object} Current environment config
     */
    static getCurrentConfig() {
        const isDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('dev');
        
        return isDev ? this.getDevConfig() : this.getProdConfig();
    }

    /**
     * Get theme storage configuration
     * @returns {Object} Theme storage settings
     */
    static getThemeStorageConfig() {
        return {
            collectionName: 'user_themes',
            maxThemesPerUser: 50,
            maxThemeSize: 5 * 1024 * 1024, // 5MB
            compressionEnabled: true,
            backupEnabled: true
        };
    }

    /**
     * Get preview configuration
     * @returns {Object} Preview settings
     */
    static getPreviewConfig() {
        return {
            previewExpiryHours: 24,
            maxPreviewSize: 2 * 1024 * 1024, // 2MB
            enableCompression: true,
            enableCaching: true
        };
    }
}

// Make BuilderConfig globally available
window.BuilderConfig = BuilderConfig;

// Log configuration load
console.log('BuilderConfig loaded successfully');
