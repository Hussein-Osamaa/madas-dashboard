/**
 * Production Utilities for MADAS Website Builder
 * Provides logging, error handling, and utility functions
 */

class ProductionUtils {
    constructor() {
        this.config = window.BuilderConfig?.getCurrentConfig() || {
            enableDebugLogs: true,
            enableConsoleWarnings: true
        };
    }

    /**
     * Development logging
     * @param {string} message - Log message
     * @param {any} data - Additional data to log
     */
    devLog(message, data = null) {
        if (this.config.enableDebugLogs) {
            if (data) {
                console.log(`🔧 ${message}`, data);
            } else {
                console.log(`🔧 ${message}`);
            }
        }
    }

    /**
     * Development error logging
     * @param {string} message - Error message
     * @param {any} error - Error object
     */
    devError(message, error = null) {
        if (this.config.enableDebugLogs) {
            if (error) {
                console.error(`❌ ${message}`, error);
            } else {
                console.error(`❌ ${message}`);
            }
        }
    }

    /**
     * Development warning logging
     * @param {string} message - Warning message
     * @param {any} data - Additional data
     */
    devWarn(message, data = null) {
        if (this.config.enableConsoleWarnings) {
            if (data) {
                console.warn(`⚠️ ${message}`, data);
            } else {
                console.warn(`⚠️ ${message}`);
            }
        }
    }

    /**
     * Safe JSON parse with fallback
     * @param {string} jsonString - JSON string to parse
     * @param {any} fallback - Fallback value if parsing fails
     * @returns {any} Parsed object or fallback
     */
    safeJsonParse(jsonString, fallback = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            this.devError('JSON parse error:', error);
            return fallback;
        }
    }

    /**
     * Safe JSON stringify with fallback
     * @param {any} obj - Object to stringify
     * @param {string} fallback - Fallback string if stringify fails
     * @returns {string} JSON string or fallback
     */
    safeJsonStringify(obj, fallback = '{}') {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            this.devError('JSON stringify error:', error);
            return fallback;
        }
    }

    /**
     * Generate unique ID
     * @param {string} prefix - ID prefix
     * @returns {string} Unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
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
    }

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Format file size
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Show loading state
     * @param {string} elementId - Element ID to show loading
     * @param {string} message - Loading message
     */
    showLoading(elementId, message = 'Loading...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; padding: 20px;">
                    <div class="loader" style="
                        width: 20px; height: 20px; border: 2px solid #f3f3f3;
                        border-top: 2px solid #3498db; border-radius: 50%;
                        animation: spin 1s linear infinite; margin-right: 10px;
                    "></div>
                    <span>${message}</span>
                </div>
            `;
        }
    }

    /**
     * Hide loading state
     * @param {string} elementId - Element ID to hide loading
     */
    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '';
        }
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {number} duration - Display duration in milliseconds
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <span class="material-icons text-sm">
                    ${type === 'success' ? 'check_circle' :
                      type === 'error' ? 'error' :
                      type === 'warning' ? 'warning' : 'info'}
                </span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    /**
     * Get current timestamp
     * @returns {string} ISO timestamp
     */
    getCurrentTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    isAuthenticated() {
        try {
            return window.firebase && 
                   window.firebase.auth && 
                   window.firebase.auth.currentUser !== null;
        } catch (error) {
            this.devError('Authentication check failed:', error);
            return false;
        }
    }

    /**
     * Get current user
     * @returns {Object|null} Current user object or null
     */
    getCurrentUser() {
        try {
            return window.firebase?.auth?.currentUser || null;
        } catch (error) {
            this.devError('Get current user failed:', error);
            return null;
        }
    }
}

// Create global instance
window.ProductionUtils = new ProductionUtils();

// Create convenience functions
window.devLog = (message, data) => window.ProductionUtils.devLog(message, data);
window.devError = (message, error) => window.ProductionUtils.devError(message, error);
window.devWarn = (message, data) => window.ProductionUtils.devWarn(message, data);

// Add CSS for loader animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Instantiate and make available globally
window.ProductionUtils = ProductionUtils;
console.log('🔧 ProductionUtils loaded successfully');