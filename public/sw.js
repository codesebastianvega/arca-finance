const STATIC_CACHE = "arca-static-v3";
const PRECACHE_URLS = [
  "/offline",
  "/icons/arca-192.png?v=4",
  "/icons/arca-512.png?v=4",
  "/icons/arca-maskable-512.png?v=4",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  const isSafeStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    request.destination === "font";

  if (!isSafeStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const appClient = clients.find((client) => "focus" in client);
      if (appClient) {
        appClient.postMessage({ type: "PUSH_NAVIGATE", url: targetUrl });
        return appClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || "Tienes una actualización financiera en Arca." };
  }
  event.waitUntil(self.registration.showNotification(payload.title || "Arca te recuerda", {
    body: payload.body || "Revisa tus próximos compromisos.",
    icon: "/icons/arca-192.png?v=4",
    badge: "/icons/arca-maskable-512.png?v=4",
    tag: payload.tag || "arca-financial-reminder",
    data: { url: payload.url || "/app" },
    vibrate: [120, 60, 120],
  }));
});
