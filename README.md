# My PWA Lázaro 🚀

Aplicación Web Progresiva (PWA) creada con **Vite + React + TypeScript**, basada en la arquitectura **App Shell** e integrada con **Service Workers**, **IndexedDB**, **Background Sync** y **Push Notifications**.

---

## 📦 Estructura del proyecto
- **Semana 3:** Base PWA (App Shell, Manifest, Service Worker simple)  
- **Semana 4:** Ampliación con estrategias de caché, sincronización en segundo plano y notificaciones push  
- **Rama activa:** `week4/pwa-sync-cache-push`  
- **Rama principal:** `main` (actualizada y mergeada)

---

## ⚙️ Tecnologías principales
- ⚛️ **React + TypeScript** (SPA moderna)
- ⚙️ **Vite** (entorno de desarrollo rápido)
- 🔒 **Workbox** (gestión avanzada del cache y estrategias)
- 💾 **IndexedDB (idb)** (almacenamiento local para modo offline)
- 🔔 **Push API + Notifications API**
- 🔄 **Background Sync API**
- 🌐 **Vercel** (hosting HTTPS y despliegue automático)

---

## 📲 Características principales

### 🧱 App Shell Architecture
- Estructura base precacheada para carga instantánea.
- Separación entre **caché estático** (HTML, CSS, JS) y **dinámico** (imágenes, datos).

### 💾 IndexedDB y modo offline
- Almacena los reportes/tareas creadas en `IndexedDB` cuando no hay conexión.
- Al reconectarse, los datos se sincronizan automáticamente con el backend local (`/api/entries`).
- Implementación mediante el hook `useOnline()` y el módulo `idb.ts`.

### 🔄 Background Sync
- Si el usuario envía formularios sin conexión, los datos quedan registrados localmente.
- El `Service Worker` registra un evento `sync` (tag: `sync-entries`).
- Al recuperar la conexión, envía los datos pendientes al servidor.

### 📡 Estrategias de caché
Implementadas en **`sw.js`** con Workbox:
- `cache-first` → para App Shell y recursos estáticos (HTML, CSS, JS)
- `stale-while-revalidate` → para imágenes o recursos no críticos
- `network-first` → para peticiones que requieren frescura (ej. `/api/entries`)
- Página personalizada **offline.html** cuando no hay conexión.

### 🔔 Notificaciones Push
- Solicita permiso de usuario para recibir alertas.
- Registra la suscripción Push con claves **VAPID**.
- Prueba backend Node local: `POST /api/push/test` envía notificación al navegador.
- Notificaciones recibidas aún con la app cerrada.

---

## 🧠 Estructura de carpetas
```
src/
 ├── assets/
 ├── components/
 │   ├── Entries.tsx
 │   ├── OfflineBanner.tsx
 │   └── EnablePushButton.tsx
 ├── hooks/
 │   └── useOnline.ts
 ├── lib/
 │   └── idb.ts
 ├── push.ts
 ├── register-sw.ts
 ├── App.tsx
 └── service-worker.js (sw.js)
```

---

## 🧪 Testing y publicación
### 🔹 Entorno HTTPS
Desplegada en **Vercel**, con HTTPS activo por defecto:  
👉 [https://pwa-lazaro.vercel.app](https://pwa-lazaro.vercel.app)

### 🔹 Pruebas realizadas
✅ Instalación en pantalla de inicio (A2HS)  
✅ Operación offline (App Shell + IndexedDB)  
✅ Sincronización automática al volver online  
✅ Recepción de notificaciones push de prueba  
✅ Auditoría con Lighthouse (PWA 100%)  

---

## 🛠️ Instalación local

1. Clonar repositorio:
   ```bash
   git clone https://github.com/miguelazaro/pwa-lazaro.git
   cd pwa-lazaro
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Ejecutar en desarrollo:
   ```bash
   npm run dev
   ```

4. Levantar backend local (para pruebas de Sync y Push):
   ```bash
   node server.js
   ```

5. Build de producción:
   ```bash
   npm run build
   ```

---

## 📤 Despliegue
- Hosting: **Vercel**
- Entorno: `main` → despliegue **automático**
- HTTPS habilitado (TLS)
- Cache-Control optimizado para PWA

---

## 👨‍💻 Autor
**Miguel Ángel Lázaro**  
Ingeniería en Desarrollo y Gestión de Software
Proyecto: **My PWA Lázaro** — Universidad Tecnológica

---

## 🧾 Licencia
Este proyecto se distribuye con fines académicos y de aprendizaje.  
