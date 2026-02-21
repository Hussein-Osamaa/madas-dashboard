// Setup script for MADAS Mobile App
// Initializes the mobile app with necessary configurations

const fs = require('fs');
const path = require('path');
const os = require('os');

class MobileAppSetup {
    constructor() {
        this.appDir = __dirname;
        this.setupComplete = false;
    }
    
    async initialize() {
        try {
            console.log('🚀 Initializing MADAS Mobile App Setup...');
            
            // Check prerequisites
            await this.checkPrerequisites();
            
            // Create necessary directories
            await this.createDirectories();
            
            // Create placeholder files
            await this.createPlaceholderFiles();
            
            // Generate configuration
            await this.generateConfiguration();
            
            // Setup PWA assets
            await this.setupPWAAssets();
            
            this.setupComplete = true;
            console.log('✅ Mobile App Setup Complete!');
            
            this.showNextSteps();
            
        } catch (error) {
            console.error('❌ Setup failed:', error);
            process.exit(1);
        }
    }
    
    async checkPrerequisites() {
        console.log('🔍 Checking prerequisites...');
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 16) {
            throw new Error(`Node.js 16+ required. Current version: ${nodeVersion}`);
        }
        
        console.log(`✅ Node.js version: ${nodeVersion}`);
        
        // Check if required directories exist
        const requiredDirs = ['src', 'src/styles', 'src/services', 'src/components', 'src/pages'];
        
        for (const dir of requiredDirs) {
            const dirPath = path.join(this.appDir, dir);
            if (!fs.existsSync(dirPath)) {
                throw new Error(`Required directory missing: ${dir}`);
            }
        }
        
