export default function EnablePushButton() {
    async function onClick() {
        try {
            const m = await import("../push"); // ruta correcta desde /components
            await m.enablePush();
        } catch (e) {
            console.warn("[PUSH] No se pudo activar:", e);
        }
    }

    return (
        <button
            onClick={onClick}
            className="btn"
            style={{
                background: "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: 600,
            }}
            title="Activar notificaciones push"
        >
            Activar notificaciones
        </button>
    );
}
