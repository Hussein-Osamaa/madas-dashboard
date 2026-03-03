// Service Worker for MADAS Dashboard Mobile Support
console.log('🔧 Service Worker loaded');

const CACHE_NAME = 'madas-dashboard-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/assets/img/madas-logo.png',
    '/assets/img/madas.png',
    '/js/mobile-api.js',
    '/js/mobile-interface.js',
    '/js/admin-enhanced.js',
    '/js/business-isolation.js',
    '/js/page-template.js'
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
                console.log('✅ Service Worker installed');
                return self.skipWaiting();
            })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('🔧 Service Worker activating...');
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
                    
                    // Cache the response
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                }).catch(() => {
                    // Return offline page if available
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});

// Background sync
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'data-sync') {
        event.waitUntil(syncData());
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    console.log('📱 Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New notification from MADAS Dashboard',
        icon: '/assets/img/madas-logo.png',
        badge: '/assets/img/madas-logo.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Dashboard',
                icon: '/assets/img/madas-logo.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/img/madas-logo.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('MADAS Dashboard', options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    console.log('📱 Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/index.html')
        );
    }
});

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
                    return cache.addAll(event.data.urls);
                })
        );
    }
});

// Sync data function
async function syncData() {
    try {
        console.log('🔄 Syncing data in background...');
        
        // Get offline queue from IndexedDB
        const offlineQueue = await getOfflineQueue();
        
        for (const item of offlineQueue) {
            try {
                await fetch(item.url, {
                    method: item.method,
                    headers: item.headers,
                    body: item.body
                });
                
                // Remove from queue after successful sync
                await removeFromOfflineQueue(item.id);
            } catch (error) {
                console.error('❌ Failed to sync item:', error);
            }
        }
        
        console.log('✅ Background sync completed');
    } catch (error) {
        console.error('❌ Background sync failed:', error);
    }
}

// Get offline queue from IndexedDB
async function getOfflineQueue() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('madas-offline-queue', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['queue'], 'readonly');
            const store = transaction.objectStore('queue');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('queue')) {
                db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Remove item from offline queue
async function removeFromOfflineQueue(id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('madas-offline-queue', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['queue'], 'readwrite');
            const store = transaction.objectStore('queue');
            const deleteRequest = store.delete(id);
            
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
    });
}

console.log('🔧 Service Worker script loaded');
