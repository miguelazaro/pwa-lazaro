export function registerSW() {
  console.log("[SW] init registerSW()");

  if (!("serviceWorker" in navigator)) {
    console.warn("[SW] serviceWorker no soportado");
    return;
  }

  const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "::1";

  console.log(
    "[SW] hostname:", location.hostname,
    "isLocalhost:", isLocalhost,
    "PROD:", import.meta.env.PROD
  );

  if (!(import.meta.env.PROD || isLocalhost)) {
    console.log("[SW] no se registra (no es PROD ni localhost)");
    return;
  }

  // Candidatos a URL del SW
  const urlFromBase =
    (() => {
      try {
        return new URL("sw.js", import.meta.env.BASE_URL || "/").toString();
      } catch {
        return null;
      }
    })() || "";

  const urlFromOrigin = new URL("sw.js", location.origin).toString();
  const candidates: string[] = [urlFromBase, urlFromOrigin].filter(Boolean);

  console.log("[SW] candidatos:", candidates);

  // Intento con fallback
  let tried = 0;
  const tryRegister = (url: string): Promise<ServiceWorkerRegistration> => {
    tried++;
    console.log(`[SW] intentando registrar (${tried}):`, url);

    return navigator.serviceWorker
      .register(url)
      .then((reg: ServiceWorkerRegistration) => {
        console.log("[SW] ✅ Registrado. scope:", reg.scope);
        return reg;
      })
      .catch((err: unknown) => {
        console.error("[SW] ❌ Falló con:", url, err);
        if (tried < candidates.length) {
          return tryRegister(candidates[tried]); 
        }
        return Promise.reject(err);
      });
  };

  tryRegister(candidates[0]).catch((e: unknown) => {
    console.error("[SW] Registro abortado tras probar candidatos:", e);
  });
}
