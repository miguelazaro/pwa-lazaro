import { useEffect, useState } from "react";
import Entries from "./components/Entries";
import { watchNotificationPermission } from "./lib/watchPermission";

// Evento A2HS (Add To Home Screen)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function App() {
  // ---- A2HS  ----
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // ---- Push support----
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>(Notification.permission);

  useEffect(() => {
    // 1) Soporte de Push + SW + Notification
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setPushSupported(supported);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const stop = watchNotificationPermission((perm) => {
      setPushPermission(perm);
      console.log("[PUSH] Permiso cambió a:", perm);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      void stop; 
    };
  }, []);

  const onInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const onEnablePush = async () => {
    try {
      const m = await import("./push");
      await m.enablePush();
      setPushPermission(Notification.permission);
    } catch (e) {
      console.warn("[PUSH] No se pudo activar:", e);
    }
  };

  // Mostrar botón si hay soporte y AÚN no está concedido el permiso.
  const shouldShowPushCta =
    pushSupported && pushPermission !== "granted";

  const openSiteNotificationsSettings = () => {
    window.open(
      `chrome://settings/content/siteDetails?site=${location.origin}`,
      "_blank"
    );
  };

  return (
    <div className="app">
      <header className="app__bar">
        <div className="brand">
          <span className="brand__dot" />
          <span>My PWA Lázaro</span>
        </div>

        <div className="actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Estado visual del permiso */}
          {pushSupported && (
            <span
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid #333",
                background:
                  pushPermission === "granted"
                    ? "#064e3b"
                    : pushPermission === "denied"
                    ? "#3f1d1d"
                    : "#1f2937",
                color:
                  pushPermission === "granted"
                    ? "#34d399"
                    : pushPermission === "denied"
                    ? "#fca5a5"
                    : "#e5e7eb",
              }}
              title={`Permiso: ${pushPermission}`}
            >
              {pushPermission === "granted"
                ? "Notificaciones: activas ✓"
                : pushPermission === "denied"
                ? "Notificaciones: bloqueadas"
                : "Notificaciones: no solicitado"}
            </span>
          )}

          {/* CTA para activar notificaciones */}
          {shouldShowPushCta && (
            <button
              className="btn"
              style={{
                ...btnSuccess,
                opacity: pushPermission === "denied" ? 0.5 : 1,
                cursor: pushPermission === "denied" ? "not-allowed" : "pointer",
              }}
              onClick={pushPermission === "denied" ? openSiteNotificationsSettings : onEnablePush}
              title={
                pushPermission === "denied"
                  ? "Permiso bloqueado. Haz clic para abrir los ajustes del sitio y permitir notificaciones."
                  : "Activar notificaciones push"
              }
            >
              {pushPermission === "denied"
                ? "Permitir en ajustes del sitio"
                : "Activar notificaciones"}
            </button>
          )}

          {/* Botón de instalar A2HS */}
          {canInstall && (
            <button className="btn" onClick={onInstall}>
              Instalar
            </button>
          )}
        </div>
      </header>

      <main className="container">
        <Entries />
      </main>

      <footer className="footer">
        <small>© {new Date().getFullYear()} Lázaro · PWA demo</small>
      </footer>
    </div>
  );
}

const btnSuccess: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#22c55e",
  color: "#0b0b0c",
  fontWeight: 700,
  cursor: "pointer",
};
