const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

// base64 → Uint8Array
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
    return output;
}

export async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push no soportado en este navegador.');
        return;
    }

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
        alert('Permiso denegado.');
        return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
    });

    await fetch('http://localhost:3000/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
    });

    console.log('[PUSH] Suscripción enviada al backend.');
    alert('Notificaciones habilitadas.');
}
