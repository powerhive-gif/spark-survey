const CACHE = 'spark-survey-v2';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./', './index.html']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only intercept GET requests (page loads, assets) for the offline cache.
  // POST requests — like pushing survey data to Apps Script — must pass
  // straight through untouched. Some mobile browsers (notably iOS Safari)
  // can silently drop or empty the body of a POST request that's routed
  // through a service worker's fetch handler, which causes exactly this
  // symptom: the push "succeeds" but Apps Script receives no data.
  if (e.request.method !== 'GET') {
    return; // don't call respondWith — browser handles it natively, no interception
  }

  e.respondWith(
    fetch(e.request).then(response => {
      // Network succeeded — save a fresh copy for offline use next time,
      // so the cached fallback is always whatever was last successfully
      // loaded online. No manual version bump ever needed.
      const responseClone = response.clone();
      caches.open(CACHE).then(cache => cache.put(e.request, responseClone));
      return response;
    }).catch(() => caches.match(e.request))
  );
});
