// src/components/Entries.tsx
import React, { useEffect, useState, useRef } from "react";
import OfflineBanner from "./OfflineBanner";
import { addEntry, getAllEntries, deleteEntry, type Entry } from "../lib/idb";
import { useOnline } from "../hooks/useOnline";

export default function Entries() {
  const online = useOnline();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  

  const syncInProgress = useRef(false);


  const getApiUrl = () => {
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:3000/api/entries'
      : '/api/entries';
  };

  // Cargar entradas
  const loadEntries = async () => {
    setLoading(true);
    const all = await getAllEntries();
    all.sort((a, b) => b.createdAt - a.createdAt);
    setEntries(all);
    setLoading(false);
  };


  useEffect(() => {
    loadEntries();
  }, []);

  const syncEntriesManual = async () => {
    if (!online || syncInProgress.current) return;
    
    syncInProgress.current = true;
    setSyncing(true);
    const allEntries = await getAllEntries();
    const pending = allEntries.filter(e => e.pendingSync);
    
    if (pending.length === 0) {
      setSyncing(false);
      syncInProgress.current = false;
      return;
    }

    console.log(`[SYNC] Sincronizando ${pending.length} entradas...`);
    const apiUrl = getApiUrl();
    console.log(`[SYNC] Usando API URL: ${apiUrl}`);

    const results = [];
    for (const entry of pending) {
      try {
        console.log(`[SYNC] Enviando entrada:`, entry);
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(entry),
        });

        console.log(`[SYNC] Response status: ${response.status}`, response);

        if (response.ok) {
          await deleteEntry(entry.id!);
          results.push({ id: entry.id, success: true });
          console.log(`[SYNC] ✅ Entrada ${entry.id} sincronizada`);
        } else {
          const errorText = await response.text();
          console.log(`[SYNC] ❌ Error ${response.status} con entrada ${entry.id}:`, errorText);
          results.push({ id: entry.id, success: false });
        }
      } catch (error) {
        console.log(`[SYNC] ❌ Error de red con entrada ${entry.id}:`, error);
        results.push({ id: entry.id, success: false });
      }
    }

    await loadEntries();
    setSyncing(false);
    syncInProgress.current = false;
    const successCount = results.filter(r => r.success).length;
    console.log(`[SYNC] Completado: ${successCount}/${pending.length} exitosas`);
  };

  //fecto para sincronizar automáticamente al volver online
  useEffect(() => {
    const syncEntries = async () => {
      if (!online || syncInProgress.current) return;
      
      syncInProgress.current = true;
      setSyncing(true);
      const allEntries = await getAllEntries();
      const pending = allEntries.filter(e => e.pendingSync);
      
      if (pending.length === 0) {
        setSyncing(false);
        syncInProgress.current = false;
        return;
      }

      console.log(`[SYNC] Sincronizando ${pending.length} entradas automáticamente...`);
      const apiUrl = getApiUrl();
      console.log(`[SYNC] Usando API URL: ${apiUrl}`);

      const results = [];
      for (const entry of pending) {
        try {
          console.log(`[SYNC] Enviando entrada automáticamente:`, entry);
          
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(entry),
          });

          console.log(`[SYNC] Response status: ${response.status}`, response);

          if (response.ok) {
            await deleteEntry(entry.id!);
            results.push({ id: entry.id, success: true });
            console.log(`[SYNC] ✅ Entrada ${entry.id} sincronizada`);
          } else {
            const errorText = await response.text();
            console.log(`[SYNC] ❌ Error ${response.status} con entrada ${entry.id}:`, errorText);
            results.push({ id: entry.id, success: false });
          }
        } catch (error) {
          console.log(`[SYNC] ❌ Error de red con entrada ${entry.id}:`, error);
          results.push({ id: entry.id, success: false });
        }
      }

      await loadEntries();
      setSyncing(false);
      syncInProgress.current = false;
      const successCount = results.filter(r => r.success).length;
      console.log(`[SYNC] Completado: ${successCount}/${pending.length} exitosas`);
    };

    if (online) {
      console.log("[SYNC] Conexión restaurada, sincronizando automáticamente...");
      syncEntries();
    }
  }, [online]);

  // Manejar envío del formulario
  const onSubmit = async (e: React.FormEvent) => {
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

    if (online) {
      syncEntriesManual();
    }
  };

  // Eliminar entrada
  const onDelete = async (id?: number) => {
    if (!id) return;
    await deleteEntry(id);
    await loadEntries();
  };

  const pendingCount = entries.filter(e => e.pendingSync).length;

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: 16 }}>
      <OfflineBanner />
      <h1 style={{ margin: "16px 0" }}>Reporte / Tareas (Offline)</h1>

      {/* Panel de sincronización */}
      {pendingCount > 0 && online && (
        <div style={{
          background: "#1a1a2e",
          border: "1px solid #2d46b9",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <strong>{pendingCount} entrada(s) pendiente(s)</strong>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              {syncing ? "Sincronizando..." : "Listas para enviar"}
            </div>
          </div>
          <button
            onClick={syncEntriesManual}
            disabled={syncing}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: syncing ? "#666" : "#2d46b9",
              color: "white",
              cursor: syncing ? "not-allowed" : "pointer"
            }}
          >
            {syncing ? "Sincronizando..." : "Sincronizar Ahora"}
          </button>
        </div>
      )}

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
          Estado: <strong>{online ? "Online" : "Offline"}</strong>
          {pendingCount > 0 && ` • ${pendingCount} pendientes`}
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
                  opacity: e.pendingSync ? 0.7 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{e.title}</strong>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {new Date(e.createdAt).toLocaleString()}
                      {e.pendingSync && " • ⏳ pendiente de sincronizar"}
                    </div>
                    {e.notes && <p style={{ marginTop: 8 }}>{e.notes}</p>}
                  </div>
                  <button
                    onClick={() => onDelete(e.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #444",
                      background: "transparent",
                      color: "#e5e7eb",
                      cursor: "pointer",
                    }}
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