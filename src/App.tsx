import { useEffect, useState } from "react";

export default function App() {
  // Manejo del prompt de instalación (A2HS)
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault(); 
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const onInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log("A2HS choice:", choice.outcome, "on", choice.platform);
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  return (
    <div className="app">
      <header className="app__bar">
        <div className="brand">
          <span className="brand__dot" />
          <span>My PWA Lázaro</span>
        </div>
        {canInstall && (
          <button className="btn" onClick={onInstall}>
            Instalar
          </button>
        )}
      </header>

      <main className="container">
        <section className="card">
          <h1>Bienvenido 👋😎</h1>

          <p>
            Este es mi <strong>Home Screen</strong>. Estoy usando Vite + React +
            TypeScript con arquitectura <em>App Shell</em>.
          </p>
          <ul>
            <li>Manifest + íconos (normales y maskable)</li>
            <li>Service Worker (Workbox en build)</li>
            <li>Shell rápido y splash inicial</li>
          </ul>
          <p className="muted">
            Mira el código fuente en mi repositorio:{" "}
            <a
              href="https://github.com/miguelazaro/pwa-lazaro"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/miguelazaro/pwa-lazaro
            </a>
          </p>
        </section>
      </main>

      <footer className="footer">
        <small>© {new Date().getFullYear()} Lázaro · PWA demo</small>
      </footer>
    </div>
  );
}
