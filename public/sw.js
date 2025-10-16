/* =========================
 *  Versionado y listas
 * ========================= */

const STATIC_CACHE  = "static-v1";   
const DYNAMIC_CACHE = "dynamic-v1";  
const IMAGE_CACHE   = "images-v1";   

// Archivos del App Shell
const APP_SHELL = [
  "/",
  "/index.html",
  "./offline.html",
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
 *  Ambiente / Endpoints
 * ========================= */

const ENTRIES_ENDPOINT = "/api/entries";

/* =========================
 *  Utils
 * ========================= */
function isApiRequest(url) {
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

/* =========================
 *  Ciclo de vida
 * ========================= */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll([
        ...APP_SHELL,
        '/offline.html', 
      ]))
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

  // Navegación/HTML
  if (
    req.mode === "navigate" ||
    (req.destination === "" && req.headers.get("accept")?.includes("text/html"))
  ) {
    event.respondWith(networkFirstForPages(req));
    return;
  }

  // Llamadas a API
  if (isApiRequest(req.url)) {
    event.respondWith(networkFirst(req, DYNAMIC_CACHE));
    return;
  }

  // Estáticos internos
  if (url.origin === location.origin && ["script", "style", "font"].includes(req.destination)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Imágenes
  if (req.destination === "image") {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE));
    return;
  }

  // Fallback por defecto
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

/* ===== Helpers de estrategias ===== */
async function networkFirstForPages(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) return fresh;
    throw new Error('Network response not ok');
  } catch {
    console.warn('[SW] No hay conexión, mostrando offline.html');
    const cached = await caches.match(request);
    return cached || (await caches.match('/offline.html'));
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

// Obtiene entradas con pendingSync = true
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
 *  Background Sync + Sincronización Manual
 * ========================= */
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-entries") {
    console.log("[SW] Background Sync activado");
    event.waitUntil(syncEntries());
  }
});

self.addEventListener("message", async (event) => {
  if (event.data === "manual-sync") {
    console.log("[SW] Sincronización manual solicitada");
    await syncEntries();
    event.ports[0]?.postMessage("sync-completed");
  }
});

async function syncEntries() {
  try {
    const pending = await getPending();
    console.log(`[SW] Sincronizando ${pending.length} entradas pendientes`);
    
    if (!pending.length) {
      notifyPages("sync-done");
      return;
    }

    const results = [];
    
    for (const entry of pending) {
      try {
        const res = await fetch(ENTRIES_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
        
        if (res.ok) {
          results.push({ id: entry.id, success: true });
        } else {
          console.warn(`[SW] Error en sync: ${res.status} para entrada ${entry.id}`);
          results.push({ id: entry.id, success: false });
        }
      } catch (err) {
        console.warn(`[SW] Error de red para entrada ${entry.id}:`, err);
        results.push({ id: entry.id, success: false });
      }
    }

    const successfulIds = results.filter(r => r.success).map(r => r.id);
    if (successfulIds.length > 0) {
      await deleteMany(successfulIds);
      console.log(`[SW] ${successfulIds.length} entradas sincronizadas y eliminadas`);
    }

    if (successfulIds.length === pending.length) {
      notifyPages("sync-done");
    } else {
      notifyPages("sync-partial");
    }
    
  } catch (err) {
    console.error("[SW] Error crítico en syncEntries:", err);
    notifyPages("sync-error");
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
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() };
  }

  const title = data.title || "Notificación";
  const options = {
    body: data.body || "Tienes una notificación nueva.",
    icon: "/icons/favicon-192x192.png",
    badge: "/icons/favicon-64x64.png",
    data: data.url ? { url: data.url } : {},
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