// Runtime Error Fix Script - Handles runtime.lastError and connection issues
(function() {
    'use strict';

    console.log('🔧 Runtime error fix script loaded');

    // Fix runtime.lastError issues
    function fixRuntimeErrors() {
        // Override chrome.runtime.lastError if it exists
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            const originalLastError = chrome.runtime.lastError;
            
            // Wrap chrome.runtime methods to handle connection errors
            const originalSendMessage = chrome.runtime.sendMessage;
            if (originalSendMessage) {
                chrome.runtime.sendMessage = function(...args) {
                    try {
                        return originalSendMessage.apply(this, args);
                    } catch (error) {
                        console.warn('⚠️ Chrome runtime sendMessage failed:', error);
                        return Promise.reject(error);
                    }
                };
            }

            // Handle connection errors
            if (chrome.runtime.onConnect) {
                chrome.runtime.onConnect.addListener((port) => {
                    port.onDisconnect.addListener(() => {
                        console.log('🔌 Port disconnected');
                    });
                });
            }
        }

        // Fix service worker connection issues
        fixServiceWorkerConnection();
        
        // Fix extension communication issues
        fixExtensionCommunication();
    }

    // Fix service worker connection issues
    function fixServiceWorkerConnection() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('📨 Service Worker message:', event.data);
            });

            navigator.serviceWorker.addEventListener('error', (event) => {
                console.error('❌ Service Worker error:', event.error);
            });

            // Handle service worker registration
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('✅ Service Worker registered:', registration);
                })
                .catch((error) => {
                    console.warn('⚠️ Service Worker registration failed:', error);
                });
        }
    }

    // Fix extension communication issues
    function fixExtensionCommunication() {
        // Handle browser extension communication
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            // Listen for extension messages
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                console.log('📨 Extension message received:', request);
                
                try {
                    // Handle the message
                    handleExtensionMessage(request, sender, sendResponse);
                } catch (error) {
                    console.error('❌ Error handling extension message:', error);
                    sendResponse({ error: error.message });
                }
                
                return true; // Keep the message channel open
            });
        }
    }

    // Handle extension messages
    function handleExtensionMessage(request, sender, sendResponse) {
        switch (request.type) {
            case 'GET_DASHBOARD_DATA':
                sendResponse({ 
                    success: true, 
                    data: getDashboardData() 
                });
                break;
                
            case 'UPDATE_DASHBOARD_DATA':
                updateDashboardData(request.data);
                sendResponse({ success: true });
                break;
                
            case 'GET_USER_INFO':
                sendResponse({ 
                    success: true, 
                    user: getUserInfo() 
                });
                break;
                
            default:
                sendResponse({ 
                    success: false, 
                    error: 'Unknown message type' 
                });
        }
    }

    // Get dashboard data
    function getDashboardData() {
        return {
            stats: {
                totalSales: 12500,
                totalOrders: 45,
                totalCustomers: 120,
                totalProducts: 89
            },
            recentActivity: [
                { type: 'order', message: 'New order received', time: '2 minutes ago' },
                { type: 'customer', message: 'New customer registered', time: '15 minutes ago' }
            ]
        };
    }

    // Update dashboard data
    function updateDashboardData(data) {
        console.log('📊 Updating dashboard data:', data);
        // Implement data update logic
    }

    // Get user info
    function getUserInfo() {
        return {
            id: 'user-123',
            name: 'Dashboard User',
            email: 'user@example.com',
            role: 'admin'
        };
    }

    // Fix connection timeout issues
    function fixConnectionTimeouts() {
        // Set up connection timeout handling
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            const timeout = options.timeout || 10000; // 10 second timeout
            
            return Promise.race([
                originalFetch(url, options),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), timeout)
                )
            ]);
        };
    }

    // Fix WebSocket connection issues
    function fixWebSocketConnections() {
        if (window.WebSocket) {
            const originalWebSocket = window.WebSocket;
            window.WebSocket = function(url, protocols) {
                const ws = new originalWebSocket(url, protocols);
                
                ws.addEventListener('error', (event) => {
                    console.warn('⚠️ WebSocket error:', event);
                });
                
                ws.addEventListener('close', (event) => {
                    console.log('🔌 WebSocket closed:', event.code, event.reason);
                });
                
                return ws;
            };
        }
    }

    // Fix XMLHttpRequest connection issues
    function fixXMLHttpRequestConnections() {
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            
            xhr.addEventListener('error', (event) => {
                console.warn('⚠️ XMLHttpRequest error:', event);
            });
            
            xhr.addEventListener('timeout', (event) => {
                console.warn('⚠️ XMLHttpRequest timeout:', event);
            });
            
            return xhr;
        };
    }

    // Setup global error handling
    function setupGlobalErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('❌ Global error:', event.error);
            
            // Don't show error alerts in production
            if (event.error && event.error.message.includes('runtime.lastError')) {
                event.preventDefault();
                console.warn('⚠️ Runtime error handled:', event.error.message);
            }
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Unhandled promise rejection:', event.reason);
            
            // Don't show error alerts in production
            if (event.reason && event.reason.message.includes('runtime.lastError')) {
                event.preventDefault();
                console.warn('⚠️ Runtime promise rejection handled:', event.reason.message);
            }
        });
    }

    // Initialize runtime fixes
    function initializeRuntimeFixes() {
        fixRuntimeErrors();
        fixConnectionTimeouts();
        fixWebSocketConnections();
        fixXMLHttpRequestConnections();
        setupGlobalErrorHandling();
        
        console.log('✅ Runtime fixes initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeRuntimeFixes);
    } else {
        initializeRuntimeFixes();
    }

    // Make functions available globally
    window.runtimeFix = {
        fixRuntimeErrors,
        fixServiceWorkerConnection,
        fixExtensionCommunication,
        fixConnectionTimeouts,
        setupGlobalErrorHandling
    };

})();
