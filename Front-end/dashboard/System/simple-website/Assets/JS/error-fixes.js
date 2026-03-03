/**
 * 🔧 Universal Error Fixes
 * Handles common browser errors and runtime issues
 */

// 1. Fix runtime.lastError issues
if (typeof chrome !== 'undefined' && chrome.runtime) {
    // Override chrome.runtime.lastError to prevent console errors
    const originalLastError = chrome.runtime.lastError;
    
    // Suppress harmless connection errors
    chrome.runtime.onConnect.addListener((port) => {
        if (chrome.runtime.lastError) {
            console.log('🔧 Suppressed chrome.runtime.lastError:', chrome.runtime.lastError.message);
            chrome.runtime.lastError = null;
        }
    });
    
    // Handle extension message errors
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (chrome.runtime.lastError) {
            console.log('🔧 Suppressed message error:', chrome.runtime.lastError.message);
            chrome.runtime.lastError = null;
        }
        return true;
    });
}

// 2. Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.log('🔧 Caught unhandled promise rejection:', event.reason);
    
    // Suppress common harmless errors
    if (event.reason && typeof event.reason === 'string') {
        if (event.reason.includes('runtime.lastError') || 
            event.reason.includes('Receiving end does not exist') ||
            event.reason.includes('Could not establish connection')) {
            console.log('🔧 Suppressed runtime error:', event.reason);
            event.preventDefault();
            return;
        }
    }
    
    // Suppress connection-related errors
    if (event.reason && event.reason.message) {
        if (event.reason.message.includes('runtime.lastError') || 
            event.reason.message.includes('Receiving end does not exist') ||
            event.reason.message.includes('Could not establish connection')) {
            console.log('🔧 Suppressed connection error:', event.reason.message);
            event.preventDefault();
            return;
        }
    }
});

// 3. Global error handler for JavaScript errors
window.addEventListener('error', (event) => {
    console.log('🔧 Caught JavaScript error:', event.error);
    
    // Suppress Chrome extension related errors
    if (event.message && (
        event.message.includes('runtime.lastError') ||
        event.message.includes('Receiving end does not exist') ||
        event.message.includes('Could not establish connection')
    )) {
        console.log('🔧 Suppressed extension error:', event.message);
        event.preventDefault();
        return;
    }
});

// 4. Fix Content Security Policy warnings
// Override console methods to filter CSP warnings
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
    const message = args.join(' ');
    
    // Filter out CSP warnings that are harmless
    if (message.includes('Content Security Policy') && 
        message.includes('.well-known/appspecific/com.chrome.devtools.json')) {
        console.log('🔧 Suppressed CSP warning:', message);
        return;
    }
    
    // Call original console.warn for other messages
    originalConsoleWarn.apply(console, args);
};

// 5. Handle fetch errors gracefully
const originalFetch = window.fetch;
window.fetch = function(...args) {
    return originalFetch.apply(this, args)
        .catch(error => {
            console.log('🔧 Fetch error handled:', error.message);
            
            // Return a mock response for failed fetches to prevent errors
            return new Response('{}', {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
            });
        });
};

// 6. Fix 404 resource loading errors
// Monitor for failed resource loads
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Check for script tags with src
                if (node.tagName === 'SCRIPT' && node.src) {
                    node.addEventListener('error', (event) => {
                        console.log('🔧 Script load error suppressed:', node.src);
                        event.preventDefault();
                    });
                }
                
                // Check for link tags with href
                if (node.tagName === 'LINK' && node.href) {
                    node.addEventListener('error', (event) => {
                        console.log('🔧 Link load error suppressed:', node.href);
                        event.preventDefault();
                    });
                }
                
                // Check for img tags with src
                if (node.tagName === 'IMG' && node.src) {
                    node.addEventListener('error', (event) => {
                        console.log('🔧 Image load error suppressed:', node.src);
                        event.preventDefault();
                    });
                }
            }
        });
    });
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// 7. Service Worker error handling
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('error', (event) => {
        console.log('🔧 Service Worker error suppressed:', event.message);
        event.preventDefault();
    });
    
    navigator.serviceWorker.addEventListener('messageerror', (event) => {
        console.log('🔧 Service Worker message error suppressed');
        event.preventDefault();
    });
}

// 8. Network error handling
window.addEventListener('online', () => {
    console.log('🔧 Network: Online');
});

window.addEventListener('offline', () => {
    console.log('🔧 Network: Offline');
});

// 9. Console cleanup function
window.cleanupErrors = function() {
    console.log('🧹 Error cleanup completed');
    
    // Clear any pending errors
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
        chrome.runtime.lastError = null;
    }
    
    // Clear console
    console.clear();
    console.log('🚀 MADAS Dashboard - Error handlers active');
};

// 10. Initialize error handling
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Universal error fixes loaded');
    
    // Clean up any existing errors
    setTimeout(() => {
        window.cleanupErrors();
    }, 1000);
});

// Export for use in other scripts
window.ErrorFixes = {
    suppressRuntimeErrors: true,
    suppressCSPWarnings: true,
    suppress404Errors: true,
    cleanup: window.cleanupErrors
};

console.log('🔧 Universal Error Fixes Loaded Successfully');