        console.log('✅ Required directories exist');
    }
    
    async createDirectories() {
        console.log('📁 Creating directories...');
        
        const directories = [
            'assets',
            'assets/icons',
            'assets/screenshots',
            'src/utils',
            'public'
        ];
        
        for (const dir of directories) {
            const dirPath = path.join(this.appDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`✅ Created directory: ${dir}`);
            }
        }
    }
    
    async createPlaceholderFiles() {
        console.log('📄 Creating placeholder files...');
        
        // Create placeholder page files
        const pages = [
            'orders.js',
            'products.js',
            'customers.js',
            'finance.js',
            'analytics.js',
            'staff.js',
            'settings.js'
        ];
        
        for (const page of pages) {
            const filePath = path.join(this.appDir, 'src/pages', page);
            if (!fs.existsSync(filePath)) {
                const content = this.generatePageTemplate(page.replace('.js', ''));
                fs.writeFileSync(filePath, content);
                console.log(`✅ Created page: ${page}`);
            }
        }
        
        // Create service worker
        const swPath = path.join(this.appDir, 'sw.js');
        if (!fs.existsSync(swPath)) {
            const swContent = this.generateServiceWorker();
            fs.writeFileSync(swPath, swContent);
            console.log('✅ Created service worker');
        }
    }
    
    generatePageTemplate(pageName) {
        const className = pageName.charAt(0).toUpperCase() + pageName.slice(1) + 'Page';
        
        return `// ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page for Mobile App
// ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} management and functionality

export class ${className} {
    constructor(app) {
        this.app = app;
        this.isInitialized = false;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('📄 Initializing ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page...');
            
            // Setup page elements
            this.setupElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize data
            await this.loadInitialData();
            
            this.isInitialized = true;
            console.log('✅ ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page initialized');
            
        } catch (error) {
            console.error('❌ ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page initialization failed:', error);
        }
    }
    
    setupElements() {
        // Setup page-specific elements
    }
    
    setupEventListeners() {
        // Setup page-specific event listeners
    }
    
    async loadInitialData() {
        // Load page-specific data
    }
    
    // Page lifecycle methods
    onShow() {
        console.log('📄 ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page shown');
    }
    
    onHide() {
        console.log('📄 ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page hidden');
    }
    
    onResume() {
        console.log('📄 ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page resumed');
    }
    
    onOrientationChange() {
        console.log('📄 ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} orientation changed');
    }
    
    onLayoutChange({ isMobile, isTablet, isDesktop }) {
        console.log('📄 ${pageName.charAt(0).toUpperCase() + pageName.slice(1)} layout changed');
    }
}`;
    }
    
    generateServiceWorker() {
        return `// Service Worker for MADAS Mobile App
const CACHE_NAME = 'madas-mobile-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/src/styles/mobile.css',
    '/src/app.js'
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
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
            .catch(() => {
                // Return offline page if available
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
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
        body: event.data ? event.data.text() : 'New notification',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('MADAS Mobile', options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});`;
    }
    
    async generateConfiguration() {
        console.log('⚙️ Generating configuration...');
        
        // Generate environment configuration
        const envConfig = {
            NODE_ENV: 'development',
            PORT: 8080,
            FIREBASE_API_KEY: 'your-firebase-api-key',
            FIREBASE_AUTH_DOMAIN: 'your-project.firebaseapp.com',
            FIREBASE_PROJECT_ID: 'your-project-id',
            FIREBASE_STORAGE_BUCKET: 'your-project.appspot.com',
            FIREBASE_MESSAGING_SENDER_ID: 'your-sender-id',
            FIREBASE_APP_ID: 'your-app-id'
        };
        
        const envPath = path.join(this.appDir, '.env');
        if (!fs.existsSync(envPath)) {
            const envContent = Object.entries(envConfig)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n');
            fs.writeFileSync(envPath, envContent);
            console.log('✅ Created .env file');
        }
        
        // Generate gitignore
        const gitignorePath = path.join(this.appDir, '.gitignore');
        if (!fs.existsSync(gitignorePath)) {
            const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/

# Cache
.cache/
.parcel-cache/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
tmp/
temp/`;
            fs.writeFileSync(gitignorePath, gitignoreContent);
            console.log('✅ Created .gitignore file');
        }
    }
    
    async setupPWAAssets() {
        console.log('🎨 Setting up PWA assets...');
        
        // Create placeholder icons (SVG)
        const icons = [
            { size: 72, name: 'icon-72x72.png' },
            { size: 96, name: 'icon-96x96.png' },
            { size: 128, name: 'icon-128x128.png' },
            { size: 144, name: 'icon-144x144.png' },
            { size: 152, name: 'icon-152x152.png' },
            { size: 192, name: 'icon-192x192.png' },
            { size: 384, name: 'icon-384x384.png' },
            { size: 512, name: 'icon-512x512.png' }
        ];
        
        for (const icon of icons) {
            const iconPath = path.join(this.appDir, 'assets/icons', icon.name);
            if (!fs.existsSync(iconPath)) {
                // Create a simple SVG icon
                const svgIcon = this.generateSVGIcon(icon.size);
                fs.writeFileSync(iconPath.replace('.png', '.svg'), svgIcon);
                console.log(`✅ Created icon: ${icon.name.replace('.png', '.svg')}`);
            }
        }
    }
    
    generateSVGIcon(size) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#27491F" rx="${size * 0.1}"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
          fill="white" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold">M</text>
</svg>`;
    }
    
    showNextSteps() {
        const localIP = this.getLocalIP();
        
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎉 MADAS Mobile App Setup Complete!                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📱 NEXT STEPS:

1. Install dependencies:
   npm install

2. Start development server:
   npm start
   # Or: node server.js

3. Access the mobile app:
   → Local:   http://localhost:8080
   → Network: http://${localIP}:8080

4. Test on mobile device:
   → Connect to same network
   → Open browser and visit network URL
   → Add to home screen for app experience

🔧 CONFIGURATION:

1. Update Firebase configuration:
   → Edit src/services/firebase-mobile.js
   → Add your Firebase project details

2. Customize app settings:
   → Edit manifest.json for PWA settings
   → Update src/styles/mobile.css for styling

3. Add your business logic:
   → Implement pages in src/pages/
   → Add services in src/services/
   → Create components in src/components/

📱 MOBILE FEATURES:
   ✅ Progressive Web App (PWA)
   ✅ Touch-optimized UI
   ✅ Offline support
   ✅ Firebase integration
   ✅ Multi-tenancy ready

🎯 Ready for mobile development!
        `);
    }
    
    getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const netInterface of interfaces[name]) {
                if (netInterface.family === 'IPv4' && !netInterface.internal) {
                    return netInterface.address;
                }
            }
        }
        return 'localhost';
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new MobileAppSetup();
    setup.initialize().catch(console.error);
}

module.exports = MobileAppSetup;
