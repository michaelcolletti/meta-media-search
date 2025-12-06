/**
 * Service Worker for Progressive Enhancement
 * Handles offline caching, WASM module caching, and network strategies
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'meta-media-wasm-v1';
const WASM_CACHE_NAME = 'meta-media-wasm-modules-v1';
const API_CACHE_NAME = 'meta-media-api-v1';
const IMAGE_CACHE_NAME = 'meta-media-images-v1';

// Cache duration in milliseconds
const CACHE_DURATION = {
  wasm: 7 * 24 * 60 * 60 * 1000,   // 7 days
  api: 60 * 60 * 1000,              // 1 hour
  images: 24 * 60 * 60 * 1000,      // 24 hours
  static: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Resources to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// WASM modules to cache
const WASM_MODULES = [
  '/wasm/meta-media-mobile-wasm_bg.wasm',
  '/wasm/meta-media-mobile-wasm.js',
];

/**
 * Install event - precache resources
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    (async () => {
      // Precache static assets
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);

      // Precache WASM modules
      const wasmCache = await caches.open(WASM_CACHE_NAME);
      try {
        await wasmCache.addAll(WASM_MODULES);
        console.log('[ServiceWorker] WASM modules precached');
      } catch (error) {
        console.warn('[ServiceWorker] Failed to precache WASM:', error);
      }

      // Skip waiting to activate immediately
      await self.skipWaiting();

      console.log('[ServiceWorker] Installed');
    })()
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name =>
            name !== CACHE_NAME &&
            name !== WASM_CACHE_NAME &&
            name !== API_CACHE_NAME &&
            name !== IMAGE_CACHE_NAME
          )
          .map(name => {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );

      // Take control of all clients
      await self.clients.claim();

      console.log('[ServiceWorker] Activated');
    })()
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Determine caching strategy based on request type
  if (isWasmRequest(url)) {
    event.respondWith(handleWasmRequest(request));
  } else if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handleNetworkFirst(request));
  }
});

/**
 * Message event - handle commands from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { data } = event;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  } else if (data.type === 'CACHE_WASM') {
    event.waitUntil(cacheWasmModules());
  } else if (data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then(size => {
        event.ports[0]?.postMessage({ size });
      })
    );
  }
});

// Helper functions

function isWasmRequest(url: URL): boolean {
  return url.pathname.includes('/wasm/') ||
         url.pathname.endsWith('.wasm') ||
         url.pathname.endsWith('_bg.js');
}

function isApiRequest(url: URL): boolean {
  return url.pathname.startsWith('/api/');
}

function isImageRequest(url: URL): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

function isStaticAsset(url: URL): boolean {
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname);
}

/**
 * Cache-first strategy for WASM modules (long cache)
 */
async function handleWasmRequest(request: Request): Promise<Response> {
  const cache = await caches.open(WASM_CACHE_NAME);

  // Try cache first
  const cached = await cache.match(request);
  if (cached) {
    // Check if cache is still valid
    const cacheTime = await getCacheTime(WASM_CACHE_NAME, request.url);
    if (cacheTime && Date.now() - cacheTime < CACHE_DURATION.wasm) {
      console.log('[ServiceWorker] WASM cache hit:', request.url);
      return cached;
    }
  }

  // Fetch from network and cache
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      await setCacheTime(WASM_CACHE_NAME, request.url, Date.now());
      console.log('[ServiceWorker] WASM cached:', request.url);
    }
    return response;
  } catch (error) {
    // If network fails and we have cached version, use it
    if (cached) {
      console.warn('[ServiceWorker] Network failed, using stale WASM cache');
      return cached;
    }
    throw error;
  }
}

/**
 * Network-first with cache fallback for API requests
 */
async function handleApiRequest(request: Request): Promise<Response> {
  const cache = await caches.open(API_CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      await setCacheTime(API_CACHE_NAME, request.url, Date.now());
    }
    return response;
  } catch (error) {
    // Try cache on network failure
    const cached = await cache.match(request);
    if (cached) {
      console.warn('[ServiceWorker] API network failed, using cache');
      return cached;
    }
    throw error;
  }
}

/**
 * Cache-first for images
 */
async function handleImageRequest(request: Request): Promise<Response> {
  const cache = await caches.open(IMAGE_CACHE_NAME);

  const cached = await cache.match(request);
  if (cached) {
    // Check cache validity
    const cacheTime = await getCacheTime(IMAGE_CACHE_NAME, request.url);
    if (cacheTime && Date.now() - cacheTime < CACHE_DURATION.images) {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      await setCacheTime(IMAGE_CACHE_NAME, request.url, Date.now());
    }
    return response;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * Cache-first for static assets
 */
async function handleStaticRequest(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Network-first for dynamic content
 */
async function handleNetworkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * Get cache timestamp for a URL
 */
async function getCacheTime(cacheName: string, url: string): Promise<number | null> {
  const cache = await caches.open(`${cacheName}-metadata`);
  const response = await cache.match(url);
  if (response) {
    const text = await response.text();
    return parseInt(text, 10);
  }
  return null;
}

/**
 * Set cache timestamp for a URL
 */
async function setCacheTime(cacheName: string, url: string, time: number): Promise<void> {
  const cache = await caches.open(`${cacheName}-metadata`);
  await cache.put(url, new Response(time.toString()));
}

/**
 * Clear all caches
 */
async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[ServiceWorker] All caches cleared');
}

/**
 * Explicitly cache WASM modules
 */
async function cacheWasmModules(): Promise<void> {
  const cache = await caches.open(WASM_CACHE_NAME);
  try {
    await cache.addAll(WASM_MODULES);
    console.log('[ServiceWorker] WASM modules cached');
  } catch (error) {
    console.error('[ServiceWorker] Failed to cache WASM:', error);
  }
}

/**
 * Get total cache size
 */
async function getCacheSize(): Promise<number> {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

export {};
