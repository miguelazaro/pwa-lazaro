/* =========================
 *  Versionado y listas
 * ========================= */

const STATIC_CACHE  = "static-v1";   // App Shell
const DYNAMIC_CACHE = "dynamic-v1";  // Respuestas de datos
const IMAGE_CACHE   = "images-v1";   // Imágenes

// Archivos del App Shell 
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/offline.css",  
  "/manifest.json",
  "/icons/favicon-16x16.png",
  "/icons/favicon-32x32.png",
  "/icons/favicon-48x48.png",
  "/icons/favicon-64x64.png",
  "/icons/favicon-128x128.png",
  "/icons/favicon-192x192.png",
  "/icons/favicon-256x256.png",
  "/icons/favicon-512x512.png",
];

/* =========================
 *  Utils
 * ========================= */
function isApiRequest(url) {
  try {
    const u = new URL(url);
    return (u.hostname === "localhost" && u.port === "3000") || u.pathname.startsWith("/api/");
  } catch { return false; }
}

/* =========================
 *  Ciclo de vida
 * ========================= */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => {
        if (![STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE].includes(k)) {
          return caches.delete(k);
        }
      })
    );
    await self.clients.claim();
  })());
});

/* =========================
 *  Estrategias de caché
 * ========================= */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (
    req.mode === "navigate" ||
    (req.destination === "" && req.headers.get("accept")?.includes("text/html"))
  ) {
    event.respondWith(networkFirstForPages(req));
    return;
  }

  if (url.origin === location.origin && url.pathname.endsWith(".json")) {
    event.respondWith(staleWhileRevalidate(req, DYNAMIC_CACHE));
    return;
  }

  if (url.origin === location.origin && ["script", "style", "font"].includes(req.destination)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (req.destination === "image") {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE));
    return;
  }

  if (isApiRequest(req.url)) {
    event.respondWith(networkFirst(req, DYNAMIC_CACHE));
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

/* ===== Helpers de estrategias ===== */
async function networkFirstForPages(request) {
  try {
    const fresh = await fetch(request);
    return fresh;
  } catch {
    const cached = await caches.match(request);
    return cached || (await caches.match("/offline.html"));
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const res = await fetch(request);
  cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedPromise = cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && res.status === 200) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  const cached = await cachedPromise;
  return cached || (await networkPromise) || fetch(request);
}

async function networkFirst(request, cacheName) {
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("Network and cache both failed");
  }
}

/* =========================
 *  IndexedDB Helpers
 * ========================= */
const DB_NAME = "app-db";
const DB_VERSION = 1;
const STORE = "entries";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("pendingSync", "pendingSync", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Lectura manual (evita IDBKeyRange.only)
async function getPending() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      resolve(all.filter((x) => x?.pendingSync === true));
    };
    req.onerror = () => reject(req.error);
  });
}

async function deleteMany(ids) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* =========================
 *  Background Sync
 * ========================= */
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-entries") {
    event.waitUntil(syncEntries());
  }
});

async function syncEntries() {
  try {
    const pending = await getPending();
    if (!pending.length) {
      notifyPages("sync-done");
      return;
    }

    const endpoint = "http://localhost:3000/api/entries";
    for (const entry of pending) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error("Error al enviar: " + res.status);
    }

    await deleteMany(pending.map((e) => e.id));
    notifyPages("sync-done");
  } catch (err) {
    console.warn("[SW] Falló la sync, reintentará luego:", err);
  }
}

async function notifyPages(msg) {
  const clientsArr = await self.clients.matchAll({ includeUncontrolled: true });
  clientsArr.forEach((c) => c.postMessage(msg));
}

/* =========================
 *  Push notifications
 * ========================= */
self.addEventListener("push", (event) => {
  // el payload puede venir como texto o JSON
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }

  const title = data.title || "Notificación";
  const options = {
    body: data.body || "Tienes una notificación nueva.",
    icon: "/icons/favicon-192x192.png",
    badge: "/icons/favicon-64x64.png",
    data: data.url ? { url: data.url } : {},
    // Opcionales
    actions: data.actions || [],
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});
