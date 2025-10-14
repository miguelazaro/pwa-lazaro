import React from "react";
import { useOnline } from "../hooks/useOnline";

export default function OfflineBanner() {
    const online = useOnline();
    if (online) return null;

    return (
        <div
            style={{
                background: "#b45309",
                color: "white",
                padding: "8px 12px",
                textAlign: "center",
                fontSize: 14,
            }}
            role="status"
            aria-live="polite"
        >
            Estás sin conexión. Tus datos se guardarán localmente y se mostrarán al recargar.
        </div>
    );
}
