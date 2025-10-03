// Registro del Service Worker (solo en producción)
export function registerSW() {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
        // base del proyecto 
        const swUrl = `${import.meta.env.BASE_URL}sw.js`;

        window.addEventListener('load', () => {
            navigator.serviceWorker
                .register(swUrl)
                .then((reg) => {
                    console.log('[SW] registrado en:', reg.scope);
                })
                .catch((err) => {
                    console.error('[SW] registro falló:', err);
                });
        });
    }
}
