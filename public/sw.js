// Smart Money Service Worker
const CACHE_NAME = "smart-money-v1";
const STATIC_ASSETS = [
  "/",
  "/marketplace",
  "/offline.html",
];

// ── Install ─────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-only: API routes, Supabase, Webpack HMR
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase.co") ||
    url.pathname.includes("webpack-hmr")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first: Next.js static assets (JS, CSS, fonts)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Network-first: navigation requests
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline.html").then(
          (cached) => cached ?? new Response("Offline", { status: 503 })
        )
      )
    );
    return;
  }

  // Cache-first: static assets (images, fonts, icons)
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Default: network with fallback to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
