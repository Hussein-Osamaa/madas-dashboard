/**
 * Products Page Utilities
 * Helper functions for products.html
 * Version: 1.0.0
 */

// ============================================
// DEBOUNCING & THROTTLING
// ============================================

/**
 * Debounce function - delays execution until after wait time
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
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
 * Throttle function - limits execution to once per wait time
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================
// LOADING STATES
// ============================================

/**
 * Create loading overlay element
 */
export function createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
    overlay.innerHTML = `
        <div class="bg-white rounded-lg p-6 shadow-xl">
            <div class="flex items-center space-x-4">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span id="loadingMessage" class="text-gray-700 font-medium">Loading...</span>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

/**
 * Show loading overlay with message
 * @param {string} message - Loading message to display
 */
export function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = document.getElementById('loadingMessage');

    if (messageEl) messageEl.textContent = message;
    if (overlay) overlay.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
export function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Create toast container element
 */
export function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(container);
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 */
export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full flex items-center space-x-2`;
    toast.innerHTML = `
        <span class="text-xl font-bold">${icons[type]}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Slide in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);

    // Slide out and remove
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show success toast
 * @param {string} message - Success message
 */
export function showSuccess(message) {
    showToast(message, 'success');
}

/**
 * Show error toast
 * @param {string} message - Error message
 */
export function showError(message) {
    showToast(message, 'error');
}

/**
 * Show warning toast
 * @param {string} message - Warning message
 */
export function showWarning(message) {
    showToast(message, 'warning');
}

/**
 * Show info toast
 * @param {string} message - Info message
 */
export function showInfo(message) {
    showToast(message, 'info');
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate product data
 * @param {Object} data - Product data to validate
 * @returns {boolean} True if valid
 * @throws {Error} Validation error
 */
export function validateProductData(data) {
    const errors = [];

    // Required fields
    if (!data.name || data.name.trim().length === 0) {
        errors.push('Product name is required');
    }

    if (!data.price || parseFloat(data.price) <= 0) {
        errors.push('Valid price is required');
    }

    if (!data.category) {
        errors.push('Category is required');
    }

    if (!data.unlimitedStock && (!data.stock || parseInt(data.stock) < 0)) {
        errors.push('Valid stock quantity is required');
    }

    // Length validations
    if (data.name && data.name.length > 100) {
        errors.push('Product name must be less than 100 characters');
    }

    if (data.description && data.description.length > 1000) {
        errors.push('Description must be less than 1000 characters');
    }

    // Price validation
    if (data.price && parseFloat(data.price) > 1000000) {
        errors.push('Price must be less than 1,000,000');
    }

    // Stock validation
    if (data.stock && parseInt(data.stock) > 1000000) {
        errors.push('Stock quantity must be less than 1,000,000');
    }

    if (errors.length > 0) {
        throw new Error(errors.join(', '));
    }

    return true;
}

/**
 * Sanitize HTML string to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} True if valid
 * @throws {Error} Validation error
 */
export function validateImageFile(file, maxSizeMB = 5) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
        throw new Error(`File ${file.name} is too large. Maximum size is ${maxSizeMB}MB.`);
    }

    if (!file.type.startsWith('image/')) {
        throw new Error(`File ${file.name} is not an image.`);
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not supported. Use JPG, PNG, GIF, or WebP.`);
    }

    return true;
}

// ============================================
// IMAGE UTILITIES
// ============================================

/**
 * Lazy load images using Intersection Observer
 */
export function lazyLoadImages() {
    const lazyImages = document.querySelectorAll('.lazy-image');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy-image');
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for browsers without Intersection Observer
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
            img.classList.remove('lazy-image');
        });
    }
}

/**
 * Convert base64 to Blob
 * @param {string} base64 - Base64 string
 * @returns {Promise<Blob>} Blob object
 */
export async function base64ToBlob(base64) {
    const response = await fetch(base64);
    return response.blob();
}

/**
 * Compress image before upload
 * @param {File} file - Image file
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>} Compressed image blob
 */
export function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(resolve, 'image/jpeg', quality);
            };

            img.onerror = reject;
            img.src = e.target.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type (short, long, relative)
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'short') {
    const d = new Date(date);

    if (format === 'relative') {
        return getRelativeTime(d);
    }

    if (format === 'long') {
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    return d.toLocaleDateString('en-US');
}

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date} date - Date to compare
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// ============================================
// LOCAL STORAGE UTILITIES
// ============================================

/**
 * Save to localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} Success status
 */
export function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        showError('Failed to save data locally');
        return false;
    }
}

/**
 * Load from localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Stored value or default
 */
export function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

/**
 * Remove from localStorage
 * @param {string} key - Storage key
 */
export function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Failed to remove from localStorage:', error);
        return false;
    }
}

// ============================================
// EXCEL UTILITIES
// ============================================

/**
 * Export data to Excel
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Output filename
 * @param {string} sheetName - Sheet name
 */
export function exportToExcel(data, filename = 'export.xlsx', sheetName = 'Sheet1') {
    try {
        if (!window.XLSX) {
            throw new Error('XLSX library not loaded. Please include SheetJS library.');
        }

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Generate file
        XLSX.writeFile(wb, filename);

        showSuccess('Excel file downloaded successfully!');
        return true;

    } catch (error) {
        console.error('Failed to export to Excel:', error);
        showError('Failed to export to Excel: ' + error.message);
        return false;
    }
}

/**
 * Read Excel file
 * @param {File} file - Excel file
 * @returns {Promise<Array>} Array of objects from first sheet
 */
export function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                if (!window.XLSX) {
                    throw new Error('XLSX library not loaded');
                }

                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                resolve(jsonData);

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showSuccess('Copied to clipboard!');
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        showError('Failed to copy to clipboard');
        return false;
    }
}

/**
 * Download text as file
 * @param {string} content - File content
 * @param {string} filename - Output filename
 * @param {string} mimeType - MIME type
 */
export function downloadAsFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Initialize all utility components
 */
export function initializeUtilities() {
    createLoadingOverlay();
    createToastContainer();
    console.log('✅ Utilities initialized');
}

// ============================================
// AUTO-INITIALIZE
// ============================================

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUtilities);
} else {
    initializeUtilities();
}
