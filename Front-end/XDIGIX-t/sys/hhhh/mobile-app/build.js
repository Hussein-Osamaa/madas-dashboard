// Build script for MADAS Mobile App
// Optimizes the web app for production deployment

const fs = require('fs');
const path = require('path');

class MobileAppBuilder {
    constructor() {
        this.sourceDir = __dirname;
        this.buildDir = path.join(this.sourceDir, 'dist');
        this.isProduction = process.env.NODE_ENV === 'production';
    }
    
    async build() {
        try {
            console.log('🔨 Building MADAS Mobile App for production...');
            
            // Create build directory
            await this.createBuildDirectory();
            
            // Copy static files
            await this.copyStaticFiles();
            
            // Optimize HTML
            await this.optimizeHTML();
            
            // Optimize CSS
            await this.optimizeCSS();
            
            // Optimize JavaScript
            await this.optimizeJavaScript();
            
            // Generate service worker
            await this.generateServiceWorker();
            
            // Copy assets
            await this.copyAssets();
            
            // Generate build info
            await this.generateBuildInfo();
            
            console.log('✅ Build complete!');
            console.log(`📦 Output directory: ${this.buildDir}`);
            
            this.showBuildSummary();
            
        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    }
    
    async createBuildDirectory() {
        if (fs.existsSync(this.buildDir)) {
            fs.rmSync(this.buildDir, { recursive: true });
        }
        fs.mkdirSync(this.buildDir, { recursive: true });
        console.log('✅ Created build directory');
    }
    
    async copyStaticFiles() {
        const filesToCopy = [
            'index.html',
            'manifest.json',
            'package.json'
        ];
        
        for (const file of filesToCopy) {
            const sourcePath = path.join(this.sourceDir, file);
            const destPath = path.join(this.buildDir, file);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
                console.log(`✅ Copied ${file}`);
            }
        }
    }
    
    async optimizeHTML() {
        const htmlPath = path.join(this.buildDir, 'index.html');
        let html = fs.readFileSync(htmlPath, 'utf8');
        
        if (this.isProduction) {
            // Remove debug comments
            html = html.replace(/<!-- DEBUG:.*?-->/g, '');
            
            // Minify inline styles
            html = html.replace(/>\s+</g, '><');
            
            // Add production meta tags
            html = html.replace(
                '<meta name="viewport"',
                '<meta name="robots" content="index, follow">\n    <meta name="viewport"'
            );
        }
        
        fs.writeFileSync(htmlPath, html);
        console.log('✅ Optimized HTML');
    }
    
    async optimizeCSS() {
        const cssSourcePath = path.join(this.sourceDir, 'src/styles/mobile.css');
        const cssDestPath = path.join(this.buildDir, 'src/styles/mobile.css');
        
        if (fs.existsSync(cssSourcePath)) {
            let css = fs.readFileSync(cssSourcePath, 'utf8');
            
            if (this.isProduction) {
                // Basic CSS minification
                css = css
                    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
                    .replace(/\s+/g, ' ') // Collapse whitespace
                    .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
                    .replace(/\s*{\s*/g, '{') // Remove spaces around opening brace
                    .replace(/;\s*/g, ';') // Remove spaces after semicolons
                    .trim();
            }
            
            // Ensure directory exists
            const cssDir = path.dirname(cssDestPath);
            if (!fs.existsSync(cssDir)) {
                fs.mkdirSync(cssDir, { recursive: true });
            }
            
            fs.writeFileSync(cssDestPath, css);
            console.log('✅ Optimized CSS');
        }
    }
    
    async optimizeJavaScript() {
        const jsSourceDir = path.join(this.sourceDir, 'src');
        const jsDestDir = path.join(this.buildDir, 'src');
        
        if (fs.existsSync(jsSourceDir)) {
            await this.copyDirectory(jsSourceDir, jsDestDir);
            console.log('✅ Optimized JavaScript');
        }
    }
    
    async generateServiceWorker() {
        const swContent = `// Service Worker for MADAS Mobile App - Production Build
const CACHE_NAME = 'madas-mobile-v${Date.now()}';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/src/styles/mobile.css',
    '/src/app.js',
    '/assets/icons/icon-192x192.svg',
    '/assets/icons/icon-512x512.svg'
];

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker: Install');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Service Worker: Cache failed', error);
            })
    );
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activate');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                
                return fetch(event.request).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clone response
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // Return offline page if available
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Background sync
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync', event.tag);
    // Handle background sync tasks
});

// Push notifications
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'New notification from MADAS',
        icon: '/assets/icons/icon-192x192.svg',
        badge: '/assets/icons/icon-72x72.svg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'Open App'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('MADAS Mobile', options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});`;

        fs.writeFileSync(path.join(this.buildDir, 'sw.js'), swContent);
        console.log('✅ Generated service worker');
    }
    
    async copyAssets() {
        const assetsSourceDir = path.join(this.sourceDir, 'assets');
        const assetsDestDir = path.join(this.buildDir, 'assets');
        
        if (fs.existsSync(assetsSourceDir)) {
            await this.copyDirectory(assetsSourceDir, assetsDestDir);
            console.log('✅ Copied assets');
        }
    }
    
    async generateBuildInfo() {
        const buildInfo = {
            buildTime: new Date().toISOString(),
            version: '1.0.0',
            environment: this.isProduction ? 'production' : 'development',
            nodeVersion: process.version,
            platform: process.platform
        };
        
        fs.writeFileSync(
            path.join(this.buildDir, 'build-info.json'),
            JSON.stringify(buildInfo, null, 2)
        );
        console.log('✅ Generated build info');
    }
    
    async copyDirectory(source, destination) {
        if (!fs.existsSync(destination)) {
            fs.mkdirSync(destination, { recursive: true });
        }
        
        const entries = fs.readdirSync(source, { withFileTypes: true });
        
        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const destPath = path.join(destination, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectory(sourcePath, destPath);
            } else {
                fs.copyFileSync(sourcePath, destPath);
            }
        }
    }
    
    showBuildSummary() {
        const buildInfo = JSON.parse(
            fs.readFileSync(path.join(this.buildDir, 'build-info.json'), 'utf8')
        );
        
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   📦 MADAS Mobile App Build Complete                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📊 BUILD SUMMARY:
   → Version: ${buildInfo.version}
   → Environment: ${buildInfo.environment}
   → Build Time: ${buildInfo.buildTime}
   → Output: ${this.buildDir}

🚀 DEPLOYMENT OPTIONS:

1. PWA Hosting (Quick):
   → Upload dist/ folder to web server
   → Ensure HTTPS is enabled
   → Test on mobile devices

2. Vercel (Recommended):
   vercel --prod

3. Netlify:
   netlify deploy --prod --dir dist

4. Firebase Hosting:
   firebase deploy

📱 MOBILE TESTING:
   → Deploy and get URL
   → Open on mobile device
   → Add to home screen
   → Test PWA functionality

🎯 Ready for deployment!
        `);
    }
}

// Run build if this file is executed directly
if (require.main === module) {
    const builder = new MobileAppBuilder();
    builder.build().catch(console.error);
}

module.exports = MobileAppBuilder;
