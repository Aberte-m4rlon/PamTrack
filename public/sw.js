/* Pamasahe Tracker Offline Service Worker */
const CACHE_NAME = 'pamtrack-offline-v4';

const CORE_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/oriental-mindoro-bg.png',
  '/assets/pamasahe-tracker-icon.png',
  '/assets/pamasahe-tracker-logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const urlsToCache = new Set(CORE_SHELL_URLS);

      try {
        const res = await fetch('/precache-manifest.json', { cache: 'no-store' });
        if (res.ok) {
          const manifest = await res.json();
          if (Array.isArray(manifest.assets)) {
            manifest.assets.forEach((asset) => {
              if (typeof asset === 'string' && asset.startsWith('/')) {
                urlsToCache.add(asset);
              }
            });
          }
        }
      } catch {
        // Ignore in dev mode or when precache-manifest.json is absent
      }

      await Promise.allSettled(
        Array.from(urlsToCache).map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      );
      await self.clients.claim();
    })()
  );
});

function isBypassRequest(url) {
  if (!url || !url.protocol.startsWith('http')) return true;
  // Never cache Supabase auth, realtime, storage uploads, OSRM, or map tiles via SW shell cache
  if (url.hostname.includes('supabase.co')) return true;
  if (url.hostname.includes('project-osrm.org')) return true;
  if (url.hostname.includes('tile.openstreetmap.org')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (isBypassRequest(url)) return;

  // SPA navigation: network-first, falling back cleanly to cached app shell ('/')
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/', networkResponse.clone()).catch(() => null);
          }
          return networkResponse;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cachedShell =
            (await cache.match(request)) ||
            (await cache.match('/')) ||
            (await cache.match('/index.html'));
          return (
            cachedShell ||
            new Response('Offline mode: cached shell unavailable.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            })
          );
        }
      })()
    );
    return;
  }

  // Same-origin static assets (JS/CSS/PNG/Webmanifest)
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) {
          // Background revalidate
          fetch(request)
            .then((fresh) => {
              if (fresh && fresh.ok) {
                cache.put(request, fresh.clone()).catch(() => null);
              }
            })
            .catch(() => null);
          return cached;
        }

        try {
          const fresh = await fetch(request);
          if (fresh && fresh.ok) {
            cache.put(request, fresh.clone()).catch(() => null);
          }
          return fresh;
        } catch {
          return new Response('', { status: 504 });
        }
      })()
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'PAMTRACK_NOTIFICATION_CLICKED' });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/trips');
      }
      return undefined;
    })()
  );
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Pamasahe Tracker Urgent Alert',
    body: 'Check your active commuter trip status.',
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
      };
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/assets/pamasahe-tracker-icon.png',
      badge: '/assets/pamasahe-tracker-icon.png',
      tag: 'pamtrack-alert-urgent',
      requireInteraction: true,
      renotify: true,
      silent: false,
      vibrate: [450, 110, 450, 110, 450, 160, 650],
    })
  );
});
