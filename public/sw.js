// KasPump Service Worker - PWA Implementation
// Optimized for mobile-first experience and offline functionality

const CACHE_NAME = 'kaspump-v1.0.0';
const STATIC_CACHE_NAME = 'kaspump-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'kaspump-dynamic-v1.0.0';

// Critical assets for offline functionality
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Core CSS and JS will be added dynamically
];

// API endpoints that should be cached for offline access
const CACHE_API_ROUTES = [
  '/api/tokens',
  '/api/analytics',
  '/api/user/profile',
];

// Assets that should never be cached
const EXCLUDE_FROM_CACHE = [
  '/api/auth',
  '/api/wallet',
  '/api/transactions',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Installation completed');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[ServiceWorker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activation completed');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip requests to external origins (except APIs)
  if (url.origin !== location.origin && !CACHE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
    return;
  }

  // Skip excluded routes
  if (EXCLUDE_FROM_CACHE.some(route => url.pathname.startsWith(route))) {
    return;
  }

  // Strategy 1: Network First for API calls (with fallback to cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Strategy 2: Cache First for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Strategy 3: Stale While Revalidate for pages
  event.respondWith(staleWhileRevalidateStrategy(request));
});

// Network First Strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This feature requires an internet connection',
        cached: false 
      }), 
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache First Strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Stale While Revalidate Strategy (for pages)
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network (don't await)
  const networkFetch = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Network failed, but we might have cache
    return null;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  const networkResponse = await networkFetch;
  
  if (networkResponse) {
    return networkResponse;
  }
  
  // Fallback to offline page
  return caches.match('/offline.html') || new Response('Offline', { status: 503 });
}

// Helper function to identify static assets
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         url.pathname.includes('/_next/static/') ||
         url.pathname.includes('/icons/');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-token-creation') {
    event.waitUntil(syncTokenCreation());
  }
  
  if (event.tag === 'background-trade') {
    event.waitUntil(syncTrades());
  }
});

// Sync token creation when back online
async function syncTokenCreation() {
  try {
    console.log('[ServiceWorker] Syncing token creation...');
    // Implementation for syncing offline token creations
    const pendingActions = await getStoredActions('token-creation');
    
    for (const action of pendingActions) {
      try {
        await fetch('/api/tokens', {
          method: 'POST',
          body: JSON.stringify(action.data),
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Remove successful action from storage
        await removeStoredAction('token-creation', action.id);
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync token creation:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Background sync failed:', error);
  }
}

// Sync trades when back online
async function syncTrades() {
  try {
    console.log('[ServiceWorker] Syncing trades...');
    const pendingTrades = await getStoredActions('trades');
    
    for (const trade of pendingTrades) {
      try {
        await fetch('/api/trade', {
          method: 'POST',
          body: JSON.stringify(trade.data),
          headers: { 'Content-Type': 'application/json' }
        });
        
        await removeStoredAction('trades', trade.id);
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync trade:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Trade sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: 'New trading opportunity available!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'View Details',
        icon: '/icons/action-open.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ],
    requireInteraction: false,
    silent: false
  };

  if (event.data) {
    const payload = event.data.json();
    options.body = payload.message || options.body;
    options.data = { ...options.data, ...payload.data };
  }

  event.waitUntil(
    self.registration.showNotification('KasPump', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open the app
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

// Utility functions for IndexedDB storage
async function getStoredActions(type) {
  return new Promise((resolve) => {
    // Implementation for retrieving stored actions
    // This would integrate with IndexedDB in a real implementation
    resolve([]);
  });
}

async function removeStoredAction(type, id) {
  return new Promise((resolve) => {
    // Implementation for removing stored actions
    resolve();
  });
}

console.log('[ServiceWorker] Service Worker registered successfully');
