const CACHE = "khaled-admin-v3";
const SHELL = [
  "/admin/",
  "/admin-manifest-v2.webmanifest",
  "/admin-app-icon-v2-192.png",
  "/admin-app-icon-v2-512.png",
];

self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  ),
);

self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("khaled-admin-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const isDocument = event.request.mode === "navigate";
  event.respondWith(
    fetch(event.request, isDocument ? { cache: "no-store" } : undefined)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match("/admin/")),
      ),
  );
});
