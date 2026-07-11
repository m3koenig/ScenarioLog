/**
 * ScenarioLog Service Worker
 * Version 1.0.0
 * 
 * Features:
 * - Offline-first caching strategy
 * - Asset caching and updates
 * - Network-first for API calls
 * - Cache-first for static assets
 * - Background sync capabilities
 */

const CACHE_NAME = 'scenariolog-v1';
const STATIC_CACHE = 'scenariolog-static-v1';
const DYNAMIC_CACHE = 'scenariolog-dynamic-v1';

const STATIC_ASSETS = [
  '/ScenarioLog/',
  '/ScenarioLog/index.html',
  '/ScenarioLog/manifest.json',
  '/ScenarioLog/sw.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

/**
 * Install Event - Caches essential assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn('[SW] Some assets failed to cache:', error);
          // Don't fail the installation if some assets can't be cached
          // Only cache what we can access
          return cache.add('/ScenarioLog/');
        });
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate Event - Cleans up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && 
                   cacheName !== STATIC_CACHE && 
                   cacheName !== DYNAMIC_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Fetch Event - Implements caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other non-http(s) protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  /**
   * Strategy 1: Network-first for ScenarioLog API calls and data
   */
  if (url.pathname.includes('/api/') || url.pathname.includes('/data/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  /**
   * Strategy 2: Cache-first for CDN assets (CSS, JS libraries, fonts)
   */
  if (isCDNAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /**
   * Strategy 3: Stale-while-revalidate for HTML and main app
   */
  if (request.mode === 'navigate' || url.pathname === '/ScenarioLog/') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  /**
   * Default: Cache-first for other static assets
   */
  event.respondWith(cacheFirst(request));
});

/**
 * Network-first strategy: Try network first, fallback to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network request failed, using cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return createOfflineResponse();
  }
}

/**
 * Cache-first strategy: Try cache first, fallback to network
 */
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (!response || response.status !== 200 || response.type === 'error') {
      return response;
    }

    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    console.log('[SW] Cache and network failed:', request.url);
    return createOfflineResponse();
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => createOfflineResponse());

  return cached || fetchPromise;
}

/**
 * Check if URL is a CDN asset
 */
function isCDNAsset(url) {
  const cdnPatterns = [
    'cdn.tailwindcss.com',
    'cdn.jsdelivr.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ];
  return cdnPatterns.some((pattern) => url.href.includes(pattern));
}

/**
 * Create offline response
 */
function createOfflineResponse() {
  return new Response(
    `<!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - ScenarioLog</title>
      <style>
        body {
          background: #030712;
          color: #f3f4f6;
          font-family: "Inter", sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 500px;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 1rem;
          color: #22c55e;
          font-family: "Orbitron", monospace;
        }
        p {
          font-size: 1.1rem;
          opacity: 0.8;
          line-height: 1.6;
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        button {
          margin-top: 2rem;
          padding: 12px 24px;
          background: #22c55e;
          color: #030712;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        button:hover {
          opacity: 0.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>Offline</h1>
        <p>Du bist derzeit offline. ScenarioLog funktioniert teilweise offline, aber einige Features sind eingeschränkt.</p>
        <p>Deine zuletzt gespeicherten Szenarien sind verfügbar.</p>
        <button onclick="location.reload()">Neu laden</button>
      </div>
    </body>
    </html>`,
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html; charset=utf-8'
      })
    }
  );
}

/**
 * Handle messages from the app
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(DYNAMIC_CACHE).then(() => {
      console.log('[SW] Dynamic cache cleared');
    });
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(DYNAMIC_CACHE).then((cache) => {
      urls.forEach((url) => {
        cache.add(url).catch((error) => {
          console.warn('[SW] Failed to cache URL:', url, error);
        });
      });
    });
  }
});

/**
 * Handle push notifications (for future enhancements)
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const options = {
    body: event.data.text(),
    icon: '/ScenarioLog/icon-192.png',
    badge: '/ScenarioLog/badge-72.png',
    tag: 'scenariolog-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('ScenarioLog', options)
  );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === '/ScenarioLog/' && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/ScenarioLog/');
      }
    })
  );
});
