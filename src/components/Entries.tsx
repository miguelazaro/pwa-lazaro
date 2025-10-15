// src/components/Entries.tsx
import React, { useEffect, useState } from "react";
import OfflineBanner from "./OfflineBanner";
import { addEntry, getAllEntries, deleteEntry, type Entry } from "../lib/idb";
import { useOnline } from "../hooks/useOnline";

export default function Entries() {
  const online = useOnline();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  /** Carga todas las entradas desde IndexedDB */
  async function loadEntries() {
    setLoading(true);
    const all = await getAllEntries();
    all.sort((a, b) => b.createdAt - a.createdAt);
    setEntries(all);
    setLoading(false);
  }

  useEffect(() => {
    loadEntries();

    if ("serviceWorker" in navigator) {
      const handleMsg = (evt: MessageEvent) => {
        if (evt.data === "sync-done") {
          console.log("[PAGE] Recibido mensaje de sync-done → recargando lista");
          loadEntries();
        }
      };
      navigator.serviceWorker.addEventListener("message", handleMsg);
      return () =>
        navigator.serviceWorker.removeEventListener("message", handleMsg);
    }
  }, []);

  /** Re-registra Background Sync cuando se vuelve a estar online */
  useEffect(() => {
    async function tryScheduleSyncIfPending() {
      const all = await getAllEntries();
      const hasPending = all.some((e) => e.pendingSync);
      if (!hasPending) return;

      if ("serviceWorker" in navigator && "SyncManager" in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const anyReg = reg as ServiceWorkerRegistration & {
            sync?: { register(tag: string): Promise<void> };
          };
          if (anyReg.sync) {
            await anyReg.sync.register("sync-entries");
            console.log("[PAGE] Re-registrado sync-entries al volver online");
          }
        } catch (err) {
          console.warn("[PAGE] Error al (re)registrar sync:", err);
        }
      }
    }

    if (online) {
      tryScheduleSyncIfPending();
    }
  }, [online]);

  /** Maneja el envío del formulario */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    await addEntry({
      title: trimmed,
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
      pendingSync: !online,
    });

    setTitle("");
    setNotes("");
    await loadEntries();

    // Si estamos offline, registra una sincronización para más tarde
    if (!online && "serviceWorker" in navigator && "SyncManager" in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const anyReg = reg as ServiceWorkerRegistration & {
          sync?: { register(tag: string): Promise<void> };
        };
        if (anyReg.sync) {
          await anyReg.sync.register("sync-entries");
          console.log("Background Sync registrada: sync-entries");
        } else {
          console.warn("El navegador no expone ServiceWorkerRegistration.sync");
        }
      } catch (err) {
        console.warn("No se pudo registrar Background Sync:", err);
      }
    }
  }

  /** Elimina una entrada de IndexedDB */
  async function onDelete(id?: number) {
    if (!id) return;
    await deleteEntry(id);
    await loadEntries();
  }

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: 16 }}>
      <OfflineBanner />
      <h1 style={{ margin: "16px 0" }}>Reporte / Tareas (Offline)</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <label>
          <span>Título *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Estudiar PWA / Hacer ejercicio"
            required
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#18181b",
              color: "#e5e7eb",
            }}
          />
        </label>

        <label>
          <span>Notas</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Detalles opcionales…"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#18181b",
              color: "#e5e7eb",
            }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#7c3aed",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Guardar (offline OK)
        </button>

        <small style={{ opacity: 0.8 }}>
          Estado de red: <strong>{online ? "Online" : "Offline"}</strong>
        </small>
      </form>

      <section style={{ marginTop: 24 }}>
        <h2>Entradas guardadas</h2>
        {loading ? (
          <p>Cargando…</p>
        ) : entries.length === 0 ? (
          <p>No hay registros todavía.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
            {entries.map((e) => (
              <li
                key={e.id}
                style={{
                  border: "1px solid #2a2a2a",
                  borderRadius: 12,
                  padding: 12,
                  background: "#0b0b0c",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <strong>{e.title}</strong>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {new Date(e.createdAt).toLocaleString()}
                      {e.pendingSync ? " • pendiente de sincronizar" : ""}
                    </div>
                    {e.notes && <p style={{ marginTop: 8 }}>{e.notes}</p>}
                  </div>
                  <button
                    onClick={() => onDelete(e.id)}
                    style={{
                      alignSelf: "flex-start",
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #444",
                      background: "transparent",
                      color: "#e5e7eb",
                      cursor: "pointer",
                    }}
                    aria-label="Eliminar"
                    title="Eliminar"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}