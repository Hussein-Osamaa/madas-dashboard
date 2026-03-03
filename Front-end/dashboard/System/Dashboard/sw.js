// Service Worker for MADAS Dashboard
const CACHE_NAME = 'madas-dashboard-v1';
const urlsToCache = [
  './',
  './index.html',
  './assets/img/madas-logo.png',
  './assets/img/madas.png',
  './js/dashboard-common.js',
  './js/error-fix.js',
  './js/dashboard-fix.js',
  './firebaseConfig.js',
  './js/modules/auth.js',
  './js/modules/business.js',
  './js/modules/staff.js'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching files...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker installation failed:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('📦 Serving from cache:', event.request.url);
          return response;
        }
        
        console.log('🌐 Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch((error) => {
          console.error('❌ Fetch failed:', error);
          // Return offline page or fallback
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'dashboard-sync') {
    event.waitUntil(
      syncDashboardData()
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from MADAS Dashboard',
    icon: './assets/img/madas-logo.png',
    badge: './assets/img/madas-logo.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Open Dashboard',
        icon: './assets/img/madas-logo.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './assets/img/madas-logo.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('MADAS Dashboard', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./index.html')
    );
  }
});

// Helper functions
async function syncDashboardData() {
  try {
    console.log('🔄 Syncing dashboard data...');
    
    // Sync user data
    await syncUserData();
    
    // Sync business data
    await syncBusinessData();
    
    // Sync staff data
    await syncStaffData();
    
    console.log('✅ Dashboard data synced successfully');
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

async function syncUserData() {
  // Implement user data sync
  console.log('👤 Syncing user data...');
}

async function syncBusinessData() {
  // Implement business data sync
  console.log('🏢 Syncing business data...');
}

async function syncStaffData() {
  // Implement staff data sync
  console.log('👥 Syncing staff data...');
}

// Message handling
self.addEventListener('message', (event) => {
    console.log('📨 Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then((cache) => {
                    return cache.addAll(event.data.payload);
                })
        );
    }
});

// Handle runtime errors
self.addEventListener('error', (event) => {
    console.error('❌ Service Worker error:', event.error);
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

console.log('✅ Service Worker loaded successfully');