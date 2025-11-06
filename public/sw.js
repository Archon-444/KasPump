// KasPump Service Worker - PWA Implementation
// Optimized for mobile-first experience and offline functionality

const CACHE_VERSION = '1.1.0';
const CACHE_NAME = `kaspump-v${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `kaspump-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `kaspump-dynamic-v${CACHE_VERSION}`;
const API_CACHE_NAME = `kaspump-api-v${CACHE_VERSION}`;

// Critical assets for offline functionality
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Core CSS and JS will be added dynamically
];

// Token list cache (for offline browsing)
const TOKEN_LIST_CACHE_KEY = 'kaspump-token-list';
const TOKEN_LIST_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
            // Delete all caches that don't match current version
            if (!cacheName.includes(`v${CACHE_VERSION}`)) {
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
    event.respondWith(networkFirstWithStaleCacheStrategy(request));
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

// Network First with Stale Cache Strategy (for API calls)
// Returns cached data immediately if available, then updates from network
async function networkFirstWithStaleCacheStrategy(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Start network fetch in parallel
  const networkFetch = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        // Cache successful API responses
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[ServiceWorker] Network fetch failed:', request.url);
      return null;
    });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    // Update cache in background
    networkFetch.catch(() => {}); // Ignore errors
    return cachedResponse;
  }
  
  // Wait for network if no cache
  const networkResponse = await networkFetch;
  
  if (networkResponse) {
    return networkResponse;
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
  let notificationData = {
    title: 'KasPump',
    body: 'New trading opportunity available!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now(),
      type: 'general',
    },
    requireInteraction: false,
    silent: false,
  };

  // Parse push payload if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        title: payload.title || notificationData.title,
        body: payload.body || payload.message || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        data: {
          ...notificationData.data,
          ...payload.data,
          type: payload.type || 'general',
        },
        requireInteraction: payload.requireInteraction || false,
        tag: payload.tag,
      };

      // Add actions for specific notification types
      if (payload.type === 'price-alert') {
        notificationData.actions = [
          {
            action: 'view',
            title: 'View Token',
            icon: '/icons/icon-192.png',
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
          },
        ];
      } else if (payload.type === 'trade-update') {
        notificationData.actions = [
          {
            action: 'view',
            title: 'View Trade',
            icon: '/icons/icon-192.png',
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
          },
        ];
      }
    } catch (error) {
      console.error('[ServiceWorker] Error parsing push payload:', error);
      // Use default notification data
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notificationData = event.notification.data || {};
  let url = '/';

  // Handle different notification types
  if (notificationData.type === 'price-alert' && notificationData.tokenAddress) {
    url = `/token/${notificationData.tokenAddress}`;
  } else if (notificationData.type === 'trade-update' && notificationData.txHash) {
    url = `/portfolio?tx=${notificationData.txHash}`;
  } else if (notificationData.url) {
    url = notificationData.url;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
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

// Message handler for cache management from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_TOKEN_LIST') {
    const { tokens, timestamp } = event.data;
    // Store token list in cache for offline access
    const cacheKey = new Request('/api/tokens?cached=true');
    const response = new Response(JSON.stringify({ tokens, timestamp }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    caches.open(API_CACHE_NAME).then((cache) => {
      cache.put(cacheKey, response);
      console.log('[ServiceWorker] Token list cached for offline access');
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(API_CACHE_NAME).then(() => {
      console.log('[ServiceWorker] API cache cleared');
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Periodic cache cleanup (remove old entries)
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    const cache = await caches.open(API_CACHE_NAME);
    const requests = await cache.keys();
    const now = Date.now();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const cachedDate = response.headers.get('sw-cached-date');
      
      if (cachedDate) {
        const age = now - parseInt(cachedDate, 10);
        // Remove entries older than 1 hour
        if (age > 60 * 60 * 1000) {
          await cache.delete(request);
          console.log('[ServiceWorker] Removed stale cache entry:', request.url);
        }
      }
    }
  }
});

console.log('[ServiceWorker] Service Worker registered successfully');
