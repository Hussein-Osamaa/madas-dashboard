// Mobile App Development Server
// Simple HTTP server for local development and testing

const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 8080;

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers for PWA
app.use((req, res, next) => {
    // Enable CORS for development
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // PWA security headers
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    
    // Cache control for different file types
    if (req.url.endsWith('.js') || req.url.endsWith('.css')) {
        res.header('Cache-Control', 'public, max-age=3600'); // 1 hour
    } else if (req.url.endsWith('.html')) {
        res.header('Cache-Control', 'no-cache'); // No cache for HTML
    }
    
    next();
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

// PWA manifest
app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'manifest.json'));
});

// Service worker (placeholder)
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
        // Service Worker for MADAS Mobile App
        const CACHE_NAME = 'madas-mobile-v1';
        const urlsToCache = [
            '/',
            '/index.html',
            '/src/styles/mobile.css',
            '/src/app.js'
        ];

        self.addEventListener('install', (event) => {
            event.waitUntil(
                caches.open(CACHE_NAME)
                    .then((cache) => cache.addAll(urlsToCache))
            );
        });

        self.addEventListener('fetch', (event) => {
            event.respondWith(
                caches.match(event.request)
                    .then((response) => {
                        // Return cached version or fetch from network
                        return response || fetch(event.request);
                    })
            );
        });
    `);
});

// API endpoints for mobile app
app.post('/api/mobile/health', (req, res) => {
    res.json({
        status: 'mobile-api-healthy',
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        isMobile: /Mobile|Android|iPhone|iPad/.test(req.headers['user-agent'])
    });
});

// Error handling
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong on the server'
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   📱 MADAS Mobile Dashboard Server                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

✅ Mobile App Server running on:
   → Local:   http://localhost:${PORT}
   → Network: http://${localIP}:${PORT}

📱 MOBILE ACCESS:
   → Scan QR code or visit: http://${localIP}:${PORT}
   → Add to home screen for app-like experience
   → Test on mobile device in same network

🔧 DEVELOPMENT:
   → Hot reload: Not implemented (refresh manually)
   → Debug mode: Add ?debug=true to URL
   → Console logs: Check browser dev tools

📊 FEATURES:
   ✅ Progressive Web App (PWA)
   ✅ Mobile-optimized UI
   ✅ Touch gestures
   ✅ Offline support (basic)
   ✅ Firebase integration
   ✅ Multi-tenancy support

🎯 Ready for mobile testing!
Press Ctrl+C to stop the server
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down mobile app server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down mobile app server...');
    process.exit(0);
});
