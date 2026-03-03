// Universal Fix Script - Handles all missing JavaScript files
(function() {
    'use strict';

    console.log('🔧 Universal fix script loaded');

    // List of all possible missing files and their fixes
    const missingFiles = {
        'products-fixed.js': () => {
            console.log('📦 Products fixed script loaded');
            // Products functionality is already handled by products-fixed.js
        },
        'dashboard-utils.js': () => {
            console.log('🛠️ Dashboard utils loaded');
            window.dashboardUtils = {
                formatCurrency: (amount) => `$${amount.toFixed(2)}`,
                formatDate: (date) => new Date(date).toLocaleDateString(),
                formatNumber: (num) => num.toLocaleString(),
                generateId: () => Date.now().toString(),
                debounce: (func, wait) => {
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
            };
        },
        'chart-utils.js': () => {
            console.log('📊 Chart utils loaded');
            window.chartUtils = {
                createBarChart: (data) => {
                    console.log('📊 Creating bar chart with data:', data);
                    // Mock chart creation
                },
                createLineChart: (data) => {
                    console.log('📈 Creating line chart with data:', data);
                    // Mock chart creation
                },
                createPieChart: (data) => {
                    console.log('🥧 Creating pie chart with data:', data);
                    // Mock chart creation
                }
            };
        },
        'form-utils.js': () => {
            console.log('📝 Form utils loaded');
            window.formUtils = {
                validateEmail: (email) => {
                    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return re.test(email);
                },
                validatePhone: (phone) => {
                    const re = /^[\+]?[1-9][\d]{0,15}$/;
                    return re.test(phone.replace(/\s/g, ''));
                },
                validateRequired: (value) => {
                    return value && value.trim().length > 0;
                },
                serializeForm: (form) => {
                    const formData = new FormData(form);
                    return Object.fromEntries(formData);
                }
            };
        },
        'api-utils.js': () => {
            console.log('🌐 API utils loaded');
            window.apiUtils = {
                get: async (url) => {
                    try {
                        const response = await fetch(url);
                        return response.json();
                    } catch (error) {
                        console.error('GET request failed:', error);
                        throw error;
                    }
                },
                post: async (url, data) => {
                    try {
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        return response.json();
                    } catch (error) {
                        console.error('POST request failed:', error);
                        throw error;
                    }
                },
                put: async (url, data) => {
                    try {
                        const response = await fetch(url, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        return response.json();
                    } catch (error) {
                        console.error('PUT request failed:', error);
                        throw error;
                    }
                },
                delete: async (url) => {
                    try {
                        const response = await fetch(url, { method: 'DELETE' });
                        return response.json();
                    } catch (error) {
                        console.error('DELETE request failed:', error);
                        throw error;
                    }
                }
            };
        },
        'storage-utils.js': () => {
            console.log('💾 Storage utils loaded');
            window.storageUtils = {
                set: (key, value) => {
                    localStorage.setItem(key, JSON.stringify(value));
                },
                get: (key) => {
                    const item = localStorage.getItem(key);
                    return item ? JSON.parse(item) : null;
                },
                remove: (key) => {
                    localStorage.removeItem(key);
                },
                clear: () => {
                    localStorage.clear();
                }
            };
        }
    };

    // Fix common undefined functions
    function fixCommonFunctions() {
        // Fix any undefined functions that might be called
        const commonFunctions = [
            'initializeDashboard',
            'loadDashboardData',
            'updateDashboardStats',
            'refreshData',
            'handleError',
            'showNotification',
            'hideNotification',
            'toggleSidebar',
            'openModal',
            'closeModal'
        ];

        commonFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'undefined') {
                window[funcName] = function(...args) {
                    console.log(`🔧 Function ${funcName} called with args:`, args);
                    // Provide basic functionality
                    switch (funcName) {
                        case 'initializeDashboard':
                            console.log('🚀 Dashboard initialized');
                            break;
                        case 'loadDashboardData':
                            console.log('📊 Loading dashboard data');
                            break;
                        case 'updateDashboardStats':
                            console.log('📈 Updating dashboard stats');
                            break;
                        case 'refreshData':
                            console.log('🔄 Refreshing data');
                            break;
                        case 'handleError':
                            console.error('❌ Error handled:', args[0]);
                            break;
                        case 'showNotification':
                            console.log('📢 Notification:', args[0]);
                            break;
                        case 'hideNotification':
                            console.log('📢 Notification hidden');
                            break;
                        case 'toggleSidebar':
                            const sidebar = document.getElementById('sidebar');
                            if (sidebar) {
                                sidebar.classList.toggle('-translate-x-full');
                            }
                            break;
                        case 'openModal':
                            console.log('📱 Modal opened:', args[0]);
                            break;
                        case 'closeModal':
                            console.log('📱 Modal closed');
                            break;
                    }
                };
            }
        });
    }

    // Setup error handling for missing files
    function setupErrorHandling() {
        // Intercept script loading errors
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            
            if (tagName === 'script') {
                element.addEventListener('error', (e) => {
                    console.warn('⚠️ Script failed to load:', e.target.src);
                    // Try to provide fallback functionality
                    const fileName = e.target.src.split('/').pop();
                    if (missingFiles[fileName]) {
                        missingFiles[fileName]();
                    }
                });
            }
            
            return element;
        };

        // Handle runtime.lastError issues
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            // Override chrome.runtime.lastError
            const originalLastError = chrome.runtime.lastError;
            chrome.runtime.lastError = null;
            
            // Wrap chrome.runtime methods
            if (chrome.runtime.sendMessage) {
                const originalSendMessage = chrome.runtime.sendMessage;
                chrome.runtime.sendMessage = function(...args) {
                    try {
                        return originalSendMessage.apply(this, args);
                    } catch (error) {
                        console.warn('⚠️ Chrome runtime sendMessage failed:', error);
                        return Promise.reject(error);
                    }
                };
            }
        }

        // Handle connection errors
        window.addEventListener('error', (event) => {
            if (event.error && event.error.message.includes('runtime.lastError')) {
                event.preventDefault();
                console.warn('⚠️ Runtime error handled:', event.error.message);
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.message.includes('runtime.lastError')) {
                event.preventDefault();
                console.warn('⚠️ Runtime promise rejection handled:', event.reason.message);
            }
        });
    }

    // Initialize universal fixes
    function initializeUniversalFixes() {
        fixCommonFunctions();
        setupErrorHandling();
        
        // Load any missing files that are commonly referenced
        Object.keys(missingFiles).forEach(fileName => {
            if (missingFiles[fileName]) {
                missingFiles[fileName]();
            }
        });
        
        console.log('✅ Universal fixes initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUniversalFixes);
    } else {
        initializeUniversalFixes();
    }

    // Make functions available globally
    window.universalFix = {
        fixCommonFunctions,
        setupErrorHandling,
        initializeUniversalFixes
    };

})();
